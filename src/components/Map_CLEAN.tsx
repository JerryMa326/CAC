import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import { useStore } from '@/store/useStore';
import { Representative } from '@/types';
import { realCongressAPI } from '@/utils/realCongressApi';
import { motion } from 'framer-motion';

export const Map: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [realData, setRealData] = useState(new Map<string, Representative[]>());
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { map, timeline, setSelectedRepresentative } = useStore();
  const hasAPIKey = realCongressAPI.hasAPIKey();

  // Load real data when year changes
  useEffect(() => {
    if (!isLoaded || !hasAPIKey) return;
    loadRealData(timeline.currentYear);
  }, [timeline.currentYear, isLoaded, hasAPIKey]);

  // Update colors when data or settings change
  useEffect(() => {
    if (!isLoaded || realData.size === 0) return;
    updateMapColors();
  }, [realData, map.colorBy, isLoaded]);

  // Initial map setup
  useEffect(() => {
    if (!svgRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'map-svg');

    svg.selectAll('*').remove();

    const g = svg.append('g');

    const projection = d3.geoAlbersUsa()
      .scale(1300)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    loadMapData(g, path);

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

  const loadMapData = async (g: any, path: any) => {
    try {
      console.log('🗺️ Loading map geometry...');
      
      const statesResponse = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
      if (!statesResponse.ok) throw new Error(`Failed to load states: ${statesResponse.status}`);
      const statesTopology = await statesResponse.json();
      const states: any = feature(statesTopology, statesTopology.objects.states);
      
      const countiesResponse = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json');
      if (!countiesResponse.ok) throw new Error(`Failed to load counties: ${countiesResponse.status}`);
      const countiesTopology = await countiesResponse.json();
      const counties: any = feature(countiesTopology, countiesTopology.objects.counties);
      
      console.log('✅ Map geometry loaded');

      // Draw state borders
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

      // Draw districts (using counties for visualization)
      g.append('g')
        .attr('class', 'districts')
        .selectAll('path')
        .data(counties.features)
        .enter()
        .append('path')
        .attr('d', (d: any) => path(d))
        .attr('class', 'district')
        .attr('data-county-id', (d: any) => d.id)
        .attr('fill', '#334155')
        .attr('stroke', 'rgba(0, 0, 0, 0.3)')
        .attr('stroke-width', 0.3)
        .style('cursor', 'pointer')
        .on('mouseover', function(this: SVGPathElement) {
          d3.select(this)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.5)
            .attr('fill-opacity', 0.8)
            .raise();
        })
        .on('mouseout', function(this: SVGPathElement) {
          d3.select(this)
            .attr('stroke', 'rgba(0, 0, 0, 0.3)')
            .attr('stroke-width', 0.3)
            .attr('fill-opacity', 1);
        })
        .on('click', () => {
          // Will implement click handler
        });

      setIsLoaded(true);
      console.log('✅ Map fully loaded');
      
      // Load initial data if API key available
      if (hasAPIKey) {
        loadRealData(timeline.currentYear);
      }
    } catch (error) {
      console.error('❌ Error loading map:', error);
    }
  };

  const loadRealData = async (year: number) => {
    if (!hasAPIKey) {
      console.log('⚠️ No API key - cannot load real data');
      return;
    }
    
    setIsLoadingData(true);
    try {
      console.log(`📊 Loading real congressional data for ${year}...`);
      const data = await realCongressAPI.loadAllRepresentativesForYear(year);
      setRealData(data);
      console.log(`✅ Loaded ${data.size} districts with real representatives`);
      
      // Log sample data
      const firstKey = Array.from(data.keys())[0];
      if (firstKey) {
        const sample = data.get(firstKey);
        console.log(`📋 Sample district ${firstKey}:`, sample?.[0]?.name);
      }
    } catch (error) {
      console.error('❌ Error loading real data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const updateMapColors = () => {
    if (!svgRef.current || realData.size === 0) return;
    
    const svg = d3.select(svgRef.current);
    const year = timeline.currentYear;
    
    // For now, just color all districts by party from real data
    svg.selectAll('.district')
      .transition()
      .duration(500)
      .attr('fill', () => {
        // This is a simplified version - will need proper district-to-county mapping
        // For now just show we have data
        return realData.size > 0 ? '#3b82f6' : '#334155';
      });
      
    console.log(`🎨 Updated map colors for ${year} with ${realData.size} districts`);
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
      
      {!hasAPIKey && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-red-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-lg shadow-lg border border-red-600 z-50 max-w-md text-center"
        >
          <div className="font-semibold mb-1">⚠️ NO API KEY</div>
          <div className="text-sm">
            Add VITE_CONGRESS_API_KEY to your .env file
          </div>
        </motion.div>
      )}
      
      {hasAPIKey && realData.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-emerald-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-lg shadow-lg border border-emerald-600 z-50 text-center"
        >
          <div className="font-semibold">✅ Real Data Loaded</div>
          <div className="text-sm">{realData.size} districts • {timeline.currentYear}</div>
        </motion.div>
      )}
    </>
  );
};
