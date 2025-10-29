import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import { useStore } from '@/store/useStore';
import { dataLoader, type LegislatorTerm } from '@/utils/congressionalDataLoader';
import { fetchAllDistrictShapesForYear } from '@/utils/districtService';
import { fetchWikipediaData } from '@/utils/wikipediaService';
import { motion } from 'framer-motion';

export const Map: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const pathRef = useRef<d3.GeoPath<any, d3.GeoPermissibleObjects> | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [districtsCount, setDistrictsCount] = useState(0);
  const { map, timeline, setSelectedRepresentative } = useStore();
  const initializedRef = useRef(false);
  const termsByKeyRef = useRef<Record<string, LegislatorTerm>>({});
  const loadCounterRef = useRef(0);

  // Load real data when year changes
  useEffect(() => {
    if (!isLoaded) return;
    loadRealData(timeline.currentYear);
  }, [timeline.currentYear, isLoaded]);

  // Update colors when data or settings change
  useEffect(() => {
    if (!isLoaded || districtsCount === 0) return;
    updateMapColors();
  }, [districtsCount, map.colorBy, isLoaded]);

  // Initial map setup
  useEffect(() => {
    if (!svgRef.current || initializedRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'map-svg');

    svg.selectAll('*').remove();

    const g = svg.append('g');

    const projection = d3.geoAlbersUsa()
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);
    gRef.current = g;
    pathRef.current = path as any;

    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    loadMapBase(g, path, projection, width, height);
    initializedRef.current = true;

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

  const loadMapBase = async (g: any, path: any, projection: any, width: number, height: number) => {
    try {
      console.log('🗺️ Loading map geometry...');
      
      const statesResponse = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
      if (!statesResponse.ok) throw new Error(`Failed to load states: ${statesResponse.status}`);
      const statesTopology = await statesResponse.json();
      const states: any = feature(statesTopology, statesTopology.objects.states);

      // Fit projection to the states geometry for current viewport
      try {
        projection.fitSize([width, height], states);
      } catch (_e) {
        // fallback to default translate if fitSize not available
      }

      console.log('✅ Map geometry loaded');

      // Draw base states layer (soft fill to avoid "dark spots")
      g.append('g')
        .attr('class', 'states')
        .selectAll('path')
        .data(states.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', 'rgba(148,163,184,0.06)')
        .attr('stroke', 'rgba(255, 255, 255, 0.18)')
        .attr('stroke-width', 1.5);

      // Prepare districts layer (emptied and redrawn per year)
      g.append('g').attr('class', 'districts');

      setIsLoaded(true);
      console.log('✅ Map fully loaded');
      
      // Load initial data
      loadRealData(timeline.currentYear);
    } catch (error) {
      console.error('❌ Error loading map:', error);
    }
  };

  const loadRealData = async (year: number) => {
    const loadId = ++loadCounterRef.current;
    setIsLoadingData(true);
    try {
      console.log(`📊 Loading congressional members and districts for ${year}...`);
      const terms: LegislatorTerm[] = await dataLoader.getMembersForYear(year);
      if (loadId !== loadCounterRef.current) return; // stale
      // Build lookup for click -> representative
      const byKey: Record<string, LegislatorTerm> = {};
      for (const t of terms) {
        if (t.chamber !== 'House') continue;
        const did = t.district ?? 0;
        const numKey = `${t.state}-${did}`;
        if (!byKey[numKey]) byKey[numKey] = t;
        if (did === 0) {
          const zeroKey = `${t.state}-0`;
          const alKey = `${t.state}-AL`;
          if (!byKey[zeroKey]) byKey[zeroKey] = t;
          if (!byKey[alKey]) byKey[alKey] = t;
        }
      }
      termsByKeyRef.current = byKey;
      const districts = await fetchAllDistrictShapesForYear(terms, year);
      if (loadId !== loadCounterRef.current) return; // stale

      if (!gRef.current || !pathRef.current) return;
      const g = gRef.current;
      const path = pathRef.current;

      // Redraw districts layer
      const layer = g.select('.districts');
      layer.selectAll('*').remove();

      layer
        .selectAll('path')
        .data(districts.features)
        .enter()
        .append('path')
        .attr('d', (d: any) => path(d))
        .attr('class', 'district')
        .attr('fill', (d: any) => getPartyColor(d.properties?.__party))
        .attr('stroke', 'rgba(0, 0, 0, 0.4)')
        .attr('stroke-width', 0.4)
        .style('cursor', 'pointer')
        .on('mouseover', function(this: SVGPathElement) {
          d3.select(this)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.2)
            .attr('fill-opacity', 0.9)
            .raise();
        })
        .on('mouseout', function(this: SVGPathElement) {
          d3.select(this)
            .attr('stroke', 'rgba(0, 0, 0, 0.4)')
            .attr('stroke-width', 0.4)
            .attr('fill-opacity', 1);
        })
        .on('click', async (_event: any, d: any) => {
          const key = d.properties?.__key as string | undefined;
          if (!key) return;
          let term = termsByKeyRef.current[key];
          if (!term) {
            // Fallback AL <-> 0
            if (key.endsWith('-AL')) term = termsByKeyRef.current[key.replace('-AL', '-0')];
            else if (key.endsWith('-0')) term = termsByKeyRef.current[key.replace('-0', '-AL')];
          }
          // As a secondary fallback, try to match by state+district in current terms array
          if (!term) {
            const state = d.properties?.__state;
            const dist = d.properties?.__district;
            if (state && dist != null) {
              term = (terms as any[]).find((t: any) => t.state === state && String(t.district ?? 'AL') === String(dist));
            }
          }
          // If still not found, use feature properties directly to build a minimal rep card
          const name = term?.fullName || d.properties?.__name;
          const partyStr = term?.party || d.properties?.__party || 'Unknown';
          const state = term?.state || d.properties?.__state || '';
          const dist = String(term?.district ?? d.properties?.__district ?? '0');
          if (!name || !state) return;

          console.log('🧭 Clicked district', key, '->', name);

          // Fetch Wikipedia enrichment
          const wiki = await fetchWikipediaData(term?.wikipedia || d.properties?.__wikipedia);

          // Build Representative object for panel
          const rep = {
            id: term?.bioguide || d.properties?.__bioguide || key,
            name,
            party: normalizeParty(partyStr) as any,
            district: dist,
            state,
            startYear: term?.startYear || d.properties?.__era || timeline.currentYear,
            endYear: term?.endYear ?? null,
            imageUrl: wiki?.imageUrl || undefined,
            wikiUrl: wiki?.pageUrl || undefined,
            bio: {
              fullName: name,
              summary: wiki?.summary || undefined,
            },
          };

          setSelectedRepresentative(rep);
        });

      setDistrictsCount(districts.features.length);
      console.log(`✅ Rendered ${districts.features.length} district shapes`);
    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const updateMapColors = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const year = timeline.currentYear;

    svg.selectAll('.district')
      .transition()
      .duration(400)
      .attr('fill', (_d: any, i: number, nodes: any) => {
        const datum = (nodes[i] as any).__data__;
        const party = datum?.properties?.__party;
        return getPartyColor(party);
      });
    console.log(`🎨 Updated map colors for ${year}`);
  };

  const getPartyColor = (party?: string) => {
    const p = (party || '').toLowerCase();
    if (p.includes('democrat')) return '#2563eb';
    if (p.includes('republican')) return '#dc2626';
    if (p.includes('independent')) return '#10b981';
    return '#475569';
  };

  const normalizeParty = (party: string) => {
    const p = party.toLowerCase();
    if (p.startsWith('dem')) return 'Democrat';
    if (p.startsWith('rep')) return 'Republican';
    if (p.includes('ind')) return 'Independent';
    return 'Other';
  };

  return (
    <>
      <svg ref={svgRef} className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950" />
      
      {isLoadingData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-24 right-4 bg-slate-800/90 backdrop-blur-sm text-emerald-400 px-4 py-2 rounded-lg shadow-lg border border-emerald-500/30 z-50"
        >
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-emerald-400"></div>
            <span>Loading {timeline.currentYear} data...</span>
          </div>
        </motion.div>
      )}
      
      {/* Status toasts intentionally removed to keep UI clean */}
    </>
  );
};
