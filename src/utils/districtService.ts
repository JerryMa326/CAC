import { LegislatorTerm } from './congressionalDataLoader';

const shapeCache = new Map<string, any>();
const stateEraCollectionCache = new Map<string, any>();

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

function eraToCongressRange(era: number): { start: number; end: number } | null {
  if (era > 2002) return null;
  const start = Math.floor(((era + 1) - 1789) / 2) + 1;
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

function calculateBoundingBox(geometry: any): { minLon: number; maxLon: number; minLat: number; maxLat: number } | null {
  if (!geometry || !geometry.coordinates) return null;
  
  const coords: number[][] = [];
  
  const flatten = (arr: any): void => {
    if (Array.isArray(arr)) {
      if (arr.length === 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number') {
        coords.push(arr);
      } else {
        arr.forEach(flatten);
      }
    }
  };
  
  flatten(geometry.coordinates);
  
  if (coords.length === 0) return null;
  
  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  
  for (const [lon, lat] of coords) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  
  return { minLon, maxLon, minLat, maxLat };
}

function getDistrictEra(year: number): number {
  if (year >= 2023) return 2022;
  if (year >= 2013) return 2012;
  if (year >= 2003) return 2002;
  if (year >= 1993) return 1992;
  if (year >= 1983) return 1982;
  if (year >= 1973) return 1972;
  if (year >= 1963) return 1962;
  return 1962; 
}

async function fetchDistrictShape(term: LegislatorTerm, selectedYear: number): Promise<any | null> {
  if (term.chamber === 'Senate') return null;
  const era = getDistrictEra(selectedYear);
  const districtId = term.chamber === 'House' ? term.district : 0;
  if (term.chamber === 'House' && (districtId === undefined || districtId === null)) {
    return null;
  }
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

    if (!geojson && era >= 2022 && districtId && districtId > 1) {
      const fallbackCandidates = [`${term.state}-1`, `${term.state}-AL`, `${term.state}-0`];
      for (const fallbackCode of fallbackCandidates) {
        try {
          const res = await fetch(`/districts/cds/2012/${fallbackCode}/shape.geojson`);
          if (res.ok) {
            geojson = await res.json();
            usedCode = fallbackCode;
            usedEra = 2012;
            break;
          }
        } catch (_e) {}
      }
    }

    if (!geojson || !usedCode || !usedEra) {
      try {
        const stateRes = await fetch(`/districts/states/${term.state}/shape.geojson`);
        if (stateRes.ok) {
          const stateGeo = await stateRes.json();
          const stateGeom = stateGeo?.type === 'Feature' ? stateGeo.geometry : stateGeo?.geometry || stateGeo;
          if (stateGeom) {
            const used = candidates[0];
            shapeCache.set(`${era}-${used}`, stateGeom);
            return {
              type: 'Feature',
              geometry: stateGeom,
              properties: {
                __key: used,
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
      } catch {}
      return null;
    }

    let geometry: any = null;
    if (geojson.type === 'Feature') {
      geometry = geojson.geometry;
    } else if (geojson.type === 'FeatureCollection') {
      geometry = geojson.features?.[0]?.geometry || null;
    } else {
      geometry = geojson.geometry || geojson;
    }

    if (!geometry) {
      return null;
    }

    const bbox = calculateBoundingBox(geometry);
    if (bbox) {
      const lonSpan = bbox.maxLon - bbox.minLon;
      const latSpan = bbox.maxLat - bbox.minLat;

      if (lonSpan > 30 || latSpan > 30) {
        try {
          const stateRes = await fetch(`/districts/states/${term.state}/shape.geojson`);
          if (stateRes.ok) {
            const stateGeo = await stateRes.json();
            const stateGeom = stateGeo?.type === 'Feature' ? stateGeo.geometry : stateGeo?.geometry || stateGeo;
            if (stateGeom) {
              shapeCache.set(`${usedEra}-${usedCode}`, stateGeom);
              return {
                type: 'Feature',
                geometry: stateGeom,
                properties: {
                  __key: usedCode,
                  __party: term.party,
                  __state: term.state,
                  __district: (!districtId || districtId === 0) ? 'AL' : String(districtId),
                  __bioguide: term.bioguide,
                  __name: term.fullName,
                  __wikipedia: term.wikipedia,
                  __era: usedEra,
                },
              } as any;
            }
          }
        } catch {}
        return null;
      }
    }

    shapeCache.set(`${usedEra}-${usedCode}`, geometry);

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
  } catch {
    return null;
  }
}

export async function fetchAllDistrictShapesForYear(terms: LegislatorTerm[], selectedYear: number): Promise<any> {
  const byDistrict: Map<string, LegislatorTerm> = new Map();
  for (const t of terms) {
    if (t.chamber !== 'House') continue;
    const did = t.district ?? 0;
    const label = (!did || did === 0) ? 'AL' : did;
    const code = `${t.state}-${label}`;
    if (!byDistrict.has(code)) byDistrict.set(code, t);
  }

  const uniqueTerms = Array.from(byDistrict.values());
  const CONCURRENCY = 16;
  const results: any[] = [];
  for (let i = 0; i < uniqueTerms.length; i += CONCURRENCY) {
    const batch = uniqueTerms.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(t => fetchDistrictShape(t, selectedYear)));
    for (const r of batchResults) if (r) results.push(r);
  }

  return {
    type: 'FeatureCollection',
    features: results,
  };
}
