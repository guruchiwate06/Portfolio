/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  Code2, 
  Terminal, 
  ArrowRight, 
  Github, 
  Linkedin,
  Trophy,
  BookOpen,
  Award,
  ShieldCheck,
  Sparkles,
  Download,
  Send,
  ChevronDown,
  ExternalLink,
  Star,
  Lock,
  Link as LinkIcon,
  X,
  Maximize2
} from 'lucide-react';
import { TempleFrame } from './components/TempleFrame';
import FaultyTerminal from './components/FaultyTerminal';
import CurvedLoop from './components/CurvedLoop';
import React, { useState, useEffect } from 'react';
import { fetchGitHubRepos, getCachedRepos } from './services/githubService';
import { 
  defaultSkills, 
  defaultProjects, 
  defaultAchievements, 
  ProjectData, 
  AchievementData 
} from './data';
import { 
  ResolvedProject, 
  AchievementItem 
} from './types/portfolio';
import { 
  getSettings, 
  getProjectsConfig, 
  getAchievements, 
  resolvePublicProjects,
  purgeAllDummyData,
  initFromServer
} from './services/portfolioStore';
import { subscribeToFirestore } from './services/firebaseService';
import AVATAR_FIGURE_URL from './assets/avatar-action-figure.webp';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

export default function App() {
  const [theme, setTheme] = useState<'ancient' | 'modern'>('ancient');
  const [aboutText, setAboutText] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>(defaultSkills);
  const [projects, setProjects] = useState<ResolvedProject[]>(() => {
    try {
      return resolvePublicProjects(getProjectsConfig(), []);
    } catch {
      return [];
    }
  });
  const [achievements, setAchievements] = useState<AchievementItem[]>(() => {
    try {
      return getAchievements().filter(a => a.isVisible !== false).sort((a, b) => a.order - b.order);
    } catch {
      return [];
    }
  });
  const [cvUrl, setCvUrl] = useState<string>('/Resume.pdf');
  const [cvFileName, setCvFileName] = useState<string>('Rajguru_Chiwate_Resume.pdf');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    // Load from persistence server first (handles port-change data loss)
    initFromServer().then(() => {
      const savedAbout = localStorage.getItem('portfolio_about');
      const savedSkills = localStorage.getItem('portfolio_skills');
      if (savedAbout) setAboutText(savedAbout);
      try {
        if (savedSkills) setSkills(JSON.parse(savedSkills));
      } catch {}

      // Load configured projects and achievements
      const settings = getSettings();
      if (settings.cvUrl) {
        setCvUrl(settings.cvUrl);
        if (settings.cvFileName) setCvFileName(settings.cvFileName);
      }
      const configs = getProjectsConfig();
      const cached = getCachedRepos(settings.githubUsername, settings.cacheTtlMinutes * 60 * 1000);
      
      // Immediate render with local config and cached GitHub data
      const initialResolved = resolvePublicProjects(configs, cached?.repos || []);
      setProjects(initialResolved);

      // Load visible achievements in order
      const initialAchievements = getAchievements()
        .filter(a => a.isVisible !== false)
        .sort((a, b) => a.order - b.order);
      setAchievements(initialAchievements);

      // Background sync with GitHub if auto-sync enabled
      if (settings.autoSyncOnLoad) {
        fetchGitHubRepos(settings.githubUsername, { ttlMinutes: settings.cacheTtlMinutes })
          .then(result => {
            if (result.repos && result.repos.length > 0) {
              const freshConfigs = getProjectsConfig();
              const freshlyResolved = resolvePublicProjects(freshConfigs, result.repos);
              setProjects(freshlyResolved);
            }
          })
          .catch(err => console.warn('Background GitHub sync note:', err));
      }
    });

    const unsubscribeFirestore = subscribeToFirestore((cloudData) => {
      if (Array.isArray(cloudData.achievements) && cloudData.achievements.length > 0) {
        setAchievements(cloudData.achievements.filter(a => a.isVisible !== false).sort((a, b) => a.order - b.order));
      }
      if (Array.isArray(cloudData.projectsConfig) && cloudData.projectsConfig.length > 0) {
        setProjects(resolvePublicProjects(cloudData.projectsConfig, []));
      }
    });

    return () => {
      unsubscribeFirestore();
    };
  }, []);

  useEffect(() => {
    if (theme === 'modern') {
      document.body.classList.add('theme-modern');
    } else {
      document.body.classList.remove('theme-modern');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'ancient' ? 'modern' : 'ancient');
  };

  const handleDownloadCv = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const targetUrl = cvUrl || '/Resume.pdf';
    const targetName = cvFileName || 'Rajguru_Chiwate_Resume.pdf';

    // If base64 data URL, download via Blob to prevent browser data URL download blocking
    if (targetUrl.startsWith('data:')) {
      e.preventDefault();
      try {
        const parts = targetUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const binary = atob(parts[1]);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([array], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const tempLink = document.createElement('a');
        tempLink.href = blobUrl;
        tempLink.download = targetName;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } catch (err) {
        console.error('Failed blob download, opening directly', err);
        window.open(targetUrl, '_blank');
      }
    }
  };

  const getAchievementIcon = (category: AchievementData['category']) => {
    switch (category) {
      case 'Research':
        return <BookOpen size={20} className={theme === 'ancient' ? 'text-gold-accent' : 'text-cyan-400'} />;
      case 'Hackathon':
        return <Trophy size={20} className={theme === 'ancient' ? 'text-gold-accent' : 'text-cyan-400'} />;
      case 'Certification':
        return <ShieldCheck size={20} className={theme === 'ancient' ? 'text-gold-accent' : 'text-cyan-400'} />;
      case 'Award':
      default:
        return <Award size={20} className={theme === 'ancient' ? 'text-gold-accent' : 'text-cyan-400'} />;
    }
  };

  return (
    <TempleFrame theme={theme} onToggleTheme={toggleTheme}>
      {/* Shutter Effect Overlay */}
      <AnimatePresence mode="wait">
        <motion.div
           key={theme}
           className="fixed inset-0 z-[200] pointer-events-none"
           initial={{ opacity: 0 }}
           animate={{ opacity: [0, 1, 1, 0] }}
           transition={{ duration: 1.2, times: [0, 0.4, 0.6, 1] }}
        >
          <div className={`absolute inset-0 ${theme === 'ancient' ? 'bg-wheat' : 'bg-cyan-500'} opacity-10`} />
          <motion.div 
            className={`absolute inset-y-0 left-0 w-1/2 ${theme === 'ancient' ? 'bg-marble-white' : 'bg-[#020408]'}`}
            initial={{ x: "-100%" }}
            animate={{ x: ["-100%", "0%", "0%", "-100%"] }}
            transition={{ duration: 1.2, times: [0, 0.4, 0.6, 1], ease: "easeInOut" }}
          />
          <motion.div 
            className={`absolute inset-y-0 right-0 w-1/2 ${theme === 'ancient' ? 'bg-marble-white' : 'bg-[#020408]'}`}
            initial={{ x: "100%" }}
            animate={{ x: ["100%", "0%", "0%", "-100%"] }}
            transition={{ duration: 1.2, times: [0, 0.4, 0.6, 1], ease: "easeInOut" }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Fixed Socials - Bottom Left (Desktop only; on mobile available in header & footer) */}
      <motion.div 
        className="hidden md:flex fixed bottom-8 left-8 z-[100] flex-col gap-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.5, duration: 1 }}
      >
        <a 
          href="https://github.com/guruchiwate06" 
          target="_blank" 
          rel="noreferrer" 
          aria-label="GitHub Profile"
          className={`transition-all duration-500 hover:scale-110 ${
            theme === 'ancient' 
              ? 'text-ancient-dark/60 hover:text-gold-accent' 
              : 'text-cyan-500/60 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]'
          }`}
        >
          <Github size={24} />
        </a>
        <a 
          href="https://www.linkedin.com/in/rajguru-chiwate-9731772b1" 
          target="_blank" 
          rel="noreferrer" 
          aria-label="LinkedIn Profile"
          className={`transition-all duration-500 hover:scale-110 ${
            theme === 'ancient' 
              ? 'text-ancient-dark/60 hover:text-gold-accent' 
              : 'text-cyan-500/60 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]'
          }`}
        >
          <Linkedin size={24} />
        </a>
      </motion.div>

      {/* Background Decor Layers */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="neural-grid" />
        <motion.div 
          className="absolute inset-0 z-0 bg-black overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: theme === 'modern' ? 1 : 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 z-0 scale-[1.2] opacity-60">
            {theme === 'modern' && (
              <FaultyTerminal
                scale={1}
                digitSize={1.7}
                scanlineIntensity={0.55}
                glitchAmount={1.8}
                flickerAmount={0.6}
                noiseAmp={0.45}
                chromaticAberration={0}
                dither={0}
                curvature={0.2}
                tint="#6360ee"
                mouseReact
                mouseStrength={0.2}
                brightness={1}
                pause={false}
              />
            )}
          </div>
        </motion.div>
      </div>

      {/* 1. Hero Section */}
      <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden pt-28 sm:pt-32 pb-6 sm:pb-8 scroll-mt-28">
        <div className="relative z-10 max-w-5xl px-4 w-full flex flex-col items-center my-auto">

          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 0.8, ease: "easeOut" }}
             className={`transition-all duration-1000 ${
                theme === 'ancient' 
                ? 'pt-8 sm:pt-14 pb-7 sm:pb-10 px-4 sm:px-12 md:px-18 bg-white/30 backdrop-blur-md rounded-[2rem] sm:rounded-[3rem] border border-gold-accent/10 shadow-[0_20px_50px_rgba(0,0,0,0.05)]' 
                : 'pt-8 sm:pt-14 pb-7 sm:pb-10 px-4 sm:px-12 md:px-16 bg-cyan-950/20 backdrop-blur-md rounded-[1.8rem] sm:rounded-[2.5rem] border border-cyan-500/20 shadow-[0_0_50px_rgba(0,242,255,0.05)]'
              } text-center relative z-20 w-full max-w-4xl`}
          >
            {/* Tilted Faint </> Code Mesh Background inside Hero Card */}
            <div 
              className={`absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none -z-10 transition-opacity duration-1000 select-none ${
                theme === 'ancient' ? 'text-stone-ink/[0.045]' : 'text-cyan-400/[0.09]'
              }`}
              aria-hidden="true"
            >
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern 
                    id="card-code-mesh" 
                    width="100" 
                    height="100" 
                    patternUnits="userSpaceOnUse" 
                    patternTransform="rotate(-15 0 0)"
                  >
                    <g 
                      stroke="currentColor" 
                      strokeWidth="3.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      fill="none"
                    >
                      {/* Left bracket < */}
                      <path d="M 30 38 L 18 48 L 30 58" />
                      {/* Slash / */}
                      <path d="M 56 32 L 44 64" />
                      {/* Right bracket > */}
                      <path d="M 70 38 L 82 48 L 70 58" />
                    </g>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#card-code-mesh)" />
              </svg>
            </div>
            <span className={`uppercase tracking-[0.4em] sm:tracking-[0.6em] text-[10px] sm:text-xs block mb-4 sm:mb-6 transition-colors duration-1000 ${theme === 'ancient' ? 'font-primary font-bold text-gold-accent' : 'font-mono text-cyan-400'}`}>
              Architect of Artificial Intelligence
            </span>
            
            {/* Staggered Typography with Action Figure Seated on AT of CHIWATE */}
            <h1 className={`text-[2.65rem] min-[400px]:text-[3.2rem] sm:text-7xl md:text-8xl lg:text-9xl tracking-tighter leading-[0.9] uppercase transition-all duration-1000 select-none ${
              theme === 'ancient' ? 'font-primary font-extrabold text-ancient-dark' : 'font-primary font-extrabold text-white italic'
            }`}>
              <div className="relative inline-flex flex-col items-center w-full max-w-4xl mx-auto">
                {/* First Word: RAJGURU (Aligned Left) */}
                <div className="w-full text-left tracking-tighter">
                  RAJGURU
                </div>

                {/* Second Word: CHIWATE (Shifted / Indented to Right) */}
                <div className="w-full text-right flex justify-end items-baseline tracking-tighter pl-3 sm:pl-12 md:pl-24 lg:pl-36">
                  <span>CHIW</span>
                  
                  {/* Letters AT with 3D Action Figure locked in proportional em units */}
                  <span className="relative inline-flex items-baseline justify-center">
                    {/* Exact Body-Contour Silhouette Shadow placed BEHIND the letters (-z-10) */}
                    <div 
                      className="absolute left-1/2 -translate-x-[48%] -z-10 pointer-events-none select-none"
                      style={{
                        width: '1.55em',
                        bottom: '0.42em',
                      }}
                    >
                      <img 
                        src={AVATAR_FIGURE_URL} 
                        alt="" 
                        aria-hidden="true"
                        loading="eager"
                        decoding="async"
                        className={`w-full h-auto object-contain pointer-events-none select-none transition-all duration-700 ${
                          theme === 'ancient' 
                            ? 'filter brightness-0 blur-[8px] opacity-45 translate-y-2' 
                            : 'filter brightness-0 blur-[10px] opacity-65 translate-y-2'
                        }`} 
                      />
                    </div>

                    {/* Crisp Letter Glyphs */}
                    <span className="relative z-10">AT</span>

                    {/* 3D Action Figure perched on top of AT */}
                    <div
                      className="absolute left-1/2 -translate-x-[48%] z-20 pointer-events-none select-none"
                      style={{
                        width: '1.55em',
                        bottom: '0.42em',
                        transformStyle: 'preserve-3d',
                      }}
                    >
                      {/* 3D Action Figure Cutout Image */}
                      <img 
                        src={AVATAR_FIGURE_URL} 
                        alt="Rajguru Chiwate 3D Figure"
                        loading="eager"
                        decoding="async" 
                        className={`w-full h-auto object-contain pointer-events-none ${
                          theme === 'ancient'
                            ? 'filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.2)]'
                            : 'filter drop-shadow-[0_8px_20px_rgba(0,242,255,0.35)]'
                        }`} 
                      />
                    </div>
                  </span>

                  <span>E</span>
                </div>
              </div>
            </h1>

            <div className="mt-6 sm:mt-7 flex flex-col items-center gap-3">
               <motion.div 
                 className="h-0.5 bg-accent-primary transition-all duration-1000" 
                 initial={{ width: 0 }}
                 animate={{ width: theme === 'ancient' ? 120 : 240 }}
               />
               <p className={`text-base sm:text-lg md:text-xl transition-all duration-1000 ${theme === 'ancient' ? 'font-primary font-medium italic text-gold-accent tracking-normal' : 'font-mono text-cyan-400 uppercase tracking-[0.3em]'}`}>
                 {theme === 'ancient' ? 'Engineering Intelligence Through Time' : 'SYSTEMS_ARCHITECT // [LOAD_COMPLETE]'}
               </p>
               
               <motion.a 
                 href={cvUrl || "/Resume.pdf"}
                 download={cvUrl && cvUrl.startsWith('http') ? undefined : (cvFileName || "Rajguru_Chiwate_Resume.pdf")}
                 target={cvUrl && cvUrl.startsWith('http') ? "_blank" : undefined}
                 rel="noreferrer"
                 onClick={handleDownloadCv}
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 className={`mt-4 sm:mt-5 px-7 py-3 inline-flex items-center gap-2 uppercase tracking-widest text-xs font-bold transition-all duration-700 z-50 cursor-pointer ${
                   theme === 'ancient' 
                   ? 'border border-gold-accent text-gold-accent hover:bg-gold-accent hover:text-white rounded shadow-sm' 
                   : 'border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black rounded shadow-[0_0_15px_rgba(0,242,255,0.2)] hover:shadow-[0_0_25px_rgba(0,242,255,0.6)]'
                 }`}
               >
                 <Download size={14} /> Download CV
               </motion.a>
            </div>
          </motion.div>

          {/* Clean, Separated Scroll Down Indicator (without vertical blinking line) */}
          <motion.div 
            className="pt-4 sm:pt-6 pb-2 sm:pb-3 flex flex-col items-center gap-1 cursor-pointer z-30 group"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            onClick={() => {
              const aboutEl = document.getElementById('about');
              if (aboutEl) aboutEl.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span className={`text-[10px] uppercase tracking-[0.3em] font-bold transition-colors duration-500 group-hover:text-gold-accent ${theme === 'ancient' ? 'font-primary text-stone-ink/60' : 'font-mono text-cyan-400/70 group-hover:text-cyan-300'}`}>
              Scroll Down
            </span>
            <ChevronDown 
              size={18} 
              className={`transition-transform duration-300 group-hover:translate-y-1 ${theme === 'ancient' ? 'text-stone-ink/50 group-hover:text-gold-accent' : 'text-cyan-400/60 group-hover:text-cyan-300'}`} 
            />
          </motion.div>
        </div>
      </section>

      {/* 2. About Section */}
      <section id="about" className="py-20 sm:py-28 md:py-32 px-4 sm:px-6 scroll-mt-24">
        <motion.div 
          {...fadeUp}
          className="max-w-3xl mx-auto"
        >
          <div className={`stone-card p-6 sm:p-10 md:p-16 relative overflow-hidden transition-all duration-1000 ${
            theme === 'modern' 
            ? 'bg-transparent border border-blue-500/30 rounded-2xl shadow-none' 
            : 'rounded-xl border-2 border-stone-ink/5 bg-white/40 shadow-2xl backdrop-blur-sm'
          }`}>
            <div className="relative z-10">
              <h2 className={`text-2xl md:text-4xl uppercase tracking-widest border-b pb-2 mb-6 inline-block font-primary font-extrabold transition-colors duration-1000 ${theme === 'ancient' ? 'text-gold-accent border-gold-accent' : 'text-cyan-400 border-cyan-400'}`}>
                About
              </h2>
              <p className={`text-xl md:text-2xl leading-relaxed py-4 transition-all duration-1000 ${theme === 'ancient' ? 'font-primary font-medium text-ancient-dark/90' : 'font-primary font-medium text-white/90'}`}>
                I am <span className={`font-semibold transition-colors duration-1000 ${theme === 'ancient' ? 'text-stone-ink' : 'text-cyan-300'}`}>Rajguru Chiwate</span>. {aboutText || (theme === 'ancient' 
                  ? 'Like the architects of old who built monuments for eternity, I design neural architectures that stand the test of complexity and scale. My focus lies at the intersection of Machine Learning and robust engineering.' 
                  : 'I engineer high-fidelity neural networks and adaptive cognitive systems, pushing the boundaries of what machine intelligence can achieve. My focus lies at the intersection of Machine Learning and robust engineering.')}
              </p>
            </div>
            {theme === 'modern' && (
              <div className="absolute bottom-0 right-0 p-4 opacity-20 pointer-events-none">
                <Brain size={120} className="text-cyan-500" />
              </div>
            )}
          </div>
        </motion.div>
      </section>

      {/* Interactive Straight Loop Marquee between About and Projects */}
      <section className="relative z-10 overflow-hidden py-4 -my-4 pointer-events-auto">
        <CurvedLoop
          marqueeText="LEARN  </>  BUILD  </>  EVOLVE  </>  "
          speed={1.8}
          curveAmount={0}
          interactive={true}
          jacketClassName="min-h-[90px] md:min-h-[120px]"
          className={`transition-colors duration-700 tracking-widest font-extrabold uppercase ${
            theme === 'ancient'
              ? 'fill-stone-ink/40 hover:fill-gold-accent'
              : 'fill-cyan-400/40 hover:fill-cyan-300 drop-shadow-[0_0_12px_rgba(0,242,255,0.4)]'
          }`}
        />
      </section>

      {/* 3. Projects Section */}
      <section id="projects" className="py-20 sm:py-28 md:py-32 px-4 sm:px-6 relative z-10 scroll-mt-24">
        <div className="max-w-5xl mx-auto">
           <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 border-b pb-4">
             <h2 className={`text-2xl md:text-4xl uppercase tracking-widest inline-block font-primary font-extrabold transition-colors duration-1000 ${theme === 'ancient' ? 'text-gold-accent border-gold-accent' : 'text-cyan-400 border-cyan-400'}`}>
               Projects
             </h2>
             <span className={`text-xs uppercase tracking-widest mt-2 md:mt-0 ${theme === 'ancient' ? 'text-stone-ink/60 font-primary' : 'text-cyan-500/60 font-mono'}`}>
               {projects.length} Selected Projects
             </span>
           </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mt-6 sm:mt-8">
            {projects.map((proj) => (
              <motion.div
                key={proj.id}
                {...fadeUp}
                whileHover={{ y: -6 }}
                onClick={() => {
                  const targetUrl = proj.liveDemoUrl || proj.githubUrl;
                  if (targetUrl) window.open(targetUrl, '_blank', 'noopener,noreferrer');
                }}
                className={`stone-card p-5 sm:p-8 transition-all duration-700 relative group overflow-hidden flex flex-col justify-between cursor-pointer ${
                  theme === 'ancient' 
                  ? 'bg-white/50 border border-black/5 border-l-4 border-l-stone-ink shadow-lg hover:shadow-2xl' 
                  : 'bg-black/40 border border-blue-500/30 rounded-2xl hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(0,242,255,0.15)]'
                }`}
              >
                {/* Micro Glitch Overlay */}
                <div className={`absolute inset-0 transition-opacity pointer-events-none ${theme === 'ancient' ? 'bg-gold-accent/5 opacity-0 group-hover:opacity-100' : 'bg-cyan-500/10 opacity-0 group-hover:opacity-100'}`} />
                <div className="absolute top-0 right-0 p-3 opacity-15 group-hover:opacity-60 transition-opacity">
                  <Terminal size={16} className={theme === 'modern' ? 'text-cyan-400' : 'text-stone-ink'} />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {proj.isPoC || proj.title.includes('[PoC') ? (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          theme === 'ancient' 
                            ? 'border-gold-accent text-gold-accent bg-gold-accent/10' 
                            : 'border-cyan-400 text-cyan-300 bg-cyan-950/60 shadow-[0_0_8px_rgba(0,242,255,0.3)]'
                        }`}>
                          <Sparkles size={10} /> PoC / Research
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          theme === 'ancient' ? 'bg-black/5 text-stone-ink/70' : 'bg-white/5 text-cyan-400/80'
                        }`}>
                          Production
                        </span>
                      )}

                      {proj.stars !== undefined && proj.stars > 0 && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                          theme === 'ancient' ? 'bg-gold-accent/10 text-stone-ink' : 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/20'
                        }`}>
                          <Star size={10} fill="currentColor" /> {proj.stars}
                        </span>
                      )}
                    </div>

                    {/* External links */}
                    <div className="flex items-center gap-2 z-10">
                      {proj.githubUrl && (
                        <a 
                          href={proj.githubUrl} 
                          target="_blank" 
                          onClick={(e) => e.stopPropagation()} 
                          rel="noreferrer" 
                          aria-label="GitHub Repository"
                          className={`p-1.5 rounded transition-all hover:scale-110 ${
                            theme === 'ancient' ? 'text-stone-ink/60 hover:text-gold-accent' : 'text-cyan-400/60 hover:text-cyan-300'
                          }`}
                        >
                          <Github size={15} />
                        </a>
                      )}
                      {proj.liveDemoUrl && (
                        <a 
                          href={proj.liveDemoUrl} 
                          target="_blank" 
                          onClick={(e) => e.stopPropagation()} 
                          rel="noreferrer" 
                          aria-label="Live Demo"
                          className={`p-1.5 rounded transition-all hover:scale-110 ${
                            theme === 'ancient' ? 'text-stone-ink/60 hover:text-gold-accent' : 'text-cyan-400/60 hover:text-cyan-300'
                          }`}
                        >
                          <ExternalLink size={15} />
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <h3 className={`text-xl font-bold mb-3 tracking-tight flex items-center gap-2 transition-colors duration-500 ${theme === 'ancient' ? 'font-primary text-stone-ink' : 'font-primary text-white'}`}>
                    <Code2 size={18} className={`transition-all -ml-6 group-hover:ml-0 ${theme === 'ancient' ? 'text-gold-accent opacity-0 group-hover:opacity-100' : 'text-cyan-400 opacity-0 group-hover:opacity-100'}`} />
                    {(proj.liveDemoUrl || proj.githubUrl) ? (
                      <a 
                        href={proj.liveDemoUrl || proj.githubUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline transition-colors"
                      >
                        {proj.title}
                      </a>
                    ) : (
                      proj.title
                    )}
                  </h3>
                  <div className={`text-sm leading-relaxed space-y-1.5 transition-colors duration-500 ${theme === 'ancient' ? 'text-stone-ink/80' : 'text-cyan-100/80'}`}>
                    <p><strong className="font-semibold opacity-90">Problem:</strong> {proj.problem}</p>
                    <p><strong className="font-semibold opacity-90">Approach:</strong> {proj.approach}</p>
                    <p><strong className="font-semibold opacity-90">Outcome:</strong> {proj.outcome}</p>
                  </div>
                </div>

                <div className={`mt-6 pt-4 border-t flex items-center justify-between gap-3 transition-colors duration-500 ${
                  theme === 'ancient' 
                    ? 'border-stone-ink/10 text-gold-accent' 
                    : 'border-cyan-500/20 text-cyan-400 font-mono text-[11px] uppercase tracking-widest'
                }`}>
                   <span className="font-semibold text-xs truncate max-w-[55%] sm:max-w-[65%]" title={proj.tech}>
                     Tech Stack: {proj.tech}
                   </span>
                   
                   <div className="flex items-center gap-2 shrink-0 relative z-30">
                     {proj.liveDemoUrl ? (
                       <a 
                         href={proj.liveDemoUrl} 
                         target="_blank" 
                         rel="noopener noreferrer" 
                         onClick={(e) => e.stopPropagation()}
                         title={`Launch Live Demo: ${proj.liveDemoUrl}`}
                         className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm cursor-pointer relative z-30 ${
                           theme === 'ancient'
                             ? 'bg-gold-accent text-white hover:bg-gold-accent/90 shadow-gold-accent/20'
                             : 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_15px_rgba(0,242,255,0.5)]'
                         }`}
                       >
                         Launch <ExternalLink size={13} />
                       </a>
                     ) : proj.githubUrl ? (
                       <a 
                         href={proj.githubUrl} 
                         target="_blank" 
                         rel="noopener noreferrer" 
                         onClick={(e) => e.stopPropagation()}
                         title={`Launch Repository: ${proj.githubUrl}`}
                         className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm cursor-pointer relative z-30 ${
                           theme === 'ancient'
                             ? 'border border-gold-accent text-gold-accent hover:bg-gold-accent hover:text-white'
                             : 'border border-cyan-400/60 text-cyan-400 hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_15px_rgba(0,242,255,0.4)]'
                         }`}
                       >
                         Launch <ArrowRight size={13} />
                       </a>
                     ) : (
                       <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                     )}
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
          {projects.length === 0 && (
            <p className="text-center text-xs opacity-50 py-12 font-mono">No projects selected yet. Configure selected repositories in Admin.</p>
          )}
        </div>
      </section>

      {/* 4. Skills Section */}
      <section id="skills" className="py-20 sm:py-28 md:py-32 overflow-hidden relative scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className={`text-2xl md:text-4xl uppercase tracking-widest border-b pb-2 inline-block font-primary font-extrabold transition-colors duration-1000 ${theme === 'ancient' ? 'text-gold-accent border-gold-accent' : 'text-cyan-400 border-cyan-400'}`}>
              Skills
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {skills.map((skill, i) => (
              <motion.div
                key={skill}
                {...fadeUp}
                transition={{ delay: i * 0.04 }}
                whileHover={{ scale: 1.03 }}
                className={`stone-card flex items-center p-3.5 sm:p-6 gap-2.5 sm:gap-4 border transition-all duration-500 ${
                  theme === 'ancient' 
                  ? 'bg-white/50 border-black/5 hover:border-gold-accent hover:shadow-xl' 
                  : 'bg-black/40 border-blue-500/30 rounded-xl sm:rounded-2xl hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,242,255,0.2)]'
                }`}
              >
                <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border shrink-0 transition-colors duration-500 ${theme === 'ancient' ? 'border-gold-accent bg-gold-accent' : 'border-cyan-400 bg-cyan-400 shadow-[0_0_8px_cyan]'}`} />
                <span className={`font-primary font-bold text-xs sm:text-sm tracking-wider sm:tracking-widest uppercase transition-colors duration-500 truncate ${theme === 'ancient' ? 'text-ancient-dark' : 'text-cyan-100'}`}>{skill}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Achievements & Research Section */}
      <section id="achievements" className="py-20 sm:py-28 md:py-32 px-4 sm:px-6 relative z-10 scroll-mt-24">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 border-b pb-4">
            <h2 className={`text-2xl md:text-4xl uppercase tracking-widest inline-block font-primary font-extrabold transition-colors duration-1000 ${theme === 'ancient' ? 'text-gold-accent border-gold-accent' : 'text-cyan-400 border-cyan-400'}`}>
              Achievements & Research
            </h2>
            <span className={`text-xs uppercase tracking-widest mt-2 md:mt-0 ${theme === 'ancient' ? 'text-stone-ink/60 font-primary' : 'text-cyan-500/60 font-mono'}`}>
              Research Papers • Hackathons • Certifications
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
            {achievements.map((item, idx) => {
              const connectedProject = item.projectId 
                ? projects.find(p => p.id === item.projectId || p.repoName?.toLowerCase() === item.projectId?.toLowerCase())
                : undefined;

              return (
                <motion.div
                  key={item.id || idx}
                  {...fadeUp}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -5 }}
                  className={`stone-card p-5 sm:p-8 transition-all duration-700 relative group overflow-hidden flex flex-col justify-between ${
                    theme === 'ancient' 
                    ? 'bg-white/50 border border-black/5 shadow-lg hover:shadow-2xl' 
                    : 'bg-black/40 border border-blue-500/30 rounded-2xl hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(0,242,255,0.15)]'
                  }`}
                >
                  <div>
                    {/* Achievement Photo / Banner / Post */}
                    {item.imageUrl && (
                      <div 
                        className={`relative -mx-5 -mt-5 sm:-mx-8 sm:-mt-8 mb-4 sm:mb-5 overflow-hidden rounded-t-xl sm:rounded-t-2xl border-b transition-all duration-300 cursor-pointer group/img flex items-center justify-center ${
                          theme === 'ancient' 
                            ? 'bg-stone-100/90 border-stone-ink/10' 
                            : 'bg-black/60 border-cyan-500/20'
                        }`}
                        onClick={() => setPreviewImage({ url: item.imageUrl!, title: item.title })}
                        title="Click to view full image"
                      >
                        <img
                          src={item.imageUrl}
                          alt={`${item.title} photo`}
                          className="w-full h-auto max-h-[650px] object-contain block mx-auto transition-transform duration-500 group-hover/img:scale-[1.01]"
                          onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                        />
                        <div className="absolute top-3 right-3 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/80 backdrop-blur-md text-cyan-300 text-[11px] font-mono px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-cyan-500/40 shadow-lg pointer-events-none">
                          <Maximize2 size={12} /> View Full
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border transition-colors duration-500 ${
                          theme === 'ancient' 
                            ? 'bg-gold-accent/10 border-gold-accent/30' 
                            : 'bg-cyan-950/60 border-cyan-500/30 shadow-[0_0_12px_rgba(0,242,255,0.2)]'
                        }`}>
                          {getAchievementIcon(item.category)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest block ${
                              theme === 'ancient' ? 'text-gold-accent' : 'text-cyan-400 font-mono'
                            }`}>
                              {item.category}
                            </span>
                            {item.source === 'linkedin' && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-950 border border-blue-500/30 text-blue-300">
                                LinkedIn
                              </span>
                            )}
                            {item.source === 'github' && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                                GitHub
                              </span>
                            )}
                          </div>
                          <span className={`text-xs opacity-60 ${
                            theme === 'ancient' ? 'text-stone-ink font-primary' : 'text-cyan-100 font-mono'
                          }`}>
                            {item.issuerOrVenue} • {item.date}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${
                        theme === 'ancient'
                          ? 'border-gold-accent/40 bg-gold-accent/5 text-stone-ink'
                          : 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300 shadow-[0_0_8px_rgba(0,242,255,0.2)]'
                      }`}>
                        {item.badgeText}
                      </span>
                    </div>

                    <h3 className={`text-lg font-bold mb-3 tracking-tight transition-colors duration-500 ${
                      theme === 'ancient' ? 'font-primary text-stone-ink' : 'font-primary text-white'
                    }`}>
                      {item.title}
                    </h3>

                    <p className={`text-sm leading-relaxed opacity-85 transition-colors duration-500 mb-3 ${
                      theme === 'ancient' ? 'text-stone-ink font-primary' : 'text-cyan-100 font-sans'
                    }`}>
                      {item.summary}
                    </p>

                    {/* Connected Project or Verified External link */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {connectedProject && (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border ${
                          theme === 'ancient' 
                            ? 'bg-stone-ink/5 border-gold-accent/40 text-stone-ink' 
                            : 'bg-purple-950/60 border-purple-500/30 text-purple-300'
                        }`}>
                          <LinkIcon size={10} /> Linked Project: {connectedProject.title}
                        </span>
                      )}
                      {item.externalUrl && (
                        <a 
                          href={item.externalUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className={`inline-flex items-center gap-1 text-[11px] font-mono hover:underline ${
                            theme === 'ancient' ? 'text-gold-accent' : 'text-cyan-400'
                          }`}
                        >
                          Verified Link <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className={`mt-6 pt-3 border-t flex items-center justify-between text-xs transition-colors duration-500 ${
                    theme === 'ancient' 
                      ? 'border-stone-ink/10 text-gold-accent font-primary font-bold' 
                      : 'border-cyan-500/20 text-cyan-400 font-mono'
                  }`}>
                    <span className="uppercase tracking-widest">Verified Record</span>
                    <span className="opacity-60">ID: {item.id}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
          {achievements.length === 0 && (
            <p className="text-center text-xs opacity-50 py-12 font-mono">No achievements selected yet. Configure achievements in Admin.</p>
          )}
        </div>
      </section>

      {/* 6. Contact Section */}
      <section id="contact" className="py-20 sm:py-28 md:py-32 px-4 sm:px-6 relative overflow-hidden scroll-mt-24">
        <div className="max-w-xl mx-auto relative z-10">
          <div className={`terminal-parchment p-6 sm:p-8 md:p-10 font-sans shadow-2xl relative transition-all duration-1000 ${
            theme === 'ancient' 
            ? 'bg-white/85 border border-black/5 shadow-2x-stone rounded-2xl' 
            : 'bg-black/60 border border-cyan-500/40 rounded-2xl shadow-[0_0_30px_rgba(0,242,255,0.15)]'
          }`}>
             <div className="flex justify-between items-center border-b border-accent-primary/30 pb-4 mb-6">
               <h2 className={`text-2xl md:text-3xl uppercase tracking-widest font-primary font-extrabold transition-colors duration-1000 ${theme === 'ancient' ? 'text-gold-accent' : 'text-cyan-400'}`}>
                 Contact
               </h2>
               {theme === 'modern' && (
                 <div className="flex gap-1.5">
                   <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_5px_red]" />
                   <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-[0_0_5px_yellow]" />
                   <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_5px_green]" />
                 </div>
               )}
             </div>
             
             <div className={`space-y-4 text-sm transition-colors duration-1000 ${theme === 'ancient' ? 'text-stone-ink' : 'text-cyan-100'}`}>
                <p className="opacity-80">
                  Feel free to reach out directly for collaborations, research, or new opportunities:
                </p>
                
                <div className={`p-4 sm:p-5 rounded-xl transition-all duration-1000 ${theme === 'ancient' ? 'bg-white/50 border border-gold-accent/20' : 'bg-black/40 border border-cyan-500/20'}`}>
                   <span className={`text-xs block mb-1 uppercase tracking-widest ${theme === 'ancient' ? 'text-gold-accent font-bold' : 'text-cyan-400 font-mono'}`}>Direct Email</span>
                   <a 
                     href="mailto:guruchiwate@gmail.com" 
                     className={`text-base sm:text-lg md:text-xl font-bold tracking-wide hover:underline transition-colors duration-500 break-all ${theme === 'ancient' ? 'text-stone-ink hover:text-gold-accent' : 'text-white hover:text-cyan-300'}`}
                   >
                     guruchiwate@gmail.com
                   </a>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    alert("Message sent successfully!");
                  }}
                  className="mt-6 flex flex-col gap-5 relative z-20"
                >
                    <div className="flex flex-col gap-1.5">
                       <label className={`text-xs tracking-wider uppercase font-semibold transition-colors duration-1000 ${theme === 'ancient' ? 'text-stone-ink/70' : 'text-cyan-400'}`}>
                         Your Name
                       </label>
                       <input 
                         type="text" 
                         required
                         placeholder="Enter your name" 
                         className={`w-full p-3 bg-transparent border-b outline-none transition-all duration-500 ${
                           theme === 'ancient' 
                           ? 'border-stone-ink/30 focus:border-gold-accent placeholder:text-stone-ink/40 text-stone-ink' 
                           : 'border-cyan-500/30 focus:border-cyan-400 placeholder:text-cyan-500/40 text-cyan-50'
                         }`}
                       />
                    </div>
                    <div className="flex flex-col gap-1.5">
                       <label className={`text-xs tracking-wider uppercase font-semibold transition-colors duration-1000 ${theme === 'ancient' ? 'text-stone-ink/70' : 'text-cyan-400'}`}>
                         Your Message
                       </label>
                       <textarea 
                         required
                         placeholder="Enter your message..." 
                         rows={4}
                         className={`w-full p-3 bg-transparent border-b outline-none transition-all duration-500 resize-none ${
                           theme === 'ancient' 
                           ? 'border-stone-ink/30 focus:border-gold-accent placeholder:text-stone-ink/40 text-stone-ink' 
                           : 'border-cyan-500/30 focus:border-cyan-400 placeholder:text-cyan-500/40 text-cyan-50'
                         }`}
                       />
                    </div>
                    <button 
                      type="submit"
                      className={`mt-3 px-8 py-3.5 inline-flex items-center gap-2 uppercase tracking-widest text-xs font-bold self-start transition-all duration-500 cursor-pointer ${
                        theme === 'ancient' 
                        ? 'border border-stone-ink text-stone-ink hover:bg-stone-ink hover:text-white rounded shadow-sm' 
                        : 'border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black rounded shadow-[0_0_10px_rgba(0,242,255,0.1)] hover:shadow-[0_0_20px_rgba(0,242,255,0.4)]'
                      }`}
                    >
                      <Send size={14} /> Send Message
                    </button>
                 </form>
             </div>
          </div>
        </div>
      </section>

      {/* Decor Arch Background */}
      <div className={`absolute -bottom-20 inset-x-0 opacity-[0.05] pointer-events-none transition-colors duration-1000 ${theme === 'modern' ? 'text-cyan-500' : 'text-current'}`}>
         <svg viewBox="0 0 1000 100" className="w-full">
            <path d="M0,100 C250,0 750,0 1000,100" fill="currentColor" />
         </svg>
      </div>

      {/* Footer */}
      <footer className={`py-12 border-t text-center font-primary font-bold text-xs tracking-[0.2em] opacity-80 transition-all duration-1000 relative flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 px-4 ${theme === 'ancient' ? 'border-ancient-dark/10 text-stone-ink' : 'border-cyan-500/10 text-cyan-400'}`}>
        <span>© 2026 RAJGURU CHIWATE • ALL RIGHTS RESERVED</span>
        <div className="flex items-center gap-4">
          <a 
            href="https://github.com/guruchiwate06" 
            target="_blank" 
            rel="noreferrer" 
            aria-label="GitHub Profile"
            className={`p-1.5 rounded transition-all hover:scale-110 ${
              theme === 'ancient' ? 'text-stone-ink/60 hover:text-gold-accent' : 'text-cyan-500/60 hover:text-cyan-300'
            }`}
          >
            <Github size={15} />
          </a>
          <a 
            href="https://www.linkedin.com/in/rajguru-chiwate-9731772b1" 
            target="_blank" 
            rel="noreferrer" 
            aria-label="LinkedIn Profile"
            className={`p-1.5 rounded transition-all hover:scale-110 ${
              theme === 'ancient' ? 'text-stone-ink/60 hover:text-gold-accent' : 'text-cyan-500/60 hover:text-cyan-300'
            }`}
          >
            <Linkedin size={15} />
          </a>
          <a 
            href="/admin" 
            title="Admin Access" 
            className={`transition-colors hover:scale-110 inline-flex items-center gap-1 normal-case tracking-normal text-[11px] font-mono ${
              theme === 'ancient' ? 'text-stone-ink/50 hover:text-gold-accent' : 'text-cyan-500/50 hover:text-cyan-300'
            }`}
          >
            <Lock size={12} /> Admin
          </a>
        </div>
      </footer>

      {/* Full Image Preview Lightbox Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl max-h-[92vh] w-full flex flex-col items-center justify-center cursor-default bg-zinc-950/95 border border-cyan-500/40 rounded-2xl p-4 shadow-[0_0_50px_rgba(0,242,255,0.25)] overflow-hidden"
            >
              <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 mb-3 px-2">
                <span className="font-mono text-xs md:text-sm text-cyan-300 truncate max-w-[80%] font-bold">
                  {previewImage.title}
                </span>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="relative w-full flex items-center justify-center overflow-auto max-h-[80vh]">
                <img
                  src={previewImage.url}
                  alt={previewImage.title}
                  className="max-w-full max-h-[78vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TempleFrame>
  );
}
