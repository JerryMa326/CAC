import { create } from 'zustand';
import { TimelineState, MapState, FilterState, District, Representative } from '@/types';

interface AppStore {
  timeline: TimelineState;
  setYear: (year: number) => void;
  togglePlay: () => void;
  setPlaySpeed: (speed: number) => void;

  map: MapState;
  setSelectedDistrict: (district: District | null) => void;
  setSelectedRepresentative: (rep: Representative | null) => void;
  setHoveredDistrict: (districtId: string | null) => void;
  toggleBattlegrounds: () => void;
  setColorBy: (colorBy: 'party' | 'margin' | 'turnout') => void;

  filters: FilterState;
  toggleStance: (stance: string) => void;
  togglePartyFilter: (party: string) => void;
  toggleDebates: () => void;

  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useStore = create<AppStore>((set) => ({
  timeline: {
    currentYear: 2024,
    minYear: 1964,
    maxYear: 2025,
    isPlaying: false,
    playSpeed: 1,
  },
  setYear: (year) => set((state) => ({
    timeline: { ...state.timeline, currentYear: year },
  })),
  togglePlay: () => set((state) => ({
    timeline: { ...state.timeline, isPlaying: !state.timeline.isPlaying },
  })),
  setPlaySpeed: (speed) => set((state) => ({
    timeline: { ...state.timeline, playSpeed: speed },
  })),
  
  map: {
    selectedDistrict: null,
    selectedRepresentative: null,
    hoveredDistrict: null,
    showBattlegrounds: false,
    colorBy: 'party',
  },
  setSelectedDistrict: (district) => set((state) => ({
    map: { ...state.map, selectedDistrict: district },
  })),
  setSelectedRepresentative: (rep) => set((state) => ({
    map: { ...state.map, selectedRepresentative: rep },
  })),
  setHoveredDistrict: (districtId) => set((state) => ({
    map: { ...state.map, hoveredDistrict: districtId },
  })),
  toggleBattlegrounds: () => set((state) => ({
    map: { ...state.map, showBattlegrounds: !state.map.showBattlegrounds },
  })),
  setColorBy: (colorBy) => set((state) => ({
    map: { ...state.map, colorBy },
  })),
  
  filters: {
    selectedStances: [],
    partyFilter: [],
    showDebates: false,
  },
  toggleStance: (stance) => set((state) => ({
    filters: {
      ...state.filters,
      selectedStances: state.filters.selectedStances.includes(stance)
        ? state.filters.selectedStances.filter(s => s !== stance)
        : [...state.filters.selectedStances, stance],
    },
  })),
  togglePartyFilter: (party) => set((state) => ({
    filters: {
      ...state.filters,
      partyFilter: state.filters.partyFilter.includes(party)
        ? state.filters.partyFilter.filter(p => p !== party)
        : [...state.filters.partyFilter, party],
    },
  })),
  toggleDebates: () => set((state) => ({
    filters: { ...state.filters, showDebates: !state.filters.showDebates },
  })),
  
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
