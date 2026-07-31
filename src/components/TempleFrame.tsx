/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { ReactNode, useRef, useState, useEffect } from 'react';
import { Cpu, Zap } from 'lucide-react';

const JOINING_HANDS_BG = new URL('../assets/ChatGPT Image Apr 27, 2026, 09_01_05 PM.png', import.meta.url).href;

interface TempleFrameProps {
  children: ReactNode;
  theme: 'ancient' | 'modern';
  onToggleTheme: () => void;
}

export function TempleFrame({ children, theme, onToggleTheme }: TempleFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const pillarMove = useTransform(scrollYProgress, [0, 1], ["0%", "5%"]);
  const pillarFade = useTransform(scrollYProgress, [0, 0.1], [1, 0.9]);

  return (
    <div ref={containerRef} className={`relative min-h-screen transition-colors duration-1000 bg-transparent ${theme === 'modern' ? 'bg-[#020408]' : ''} selection:bg-gold-dust selection:text-white`}>
      {/* Theme Toggle Button */}
      <motion.button
        onClick={onToggleTheme}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`fixed top-8 right-8 z-[100] p-4 rounded-full border-2 transition-all duration-1000 backdrop-blur-md group ${
          theme === 'ancient' 
          ? 'bg-white/80 border-gold-accent text-gold-accent shadow-lg' 
          : 'bg-black/80 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(0,242,255,0.3)]'
        }`}
      >
        <div className="relative">
          <motion.div
            animate={{ 
              rotate: theme === 'ancient' ? 0 : 180,
              scale: theme === 'ancient' ? 1 : 1.2
            }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            {theme === 'ancient' ? <Cpu size={24} /> : <Zap size={24} />}
          </motion.div>
          <div className="absolute inset-0 bg-accent-primary blur-md opacity-0 group-hover:opacity-30 transition-opacity" />
        </div>
      </motion.button>

      {/* Main Content Area */}
      <motion.main 
        className="relative z-10 overflow-hidden min-h-screen px-4 md:px-6 lg:px-8"
      >
        {children}
      </motion.main>

      {theme === 'ancient' && (
        <div className="fixed inset-0 z-[-10] pointer-events-none">
          <div
            className="absolute inset-0 bg-center bg-cover opacity-30"
            style={{
              backgroundImage: `url(${JOINING_HANDS_BG})`,
              filter: 'sepia(0.25) saturate(1.1) brightness(0.95) blur(3px)',
              transform: 'translateZ(0)',
            }}
          />
        </div>
      )}

      {/* Neural Overlay Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 neural-overlay" />
        
        {/* Floating Binary Particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: 0, 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%" 
            }}
            animate={{ 
              opacity: [0, 0.15, 0],
              y: [null, "-=100", "-=200"]
            }}
            transition={{ 
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 20
            }}
            className={`absolute text-[8px] font-mono flex flex-col gap-1 select-none pointer-events-none transition-colors duration-1000 ${theme === 'ancient' ? 'text-gold-accent' : 'text-cyan-500'}`}
          >
            {[...Array(5)].map((_, j) => (
              <span key={j}>{Math.round(Math.random())}</span>
            ))}
          </motion.div>
        ))}

        {/* Glowing Neural Nodes */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.05]">
          <defs>
            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={theme === 'ancient' ? "var(--color-gold-accent)" : "var(--accent-primary)"} stopOpacity="1" />
              <stop offset="100%" stopColor={theme === 'ancient' ? "var(--color-gold-accent)" : "var(--accent-primary)"} stopOpacity="0" />
            </radialGradient>
          </defs>
          {[...Array(8)].map((_, i) => (
            <motion.circle
              key={i}
              cx={Math.random() * 100 + "%"}
              cy={Math.random() * 100 + "%"}
              r={1 + Math.random() * 2}
              fill="url(#nodeGlow)"
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scale: [1, 1.5, 1]
              }}
              transition={{
                duration: 4 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 5
              }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
