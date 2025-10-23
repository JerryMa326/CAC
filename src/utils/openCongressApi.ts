import axios from 'axios';
import { Representative, Stance } from '@/types';

/**
 * Open Congress Data API
 * Uses ONLY publicly available APIs that require NO API keys
 */

// GovTrack API (No key required, fully open)
const GOVTRACK_BASE = 'https://www.govtrack.us/api/v2';

// Wikipedia API (No key required)
const WIKIPEDIA_BASE = 'https://en.wikipedia.org/w/api.php';

// Ballotpedia API / Scraping alternative
const BALLOTPEDIA_BASE = 'https://ballotpedia.org';

// Congress.gov (Some endpoints are open)
const CONGRESS_BASE = 'https://api.congress.gov/v3';

// theunitedstates.io (Open government data project)
const UNITEDSTATES_BASE = 'https://theunitedstates.io';

// FEC API (No key for basic queries)
const FEC_BASE = 'https://api.open.fec.gov/v1';

interface GovTrackRole {
  person: {
    id: number;
    name: string;
    bioguideid: string;
    firstname: string;
    lastname: string;
  };
  role_type: string;
  startdate: string;
  enddate: string | null;
  party: string;
  state: string;
  district: number | null;
}

interface GovTrackPerson {
  id: number;
  name: string;
  birthday: string;
  gender: string;
  description: string;
  osid: string;
  bioguideid: string;
  youtubeid: string;
  twitterid: string;
}

export class OpenCongressAPI {
  private cache: Map<string, any> = new Map();

  /**
   * Get current members of Congress from GovTrack
   * NO API KEY REQUIRED - Works immediately!
   */
  async getCurrentMembers(chamber: 'house' | 'senate' = 'house'): Promise<Representative[]> {
    const cacheKey = `current-${chamber}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await axios.get(`${GOVTRACK_BASE}/role`, {
        params: {
          role_type: chamber === 'house' ? 'representative' : 'senator',
          current: 'true',
          limit: 600
        }
      });

      const roles = response.data.objects;
      const representatives = await this.enrichWithPersonData(roles);
      
      this.cache.set(cacheKey, representatives);
      console.log(`✅ Loaded ${representatives.length} current ${chamber} members from GovTrack`);
      return representatives;
    } catch (error: any) {
      console.error('❌ GovTrack API error:', error.message);
      return [];
    }
  }

  /**
   * Get historical members by year range
   */
  async getMembersByYear(year: number, chamber: 'house' | 'senate' = 'house'): Promise<Representative[]> {
    const cacheKey = `year-${year}-${chamber}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await axios.get(`${GOVTRACK_BASE}/role`, {
        params: {
          role_type: chamber === 'house' ? 'representative' : 'senator',
          startdate__lte: `${year}-12-31`,
          enddate__gte: `${year}-01-01`,
          limit: 600
        }
      });

      const roles = response.data.objects;
      const representatives = this.mapRolesToRepresentatives(roles);
      
      this.cache.set(cacheKey, representatives);
      console.log(`✅ Loaded ${representatives.length} members from ${year}`);
      return representatives;
    } catch (error: any) {
      console.error(`❌ Error fetching members for ${year}:`, error.message);
      return [];
    }
  }

  /**
   * Get all representatives who served in a specific district
   */
  async getDistrictHistory(state: string, district: string): Promise<Representative[]> {
    const cacheKey = `district-${state}-${district}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await axios.get(`${GOVTRACK_BASE}/role`, {
        params: {
          state,
          district: district === '0' ? null : district,
          role_type: 'representative',
          limit: 100,
          order_by: '-startdate'
        }
      });

      const roles = response.data.objects;
      const representatives = await this.enrichWithPersonData(roles);
      
      this.cache.set(cacheKey, representatives);
      console.log(`✅ Loaded ${representatives.length} historical members for ${state}-${district}`);
      return representatives;
    } catch (error: any) {
      console.error('❌ Error fetching district history:', error.message);
      return [];
    }
  }

  /**
   * Get detailed person information
   */
  async getPersonDetails(personId: number): Promise<GovTrackPerson | null> {
    const cacheKey = `person-${personId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await axios.get(`${GOVTRACK_BASE}/person/${personId}`);
      const person = response.data;
      
      this.cache.set(cacheKey, person);
      return person;
    } catch (error) {
      console.error(`Error fetching person ${personId}:`, error);
      return null;
    }
  }

  /**
   * Get voting record for a person from GovTrack
   */
  async getVotingRecord(personId: number): Promise<Stance[]> {
    try {
      const response = await axios.get(`${GOVTRACK_BASE}/vote_voter`, {
        params: {
          person: personId,
          limit: 100,
          order_by: '-created'
        }
      });

      const votes = response.data.objects;
      return this.extractStancesFromGovTrackVotes(votes);
    } catch (error) {
      console.error('Error fetching voting record:', error);
      return [];
    }
  }

  /**
   * Search Wikipedia for representative information
   */
  async getWikipediaInfo(name: string): Promise<any> {
    try {
      // Search for the person
      const searchResponse = await axios.get(WIKIPEDIA_BASE, {
        params: {
          action: 'query',
          format: 'json',
          list: 'search',
          srsearch: `${name} United States Representative`,
          srlimit: 1,
          origin: '*'
        }
      });

      const searchResults = searchResponse.data.query?.search;
      if (!searchResults || searchResults.length === 0) {
        return null;
      }

      const pageTitle = searchResults[0].title;

      // Get page content
      const pageResponse = await axios.get(WIKIPEDIA_BASE, {
        params: {
          action: 'query',
          format: 'json',
          titles: pageTitle,
          prop: 'extracts|pageimages',
          exintro: true,
          explaintext: true,
          piprop: 'original',
          origin: '*'
        }
      });

      const pages = pageResponse.data.query.pages;
      const page = Object.values(pages)[0] as any;

      return {
        title: page.title,
        extract: page.extract,
        imageUrl: page.original?.source,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`
      };
    } catch (error) {
      console.error('Wikipedia API error:', error);
      return null;
    }
  }

  /**
   * Get all states with their representatives
   */
  async getAllStates(): Promise<string[]> {
    return [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];
  }

  /**
   * Bulk load all representatives for a year
   */
  async loadAllRepresentativesForYear(year: number): Promise<Map<string, Representative[]>> {
    const districtMap = new Map<string, Representative[]>();
    
    try {
      const members = await this.getMembersByYear(year, 'house');
      
      members.forEach(member => {
        const key = `${member.state}-${member.district}`;
        if (!districtMap.has(key)) {
          districtMap.set(key, []);
        }
        districtMap.get(key)!.push(member);
      });

      console.log(`✅ Loaded ${districtMap.size} districts for year ${year}`);
      return districtMap;
    } catch (error) {
      console.error('Error loading all representatives:', error);
      return districtMap;
    }
  }

  /**
   * Enrich roles with person data
   */
  private async enrichWithPersonData(roles: GovTrackRole[]): Promise<Representative[]> {
    const representatives: Representative[] = [];

    for (const role of roles) {
      const person = await this.getPersonDetails(role.person.id);
      const rep = this.mapRoleToRepresentative(role, person);
      representatives.push(rep);
    }

    return representatives;
  }

  /**
   * Map GovTrack role to Representative
   */
  private mapRoleToRepresentative(role: GovTrackRole, person?: GovTrackPerson | null): Representative {
    const startYear = new Date(role.startdate).getFullYear();
    const endYear = role.enddate ? new Date(role.enddate).getFullYear() : null;
    const party = this.normalizeParty(role.party);

    const rep: Representative = {
      id: role.person.id.toString(),
      name: role.person.name,
      party,
      district: role.district?.toString() || '0',
      state: role.state,
      startYear,
      endYear,
    };

    if (person) {
      rep.bio = {
        fullName: person.name,
        birthDate: person.birthday,
        summary: person.description || `Representative from ${role.state}`,
      };
    }

    return rep;
  }

  /**
   * Map multiple roles to representatives
   */
  private mapRolesToRepresentatives(roles: GovTrackRole[]): Representative[] {
    return roles.map(role => this.mapRoleToRepresentative(role));
  }

  /**
   * Normalize party names
   */
  private normalizeParty(party: string): 'Democrat' | 'Republican' | 'Independent' | 'Other' {
    const p = party.toUpperCase();
    if (p === 'DEMOCRAT' || p === 'DEMOCRATIC') return 'Democrat';
    if (p === 'REPUBLICAN') return 'Republican';
    if (p === 'INDEPENDENT') return 'Independent';
    return 'Other';
  }

  /**
   * Extract stances from GovTrack voting record
   */
  private extractStancesFromGovTrackVotes(votes: any[]): Stance[] {
    const topicVotes = new Map<string, { yes: number; no: number; total: number }>();

    votes.forEach(vote => {
      if (!vote.vote?.question) return;
      
      const topic = this.categorizeVote(vote.vote.question);
      if (!topicVotes.has(topic)) {
        topicVotes.set(topic, { yes: 0, no: 0, total: 0 });
      }

      const stats = topicVotes.get(topic)!;
      stats.total++;
      
      if (vote.option?.value === '+') stats.yes++;
      else if (vote.option?.value === '-') stats.no++;
    });

    const stances: Stance[] = [];
    topicVotes.forEach((stats, topic) => {
      const yesPercent = (stats.yes / stats.total) * 100;
      
      let position = 'Mixed record';
      if (yesPercent > 70) position = 'Strongly supportive';
      else if (yesPercent > 55) position = 'Generally supportive';
      else if (yesPercent < 30) position = 'Strongly opposed';
      else if (yesPercent < 45) position = 'Generally opposed';

      stances.push({
        topic,
        position,
        year: new Date().getFullYear(),
        source: `Based on ${stats.total} votes`
      });
    });

    return stances.slice(0, 10);
  }

  /**
   * Categorize votes by topic
   */
  private categorizeVote(question: string): string {
    const q = question.toLowerCase();
    
    if (q.includes('health') || q.includes('medicare') || q.includes('medicaid')) return 'Healthcare';
    if (q.includes('climate') || q.includes('environment') || q.includes('energy')) return 'Climate & Environment';
    if (q.includes('tax') || q.includes('budget') || q.includes('spending')) return 'Fiscal Policy';
    if (q.includes('defense') || q.includes('military')) return 'Defense';
    if (q.includes('immigration') || q.includes('border')) return 'Immigration';
    if (q.includes('education')) return 'Education';
    if (q.includes('infrastructure')) return 'Infrastructure';
    if (q.includes('gun') || q.includes('firearm')) return 'Gun Policy';
    if (q.includes('abortion') || q.includes('reproductive')) return 'Reproductive Rights';
    if (q.includes('civil rights') || q.includes('voting')) return 'Civil Rights';
    
    return 'General Legislation';
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
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
}

export const openCongressAPI = new OpenCongressAPI();
