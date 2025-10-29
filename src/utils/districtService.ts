/**
 * districtService.ts
 * 
 * Fetches congressional district GeoJSON shapes from theunitedstates.io.
 */

import { LegislatorTerm } from './congressionalDataLoader';

// Cache to avoid re-fetching the same district shape
const shapeCache = new Map<string, any>();
// Cache state-level 1789-2012 collections per state+era
const stateEraCollectionCache = new Map<string, any>();

// Map of state abbreviations to 1789-2012 file state names
const stateNameMap: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District_Of_Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New_Hampshire',
  NJ: 'New_Jersey',
  NM: 'New_Mexico',
  NY: 'New_York',
  NC: 'North_Carolina',
  ND: 'North_Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode_Island',
  SC: 'South_Carolina',
  SD: 'South_Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West_Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  PR: 'Puerto_Rico',
  GU: 'Guam',
  VI: 'Virgin_Islands',
  MP: 'Northern_Mariana_Islands',
  AS: 'American_Samoa',
};

function abbrToStateName(abbr: string): string | null {
  return stateNameMap[abbr as keyof typeof stateNameMap] || null;
}

// Given an era base year (e.g., 1992), compute the 5-congress block range in the 1789-2012 dataset
function eraToCongressRange(era: number): { start: number; end: number } | null {
  if (era > 2002) return null; // 1789-2012 dataset ends at 112th (<= 2012)
  const start = Math.floor(((era + 1) - 1789) / 2) + 1; // era applies starting the next odd year Congress
  return { start, end: start + 4 };
}

async function load1789StateCollection(stateAbbr: string, era: number): Promise<any | null> {
  const stateName = abbrToStateName(stateAbbr);
  const range = eraToCongressRange(era);
  if (!stateName || !range) return null;
  const key = `${era}-${stateAbbr}`;
  if (stateEraCollectionCache.has(key)) return stateEraCollectionCache.get(key);
  const path = `/districts/1789-2012/${stateName}_${range.start}_to_${range.end}.geojson`;
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const coll = await res.json();
    stateEraCollectionCache.set(key, coll);
    return coll;
  } catch {
    return null;
  }
}

/**
 * Determines the correct district "era" year for the shape API.
 * District boundaries change after each census.
 * This function maps a given year to the year the districts were defined.
 */
function getDistrictEra(year: number): number {
  // Use 2022 boundaries for 2023+ (post-2020 census, new seats like MT-2, OR-6, TX-38, NC-14, CO-8, FL-28)
  if (year >= 2023) return 2022;
  // Use 2012 boundaries for 2013-2022 (post-2010 census)
  if (year >= 2013) return 2012;
  if (year >= 2003) return 2002;
  if (year >= 1993) return 1992;
  if (year >= 1983) return 1982;
  if (year >= 1973) return 1972;
  if (year >= 1963) return 1962;
  // Before this, it's more complex. For now, we'll use a default.
  return 1962; 
}

/**
 * Fetches the GeoJSON shape for a single congressional district.
 */
async function fetchDistrictShape(term: LegislatorTerm, selectedYear: number): Promise<any | null> {
  // Skip senators; map displays House districts only
  if (term.chamber === 'Senate') return null;
  const era = getDistrictEra(selectedYear);
  const districtId = term.chamber === 'House' ? term.district : 0; // House only; treat 0/undefined as at-large
  if (term.chamber === 'House' && (districtId === undefined || districtId === null)) {
    console.warn(`⚠️ Missing district for ${term.state} (House) - skipping`);
    return null;
  }

  // Try state-level 1789-2012 dataset first for eras <= 2002
  if (era <= 2002) {
    const stateColl = await load1789StateCollection(term.state, era);
    if (stateColl && Array.isArray(stateColl.features)) {
      const targets = (!districtId || districtId === 0) ? ['AL', '0'] : [String(districtId)];
      const feat = stateColl.features.find((f: any) => targets.includes(String(f?.properties?.district)));
      if (feat && feat.geometry) {
        const usedCode = `${term.state}-${targets[0]}`;
        const cacheKey = `${era}-${usedCode}`;
        if (!shapeCache.has(cacheKey)) shapeCache.set(cacheKey, feat.geometry);
        return {
          type: 'Feature',
          geometry: feat.geometry,
          properties: {
            __key: usedCode,
            __party: term.party,
            __state: term.state,
            __district: (!districtId || districtId === 0) ? 'AL' : String(districtId),
            __bioguide: term.bioguide,
            __name: term.fullName,
            __wikipedia: term.wikipedia,
            __era: era,
          },
        } as any;
      }
    }
  }
  const candidates = (!districtId || districtId === 0)
    ? [ `${term.state}-AL`, `${term.state}-0` ]
    : [ `${term.state}-${districtId}` ];

  // If any candidate is already cached for this era, return immediately
  for (const code of candidates) {
    const cacheKey = `${era}-${code}`;
    if (shapeCache.has(cacheKey)) {
      const cachedGeom = shapeCache.get(cacheKey);
      return {
        type: 'Feature',
        geometry: cachedGeom,
        properties: {
          __key: code,
          __party: term.party,
          __state: term.state,
          __district: (!districtId || districtId === 0) ? 'AL' : String(districtId),
          __bioguide: term.bioguide,
          __name: term.fullName,
          __wikipedia: term.wikipedia,
          __era: era,
        },
      } as any;
    }
  }

  try {
    let usedCode: string | null = null;
    let usedEra: number | null = null;
    let geojson: any | null = null;

    // Try each candidate in the primary era
    for (const code of candidates) {
      try {
        const res = await fetch(`/districts/cds/${era}/${code}/shape.geojson`);
        if (res.ok) {
          geojson = await res.json();
          usedCode = code;
          usedEra = era;
          break;
        }
      } catch (_e) {}
    }

    // If still not found, try earlier eras for each candidate
    if (!geojson) {
      const fallbackEras = [2012, 2002, 1992, 1982, 1972, 1962].filter(e => e !== era);
      outer: for (const fe of fallbackEras) {
        for (const code of candidates) {
          try {
            const res = await fetch(`/districts/cds/${fe}/${code}/shape.geojson`);
            if (res.ok) {
              geojson = await res.json();
              usedCode = code;
              usedEra = fe;
              break outer;
            }
          } catch (_e) {}
        }
      }
    }

    if (!geojson || !usedCode || !usedEra) {
      // Try state-level fallback only for at-large (entire state equals district)
      const isAtLarge = (!districtId || districtId === 0);
      if (isAtLarge) {
        try {
          const stateRes = await fetch(`/districts/${term.state}/shape.geojson`);
          if (stateRes.ok) {
            const stateGeo = await stateRes.json();
            const stateGeom = stateGeo?.type === 'Feature' ? stateGeo.geometry : stateGeo?.geometry || stateGeo;
            if (stateGeom) {
              const used = `${term.state}-0`;
              shapeCache.set(`${era}-${used}`, stateGeom);
              return {
                type: 'Feature',
                geometry: stateGeom,
                properties: {
                  __key: used,
                  __party: term.party,
                  __state: term.state,
                  __district: 'AL',
                  __bioguide: term.bioguide,
                  __name: term.fullName,
                  __wikipedia: term.wikipedia,
                  __era: era,
                },
              } as any;
            }
          }
        } catch {}
      }
      console.warn(`⚠️ No shape found for ${candidates.join(' or ')} in ${era}`);
      return null;
    }

    // Normalize to geometry and then build a feature with year-specific party
    let geometry: any = null;
    if (geojson.type === 'Feature') {
      geometry = geojson.geometry;
    } else if (geojson.type === 'FeatureCollection') {
      geometry = geojson.features?.[0]?.geometry || null;
    } else {
      geometry = geojson.geometry || geojson;
    }

    if (!geometry) {
      console.warn(`⚠️ Invalid geometry for ${usedCode} (${usedEra})`);
      return null;
    }

    // Cache only geometry
    shapeCache.set(`${usedEra}-${usedCode}`, geometry);

    // Return a fresh feature annotated with current term party
    return {
      type: 'Feature',
      geometry,
      properties: {
        __key: usedCode,
        __party: term.party,
        __state: term.state,
        __district: (!districtId || districtId === 0) ? 'AL' : String(districtId),
        __bioguide: term.bioguide,
        __name: term.fullName,
        __wikipedia: term.wikipedia,
        __era: era,
      },
    } as any;
  } catch (error) {
    console.error(`❌ Error fetching shape for ${candidates.join(' or ')}:`, error);
    return null;
  }
}

/**
 * Fetches all district shapes for a given list of legislator terms.
 * Returns a FeatureCollection containing all valid shapes found.
 */
export async function fetchAllDistrictShapesForYear(terms: LegislatorTerm[], selectedYear: number): Promise<any> {
  console.log(`🗺️ Fetching district shapes for ${terms.length} members...`);

  // Pre-deduplicate by district code for the selected year
  const byDistrict: Map<string, LegislatorTerm> = new Map();
  for (const t of terms) {
    if (t.chamber !== 'House') continue;
    const did = t.district ?? 0;
    const label = (!did || did === 0) ? 'AL' : did;
    const code = `${t.state}-${label}`;
    if (!byDistrict.has(code)) byDistrict.set(code, t);
  }

  const uniqueTerms = Array.from(byDistrict.values());
  console.log(`📦 Unique districts to load: ${uniqueTerms.length}`);

  // Concurrency-limited fetching to avoid INSUFFICIENT_RESOURCES
  const CONCURRENCY = 16;
  const results: any[] = [];
  for (let i = 0; i < uniqueTerms.length; i += CONCURRENCY) {
    const batch = uniqueTerms.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(t => fetchDistrictShape(t, selectedYear)));
    for (const r of batchResults) if (r) results.push(r);
  }

  console.log(`✅ Found ${results.length} unique district shapes.`);

  return {
    type: 'FeatureCollection',
    features: results,
  };
}
