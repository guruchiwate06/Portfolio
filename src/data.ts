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
  repoName?: string;
  githubUrl?: string;
  liveDemoUrl?: string;
}

// Default verified projects seeded from configuration (ensures fresh visitors see projects even offline or on static hosting)
export const defaultProjects: ProjectData[] = [
  {
    id: 'gh-Flowgen',
    title: 'Flowgen',
    problem: 'AI-powered content workflow management platform for creators.',
    approach: 'Engineered modular architecture in JavaScript.',
    outcome: 'Maintained on GitHub with 0 stars.',
    tech: 'JavaScript',
    isPoC: false,
    repoName: 'Flowgen',
    liveDemoUrl: 'https://flowgen-olive.vercel.app/',
    githubUrl: 'https://github.com/guruchiwate06/Flowgen'
  },
  {
    id: 'gh-PATH_RL',
    title: 'PATH RL',
    problem: 'Reinforcement learning path planning and navigation algorithms.',
    approach: 'Engineered modular architecture in Python.',
    outcome: 'Maintained on GitHub with 0 stars.',
    tech: 'Python',
    isPoC: false,
    repoName: 'PATH_RL',
    githubUrl: 'https://github.com/guruchiwate06/PATH_RL'
  },
  {
    id: 'gh-LUNAR',
    title: 'LUNAR',
    problem: 'Autonomous lunar landing guidance and control simulation.',
    approach: 'Engineered modular architecture in Python.',
    outcome: 'Maintained on GitHub with 0 stars.',
    tech: 'Python',
    isPoC: false,
    repoName: 'LUNAR',
    githubUrl: 'https://github.com/guruchiwate06/LUNAR'
  },
  {
    id: 'gh-CircletoSearch',
    title: 'Circleto Search',
    problem: 'Visual gesture-based search system and interactive bounding detector.',
    approach: 'Engineered modular architecture in JavaScript.',
    outcome: 'Maintained on GitHub with 0 stars.',
    tech: 'JavaScript',
    isPoC: false,
    repoName: 'CircletoSearch',
    githubUrl: 'https://github.com/guruchiwate06/CircletoSearch'
  },
  {
    id: 'gh-plane-plant-UMLintegration',
    title: 'Plane Plant UML Integration',
    problem: 'Automated architectural UML diagram generation and code analysis pipeline.',
    approach: 'Engineered modular architecture in Python.',
    outcome: 'Maintained on GitHub with 0 stars.',
    tech: 'Python',
    isPoC: false,
    repoName: 'plane-plant-UMLintegration',
    githubUrl: 'https://github.com/guruchiwate06/plane-plant-UMLintegration'
  },
  {
    id: 'gh-Portfolio',
    title: 'Portfolio',
    problem: 'A personal portfolio website showcasing my projects, achievements, technical skills, and journey as an AI & ML student and developer.',
    approach: 'Engineered modular architecture in TypeScript.',
    outcome: 'Maintained on GitHub with 0 stars.',
    tech: 'TypeScript • React • Vite',
    isPoC: false,
    repoName: 'Portfolio',
    githubUrl: 'https://github.com/guruchiwate06/Portfolio'
  }
];

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
