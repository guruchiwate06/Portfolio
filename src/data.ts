export const defaultAboutAncient = "Like the architects of old who built monuments for eternity, I design neural architectures that stand the test of complexity and scale. My focus lies at the intersection of Machine Learning and robust engineering.";

export const defaultAboutModern = "I engineer high-fidelity neural networks and adaptive cognitive systems, pushing the boundaries of what machine intelligence can achieve. My focus lies at the intersection of Machine Learning and robust engineering.";

export const defaultSkills = [
  'PYTHON CORE', 'NEURAL NETWORKS', 'COMPUTER VISION', 'REACT ARCHITECTURE', 'SQL DATA MINING', 'DEEP LEARNING', 'PYTORCH & CUDA', 'LLM ORCHESTRATION'
];

export interface ProjectData {
  id: string;
  title: string;
  problem: string;
  approach: string;
  outcome: string;
  tech: string;
  isPoC?: boolean;
}

// Default projects start empty; populated cleanly only from user-selected repositories
export const defaultProjects: ProjectData[] = [];

export interface AchievementData {
  id: string;
  category: 'Hackathon' | 'Research' | 'Certification' | 'Award' | 'Milestone';
  title: string;
  issuerOrVenue: string;
  date: string;
  summary: string;
  badgeText: string;
  imageUrl?: string;
}

// Default verified achievements with permanent asset paths
export const defaultAchievements: AchievementData[] = [
  {
    id: 'ach-kdu-global-2026',
    category: 'Milestone',
    title: 'Global Immersion Program — Exchange Semester in South Korea',
    issuerOrVenue: 'Kyungdong University Global (KDU Global), South Korea',
    date: '2026',
    summary: 'Completed a four-month exchange semester at KDU Global, gaining international exposure through academic experiences, cultural activities, global networking, and personal and professional growth.',
    badgeText: 'Global Exchange',
    imageUrl: '/achievements/kdu-global-exchange.jpg'
  },
  {
    id: 'ach-gdgoc-hackathon-2026',
    category: 'Hackathon',
    title: '3rd Place — 2026 Korea x Japan GDGoC Hackathon (The Bridge Hackathon)',
    issuerOrVenue: 'Korea University, Seoul • Google Developer Groups on Campus',
    date: '2026',
    summary: 'Won 3rd Place (₩300,000 KRW prize) at the prestigious 2026 Korea x Japan GDGoC Hackathon in Seoul, competing amongst top universities across Asia.',
    badgeText: '3rd Place Winner (₩300,000 KRW)',
    imageUrl: '/achievements/gdgoc-hackathon-seoul.jpg'
  }
];
