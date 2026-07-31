export const defaultAboutAncient = "Like the architects of old who built monuments for eternity, I design neural architectures that stand the test of complexity and scale. My focus lies at the intersection of Machine Learning and robust engineering.";

export const defaultAboutModern = "I engineer high-fidelity neural networks and adaptive cognitive systems, pushing the boundaries of what machine intelligence can achieve. My focus lies at the intersection of Machine Learning and robust engineering.";

export const defaultSkills = [
  'PYTHON CORE', 'NEURAL NETWORKS', 'COMPUTER VISION', 'REACT ARCHITECTURE', 'SQL DATA MINING', 'DEEP LEARNING'
];

export interface ProjectData {
  id: string;
  title: string;
  problem: string;
  approach: string;
  outcome: string;
  tech: string;
}

export const defaultProjects: ProjectData[] = [
  { 
    id: '01',
    title: 'Project Archon', 
    problem: 'High latency in edge inference.',
    approach: 'Built a custom neural engine optimized for embedded systems.',
    outcome: 'Achieved real-time processing with a minimal footprint.',
    tech: 'PyTorch • C++'
  },
  { 
    id: '02',
    title: 'Nexus Hub', 
    problem: 'Fragmented LLM orchestration.',
    approach: 'Developed a decentralized gateway for intelligent model routing.',
    outcome: 'Unified API access and improved retrieval speeds.',
    tech: 'Go • Rust • k8s'
  },
  { 
    id: '03',
    title: 'Cygna Intel', 
    problem: 'Unreliable predictive infrastructure.',
    approach: 'Integrated classical math models with modern ML.',
    outcome: 'Enhanced system stability and prediction accuracy.',
    tech: 'Python • TensorRT'
  },
  { 
    id: '04',
    title: 'Kennel Connect', 
    problem: 'Siloed biological data across research nodes.',
    approach: 'Created a decentralized network for data synthesis.',
    outcome: 'Streamlined collaborative research securely.',
    tech: 'FastAPI • Redis'
  }
];
