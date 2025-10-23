import { Representative, Stance, Debate } from '@/types';

/**
 * Generate mock representative data for demonstration
 * In production, this would be replaced with real historical data
 */

const firstNames = [
  'Alexandria', 'Nancy', 'Kevin', 'Adam', 'Elizabeth', 'Bernie', 'Ted', 'Kamala',
  'Marco', 'Josh', 'Katie', 'Jim', 'Maxine', 'Steve', 'Ilhan', 'Rashida',
  'John', 'Sarah', 'Michael', 'Jennifer', 'David', 'Emily', 'Robert', 'Lisa'
];

const lastNames = [
  'Ocasio-Cortez', 'Pelosi', 'McCarthy', 'Schiff', 'Warren', 'Sanders', 'Cruz', 'Harris',
  'Rubio', 'Hawley', 'Porter', 'Jordan', 'Waters', 'Scalise', 'Omar', 'Tlaib',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'
];

const stanceTopics = [
  'Healthcare Reform',
  'Climate Change',
  'Immigration Policy',
  'Gun Control',
  'Economic Policy',
  'Education Funding',
  'Foreign Policy',
  'Criminal Justice Reform',
  'Voting Rights',
  'Infrastructure Investment',
];

const educationInstitutions = [
  'Harvard University',
  'Yale University',
  'Stanford University',
  'MIT',
  'University of California, Berkeley',
  'Columbia University',
  'Princeton University',
  'University of Michigan',
  'Georgetown University',
  'Boston University',
];

export const generateMockRepresentative = (
  state: string,
  district: number,
  year: number
): Representative => {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const name = `${firstName} ${lastName}`;
  
  const parties: ('Democrat' | 'Republican' | 'Independent')[] = ['Democrat', 'Republican'];
  const party = parties[Math.floor(Math.random() * parties.length)];

  const startYear = year - Math.floor(Math.random() * 10);
  const endYear = Math.random() > 0.7 ? startYear + Math.floor(Math.random() * 20) : null;

  const stances: Stance[] = stanceTopics.slice(0, 3 + Math.floor(Math.random() * 4)).map(topic => ({
    topic,
    position: generateStancePosition(party, topic),
    year: startYear + Math.floor(Math.random() * 5),
    source: 'Congressional Record',
  }));

  const debates: Debate[] = Math.random() > 0.5 ? [{
    date: `${startYear + Math.floor(Math.random() * 4)}-10-15`,
    topic: stanceTopics[Math.floor(Math.random() * stanceTopics.length)],
    opponent: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
    notes: 'Televised debate on key policy issues',
  }] : [];

  return {
    id: `${state}-${district}-${startYear}`,
    name,
    party,
    district: district.toString(),
    state,
    startYear,
    endYear,
    bio: {
      fullName: name,
      birthDate: `${1940 + Math.floor(Math.random() * 50)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      birthPlace: `${['New York', 'California', 'Texas', 'Florida', 'Illinois'][Math.floor(Math.random() * 5)]}, USA`,
      education: [
        `B.A. in Political Science, ${educationInstitutions[Math.floor(Math.random() * educationInstitutions.length)]}`,
        Math.random() > 0.5 ? `J.D., ${educationInstitutions[Math.floor(Math.random() * educationInstitutions.length)]}` : undefined,
      ].filter(Boolean) as string[],
      family: `Married with ${Math.floor(Math.random() * 4)} children`,
      earlyLife: `Born and raised in ${['New York', 'California', 'Texas', 'Florida'][Math.floor(Math.random() * 4)]}, showed early interest in public service and community organizing.`,
      career: `Served in various public offices before being elected to Congress in ${startYear}.`,
      summary: `${name} is a ${party} representative serving ${state}'s ${district}${getOrdinalSuffix(district)} congressional district since ${startYear}.`,
    },
    stances,
    debates,
  };
};

const generateStancePosition = (party: string, topic: string): string => {
  const democraticPositions: Record<string, string> = {
    'Healthcare Reform': 'Supports universal healthcare and affordable prescription drugs',
    'Climate Change': 'Advocates for aggressive climate action and renewable energy',
    'Immigration Policy': 'Supports pathway to citizenship and DACA protections',
    'Gun Control': 'Favors comprehensive background checks and assault weapons ban',
    'Economic Policy': 'Supports progressive taxation and increased minimum wage',
  };

  const republicanPositions: Record<string, string> = {
    'Healthcare Reform': 'Advocates for market-based healthcare solutions',
    'Climate Change': 'Supports balanced approach to energy and environmental policy',
    'Immigration Policy': 'Emphasizes border security and legal immigration reform',
    'Gun Control': 'Defends Second Amendment rights with targeted safety measures',
    'Economic Policy': 'Supports tax cuts and reduced regulations for economic growth',
  };

  const positions = party === 'Democrat' ? democraticPositions : republicanPositions;
  return positions[topic] || `Has stated positions on ${topic}`;
};

const getOrdinalSuffix = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return (s[(v - 20) % 10] || s[v] || s[0]);
};

export const mockHistoricalData = {
  majorElections: [
    { year: 1789, significance: 'First Presidential Election - George Washington' },
    { year: 1800, significance: 'First Peaceful Transfer of Power' },
    { year: 1828, significance: 'Rise of Democratic Party - Andrew Jackson' },
    { year: 1860, significance: 'Election of Abraham Lincoln - Civil War Era' },
    { year: 1896, significance: 'Realignment Election - McKinley vs Bryan' },
    { year: 1932, significance: 'New Deal Coalition - Franklin D. Roosevelt' },
    { year: 1964, significance: 'Great Society - Lyndon B. Johnson' },
    { year: 1980, significance: 'Reagan Revolution - Conservative Realignment' },
    { year: 2000, significance: 'Bush vs Gore - Contested Election' },
    { year: 2008, significance: 'First African American President - Barack Obama' },
    { year: 2016, significance: 'Trump Election - Populist Movement' },
    { year: 2020, significance: 'Biden Election - Pandemic Era' },
    { year: 2024, significance: 'Current Election Cycle' },
  ],
  
  battlegroundStates: [
    'Pennsylvania', 'Wisconsin', 'Michigan', 'Arizona', 'Georgia',
    'Nevada', 'North Carolina', 'Florida', 'Ohio', 'Iowa',
  ],
};
