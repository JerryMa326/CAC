import axios from 'axios';
import { Representative, Stance } from '@/types';

/**
 * Congress API Service
 * Integrates multiple APIs to get comprehensive congressional data
 */

// ProPublica Congress API
const PROPUBLICA_API_KEY = import.meta.env.VITE_PROPUBLICA_API_KEY || '';
const PROPUBLICA_BASE = 'https://api.propublica.org/congress/v1';
const HAS_PROPUBLICA_KEY = PROPUBLICA_API_KEY.length > 0;

// GovTrack API (no key required)
const GOVTRACK_BASE = 'https://www.govtrack.us/api/v2';

// Congress.gov API
const CONGRESS_GOV_BASE = 'https://api.congress.gov/v3';

interface ProPublicaMember {
  id: string;
  first_name: string;
  last_name: string;
  party: string;
  state: string;
  district: string;
  in_office: boolean;
  next_election: string;
  votes_with_party_pct: number;
  missed_votes_pct: number;
}

interface GovTrackPerson {
  id: number;
  name: string;
  birthday: string;
  gender: string;
  description: string;
}

export class CongressAPI {
  private cache: Map<string, any> = new Map();

  /**
   * Get current members of Congress from ProPublica
   */
  async getCurrentMembers(chamber: 'house' | 'senate' = 'house'): Promise<Representative[]> {
    if (!HAS_PROPUBLICA_KEY) {
      console.warn('⚠️  ProPublica API key not found. Add VITE_PROPUBLICA_API_KEY to .env file. See API_SETUP.md');
      return [];
    }

    const cacheKey = `current-${chamber}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await axios.get(
        `${PROPUBLICA_BASE}/118/${chamber}/members.json`,
        {
          headers: { 'X-API-Key': PROPUBLICA_API_KEY }
        }
      );

      const members = response.data.results[0].members;
      const representatives = members.map((m: ProPublicaMember) => this.mapToRepresentative(m));
      
      this.cache.set(cacheKey, representatives);
      console.log(`✅ Loaded ${representatives.length} current ${chamber} members from ProPublica`);
      return representatives;
    } catch (error: any) {
      console.error('❌ ProPublica API error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get historical members from a specific Congress session
   */
  async getHistoricalMembers(congress: number, chamber: 'house' | 'senate' = 'house'): Promise<Representative[]> {
    if (!HAS_PROPUBLICA_KEY) {
      console.warn('⚠️  ProPublica API key not found. Using GovTrack API instead...');
      // Fallback to GovTrack for historical data (no key required)
      return this.getGovTrackHistoricalMembers(congress, chamber);
    }

    const cacheKey = `historical-${congress}-${chamber}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await axios.get(
        `${PROPUBLICA_BASE}/${congress}/${chamber}/members.json`,
        {
          headers: { 'X-API-Key': PROPUBLICA_API_KEY }
        }
      );

      const members = response.data.results[0].members;
      const representatives = members.map((m: ProPublicaMember) => this.mapToRepresentative(m));
      
      this.cache.set(cacheKey, representatives);
      console.log(`✅ Loaded ${representatives.length} members from Congress ${congress}`);
      return representatives;
    } catch (error: any) {
      console.error(`❌ Error fetching Congress ${congress}:`, error.response?.data || error.message);
      // Fallback to GovTrack
      return this.getGovTrackHistoricalMembers(congress, chamber);
    }
  }

  /**
   * Get member voting record and stances
   */
  async getMemberVotes(memberId: string): Promise<Stance[]> {
    try {
      const response = await axios.get(
        `${PROPUBLICA_BASE}/members/${memberId}/votes.json`,
        {
          headers: { 'X-API-Key': PROPUBLICA_API_KEY }
        }
      );

      const votes = response.data.results[0].votes;
      return this.extractStancesFromVotes(votes);
    } catch (error) {
      console.error('Error fetching votes:', error);
      return [];
    }
  }

  /**
   * Get detailed member information from GovTrack
   */
  async getGovTrackPerson(bioguideId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${GOVTRACK_BASE}/person`,
        {
          params: {
            bioguideid: bioguideId,
            limit: 1
          }
        }
      );

      return response.data.objects[0] || null;
    } catch (error) {
      console.error('GovTrack API error:', error);
      return null;
    }
  }

  /**
   * Search for members by state and district
   */
  async getMembersByDistrict(state: string, district: string): Promise<Representative[]> {
    const cacheKey = `district-${state}-${district}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Use GovTrack API for historical data
      const response = await axios.get(
        `${GOVTRACK_BASE}/role`,
        {
          params: {
            state,
            district: district === '0' ? null : district,
            role_type: 'representative',
            limit: 100
          }
        }
      );

      const roles = response.data.objects;
      const representatives = await Promise.all(
        roles.map(async (role: any) => {
          const person = await this.getGovTrackPerson(role.person.bioguideid);
          return this.mapGovTrackToRepresentative(role, person);
        })
      );

      this.cache.set(cacheKey, representatives);
      return representatives;
    } catch (error) {
      console.error('Error fetching district members:', error);
      return [];
    }
  }

  /**
   * Get all historical members for a state
   */
  async getStateHistory(state: string): Promise<Representative[]> {
    try {
      const response = await axios.get(
        `${GOVTRACK_BASE}/role`,
        {
          params: {
            state,
            role_type: 'representative',
            limit: 1000,
            order_by: '-startdate'
          }
        }
      );

      const roles = response.data.objects;
      return roles.map((role: any) => this.mapGovTrackToRepresentative(role));
    } catch (error) {
      console.error('Error fetching state history:', error);
      return [];
    }
  }

  /**
   * Convert year to Congress number (Congress 1 started in 1789)
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
   * Map ProPublica member to our Representative type
   */
  private mapToRepresentative(member: ProPublicaMember): Representative {
    const party = this.normalizeParty(member.party);
    
    return {
      id: member.id,
      name: `${member.first_name} ${member.last_name}`,
      party,
      district: member.district || '0',
      state: member.state,
      startYear: 2023, // Current Congress
      endYear: member.in_office ? null : 2025,
    };
  }

  /**
   * Map GovTrack data to our Representative type
   */
  private mapGovTrackToRepresentative(role: any, person?: any): Representative {
    const startYear = new Date(role.startdate).getFullYear();
    const endYear = role.enddate ? new Date(role.enddate).getFullYear() : null;
    const party = this.normalizeParty(role.party);

    return {
      id: role.person.id.toString(),
      name: role.person.name,
      party,
      district: role.district?.toString() || '0',
      state: role.state,
      startYear,
      endYear,
      bio: person ? {
        fullName: person.name,
        birthDate: person.birthday,
        summary: person.description,
      } : undefined,
    };
  }

  /**
   * Normalize party names
   */
  private normalizeParty(party: string): 'Democrat' | 'Republican' | 'Independent' | 'Other' {
    const p = party.toUpperCase();
    if (p === 'D' || p === 'DEMOCRAT' || p === 'DEMOCRATIC') return 'Democrat';
    if (p === 'R' || p === 'REPUBLICAN') return 'Republican';
    if (p === 'I' || p === 'INDEPENDENT') return 'Independent';
    return 'Other';
  }

  /**
   * Extract policy stances from voting record
   */
  private extractStancesFromVotes(votes: any[]): Stance[] {
    const stances: Stance[] = [];
    const topics = new Map<string, { yes: number; no: number }>();

    // Analyze voting patterns
    votes.forEach((vote: any) => {
      const topic = this.categorizeVote(vote.description);
      if (!topics.has(topic)) {
        topics.set(topic, { yes: 0, no: 0 });
      }
      
      const stats = topics.get(topic)!;
      if (vote.position === 'Yes') stats.yes++;
      else if (vote.position === 'No') stats.no++;
    });

    // Convert to stances
    topics.forEach((stats, topic) => {
      const total = stats.yes + stats.no;
      const yesPercent = (stats.yes / total) * 100;
      
      stances.push({
        topic,
        position: yesPercent > 60 ? 'Generally supportive' : yesPercent < 40 ? 'Generally opposed' : 'Mixed record',
        year: new Date().getFullYear(),
        source: 'Voting Record Analysis',
      });
    });

    return stances.slice(0, 10); // Top 10 stances
  }

  /**
   * Categorize a vote by topic
   */
  private categorizeVote(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('healthcare') || desc.includes('health care') || desc.includes('medicare') || desc.includes('medicaid')) {
      return 'Healthcare';
    }
    if (desc.includes('climate') || desc.includes('environment') || desc.includes('energy')) {
      return 'Climate & Environment';
    }
    if (desc.includes('tax') || desc.includes('budget') || desc.includes('spending')) {
      return 'Fiscal Policy';
    }
    if (desc.includes('defense') || desc.includes('military') || desc.includes('veteran')) {
      return 'Defense & Veterans';
    }
    if (desc.includes('immigration') || desc.includes('border')) {
      return 'Immigration';
    }
    if (desc.includes('education') || desc.includes('student')) {
      return 'Education';
    }
    if (desc.includes('infrastructure') || desc.includes('transportation')) {
      return 'Infrastructure';
    }
    if (desc.includes('gun') || desc.includes('firearms') || desc.includes('second amendment')) {
      return 'Gun Policy';
    }
    if (desc.includes('abortion') || desc.includes('reproductive')) {
      return 'Reproductive Rights';
    }
    if (desc.includes('civil rights') || desc.includes('voting rights')) {
      return 'Civil Rights';
    }
    
    return 'General Legislation';
  }

  /**
   * Clear cache
   */
  /**
   * Get historical members from GovTrack (no API key required)
   */
  private async getGovTrackHistoricalMembers(congress: number, chamber: 'house' | 'senate'): Promise<Representative[]> {
    const years = this.congressToYears(congress);
    const cacheKey = `govtrack-${congress}-${chamber}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await axios.get(
        `${GOVTRACK_BASE}/role`,
        {
          params: {
            role_type: chamber === 'house' ? 'representative' : 'senator',
            startdate__gte: `${years.start}-01-01`,
            enddate__lte: `${years.end}-12-31`,
            limit: 500
          }
        }
      );

      const representatives = response.data.objects.map((role: any) => 
        this.mapGovTrackToRepresentative(role)
      );
      
      this.cache.set(cacheKey, representatives);
      console.log(`✅ Loaded ${representatives.length} members from GovTrack (Congress ${congress})`);
      return representatives;
    } catch (error) {
      console.error('GovTrack fallback error:', error);
      return [];
    }
  }

  /**
   * Check if APIs are configured
   */
  hasAPIKey(): boolean {
    return HAS_PROPUBLICA_KEY;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const congressAPI = new CongressAPI();
