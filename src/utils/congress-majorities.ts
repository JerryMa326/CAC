interface CongressData {
    number: number;
    startYear: number;
    endYear: number;
    houseMajority: 'Democrat' | 'Republican';
    houseSeats?: { dem: number; rep: number; other: number };
}

interface CoalitionEvent {
    congressNumber: number;
    year: number;
    title: string;
    description: string;
}

const congressData: CongressData[] = [
    { number: 89, startYear: 1965, endYear: 1967, houseMajority: 'Democrat', houseSeats: { dem: 295, rep: 140, other: 0 } },
    { number: 90, startYear: 1967, endYear: 1969, houseMajority: 'Democrat', houseSeats: { dem: 247, rep: 187, other: 1 } },
    { number: 91, startYear: 1969, endYear: 1971, houseMajority: 'Democrat', houseSeats: { dem: 243, rep: 192, other: 0 } },
    { number: 92, startYear: 1971, endYear: 1973, houseMajority: 'Democrat', houseSeats: { dem: 254, rep: 180, other: 1 } },
    { number: 93, startYear: 1973, endYear: 1975, houseMajority: 'Democrat', houseSeats: { dem: 239, rep: 192, other: 1 } },
    { number: 94, startYear: 1975, endYear: 1977, houseMajority: 'Democrat', houseSeats: { dem: 291, rep: 144, other: 0 } },
    { number: 95, startYear: 1977, endYear: 1979, houseMajority: 'Democrat', houseSeats: { dem: 292, rep: 143, other: 0 } },
    { number: 96, startYear: 1979, endYear: 1981, houseMajority: 'Democrat', houseSeats: { dem: 276, rep: 157, other: 2 } },
    { number: 97, startYear: 1981, endYear: 1983, houseMajority: 'Democrat', houseSeats: { dem: 243, rep: 192, other: 0 } },
    { number: 98, startYear: 1983, endYear: 1985, houseMajority: 'Democrat', houseSeats: { dem: 269, rep: 165, other: 1 } },
    { number: 99, startYear: 1985, endYear: 1987, houseMajority: 'Democrat', houseSeats: { dem: 252, rep: 182, other: 1 } },
    { number: 100, startYear: 1987, endYear: 1989, houseMajority: 'Democrat', houseSeats: { dem: 258, rep: 177, other: 0 } },
    { number: 101, startYear: 1989, endYear: 1991, houseMajority: 'Democrat', houseSeats: { dem: 259, rep: 174, other: 2 } },
    { number: 102, startYear: 1991, endYear: 1993, houseMajority: 'Democrat', houseSeats: { dem: 267, rep: 167, other: 1 } },
    { number: 103, startYear: 1993, endYear: 1995, houseMajority: 'Democrat', houseSeats: { dem: 258, rep: 176, other: 1 } },
    { number: 104, startYear: 1995, endYear: 1997, houseMajority: 'Republican', houseSeats: { dem: 204, rep: 230, other: 1 } },
    { number: 105, startYear: 1997, endYear: 1999, houseMajority: 'Republican', houseSeats: { dem: 206, rep: 228, other: 1 } },
    { number: 106, startYear: 1999, endYear: 2001, houseMajority: 'Republican', houseSeats: { dem: 211, rep: 223, other: 1 } },
    { number: 107, startYear: 2001, endYear: 2003, houseMajority: 'Republican', houseSeats: { dem: 212, rep: 221, other: 2 } },
    { number: 108, startYear: 2003, endYear: 2005, houseMajority: 'Republican', houseSeats: { dem: 205, rep: 229, other: 1 } },
    { number: 109, startYear: 2005, endYear: 2007, houseMajority: 'Republican', houseSeats: { dem: 202, rep: 232, other: 1 } },
    { number: 110, startYear: 2007, endYear: 2009, houseMajority: 'Democrat', houseSeats: { dem: 233, rep: 202, other: 0 } },
    { number: 111, startYear: 2009, endYear: 2011, houseMajority: 'Democrat', houseSeats: { dem: 257, rep: 178, other: 0 } },
    { number: 112, startYear: 2011, endYear: 2013, houseMajority: 'Republican', houseSeats: { dem: 193, rep: 242, other: 0 } },
    { number: 113, startYear: 2013, endYear: 2015, houseMajority: 'Republican', houseSeats: { dem: 201, rep: 234, other: 0 } },
    { number: 114, startYear: 2015, endYear: 2017, houseMajority: 'Republican', houseSeats: { dem: 188, rep: 247, other: 0 } },
    { number: 115, startYear: 2017, endYear: 2019, houseMajority: 'Republican', houseSeats: { dem: 194, rep: 241, other: 0 } },
    { number: 116, startYear: 2019, endYear: 2021, houseMajority: 'Democrat', houseSeats: { dem: 235, rep: 199, other: 1 } },
    { number: 117, startYear: 2021, endYear: 2023, houseMajority: 'Democrat', houseSeats: { dem: 222, rep: 213, other: 0 } },
    { number: 118, startYear: 2023, endYear: 2025, houseMajority: 'Republican', houseSeats: { dem: 213, rep: 222, other: 0 } },
    { number: 119, startYear: 2025, endYear: 2027, houseMajority: 'Republican', houseSeats: { dem: 215, rep: 220, other: 0 } },
];

const coalitionEvents: CoalitionEvent[] = [
    { congressNumber: 89, year: 1964, title: 'Civil Rights Act', description: 'Republicans helped overcome Southern Democrat opposition (80% GOP support)' },
    { congressNumber: 89, year: 1965, title: 'Voting Rights Act', description: 'Bipartisan coalition passed landmark voting legislation' },
    { congressNumber: 97, year: 1981, title: "Reagan's Budget", description: '"Boll Weevil" conservative Democrats crossed to pass economic plan' },
    { congressNumber: 97, year: 1981, title: 'ERTA Tax Cuts', description: '48 Democrats joined Republicans for largest tax cut in history' },
    { congressNumber: 99, year: 1986, title: 'Tax Reform Act', description: 'Bipartisan coalition simplified tax code' },
    { congressNumber: 101, year: 1990, title: 'Budget Agreement', description: 'Bush tax compromise split both parties' },
    { congressNumber: 103, year: 1993, title: 'NAFTA', description: '132 Republicans joined 102 Democrats to pass trade deal' },
    { congressNumber: 104, year: 1996, title: 'Welfare Reform', description: '98 Democrats crossed to pass welfare overhaul' },
    { congressNumber: 107, year: 2001, title: 'Bush Tax Cuts', description: '28 House Democrats crossed party lines' },
    { congressNumber: 107, year: 2002, title: 'Iraq War Resolution', description: '81 House Democrats voted for authorization' },
    { congressNumber: 110, year: 2008, title: 'TARP Bailout', description: 'Bipartisan emergency action despite majority opposition' },
    { congressNumber: 111, year: 2010, title: 'ACA Passage', description: 'Party-line vote after Blue Dog negotiations narrowed scope' },
    { congressNumber: 117, year: 2021, title: 'Infrastructure Bill', description: '13 Republicans joined Democrats for bipartisan passage' },
    { congressNumber: 117, year: 2022, title: 'Gun Safety Bill', description: '14 House Republicans crossed for first gun legislation in decades' },
    { congressNumber: 118, year: 2023, title: 'Debt Ceiling Deal', description: 'Bipartisan coalition overcame hardliner opposition' },
    { congressNumber: 118, year: 2024, title: 'Ukraine/Israel Aid', description: 'Democrats rescued bill after GOP Speaker deadlock' },
];

export function getCongressNumber(year: number): number {
    return Math.floor((year - 1789) / 2) + 1;
}

export function getCongressForYear(year: number): CongressData | null {
    return congressData.find(c => year >= c.startYear && year < c.endYear) || null;
}

export function getCoalitionEvents(congressNumber: number): CoalitionEvent[] {
    return coalitionEvents.filter(e => e.congressNumber === congressNumber);
}

export function getOrdinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

export type { CongressData, CoalitionEvent };
