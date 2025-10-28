/**
 * Static Data Loader
 * Reads from pre-built congress-data.json file (no frontend scraping!)
 */

import { Representative } from '@/types';

interface DatabaseMember {
  id: string;
  name: string;
  fullName: string;
  party: string;
  state: string;
  district: string;
  chamber: 'House' | 'Senate';
  startYear: number;
  endYear: number | null;
  born?: string;
  died?: string;
  biography: string;
  keyVotes?: string[];
  majorBills?: string[];
  committees?: string[];
  politicalSpectrum?: {
    economic: number;
    social: number;
    overall: string;
  };
  imageUrl?: string;
  wikipediaUrl?: string;
  congressNumber: number;
}

interface Database {
  version: string;
  generatedAt: string;
  totalMembers: number;
  congressRange: { min: number; max: number };
  yearRange: { min: number; max: number };
  members: DatabaseMember[];
}

class StaticDataLoader {
  private database: Database | null = null;
  private loaded = false;

  /**
   * Load the static database file
   */
  async loadDatabase(): Promise<void> {
    if (this.loaded) return;

    try {
      console.log('📂 Loading congressional database...');
      
      const response = await fetch('/data/congress-data.json');
      if (!response.ok) {
        throw new Error(`Failed to load database: ${response.status}`);
      }

      this.database = await response.json();
      this.loaded = true;

      console.log('✅ Database loaded!');
      console.log(`   Version: ${this.database?.version}`);
      console.log(`   Total members: ${this.database?.totalMembers.toLocaleString()}`);
      console.log(`   Coverage: ${this.database?.yearRange.min}-${this.database?.yearRange.max}`);
    } catch (error) {
      console.error('❌ Failed to load database:', error);
      throw error;
    }
  }

  /**
   * Get all representatives for a specific year
   */
  async getRepresentativesByYear(year: number): Promise<Representative[]> {
    await this.loadDatabase();
    
    if (!this.database) return [];

    const members = this.database.members.filter(m => 
      m.startYear <= year && (!m.endYear || m.endYear >= year)
    );

    return members.map(this.convertToRepresentative);
  }

  /**
   * Get representatives organized by district
   */
  async loadAllRepresentativesForYear(year: number): Promise<Map<string, Representative[]>> {
    const reps = await this.getRepresentativesByYear(year);
    
    const districtMap = new globalThis.Map<string, Representative[]>();
    reps.forEach(rep => {
      const key = `${rep.state}-${rep.district}`;
      if (!districtMap.has(key)) {
        districtMap.set(key, []);
      }
      districtMap.get(key)!.push(rep);
    });

    console.log(`📊 Loaded ${districtMap.size} districts for ${year}`);
    return districtMap;
  }

  /**
   * Get database info/stats
   */
  async getInfo(): Promise<Database | null> {
    await this.loadDatabase();
    return this.database;
  }

  /**
   * Check if database is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.loadDatabase();
      return this.database !== null && this.database.totalMembers > 0;
    } catch {
      return false;
    }
  }

  /**
   * Convert database member to Representative type
   */
  private convertToRepresentative(member: DatabaseMember): Representative {
    return {
      id: member.id,
      name: member.name,
      party: this.normalizeParty(member.party),
      state: member.state,
      district: member.district,
      startYear: member.startYear,
      endYear: member.endYear,
      imageUrl: member.imageUrl,
      wikiUrl: member.wikipediaUrl,
      bio: {
        fullName: member.fullName,
        summary: member.biography,
        birthDate: member.born,
      },
      stances: member.keyVotes?.map((vote, idx) => ({
        topic: `Key Position ${idx + 1}`,
        position: vote,
        year: member.startYear,
        source: member.wikipediaUrl
      })),
    };
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
   * Get year range covered by database
   */
  getYearRange(): { min: number; max: number } {
    return this.database?.yearRange || { min: 1789, max: 2024 };
  }
}

export const staticDataLoader = new StaticDataLoader();
