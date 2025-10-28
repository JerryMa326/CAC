import { geminiCollector } from './geminiClient';
import { congressDB, type StoredMember } from './congressDatabase';
import { Representative } from '@/types';

export interface ScrapingProgress {
  current: number;
  total: number;
  congressNumber: number;
  status: 'scraping' | 'storing' | 'complete' | 'error';
  message: string;
}

class CongressDataManager {
  private isInitialized = false;
  private scrapingInProgress = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    await congressDB.init();
    this.isInitialized = true;
    
    const stats = await congressDB.getStats();
    console.log('📊 Database stats:', stats);
  }

  /**
   * Get representatives for a specific year
   * Will check database first, scrape if needed
   */
  async getRepresentativesByYear(year: number): Promise<Representative[]> {
    await this.init();

    // Check if we have data
    const hasData = await congressDB.hasDataForYear(year);
    
    if (!hasData) {
      console.log(`📭 No data for ${year}, need to scrape`);
      
      // Calculate which congress
      const congressNumber = Math.floor((year - 1789) / 2) + 1;
      
      // Try to scrape
      if (geminiCollector.hasAPIKey()) {
        try {
          await this.scrapeCongress(congressNumber);
        } catch (error) {
          console.error('Failed to scrape data:', error);
          return [];
        }
      } else {
        console.warn('⚠️ No Gemini API key, cannot scrape data');
        return [];
      }
    }

    // Get from database
    const members = await congressDB.getMembersByYear(year);
    return this.convertToRepresentatives(members);
  }

  /**
   * Scrape a specific congress session and store in database
   */
  async scrapeCongress(congressNumber: number): Promise<void> {
    if (this.scrapingInProgress) {
      console.warn('⚠️ Scraping already in progress');
      return;
    }

    this.scrapingInProgress = true;

    try {
      console.log(`🔍 Scraping ${congressNumber}th Congress...`);
      
      const members = await geminiCollector.scrapeCongressSession(congressNumber);
      
      // Convert to stored format
      const storedMembers: StoredMember[] = members.map(m => ({
        id: `${m.state}-${m.district || 'SEN'}-${m.startYear}`,
        ...m,
        scrapedAt: Date.now(),
        congressNumber
      }));

      // Store in database
      await congressDB.storeMembers(storedMembers);
      
      console.log(`✅ Stored ${storedMembers.length} members from Congress ${congressNumber}`);
    } finally {
      this.scrapingInProgress = false;
    }
  }

  /**
   * Scrape full historical range (1789-2024)
   */
  async scrapeFullHistory(
    onProgress?: (progress: ScrapingProgress) => void
  ): Promise<void> {
    await this.init();

    const currentYear = new Date().getFullYear();
    const currentCongress = Math.floor((currentYear - 1789) / 2) + 1;
    
    console.log(`🚀 Starting full historical scrape: 1st-${currentCongress}th Congress (1789-${currentYear})`);

    for (let congress = 1; congress <= currentCongress; congress++) {
      try {
        if (onProgress) {
          onProgress({
            current: congress,
            total: currentCongress,
            congressNumber: congress,
            status: 'scraping',
            message: `Scraping ${congress}th Congress...`
          });
        }

        const members = await geminiCollector.scrapeCongressSession(congress);
        
        const storedMembers: StoredMember[] = members.map(m => ({
          id: `${m.state}-${m.district || 'SEN'}-${m.startYear}-${m.name.replace(/[^a-zA-Z]/g, '')}`,
          ...m,
          scrapedAt: Date.now(),
          congressNumber: congress
        }));

        if (onProgress) {
          onProgress({
            current: congress,
            total: currentCongress,
            congressNumber: congress,
            status: 'storing',
            message: `Storing ${storedMembers.length} members...`
          });
        }

        await congressDB.storeMembers(storedMembers);

        if (onProgress) {
          onProgress({
            current: congress,
            total: currentCongress,
            congressNumber: congress,
            status: 'complete',
            message: `✅ Completed ${congress}th Congress`
          });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (error) {
        console.error(`❌ Failed to scrape Congress ${congress}:`, error);
        
        if (onProgress) {
          onProgress({
            current: congress,
            total: currentCongress,
            congressNumber: congress,
            status: 'error',
            message: `Failed to scrape Congress ${congress}`
          });
        }
      }
    }

    const stats = await congressDB.getStats();
    console.log('🎉 Full scrape complete!', stats);
  }

  /**
   * Get all representatives organized by district
   */
  async loadAllRepresentativesForYear(year: number): Promise<Map<string, Representative[]>> {
    const members = await this.getRepresentativesByYear(year);
    
    const districtMap = new globalThis.Map<string, Representative[]>();
    members.forEach(member => {
      const key = `${member.state}-${member.district}`;
      if (!districtMap.has(key)) {
        districtMap.set(key, []);
      }
      districtMap.get(key)!.push(member);
    });

    return districtMap;
  }

  /**
   * Convert stored members to Representative type
   */
  private convertToRepresentatives(members: StoredMember[]): Representative[] {
    return members.map(m => ({
      id: m.id,
      name: m.name,
      party: this.normalizeParty(m.party),
      state: m.state,
      district: m.district || '0',
      startYear: m.startYear,
      endYear: m.endYear,
      imageUrl: m.imageUrl,
      wikiUrl: m.wikipediaUrl,
      bio: {
        fullName: m.fullName,
        summary: m.biography,
        birthDate: m.born,
      },
      stances: m.keyVotes?.map((vote, idx) => ({
        topic: `Key Vote ${idx + 1}`,
        position: vote,
        year: m.startYear,
        source: m.wikipediaUrl
      })),
    }));
  }

  /**
   * Normalize party names
   */
  private normalizeParty(party: string): 'Democrat' | 'Republican' | 'Independent' | 'Other' {
    const p = party.toLowerCase();
    if (p.includes('democrat')) return 'Democrat';
    if (p.includes('republican')) return 'Republican';
    if (p.includes('independent')) return 'Independent';
    return 'Other';
  }

  /**
   * Get database statistics
   */
  async getStats() {
    await this.init();
    return congressDB.getStats();
  }

  /**
   * Check if database has data
   */
  async hasData(): Promise<boolean> {
    await this.init();
    const stats = await congressDB.getStats();
    return stats.totalMembers > 0;
  }

  /**
   * Export database to JSON file
   */
  async exportToJSON(): Promise<string> {
    await this.init();
    const data = await congressDB.exportData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import from JSON file
   */
  async importFromJSON(jsonString: string): Promise<void> {
    await this.init();
    const data = JSON.parse(jsonString) as StoredMember[];
    await congressDB.importData(data);
  }
}

export const dataManager = new CongressDataManager();
