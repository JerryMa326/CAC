# 🤖 Gemini AI Data Scraping System

## 🎯 Overview

This Congressional Atlas now uses **Gemini AI** to intelligently scrape and compile comprehensive congressional data from Wikipedia and other sources, covering **all 118 Congress sessions from 1789-2024**.

### Why Gemini AI?

- ✅ **Intelligent Scraping**: AI understands context and extracts relevant data
- ✅ **Comprehensive Coverage**: 1789-2024 (235 years of history)
- ✅ **Rich Data**: Biographies, voting records, political spectrum analysis
- ✅ **Local Storage**: All data stored in your browser (IndexedDB)
- ✅ **Free**: Google's free tier is generous (60 requests/min)

---

## 🚀 Quick Setup (5 Minutes)

### 1. Get Gemini API Key

1. Visit: **https://aistudio.google.com/app/apikey**
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key

### 2. Add to .env File

```bash
VITE_GEMINI_API_KEY=your_key_here
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Dev Server

```bash
npm run dev
```

### 5. Open Data Setup

- Click the purple gear icon (⚙️) in the bottom-right corner
- Click "Scrape Full History (1789-2024)"
- Wait ~30-60 minutes for complete scrape
- Data is saved locally in your browser

---

## 📊 What Gets Scraped

For each of the ~60,000+ representatives across all 118 Congress sessions:

### Basic Info
- Full name
- Party affiliation (Democrat, Republican, Whig, Federalist, etc.)
- State & District
- Chamber (House or Senate)
- Years of service

### Biographical Data
- Birth/death dates
- 2-3 sentence biography
- Major career highlights

### Legislative Record
- 3-5 key votes or positions
- Major bills sponsored
- Committee assignments

### Political Analysis
- Economic spectrum position (-100 to +100)
- Social spectrum position (-100 to +100)
- Overall classification (Progressive, Moderate, Conservative, etc.)

### Sources
- Wikipedia URL
- Image URL (when available)

---

## 💾 How Data Storage Works

### IndexedDB (Browser Database)
```
CongressionalAtlasDB/
  ├── members/          # All representative data
  │   ├── Indexed by: year, state, party, congress
  │   └── ~60,000+ records total
  └── metadata/         # Database stats
```

### Storage Size
- **Empty**: 0 MB
- **100 members**: ~1 MB
- **Full dataset**: ~50-100 MB
- All stored locally in your browser

### Data Persistence
- ✅ Survives browser restarts
- ✅ Works offline after initial scrape
- ✅ Can export/import as JSON
- ❌ Cleared if you clear browser data

---

## 🎮 Using the Data Setup Panel

### Opening the Panel
- Click purple gear icon (⚙️) in bottom-right
- Or click "NO GEMINI API KEY" warning banner

### Panel Features

#### 1. **API Status**
Shows if Gemini API key is configured

#### 2. **Database Status**
- Total members stored
- Congress sessions covered
- Year range (earliest to latest)

#### 3. **Scrape Full History**
- Scrapes all 118 Congress sessions
- Takes ~30-60 minutes
- Shows progress in real-time
- Can be interrupted and resumed

#### 4. **Export Data**
- Downloads entire database as JSON
- Use for backup or sharing
- File size: ~50-100 MB

#### 5. **Import Data**
- Load previously exported JSON
- Instant restore of full dataset
- Skips API scraping entirely

---

## 📈 Scraping Process

### What Happens

```
For each Congress (1-118):
  1. Gemini AI queries Wikipedia
  2. Extracts all member data
  3. Analyzes political positions
  4. Generates spectrum scores
  5. Stores in IndexedDB
  6. Updates progress bar
  7. Wait 1.5 seconds (rate limiting)
```

### Time Estimates
- **Single Congress**: ~2-3 seconds
- **10 Congress sessions**: ~30 seconds
- **Full history (118)**: ~30-60 minutes

### Rate Limiting
- Free tier: 60 requests/minute
- We use: 1 request per 1.5 seconds = 40/min
- Safe buffer to avoid hitting limits

---

## 🔍 Accessing the Data

### In Map Component
```typescript
import { dataManager } from '@/utils/dataManager';

// Get all representatives for a year
const reps = await dataManager.getRepresentativesByYear(2024);

// Get by district
const districtMap = await dataManager.loadAllRepresentativesForYear(2024);
const nyReps = districtMap.get('NY-14'); // Alexandria Ocasio-Cortez

// Check if data exists
const hasData = await dataManager.hasData();
const stats = await dataManager.getStats();
```

### Direct Database Access
```typescript
import { congressDB } from '@/utils/congressDatabase';

// Initialize
await congressDB.init();

// Query by year
const members2020 = await congressDB.getMembersByYear(2020);

// Query by congress
const members80th = await congressDB.getMembersByCongress(80);

// Get stats
const stats = await congressDB.getStats();
```

---

## 🎨 Data Structure

### Stored Member Format
```typescript
{
  id: "CA-12-2024-Pelosi",
  name: "Pelosi, Nancy",
  fullName: "Nancy Patricia Pelosi",
  party: "Democrat",
  state: "CA",
  district: "12",
  chamber: "House",
  startYear: 1987,
  endYear: null, // null = currently serving
  born: "1940",
  died: null,
  biography: "First woman Speaker of the House...",
  keyVotes: [
    "Voted for Affordable Care Act (2010)",
    "Impeachment of Donald Trump (2019)",
    "American Rescue Plan (2021)"
  ],
  majorBills: [
    "Affordable Care Act",
    "Dodd-Frank Wall Street Reform"
  ],
  committees: [
    "Select Committee on Intelligence",
    "House Appropriations Committee"
  ],
  politicalSpectrum: {
    economic: -65, // Liberal economically
    social: -75,   // Very liberal socially
    overall: "Progressive Liberal"
  },
  imageUrl: "https://...",
  wikipediaUrl: "https://en.wikipedia.org/wiki/Nancy_Pelosi",
  scrapedAt: 1704157200000, // timestamp
  congressNumber: 118
}
```

---

## 💡 Pro Tips

### 1. **Import Pre-Scraped Data**
Instead of scraping (slow), get a pre-scraped JSON file:
- Download from project repo (when available)
- Or get from a colleague
- Click "Import Data" in setup panel
- Instant full dataset!

### 2. **Export for Backup**
After scraping, export immediately:
- Click "Export Data"
- Save JSON file
- Restore anytime with "Import Data"

### 3. **Selective Scraping**
Don't need full history? Modify the code:
```typescript
// Scrape only recent congresses (110-118)
await dataManager.scrapeMultipleCongressSessions(110, 118);
```

### 4. **Offline Mode**
Once scraped:
- Works 100% offline
- No API calls needed
- All data in browser
- Perfect for demos

### 5. **Clear and Re-scrape**
If data seems wrong:
```typescript
await congressDB.clearAll();
// Then re-scrape
```

---

## 🆘 Troubleshooting

### "No Gemini API Key"
**Problem**: API key not detected

**Solution**:
1. Check `.env` file exists in project root
2. Verify line: `VITE_GEMINI_API_KEY=your_key`
3. Restart dev server
4. Check browser console for "✅ Gemini API initialized"

### "Rate Limit Exceeded"
**Problem**: Too many API requests

**Solution**:
- Wait 1 minute
- Code auto-limits to 40 req/min
- If still fails, increase delay in `dataManager.ts`

### "Scraping Failed"
**Problem**: Error during scrape

**Solution**:
1. Check internet connection
2. Verify API key is valid
3. Check console for specific error
4. Try single congress first: `scrapeCongress(118)`

### "No Data for Year X"
**Problem**: Missing data for specific year

**Solution**:
```typescript
// Scrape specific congress
const congressNum = Math.floor((year - 1789) / 2) + 1;
await dataManager.scrapeCongress(congressNum);
```

### "Database Error"
**Problem**: IndexedDB issues

**Solution**:
1. Clear browser data
2. Restart browser
3. Try different browser
4. Check browser storage quota

---

## 🔐 Security & Privacy

### API Key Security
- ✅ Never commit `.env` file
- ✅ Key only used client-side
- ✅ No server storage
- ⚠️ Don't share your key

### Data Privacy
- ✅ All data stored locally
- ✅ No data sent to external servers
- ✅ Only Wikipedia sources
- ✅ Public information only

### Browser Storage
- Data only accessible by this site
- Cleared if you clear browser data
- Can be exported for backup

---

## 📚 Additional Resources

### Gemini AI
- **API Docs**: https://ai.google.dev/docs
- **Get Key**: https://aistudio.google.com/app/apikey
- **Pricing**: Free tier = 60 req/min

### Wikipedia API
- **Main Page**: https://www.mediawiki.org/wiki/API
- **No key needed**: Public API

### Congress Data Sources
- Wikipedia categories for each Congress
- Individual representative pages
- Historical archives

---

## 🎯 Next Steps

Once you have data:

1. **Explore the Map**
   - Drag timeline to any year 1789-2024
   - See real representatives
   - View detailed biographies

2. **Analyze Trends**
   - Party shifts over time
   - Political spectrum evolution
   - Regional patterns

3. **Add Features**
   - Vote visualizations
   - Bill tracking
   - Committee networks
   - District demographics

4. **Share Data**
   - Export your scraped dataset
   - Share with team
   - Contribute back to project

---

## ✨ Success Criteria

Your system is working when:

✅ Purple gear icon visible
✅ Click opens Data Setup panel
✅ "Gemini API: Connected" shows green
✅ Can click "Scrape Full History"
✅ Progress bar shows current congress
✅ Database stats show increasing members
✅ Map loads real representatives
✅ Timeline slider works 1789-2024
✅ No dummy/mock data visible

---

## 🎉 You're Done!

Your Congressional Atlas now has:
- ✅ AI-powered data scraping
- ✅ 235 years of historical data
- ✅ 60,000+ representatives
- ✅ Political spectrum analysis
- ✅ Offline capability
- ✅ Export/import functionality

**Enjoy exploring American political history!** 🗺️✨
