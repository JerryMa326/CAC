/**
 * Local IndexedDB storage for congressional data
 * Stores scraped data from Gemini AI for offline access
 */

interface StoredMember {
  id: string; // e.g., "CA-12-2024" or "bioguide-id"
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
    economic: number;
    social: number;
    overall: string;
  };
  imageUrl?: string;
  wikipediaUrl?: string;
  scrapedAt: number; // timestamp
  congressNumber: number;
}

interface DatabaseStats {
  totalMembers: number;
  congressesCovered: number[];
  yearRange: { min: number; max: number };
  lastUpdated: number;
}

class CongressDatabase {
  private dbName = 'CongressionalAtlasDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ Congressional database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create members store
        if (!db.objectStoreNames.contains('members')) {
          const memberStore = db.createObjectStore('members', { keyPath: 'id' });
          memberStore.createIndex('year', 'startYear', { unique: false });
          memberStore.createIndex('state', 'state', { unique: false });
          memberStore.createIndex('party', 'party', { unique: false });
          memberStore.createIndex('congress', 'congressNumber', { unique: false });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }

        console.log('📊 Database schema created');
      };
    });
  }

  /**
   * Store a member in the database
   */
  async storeMember(member: StoredMember): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['members'], 'readwrite');
      const store = transaction.objectStore('members');
      const request = store.put(member);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store multiple members at once
   */
  async storeMembers(members: StoredMember[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['members'], 'readwrite');
      const store = transaction.objectStore('members');

      let completed = 0;
      const errors: any[] = [];

      members.forEach(member => {
        const request = store.put(member);
        request.onsuccess = () => {
          completed++;
          if (completed === members.length) {
            if (errors.length === 0) {
              console.log(`✅ Stored ${members.length} members in database`);
              resolve();
            } else {
              reject(new Error(`Failed to store ${errors.length} members`));
            }
          }
        };
        request.onerror = () => {
          errors.push(request.error);
          completed++;
        };
      });
    });
  }

  /**
   * Get all members for a specific year
   */
  async getMembersByYear(year: number): Promise<StoredMember[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['members'], 'readonly');
      const store = transaction.objectStore('members');
      const request = store.getAll();

      request.onsuccess = () => {
        const allMembers = request.result as StoredMember[];
        // Filter members who served during this year
        const filtered = allMembers.filter(m => 
          m.startYear <= year && (!m.endYear || m.endYear >= year)
        );
        resolve(filtered);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get members by state and district
   */
  async getMembersByDistrict(state: string, district: string, year: number): Promise<StoredMember[]> {
    const yearMembers = await this.getMembersByYear(year);
    return yearMembers.filter(m => 
      m.state === state && m.district === district
    );
  }

  /**
   * Get all members from a specific congress
   */
  async getMembersByCongress(congressNumber: number): Promise<StoredMember[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['members'], 'readonly');
      const store = transaction.objectStore('members');
      const index = store.index('congress');
      const request = index.getAll(congressNumber);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<DatabaseStats> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['members'], 'readonly');
      const store = transaction.objectStore('members');
      const request = store.getAll();

      request.onsuccess = () => {
        const members = request.result as StoredMember[];
        const congressNumbers = [...new Set(members.map(m => m.congressNumber))].sort((a, b) => a - b);
        const years = members.flatMap(m => [m.startYear, m.endYear || new Date().getFullYear()]);
        
        resolve({
          totalMembers: members.length,
          congressesCovered: congressNumbers,
          yearRange: {
            min: Math.min(...years),
            max: Math.max(...years)
          },
          lastUpdated: Date.now()
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if data exists for a specific year
   */
  async hasDataForYear(year: number): Promise<boolean> {
    const members = await this.getMembersByYear(year);
    return members.length > 0;
  }

  /**
   * Clear all data (for re-scraping)
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['members'], 'readwrite');
      const store = transaction.objectStore('members');
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🗑️ Database cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Export all data as JSON
   */
  async exportData(): Promise<StoredMember[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['members'], 'readonly');
      const store = transaction.objectStore('members');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Import data from JSON
   */
  async importData(members: StoredMember[]): Promise<void> {
    console.log(`📥 Importing ${members.length} members...`);
    await this.storeMembers(members);
    console.log('✅ Import complete');
  }
}

export const congressDB = new CongressDatabase();
export type { StoredMember, DatabaseStats };
