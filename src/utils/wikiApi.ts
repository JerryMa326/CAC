import axios from 'axios';
import { Biography, Representative } from '@/types';

const WIKI_API_BASE = 'https://en.wikipedia.org/w/api.php';

interface WikiSearchResult {
  pageid: number;
  title: string;
  snippet: string;
}

interface WikiPageContent {
  extract: string;
  thumbnail?: {
    source: string;
  };
}

export class WikipediaAPI {
  private cache: Map<string, any> = new Map();

  /**
   * Search for a person on Wikipedia
   */
  async searchPerson(name: string): Promise<WikiSearchResult[]> {
    const cacheKey = `search:${name}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await axios.get(WIKI_API_BASE, {
        params: {
          action: 'query',
          list: 'search',
          srsearch: name,
          format: 'json',
          origin: '*',
          srlimit: 5,
        },
      });

      const results = response.data.query.search;
      this.cache.set(cacheKey, results);
      return results;
    } catch (error) {
      console.error('Wiki search error:', error);
      return [];
    }
  }

  /**
   * Get page content and extract biographical information
   */
  async getPageContent(pageId: number): Promise<WikiPageContent | null> {
    const cacheKey = `page:${pageId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await axios.get(WIKI_API_BASE, {
        params: {
          action: 'query',
          pageids: pageId,
          prop: 'extracts|pageimages',
          exintro: true,
          explaintext: true,
          piprop: 'thumbnail',
          pithumbsize: 300,
          format: 'json',
          origin: '*',
        },
      });

      const page = response.data.query.pages[pageId];
      const content = {
        extract: page.extract || '',
        thumbnail: page.thumbnail,
      };
      
      this.cache.set(cacheKey, content);
      return content;
    } catch (error) {
      console.error('Wiki page error:', error);
      return null;
    }
  }

  /**
   * Parse biographical information from Wikipedia extract
   */
  parseBiography(extract: string, name: string): Biography {
    const bio: Biography = {
      fullName: name,
      summary: extract,
    };

    // Extract birth date (pattern: "born Month Day, Year")
    const birthMatch = extract.match(/born\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i);
    if (birthMatch) {
      bio.birthDate = birthMatch[1];
    }

    // Extract birth place
    const birthPlaceMatch = extract.match(/born[^.]*in\s+([A-Z][^.,]+(?:,\s*[A-Z][^.,]+)?)/i);
    if (birthPlaceMatch) {
      bio.birthPlace = birthPlaceMatch[1];
    }

    // Extract education (looking for university/college mentions)
    const educationMatches = extract.match(/(?:attended|graduated from|studied at|degree from)\s+([A-Z][^.,]+(?:University|College|Institute)[^.,]*)/gi);
    if (educationMatches) {
      bio.education = educationMatches.map(match => 
        match.replace(/^(attended|graduated from|studied at|degree from)\s+/i, '')
      );
    }

    // Extract early life section (first 2-3 sentences)
    const sentences = extract.split('.').filter(s => s.trim().length > 20);
    if (sentences.length > 0) {
      bio.earlyLife = sentences.slice(0, Math.min(3, sentences.length)).join('.') + '.';
    }

    return bio;
  }

  /**
   * Get full representative information from Wikipedia
   */
  async getRepresentativeInfo(rep: Representative): Promise<Representative> {
    try {
      // Search for the representative
      const searchResults = await this.searchPerson(`${rep.name} congress`);
      
      if (searchResults.length === 0) {
        return rep;
      }

      // Get the first result (most relevant)
      const firstResult = searchResults[0];
      const pageContent = await this.getPageContent(firstResult.pageid);

      if (!pageContent) {
        return rep;
      }

      // Parse biography
      const bio = this.parseBiography(pageContent.extract, rep.name);

      return {
        ...rep,
        bio,
        imageUrl: pageContent.thumbnail?.source,
        wikiUrl: `https://en.wikipedia.org/?curid=${firstResult.pageid}`,
      };
    } catch (error) {
      console.error('Error fetching rep info:', error);
      return rep;
    }
  }

  /**
   * Batch fetch multiple representatives
   */
  async batchGetRepresentatives(reps: Representative[]): Promise<Representative[]> {
    const promises = reps.map(rep => this.getRepresentativeInfo(rep));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => 
      result.status === 'fulfilled' ? result.value : reps[index]
    );
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const wikiAPI = new WikipediaAPI();
