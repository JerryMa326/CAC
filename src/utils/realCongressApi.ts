import axios from 'axios';
import { Representative } from '@/types';

/**
 * Official Congress.gov API Integration
 * 
 * API Documentation: https://github.com/LibraryOfCongress/api.congress.gov
 * Sign up for free key: https://api.congress.gov/sign-up/
 * Rate limit: 5,000 requests/hour
 * 
 * This is the OFFICIAL Library of Congress API - actively maintained and reliable
 */

const CONGRESS_API_BASE = 'https://api.congress.gov/v3';
const API_KEY = import.meta.env.VITE_CONGRESS_API_KEY || '';

interface CongressMember {
  bioguideId: string;
  name: string;
  state: string;
  district?: number;
  partyName: string;
  depiction?: {
    imageUrl: string;
    attribution: string;
  };
  terms?: {
    item: Array<{
      chamber: string;
      startYear: number;
      endYear?: number;
    }>;
  };
  url: string;
}

interface ApiResponse {
  members?: CongressMember[];
  member?: CongressMember;
  pagination?: {
    count: number;
    next?: string;
  };
}

export class RealCongressAPI {
  private cache: Map<string, any> = new Map();
  private hasKey: boolean;

  constructor() {
    this.hasKey = API_KEY.length > 0;
    if (!this.hasKey) {
      console.warn('⚠️  Congress.gov API key not found.');
      console.warn('📝 Get your free key at: https://api.congress.gov/sign-up/');
      console.warn('💡 Add to .env: VITE_CONGRESS_API_KEY=your_key_here');
    }
  }

  /**
   * Get current members of Congress (118th Congress - 2023-2025)
   */
  async getCurrentMembers(chamber: 'house' | 'senate' = 'house'): Promise<Representative[]> {
    if (!this.hasKey) {
      throw new Error('API key required. Get one at https://api.congress.gov/sign-up/');
    }

    const cacheKey = `current-${chamber}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Get current Congress (118th)
      const members = await this.getMembersByCongress(118, chamber, true);
      this.cache.set(cacheKey, members);
      console.log(`✅ Loaded ${members.length} current ${chamber} members`);
      return members;
    } catch (error: any) {
      console.error('❌ Error fetching current members:', error.message);
      throw error;
    }
  }

  /**
   * Get members from a specific Congress number
   */
  async getMembersByCongress(
    congress: number,
    chamber: 'house' | 'senate' = 'house',
    currentOnly = false
  ): Promise<Representative[]> {
    if (!this.hasKey) {
      throw new Error('API key required');
    }

    const cacheKey = `congress-${congress}-${chamber}-${currentOnly}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const url = `${CONGRESS_API_BASE}/member/congress/${congress}`;
      const response = await axios.get<ApiResponse>(url, {
        params: {
          api_key: API_KEY,
          currentMember: currentOnly,
          limit: 250 // Max allowed
        }
      });

      const allMembers = response.data.members || [];
      
      // Filter by chamber
      const chamberMembers = allMembers.filter(member => {
        const lastTerm = member.terms?.item[member.terms.item.length - 1];
        const memberChamber = lastTerm?.chamber === 'Senate' ? 'senate' : 'house';
        return memberChamber === chamber;
      });

      const representatives = chamberMembers.map(m => this.mapToRepresentative(m));
      
      this.cache.set(cacheKey, representatives);
      console.log(`✅ Loaded ${representatives.length} members from Congress ${congress}`);
      return representatives;
    } catch (error: any) {
      console.error(`❌ Error fetching Congress ${congress}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get members by year (converts year to Congress number)
   */
  async getMembersByYear(year: number, chamber: 'house' | 'senate' = 'house'): Promise<Representative[]> {
    const congress = this.yearToCongress(year);
    if (congress < 1) {
      throw new Error(`Year ${year} predates the First Congress (1789)`);
    }
    
    return this.getMembersByCongress(congress, chamber, false);
  }

  /**
   * Get members from a specific state and district
   */
  async getMembersByDistrict(
    congress: number,
    state: string,
    district: string
  ): Promise<Representative[]> {
    if (!this.hasKey) {
      throw new Error('API key required');
    }

    const cacheKey = `district-${congress}-${state}-${district}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const url = `${CONGRESS_API_BASE}/member/congress/${congress}/${state}/${district}`;
      const response = await axios.get<ApiResponse>(url, {
        params: {
          api_key: API_KEY,
          currentMember: false // Get all who served
        }
      });

      const members = response.data.members || [];
      const representatives = members.map(m => this.mapToRepresentative(m));
      
      this.cache.set(cacheKey, representatives);
      console.log(`✅ Loaded ${representatives.length} members for ${state}-${district}`);
      return representatives;
    } catch (error: any) {
      console.error(`❌ Error fetching ${state}-${district}:`, error.response?.data || error.message);
      return []; // Return empty if district doesn't exist
    }
  }

  /**
   * Get detailed member information by bioguideId
   */
  async getMemberDetails(bioguideId: string): Promise<Representative | null> {
    if (!this.hasKey) {
      throw new Error('API key required');
    }

    const cacheKey = `member-${bioguideId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const url = `${CONGRESS_API_BASE}/member/${bioguideId}`;
      const response = await axios.get<ApiResponse>(url, {
        params: { api_key: API_KEY }
      });

      if (!response.data.member) return null;

      const representative = this.mapToRepresentative(response.data.member);
      this.cache.set(cacheKey, representative);
      return representative;
    } catch (error) {
      console.error(`Error fetching member ${bioguideId}:`, error);
      return null;
    }
  }

  /**
   * Load all representatives for a specific year
   */
  async loadAllRepresentativesForYear(year: number): Promise<Map<string, Representative[]>> {
    const congress = this.yearToCongress(year);
    const members = await this.getMembersByCongress(congress, 'house', false);
    
    const districtMap = new Map<string, Representative[]>();
    members.forEach(member => {
      const key = `${member.state}-${member.district}`;
      if (!districtMap.has(key)) {
        districtMap.set(key, []);
      }
      districtMap.get(key)!.push(member);
    });
    
    // Debug: Show first few actual district keys
    const keys = Array.from(districtMap.keys()).slice(0, 10);
    console.log('🗺️ Actual district keys from API:', keys);
    console.log('🏛️ Sample district data:', keys[0] ? districtMap.get(keys[0]) : 'None');
    
    console.log(`📦 Organized ${districtMap.size} districts for year ${year}`);
    return districtMap;
  }

  /**
   * Convert year to Congress number
   * First Congress started in 1789
   */
  yearToCongress(year: number): number {
    if (year < 1789) return 0;
    return Math.floor((year - 1789) / 2) + 1;
  }

  /**
   * Convert Congress number to year range
   */
  congressToYears(congress: number): { start: number; end: number } {
    const start = 1789 + (congress - 1) * 2;
    return { start, end: start + 2 };
  }

  /**
   * Map Congress.gov member to our Representative type
   */
  private mapToRepresentative(member: CongressMember): Representative {
    // Get the most recent term
    const terms = member.terms?.item || [];
    const lastTerm = terms[terms.length - 1];
    const firstTerm = terms[0];

    const party = this.normalizeParty(member.partyName);
    
    return {
      id: member.bioguideId,
      name: member.name,
      party,
      district: member.district?.toString() || '0',
      state: member.state,
      startYear: firstTerm?.startYear || new Date().getFullYear(),
      endYear: lastTerm?.endYear || null,
      imageUrl: member.depiction?.imageUrl,
      bio: {
        fullName: member.name,
        summary: `${member.name} served as a ${party} ${lastTerm?.chamber === 'Senate' ? 'Senator' : 'Representative'} from ${member.state}.`,
      }
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
    if (p.includes('libertarian')) return 'Other';
    return 'Other';
  }

  /**
   * Check if API is configured
   */
  hasAPIKey(): boolean {
    return this.hasKey;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Get available Congress range
   * Based on API coverage: 80th Congress (1947) to present
   */
  getAvailableCongresses(): { min: number; max: number } {
    return {
      min: 80, // 1947-1949
      max: 118 // 2023-2025 (current)
    };
  }

  /**
   * Get years covered by the API
   */
  getYearRange(): { min: number; max: number } {
    return {
      min: 1947,
      max: new Date().getFullYear()
    };
  }
}

export const realCongressAPI = new RealCongressAPI();
