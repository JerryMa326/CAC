# 🔌 API Integration Guide

## Overview

The Congressional Atlas can use **real data** from multiple APIs to display actual representatives, voting records, and biographical information.

## Available APIs

### 1. **ProPublica Congress API** (Recommended)
- **Data**: Current & historical members, voting records, statements
- **Coverage**: 102nd Congress (1991) to present
- **Cost**: FREE
- **Sign up**: https://www.propublica.org/datastore/api/propublica-congress-api

### 2. **GovTrack API** (No Key Required!)
- **Data**: Full historical members back to 1789, biographical info
- **Coverage**: All of US history
- **Cost**: FREE, no API key needed
- **Docs**: https://www.govtrack.us/developers/api

### 3. **Congress.gov API**
- **Data**: Bills, amendments, nominations, treaties
- **Coverage**: Comprehensive legislative data
- **Cost**: FREE
- **Sign up**: https://api.congress.gov/sign-up/

### 4. **Wikipedia API** (Already Integrated!)
- **Data**: Biographies, images, career summaries
- **Coverage**: Most notable representatives
- **Cost**: FREE, no key required
- **Status**: ✅ Already working in the app

## 🚀 Quick Setup (5 minutes)

### Step 1: Get ProPublica API Key

1. Visit: https://www.propublica.org/datastore/api/propublica-congress-api
2. Click "Request an API Key"
3. Fill out the form (takes 30 seconds)
4. You'll receive the key instantly via email

### Step 2: Add API Key to Project

1. Create a `.env` file in the project root:
```bash
cp .env.example .env
```

2. Open `.env` and add your key:
```
VITE_PROPUBLICA_API_KEY=your_actual_key_here
```

### Step 3: Update the congressApi.ts file

Open `src/utils/congressApi.ts` and update line 12:

```typescript
// Before:
const PROPUBLICA_API_KEY = 'YOUR_PROPUBLICA_API_KEY';

// After:
const PROPUBLICA_API_KEY = import.meta.env.VITE_PROPUBLICA_API_KEY || '';
```

### Step 4: Restart the Dev Server

```bash
npm run dev
```

## 📊 What You Get With Real Data

### Current Features (Mock Data)
- ✅ Representatives from 1789-2024
- ✅ Era-specific political stances
- ✅ Basic biographical info
- ✅ Party affiliations

### With Real APIs
- ✅ **Actual representatives** who served in each district
- ✅ **Real voting records** showing how they voted on key bills
- ✅ **Biographical details**: birthdays, education, career paths
- ✅ **Policy positions** derived from actual votes
- ✅ **Photos** from Wikipedia
- ✅ **Historical accuracy** going back to 1789

## 🔄 How to Switch from Mock to Real Data

### Option 1: Load Current Congress (Easiest)

In `src/components/Map.tsx`, replace the mock data function:

```typescript
// Add this import
import { congressAPI } from '@/utils/congressApi';

// In the loadMapData function, replace createMockDistrictData with:
const currentMembers = await congressAPI.getCurrentMembers('house');
const districtData = await createRealDistrictData(counties.features, currentMembers);
```

### Option 2: Load Historical Data by Year

```typescript
// Convert year to Congress number
const congress = congressAPI.yearToCongress(timeline.currentYear);

// Load members from that Congress
const historicalMembers = await congressAPI.getHistoricalMembers(congress);
const districtData = await createRealDistrictData(counties.features, historicalMembers);
```

### Option 3: Load Full State History

```typescript
// Get all representatives who ever served from a state
const nyHistory = await congressAPI.getStateHistory('NY');

// This gives you everyone from NY going back to 1789!
```

## 🎯 API Usage Examples

### Get Current Members

```typescript
import { congressAPI } from '@/utils/congressApi';

// Get all current House members
const house = await congressAPI.getCurrentMembers('house');

// Get all current Senators
const senate = await congressAPI.getCurrentMembers('senate');
```

### Get Historical Members

```typescript
// Get members from the 80th Congress (1947-1949)
const members = await congressAPI.getHistoricalMembers(80);

// Or convert a year
const year = 1947;
const congress = congressAPI.yearToCongress(year); // Returns 80
const members = await congressAPI.getHistoricalMembers(congress);
```

### Get District Representatives

```typescript
// Get all representatives who ever served NY-14
const ny14 = await congressAPI.getMembersByDistrict('NY', '14');

// This includes AOC (current) and all predecessors!
```

### Get Voting Records

```typescript
// Get a member's voting record
const memberId = 'M001137'; // Example: member ID
const votes = await congressAPI.getMemberVotes(memberId);

// This returns an array of Stance objects showing their positions
```

### Get Biographical Data

```typescript
// Get detailed info from GovTrack
const bioguideId = 'C001117'; // Example: Cori Bush
const person = await congressAPI.getGovTrackPerson(bioguideId);

// Returns: birthday, gender, description, etc.
```

## 📝 Data Structure

### Representative Object
```typescript
{
  id: string,
  name: string,
  party: 'Democrat' | 'Republican' | 'Independent',
  district: string,
  state: string,
  startYear: number,
  endYear: number | null,
  bio?: {
    fullName: string,
    birthDate: string,
    summary: string,
    education?: string[],
  },
  stances?: [
    {
      topic: 'Healthcare',
      position: 'Generally supportive',
      year: 2024,
      source: 'Voting Record Analysis'
    }
  ]
}
```

## 🔥 Advanced: Combining Multiple APIs

For the **most comprehensive data**, combine all APIs:

```typescript
async function getComprehensiveRepData(memberId: string) {
  // 1. Get voting record from ProPublica
  const votes = await congressAPI.getMemberVotes(memberId);
  
  // 2. Get biographical info from GovTrack
  const person = await congressAPI.getGovTrackPerson(memberId);
  
  // 3. Get Wikipedia info with photos
  const wikiData = await wikiAPI.getRepresentativeInfo(representative);
  
  // 4. Combine everything
  return {
    ...representative,
    stances: votes,
    bio: {
      ...person,
      ...wikiData.bio,
      imageUrl: wikiData.imageUrl,
      wikiUrl: wikiData.wikiUrl,
    }
  };
}
```

## 🚨 Rate Limits

### ProPublica
- **5,000 requests per day**
- Rate: Pretty generous, unlikely to hit limits

### GovTrack
- **No official limit** (be respectful, use caching)
- Use the built-in cache in `CongressAPI` class

### Wikipedia
- **200 requests per second**
- Already has caching built-in

## 💡 Best Practices

### 1. **Use Caching**
```typescript
// The API classes already cache responses
// Clear cache when needed:
congressAPI.clearCache();
wikiAPI.clearCache();
```

### 2. **Load Data Progressively**
```typescript
// Don't load everything at once
// Load current year first, then fetch others as needed
const currentCongress = congressAPI.yearToCongress(2024);
const members = await congressAPI.getHistoricalMembers(currentCongress);
```

### 3. **Handle Errors Gracefully**
```typescript
try {
  const members = await congressAPI.getCurrentMembers();
} catch (error) {
  console.error('API error, falling back to mock data');
  // Use mock data as fallback
}
```

### 4. **Batch Requests**
```typescript
// Get multiple Congress sessions at once
const promises = [102, 103, 104].map(c => 
  congressAPI.getHistoricalMembers(c)
);
const results = await Promise.all(promises);
```

## 📦 Pre-Built Integration (Coming Soon)

I can create a ready-to-use integration that:
- ✅ Automatically loads real data when API keys are present
- ✅ Falls back to mock data if no keys
- ✅ Caches everything for performance
- ✅ Handles all error cases
- ✅ Shows loading states

Let me know if you want me to implement this!

## 🆘 Troubleshooting

### "API Key Invalid"
- Check your `.env` file has the correct key
- Restart the dev server after adding the key
- Ensure key is prefixed with `VITE_`

### "No data returned"
- Check the Congress number is valid (1-118)
- Verify state codes are uppercase (NY, CA, TX)
- Some historical data may not be available

### "Rate limit exceeded"
- Use the built-in cache
- Reduce concurrent requests
- Wait 24 hours for ProPublica reset

## 📚 Additional Resources

- [ProPublica Congress API Docs](https://projects.propublica.org/api-docs/congress-api/)
- [GovTrack API Docs](https://www.govtrack.us/developers/api)
- [Congress.gov API Docs](https://api.congress.gov/)
- [Wikipedia API Docs](https://www.mediawiki.org/wiki/API:Main_page)

## ✨ Next Steps

1. Get your ProPublica API key (5 minutes)
2. Add it to `.env`
3. Update `congressApi.ts` to use the environment variable
4. Test with current Congress data
5. Expand to historical data

**Ready to use real data?** Follow the Quick Setup above and you'll have actual congressional data flowing in minutes!
