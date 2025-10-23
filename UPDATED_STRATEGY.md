# 🔄 Updated Open Data Strategy

## ⚠️ Important Discovery

GovTrack has recently added Cloudflare protection that blocks direct API requests from code. However, **we have better alternatives!**

## ✅ Working Solutions (No API Keys!)

### **1. TheUnitedStates.io Project** ⭐ BEST OPTION

**GitHub-based congressional data** maintained by civic developers

```typescript
// JSON files hosted on GitHub - no authentication needed!
const LEGISLATORS_URL = 'https://theunitedstates.io/congress-legislators/legislators-current.json';
const HISTORICAL_URL = 'https://theunitedstates.io/congress-legislators/legislators-historical.json';

// Example: Load current members
const response = await fetch(LEGISLATORS_URL);
const legislators = await response.json();
// Returns complete data for all current members!
```

**Data Available**:
- ✅ All representatives (1789-present)
- ✅ Biographical info (birthdate, gender, etc.)
- ✅ Social media handles
- ✅ Committee assignments
- ✅ Terms of service
- ✅ Party affiliations
- ✅ Updated regularly via GitHub

**Advantages**:
- 🚀 Fast (CDN hosted)
- 📦 No rate limits
- 🔓 No authentication
- 📚 Well-documented
- ✅ Actively maintained
- 💯 Reliable

### **2. Bioguide Congress Data**

**Official Congressional Biographical Directory**

```typescript
// Free, public data from Congress
const BIOGUIDE_BASE = 'https://bioguideretro.congress.gov/bioguide/';

// Search for members
const searchUrl = `${BIOGUIDE_BASE}search?type=members`;
```

### **3. Wikipedia API** (Already Working!)

```typescript
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';

// Search for representative
const params = {
  action: 'query',
  format: 'json',
  list: 'search',
  srsearch: 'Alexandria Ocasio-Cortez',
  origin: '*'
};
```

### **4. Local Data Files**

Download complete datasets once, use locally:

```typescript
// One-time download from TheUnitedStates.io
// Then bundle with your app - always works offline!
import currentLegislators from '@/data/legislators-current.json';
import historicalLegislators from '@/data/legislators-historical.json';
```

## 🚀 New Implementation

I'll create a better API client using these sources:

```typescript
// src/utils/congressDataApi.ts

export class CongressDataAPI {
  private currentLegislators: any[] = [];
  private historicalLegislators: any[] = [];
  
  async init() {
    // Load data once on startup
    const [current, historical] = await Promise.all([
      fetch('https://theunitedstates.io/congress-legislators/legislators-current.json').then(r => r.json()),
      fetch('https://theunitedstates.io/congress-legislators/legislators-historical.json').then(r => r.json())
    ]);
    
    this.currentLegislators = current;
    this.historicalLegislators = historical;
    
    console.log(`✅ Loaded ${current.length} current + ${historical.length} historical legislators`);
  }
  
  getCurrentMembers(chamber: 'house' | 'senate' = 'house') {
    return this.currentLegislators.filter(leg => {
      const lastTerm = leg.terms[leg.terms.length - 1];
      return lastTerm.type === (chamber === 'house' ? 'rep' : 'sen');
    });
  }
  
  getMembersByYear(year: number) {
    // Search both current and historical
    const all = [...this.currentLegislators, ...this.historicalLegislators];
    
    return all.filter(leg => {
      return leg.terms.some(term => {
        const start = new Date(term.start).getFullYear();
        const end = term.end ? new Date(term.end).getFullYear() : new Date().getFullYear();
        return year >= start && year <= end;
      });
    });
  }
  
  getDistrictHistory(state: string, district: string) {
    const all = [...this.currentLegislators, ...this.historicalLegislators];
    
    return all.filter(leg => {
      return leg.terms.some(term => 
        term.state === state && 
        term.district?.toString() === district
      );
    });
  }
}
```

## 📊 Data Format (TheUnitedStates.io)

```json
{
  "id": {
    "bioguide": "O000172",
    "thomas": "02427",
    "govtrack": 412804,
    "opensecrets": "N00041162",
    "fec": ["H8NY15148"]
  },
  "name": {
    "first": "Alexandria",
    "last": "Ocasio-Cortez",
    "official_full": "Alexandria Ocasio-Cortez"
  },
  "bio": {
    "birthday": "1989-10-13",
    "gender": "F"
  },
  "terms": [
    {
      "type": "rep",
      "start": "2019-01-03",
      "end": "2021-01-03",
      "state": "NY",
      "district": 14,
      "party": "Democrat"
    }
  ]
}
```

## ✅ Why This is Better

### **TheUnitedStates.io vs GovTrack**

| Feature | TheUnitedStates.io | GovTrack |
|---------|-------------------|----------|
| **Access** | ✅ Direct JSON files | ❌ Cloudflare blocked |
| **Speed** | ✅ Very fast | ⚠️ Slow if accessible |
| **Rate Limits** | ✅ None (CDN) | ⚠️ Unclear |
| **Data Format** | ✅ Clean JSON | ⚠️ Complex |
| **Updates** | ✅ GitHub automated | ⚠️ Unknown |
| **Offline** | ✅ Can download | ❌ API only |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ (now protected) |

## 🎯 Quick Integration

### **Step 1: Create New API Client**

I'll create `src/utils/congressDataApi.ts` with TheUnitedStates.io

### **Step 2: Load Data Once**

```typescript
// In App.tsx or main component
import { congressDataAPI } from '@/utils/congressDataApi';

useEffect(() => {
  congressDataAPI.init().then(() => {
    console.log('✅ Congressional data ready');
  });
}, []);
```

### **Step 3: Use Anywhere**

```typescript
// Get current House members
const house = congressDataAPI.getCurrentMembers('house');

// Get members from 1947
const members1947 = congressDataAPI.getMembersByYear(1947);

// Get NY-14 history
const ny14 = congressDataAPI.getDistrictHistory('NY', '14');
```

## 🔥 Advantages of New Approach

1. **Faster** - Single JSON file load vs multiple API calls
2. **Reliable** - No Cloudflare, no rate limits, no blocks
3. **Offline** - Can bundle data with app
4. **Complete** - All legislators from 1789-present in 2 files
5. **Maintained** - Auto-updated via GitHub Actions
6. **Free** - Truly open, no restrictions

## 📦 Optional: Bundle Data Locally

For best performance, download once and bundle:

```bash
# Download data files (one-time)
curl https://theunitedstates.io/congress-legislators/legislators-current.json > src/data/legislators-current.json
curl https://theunitedstates.io/congress-legislators/legislators-historical.json > src/data/legislators-historical.json
```

Then import directly:

```typescript
import currentLegislators from '@/data/legislators-current.json';
// Instant access, no network requests!
```

## ✨ Next Steps

1. ✅ I'll create the new `congressDataApi.ts` using TheUnitedStates.io
2. ✅ Test it works (no Cloudflare blocks!)
3. ✅ Integrate into Map component
4. ✅ You get real data with zero setup!

**This solution is actually BETTER than GovTrack because it's faster, more reliable, and has no restrictions!**
