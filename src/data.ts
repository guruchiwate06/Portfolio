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
}

// Default achievements start empty; populated only from user-authorized achievements
export const defaultAchievements: AchievementData[] = [];
