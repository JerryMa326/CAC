interface LegislatorRecord {
  id: {
    bioguide: string;
    govtrack?: number;
    wikipedia?: string;
  };
  name: {
    first: string;
    last: string;
    full: string;
  };
  bio: {
    birthday: string;
    gender: string;
  };
  terms: {
    type: 'rep' | 'sen';
    start: string;
    end: string;
    state: string;
    district?: number;
    party: string;
  }[];
}

export interface LegislatorTerm {
  bioguide: string;
  fullName: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  district?: number;
  startYear: number;
  endYear: number;
  wikipedia?: string;
}

class CongressionalDataLoader {
  private allTerms: LegislatorTerm[] = [];
  private isLoaded = false;

  /**
   * Loads and merges the historical and current legislator data.
   */
  private async loadAndProcessData(): Promise<void> {
    if (this.isLoaded) return;

    try {
      const [historicalRes, currentRes] = await Promise.all([
        fetch('/data/legislators-historical.json'),
        fetch('/data/legislators-current.json'),
      ]);

      if (!historicalRes.ok || !currentRes.ok) {
        throw new Error('Failed to fetch legislator files.');
      }

      const historicalData: LegislatorRecord[] = await historicalRes.json();
      const currentData: LegislatorRecord[] = await currentRes.json();

      const allLegislators = [...historicalData, ...currentData];
      this.allTerms = this.flattenLegislatorTerms(allLegislators);
      this.isLoaded = true;
    } catch {
      this.allTerms = [];
    }
  }

  /**
   * Flattens the nested term structure from the raw data into a simple array.
   */
  private flattenLegislatorTerms(legislators: LegislatorRecord[]): LegislatorTerm[] {
    const allTerms: LegislatorTerm[] = [];

    for (const legislator of legislators) {
      const fullName = (legislator as any)?.name?.official_full
        || (legislator as any)?.name?.full
        || `${(legislator as any)?.name?.first || ''} ${(legislator as any)?.name?.last || ''}`.trim();
      for (const term of legislator.terms) {
        allTerms.push({
          bioguide: legislator.id.bioguide,
          fullName,
          party: term.party || 'Unknown',
          state: term.state,
          chamber: term.type === 'rep' ? 'House' : 'Senate',
          district: term.district,
          startYear: new Date(term.start).getFullYear(),
          endYear: new Date(term.end).getFullYear(),
          wikipedia: legislator.id.wikipedia,
        });
      }
    }
    return allTerms;
  }

  /**
   * Gets all legislator terms that were active during a specific year.
   */
  public async getMembersForYear(year: number): Promise<LegislatorTerm[]> {
    await this.loadAndProcessData();
    return this.allTerms.filter(term => year >= term.startYear && year <= term.endYear);
  }
}

export const dataLoader = new CongressionalDataLoader();
