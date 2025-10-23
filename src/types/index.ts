export interface Representative {
  id: string;
  name: string;
  party: 'Democrat' | 'Republican' | 'Independent' | 'Other';
  district: string;
  state: string;
  startYear: number;
  endYear: number | null;
  imageUrl?: string;
  wikiUrl?: string;
  bio?: Biography;
  stances?: Stance[];
  debates?: Debate[];
}

export interface Biography {
  fullName: string;
  birthDate?: string;
  birthPlace?: string;
  education?: string[];
  family?: string;
  earlyLife?: string;
  career?: string;
  summary?: string;
}

export interface Stance {
  topic: string;
  position: string;
  year: number;
  source?: string;
}

export interface Debate {
  date: string;
  topic: string;
  opponent?: string;
  outcome?: string;
  notes?: string;
}

export interface District {
  id: string;
  state: string;
  districtNumber: number;
  representatives: Representative[];
  geometry: any;
  population?: number;
  demographics?: Demographics;
  electionHistory?: ElectionResult[];
}

export interface Demographics {
  totalPopulation: number;
  medianIncome?: number;
  urbanRural?: {
    urban: number;
    rural: number;
  };
  education?: {
    highSchool: number;
    bachelor: number;
    graduate: number;
  };
}

export interface ElectionResult {
  year: number;
  candidates: Candidate[];
  turnout?: number;
  margin?: number;
  isBattleground?: boolean;
}

export interface Candidate {
  name: string;
  party: string;
  votes: number;
  percentage: number;
  won: boolean;
}

export interface TimelineState {
  currentYear: number;
  minYear: number;
  maxYear: number;
  isPlaying: boolean;
  playSpeed: number;
}

export interface MapState {
  selectedDistrict: District | null;
  selectedRepresentative: Representative | null;
  hoveredDistrict: string | null;
  showBattlegrounds: boolean;
  colorBy: 'party' | 'margin' | 'turnout';
}

export interface FilterState {
  selectedStances: string[];
  partyFilter: string[];
  showDebates: boolean;
}
