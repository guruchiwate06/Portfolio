import { 
  ProjectConfig, 
  ResolvedProject, 
  AchievementItem, 
  PortfolioSettings, 
  GitHubRepo 
} from '../types/portfolio';
import { 
  fetchGitHubRepos, 
  getCachedRepos, 
  formatRepoTitle 
} from './githubService';
import { 
  defaultProjects, 
  defaultAchievements, 
  defaultAboutAncient, 
  defaultSkills, 
  ProjectData, 
  AchievementData 
} from '../data';
import { apiSet, SERVER_URL } from './portfolioApi';

const STORAGE_KEYS = {
  PROJECTS_CONFIG: 'portfolio_projects_config_v2',
  ACHIEVEMENTS: 'portfolio_achievements_v2',
  SETTINGS: 'portfolio_settings_v2',
  LEGACY_PROJECTS: 'portfolio_projects',
  LEGACY_ACHIEVEMENTS: 'portfolio_achievements',
  ABOUT: 'portfolio_about',
  SKILLS: 'portfolio_skills',
};

export const DEFAULT_SETTINGS: PortfolioSettings = {
  githubUsername: 'guruchiwate06',
  cacheTtlMinutes: 30,
  autoSyncOnLoad: true,
  linkedInProfileUrl: 'https://www.linkedin.com/in/rajguru-chiwate-9731772b1',
  lastSyncTimestamp: 0,
  cvUrl: '',
  cvFileName: '',
  cvLastUpdated: 0,
};

/**
 * Loads portfolio system settings
 */
export function getSettings(): PortfolioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Failed to load settings:', err);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Saves portfolio system settings (localStorage + server)
 */
export function saveSettings(settings: Partial<PortfolioSettings>): PortfolioSettings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save settings to localStorage:', err);
  }
  // Also persist to server (fire-and-forget)
  apiSet('settings', updated).catch(err =>
    console.warn('Server save skipped (offline?):', err)
  );
  return updated;
}

/**
/**
 * Detects whether a project configuration is a legacy dummy item
 */
export function isDummyProject(p: { id?: string; title?: string; overrides?: { title?: string } }): boolean {
  const dummyIds = ['01', '02', '03', '04', '05'];
  const dummyTitles = [
    'project archon',
    'nexus hub',
    'cygna intel',
    'cognitive neural core',
    'kennel connect',
    'new neural architecture project'
  ];
  const title = (p.overrides?.title || p.title || '').toLowerCase().trim();
  const id = (p.id || '').toLowerCase().trim();
  return dummyIds.includes(id) || dummyTitles.some(d => title.includes(d));
}

/**
 * Detects whether an achievement is a legacy dummy item
 */
export function isDummyAchievement(a: { id?: string; title?: string; source?: string }): boolean {
  const dummyTitles = [
    'adaptive neural routing',
    'nextgen autonomous ai',
    'deep learning & neural architectures specialization',
    'excellence in machine learning architecture award'
  ];
  const title = (a.title || '').toLowerCase().trim();
  return dummyTitles.some(d => title.includes(d));
}

/**
 * Purges all previously added dummy projects and achievements from storage
 */
export function purgeAllDummyData(): { projectsPurged: number; achievementsPurged: number } {
  let projectsPurged = 0;
  let achievementsPurged = 0;

  try {
    const rawProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS_CONFIG);
    if (rawProjects) {
      const parsed: ProjectConfig[] = JSON.parse(rawProjects);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(p => !isDummyProject(p));
        projectsPurged = parsed.length - cleaned.length;
        localStorage.setItem(STORAGE_KEYS.PROJECTS_CONFIG, JSON.stringify(cleaned));
      }
    }

    const legacyProjects = localStorage.getItem(STORAGE_KEYS.LEGACY_PROJECTS);
    if (legacyProjects) {
      const parsed: ProjectData[] = JSON.parse(legacyProjects);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(p => !isDummyProject(p));
        localStorage.setItem(STORAGE_KEYS.LEGACY_PROJECTS, JSON.stringify(cleaned));
      }
    }

    const rawAchievements = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (rawAchievements) {
      const parsed: AchievementItem[] = JSON.parse(rawAchievements);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(a => !isDummyAchievement(a));
        achievementsPurged = parsed.length - cleaned.length;
        localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(cleaned));
      }
    }

    const legacyAchievements = localStorage.getItem(STORAGE_KEYS.LEGACY_ACHIEVEMENTS);
    if (legacyAchievements) {
      const parsed: AchievementData[] = JSON.parse(legacyAchievements);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(a => !isDummyAchievement(a));
        localStorage.setItem(STORAGE_KEYS.LEGACY_ACHIEVEMENTS, JSON.stringify(cleaned));
      }
    }
  } catch (err) {
    console.error('Error purging dummy data:', err);
  }

  return { projectsPurged, achievementsPurged };
}

/**
 * Initializes or loads project configurations.
 * Strips out any legacy dummy projects automatically.
 */
export function getProjectsConfig(): ProjectConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS_CONFIG);
    if (raw) {
      const parsed: ProjectConfig[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(p => !isDummyProject(p));
        if (cleaned.length !== parsed.length) {
          saveProjectsConfig(cleaned);
        }
        return cleaned;
      }
    }

    // Check legacy storage
    const legacyRaw = localStorage.getItem(STORAGE_KEYS.LEGACY_PROJECTS);
    let seedProjects: ProjectData[] = defaultProjects.filter(p => !isDummyProject(p));
    if (legacyRaw) {
      try {
        const parsedLegacy = JSON.parse(legacyRaw);
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
          seedProjects = parsedLegacy.filter(p => !isDummyProject(p));
        }
      } catch {}
    }

    // Seed initial project configs only from non-dummy projects
    const initialConfigs: ProjectConfig[] = seedProjects.map((p, idx) => ({
      id: p.id || `manual-${idx + 1}`,
      source: p.repoName ? 'github' : 'manual',
      repoName: p.repoName,
      isSelected: true,
      isVisible: true,
      order: idx,
      isFeatured: idx < 2,
      isPoC: !!p.isPoC,
      overrides: {
        title: p.title,
        problem: p.problem,
        approach: p.approach,
        outcome: p.outcome,
        tech: p.tech,
        githubUrl: p.githubUrl,
        liveDemoUrl: p.liveDemoUrl,
        isPoC: !!p.isPoC
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    saveProjectsConfig(initialConfigs);
    return initialConfigs;
  } catch (err) {
    console.error('Failed to get projects config:', err);
    return [];
  }
}

/**
 * Persists project configs to storage (localStorage + server)
 */
export function saveProjectsConfig(configs: ProjectConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROJECTS_CONFIG, JSON.stringify(configs));
  } catch (err) {
    console.error('Failed to save projects config to localStorage:', err);
  }
  // Also persist to server (fire-and-forget)
  apiSet('projectsConfig', configs).catch(err =>
    console.warn('Server save skipped (offline?):', err)
  );
}

/**
 * Loads achievements.
 * Strips out any legacy dummy achievements automatically.
 */
export function getAchievements(): AchievementItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (raw) {
      const parsed: AchievementItem[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(a => !isDummyAchievement(a));
        if (cleaned.length !== parsed.length) {
          saveAchievements(cleaned);
        }
        return cleaned;
      }
    }

    // Check legacy storage
    const legacyRaw = localStorage.getItem(STORAGE_KEYS.LEGACY_ACHIEVEMENTS);
    let seedAchievements: AchievementData[] = defaultAchievements.filter(a => !isDummyAchievement(a));
    if (legacyRaw) {
      try {
        const parsedLegacy = JSON.parse(legacyRaw);
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
          seedAchievements = parsedLegacy.filter(a => !isDummyAchievement(a));
        }
      } catch {}
    }

    // Seed initial achievements
    const initialItems: AchievementItem[] = seedAchievements.map((item, idx) => ({
      id: item.id || `ach-${idx + 1}`,
      source: 'manual',
      category: item.category,
      title: item.title,
      issuerOrVenue: item.issuerOrVenue,
      date: item.date,
      summary: item.summary,
      badgeText: item.badgeText,
      imageUrl: item.imageUrl,
      isVisible: true,
      isFeatured: idx === 0,
      order: idx,
      reviewStatus: 'approved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    saveAchievements(initialItems);
    return initialItems;
  } catch (err) {
    console.error('Failed to get achievements:', err);
    return [];
  }
}

/**
 * Persists achievements to storage (localStorage + server)
 */
export function saveAchievements(items: AchievementItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(items));
    // Also sync legacy key for backward compatibility
    const legacyCompatible: AchievementData[] = items.map(a => ({
      id: a.id,
      category: a.category as any,
      title: a.title,
      issuerOrVenue: a.issuerOrVenue,
      date: a.date,
      summary: a.summary,
      badgeText: a.badgeText,
      imageUrl: a.imageUrl
    }));
    localStorage.setItem(STORAGE_KEYS.LEGACY_ACHIEVEMENTS, JSON.stringify(legacyCompatible));
  } catch (err) {
    console.error('Failed to save achievements to localStorage:', err);
  }
  // Also persist to server (fire-and-forget)
  apiSet('achievements', items).catch(err =>
    console.warn('Server save skipped (offline?):', err)
  );
}

/**
 * Resolves public portfolio projects by fusing GitHub live data and user manual overrides.
 * Strict rules:
 * - Only selected & visible projects are returned for the public site.
 * - Respects the user's explicit order.
 * - Manual overrides take priority over raw GitHub data.
 * - Missing/deleted repos fail gracefully without crashing.
 */
export function resolvePublicProjects(
  configs: ProjectConfig[],
  cachedRepos: GitHubRepo[] = []
): ResolvedProject[] {
  const repoMap = new Map<string, GitHubRepo>();
  for (const repo of cachedRepos) {
    repoMap.set(repo.name.toLowerCase(), repo);
  }

  // Filter only selected and visible projects
  const activeConfigs = configs
    .filter(c => c.isSelected && c.isVisible)
    .sort((a, b) => a.order - b.order);

  return activeConfigs.map(c => {
    const repo = c.repoName ? repoMap.get(c.repoName.toLowerCase()) : undefined;
    const ov = c.overrides || {};

    // Dynamic resolution
    const title = ov.title?.trim() || (repo ? formatRepoTitle(repo.name) : c.id);
    const problem = ov.problem?.trim() || (repo?.description ? repo.description : 'Specialized engineering problem addressed through custom architecture.');
    const approach = ov.approach?.trim() || (repo?.language ? `Engineered modular neural algorithms using ${repo.language} and high-throughput pipelines.` : 'Integrated modern engineering paradigms.');
    const outcome = ov.outcome?.trim() || (repo ? `Maintained ${repo.stargazers_count} stars and verified stability on GitHub.` : 'Achieved measurable scalability.');
    const tech = ov.tech?.trim() || (repo?.topics && repo.topics.length > 0 
      ? repo.topics.slice(0, 3).map(t => t.toUpperCase()).join(' • ') 
      : (repo?.language || 'Python • PyTorch'));
    const isPoC = ov.isPoC ?? c.isPoC ?? (repo ? (repo.name.toLowerCase().includes('poc') || repo.name.toLowerCase().includes('research')) : false);
    const isFeatured = ov.imageUrl ? true : (c.isFeatured ?? false);
    const githubUrl = ov.githubUrl?.trim() || repo?.html_url;
    const liveDemoUrl = ov.liveDemoUrl?.trim() || repo?.homepage || undefined;

    return {
      id: c.id,
      title,
      problem,
      approach,
      outcome,
      tech,
      isPoC,
      isFeatured,
      isVisible: c.isVisible,
      order: c.order,
      source: c.source,
      repoName: c.repoName,
      githubUrl,
      liveDemoUrl,
      stars: repo?.stargazers_count,
      forks: repo?.forks_count,
      updatedAt: repo?.updated_at,
      topics: repo?.topics,
      rawGitHub: repo
    };
  });
}

/**
 * Adds a GitHub repository to the portfolio projects list
 */
export function selectGitHubRepository(repo: GitHubRepo): ProjectConfig[] {
  const configs = getProjectsConfig();
  const existing = configs.find(c => c.repoName?.toLowerCase() === repo.name.toLowerCase());

  if (existing) {
    existing.isSelected = true;
    existing.isVisible = true;
    saveProjectsConfig(configs);
    return configs;
  }

  const newConfig: ProjectConfig = {
    id: `gh-${repo.name}`,
    source: 'github',
    repoName: repo.name,
    isSelected: true,
    isVisible: true,
    order: configs.length,
    isFeatured: repo.stargazers_count > 0,
    isPoC: repo.name.toLowerCase().includes('poc') || repo.name.toLowerCase().includes('research'),
    overrides: {
      title: formatRepoTitle(repo.name),
      problem: repo.description || 'Add custom problem description...',
      approach: repo.language ? `Engineered modular architecture in ${repo.language}.` : '',
      outcome: `Maintained on GitHub with ${repo.stargazers_count} stars.`,
      tech: repo.topics.length > 0 ? repo.topics.map(t => t.toUpperCase()).join(' • ') : (repo.language || 'Python'),
      liveDemoUrl: repo.homepage || undefined,
      githubUrl: repo.html_url,
      isPoC: repo.name.toLowerCase().includes('poc') || repo.name.toLowerCase().includes('research'),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const updated = [...configs, newConfig];
  saveProjectsConfig(updated);
  return updated;
}

/**
 * Deselects a repository (removes it from public projects)
 */
export function deselectRepository(idOrRepoName: string): ProjectConfig[] {
  const configs = getProjectsConfig();
  const updated = configs.map(c => {
    if (c.id === idOrRepoName || c.repoName?.toLowerCase() === idOrRepoName.toLowerCase()) {
      return { ...c, isSelected: false };
    }
    return c;
  });
  saveProjectsConfig(updated);
  return updated;
}

/**
 * Toggles visibility for a project
 */
export function toggleProjectVisibility(id: string): ProjectConfig[] {
  const configs = getProjectsConfig();
  const updated = configs.map(c => {
    if (c.id === id) {
      return { ...c, isVisible: !c.isVisible };
    }
    return c;
  });
  saveProjectsConfig(updated);
  return updated;
}

/**
 * Reorders projects by an array of project IDs in order
 */
export function reorderProjects(orderedIds: string[]): ProjectConfig[] {
  const configs = getProjectsConfig();
  const idToOrder = new Map<string, number>();
  orderedIds.forEach((id, idx) => idToOrder.set(id, idx));

  const updated = configs.map(c => {
    if (idToOrder.has(c.id)) {
      return { ...c, order: idToOrder.get(c.id)! };
    }
    return c;
  }).sort((a, b) => a.order - b.order);

  saveProjectsConfig(updated);
  return updated;
}

/**
 * Updates manual overrides for a project
 */
export function updateProjectOverrides(
  id: string, 
  overrides: Partial<ProjectConfig['overrides']> & { isPoC?: boolean; isFeatured?: boolean }
): ProjectConfig[] {
  const configs = getProjectsConfig();
  const updated = configs.map(c => {
    if (c.id === id) {
      const { isPoC, isFeatured, ...otherOverrides } = overrides;
      return {
        ...c,
        isPoC: isPoC !== undefined ? isPoC : c.isPoC,
        isFeatured: isFeatured !== undefined ? isFeatured : c.isFeatured,
        overrides: {
          ...c.overrides,
          ...otherOverrides,
          isPoC: isPoC !== undefined ? isPoC : c.overrides.isPoC
        },
        updatedAt: new Date().toISOString()
      };
    }
    return c;
  });
  saveProjectsConfig(updated);
  return updated;
}

/**
 * Deletes or permanently removes a project configuration
 */
export function deleteProject(id: string): ProjectConfig[] {
  const configs = getProjectsConfig();
  const updated = configs.filter(c => c.id !== id);
  saveProjectsConfig(updated);
  return updated;
}

/**
 * Full Export of configuration for backup
 */
export function exportPortfolioBackup(): string {
  const data = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    projectsConfig: getProjectsConfig(),
    achievements: getAchievements(),
    about: localStorage.getItem(STORAGE_KEYS.ABOUT) || defaultAboutAncient,
    skills: localStorage.getItem(STORAGE_KEYS.SKILLS) || JSON.stringify(defaultSkills)
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Full Import of configuration from backup
 */
export function importPortfolioBackup(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (!data.projectsConfig || !data.achievements) {
      throw new Error('Invalid backup file structure.');
    }
    if (data.settings) saveSettings(data.settings);
    if (data.projectsConfig) saveProjectsConfig(data.projectsConfig);
    if (data.achievements) saveAchievements(data.achievements);
    if (data.about) localStorage.setItem(STORAGE_KEYS.ABOUT, data.about);
    if (data.skills) localStorage.setItem(STORAGE_KEYS.SKILLS, data.skills);
    return true;
  } catch (err) {
    console.error('Failed to import backup:', err);
    return false;
  }
}

/**
 * Initializes portfolio data from the persistence server.
 *
 * Call this ONCE on app startup (before reading any config).
 * It syncs server-persisted data into localStorage so all synchronous
 * getters (getProjectsConfig, getAchievements, etc.) return correct data
 * regardless of which port Vite started on.
 *
 * Returns true if server data was loaded, false if using local/default data.
 */
export async function initFromServer(): Promise<boolean> {
  const targetUrl = SERVER_URL ? `${SERVER_URL}/api/portfolio` : '/api/portfolio';
  try {
    const res = await fetch(targetUrl, {
      signal: AbortSignal.timeout(2000)
    });
    if (!res.ok) return false;

    const data = await res.json();

    if (Array.isArray(data.projectsConfig) && data.projectsConfig.length > 0) {
      localStorage.setItem(STORAGE_KEYS.PROJECTS_CONFIG, JSON.stringify(data.projectsConfig));
    }
    if (Array.isArray(data.achievements) && data.achievements.length > 0) {
      // Also update legacy key
      localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(data.achievements));
      const legacyCompatible = data.achievements.map((a: AchievementItem) => ({
        id: a.id, category: a.category, title: a.title,
        issuerOrVenue: a.issuerOrVenue, date: a.date, summary: a.summary, badgeText: a.badgeText,
        imageUrl: a.imageUrl
      }));
      localStorage.setItem(STORAGE_KEYS.LEGACY_ACHIEVEMENTS, JSON.stringify(legacyCompatible));
    }
    if (data.settings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    }
    if (data.about) {
      localStorage.setItem(STORAGE_KEYS.ABOUT, data.about);
    }
    if (data.skills) {
      localStorage.setItem(STORAGE_KEYS.SKILLS, data.skills);
    }

    console.log('[portfolio] Loaded data from persistence server.');
    return true;
  } catch {
    console.log('[portfolio] Persistence server not available; using localStorage.');
    return false;
  }
}
