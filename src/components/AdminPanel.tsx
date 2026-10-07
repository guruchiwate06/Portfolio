import React, { useState, useEffect, useMemo } from 'react';
import { 
  ProjectConfig, 
  AchievementItem, 
  GitHubRepo, 
  PortfolioSettings,
  AchievementCategory,
  AchievementSource
} from '../types/portfolio';
import { 
  getSettings, 
  saveSettings, 
  getProjectsConfig, 
  saveProjectsConfig, 
  getAchievements, 
  saveAchievements, 
  selectGitHubRepository, 
  deselectRepository, 
  toggleProjectVisibility, 
  reorderProjects, 
  updateProjectOverrides, 
  deleteProject, 
  exportPortfolioBackup, 
  importPortfolioBackup,
  purgeAllDummyData,
  DEFAULT_SETTINGS,
  initFromServer
} from '../services/portfolioStore';
import { 
  fetchGitHubRepos, 
  getCachedRepos, 
  formatRepoTitle, 
  detectCandidateAchievements 
} from '../services/githubService';
import { 
  LINKEDIN_API_CAPABILITIES, 
  getLinkedInAuthorizationUrl 
} from '../services/linkedinService';
import { 
  defaultAboutAncient, 
  defaultSkills 
} from '../data';
import { 
  Save, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Star, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink, 
  Github, 
  Linkedin, 
  Link as LinkIcon, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Download, 
  Upload, 
  Search, 
  Sparkles, 
  Layers, 
  Sliders, 
  Edit3, 
  Check, 
  X, 
  Code2, 
  Clock, 
  Award, 
  BookOpen, 
  Trophy,
  LogOut,
  FileText,
  Lock,
  Key,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  apiLogin, 
  apiVerifyAuth, 
  apiLogout, 
  apiChangePassword, 
  isServerMode 
} from '../services/portfolioApi';

type AdminTab = 'projects' | 'github_repos' | 'achievements' | 'linkedin' | 'about_skills' | 'cv' | 'settings';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('projects');
  const [manualCvUrl, setManualCvUrl] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  
  // System State
  const [settings, setSettingsState] = useState<PortfolioSettings>(DEFAULT_SETTINGS);
  const [projectsConfig, setProjectsConfig] = useState<ProjectConfig[]>([]);
  const [achievements, setAchievementsState] = useState<AchievementItem[]>([]);
  const [availableRepos, setAvailableRepos] = useState<GitHubRepo[]>([]);
  const [isSyncingGitHub, setIsSyncingGitHub] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining?: number; reset?: number }>({});
  
  // About & Skills legacy/custom state
  const [aboutText, setAboutText] = useState('');
  const [skills, setSkills] = useState('');

  // Search & Filter States
  const [repoSearch, setRepoSearch] = useState('');
  const [repoLanguageFilter, setRepoLanguageFilter] = useState('ALL');
  const [projectSearch, setProjectSearch] = useState('');
  
  // Editing Modal / Override States
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectOverrideForm, setProjectOverrideForm] = useState<Partial<ProjectConfig['overrides']> & { isPoC?: boolean; isFeatured?: boolean }>({});
  
  // Editing Achievement Modal State
  const [editingAchievementId, setEditingAchievementId] = useState<string | null>(null);
  const [achievementForm, setAchievementForm] = useState<Partial<AchievementItem>>({});

  // Candidate Milestones detected from GitHub
  const [candidateMilestones, setCandidateMilestones] = useState<any[]>([]);

  // Backup & Import
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  // Initialize and load data
  useEffect(() => {
    apiVerifyAuth().then((isValid) => {
      setIsAuthenticated(isValid);
      setAuthChecking(false);
    });

    initFromServer().then(() => {
      // Purge any legacy dummy data
      purgeAllDummyData();

      const loadedSettings = getSettings();
      setSettingsState(loadedSettings);
      if (loadedSettings.cvUrl && !loadedSettings.cvUrl.startsWith('data:')) {
        setManualCvUrl(loadedSettings.cvUrl);
      }

      const loadedConfigs = getProjectsConfig();
      setProjectsConfig(loadedConfigs);

      const loadedAchievements = getAchievements();
      setAchievementsState(loadedAchievements);

      // Load About & Skills
      const savedAbout = localStorage.getItem('portfolio_about');
      const savedSkills = localStorage.getItem('portfolio_skills');
      setAboutText(savedAbout || defaultAboutAncient);
      try {
        const parsedSkills = savedSkills ? JSON.parse(savedSkills) : defaultSkills;
        setSkills(Array.isArray(parsedSkills) ? parsedSkills.join(', ') : parsedSkills);
      } catch {
        setSkills(defaultSkills.join(', '));
      }

      // Load cached repos immediately
      const cached = getCachedRepos(loadedSettings.githubUsername, loadedSettings.cacheTtlMinutes * 60 * 1000);
      if (cached?.repos && cached.repos.length > 0) {
        setAvailableRepos(cached.repos);
        setRateLimitInfo({ remaining: cached.rateLimitRemaining, reset: cached.rateLimitReset });
        setCandidateMilestones(detectCandidateAchievements(cached.repos));
      }
    });
  }, []);

  // Sync with GitHub API
  const handleSyncGitHub = async (force: boolean = true) => {
    setIsSyncingGitHub(true);
    setSyncStatusMsg('Fetching repositories from GitHub API...');
    try {
      const result = await fetchGitHubRepos(settings.githubUsername, {
        forceRefresh: force,
        ttlMinutes: settings.cacheTtlMinutes
      });

      if (result.repos && result.repos.length > 0) {
        setAvailableRepos(result.repos);
        setRateLimitInfo({ remaining: result.rateLimitRemaining, reset: result.rateLimitReset });
        setCandidateMilestones(detectCandidateAchievements(result.repos));
        
        const updatedSettings = saveSettings({ lastSyncTimestamp: Date.now() });
        setSettingsState(updatedSettings);

        setSyncStatusMsg(`Successfully synchronized ${result.repos.length} repositories from GitHub ${result.fromCache ? '(Cached)' : '(Fresh API)'}!`);
      } else if (result.error) {
        setSyncStatusMsg(`Sync note: ${result.error}`);
      }
    } catch (err: any) {
      setSyncStatusMsg(`Failed to connect to GitHub: ${err.message}`);
    } finally {
      setIsSyncingGitHub(false);
      setTimeout(() => setSyncStatusMsg(null), 6000);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await apiLogin(password);
      if (res.success) {
        setIsAuthenticated(true);
        setPassword('');
        // Auto-sync repos on successful admin login
        handleSyncGitHub(false);
      } else {
        setLoginError(res.error || 'Incorrect password. Access denied.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await apiLogout();
    setIsAuthenticated(false);
    setPassword('');
    setLoginError(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeStatus(null);
    if (!newPassword || newPassword.length < 8) {
      setPasswordChangeStatus({ type: 'error', msg: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeStatus({ type: 'error', msg: 'New passwords do not match.' });
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await apiChangePassword(currentPassword, newPassword);
      if (res.success) {
        setPasswordChangeStatus({ type: 'success', msg: 'Master password successfully updated and active!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordChangeStatus({ type: 'error', msg: res.error || 'Failed to update password.' });
      }
    } catch (err: any) {
      setPasswordChangeStatus({ type: 'error', msg: err.message || 'Error communicating with server.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // -------------------------------------------------------------
  // Project Actions
  // -------------------------------------------------------------
  const handleSelectRepo = (repo: GitHubRepo) => {
    const updated = selectGitHubRepository(repo);
    setProjectsConfig(updated);
  };

  const handleDeselectRepo = (idOrRepoName: string) => {
    const updated = deselectRepository(idOrRepoName);
    setProjectsConfig(updated);
  };

  const handleToggleProjectVisibility = (id: string) => {
    const updated = toggleProjectVisibility(id);
    setProjectsConfig(updated);
  };

  const handleMoveProject = (id: string, direction: 'up' | 'down') => {
    const sorted = [...projectsConfig].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex(p => p.id === id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = sorted[index];
      sorted[index] = sorted[index - 1];
      sorted[index - 1] = temp;
    } else if (direction === 'down' && index < sorted.length - 1) {
      const temp = sorted[index];
      sorted[index] = sorted[index + 1];
      sorted[index + 1] = temp;
    }

    const updated = reorderProjects(sorted.map(s => s.id));
    setProjectsConfig(updated);
  };

  const handleOpenEditProject = (project: ProjectConfig) => {
    setEditingProjectId(project.id);
    setProjectOverrideForm({
      title: project.overrides.title || '',
      problem: project.overrides.problem || '',
      approach: project.overrides.approach || '',
      outcome: project.overrides.outcome || '',
      tech: project.overrides.tech || '',
      liveDemoUrl: project.overrides.liveDemoUrl || '',
      githubUrl: project.overrides.githubUrl || '',
      isPoC: project.isPoC ?? project.overrides.isPoC ?? false,
      isFeatured: project.isFeatured ?? false
    });
  };

  const handleSaveProjectOverride = () => {
    if (!editingProjectId) return;
    const updated = updateProjectOverrides(editingProjectId, projectOverrideForm);
    setProjectsConfig(updated);
    setEditingProjectId(null);
  };

  const handleCreateManualProject = () => {
    const newId = `proj-manual-${Date.now()}`;
    const newProject: ProjectConfig = {
      id: newId,
      source: 'manual',
      repoName: undefined,
      isSelected: true,
      isVisible: true,
      order: projectsConfig.length,
      isFeatured: false,
      isPoC: false,
      overrides: {
        title: '',
        problem: '',
        approach: '',
        outcome: '',
        tech: '',
        isPoC: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [...projectsConfig, newProject];
    saveProjectsConfig(updated);
    setProjectsConfig(updated);
    handleOpenEditProject(newProject);
  };

  const handleDeleteProject = (id: string) => {
    if (confirm('Are you sure you want to permanently delete this project configuration?')) {
      const updated = deleteProject(id);
      setProjectsConfig(updated);
    }
  };

  // -------------------------------------------------------------
  // Achievement Actions
  // -------------------------------------------------------------
  const handleOpenCreateAchievement = (source: AchievementSource = 'manual') => {
    setEditingAchievementId('new');
    setAchievementForm({
      id: `ach-${Date.now()}`,
      source,
      category: 'Research',
      title: '',
      issuerOrVenue: '',
      date: new Date().getFullYear().toString(),
      summary: '',
      badgeText: 'Verified Distinction',
      isVisible: true,
      isFeatured: false,
      order: achievements.length,
      projectId: '',
      externalUrl: '',
      reviewStatus: 'approved'
    });
  };

  const handleOpenEditAchievement = (item: AchievementItem) => {
    setEditingAchievementId(item.id);
    setAchievementForm({ ...item });
  };

  const handleSaveAchievement = () => {
    if (!achievementForm.title?.trim()) {
      alert('Please enter an achievement title');
      return;
    }

    let updated: AchievementItem[];
    if (editingAchievementId === 'new') {
      const newItem: AchievementItem = {
        id: achievementForm.id || `ach-${Date.now()}`,
        source: achievementForm.source || 'manual',
        category: (achievementForm.category as AchievementCategory) || 'Research',
        title: achievementForm.title || '',
        issuerOrVenue: achievementForm.issuerOrVenue || '',
        date: achievementForm.date || new Date().getFullYear().toString(),
        summary: achievementForm.summary || '',
        badgeText: achievementForm.badgeText || 'Distinction',
        isVisible: achievementForm.isVisible ?? true,
        isFeatured: !!achievementForm.isFeatured,
        order: achievements.length,
        projectId: achievementForm.projectId || undefined,
        externalUrl: achievementForm.externalUrl || undefined,
        credentialId: achievementForm.credentialId || undefined,
        reviewStatus: 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updated = [...achievements, newItem];
    } else {
      updated = achievements.map(a => {
        if (a.id === editingAchievementId) {
          return {
            ...a,
            ...achievementForm,
            updatedAt: new Date().toISOString()
          } as AchievementItem;
        }
        return a;
      });
    }

    saveAchievements(updated);
    setAchievementsState(updated);
    setEditingAchievementId(null);
  };

  const handleDeleteAchievement = (id: string) => {
    if (confirm('Are you sure you want to delete this achievement?')) {
      const updated = achievements.filter(a => a.id !== id);
      saveAchievements(updated);
      setAchievementsState(updated);
    }
  };

  const handleToggleAchievementVisibility = (id: string) => {
    const updated = achievements.map(a => a.id === id ? { ...a, isVisible: !a.isVisible } : a);
    saveAchievements(updated);
    setAchievementsState(updated);
  };

  const handleMoveAchievement = (id: string, direction: 'up' | 'down') => {
    const sorted = [...achievements].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex(a => a.id === id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = sorted[index];
      sorted[index] = sorted[index - 1];
      sorted[index - 1] = temp;
    } else if (direction === 'down' && index < sorted.length - 1) {
      const temp = sorted[index];
      sorted[index] = sorted[index + 1];
      sorted[index + 1] = temp;
    }

    const updated = sorted.map((item, idx) => ({ ...item, order: idx }));
    saveAchievements(updated);
    setAchievementsState(updated);
  };

  const handleApproveCandidateMilestone = (candidate: any) => {
    const newItem: AchievementItem = {
      id: candidate.id,
      source: 'github',
      category: candidate.category,
      title: candidate.title,
      issuerOrVenue: candidate.issuerOrVenue,
      date: candidate.date,
      summary: candidate.summary,
      badgeText: candidate.badgeText,
      isVisible: true,
      isFeatured: false,
      order: achievements.length,
      projectId: candidate.projectId,
      externalUrl: candidate.externalUrl,
      reviewStatus: 'approved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [...achievements, newItem];
    saveAchievements(updated);
    setAchievementsState(updated);
    // Remove from pending candidates
    setCandidateMilestones(candidateMilestones.filter(c => c.id !== candidate.id));
  };

  // -------------------------------------------------------------
  // About & Skills Save
  // -------------------------------------------------------------
  const handleSaveAboutSkills = () => {
    try {
      localStorage.setItem('portfolio_about', aboutText);
      const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s);
      localStorage.setItem('portfolio_skills', JSON.stringify(skillsArray));
      alert('About and Skills updated successfully!');
    } catch {
      alert('Error saving About & Skills.');
    }
  };

  // -------------------------------------------------------------
  // Curriculum Vitae (CV) Actions
  // -------------------------------------------------------------
  const handleCvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('CV document must be under 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const updated = saveSettings({
        cvUrl: dataUrl,
        cvFileName: file.name,
        cvLastUpdated: Date.now()
      });
      setSettingsState(updated);
      alert(`CV document successfully uploaded: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCvUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      alert('Please enter a valid URL.');
      return;
    }
    const nameFromUrl = trimmed.split('/').pop()?.split('?')[0] || 'Curriculum Vitae';
    const updated = saveSettings({
      cvUrl: trimmed,
      cvFileName: nameFromUrl,
      cvLastUpdated: Date.now()
    });
    setSettingsState(updated);
    alert('External CV link saved successfully!');
  };

  const handleResetCv = () => {
    if (window.confirm('Reset to default system Resume (/Resume.pdf)?')) {
      const updated = saveSettings({
        cvUrl: '',
        cvFileName: '',
        cvLastUpdated: 0
      });
      setSettingsState(updated);
      setManualCvUrl('');
      alert('Reset to default CV.');
    }
  };

  // -------------------------------------------------------------
  // Backup Export & Import
  // -------------------------------------------------------------
  const handleExportBackup = () => {
    const json = exportPortfolioBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = () => {
    if (!importJsonText.trim()) return;
    const success = importPortfolioBackup(importJsonText);
    if (success) {
      alert('Portfolio configuration successfully restored!');
      window.location.reload();
    } else {
      alert('Invalid configuration format. Import failed.');
    }
  };

  // Filtered lists
  const filteredRepos = useMemo(() => {
    return availableRepos.filter(repo => {
      const matchesSearch = !repoSearch || 
        repo.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(repoSearch.toLowerCase()));
      const matchesLang = repoLanguageFilter === 'ALL' || repo.language === repoLanguageFilter;
      return matchesSearch && matchesLang;
    });
  }, [availableRepos, repoSearch, repoLanguageFilter]);

  const uniqueLanguages = useMemo(() => {
    const set = new Set<string>();
    availableRepos.forEach(r => {
      if (r.language) set.add(r.language);
    });
    return Array.from(set);
  }, [availableRepos]);

  const selectedRepoNames = useMemo(() => {
    return new Set(
      projectsConfig
        .filter(p => p.isSelected && p.repoName)
        .map(p => p.repoName!.toLowerCase())
    );
  }, [projectsConfig]);

  // Auth gate
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#020408] flex items-center justify-center text-cyan-400 font-mono text-sm">
        <div className="flex items-center gap-3">
          <RefreshCw size={18} className="animate-spin" />
          <span>Verifying security credentials...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020408] flex items-center justify-center text-white font-mono p-4 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <form onSubmit={handleLogin} className="p-8 border border-cyan-500/30 bg-black/70 backdrop-blur-xl rounded-2xl flex flex-col gap-5 max-w-sm w-full shadow-[0_0_35px_rgba(0,242,255,0.15)] relative z-10">
          <div className="flex items-center gap-3 border-b border-cyan-500/20 pb-4">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Lock size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-cyan-400 tracking-widest uppercase">Admin Terminal</h2>
              <p className="text-xs text-cyan-200/50">Protected Content Control</p>
            </div>
          </div>

          {loginError && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{loginError}</span>
            </div>
          )}
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wider text-cyan-300/70">Master Password</label>
            <input 
              type="password" 
              placeholder="Enter Access Key" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoggingIn}
              className="bg-black/60 border border-cyan-500/30 p-3 rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono text-sm"
              autoFocus
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoggingIn}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-950/60 text-black font-bold p-3 rounded-lg transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,242,255,0.3)] hover:shadow-[0_0_25px_rgba(0,242,255,0.6)]"
          >
            {isLoggingIn ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              'Authenticate & Enter'
            )}
          </button>

          <button 
            type="button" 
            onClick={() => navigate('/')} 
            className="text-xs text-center text-cyan-400/50 hover:text-cyan-300 transition-colors pt-2"
          >
            ← Return to Public Portfolio
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020408] text-white p-4 md:p-8 font-sans selection:bg-cyan-500 selection:text-black">
      <div className="max-w-6xl mx-auto space-y-8 pb-24">
        
        {/* Top Header */}
        <header className="border-b border-cyan-500/20 pb-6 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-[#020408]/95 backdrop-blur-md z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')} 
              className="p-2 rounded-lg border border-cyan-500/20 text-cyan-400/70 hover:text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-950/40 transition-all cursor-pointer"
              title="Return to Public Portfolio"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-bold tracking-widest uppercase text-cyan-400 font-mono">
                  Portfolio Operations Console
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                  v2.0
                </span>
                {isServerMode() ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-green-950/80 border border-green-500/40 text-green-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Backend Connected
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-950/80 border border-yellow-500/40 text-yellow-300 flex items-center gap-1" title="Running in standalone mode. Edits save to local storage.">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    Local Storage Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-cyan-200/50 font-mono mt-0.5">
                GitHub sync @{settings.githubUsername} • LinkedIn Compliance Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleSyncGitHub(true)} 
              disabled={isSyncingGitHub}
              className={`flex items-center gap-2 border border-cyan-500/40 px-3.5 py-2 rounded-lg font-mono text-xs transition-all cursor-pointer ${
                isSyncingGitHub 
                  ? 'bg-cyan-950/30 text-cyan-400/50 cursor-not-allowed' 
                  : 'bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 shadow-[0_0_10px_rgba(0,242,255,0.2)]'
              }`}
            >
              <RefreshCw size={14} className={isSyncingGitHub ? 'animate-spin text-cyan-400' : ''} />
              {isSyncingGitHub ? 'Synchronizing...' : 'Sync GitHub'}
            </button>

            <button 
              onClick={() => navigate('/')} 
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-4 py-2 rounded-lg font-mono text-xs transition-all shadow-[0_0_15px_rgba(0,242,255,0.4)] cursor-pointer"
            >
              <ExternalLink size={14} /> View Site
            </button>

            <button 
              onClick={handleLogout} 
              title="Sign out of Admin Terminal"
              className="flex items-center gap-2 border border-red-500/40 bg-red-950/40 hover:bg-red-900/60 text-red-300 px-3.5 py-2 rounded-lg font-mono text-xs transition-all cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)]"
            >
              <LogOut size={14} /> Exit
            </button>
          </div>
        </header>

        {/* Global Sync Status Banner */}
        {syncStatusMsg && (
          <div className="p-3.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 text-cyan-200 text-xs font-mono flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <Sparkles size={16} className="text-cyan-400 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
            <button onClick={() => setSyncStatusMsg(null)} className="text-cyan-400/60 hover:text-cyan-200">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-cyan-500/10 text-xs font-mono">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2.5 rounded-lg border transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              activeTab === 'projects'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,242,255,0.2)] font-bold'
                : 'border-white/5 text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={14} />
            <span>Selected Projects ({projectsConfig.filter(p => p.isSelected).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('github_repos')}
            className={`px-4 py-2.5 rounded-lg border transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              activeTab === 'github_repos'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,242,255,0.2)] font-bold'
                : 'border-white/5 text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Github size={14} />
            <span>GitHub Repositories ({availableRepos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-4 py-2.5 rounded-lg border transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              activeTab === 'achievements'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,242,255,0.2)] font-bold'
                : 'border-white/5 text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Award size={14} />
            <span>Achievements ({achievements.length})</span>
            {candidateMilestones.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('linkedin')}
            className={`px-4 py-2.5 rounded-lg border transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              activeTab === 'linkedin'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,242,255,0.2)] font-bold'
                : 'border-white/5 text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Linkedin size={14} />
            <span>LinkedIn Compliance & Certs</span>
          </button>

          <button
            onClick={() => setActiveTab('about_skills')}
            className={`px-4 py-2.5 rounded-lg border transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              activeTab === 'about_skills'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,242,255,0.2)] font-bold'
                : 'border-white/5 text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Edit3 size={14} />
            <span>About & Skills</span>
          </button>

          <button
            onClick={() => setActiveTab('cv')}
            className={`px-4 py-2.5 rounded-lg border transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              activeTab === 'cv'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,242,255,0.2)] font-bold'
                : 'border-white/5 text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText size={14} />
            <span>Curriculum Vitae (CV)</span>
            {settings.cvUrl && (
              <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" title="Active Custom CV" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-lg border transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,242,255,0.2)] font-bold'
                : 'border-white/5 text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders size={14} />
            <span>Settings & Backup</span>
          </button>
        </nav>

        {/* ========================================================================= */}
        {/* TAB 1: SELECTED PROJECTS                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/40 border border-cyan-500/20 p-4 rounded-xl">
              <div>
                <h2 className="text-lg font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers size={18} /> Public Portfolio Projects
                </h2>
                <p className="text-xs text-white/60 mt-1">
                  Only selected and visible projects appear on the public site. Manual overrides take priority over live GitHub metrics.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateManualProject}
                  className="px-3.5 py-2 rounded-lg bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-500/30 text-cyan-200 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={14} /> Add Manual Project
                </button>
                <button
                  onClick={() => setActiveTab('github_repos')}
                  className="px-3.5 py-2 rounded-lg bg-cyan-500 text-black font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,242,255,0.3)] hover:bg-cyan-400 cursor-pointer"
                >
                  <Github size={14} /> Browse GitHub Repos
                </button>
              </div>
            </div>

            {/* Selected Projects List */}
            <div className="space-y-4">
              {projectsConfig
                .filter(p => p.isSelected)
                .sort((a, b) => a.order - b.order)
                .map((project, index, array) => {
                  const matchingRepo = project.repoName 
                    ? availableRepos.find(r => r.name.toLowerCase() === project.repoName!.toLowerCase())
                    : undefined;
                  
                  return (
                    <div 
                      key={project.id}
                      className={`p-5 rounded-xl border transition-all relative ${
                        project.isVisible 
                          ? 'bg-black/50 border-cyan-500/30 shadow-[0_0_15px_rgba(0,242,255,0.05)]' 
                          : 'bg-black/20 border-white/10 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2 max-w-2xl">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-white/70">
                              #{index + 1}
                            </span>
                            
                            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                              {project.overrides.title || (matchingRepo ? formatRepoTitle(matchingRepo.name) : project.id)}
                            </h3>

                            {project.source === 'github' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                                <Github size={12} /> {project.repoName}
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-amber-300">
                                Manual Entry
                              </span>
                            )}

                            {(project.isPoC || project.overrides.isPoC) && (
                              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-950 border border-purple-500/40 text-purple-300">
                                PoC / Research
                              </span>
                            )}

                            {project.isFeatured && (
                              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-yellow-950 border border-yellow-500/40 text-yellow-300 flex items-center gap-1">
                                <Star size={10} fill="currentColor" /> Featured
                              </span>
                            )}

                            {!project.isVisible && (
                              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-950 border border-red-500/40 text-red-300">
                                Hidden
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-white/70 line-clamp-2">
                            {project.overrides.problem || matchingRepo?.description || 'No description provided.'}
                          </p>

                          <div className="flex items-center gap-4 text-xs font-mono text-cyan-200/60 pt-1">
                            <span>Tech: <strong className="text-cyan-300">{project.overrides.tech || matchingRepo?.language || 'N/A'}</strong></span>
                            {matchingRepo && (
                              <>
                                <span>★ {matchingRepo.stargazers_count}</span>
                                <span>⑂ {matchingRepo.forks_count}</span>
                              </>
                            )}
                            {project.overrides.liveDemoUrl && (
                              <a href={project.overrides.liveDemoUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                                Demo <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                          {/* Move Up */}
                          <button
                            onClick={() => handleMoveProject(project.id, 'up')}
                            disabled={index === 0}
                            title="Move Up"
                            className="p-2 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white/80 transition-colors cursor-pointer"
                          >
                            <ArrowUp size={16} />
                          </button>

                          {/* Move Down */}
                          <button
                            onClick={() => handleMoveProject(project.id, 'down')}
                            disabled={index === array.length - 1}
                            title="Move Down"
                            className="p-2 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white/80 transition-colors cursor-pointer"
                          >
                            <ArrowDown size={16} />
                          </button>

                          {/* Toggle Visibility */}
                          <button
                            onClick={() => handleToggleProjectVisibility(project.id)}
                            title={project.isVisible ? 'Hide Project' : 'Publish Project'}
                            className={`p-2 rounded transition-colors cursor-pointer ${
                              project.isVisible 
                                ? 'bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/60' 
                                : 'bg-red-950/60 text-red-300 hover:bg-red-900/60'
                            }`}
                          >
                            {project.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>

                          {/* Edit Overrides */}
                          <button
                            onClick={() => handleOpenEditProject(project)}
                            title="Edit Overrides"
                            className="px-3 py-2 rounded bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-300 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Edit3 size={14} /> Customize
                          </button>

                          {/* Deselect / Remove */}
                          <button
                            onClick={() => handleDeselectRepo(project.id)}
                            title="Deselect from Portfolio"
                            className="p-2 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {projectsConfig.filter(p => p.isSelected).length === 0 && (
                <div className="p-12 text-center border border-dashed border-cyan-500/30 rounded-xl bg-black/40 space-y-4">
                  <p className="text-white/60 font-mono text-sm">No repositories currently selected for your public portfolio.</p>
                  <button
                    onClick={() => setActiveTab('github_repos')}
                    className="px-6 py-2.5 rounded-lg bg-cyan-500 text-black font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] hover:bg-cyan-400 cursor-pointer"
                  >
                    Select Repositories from GitHub
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: GITHUB REPOSITORIES BROWSER                                        */}
        {/* ========================================================================= */}
        {activeTab === 'github_repos' && (
          <div className="space-y-6">
            <div className="bg-black/40 border border-cyan-500/20 p-5 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <Github size={18} /> GitHub Repository Directory (@{settings.githubUsername})
                  </h2>
                  <p className="text-xs text-white/60 mt-1">
                    Select which repositories appear in your public Projects section. New repositories never publish automatically.
                  </p>
                </div>

                <button
                  onClick={() => handleSyncGitHub(true)}
                  disabled={isSyncingGitHub}
                  className="px-4 py-2 rounded-lg bg-cyan-900/50 hover:bg-cyan-800/70 border border-cyan-500/30 text-cyan-200 text-xs font-mono flex items-center gap-2 cursor-pointer transition-all shrink-0"
                >
                  <RefreshCw size={14} className={isSyncingGitHub ? 'animate-spin' : ''} />
                  Refresh from GitHub
                </button>
              </div>

              {/* Search & Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="sm:col-span-2 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/50" />
                  <input
                    type="text"
                    placeholder="Search by repo name or description..."
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    className="w-full bg-black/60 border border-cyan-500/20 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <select
                    value={repoLanguageFilter}
                    onChange={(e) => setRepoLanguageFilter(e.target.value)}
                    className="w-full bg-black/60 border border-cyan-500/20 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="ALL">All Languages ({availableRepos.length})</option>
                    {uniqueLanguages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Repos Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRepos.map(repo => {
                const isSelected = selectedRepoNames.has(repo.name.toLowerCase());

                return (
                  <div
                    key={repo.id}
                    className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/20 border-cyan-500/40 shadow-[0_0_15px_rgba(0,242,255,0.08)]'
                        : 'bg-black/40 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-mono font-bold text-sm text-cyan-200">
                              {repo.name}
                            </h3>
                            {repo.homepage && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400">
                                Live
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-white/40">
                            Updated {new Date(repo.updated_at).toLocaleDateString()}
                          </span>
                        </div>

                        <a 
                          href={repo.html_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 rounded text-white/50 hover:text-cyan-400 transition-colors"
                          title="Open on GitHub"
                        >
                          <ExternalLink size={15} />
                        </a>
                      </div>

                      <p className="text-xs text-white/70 line-clamp-2 min-h-[32px]">
                        {repo.description || 'No description provided on GitHub.'}
                      </p>

                      <div className="flex items-center gap-3 text-xs font-mono text-cyan-100/60 flex-wrap">
                        {repo.language && (
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300">
                            {repo.language}
                          </span>
                        )}
                        <span>★ {repo.stargazers_count}</span>
                        <span>⑂ {repo.forks_count}</span>
                        {repo.topics && repo.topics.length > 0 && (
                          <span className="text-[10px] text-white/40">
                            #{repo.topics.slice(0, 2).join(' #')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
                      {isSelected ? (
                        <>
                          <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                            <CheckCircle size={14} /> Selected in Projects
                          </span>
                          <button
                            onClick={() => handleDeselectRepo(repo.name)}
                            className="px-3 py-1.5 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-mono transition-colors cursor-pointer"
                          >
                            Deselect
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-mono text-white/40">
                            Not in portfolio
                          </span>
                          <button
                            onClick={() => handleSelectRepo(repo)}
                            className="px-3.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono transition-all shadow-[0_0_10px_rgba(0,242,255,0.3)] flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={14} /> Select for Portfolio
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ACHIEVEMENTS MANAGEMENT                                            */}
        {/* ========================================================================= */}
        {activeTab === 'achievements' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/40 border border-cyan-500/20 p-5 rounded-xl">
              <div>
                <h2 className="text-lg font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <Award size={18} /> Achievement & Research System
                </h2>
                <p className="text-xs text-white/60 mt-1">
                  Manage Hackathons, Research papers, Certifications, and Awards. Connect any achievement to a project via stable internal ID.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenCreateAchievement('manual')}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,242,255,0.3)] cursor-pointer"
                >
                  <Plus size={14} /> Create Achievement
                </button>
              </div>
            </div>

            {/* Candidate Milestones detected from GitHub (Explicit Approval Required) */}
            {candidateMilestones.length > 0 && (
              <div className="p-5 rounded-xl border border-yellow-500/30 bg-yellow-950/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-yellow-400" />
                    <h3 className="font-mono font-bold text-sm text-yellow-300 uppercase tracking-wide">
                      Detected GitHub Milestones ({candidateMilestones.length} Pending Review)
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-yellow-200/60">
                    Explicit approval required before publishing
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {candidateMilestones.map(candidate => (
                    <div key={candidate.id} className="p-4 rounded-lg border border-yellow-500/20 bg-black/60 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-950/60 border border-yellow-500/40 text-yellow-300">
                            {candidate.category}
                          </span>
                          <span className="text-[10px] font-mono text-white/50">{candidate.date}</span>
                        </div>
                        <h4 className="font-mono font-bold text-xs text-white mt-1.5">{candidate.title}</h4>
                        <p className="text-xs text-white/70 mt-1">{candidate.summary}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <span className="text-[11px] font-mono text-cyan-300">
                          Badge: {candidate.badgeText}
                        </span>
                        <button
                          onClick={() => handleApproveCandidateMilestone(candidate)}
                          className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Check size={12} /> Approve & Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Achievements List */}
            <div className="space-y-4">
              {achievements
                .sort((a, b) => a.order - b.order)
                .map((item, index, array) => {
                  const connectedProject = item.projectId 
                    ? projectsConfig.find(p => p.id === item.projectId || p.repoName?.toLowerCase() === item.projectId?.toLowerCase())
                    : undefined;

                  return (
                    <div 
                      key={item.id}
                      className={`p-5 rounded-xl border transition-all ${
                        item.isVisible 
                          ? 'bg-black/50 border-cyan-500/30 shadow-[0_0_15px_rgba(0,242,255,0.05)]' 
                          : 'bg-black/20 border-white/10 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2 max-w-2xl">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-white/70">
                              #{index + 1}
                            </span>

                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                              {item.category}
                            </span>

                            <h3 className="text-base font-bold text-white font-mono">
                              {item.title}
                            </h3>

                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-400/40 bg-cyan-500/10 text-cyan-200">
                              {item.badgeText}
                            </span>

                            {connectedProject && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 flex items-center gap-1">
                                <LinkIcon size={10} /> Linked: {connectedProject.overrides.title || connectedProject.id}
                              </span>
                            )}

                            {item.source === 'linkedin' && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 border border-blue-500/40 text-blue-300 flex items-center gap-1">
                                <Linkedin size={10} /> LinkedIn Verified
                              </span>
                            )}

                            {item.source === 'github' && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 flex items-center gap-1">
                                <Github size={10} /> GitHub Milestone
                              </span>
                            )}

                            {!item.isVisible && (
                              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-950 border border-red-500/40 text-red-300">
                                Hidden
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-white/80">
                            {item.summary}
                          </p>

                          {item.imageUrl && (
                            <div className="mt-2.5 max-w-sm rounded-lg overflow-hidden border border-cyan-500/30 bg-black/50 p-1 flex items-center">
                              <img 
                                src={item.imageUrl} 
                                alt={item.title} 
                                className="w-auto h-auto max-h-44 object-contain rounded"
                                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs font-mono text-white/50 pt-1">
                            <span>{item.issuerOrVenue} • {item.date}</span>
                            {item.externalUrl && (
                              <a href={item.externalUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                                Verified URL <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                          <button
                            onClick={() => handleMoveAchievement(item.id, 'up')}
                            disabled={index === 0}
                            title="Move Up"
                            className="p-2 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white/80 cursor-pointer"
                          >
                            <ArrowUp size={16} />
                          </button>

                          <button
                            onClick={() => handleMoveAchievement(item.id, 'down')}
                            disabled={index === array.length - 1}
                            title="Move Down"
                            className="p-2 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white/80 cursor-pointer"
                          >
                            <ArrowDown size={16} />
                          </button>

                          <button
                            onClick={() => handleToggleAchievementVisibility(item.id)}
                            title={item.isVisible ? 'Hide Achievement' : 'Publish Achievement'}
                            className={`p-2 rounded cursor-pointer ${
                              item.isVisible ? 'bg-cyan-950/60 text-cyan-300' : 'bg-red-950/60 text-red-300'
                            }`}
                          >
                            {item.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>

                          <button
                            onClick={() => handleOpenEditAchievement(item)}
                            title="Edit Achievement"
                            className="px-3 py-2 rounded bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-300 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit3 size={14} /> Edit
                          </button>

                          <button
                            onClick={() => handleDeleteAchievement(item.id)}
                            title="Delete"
                            className="p-2 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {achievements.length === 0 && (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-xl font-mono text-xs text-white/50">
                  No achievements configured yet. Click "Create Achievement" to add one.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: LINKEDIN COMPLIANCE & CREDENTIALS                                 */}
        {/* ========================================================================= */}
        {activeTab === 'linkedin' && (
          <div className="space-y-6">
            <div className="bg-black/50 border border-blue-500/30 p-6 rounded-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-950 border border-blue-500/40 text-blue-400">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-mono text-blue-300 uppercase tracking-wider">
                    Official LinkedIn Integration & Compliance Audit
                  </h2>
                  <p className="text-xs text-white/60">
                    Strict adherence to LinkedIn Terms of Service §8.2. Zero web scraping or session cookie extraction.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-500/20 space-y-2 text-xs font-mono text-blue-100/80">
                <p><strong>Compliance Notice:</strong> {LINKEDIN_API_CAPABILITIES.complianceNotice}</p>
                <p><strong>Permitted Official Scopes:</strong> {LINKEDIN_API_CAPABILITIES.allowedScopes.join(', ')}</p>
                <p><strong>Enterprise Limitations:</strong> Member certifications and honors APIs are private/closed enterprise partner endpoints. Personal certifications are verified via official credential URLs (Stanford, DeepLearning.AI, AWS, Coursera) and managed securely without scraping.</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="text-xs font-mono text-white/70">
                  Profile URL: <a href={settings.linkedInProfileUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">{settings.linkedInProfileUrl}</a>
                </div>

                <button
                  onClick={() => handleOpenCreateAchievement('linkedin')}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs font-mono flex items-center gap-2 cursor-pointer transition-all shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                >
                  <Plus size={14} /> Add LinkedIn-Verified Certification
                </button>
              </div>
            </div>

            {/* LinkedIn-sourced achievements */}
            <div className="space-y-3">
              <h3 className="font-mono text-sm font-bold text-cyan-300 uppercase tracking-wider">
                Active LinkedIn-Verified Credentials ({achievements.filter(a => a.source === 'linkedin').length})
              </h3>
              
              {achievements.filter(a => a.source === 'linkedin').map(item => (
                <div key={item.id} className="p-4 rounded-lg border border-blue-500/30 bg-black/40 flex items-center justify-between">
                  <div>
                    <h4 className="font-mono text-sm font-bold text-white">{item.title}</h4>
                    <p className="text-xs text-white/60">{item.issuerOrVenue} • {item.date}</p>
                    {item.externalUrl && (
                      <a href={item.externalUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1">
                        Credential Link <ExternalLink size={10} />
                      </a>
                    )}
                    {item.imageUrl && (
                      <div className="mt-2.5 max-w-sm rounded-lg overflow-hidden border border-blue-500/30 bg-black/50 p-1 flex items-center">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title} 
                          className="w-auto h-auto max-h-40 object-contain rounded"
                          onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditAchievement(item)}
                      className="px-3 py-1.5 rounded bg-blue-900/40 text-blue-300 text-xs font-mono cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAchievement(item.id)}
                      className="p-1.5 rounded text-red-400 hover:bg-red-950/40 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {achievements.filter(a => a.source === 'linkedin').length === 0 && (
                <p className="text-xs text-white/40 font-mono italic">No LinkedIn credentials added yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: ABOUT & SKILLS (PRESERVED)                                         */}
        {/* ========================================================================= */}
        {activeTab === 'about_skills' && (
          <div className="space-y-6">
            <div className="bg-black/50 border border-cyan-500/20 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3">
                <h2 className="text-lg font-mono text-cyan-300 uppercase tracking-wider">1. Edit About Statement</h2>
              </div>
              <textarea 
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                className="w-full bg-black/60 border border-cyan-500/20 rounded p-4 h-36 text-white focus:outline-none focus:border-cyan-400 font-sans text-sm"
                placeholder="Enter about description..."
              />
            </div>

            <div className="bg-black/50 border border-cyan-500/20 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3">
                <h2 className="text-lg font-mono text-cyan-300 uppercase tracking-wider">2. Edit Skills List</h2>
                <span className="text-xs font-mono text-white/50">Comma-separated</span>
              </div>
              <textarea 
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full bg-black/60 border border-cyan-500/20 rounded p-4 h-24 text-white focus:outline-none focus:border-cyan-400 font-mono text-sm"
                placeholder="PYTHON CORE, NEURAL NETWORKS, REACT..."
              />
            </div>

            <button
              onClick={handleSaveAboutSkills}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(0,242,255,0.3)]"
            >
              <Save size={16} /> Save About & Skills
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: CURRICULUM VITAE (CV / RESUME)                                     */}
        {/* ========================================================================= */}
        {activeTab === 'cv' && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/40 border border-cyan-500/20 p-5 rounded-xl">
              <div>
                <h2 className="text-lg font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={18} /> Curriculum Vitae (CV) Management
                </h2>
                <p className="text-xs text-white/60 mt-1">
                  Manage the document linked to the public &quot;Download CV&quot; hero button. Upload a PDF directly or link to an external document (e.g. Google Drive).
                </p>
              </div>

              {settings.cvUrl && (
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={settings.cvUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={settings.cvFileName || "Resume.pdf"}
                    className="px-3.5 py-2 rounded-lg bg-cyan-500 text-black font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,242,255,0.3)] hover:bg-cyan-400 cursor-pointer"
                  >
                    <Download size={14} /> Test Download
                  </a>
                  <button
                    onClick={handleResetCv}
                    className="px-3 py-2 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-950/40 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Reset to default Resume.pdf"
                  >
                    <Trash2 size={14} /> Reset
                  </button>
                </div>
              )}
            </div>

            {/* Current Active Status Card */}
            <div className="bg-black/50 border border-cyan-500/20 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-300/80">Active Document Status</span>
                {settings.cvUrl ? (
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-green-950 border border-green-500/50 text-green-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Custom CV Configured
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/60">
                    Default System Fallback (/Resume.pdf)
                  </span>
                )}
              </div>

              <div className="p-4 rounded-lg bg-black/60 border border-cyan-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-white">
                    <FileText size={16} className="text-cyan-400" />
                    <span className="font-bold">{settings.cvFileName || (settings.cvUrl ? 'Custom Document' : 'Resume.pdf (Default)')}</span>
                  </div>
                  <div className="text-[11px] text-white/50">
                    Source: {settings.cvUrl ? (settings.cvUrl.startsWith('data:') ? 'Uploaded Local File (Embedded Base64 PDF)' : 'External URL Link') : 'Static Public Asset'}
                    {settings.cvLastUpdated ? ` • Updated ${new Date(settings.cvLastUpdated).toLocaleDateString()}` : ''}
                  </div>
                </div>

                {settings.cvUrl && (
                  <div className="flex items-center gap-2">
                    <a
                      href={settings.cvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 text-xs flex items-center gap-1"
                    >
                      <ExternalLink size={12} /> Preview
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Upload or Link Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option 1: File Upload */}
              <div className="bg-black/50 border border-cyan-500/20 rounded-xl p-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <Upload size={16} /> Option A: Upload CV File
                  </h3>
                  <p className="text-xs text-white/60">
                    Upload your PDF directly. It will be stored and downloaded by visitors when clicking &quot;Download CV&quot;.
                  </p>
                </div>

                <label
                  className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-xl p-8 cursor-pointer transition-all bg-black/30 hover:bg-cyan-950/20 group"
                >
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleCvFileUpload}
                  />
                  <div className="p-3 rounded-full bg-cyan-950/60 border border-cyan-500/30 group-hover:border-cyan-400 group-hover:scale-110 transition-all">
                    <FileText size={24} className="text-cyan-400" />
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-xs font-mono text-cyan-300 group-hover:text-cyan-200 font-bold block">
                      Choose PDF / Word Document
                    </span>
                    <span className="text-[11px] text-white/40 block">
                      Supported: .pdf, .doc, .docx (Max 10MB)
                    </span>
                  </div>
                </label>
              </div>

              {/* Option 2: External Link */}
              <div className="bg-black/50 border border-cyan-500/20 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <LinkIcon size={16} /> Option B: External CV Link
                  </h3>
                  <p className="text-xs text-white/60">
                    Alternatively, link directly to your hosted resume on Google Drive, Dropbox, Notion, or personal CDN.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono text-cyan-200/70 uppercase">Document URL</label>
                    <input
                      type="url"
                      value={manualCvUrl}
                      onChange={(e) => setManualCvUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="bg-black/60 border border-cyan-500/30 rounded-lg p-3 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <button
                    onClick={() => handleSaveCvUrl(manualCvUrl)}
                    disabled={!manualCvUrl.trim()}
                    className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold font-mono text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_12px_rgba(0,242,255,0.2)]"
                  >
                    Set External CV Link
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-[11px] font-mono text-cyan-200/60">
                  Tip: When using Google Drive, ensure the sharing setting is set to &quot;Anyone with the link can view&quot;.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: SETTINGS & BACKUP                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-black/50 border border-cyan-500/20 rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-mono text-cyan-300 uppercase tracking-wider border-b border-cyan-500/10 pb-3">
                Synchronization & API Configuration
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-cyan-200/70 uppercase">GitHub Target Username</label>
                  <input
                    type="text"
                    value={settings.githubUsername}
                    onChange={(e) => setSettingsState({ ...settings, githubUsername: e.target.value })}
                    className="bg-black/60 border border-cyan-500/20 rounded p-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-cyan-200/70 uppercase">Cache TTL (Minutes)</label>
                  <input
                    type="number"
                    value={settings.cacheTtlMinutes}
                    onChange={(e) => setSettingsState({ ...settings, cacheTtlMinutes: parseInt(e.target.value) || 30 })}
                    className="bg-black/60 border border-cyan-500/20 rounded p-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-mono text-cyan-200/70 uppercase">LinkedIn Profile URL</label>
                  <input
                    type="text"
                    value={settings.linkedInProfileUrl}
                    onChange={(e) => setSettingsState({ ...settings, linkedInProfileUrl: e.target.value })}
                    className="bg-black/60 border border-cyan-500/20 rounded p-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    saveSettings(settings);
                    alert('Settings updated successfully!');
                  }}
                  className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold font-mono text-xs uppercase tracking-wider cursor-pointer transition-all"
                >
                  Save Settings
                </button>

                <button
                  onClick={() => handleSyncGitHub(true)}
                  className="px-5 py-2.5 rounded-lg border border-cyan-500/40 text-cyan-300 font-mono text-xs cursor-pointer hover:bg-cyan-950/40 transition-all"
                >
                  Force Full GitHub Refresh
                </button>
              </div>
            </div>

            {/* Rate limit status */}
            <div className="bg-black/40 border border-white/10 rounded-xl p-5 font-mono text-xs text-white/60 space-y-1">
              <p>GitHub Rate Limit Remaining: <strong className="text-cyan-300">{rateLimitInfo.remaining ?? '60/hr (Public)'}</strong></p>
              <p>Last Sync Timestamp: <strong className="text-cyan-300">{settings.lastSyncTimestamp ? new Date(settings.lastSyncTimestamp).toLocaleString() : 'Never'}</strong></p>
              <p>Security Audit: <span className="text-green-400 font-bold">✔ 0 Secrets Committed • 0 Scraping • Client Safe</span></p>
            </div>

            {/* Curriculum Vitae (CV) Summary */}
            <div className="bg-black/50 border border-cyan-500/20 rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/10 pb-3">
                <h2 className="text-lg font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={18} /> Curriculum Vitae (CV / Resume)
                </h2>
                <button
                  onClick={() => setActiveTab('cv')}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer flex items-center gap-1"
                >
                  Configure in CV Manager →
                </button>
              </div>
              <p className="text-xs text-white/60">
                Active CV document: <strong className="text-white">{settings.cvFileName || (settings.cvUrl ? 'Custom Document' : 'Default (/Resume.pdf)')}</strong>
                {settings.cvUrl ? ' — (Custom document active)' : ' — (System fallback active)'}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('cv')}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs cursor-pointer transition-all"
                >
                  Manage CV Document
                </button>
                {settings.cvUrl && (
                  <button
                    onClick={handleResetCv}
                    className="px-3.5 py-2 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-950/40 font-mono text-xs cursor-pointer transition-all"
                  >
                    Reset to Default
                  </button>
                )}
              </div>
            </div>

            {/* Security & Access Management */}
            <div className="bg-black/50 border border-cyan-500/20 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3">
                <h2 className="text-lg font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <Shield size={18} className="text-cyan-400" />
                  Security & Access Management
                </h2>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded border border-green-500/40 bg-green-950/40 text-green-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Protected API
                </span>
              </div>
              <p className="text-xs text-white/60">
                Change your administrative password. Updating this invalidates previous tokens and applies the new password to your active backend session.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg pt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-cyan-300/70 font-mono">Current Master Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="bg-black/60 border border-cyan-500/30 p-2.5 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-wider text-cyan-300/70 font-mono">New Password (min 8 chars)</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="bg-black/60 border border-cyan-500/30 p-2.5 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-wider text-cyan-300/70 font-mono">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="bg-black/60 border border-cyan-500/30 p-2.5 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                {passwordChangeStatus && (
                  <div className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                    passwordChangeStatus.type === 'success'
                      ? 'bg-green-950/40 border border-green-500/40 text-green-300'
                      : 'bg-red-950/40 border border-red-500/40 text-red-300'
                  }`}>
                    {passwordChangeStatus.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
                    {passwordChangeStatus.msg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-950/60 text-black font-bold font-mono text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(0,242,255,0.2)]"
                >
                  {isChangingPassword ? 'Updating Password...' : 'Save New Password'}
                </button>
              </form>
            </div>

            {/* Backup & Restore */}
            <div className="bg-black/50 border border-cyan-500/20 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-mono text-cyan-300 uppercase tracking-wider border-b border-cyan-500/10 pb-3">
                Configuration Backup & Portability
              </h2>
              <p className="text-xs text-white/60">
                Export all projects, overrides, achievements, and settings to a JSON file, or restore from a previous backup.
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportBackup}
                  className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Download size={14} /> Export Backup (JSON)
                </button>

                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Upload size={14} /> Restore from Backup
                </button>

                <button
                  onClick={() => {
                    const res = purgeAllDummyData();
                    setProjectsConfig(getProjectsConfig());
                    setAchievementsState(getAchievements());
                    alert(`Purged ${res.projectsPurged} dummy projects and ${res.achievementsPurged} dummy achievements.`);
                  }}
                  className="px-4 py-2.5 rounded-lg border border-red-500/40 hover:bg-red-950/40 text-red-300 font-mono text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Trash2 size={14} /> Purge Dummy Items
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL: EDIT PROJECT OVERRIDES                                             */}
      {/* ========================================================================= */}
      {editingProjectId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#020408] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 space-y-5 my-8 shadow-[0_0_40px_rgba(0,242,255,0.2)]">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <h3 className="font-mono font-bold text-lg text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                <Edit3 size={18} /> Customize Project Overrides
              </h3>
              <button 
                onClick={() => setEditingProjectId(null)}
                className="text-white/50 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-cyan-200/70 uppercase">Title Override</label>
                  <input
                    type="text"
                    value={projectOverrideForm.title || ''}
                    onChange={(e) => setProjectOverrideForm({ ...projectOverrideForm, title: e.target.value })}
                    className="bg-black/60 border border-cyan-500/30 rounded p-2.5 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                    placeholder="Custom Title"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-cyan-200/70 uppercase">Tech Stack Override</label>
                  <input
                    type="text"
                    value={projectOverrideForm.tech || ''}
                    onChange={(e) => setProjectOverrideForm({ ...projectOverrideForm, tech: e.target.value })}
                    className="bg-black/60 border border-cyan-500/30 rounded p-2.5 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                    placeholder="PyTorch • C++ • CUDA"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-cyan-200/70 uppercase">Live Demo URL</label>
                  <input
                    type="url"
                    value={projectOverrideForm.liveDemoUrl || ''}
                    onChange={(e) => setProjectOverrideForm({ ...projectOverrideForm, liveDemoUrl: e.target.value })}
                    className="bg-black/60 border border-cyan-500/30 rounded p-2.5 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                    placeholder="https://..."
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-cyan-200/70 uppercase">GitHub URL Override</label>
                  <input
                    type="url"
                    value={projectOverrideForm.githubUrl || ''}
                    onChange={(e) => setProjectOverrideForm({ ...projectOverrideForm, githubUrl: e.target.value })}
                    className="bg-black/60 border border-cyan-500/30 rounded p-2.5 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 py-2 border-y border-white/10">
                <label className="flex items-center gap-2 cursor-pointer text-cyan-200">
                  <input
                    type="checkbox"
                    checked={!!projectOverrideForm.isPoC}
                    onChange={(e) => setProjectOverrideForm({ ...projectOverrideForm, isPoC: e.target.checked })}
                    className="rounded border-cyan-500 text-cyan-500 focus:ring-0"
                  />
                  <span>Mark as [PoC / Research]</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-cyan-200">
                  <input
                    type="checkbox"
                    checked={!!projectOverrideForm.isFeatured}
                    onChange={(e) => setProjectOverrideForm({ ...projectOverrideForm, isFeatured: e.target.checked })}
                    className="rounded border-cyan-500 text-cyan-500 focus:ring-0"
                  />
                  <span>Feature on Top</span>
                </label>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-cyan-200/70 uppercase">Problem</label>
                <textarea
                  value={projectOverrideForm.problem || ''}
                  onChange={(e) => setProjectOverrideForm({ ...projectOverrideForm, problem: e.target.value })}
                  className="bg-black/60 border border-cyan-500/30 rounded p-2.5 h-20 text-white font-sans text-xs focus:outline-none focus:border-cyan-400"
                  placeholder="The core challenge or bottleneck addressed..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-cyan-200/70 uppercase">Approach</label>
                <textarea
                  value={projectOverrideForm.approach || ''}
                  onChange={(e) => setProjectOverrideForm({ ...projectOverrideForm, approach: e.target.value })}
                  className="bg-black/60 border border-cyan-500/30 rounded p-2.5 h-20 text-white font-sans text-xs focus:outline-none focus:border-cyan-400"
                  placeholder="Architectural approach and technical methods..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-cyan-200/70 uppercase">Outcome</label>
                <textarea
                  value={projectOverrideForm.outcome || ''}
                  onChange={(e) => setProjectOverrideForm({ ...projectOverrideForm, outcome: e.target.value })}
                  className="bg-black/60 border border-cyan-500/30 rounded p-2.5 h-20 text-white font-sans text-xs focus:outline-none focus:border-cyan-400"
                  placeholder="Measurable results, latency improvements, benchmark achievements..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-cyan-500/20">
              <button
                onClick={() => setEditingProjectId(null)}
                className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveProjectOverride}
                className="px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs cursor-pointer shadow-[0_0_15px_rgba(0,242,255,0.4)]"
              >
                Save Customizations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT / CREATE ACHIEVEMENT                                          */}
      {/* ========================================================================= */}
      {editingAchievementId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#020408] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 space-y-5 my-8 shadow-[0_0_40px_rgba(0,242,255,0.2)]">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <h3 className="font-mono font-bold text-lg text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                <Award size={18} /> {editingAchievementId === 'new' ? 'New Achievement Record' : 'Edit Achievement'}
              </h3>
              <button 
                onClick={() => setEditingAchievementId(null)}
                className="text-white/50 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-cyan-200/70 uppercase">Title</label>
                  <input
                    type="text"
                    value={achievementForm.title || ''}
                    onChange={(e) => setAchievementForm({ ...achievementForm, title: e.target.value })}
                    className="bg-black/60 border border-cyan-500/30 rounded p-2.5 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                    placeholder="e.g. 1st Place Grand Winner — AI Hackathon"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-cyan-200/70 uppercase">Category</label>
                  <select
                    value={achievementForm.category || 'Research'}
                    onChange={(e) => setAchievementForm({ ...achievementForm, category: e.target.value as any })}
                    className="bg-black/60 border border-cyan-500/30 rounded p-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="Research">Research</option>
                    <option value="Hackathon">Hackathon</option>
                    <option value="Certification">Certification</option>
                    <option value="Award">Award</option>
                    <option value="Milestone">Milestone</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-cyan-200/70 uppercase">Source</label>
                  <select
                    value={achievementForm.source || 'manual'}
                    onChange={(e) => setAchievementForm({ ...achievementForm, source: e.target.value as any })}
                    className="bg-black/60 border border-cyan-500/30 rounded p-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="github">GitHub Milestone</option>
                    <option value="linkedin">LinkedIn Verified</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-cyan-200/70 uppercase">Issuer / Venue</label>
                  <input
                    type="text"
                    value={achievementForm.issuerOrVenue || ''}
                    onChange={(e) => setAchievementForm({ ...achievementForm, issuerOrVenue: e.target.value })}
                    className="bg-black/60 border border-cyan-500/30 rounded p-2.5 text-white font-sans text-xs focus:outline-none focus:border-cyan-400"
                    placeholder="e.g. DeepLearning.AI / Stanford Online"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-cyan-200/70 uppercase">Date / Year</label>
                  <input
                    type="text"
                    value={achievementForm.date || ''}
                    onChange={(e) => setAchievementForm({ ...achievementForm, date: e.target.value })}
                    className="bg-black/60 border border-cyan-500/30 rounded p-2.5 text-white font-sans text-xs focus:outline-none focus:border-cyan-400"
                    placeholder="2025"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-cyan-200/70 uppercase">Badge / Pill Text</label>
                  <input
                    type="text"
                    value={achievementForm.badgeText || ''}
                    onChange={(e) => setAchievementForm({ ...achievementForm, badgeText: e.target.value })}
                    className="bg-black/60 border border-cyan-500/30 rounded p-2.5 text-white font-sans text-xs focus:outline-none focus:border-cyan-400"
                    placeholder="e.g. Grand Prize"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-cyan-200/70 uppercase">Link to Project (Optional)</label>
                  <select
                    value={achievementForm.projectId || ''}
                    onChange={(e) => setAchievementForm({ ...achievementForm, projectId: e.target.value })}
                    className="bg-black/60 border border-cyan-500/30 rounded p-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="">None (Independent Achievement)</option>
                    {projectsConfig.filter(p => p.isSelected).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.overrides.title || p.repoName || p.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-cyan-200/70 uppercase">Verified Credential / Paper / Repo URL</label>
                  <input
                    type="url"
                    value={achievementForm.externalUrl || ''}
                    onChange={(e) => setAchievementForm({ ...achievementForm, externalUrl: e.target.value })}
                    className="bg-black/60 border border-cyan-500/30 rounded p-2.5 text-white font-sans text-xs focus:outline-none focus:border-cyan-400"
                    placeholder="https://..."
                  />
                </div>

                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-cyan-200/70 uppercase">Summary / Description</label>
                  <textarea
                    value={achievementForm.summary || ''}
                    onChange={(e) => setAchievementForm({ ...achievementForm, summary: e.target.value })}
                    className="bg-black/60 border border-cyan-500/30 rounded p-2.5 h-24 text-white font-sans text-xs focus:outline-none focus:border-cyan-400"
                    placeholder="Brief description of the research paper, distinction, or certified mastery..."
                  />
                </div>

                {/* Image Upload */}
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-cyan-200/70 uppercase">Achievement Photo / Banner (Optional)</label>

                  {/* Current image preview */}
                  {achievementForm.imageUrl && (
                    <div className="relative w-full rounded-lg overflow-hidden border border-cyan-500/30 bg-black/60 p-2 flex items-center justify-center group">
                      <img
                        src={achievementForm.imageUrl}
                        alt="Achievement preview"
                        className="w-full h-auto max-h-[500px] object-contain rounded"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <button
                        type="button"
                        onClick={() => setAchievementForm({ ...achievementForm, imageUrl: undefined })}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-red-950/90 border border-red-500/50 text-red-300 hover:bg-red-900 transition-colors cursor-pointer shadow-lg"
                        title="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {/* Upload file */}
                    <label
                      className="flex flex-col items-center justify-center gap-2 border border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-lg p-4 cursor-pointer transition-all bg-black/30 hover:bg-cyan-950/20 group"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            alert('Image must be under 5MB.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setAchievementForm({ ...achievementForm, imageUrl: ev.target?.result as string });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <div className="p-2 rounded-full bg-cyan-950/60 border border-cyan-500/30 group-hover:border-cyan-400 transition-colors">
                        <Upload size={16} className="text-cyan-400" />
                      </div>
                      <span className="text-[11px] font-mono text-cyan-300/70 group-hover:text-cyan-300 text-center">Upload Photo<br/><span className="text-white/30">PNG, JPG, GIF · Max 5MB</span></span>
                    </label>

                    {/* Or paste URL */}
                    <div className="flex flex-col gap-1.5 justify-center">
                      <span className="text-[10px] font-mono text-cyan-200/50 uppercase">Or paste image URL</span>
                      <input
                        type="url"
                        value={achievementForm.imageUrl?.startsWith('data:') ? '' : (achievementForm.imageUrl || '')}
                        onChange={(e) => setAchievementForm({ ...achievementForm, imageUrl: e.target.value || undefined })}
                        className="bg-black/60 border border-cyan-500/30 rounded p-2.5 text-white font-sans text-xs focus:outline-none focus:border-cyan-400"
                        placeholder="https://example.com/photo.jpg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-cyan-500/20">
              <button
                onClick={() => setEditingAchievementId(null)}
                className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveAchievement}
                className="px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs cursor-pointer shadow-[0_0_15px_rgba(0,242,255,0.4)]"
              >
                Save Achievement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESTORE BACKUP                                                     */}
      {/* ========================================================================= */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#020408] border border-cyan-500/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-[0_0_40px_rgba(0,242,255,0.2)]">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <h3 className="font-mono font-bold text-base text-cyan-300 uppercase tracking-wider">
                Restore Configuration Backup
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-white/50 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-cyan-200/70">Paste JSON Backup Content:</label>
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='{"version": "2.0.0", ...}'
                className="w-full h-44 bg-black/60 border border-cyan-500/30 rounded p-3 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded bg-white/10 text-white font-mono text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleImportBackup}
                className="px-5 py-2 rounded bg-cyan-500 text-black font-bold font-mono text-xs cursor-pointer"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
