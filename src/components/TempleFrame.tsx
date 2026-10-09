/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { ReactNode, useRef, useState, useEffect, useMemo } from 'react';
import { Cpu, Zap, Menu, X, Github, Linkedin, Lock } from 'lucide-react';

const JOINING_HANDS_BG = new URL('../assets/ancient-joining-hands.webp', import.meta.url).href;

interface TempleFrameProps {
  children: ReactNode;
  theme: 'ancient' | 'modern';
  onToggleTheme: () => void;
}

const navItems = [
  { id: 'hero', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'contact', label: 'Contact' },
];

export function TempleFrame({ children, theme, onToggleTheme }: TempleFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState('hero');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollPosition = window.scrollY + 200;
        const sections = navItems.map(item => document.getElementById(item.id));

        for (let i = sections.length - 1; i >= 0; i--) {
          const section = sections[i];
          if (section && section.offsetTop <= scrollPosition) {
            const nextId = navItems[i].id;
            setActiveSection(prev => prev !== nextId ? nextId : prev);
            break;
          }
        }
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  const particles = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      x: `${(i * 12 + 5) % 92}%`,
      y: `${(i * 21 + 8) % 88}%`,
      duration: 14 + (i % 4) * 3,
      delay: (i % 3) * 2,
      digits: [(i % 2), ((i + 1) % 2), (i % 2), 1, 0],
    }));
  }, []);

  return (
    <div ref={containerRef} className={`relative min-h-screen transition-colors duration-700 bg-transparent ${theme === 'modern' ? 'bg-[#020408]' : ''} selection:bg-gold-dust selection:text-white`}>
      
      {/* Floating Header / Navbar */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1 }}
        className="fixed top-3 sm:top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-4xl px-3 sm:px-4 pointer-events-none"
      >
        <div className="flex items-center justify-between pointer-events-auto gap-2">
          {/* Brand/Logo */}
          <button 
            onClick={() => scrollTo('hero')}
            className={`font-primary font-extrabold text-[11px] sm:text-xs md:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border backdrop-blur-md transition-all duration-700 cursor-pointer shrink-0 ${
              theme === 'ancient'
                ? 'bg-white/80 border-gold-accent/40 text-stone-ink hover:text-gold-accent shadow-sm'
                : 'bg-black/80 border-cyan-500/40 text-white hover:text-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.2)]'
            }`}
          >
            Rajguru Chiwate
          </button>

          {/* Desktop Nav Links */}
          <nav className={`hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all duration-700 ${
            theme === 'ancient'
              ? 'bg-white/85 border-stone-ink/10 shadow-lg text-stone-ink/80'
              : 'bg-black/80 border-cyan-500/30 shadow-[0_0_20px_rgba(0,242,255,0.15)] text-cyan-100/80'
          }`}>
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-300 relative cursor-pointer ${
                    isActive
                      ? theme === 'ancient'
                        ? 'text-gold-accent bg-stone-ink/5 shadow-inner'
                        : 'text-cyan-300 bg-cyan-500/20 shadow-[0_0_10px_rgba(0,242,255,0.3)]'
                      : theme === 'ancient'
                        ? 'hover:text-gold-accent hover:bg-black/5'
                        : 'hover:text-cyan-400 hover:bg-cyan-500/10'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Actions: Mobile Toggle & Theme Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-label="Toggle Navigation Menu"
              className={`md:hidden p-2 rounded-full border backdrop-blur-md transition-all duration-700 cursor-pointer ${
                theme === 'ancient'
                  ? 'bg-white/80 border-gold-accent text-stone-ink'
                  : 'bg-black/80 border-cyan-500 text-cyan-400'
              }`}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Theme Switcher Button */}
            <motion.button
              onClick={onToggleTheme}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              aria-label="Toggle Theme"
              className={`p-2 sm:p-2.5 rounded-full border backdrop-blur-md transition-all duration-700 group cursor-pointer ${
                theme === 'ancient' 
                ? 'bg-white/85 border-gold-accent text-gold-accent shadow-md hover:bg-gold-accent hover:text-white' 
                : 'bg-black/85 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(0,242,255,0.3)] hover:bg-cyan-500 hover:text-black'
              }`}
            >
              <div className="relative">
                <motion.div
                  animate={{ 
                    rotate: theme === 'ancient' ? 0 : 180,
                    scale: theme === 'ancient' ? 1 : 1.15
                  }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                >
                  {theme === 'ancient' ? <Cpu size={18} /> : <Zap size={18} />}
                </motion.div>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-2.5 p-3 rounded-2xl border backdrop-blur-xl md:hidden flex flex-col gap-1 pointer-events-auto transition-all shadow-2xl ${
              theme === 'ancient'
                ? 'bg-white/95 border-gold-accent/30'
                : 'bg-black/95 border-cyan-500/40 shadow-[0_0_30px_rgba(0,242,255,0.25)]'
            }`}
          >
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`px-3.5 py-2 text-left rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    isActive
                      ? theme === 'ancient'
                        ? 'text-gold-accent bg-stone-ink/10'
                        : 'text-cyan-300 bg-cyan-500/20'
                      : theme === 'ancient'
                        ? 'text-stone-ink/80 hover:text-gold-accent'
                        : 'text-cyan-100/80 hover:text-cyan-400'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            {/* Quick Links inside Mobile Menu */}
            <div className="pt-2 mt-1 border-t border-current/10 flex items-center justify-around px-2 text-xs">
              <a 
                href="https://github.com/guruchiwate06" 
                target="_blank" 
                rel="noreferrer" 
                className={`p-2 flex items-center gap-1.5 font-mono text-[11px] ${
                  theme === 'ancient' ? 'text-stone-ink/70 hover:text-gold-accent' : 'text-cyan-400/70 hover:text-cyan-300'
                }`}
              >
                <Github size={14} /> GitHub
              </a>
              <a 
                href="https://www.linkedin.com/in/rajguru-chiwate-9731772b1" 
                target="_blank" 
                rel="noreferrer" 
                className={`p-2 flex items-center gap-1.5 font-mono text-[11px] ${
                  theme === 'ancient' ? 'text-stone-ink/70 hover:text-gold-accent' : 'text-cyan-400/70 hover:text-cyan-300'
                }`}
              >
                <Linkedin size={14} /> LinkedIn
              </a>
              <a 
                href="/admin" 
                className={`p-2 flex items-center gap-1.5 font-mono text-[11px] ${
                  theme === 'ancient' ? 'text-stone-ink/70 hover:text-gold-accent' : 'text-cyan-400/70 hover:text-cyan-300'
                }`}
              >
                <Lock size={12} /> Admin
              </a>
            </div>
          </motion.div>
        )}
      </motion.header>

      {/* Main Content Area */}
      <main 
        className="relative z-10 overflow-hidden min-h-screen px-4 md:px-6 lg:px-8"
      >
        {children}
      </main>

      {theme === 'ancient' && (
        <div className="fixed inset-0 z-[-10] pointer-events-none" style={{ transform: 'translate3d(0, 0, 0)', willChange: 'transform' }}>
          <div
            className="absolute inset-0 bg-center bg-cover opacity-25"
            style={{
              backgroundImage: `url(${JOINING_HANDS_BG})`,
              filter: 'sepia(0.2) saturate(1.1) brightness(0.95)',
              transform: 'translate3d(0, 0, 0)',
            }}
          />
        </div>
      )}

      {/* Neural Overlay Background */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ transform: 'translate3d(0, 0, 0)', willChange: 'transform' }}>
        <div className="absolute inset-0 neural-overlay" />
        
        {/* Lightweight Ambient Binary Particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            style={{ left: p.x, top: p.y }}
            className={`absolute text-[8px] font-mono flex flex-col gap-1 select-none pointer-events-none opacity-10 transition-colors duration-700 ${theme === 'ancient' ? 'text-gold-accent' : 'text-cyan-500'}`}
          >
            {p.digits.map((d, j) => (
              <span key={j}>{d}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
