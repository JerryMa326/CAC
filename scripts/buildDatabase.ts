#!/usr/bin/env tsx
/**
 * Backend Database Builder
 * Uses Gemini AI to scrape congressional data and build a static JSON database
 * Run: npm run build-db
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Load API key from .env
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || '';
const OUTPUT_FILE = path.join(__dirname, '../public/data/congress-data.json');

interface CongressMember {
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

class DatabaseBuilder {
  private genAI: GoogleGenerativeAI;
  private allMembers: CongressMember[] = [];

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    console.log('✅ Gemini AI initialized');
  }

  /**
   * Scrape a single congress session
   */
  async scrapeCongress(congressNumber: number): Promise<CongressMember[]> {
    const startYear = 1789 + (congressNumber - 1) * 2;
    const endYear = startYear + 2;

    console.log(`\n🔍 Scraping ${congressNumber}th Congress (${startYear}-${endYear})...`);

    const model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash'
    });

    const prompt = `Extract data for ALL members of the ${congressNumber}th US Congress (${startYear}-${endYear}).

For EACH member (typically ~535 total: 435 House + 100 Senate), provide:

1. Full name (format: "Last, First")
2. Party (Democrat, Republican, Whig, Federalist, etc.)
3. State (2-letter code like "CA", "NY")
4. District number (for House, or "0" for Senators)
5. Chamber ("House" or "Senate")
6. Service years
7. Birth/death years
8. Brief biography (2 sentences)
9. 2-3 key positions/votes
10. Major bills (1-2)
11. Committees
12. Political ideology estimate (-100 left to +100 right for economic and social)

Return ONLY valid JSON array. Example:
[
  {
    "name": "Clay, Henry",
    "fullName": "Henry Clay",
    "party": "Whig",
    "state": "KY",
    "district": "0",
    "chamber": "Senate",
    "startYear": ${startYear},
    "endYear": ${endYear},
    "born": "1777",
    "died": "1852",
    "biography": "Known as the Great Compromiser. Served as Speaker and Secretary of State.",
    "keyVotes": ["Missouri Compromise", "Compromise of 1850"],
    "majorBills": ["American System"],
    "committees": ["Foreign Relations"],
    "politicalSpectrum": {"economic": 25, "social": 10, "overall": "Moderate"}
  }
]

IMPORTANT: Return ALL members for this congress. Be accurate and thorough.`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('❌ No JSON found in response');
        console.log('Response:', text.substring(0, 500));
        return [];
      }

      const members: Omit<CongressMember, 'id' | 'congressNumber'>[] = JSON.parse(jsonMatch[0]);
      
      // Add IDs and congress number
      const processedMembers: CongressMember[] = members.map((m, idx) => ({
        id: `${m.state}-${m.district}-${startYear}-${idx}`,
        congressNumber,
        ...m
      }));

      console.log(`✅ Extracted ${processedMembers.length} members`);
      
      // Sample first member
      if (processedMembers[0]) {
        console.log(`   Sample: ${processedMembers[0].name} (${processedMembers[0].party}-${processedMembers[0].state})`);
      }
      
      return processedMembers;
    } catch (error: any) {
      console.error(`❌ Error scraping Congress ${congressNumber}:`, error.message);
      return [];
    }
  }

  /**
   * Scrape multiple congress sessions
   */
  async scrapeRange(start: number, end: number): Promise<void> {
    console.log(`\n🚀 Starting scrape: Congress ${start}-${end}`);
    console.log(`   This will take approximately ${((end - start + 1) * 2)} seconds\n`);

    for (let congress = start; congress <= end; congress++) {
      const members = await this.scrapeCongress(congress);
      this.allMembers.push(...members);

      // Progress
      const progress = ((congress - start + 1) / (end - start + 1) * 100).toFixed(1);
      console.log(`📊 Progress: ${progress}% (${this.allMembers.length} total members)`);

      // Rate limiting: 1.5 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log(`\n✅ Scraping complete! Total members: ${this.allMembers.length}`);
  }

  /**
   * Save to JSON file
   */
  async saveDatabase(): Promise<void> {
    console.log(`\n💾 Saving database to ${OUTPUT_FILE}...`);

    // Ensure directory exists
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create database structure
    const database = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      totalMembers: this.allMembers.length,
      congressRange: {
        min: Math.min(...this.allMembers.map(m => m.congressNumber)),
        max: Math.max(...this.allMembers.map(m => m.congressNumber))
      },
      yearRange: {
        min: Math.min(...this.allMembers.map(m => m.startYear)),
        max: Math.max(...this.allMembers.map(m => m.endYear || new Date().getFullYear()))
      },
      members: this.allMembers
    };

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2));

    const sizeInMB = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2);
    console.log(`✅ Database saved! Size: ${sizeInMB} MB`);
    console.log(`   Total members: ${this.allMembers.length}`);
  }

  /**
   * Load existing database
   */
  async loadExisting(): Promise<void> {
    if (fs.existsSync(OUTPUT_FILE)) {
      console.log('📂 Loading existing database...');
      const data = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      this.allMembers = data.members || [];
      console.log(`✅ Loaded ${this.allMembers.length} existing members`);
    }
  }
}

// Main execution
async function main() {
  console.log('🤖 Congressional Database Builder\n');

  if (!GEMINI_API_KEY) {
    console.error('❌ No VITE_GEMINI_API_KEY found in .env file');
    process.exit(1);
  }

  const builder = new DatabaseBuilder(GEMINI_API_KEY);

  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'test') {
    // Test with recent congress
    console.log('🧪 Test mode: Scraping only 118th Congress (2023-2025)\n');
    await builder.scrapeCongress(118);
    await builder.saveDatabase();
  } else if (command === 'recent') {
    // Scrape recent 10 congresses
    console.log('📅 Recent mode: Scraping last 10 congresses (110-118)\n');
    await builder.loadExisting();
    await builder.scrapeRange(110, 118);
    await builder.saveDatabase();
  } else if (command === 'full') {
    // Scrape everything
    console.log('📚 Full mode: Scraping ALL congresses (1-118)\n');
    console.log('⚠️  WARNING: This will take ~3-4 minutes and use ~118 API calls\n');
    
    await builder.loadExisting();
    await builder.scrapeRange(1, 118);
    await builder.saveDatabase();
  } else {
    console.log('Usage:');
    console.log('  npm run build-db test    # Test with 118th Congress only');
    console.log('  npm run build-db recent  # Last 10 congresses (110-118)');
    console.log('  npm run build-db full    # All congresses (1-118)');
    process.exit(0);
  }

  console.log('\n🎉 Done! Database ready to use.');
}

main().catch(console.error);
