import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

interface CongressionalMember {
  name: string;
  fullName: string;
  party: string;
  state: string;
  district?: string;
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
    economic: number; // -100 (far left) to +100 (far right)
    social: number;
    overall: string; // "Progressive", "Moderate", "Conservative", etc.
  };
  imageUrl?: string;
  wikipediaUrl?: string;
}

export class GeminiDataCollector {
  private genAI: GoogleGenerativeAI | null = null;
  private hasKey: boolean;

  constructor() {
    this.hasKey = API_KEY.length > 0;
    if (this.hasKey) {
      this.genAI = new GoogleGenerativeAI(API_KEY);
      console.log('✅ Gemini API initialized');
    } else {
      console.warn('⚠️ No Gemini API key found');
    }
  }

  /**
   * Scrape congressional data for a specific congress session
   */
  async scrapeCongressSession(congressNumber: number): Promise<CongressionalMember[]> {
    if (!this.genAI) {
      throw new Error('Gemini API not initialized');
    }

    const startYear = 1789 + (congressNumber - 1) * 2;
    const endYear = startYear + 2;

    console.log(`🔍 Scraping ${congressNumber}th Congress (${startYear}-${endYear})...`);

    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
You are a historical data extraction expert. Extract comprehensive information about ALL members of the ${congressNumber}th United States Congress (${startYear}-${endYear}).

For EACH member, provide:
1. Full name (Last, First Middle)
2. Party affiliation (Democrat, Republican, Whig, Federalist, etc.)
3. State represented
4. District number (for House) or "Senator" for Senate
5. Chamber (House or Senate)
6. Exact years of service in this Congress
7. Birth year and death year (if deceased)
8. 2-3 sentence biography highlighting their major contributions
9. 3-5 key votes or positions they took
10. Major bills they sponsored or championed
11. Committee assignments
12. Political spectrum estimate:
    - Economic position (-100 far left to +100 far right)
    - Social position (-100 far left to +100 far right)
    - Overall classification (Progressive/Liberal/Moderate/Conservative/Very Conservative)
13. Wikipedia URL

Format your response as a valid JSON array. Example:
[
  {
    "name": "Clay, Henry",
    "fullName": "Henry Clay",
    "party": "Whig",
    "state": "KY",
    "district": "Senator",
    "chamber": "Senate",
    "startYear": ${startYear},
    "endYear": ${endYear},
    "born": "1777",
    "died": "1852",
    "biography": "Known as the 'Great Compromiser'. Served as Speaker of the House and Secretary of State. Author of the American System and Missouri Compromise.",
    "keyVotes": [
      "Supported Missouri Compromise (1820)",
      "Advocated for Compromise of 1850",
      "Opposed annexation of Texas"
    ],
    "majorBills": [
      "American System (infrastructure development)",
      "Compromise Tariff of 1833"
    ],
    "committees": ["Foreign Relations", "Finance"],
    "politicalSpectrum": {
      "economic": 25,
      "social": 10,
      "overall": "Moderate Conservative"
    },
    "wikipediaUrl": "https://en.wikipedia.org/wiki/Henry_Clay"
  }
]

Provide data for ALL members (typically 435 House + 100 Senate = ~535 members). Be comprehensive and accurate.`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const members: CongressionalMember[] = JSON.parse(jsonMatch[0]);
      console.log(`✅ Extracted ${members.length} members from ${congressNumber}th Congress`);
      
      return members;
    } catch (error) {
      console.error(`❌ Error scraping Congress ${congressNumber}:`, error);
      throw error;
    }
  }

  /**
   * Scrape a specific member's detailed information
   */
  async scrapeMemberDetails(name: string, year: number): Promise<CongressionalMember | null> {
    if (!this.genAI) {
      throw new Error('Gemini API not initialized');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
Extract comprehensive information about U.S. Representative/Senator "${name}" who served around ${year}.

Provide detailed JSON with:
- Full biographical information
- All terms of service
- Major legislative achievements
- Key votes and positions
- Committee assignments
- Political ideology assessment
- Wikipedia and other sources

Format as valid JSON matching this structure:
{
  "name": "Last, First",
  "fullName": "First Middle Last",
  "party": "Party Name",
  "state": "State",
  "district": "District or Senator",
  "chamber": "House or Senate",
  "startYear": year,
  "endYear": year or null,
  "born": "birth year",
  "died": "death year or null",
  "biography": "Comprehensive biography",
  "keyVotes": ["vote1", "vote2"],
  "majorBills": ["bill1", "bill2"],
  "committees": ["committee1"],
  "politicalSpectrum": {
    "economic": number,
    "social": number,
    "overall": "classification"
  },
  "wikipediaUrl": "url"
}`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const member: CongressionalMember = JSON.parse(jsonMatch[0]);
      console.log(`✅ Scraped details for ${name}`);
      
      return member;
    } catch (error) {
      console.error(`❌ Error scraping member ${name}:`, error);
      return null;
    }
  }

  /**
   * Batch scrape multiple congress sessions
   */
  async scrapeMultipleCongressSessions(
    startCongress: number,
    endCongress: number,
    onProgress?: (current: number, total: number) => void
  ): Promise<CongressionalMember[]> {
    const allMembers: CongressionalMember[] = [];
    const total = endCongress - startCongress + 1;

    for (let congress = startCongress; congress <= endCongress; congress++) {
      try {
        const members = await this.scrapeCongressSession(congress);
        allMembers.push(...members);
        
        if (onProgress) {
          onProgress(congress - startCongress + 1, total);
        }

        // Rate limiting: wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to scrape Congress ${congress}, continuing...`);
      }
    }

    return allMembers;
  }

  hasAPIKey(): boolean {
    return this.hasKey;
  }
}

export const geminiCollector = new GeminiDataCollector();
