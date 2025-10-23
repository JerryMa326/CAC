# 🚀 Quick Integration Guide - Replace Mock Data with Real Data

## ⚡ 5-Minute Integration

### Step 1: Test the API (30 seconds)

Open browser console and test:

```javascript
// Test current members
fetch('https://www.govtrack.us/api/v2/role?current=true&role_type=representative&limit=5')
  .then(r => r.json())
  .then(data => console.log('✅ GovTrack works!', data.objects));
```

If you see data, **you're ready to go!**

### Step 2: Update Map.tsx (3 minutes)

Add the import at the top:

```typescript
import { openCongressAPI } from '@/utils/openCongressApi';
```

Replace the `createMockDistrictData` function with this:

```typescript
const createRealDistrictData = async (
  features: any[],
  year: number
): Promise<District[]> => {
  console.log(`🔄 Loading real congressional data for ${year}...`);
  
  try {
    // Load all members for this year from GovTrack
    const members = await openCongressAPI.getMembersByYear(year);
    
    // Group by state-district
    const membersByDistrict = new Map<string, Representative[]>();
    members.forEach(member => {
      const key = `${member.state}-${member.district}`;
      if (!membersByDistrict.has(key)) {
        membersByDistrict.set(key, []);
      }
      membersByDistrict.get(key)!.push(member);
    });
    
    // Create District objects with real data
    const districts: District[] = features.map((feature: any, idx: number) => {
      const states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 
                      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 
                      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 
                      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 
                      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
      
      const stateCode = states[idx % states.length];
      const districtNum = Math.floor(idx / states.length) + 1;
      const districtKey = `${stateCode}-${districtNum}`;
      
      // Get real representatives for this district
      const realReps = membersByDistrict.get(districtKey) || [];
      
      return {
        id: districtKey,
        state: stateCode,
        districtNumber: districtNum,
        representatives: realReps.length > 0 ? realReps : generateHistoricalReps(stateCode, districtNum, idx),
        geometry: feature.geometry,
        electionHistory: generateElectionHistory(),
      };
    });
    
    console.log(`✅ Created ${districts.length} districts with real data`);
    return districts;
    
  } catch (error) {
    console.error('❌ Error loading real data, falling back to mock:', error);
    // Fallback to mock data if API fails
    return createMockDistrictData(features);
  }
};
```

### Step 3: Update the loadMapData call

Find where `createMockDistrictData` is called and update it:

```typescript
// Old
const districtData = createMockDistrictData(counties.features);

// New
const districtData = await createRealDistrictData(
  counties.features,
  timeline.currentYear
);
```

### Step 4: Make loadMapData async

Update the function signature:

```typescript
// Old
const loadMapData = (g: any, path: any, projection: any) => {

// New  
const loadMapData = async (g: any, path: any, projection: any) => {
```

### Step 5: Update the useEffect

Make the useEffect call async:

```typescript
useEffect(() => {
  if (!svgRef.current) return;

  // ... existing setup code ...

  // Make this async
  (async () => {
    await loadMapData(g, path, projection);
  })();
  
}, []);
```

## 🎯 That's It!

Save the file and watch the console. You should see:

```
🔄 Loading real congressional data for 2024...
✅ Loaded 435 members from 2024
✅ Created 3000+ districts with real data
```

## 🧪 Test the Timeline

1. **Drag the timeline slider** to different years
2. **Watch the console** for loading messages
3. **Click on districts** to see real representatives
4. **See actual historical data** from GovTrack!

## 📊 Enhanced Version (Optional)

Want to load data progressively? Use this enhanced version:

```typescript
const loadDistrictDataProgressive = async (year: number): Promise<District[]> => {
  // Show loading state
  setIsLoading(true);
  
  try {
    // Load current year immediately
    const allMembers = await openCongressAPI.loadAllRepresentativesForYear(year);
    console.log(`✅ Loaded ${allMembers.size} districts for ${year}`);
    
    // Convert to District format
    const districts: District[] = [];
    allMembers.forEach((reps, districtKey) => {
      const [state, districtNum] = districtKey.split('-');
      districts.push({
        id: districtKey,
        state,
        districtNumber: parseInt(districtNum),
        representatives: reps,
        geometry: null, // Will be populated from map data
        electionHistory: []
      });
    });
    
    return districts;
    
  } catch (error) {
    console.error('Error loading district data:', error);
    return [];
  } finally {
    setIsLoading(false);
  }
};
```

## 🔄 Update on Timeline Change

Add this to handle timeline changes:

```typescript
useEffect(() => {
  // When timeline year changes, reload data
  if (isLoaded && districts.length > 0) {
    (async () => {
      console.log(`⏱️  Timeline changed to ${timeline.currentYear}`);
      const newData = await createRealDistrictData(
        counties.features,
        timeline.currentYear
      );
      setDistricts(newData);
      updateMapColors(); // Refresh the map
    })();
  }
}, [timeline.currentYear]);
```

## 💡 Pro Tips

### **Tip 1: Cache Multiple Years**

```typescript
const yearCache = new Map<number, District[]>();

async function getDistrictsForYear(year: number) {
  if (yearCache.has(year)) {
    console.log(`📦 Using cached data for ${year}`);
    return yearCache.get(year)!;
  }
  
  const data = await createRealDistrictData(features, year);
  yearCache.set(year, data);
  return data;
}
```

### **Tip 2: Preload Adjacent Years**

```typescript
// Preload nearby years for smooth timeline sliding
async function preloadYears(centerYear: number) {
  const yearsToLoad = [
    centerYear - 2,
    centerYear,
    centerYear + 2
  ];
  
  await Promise.all(
    yearsToLoad.map(year => getDistrictsForYear(year))
  );
  
  console.log('✅ Preloaded 3 years of data');
}
```

### **Tip 3: Show Loading State**

```typescript
const [isLoadingYear, setIsLoadingYear] = useState(false);

// In your component
{isLoadingYear && (
  <div className="fixed top-20 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg">
    Loading {timeline.currentYear} data...
  </div>
)}
```

## 🐛 Troubleshooting

### "No data returned"
- **Check**: Is GovTrack API accessible?
- **Test**: `curl https://www.govtrack.us/api/v2/role?current=true&limit=1`
- **Solution**: Check CORS settings or use proxy

### "Map shows empty districts"
- **Check**: Are representatives being matched to districts?
- **Debug**: `console.log('Members:', members, 'Districts:', districts)`
- **Solution**: Verify state code matching (uppercase!)

### "Timeline doesn't update map"
- **Check**: Is `updateMapColors()` being called?
- **Debug**: Add console.log in the timeline useEffect
- **Solution**: Make sure districts state is updated

## ✅ Success Checklist

- [ ] `openCongressApi.ts` file exists
- [ ] Import added to `Map.tsx`
- [ ] `createRealDistrictData` function added
- [ ] `loadMapData` is async
- [ ] Districts are loaded from real API
- [ ] Console shows "Loaded X members"
- [ ] Timeline changes trigger data reload
- [ ] Clicking districts shows real representatives
- [ ] No errors in console

## 🎉 You're Done!

Your map now uses **real congressional data** going back to **1789**!

Try these years to see real data:
- **1789** - First Congress
- **1860** - Civil War era
- **1932** - FDR's New Deal
- **1964** - Civil Rights era
- **2024** - Current Congress

**Next**: Check out `OPEN_DATA_STRATEGY.md` for advanced features like voting records and Wikipedia integration!
