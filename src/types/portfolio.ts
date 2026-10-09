export type ProjectSource = 'github' | 'manual';
export type AchievementSource = 'manual' | 'github' | 'linkedin';
export type AchievementCategory = 'Hackathon' | 'Research' | 'Certification' | 'Award' | 'Milestone';

// Raw GitHub repository shape from GitHub REST API v3
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
  updated_at: string;
  created_at: string;
  pushed_at: string;
  archived: boolean;
  fork: boolean;
  visibility?: string;
  default_branch?: string;
}

// User-defined manual overrides for a project
export interface ProjectOverrides {
  title?: string;
  problem?: string;
  approach?: string;
  outcome?: string;
  tech?: string;
  liveDemoUrl?: string;
  githubUrl?: string;
  imageUrl?: string;
  description?: string;
  isPoC?: boolean;
}

// Stored project configuration
export interface ProjectConfig {
  id: string; // Stable internal ID (e.g. repo name or custom UUID)
  source: ProjectSource;
  repoName?: string; // GitHub repository name (if source === 'github')
  isSelected: boolean;
  isVisible: boolean;
  order: number;
  isFeatured: boolean;
  isPoC?: boolean;
  overrides: ProjectOverrides;
  createdAt: string;
  updatedAt: string;
}

// Resolved project for public portfolio rendering
export interface ResolvedProject {
  id: string;
  title: string;
  problem: string;
  approach: string;
  outcome: string;
  tech: string;
  isPoC: boolean;
  isFeatured: boolean;
  isVisible: boolean;
  order: number;
  source: ProjectSource;
  repoName?: string;
  githubUrl?: string;
  liveDemoUrl?: string;
  stars?: number;
  forks?: number;
  updatedAt?: string;
  topics?: string[];
  rawGitHub?: GitHubRepo;
}

// Achievement item
export interface AchievementItem {
  id: string; // Stable internal ID
  source: AchievementSource;
  category: AchievementCategory;
  title: string;
  issuerOrVenue: string;
  date: string;
  summary: string;
  badgeText: string;
  isVisible: boolean;
  isFeatured?: boolean;
  order: number;
  projectId?: string; // Stable internal ID referencing a project
  externalUrl?: string; // Link to credential, paper, repository, etc.
  imageUrl?: string; // Optional photo/banner (URL or base64 data URI)
  reviewStatus?: 'approved' | 'pending';
  credentialId?: string; // Official credential/license ID (for LinkedIn/Certs)
  rawSourceData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}


// GitHub sync state and cache
export interface GitHubCacheState {
  username: string;
  repos: GitHubRepo[];
  lastFetchedAt: number; // Unix timestamp ms
  rateLimitRemaining?: number;
  rateLimitReset?: number;
}

// Portfolio system settings
export interface PortfolioSettings {
  githubUsername: string;
  cacheTtlMinutes: number;
  autoSyncOnLoad: boolean;
  linkedInProfileUrl: string;
  instagramProfileUrl?: string;
  lastSyncTimestamp: number;
  cvUrl?: string;
  cvFileName?: string;
  cvLastUpdated?: number;
}

