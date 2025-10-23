import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import { useStore } from '@/store/useStore';
import { District, Representative, ElectionResult } from '@/types';
import { wikiAPI } from '@/utils/wikiApi';
import { motion } from 'framer-motion';
import { congressDataAPI } from '@/utils/congressDataApi';
export const Map: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const { map, timeline, setSelectedDistrict, setSelectedRepresentative, setHoveredDistrict } = useStore();

  useEffect(() => {
    if (!svgRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Setup SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'map-svg');

    // Clear previous content
    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Setup projection
    const projection = d3.geoAlbersUsa()
      .scale(1300)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Setup zoom
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Load US map data
    loadMapData(g, path, projection);

    // Handle window resize
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      svg.attr('width', newWidth).attr('height', newHeight);
      projection.translate([newWidth / 2, newHeight / 2]);
      g.selectAll('path').attr('d', path as any);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update colors when year or color mode changes
  useEffect(() => {
    if (!isLoaded) return;
    updateMapColors();
  }, [timeline.currentYear, map.colorBy, map.showBattlegrounds, isLoaded]);

  const loadMapData = async (g: any, path: any, projection: any) => {
    try {
      // Load US states and counties data (congressional districts require specific data)
      const statesResponse = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
      if (!statesResponse.ok) {
        throw new Error(`Failed to load states data: ${statesResponse.status}`);
      }
      const statesTopology = await statesResponse.json();
      const states: any = feature(statesTopology, statesTopology.objects.states);
      
      // Load counties to simulate districts
      const countiesResponse = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json');
      if (!countiesResponse.ok) {
        throw new Error(`Failed to load counties data: ${countiesResponse.status}`);
      }
      const countiesTopology = await countiesResponse.json();
      const counties: any = feature(countiesTopology, countiesTopology.objects.counties);
      
      // Create mock district data from counties
      const districtData = createMockDistrictData(counties.features);
      setDistricts(districtData);

      g.append('g')
        .attr('class', 'states')
        .selectAll('path')
        .data(states.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255, 255, 255, 0.2)')
        .attr('stroke-width', 1.5);

      // Draw congressional districts (using counties as proxy)
      g.append('g')
        .attr('class', 'districts')
        .selectAll('path')
        .data(districtData)
        .enter()
        .append('path')
        .attr('d', (d: any) => path(d.geometry))
        .attr('class', 'district')
        .attr('data-id', (d: any) => d.id)
        .attr('fill', (d: any) => getDistrictColor(d))
        .attr('stroke', 'rgba(0, 0, 0, 0.3)')
        .attr('stroke-width', 0.3)
        .style('cursor', 'pointer')
        .style('transition', 'all 0.2s ease')
        .on('mouseover', function(this: SVGPathElement, event: any, d: any) {
          d3.select(this)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.5)
            .attr('fill-opacity', 0.8)
            .raise();
          setHoveredDistrict(d.id);
          showTooltip(event, d);
        })
        .on('mouseout', function(this: SVGPathElement) {
          d3.select(this)
            .attr('stroke', 'rgba(0, 0, 0, 0.3)')
            .attr('stroke-width', 0.3)
            .attr('fill-opacity', 1);
          setHoveredDistrict(null);
          hideTooltip();
        })
        .on('click', (_event: any, d: any) => {
          handleDistrictClick(d);
        });

      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading map:', error);
    }
  };

  const generateStancesForEra = (party: string, year: number): any[] => {
    const eraStances: Record<string, any> = {
      '1789-1860': {
        Democrat: [
          { topic: 'States Rights', position: 'Strong advocate for state sovereignty and limited federal power', year },
          { topic: 'Territorial Expansion', position: 'Supported westward expansion and Manifest Destiny', year },
          { topic: 'Agriculture', position: 'Championed agrarian interests and farming communities', year },
        ],
        Republican: [
          { topic: 'Federal Unity', position: 'Supported stronger federal government and national banks', year },
          { topic: 'Industrial Development', position: 'Promoted manufacturing and commerce', year },
          { topic: 'Internal Improvements', position: 'Advocated for infrastructure and modernization', year },
        ],
      },
      '1860-1932': {
        Democrat: [
          { topic: 'Labor Rights', position: 'Supported workers rights and labor unions', year },
          { topic: 'Limited Government', position: 'Advocated for minimal federal intervention in economy', year },
          { topic: 'Immigration', position: 'Supported immigration for industrial growth', year },
        ],
        Republican: [
          { topic: 'Reconstruction', position: 'Supported federal oversight of southern states', year },
          { topic: 'Protective Tariffs', position: 'Advocated for high tariffs to protect American industry', year },
          { topic: 'Gold Standard', position: 'Supported sound money and fiscal conservatism', year },
        ],
      },
      '1932-1980': {
        Democrat: [
          { topic: 'New Deal Programs', position: 'Championed federal social programs and economic intervention', year },
          { topic: 'Labor Unions', position: 'Strong support for organized labor and workers rights', year },
          { topic: 'Civil Rights', position: 'Evolved to support civil rights legislation', year },
          { topic: 'Social Security', position: 'Defended and expanded social safety net programs', year },
        ],
        Republican: [
          { topic: 'Limited Government', position: 'Advocated for reduced federal spending and intervention', year },
          { topic: 'Free Enterprise', position: 'Supported business interests and deregulation', year },
          { topic: 'Anti-Communism', position: 'Strong stance against communist expansion', year },
        ],
      },
      '1980-2024': {
        Democrat: [
          { topic: 'Healthcare Reform', position: 'Advocated for universal healthcare and affordable coverage', year },
          { topic: 'Climate Change', position: 'Supported environmental protection and green energy', year },
          { topic: 'Social Programs', position: 'Defended social safety net and welfare programs', year },
          { topic: 'Progressive Taxation', position: 'Supported higher taxes on wealthy individuals and corporations', year },
        ],
        Republican: [
          { topic: 'Tax Cuts', position: 'Championed reduced taxes and smaller government', year },
          { topic: 'Deregulation', position: 'Advocated for reducing business regulations', year },
          { topic: 'Strong Defense', position: 'Supported robust military and national security', year },
          { topic: 'Traditional Values', position: 'Promoted conservative social policies', year },
        ],
      },
    };

    let eraKey = '1980-2024';
    if (year < 1860) eraKey = '1789-1860';
    else if (year < 1932) eraKey = '1860-1932';
    else if (year < 1980) eraKey = '1932-1980';

    return eraStances[eraKey]?.[party] || [];
  };

  const generateEraSummary = (party: string, startYear: number, endYear: number | null): string => {
    const eraSummaries: Record<string, Record<string, string>> = {
      '1789-1860': {
        Democrat: `Served during the Early Republic era, advocating for states' rights and agrarian interests. Represented constituents during a time of westward expansion and growing sectional tensions.`,
        Republican: `Represented the district during the formation of the American political system, supporting federalist principles and national economic development.`,
      },
      '1860-1932': {
        Democrat: `Served during the Gilded Age and Progressive Era, navigating rapid industrialization and social change. Advocated for working class interests and limited federal intervention.`,
        Republican: `Represented the district during Reconstruction and industrial expansion, supporting protective tariffs and sound monetary policy. Championed American industry and economic growth.`,
      },
      '1932-1980': {
        Democrat: `Served during the New Deal Coalition era, supporting federal programs to address economic inequality. Advocated for labor rights, social security, and an active federal government.`,
        Republican: `Represented the district during the Cold War era, opposing excessive government spending and supporting free enterprise. Championed traditional American values and anti-communist policies.`,
      },
      '1980-2024': {
        Democrat: `Served during the modern era, advocating for healthcare reform, environmental protection, and social justice. Supported progressive policies and government intervention to address inequality.`,
        Republican: `Represented the district during the conservative movement, championing tax cuts, deregulation, and traditional values. Advocated for smaller government and free market principles.`,
      },
    };

    let eraKey = '1980-2024';
    if (startYear < 1860) eraKey = '1789-1860';
    else if (startYear < 1932) eraKey = '1860-1932';
    else if (startYear < 1980) eraKey = '1932-1980';

    const endYearStr = endYear ? endYear.toString() : 'present';
    const summary = eraSummaries[eraKey]?.[party] || 'Served with distinction in the U.S. House of Representatives.';
    return `${summary} Term: ${startYear}-${endYearStr}.`;
  };

  const createMockDistrictData = (features: any[]): District[] => {
    const states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
    
    return features.map((feature: any, idx: number) => {
      const stateCode = states[idx % states.length];
      const districtNum = Math.floor(idx / states.length) + 1;
      
      // Generate multiple representatives across different time periods
      const representatives = generateHistoricalReps(stateCode, districtNum, idx);

      return {
        id: `${stateCode}-${districtNum}`,
        state: stateCode,
        districtNumber: districtNum,
        representatives,
        geometry: feature.geometry,
        electionHistory: generateElectionHistory(),
      };
    });
  };
  const createRealDistrictData = async (
  features: any[],
  year: number
): Promise<District[]> => {
  console.log(`🔄 Loading real data for ${year}...`);
  
  try {
    // Check if API is ready
    if (!congressDataAPI.isInitialized()) {
      console.warn('⚠️ API not ready, using mock data');
      return createMockDistrictData(features);
    }

    // Load all representatives for this year
    const allReps = await congressDataAPI.loadAllRepresentativesForYear(year);
    
    // Map features to districts with real data
    const states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 
                    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 
                    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 
                    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 
                    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
    
    const districts: District[] = features.map((feature: any, idx: number) => {
      const stateCode = states[idx % states.length];
      const districtNum = Math.floor(idx / states.length) + 1;
      const districtKey = `${stateCode}-${districtNum}`;
      
      // Get real representatives for this district
      const realReps = allReps.get(districtKey) || [];
      
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
    console.error('❌ Error loading real data:', error);
    return createMockDistrictData(features);
  }
};

  const generateHistoricalReps = (state: string, district: number, seed: number): Representative[] => {
    const reps: Representative[] = [];
    const parties: ('Democrat' | 'Republican' | 'Independent')[] = ['Democrat', 'Republican'];
    
    // Create representatives for different eras
    const eras = [
      { start: 1789, end: 1860, partyBias: seed % 2 }, // Early Republic
      { start: 1860, end: 1932, partyBias: (seed + 1) % 2 }, // Civil War to New Deal
      { start: 1932, end: 1980, partyBias: seed % 2 }, // New Deal Coalition
      { start: 1980, end: 2008, partyBias: (seed + 1) % 2 }, // Reagan Era
      { start: 2008, end: 2024, partyBias: seed % 3 === 0 ? 0 : 1 }, // Modern Era
    ];

    eras.forEach((era, eraIdx) => {
      const numReps = Math.floor(Math.random() * 3) + 2; // 2-4 reps per era
      const yearSpan = era.end - era.start;
      
      for (let i = 0; i < numReps; i++) {
        const startYear = era.start + Math.floor((yearSpan / numReps) * i);
        const endYear = i === numReps - 1 && eraIdx === eras.length - 1 
          ? null 
          : era.start + Math.floor((yearSpan / numReps) * (i + 1));
        
        // Occasionally flip party for competitive districts
        let party = parties[era.partyBias];
        if (seed % 5 === 0 && Math.random() > 0.5) {
          party = parties[(era.partyBias + 1) % 2];
        }

        const rep: Representative = {
          id: `rep-${state}-${district}-${startYear}`,
          name: generateRandomName(),
          party,
          district: district.toString(),
          state,
          startYear,
          endYear,
          stances: generateStancesForEra(party, startYear),
          bio: {
            fullName: generateRandomName(),
            summary: generateEraSummary(party, startYear, endYear),
            earlyLife: `Born in the ${Math.floor(startYear / 10) * 10}s, grew up during a transformative period in American history.`,
          },
        };
        reps.push(rep);
      }
    });

    return reps;
  };

  const generateElectionHistory = (): ElectionResult[] => {
    const history: ElectionResult[] = [];
    
    for (let year = 2024; year >= 1990; year -= 2) {
      history.push({
        year,
        candidates: [],
        isBattleground: Math.random() > 0.85,
        margin: Math.random() * 40,
        turnout: 45 + Math.random() * 35,
      });
    }
    
    return history;
  };

  const generateRandomName = (): string => {
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Jennifer', 'William', 'Lisa', 'James', 'Mary', 'Thomas', 'Patricia', 'Charles'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Taylor'];
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  };

  const getDistrictColor = (district: District): string => {
    const currentRep = district.representatives.find(
      (r) => r.startYear <= timeline.currentYear && (!r.endYear || r.endYear >= timeline.currentYear)
    );

    if (!currentRep) return '#334155'; // Slate-700

    switch (map.colorBy) {
      case 'party':
        return getPartyColor(currentRep.party);
      case 'margin':
        const margin = district.electionHistory?.[0]?.margin || 0;
        return margin > 20 ? '#1e40af' : margin > 10 ? '#60a5fa' : '#f59e0b'; // Blue shades to amber
      case 'turnout':
        const turnout = district.electionHistory?.[0]?.turnout || 0;
        return turnout > 70 ? '#10b981' : turnout > 60 ? '#34d399' : '#fbbf24'; // Emerald shades to amber
      default:
        return '#374151';
    }
  };

  const getPartyColor = (party: string): string => {
    switch (party) {
      case 'Democrat':
        return '#3b82f6'; // Blue
      case 'Republican':
        return '#ef4444'; // Red
      case 'Independent':
        return '#a855f7'; // Purple
      default:
        return '#475569'; // Slate
    }
  };

  const updateMapColors = () => {
    if (!svgRef.current || districts.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('.district')
      .transition()
      .duration(500)
      .attr('fill', function() {
        const districtId = d3.select(this as SVGPathElement).attr('data-id');
        const district = districts.find(d => d.id === districtId);
        if (!district) return '#334155';
        return getDistrictColor(district);
      })
      .attr('stroke-width', function() {
        if (!map.showBattlegrounds) return 0.3;
        const districtId = d3.select(this as SVGPathElement).attr('data-id');
        const district = districts.find(d => d.id === districtId);
        const isBattleground = district?.electionHistory?.some(e => e.isBattleground);
        return isBattleground ? 2 : 0.3;
      })
      .attr('stroke', function() {
        if (!map.showBattlegrounds) return 'rgba(0, 0, 0, 0.3)';
        const districtId = d3.select(this as SVGPathElement).attr('data-id');
        const district = districts.find(d => d.id === districtId);
        const isBattleground = district?.electionHistory?.some(e => e.isBattleground);
        return isBattleground ? '#f59e0b' : 'rgba(0, 0, 0, 0.3)';
      });
  };

  const handleDistrictClick = async (district: District) => {
    setSelectedDistrict(district);
    
    const currentRep = district.representatives.find(
      (r) => r.startYear <= timeline.currentYear && (!r.endYear || r.endYear >= timeline.currentYear)
    );

    if (currentRep) {
      // Fetch full representative info from Wikipedia
      const fullRep = await wikiAPI.getRepresentativeInfo(currentRep);
      setSelectedRepresentative(fullRep);
    }
  };

  const showTooltip = (event: any, district: District) => {
    const tooltip = d3.select('body').append('div')
      .attr('class', 'map-tooltip')
      .style('position', 'absolute')
      .style('background', 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))')
      .style('color', 'white')
      .style('padding', '14px 16px')
      .style('border-radius', '12px')
      .style('border', '1px solid rgba(16, 185, 129, 0.3)')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('backdrop-filter', 'blur(12px)')
      .style('box-shadow', '0 8px 32px rgba(0, 0, 0, 0.5)')
      .html(`
        <div style="font-weight: 700; margin-bottom: 6px; font-size: 0.95rem; color: #10b981;">${district.state} - District ${district.districtNumber}</div>
        ${district.representatives[0] ? `<div style="font-size: 0.875rem; color: #cbd5e1;">${district.representatives[0].name}</div><div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">${district.representatives[0].party}</div>` : ''}
      `);

    tooltip
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px');
  };

  const hideTooltip = () => {
    d3.selectAll('.map-tooltip').remove();
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {!isLoaded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 z-50"
        >
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-emerald-500 mb-6"></div>
            <p className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Loading Map Data...</p>
            <p className="text-sm text-slate-400 mt-2">Fetching US congressional districts</p>
          </div>
        </motion.div>
      )}
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};
