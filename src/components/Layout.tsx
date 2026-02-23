import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Bell, Search, Command, Eye, EyeOff, Zap } from 'lucide-react';
import { NAV_ITEMS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (id: string) => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  onOpenCommandPalette?: () => void;
}

export default function Layout({
  children,
  activeTab,
  onTabChange,
  isFocusMode,
  onToggleFocusMode,
  onOpenCommandPalette,
}: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(() => window.matchMedia('(min-width: 1024px)').matches);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const formattedDate = new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(currentTime);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <Menu className="w-6 h-6 text-zinc-400" />
          </button>
          <span className="font-semibold text-lg tracking-tight">Executive<span className="text-emerald-500">Cockpit</span></span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-black">
            KB
          </div>
        </div>
      </div>

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence>
          {(isSidebarOpen || isDesktop) && (
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`
                fixed lg:static inset-y-0 left-0 z-40 w-72 bg-zinc-900 border-r border-zinc-800 
                flex flex-col shadow-2xl lg:shadow-none lg:transform-none
                ${!isSidebarOpen && 'hidden lg:flex'}
              `}
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                    <Zap className="w-5 h-5 text-emerald-500" />
                  </div>
                  <span className="font-bold text-xl tracking-tight">Executive</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-zinc-800 rounded-lg">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              <div className="px-4 py-2">
                <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4 px-2">Nawigacja</div>
                <nav className="space-y-1">
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        if (!isDesktop) setIsSidebarOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                        ${activeTab === item.id 
                          ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'}
                      `}
                    >
                      <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-emerald-500' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                      <span className="font-medium">{item.label}</span>
                      {activeTab === item.id && (
                        <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="mt-auto p-6 border-t border-zinc-800">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-black shadow-lg shadow-emerald-500/20">
                    KB
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-100 truncate">Krystian Brzeski</div>
                    <div className="text-xs text-zinc-500 truncate">Pro Plan</div>
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Backdrop for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-zinc-950 relative">
          {/* Desktop Header */}
          <header className="hidden lg:flex items-center justify-between px-8 py-6 sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100 capitalize">
                {NAV_ITEMS.find(i => i.id === activeTab)?.label}
              </h1>
              <p className="text-sm text-zinc-400 mt-1 first-letter:capitalize">{formattedDate}</p>
            </div>
            
            <div className="flex items-center gap-4">
              {onToggleFocusMode ? (
                <button
                  onClick={onToggleFocusMode}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                >
                  {isFocusMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {isFocusMode ? 'Tryb pełny' : 'Focus'}
                </button>
              ) : null}
              {onOpenCommandPalette ? (
                <button
                  onClick={onOpenCommandPalette}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                >
                  <Command className="h-4 w-4" />
                  Komendy
                </button>
              ) : null}
              <div className="relative group">
                <Search className="w-5 h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-emerald-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Szukaj..." 
                  className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-full pl-10 pr-4 py-2 w-64 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                />
              </div>
              <button className="relative p-2 hover:bg-zinc-800 rounded-full transition-colors">
                <Bell className="w-5 h-5 text-zinc-400" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-zinc-950"></span>
              </button>
            </div>
          </header>

          <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
