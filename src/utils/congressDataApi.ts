import axios from 'axios';
import { Representative, Stance } from '@/types';

/**
 * Congress Data API using TheUnitedStates.io
 * NO API KEYS - Uses open GitHub-hosted JSON files
 * Data source: https://github.com/unitedstates/congress-legislators
 */

// TheUnitedStates.io - Open JSON files on GitHub
const CURRENT_LEGISLATORS_URL = 'https://theunitedstates.io/congress-legislators/legislators-current.json';
const HISTORICAL_LEGISLATORS_URL = 'https://theunitedstates.io/congress-legislators/legislators-historical.json';
const SOCIAL_MEDIA_URL = 'https://theunitedstates.io/congress-legislators/legislators-social-media.json';

interface Legislator {
  id: {
    bioguide: string;
    thomas?: string;
    govtrack?: number;
    opensecrets?: string;
    wikipedia?: string;
  };
  name: {
    first: string;
    last: string;
    official_full: string;
    nickname?: string;
  };
  bio: {
    birthday: string;
    gender: string;
  };
  terms: Array<{
    type: 'rep' | 'sen';
    start: string;
    end?: string;
    state: string;
    district?: number;
    party: string;
    url?: string;
  }>;
}

export class CongressDataAPI {
  private currentLegislators: Legislator[] = [];
  private historicalLegislators: Legislator[] = [];
  private socialMedia: any[] = [];
  private initialized = false;
  private cache: Map<string, any> = new Map();

  /**
   * Initialize by loading all data (call once on app startup)
   */
  async init(): Promise<void> {
    if (this.initialized) {
      console.log('📦 Congressional data already loaded');
      return;
    }

    try {
      console.log('🔄 Loading congressional data from TheUnitedStates.io...');
      
      const [currentRes, historicalRes, socialRes] = await Promise.all([
        axios.get(CURRENT_LEGISLATORS_URL),
        axios.get(HISTORICAL_LEGISLATORS_URL),
        axios.get(SOCIAL_MEDIA_URL).catch(() => ({ data: [] })) // Optional
      ]);

      this.currentLegislators = currentRes.data;
      this.historicalLegislators = historicalRes.data;
      this.socialMedia = socialRes.data;
      this.initialized = true;

      console.log(`✅ Loaded ${this.currentLegislators.length} current + ${this.historicalLegislators.length} historical legislators`);
    } catch (error: any) {
      console.error('❌ Error loading congressional data:', error.message);
      throw error;
    }
  }

  /**
   * Get current members of Congress
   */
  getCurrentMembers(chamber: 'house' | 'senate' = 'house'): Representative[] {
    this.ensureInitialized();
    
    const cacheKey = `current-${chamber}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const type = chamber === 'house' ? 'rep' : 'sen';
    const members = this.currentLegislators
      .filter(leg => {
        const lastTerm = leg.terms[leg.terms.length - 1];
        return lastTerm.type === type;
      })
      .map(leg => this.mapToRepresentative(leg));

    this.cache.set(cacheKey, members);
    console.log(`📊 Found ${members.length} current ${chamber} members`);
    return members;
  }

  /**
   * Get members serving in a specific year
   */
  getMembersByYear(year: number, chamber: 'house' | 'senate' = 'house'): Representative[] {
    this.ensureInitialized();
    
    const cacheKey = `year-${year}-${chamber}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const type = chamber === 'house' ? 'rep' : 'sen';
    const all = [...this.currentLegislators, ...this.historicalLegislators];
    
    const members = all
      .filter(leg => {
        return leg.terms.some(term => {
          if (term.type !== type) return false;
          
          const start = new Date(term.start).getFullYear();
          const end = term.end ? new Date(term.end).getFullYear() : new Date().getFullYear();
          return year >= start && year <= end;
        });
      })
      .map(leg => this.mapToRepresentative(leg, year));

    this.cache.set(cacheKey, members);
    console.log(`📊 Found ${members.length} members serving in ${year}`);
    return members;
  }

  /**
   * Get all representatives who ever served in a district
   */
  getDistrictHistory(state: string, district: string): Representative[] {
    this.ensureInitialized();
    
    const cacheKey = `district-${state}-${district}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const all = [...this.currentLegislators, ...this.historicalLegislators];
    
    const members = all
      .filter(leg => {
        return leg.terms.some(term => 
          term.type === 'rep' &&
          term.state === state && 
          term.district?.toString() === district
        );
      })
      .map(leg => this.mapToRepresentative(leg))
      .sort((a, b) => b.startYear - a.startYear); // Most recent first

    this.cache.set(cacheKey, members);
    console.log(`📊 Found ${members.length} representatives in ${state}-${district} history`);
    return members;
  }

  /**
   * Get a specific legislator by bioguide ID
   */
  getLegislatorById(bioguideId: string): Representative | null {
    this.ensureInitialized();
    
    const all = [...this.currentLegislators, ...this.historicalLegislators];
    const leg = all.find(l => l.id.bioguide === bioguideId);
    
    return leg ? this.mapToRepresentative(leg) : null;
  }

  /**
   * Search for legislators by name
   */
  searchByName(query: string): Representative[] {
    this.ensureInitialized();
    
    const all = [...this.currentLegislators, ...this.historicalLegislators];
    const lowerQuery = query.toLowerCase();
    
    return all
      .filter(leg => 
        leg.name.official_full.toLowerCase().includes(lowerQuery) ||
        leg.name.first.toLowerCase().includes(lowerQuery) ||
        leg.name.last.toLowerCase().includes(lowerQuery)
      )
      .map(leg => this.mapToRepresentative(leg))
      .slice(0, 50); // Limit results
  }

  /**
   * Get all unique states
   */
  getAllStates(): string[] {
    this.ensureInitialized();
    
    const states = new Set<string>();
    this.currentLegislators.forEach(leg => {
      leg.terms.forEach(term => states.add(term.state));
    });
    
    return Array.from(states).sort();
  }

  /**
   * Load all representatives for a year, organized by district
   */
  async loadAllRepresentativesForYear(year: number): Promise<Map<string, Representative[]>> {
    const members = this.getMembersByYear(year, 'house');
    const districtMap = new Map<string, Representative[]>();
    
    members.forEach(member => {
      const key = `${member.state}-${member.district}`;
      if (!districtMap.has(key)) {
        districtMap.set(key, []);
      }
      districtMap.get(key)!.push(member);
    });
    
    console.log(`📦 Organized ${districtMap.size} districts for ${year}`);
    return districtMap;
  }

  /**
   * Get social media handles for a legislator
   */
  getSocialMedia(bioguideId: string): any {
    const social = this.socialMedia.find(s => s.id.bioguide === bioguideId);
    return social?.social || null;
  }

  /**
   * Map legislator data to our Representative type
   */
  private mapToRepresentative(leg: Legislator, forYear?: number): Representative {
    // Find the relevant term
    let relevantTerm = leg.terms[leg.terms.length - 1]; // Default to most recent
    
    if (forYear) {
      const matchingTerm = leg.terms.find(term => {
        const start = new Date(term.start).getFullYear();
        const end = term.end ? new Date(term.end).getFullYear() : new Date().getFullYear();
        return forYear >= start && forYear <= end;
      });
      if (matchingTerm) relevantTerm = matchingTerm;
    }

    const party = this.normalizeParty(relevantTerm.party);
    const startYear = new Date(relevantTerm.start).getFullYear();
    const endYear = relevantTerm.end ? new Date(relevantTerm.end).getFullYear() : null;

    const rep: Representative = {
      id: leg.id.bioguide,
      name: leg.name.official_full,
      party,
      district: relevantTerm.district?.toString() || '0',
      state: relevantTerm.state,
      startYear,
      endYear,
      bio: {
        fullName: leg.name.official_full,
        birthDate: leg.bio.birthday,
        summary: `${leg.name.official_full} served as a ${party} representative from ${relevantTerm.state}${relevantTerm.district ? `-${relevantTerm.district}` : ''}.`,
      }
    };

    // Add Wikipedia URL if available
    if (leg.id.wikipedia) {
      rep.wikiUrl = `https://en.wikipedia.org/wiki/${leg.id.wikipedia}`;
    }

    return rep;
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
   * Ensure data is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('CongressDataAPI not initialized. Call init() first.');
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Get data statistics
   */
  getStats() {
    return {
      current: this.currentLegislators.length,
      historical: this.historicalLegislators.length,
      total: this.currentLegislators.length + this.historicalLegislators.length,
      cached: this.cache.size,
      initialized: this.initialized
    };
  }
}

// Export singleton instance
export const congressDataAPI = new CongressDataAPI();
