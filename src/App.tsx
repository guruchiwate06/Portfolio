/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { 
  Database, 
  Brain, 
  Eye, 
  Code2, 
  Cpu, 
  FileJson, 
  Terminal, 
  Zap,
  Boxes,
  Power,
  ArrowRight,
  Github,
  Linkedin
} from 'lucide-react';
import { TempleFrame } from './components/TempleFrame';
import FaultyTerminal from './components/FaultyTerminal';
import { useState, useEffect } from 'react';
import { defaultSkills, defaultProjects, ProjectData } from './data';

// Thematic cinematic assets
const ANCIENT_LAUREL_URL = 'https://pngimg.com/uploads/laurel_wreath/laurel_wreath_PNG34.png';
const ROMAN_TECH_SCENE_URL = 'https://images.unsplash.com/photo-1516110833967-0b5716ca1387?q=80&w=2072&auto=format&fit=crop';
const FUTURE_TECH_SCENE_URL = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop';

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
  const [projects, setProjects] = useState<ProjectData[]>(defaultProjects);

  useEffect(() => {
    const savedAbout = localStorage.getItem('portfolio_about');
    const savedSkills = localStorage.getItem('portfolio_skills');
    const savedProjects = localStorage.getItem('portfolio_projects');
    
    if (savedAbout) setAboutText(savedAbout);
    
    try {
      if (savedSkills) setSkills(JSON.parse(savedSkills));
    } catch {}

    try {
      if (savedProjects) setProjects(JSON.parse(savedProjects));
    } catch {}
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
            animate={{ x: ["100%", "0%", "0%", "100%"] }}
            transition={{ duration: 1.2, times: [0, 0.4, 0.6, 1], ease: "easeInOut" }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Fixed Socials - Bottom Left */}
      <motion.div 
        className="fixed bottom-8 left-8 z-[100] flex flex-col gap-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2.5, duration: 1 }}
      >
        <a href="https://github.com/guruchiwate06" target="_blank" rel="noreferrer" className={`transition-all duration-500 hover:scale-110 ${theme === 'ancient' ? 'text-ancient-dark/60 hover:text-gold-accent' : 'text-cyan-500/60 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]'}`}>
          <Github size={24} />
        </a>
        <a href="https://www.linkedin.com/in/rajguru-chiwate-9731772b1" target="_blank" rel="noreferrer" className={`transition-all duration-500 hover:scale-110 ${theme === 'ancient' ? 'text-ancient-dark/60 hover:text-gold-accent' : 'text-cyan-500/60 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]'}`}>
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
              pause={theme === 'ancient'}
            />
          </div>
        </motion.div>
        <motion.div 
          className="binary-stream"
          initial={{ opacity: 0.03 }}
          animate={{ opacity: theme === 'ancient' ? 0.03 : 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          10101101001011010110010101101001011010110
        </motion.div>
      </div>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center overflow-hidden">
        {/* Background Image: Theme Sensitive */}
        <div className="absolute inset-0 z-0">
          <motion.div 
            className="absolute inset-0 bg-[#020408]"
            initial={{ opacity: 0 }}
            animate={{ opacity: theme === 'modern' ? 0.9 : 0 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-0 bg-marble-white/95"
            initial={{ opacity: 0 }}
            animate={{ opacity: theme === 'ancient' ? 1 : 0 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
          />
        </div>
        
        <div className="absolute inset-0 z-0 opacity-25 flex items-center justify-center">
            <motion.div
              layout
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 2 }}
              className="relative w-full max-w-5xl"
            >
                {/* AI Core Pulse over Hands */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 blur-3xl animate-pulse rounded-full transition-colors duration-1000 ${theme === 'ancient' ? 'bg-gold-accent/20' : 'bg-cyan-500/30'}`} />
                <svg viewBox="0 0 800 400" className={`w-full h-full transition-colors duration-1000 ${theme === 'ancient' ? 'text-gold-accent opacity-40' : 'text-cyan-400 opacity-60'}`}>
                  <path d="M100,200 Q250,180 350,220" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
                  <path d="M700,200 Q550,220 450,180" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
                  <circle cx="400" cy="200" r={theme === 'ancient' ? "2" : "4"} fill="currentColor" />
                  {theme === 'modern' && <circle cx="400" cy="200" r="10" fill="none" stroke="currentColor" strokeWidth="0.5" className="animate-ping" />}
                  <circle cx="400" cy="200" r="40" fill="none" stroke="currentColor" strokeWidth="0.1" opacity="0.5" />
                </svg>
            </motion.div>
        </div>

        <div className="relative z-10 space-y-6 max-w-4xl px-4 w-full flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: theme === 'ancient' ? 0.2 : 0, 
              scale: theme === 'ancient' ? 1.1 : 1.5 
            }}
            transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <img 
              src={ANCIENT_LAUREL_URL} 
              alt="" 
              className="w-[900px] max-w-[180vw] h-auto grayscale opacity-50" 
              style={{ filter: 'sepia(100%) saturate(300%) brightness(80%)' }}
            />
          </motion.div>

          <motion.div
             layout
             initial={{ opacity: 0, y: 40 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
             className={`transition-all duration-1000 ${
               theme === 'ancient' 
               ? 'pt-20 pb-10 px-20 bg-white/30 backdrop-blur-md rounded-[3rem] border border-gold-accent/10 shadow-[0_20px_50px_rgba(0,0,0,0.05)]' 
               : 'pt-20 pb-10 px-12 bg-transparent shadow-none mb-12'
             } text-center relative z-20`}
          >
            <span className={`uppercase tracking-[0.6em] text-xs block mb-6 transition-colors duration-1000 ${theme === 'ancient' ? 'font-primary font-bold text-gold-accent' : 'font-mono text-cyan-400'}`}>
              Architect of Artificial Intelligence
            </span>
            <h1 className={`text-6xl md:text-9xl tracking-tighter leading-[0.9] uppercase font-medium transition-all duration-1000 ${theme === 'ancient' ? 'font-primary font-extrabold text-ancient-dark' : 'font-primary font-extrabold text-white glitch-hover italic'}`}>
              Rajguru<br/>Chiwate
            </h1>
            <div className="mt-6 flex flex-col items-center gap-4">
               <motion.div 
                 layout
                 className="h-0.5 bg-accent-primary transition-all duration-1000" 
                 initial={{ width: 0 }}
                 animate={{ width: theme === 'ancient' ? 120 : 240 }}
               />
               <p className={`text-lg md:text-2xl transition-all duration-1000 ${theme === 'ancient' ? 'font-primary font-medium italic text-gold-accent tracking-normal' : 'font-mono text-cyan-400 uppercase tracking-[0.3em]'}`}>
                 {theme === 'ancient' ? 'Engineering Intelligence Through Time' : 'SYSTEMS_ARCHITECT // [LOAD_COMPLETE]'}
               </p>
               
               <motion.a 
                 href="/Resume.pdf"
                 download
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 className={`mt-2 px-8 py-3 uppercase tracking-widest text-xs font-bold transition-all duration-1000 z-50 ${
                   theme === 'ancient' 
                   ? 'border border-gold-accent text-gold-accent hover:bg-gold-accent hover:text-white rounded-sm shadow-md' 
                   : 'border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black rounded shadow-[0_0_15px_rgba(0,242,255,0.2)] hover:shadow-[0_0_25px_rgba(0,242,255,0.6)]'
                 }`}
               >
                 {theme === 'ancient' ? 'Acquire Scroll (CV)' : 'Download_CV'}
               </motion.a>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 cursor-pointer"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 1 }}
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
        >
          <span className={`text-[9px] uppercase tracking-[0.4em] transition-colors duration-1000 ${theme === 'ancient' ? 'font-primary font-bold text-stone-ink/60' : 'font-mono text-cyan-400/60'}`}>
            {theme === 'ancient' ? 'Descend' : 'Scroll_Down'}
          </span>
          <div className={`w-[1px] h-16 relative overflow-hidden transition-colors duration-1000 ${theme === 'ancient' ? 'bg-stone-ink/10' : 'bg-cyan-900/40'}`}>
            <motion.div 
              className={`absolute top-0 w-full h-1/2 transition-colors duration-1000 ${theme === 'ancient' ? 'bg-gold-accent' : 'bg-cyan-400'}`}
              animate={{ y: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </section>

      {/* About Section - The Marble Tablet */}
      <section className="py-32 px-6">
        <motion.div 
          {...fadeUp}
          className="max-w-3xl mx-auto"
        >
          <div className={`stone-card p-12 md:p-16 relative overflow-hidden transition-all duration-1000 ${
            theme === 'modern' 
            ? 'bg-transparent border border-blue-500/30 rounded-2xl shadow-none' 
            : 'rounded-xl border-2 border-stone-ink/5 bg-white/40 shadow-2xl backdrop-blur-sm'
          }`}>
            <div className="relative z-10">
              <h2 className={`text-3xl md:text-4xl uppercase tracking-widest border-b pb-2 mb-6 inline-block font-primary font-extrabold transition-colors duration-1000 ${theme === 'ancient' ? 'text-gold-accent border-gold-accent' : 'text-cyan-400 border-cyan-400'}`}>The Foundation — About</h2>
              <p className={`text-2xl leading-relaxed py-4 transition-all duration-1000 ${theme === 'ancient' ? 'font-primary font-medium text-ancient-dark/90' : 'font-primary font-medium text-white/90'}`}>
                I am <span className={`font-semibold transition-colors duration-1000 ${theme === 'ancient' ? 'text-stone-ink' : 'text-cyan-300'}`}>Rajguru Chiwate</span>. {aboutText || (theme === 'ancient' 
                  ? 'Like the architects of old who built monuments for eternity, I design neural architectures that stand the test of complexity and scale. My focus lies at the intersection of Machine Learning and robust engineering.' 
                  : 'I engineer high-fidelity neural networks and adaptive cognitive systems, pushing the boundaries of what machine intelligence can achieve. My focus lies at the intersection of Machine Learning and robust engineering.')}
              </p>
            </div>
            {theme === 'modern' && (
              <div className="absolute bottom-0 right-0 p-4 opacity-20">
                <Brain size={120} className="text-cyan-500" />
              </div>
            )}
          </div>
        </motion.div>
      </section>

      {/* Projects Section - Stone Slabs */}
      <section className="py-32 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
           <h2 className={`text-3xl md:text-4xl mb-12 uppercase tracking-widest border-b pb-2 inline-block font-primary font-extrabold transition-colors duration-1000 relative z-10 ${theme === 'ancient' ? 'text-gold-accent border-gold-accent' : 'text-cyan-400 border-cyan-400'}`}>{theme === 'ancient' ? 'GRAND CHAMBERS — Projects' : 'CORE_REPOSITORY — Projects'}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-8">
            {projects.map((proj) => (
              <motion.div
                key={proj.title || proj.id}
                {...fadeUp}
                whileHover={{ y: -5 }}
                className={`stone-card p-8 transition-all duration-1000 relative group overflow-hidden ${
                  theme === 'ancient' 
                  ? 'bg-white/40 border border-black/5 border-l-4 border-l-stone-ink shadow-lg' 
                  : 'bg-transparent border border-blue-500/30 rounded-2xl'
                }`}
              >
                {/* Glitch Overlay */}
                <div className={`absolute inset-0 transition-opacity pointer-events-none ${theme === 'ancient' ? 'bg-gold-accent/5 opacity-0 group-hover:opacity-100' : 'bg-cyan-500/10 opacity-0 group-hover:opacity-100'}`} />
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-40 transition-opacity">
                  <Terminal size={14} className={theme === 'modern' ? 'text-cyan-400' : ''} />
                </div>
                
                <h3 className={`text-xl font-bold mb-2 tracking-tight flex items-center gap-2 transition-colors duration-1000 ${theme === 'ancient' ? 'font-primary text-stone-ink' : 'font-primary text-white'}`}>
                  <Code2 size={18} className={`transition-all -ml-6 group-hover:ml-0 ${theme === 'ancient' ? 'text-gold-accent opacity-0 group-hover:opacity-100' : 'text-cyan-400 opacity-0 group-hover:opacity-100'}`} />
                  {proj.title}
                </h3>
                <p className={`text-sm leading-relaxed font-sans transition-colors duration-1000 ${theme === 'ancient' ? 'text-stone-ink/70' : 'text-cyan-100/70'}`}>
                  <strong className="font-semibold opacity-90">Problem:</strong> {proj.problem}<br />
                  <strong className="font-semibold opacity-90">Approach:</strong> {proj.approach}<br />
                  <strong className="font-semibold opacity-90">Outcome:</strong> {proj.outcome}
                </p>
                <div className={`mt-4 flex items-center justify-between transition-colors duration-1000 ${theme === 'ancient' ? 'text-gold-accent' : 'text-cyan-400 font-mono text-[10px] uppercase tracking-widest'}`}>
                   <span>TECH STACK: {proj.tech}</span>
                   <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Skills Section - Medallions */}
      <section className="py-32 overflow-hidden relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl uppercase tracking-widest border-b pb-2 inline-block font-primary font-extrabold transition-colors duration-1000 ${theme === 'ancient' ? 'text-gold-accent border-gold-accent' : 'text-cyan-400 border-cyan-400'}`}>The Arsenal — Skills</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skills.map((skill, i) => (
              <motion.div
                key={skill}
                {...fadeUp}
                transition={{ delay: i * 0.05 }}
                className={`stone-card flex items-center p-6 gap-4 border transition-all duration-1000 ${
                  theme === 'ancient' 
                  ? 'bg-white/40 border-black/5 hover:border-gold-accent hover:shadow-lg' 
                  : 'bg-transparent border-blue-500/30 rounded-2xl hover:border-blue-400'
                }`}
              >
                <div className={`w-2 h-2 rounded-full border shrink-0 transition-colors duration-1000 ${theme === 'ancient' ? 'border-gold-accent' : 'border-cyan-400 bg-cyan-400 shadow-[0_0_5px_cyan]'}`} />
                <span className={`font-primary font-bold text-sm tracking-widest transition-colors duration-1000 ${theme === 'ancient' ? 'text-ancient-dark' : 'text-cyan-100'}`}>{skill}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

       <section className={`py-32 transition-colors duration-1000 ${theme === 'ancient' ? 'bg-ancient-dark text-marble-white' : 'bg-[#020408] border-y border-cyan-500/10 text-white'}`}>
        <div className={`max-w-5xl mx-auto px-6 md:px-12 py-20 transition-all duration-1000 ${
          theme === 'modern' ? 'bg-cyan-950/20 backdrop-blur-xl border border-cyan-500/10 rounded-[4rem] shadow-[0_0_60px_rgba(0,242,255,0.05)]' : ''
        }`}>
            <h2 className={`text-3xl md:text-4xl text-center mb-24 uppercase tracking-widest px-4 font-primary font-extrabold transition-colors duration-1000 relative z-10 ${theme === 'ancient' ? 'text-gold-accent' : 'text-cyan-400'}`}>{theme === 'ancient' ? 'IV. ITER OPTIMUM — Journey' : 'TIMELINE_SEQUENCE — Journey'}</h2>
           
           <div className="space-y-24 relative max-w-4xl mx-auto">
              <div className={`absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 hidden md:block transition-colors duration-1000 ${theme === 'ancient' ? 'bg-marble-white/10' : 'bg-cyan-500/30'}`} />
              
              {[
                { year: '2024 - PRES', title: 'AI Engineer', org: 'Current', desc: 'Focusing on resilient, scalable neural architectures and machine cognition.' },
                { year: '2022 - 2023', title: 'Software Developer', org: 'Industry', desc: 'Built distributed systems and optimized complex data pipelines.' },
              ].map((exp, i) => (
                <motion.div 
                  key={exp.year}
                  {...fadeUp}
                  className={`flex flex-col md:flex-row items-center gap-8 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
                >
                  <div className={`flex-1 p-8 rounded-2xl transition-all duration-1000 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'} ${
                    theme === 'modern' ? 'bg-black/20 border border-blue-500/20' : 'bg-white/10'
                  }`}>
                     <span className={`text-lg transition-colors duration-1000 ${theme === 'ancient' ? 'font-primary font-bold text-gold-dust' : 'font-mono text-cyan-400'}`}>{exp.year}</span>
                     <h3 className={`text-2xl mt-2 transition-all duration-1000 ${theme === 'ancient' ? 'font-primary font-bold' : 'font-primary font-bold'}`}>{exp.title}</h3>
                     <p className={`text-sm tracking-widest mb-4 uppercase transition-colors duration-1000 ${theme === 'ancient' ? 'text-marble-white/60 font-primary' : 'text-cyan-500/60 font-mono'}`}>{exp.org}</p>
                     <p className={`text-lg leading-relaxed opacity-80 transition-all duration-1000 ${theme === 'ancient' ? 'font-primary' : 'font-primary font-medium text-cyan-50/80'}`}>{exp.desc}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full z-10 border-4 relative transition-all duration-1000 ${theme === 'ancient' ? 'bg-gold-dust border-ancient-dark' : 'bg-cyan-400 border-black shadow-[0_0_10px_cyan]'}`}>
                    <div className={`absolute inset-0 animate-ping rounded-full ${theme === 'ancient' ? 'bg-gold-dust/30' : 'bg-cyan-400/30'}`} />
                  </div>
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              ))}
           </div>
        </div>
      </section>

      {/* Innovation Section - Roman AI Scene */}
      <section className="py-32 flex flex-col items-center relative overflow-hidden">
         {/* Background Decoration */}
         <div className={`absolute inset-0 z-0 transition-all duration-1000 ${theme === 'ancient' ? 'bg-marble-gray/30' : 'bg-transparent'}`} />

         <div className="max-w-4xl w-full px-6 grid md:grid-cols-2 gap-16 items-center relative z-10">
            <motion.div 
               {...fadeUp}
               className={`p-8 rounded-2xl transition-all duration-1000 ${
                 theme === 'ancient' 
                 ? 'bg-white/40 border border-black/5 shadow-xl' 
                 : 'bg-transparent border border-blue-500/30'
               }`}
            >
               <h2 className={`text-3xl md:text-4xl mb-8 uppercase tracking-widest font-primary font-extrabold transition-colors duration-1000 ${theme === 'ancient' ? 'text-gold-accent' : 'text-cyan-400'}`}>{theme === 'ancient' ? 'V. INNOVATIO — Experiments' : 'FRONTIER_TECH — Experiments'}</h2>
               <p className={`text-2xl leading-relaxed mb-8 italic transition-colors duration-1000 ${theme === 'ancient' ? 'font-primary font-medium text-ancient-dark/80' : 'font-primary font-semibold text-cyan-100/80'}`}>
                 {theme === 'ancient' 
                   ? '"Merging classical design principles with modern artificial intelligence."' 
                   : '"Pushing the boundaries of neural architecture and cognitive computing."'}
               </p>
                <div className={`p-8 border-l-4 relative group overflow-hidden transition-all duration-1000 ${theme === 'ancient' ? 'border-gold-dust bg-stone-gray/10 italic' : 'border-cyan-400 bg-cyan-900/30'}`}>
                   <div className={`absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ${theme === 'ancient' ? 'bg-gold-dust/5' : 'bg-cyan-400/5'}`} />
                   <span className={`relative transition-colors duration-1000 ${theme === 'modern' ? 'text-cyan-300' : ''}`}>Exploration of resilient, scalable AI infrastructure and efficient inference.</span>
                   <Code2 className={`absolute top-2 right-2 opacity-20 transition-colors duration-1000 ${theme === 'ancient' ? 'text-gold-dust' : 'text-cyan-400'}`} size={24} />
                </div>
            </motion.div>
            <motion.div 
              {...fadeUp}
              className={`relative aspect-square flex items-center justify-center p-8 overflow-hidden rounded-full border-8 stone-shadow backdrop-blur-sm transition-all duration-1000 ${theme === 'ancient' ? 'border-white bg-marble-beige/50' : 'border-cyan-500/20 bg-cyan-950/20 shadow-[0_0_40px_rgba(0,242,255,0.2)]'}`}
            >
               {/* Scanlines effect */}
               <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] pointer-events-none z-20" />
               
               <div className={`absolute inset-0 opacity-50 transition-colors duration-1000 ${theme === 'ancient' ? 'bg-stone-gray/20' : 'bg-cyan-950/40'}`} />
               
               {/* Digital Statue / AI Core */}
               <div className="relative w-full h-full flex items-center justify-center">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className={`absolute inset-0 border border-dashed rounded-full transition-colors duration-1000 ${theme === 'ancient' ? 'border-gold-accent/30' : 'border-cyan-400/40'}`}
                  />
                  <svg viewBox="0 0 100 100" className={`w-full h-full relative z-10 transition-colors duration-1000 ${theme === 'ancient' ? 'text-ancient-dark' : 'text-cyan-400'}`}>
                      <motion.circle 
                        cx="50" cy="50" r="30" 
                        fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 2"
                        animate={{ r: theme === 'ancient' ? [30, 35, 30] : [30, 45, 30] }}
                        transition={{ duration: theme === 'ancient' ? 4 : 2, repeat: Infinity }}
                      />
                      {/* AI Brain Logic Lines */}
                      <path d="M50,20 L50,80 M20,50 L80,50" stroke="currentColor" strokeWidth="0.2" opacity="0.3" />
                      <circle cx="50" cy="50" r="5" fill="currentColor" className="animate-pulse" />
                      {theme === 'modern' && (
                        <motion.path 
                          d="M30,30 L70,70 M30,70 L70,30" 
                          stroke="currentColor" strokeWidth="0.1"
                          animate={{ opacity: [0.1, 0.5, 0.1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                  </svg>
               </div>
            </motion.div>
         </div>
      </section>

      {/* Contact Section - Parchment Terminal */}
      <section className="py-48 px-6 relative overflow-hidden">
        <div className="max-w-xl mx-auto relative z-10">
          <div className={`terminal-parchment p-10 font-mono shadow-2xl relative transition-all duration-1000 ${
            theme === 'ancient' 
            ? 'bg-white/80 border border-black/5 shadow-2x-stone' 
            : 'bg-transparent border border-blue-400/40 rounded-2xl'
          }`}>
             <div className="flex justify-between items-center border-b border-accent-primary/30 pb-4 mb-8">
               <h2 className={`text-3xl md:text-4xl uppercase tracking-widest font-primary font-extrabold transition-colors duration-1000 ${theme === 'ancient' ? 'text-gold-accent' : 'text-cyan-400'}`}>{theme === 'ancient' ? 'Contact Protocol — Contact' : 'COMM_INIT_SECURE — Contact'}</h2>
               {theme === 'modern' && <div className="flex gap-1"><div className="w-2 h-2 bg-red-500 rounded-full" /><div className="w-2 h-2 bg-yellow-500 rounded-full" /><div className="w-2 h-2 bg-green-500 rounded-full" /></div>}
             </div>
             
             <div className={`space-y-4 text-xs transition-colors duration-1000 ${theme === 'ancient' ? '' : 'text-cyan-400'}`}>
                <p>&gt; {theme === 'ancient' ? 'INITIALIZING_UPLINK...' : 'ESTABLISHING_ENCRYPTED_TUNNEL...'}</p>
                <p>&gt; STATUS: {theme === 'ancient' ? 'OPEN_TO_INNOVATION' : 'LISTENING_FOR_INPUT...'}</p>
                
                <div className={`p-6 mt-8 rounded-xl transition-all duration-1000 ${theme === 'ancient' ? 'bg-white/50' : 'bg-black/40 border border-cyan-500/20'}`}>
                   <p className={`opacity-70 italic mb-4 font-primary transition-colors duration-1000 ${theme === 'ancient' ? '' : 'text-cyan-500/60'}`}>
                     {theme === 'ancient' ? 'Leave a message at the altar of the future.' : '// TRANSMIT DATA TO COORDINATES:'}
                  </p>
                   <p className={`text-xl font-bold tracking-[0.1em] uppercase transition-colors duration-1000 ${theme === 'ancient' ? 'text-stone-ink' : 'text-white'}`}>guruchiwate@gmail.com</p>
                </div>

                <form className="mt-8 flex flex-col gap-6 relative z-20">
                    <div className="flex flex-col gap-2">
                       <label className={`text-[10px] tracking-widest uppercase transition-colors duration-1000 ${theme === 'ancient' ? 'text-stone-ink/60' : 'text-cyan-500/60'}`}>
                         {theme === 'ancient' ? 'Identifier' : 'PARAM: NAME'}
                       </label>
                       <input 
                         type="text" 
                         placeholder={theme === 'ancient' ? "Your Name" : "ENTER_NAME..."} 
                         className={`w-full p-2 bg-transparent border-b outline-none transition-all duration-500 font-sans ${
                           theme === 'ancient' 
                           ? 'border-stone-ink/30 focus:border-gold-accent placeholder:text-stone-ink/30 text-stone-ink' 
                           : 'border-cyan-500/30 focus:border-cyan-400 placeholder:text-cyan-500/30 text-cyan-50'
                         }`}
                       />
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className={`text-[10px] tracking-widest uppercase transition-colors duration-1000 ${theme === 'ancient' ? 'text-stone-ink/60' : 'text-cyan-500/60'}`}>
                         {theme === 'ancient' ? 'Missive' : 'PARAM: QUERY'}
                       </label>
                       <textarea 
                         placeholder={theme === 'ancient' ? "What do you seek?" : "ENTER_TRANSMISSION_DATA..."} 
                         rows={3}
                         className={`w-full p-2 bg-transparent border-b outline-none transition-all duration-500 font-sans resize-none ${
                           theme === 'ancient' 
                           ? 'border-stone-ink/30 focus:border-gold-accent placeholder:text-stone-ink/30 text-stone-ink' 
                           : 'border-cyan-500/30 focus:border-cyan-400 placeholder:text-cyan-500/30 text-cyan-50'
                         }`}
                       />
                    </div>
                    <button 
                      type="button"
                      onClick={() => alert("Transmission received.")}
                      className={`mt-2 px-8 py-3 uppercase tracking-widest text-[10px] font-bold self-start transition-all duration-500 ${
                        theme === 'ancient' 
                        ? 'border border-stone-ink text-stone-ink hover:bg-stone-ink hover:text-white' 
                        : 'border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black shadow-[0_0_10px_rgba(0,242,255,0.1)] hover:shadow-[0_0_20px_rgba(0,242,255,0.4)]'
                      }`}
                    >
                      {theme === 'ancient' ? 'Dispatch Scroll' : 'EXECUTE_TRANSMIT'}
                    </button>
                 </form>
             </div>
             <div className={`absolute right-6 bottom-6 w-2 h-4 animate-pulse transition-colors duration-1000 ${theme === 'ancient' ? 'bg-stone-ink' : 'bg-cyan-400 shadow-[0_0_10px_cyan]'}`} />
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
      <footer className={`py-12 border-t text-center font-primary font-bold text-[10px] tracking-[0.5em] opacity-40 transition-all duration-1000 relative ${theme === 'ancient' ? 'border-ancient-dark/10' : 'border-cyan-500/10 text-cyan-400'}`}>
        © MMXXVI RAJGURU CHIWATE • {theme === 'ancient' ? 'BUILT FOR THE AGES' : 'ENGINEERED FOR THE SINGULARITY'}
      </footer>
    </TempleFrame>
  );
}
