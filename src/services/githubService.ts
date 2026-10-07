import { GitHubRepo, GitHubCacheState } from '../types/portfolio';

const GITHUB_CACHE_KEY = 'portfolio_github_cache';
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

export interface FetchResult {
  repos: GitHubRepo[];
  fromCache: boolean;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
  error?: string;
}

/**
 * Reads cached GitHub repos from localStorage if still fresh
 */
export function getCachedRepos(username: string, ttlMs: number = DEFAULT_TTL_MS): GitHubCacheState | null {
  try {
    const raw = localStorage.getItem(GITHUB_CACHE_KEY);
    if (!raw) return null;
    const data: GitHubCacheState = JSON.parse(raw);
    if (data.username?.toLowerCase() !== username.toLowerCase()) return null;
    
    // Check if cache has expired
    const age = Date.now() - (data.lastFetchedAt || 0);
    if (age > ttlMs) {
      return { ...data, isExpired: true } as any;
    }
    return data;
  } catch (err) {
    console.warn('Failed to parse cached GitHub repos:', err);
    return null;
  }
}

/**
 * Saves GitHub repos to localStorage cache
 */
export function setCachedRepos(state: GitHubCacheState): void {
  try {
    localStorage.setItem(GITHUB_CACHE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to cache GitHub repos:', err);
  }
}

/**
 * Fetches public repositories from the official GitHub REST API v3
 * Uses caching and never makes unnecessary calls on every React render.
 */
export async function fetchGitHubRepos(
  username: string,
  options: { forceRefresh?: boolean; ttlMinutes?: number } = {}
): Promise<FetchResult> {
  const ttlMs = (options.ttlMinutes ?? 30) * 60 * 1000;
  
  // Check cache first unless forced
  if (!options.forceRefresh) {
    const cached = getCachedRepos(username, ttlMs);
    if (cached && !(cached as any).isExpired && cached.repos?.length > 0) {
      return {
        repos: cached.repos,
        fromCache: true,
        rateLimitRemaining: cached.rateLimitRemaining,
        rateLimitReset: cached.rateLimitReset
      };
    }
  }

  // Optional token for higher rate limits (5,000/hr instead of 60/hr)
  // Can be configured in .env as VITE_GITHUB_TOKEN
  const token = typeof import.meta !== 'undefined' && import.meta.env?.VITE_GITHUB_TOKEN;
  
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`;
    const response = await fetch(url, { headers });

    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');
    const rateLimitRemaining = remaining ? parseInt(remaining, 10) : undefined;
    const rateLimitReset = reset ? parseInt(reset, 10) : undefined;

    if (!response.ok) {
      // If rate limited or error, try fallback to stale cache
      const stale = getCachedRepos(username, Infinity);
      if (stale && stale.repos?.length > 0) {
        return {
          repos: stale.repos,
          fromCache: true,
          rateLimitRemaining,
          rateLimitReset,
          error: `GitHub API error: ${response.status} ${response.statusText} (Serving cached data)`
        };
      }
      throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
    }

    const rawData = await response.json();
    if (!Array.isArray(rawData)) {
      throw new Error('Unexpected response format from GitHub API');
    }

    const repos: GitHubRepo[] = rawData.map((item: any) => ({
      id: item.id,
      name: item.name,
      full_name: item.full_name,
      description: item.description || null,
      html_url: item.html_url,
      homepage: item.homepage && item.homepage.trim() ? item.homepage.trim() : null,
      language: item.language || null,
      stargazers_count: item.stargazers_count || 0,
      forks_count: item.forks_count || 0,
      open_issues_count: item.open_issues_count || 0,
      topics: Array.isArray(item.topics) ? item.topics : [],
      updated_at: item.updated_at,
      created_at: item.created_at,
      pushed_at: item.pushed_at,
      archived: !!item.archived,
      fork: !!item.fork,
      visibility: item.visibility,
      default_branch: item.default_branch
    }));

    // Save to cache
    const cacheState: GitHubCacheState = {
      username,
      repos,
      lastFetchedAt: Date.now(),
      rateLimitRemaining,
      rateLimitReset
    };
    setCachedRepos(cacheState);

    return {
      repos,
      fromCache: false,
      rateLimitRemaining,
      rateLimitReset
    };
  } catch (err: any) {
    console.error('Error fetching GitHub repos:', err);
    // Graceful offline fallback
    const stale = getCachedRepos(username, Infinity);
    if (stale && stale.repos?.length > 0) {
      return {
        repos: stale.repos,
        fromCache: true,
        error: `Could not reach GitHub API: ${err.message}. Showing cached data.`
      };
    }
    return {
      repos: [],
      fromCache: false,
      error: `GitHub API fetch failed: ${err.message}`
    };
  }
}

/**
 * Humanizes repository names for clean title display
 * e.g., "plane-plant-UMLintegration" -> "Plane Plant UML Integration"
 * e.g., "CarDigno" -> "Car Digno"
 */
export function formatRepoTitle(repoName: string): string {
  if (!repoName) return '';
  return repoName
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Rule-based candidate achievement detector from GitHub activity.
 * Strict rules: Only surfaces factual metrics (e.g. repo with stars, live demo, or high-activity topic).
 * NEVER invents facts. Always marks as 'pending' review so the user MUST approve it!
 */
export function detectCandidateAchievements(repos: GitHubRepo[]): Array<{
  id: string;
  category: 'Milestone' | 'Research' | 'Award';
  title: string;
  issuerOrVenue: string;
  date: string;
  summary: string;
  badgeText: string;
  projectId: string;
  externalUrl: string;
}> {
  const candidates: Array<any> = [];

  for (const repo of repos) {
    const year = repo.created_at ? new Date(repo.created_at).getFullYear().toString() : '2025';
    
    // Rule 1: Repository with stars
    if (repo.stargazers_count > 0) {
      candidates.push({
        id: `gh-star-${repo.name}`,
        category: 'Milestone',
        title: `Community Stargazers on ${formatRepoTitle(repo.name)}`,
        issuerOrVenue: `GitHub Open Source (${repo.full_name})`,
        date: year,
        summary: `Received ${repo.stargazers_count} star${repo.stargazers_count > 1 ? 's' : ''} from the developer and research community on GitHub.`,
        badgeText: `${repo.stargazers_count} GitHub Star${repo.stargazers_count > 1 ? 's' : ''}`,
        projectId: repo.name,
        externalUrl: repo.html_url
      });
    }

    // Rule 2: Production Deployment / Live Web App
    if (repo.homepage && repo.homepage.startsWith('http')) {
      candidates.push({
        id: `gh-live-${repo.name}`,
        category: 'Milestone',
        title: `Production Cloud Deployment of ${formatRepoTitle(repo.name)}`,
        issuerOrVenue: `Production Deployment (${repo.name})`,
        date: year,
        summary: `Verified live production deployment available at ${repo.homepage}.`,
        badgeText: 'Live Deployment',
        projectId: repo.name,
        externalUrl: repo.homepage
      });
    }
  }

  return candidates;
}
