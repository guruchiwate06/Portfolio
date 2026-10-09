import portfolioSeed from '../portfolio-data.json';

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

export const defaultProjects: ProjectData[] = [
  {
    id: 'gh-Flowgen',
    title: 'Flowgen',
    problem: 'AI-powered content workflow management platform for creators.',
    approach: 'Engineered modular architecture in JavaScript with streamlined pipeline orchestration.',
    outcome: 'Production-ready web platform with automated workflow generation and verified stability.',
    tech: 'JavaScript • React • Node.js',
    isPoC: false,
    repoName: 'Flowgen',
    liveDemoUrl: 'https://flowgen-olive.vercel.app/',
    githubUrl: 'https://github.com/guruchiwate06/Flowgen'
  },
  {
    id: 'gh-PATH_RL',
    title: 'PATH RL',
    problem: 'Autonomous reinforcement learning framework for dynamic obstacle avoidance and navigation.',
    approach: 'Engineered modular policy gradient and Q-learning path planning algorithms in Python.',
    outcome: 'Achieved efficient convergence and optimal trajectory planning across simulation benchmarks.',
    tech: 'Python • PyTorch • Reinforcement Learning',
    isPoC: false,
    repoName: 'PATH_RL',
    githubUrl: 'https://github.com/guruchiwate06/PATH_RL'
  },
  {
    id: 'gh-LUNAR',
    title: 'LUNAR',
    problem: 'Autonomous spacecraft lunar landing guidance and thrust vector control simulation.',
    approach: 'Engineered physics-based numerical trajectory simulation in Python with feedback control.',
    outcome: 'Demonstrated stable soft-landing descent trajectories with high accuracy under low gravity.',
    tech: 'Python • NumPy • Scientific Computing',
    isPoC: false,
    repoName: 'LUNAR',
    githubUrl: 'https://github.com/guruchiwate06/LUNAR'
  },
  {
    id: 'gh-CircletoSearch',
    title: 'Circle to Search',
    problem: 'Visual gesture-based search system and interactive bounding detector.',
    approach: 'Engineered real-time gesture recognition and canvas bounding pipeline in JavaScript.',
    outcome: 'Delivered intuitive visual search interaction with zero perceptible input lag.',
    tech: 'JavaScript • Canvas API • Computer Vision',
    isPoC: false,
    repoName: 'CircletoSearch',
    githubUrl: 'https://github.com/guruchiwate06/CircletoSearch'
  },
  {
    id: 'gh-plane-plant-UMLintegration',
    title: 'Plane Plant UML Integration',
    problem: 'Automated architectural UML diagram generation and code analysis pipeline.',
    approach: 'Engineered modular analysis pipeline in Python parsing code structures to PlantUML.',
    outcome: 'Automated diagram generation reducing architectural documentation overhead and visual drift.',
    tech: 'Python • AST Analysis • PlantUML',
    isPoC: false,
    repoName: 'plane-plant-UMLintegration',
    githubUrl: 'https://github.com/guruchiwate06/plane-plant-UMLintegration'
  },
  {
    id: 'gh-Portfolio',
    title: 'Portfolio',
    problem: 'Personal developer portfolio showcasing AI & ML projects, research milestones, and technical engineering.',
    approach: 'Engineered dual ancient-to-modern theme architecture with WebGL shaders and full responsiveness.',
    outcome: 'Shipped production-grade portfolio with sub-second loads and interactive 3D elements.',
    tech: 'TypeScript • React • Vite • Tailwind CSS',
    isPoC: false,
    repoName: 'Portfolio',
    liveDemoUrl: 'https://rajguru-chiwate.vercel.app/',
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

// Default verified achievements dynamically seeded from portfolio-data.json (ensures permanent persistence across builds & static hosting)
export const defaultAchievements: AchievementData[] = 
  (portfolioSeed?.achievements && Array.isArray(portfolioSeed.achievements) && portfolioSeed.achievements.length > 0)
    ? (portfolioSeed.achievements as any[]).map(a => ({
        id: a.id,
        category: a.category,
        title: a.title,
        issuerOrVenue: a.issuerOrVenue,
        date: a.date,
        summary: a.summary,
        badgeText: a.badgeText,
        imageUrl: a.imageUrl
      }))
    : [
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
