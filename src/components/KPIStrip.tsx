import { motion } from 'motion/react';
import { TrendingUp, AlertCircle, CheckCircle2, Activity } from 'lucide-react';
import { KPI } from '../types';

interface KPIStripProps {
  data: KPI | null;
  isLoading: boolean;
}

export default function KPIStrip({ data, isLoading }: KPIStripProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-zinc-900/50 rounded-2xl animate-pulse border border-zinc-800" />
        ))}
      </div>
    );
  }

  const items = [
    {
      label: 'Egzekucja Dnia',
      value: `${data.dailyExecutionPct}%`,
      subtext: 'Zadań wykonanych',
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    },
    {
      label: 'Momentum Tygodnia',
      value: `${data.weeklyMomentumPct}%`,
      subtext: 'Postęp celów',
      icon: TrendingUp,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20'
    },
    {
      label: 'Zaległe',
      value: data.overdueCount,
      subtext: 'Wymaga uwagi',
      icon: AlertCircle,
      color: data.overdueCount > 0 ? 'text-rose-500' : 'text-zinc-500',
      bg: data.overdueCount > 0 ? 'bg-rose-500/10' : 'bg-zinc-800/50',
      border: data.overdueCount > 0 ? 'border-rose-500/20' : 'border-zinc-800'
    },
    {
      label: 'Nawyki',
      value: `${data.habitsConsistencyPct}%`,
      subtext: 'Spójność',
      icon: Activity,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`p-5 rounded-2xl bg-zinc-900/50 border ${item.border} backdrop-blur-sm relative overflow-hidden group hover:bg-zinc-900 transition-colors`}
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            {/* Sparkline placeholder */}
            <div className="h-8 w-16 opacity-30">
               <svg viewBox="0 0 40 20" className={item.color}>
                 <path d="M0 15 Q10 5 20 10 T40 5" fill="none" stroke="currentColor" strokeWidth="2" />
               </svg>
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-zinc-100 tracking-tight">{item.value}</div>
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-1">{item.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
