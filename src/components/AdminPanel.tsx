import React, { useState, useEffect } from 'react';
import { defaultAboutAncient, defaultSkills, defaultProjects, ProjectData } from '../data';
import { motion } from 'motion/react';
import { Save, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  const [aboutText, setAboutText] = useState('');
  const [skills, setSkills] = useState('');
  const [projects, setProjects] = useState<ProjectData[]>([]);

  useEffect(() => {
    // Load existing data
    const savedAbout = localStorage.getItem('portfolio_about');
    const savedSkills = localStorage.getItem('portfolio_skills');
    const savedProjects = localStorage.getItem('portfolio_projects');

    setAboutText(savedAbout || defaultAboutAncient);
    
    try {
      const parsedSkills = savedSkills ? JSON.parse(savedSkills) : defaultSkills;
      setSkills(Array.isArray(parsedSkills) ? parsedSkills.join(', ') : parsedSkills);
    } catch {
      setSkills(defaultSkills.join(', '));
    }

    try {
      setProjects(savedProjects ? JSON.parse(savedProjects) : defaultProjects);
    } catch {
      setProjects(defaultProjects);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  const handleSave = () => {
    try {
      localStorage.setItem('portfolio_about', aboutText);
      
      const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s);
      localStorage.setItem('portfolio_skills', JSON.stringify(skillsArray));
      
      localStorage.setItem('portfolio_projects', JSON.stringify(projects));
      
      alert('Portfolio content saved successfully!');
    } catch (err) {
      alert('Error saving data');
    }
  };

  const addProject = () => {
    setProjects([
      ...projects,
      {
        id: Date.now().toString(),
        title: 'New Project',
        problem: '',
        approach: '',
        outcome: '',
        tech: ''
      }
    ]);
  };

  const updateProject = (id: string, field: keyof ProjectData, value: string) => {
    setProjects(projects.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const deleteProject = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020408] flex items-center justify-center text-white font-mono">
        <form onSubmit={handleLogin} className="p-8 border border-cyan-500/30 bg-black/50 rounded-2xl flex flex-col gap-4 max-w-sm w-full">
          <h2 className="text-xl text-cyan-400 mb-4 tracking-widest uppercase">Admin Access</h2>
          <input 
            type="password" 
            placeholder="Enter Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-transparent border border-cyan-500/30 p-2 rounded text-white focus:outline-none focus:border-cyan-400"
          />
          <button type="submit" className="bg-cyan-900/50 hover:bg-cyan-800/80 text-cyan-100 p-2 rounded transition-colors uppercase tracking-widest text-sm mt-2">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020408] text-white p-6 md:p-12 font-sans overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-6 sticky top-0 bg-[#020408] z-50 pt-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-cyan-500/50 hover:text-cyan-400 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl md:text-3xl font-bold tracking-widest uppercase text-cyan-400 font-mono">Content Admin</h1>
          </div>
          <button onClick={handleSave} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-bold transition-colors">
            <Save size={18} /> Save Changes
          </button>
        </div>

        {/* About Section */}
        <section className="bg-white/5 border border-cyan-500/20 rounded-xl p-6 md:p-8 space-y-4">
          <h2 className="text-xl font-mono text-cyan-300 uppercase tracking-widest border-b border-cyan-500/10 pb-2">1. Edit About</h2>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-cyan-100/70">About Text</label>
            <textarea 
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              className="bg-black/50 border border-cyan-500/20 rounded p-4 h-40 text-white focus:outline-none focus:border-cyan-400"
              placeholder="Enter about description..."
            />
          </div>
        </section>

        {/* Skills Section */}
        <section className="bg-white/5 border border-cyan-500/20 rounded-xl p-6 md:p-8 space-y-4">
          <h2 className="text-xl font-mono text-cyan-300 uppercase tracking-widest border-b border-cyan-500/10 pb-2">2. Edit Skills</h2>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-cyan-100/70">Skills List (comma-separated)</label>
            <textarea 
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="bg-black/50 border border-cyan-500/20 rounded p-4 h-24 text-white focus:outline-none focus:border-cyan-400"
              placeholder="PYTHON, REACT, SQL..."
            />
          </div>
        </section>

        {/* Projects Section */}
        <section className="bg-white/5 border border-cyan-500/20 rounded-xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
            <h2 className="text-xl font-mono text-cyan-300 uppercase tracking-widest">3. Edit Projects</h2>
            <button onClick={addProject} className="flex items-center gap-1 text-sm bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-200 px-3 py-1 rounded transition-colors">
              <Plus size={14} /> Add Project
            </button>
          </div>
          
          <div className="space-y-8">
            {projects.map((proj, i) => (
              <div key={proj.id} className="border border-white/10 rounded-lg p-6 bg-black/40 space-y-4 relative group">
                <button 
                  onClick={() => deleteProject(proj.id)}
                  className="absolute top-4 right-4 text-red-500/50 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
                
                <h3 className="text-lg text-cyan-100 font-mono">Project {i + 1}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-cyan-100/50 uppercase">Title</label>
                    <input 
                      type="text" 
                      value={proj.title}
                      onChange={(e) => updateProject(proj.id, 'title', e.target.value)}
                      className="bg-black/50 border border-cyan-500/20 rounded p-2 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-cyan-100/50 uppercase">Tech Stack</label>
                    <input 
                      type="text" 
                      value={proj.tech}
                      onChange={(e) => updateProject(proj.id, 'tech', e.target.value)}
                      className="bg-black/50 border border-cyan-500/20 rounded p-2 text-white focus:outline-none focus:border-cyan-400"
                      placeholder="React • Node • TS"
                    />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-xs text-cyan-100/50 uppercase">Problem</label>
                    <textarea 
                      value={proj.problem}
                      onChange={(e) => updateProject(proj.id, 'problem', e.target.value)}
                      className="bg-black/50 border border-cyan-500/20 rounded p-2 h-20 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-xs text-cyan-100/50 uppercase">Approach</label>
                    <textarea 
                      value={proj.approach}
                      onChange={(e) => updateProject(proj.id, 'approach', e.target.value)}
                      className="bg-black/50 border border-cyan-500/20 rounded p-2 h-20 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-xs text-cyan-100/50 uppercase">Outcome</label>
                    <textarea 
                      value={proj.outcome}
                      onChange={(e) => updateProject(proj.id, 'outcome', e.target.value)}
                      className="bg-black/50 border border-cyan-500/20 rounded p-2 h-20 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>
            ))}
            {projects.length === 0 && <p className="text-center text-white/40 italic">No projects added yet.</p>}
          </div>
        </section>

      </div>
    </div>
  );
}
