import { motion } from 'motion/react';
import { ArrowRight, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { DecisionCard } from '../types';

interface DecisionCardsProps {
  items: DecisionCard[];
  onAction: (intent: DecisionCard['actionIntent']) => void;
}

type ToneMeta = { border: string; badge: string; icon: typeof CheckCircle2 };

const toneClass: Record<DecisionCard['tone'], ToneMeta> = {
  good: {
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/10 text-emerald-300',
    icon: CheckCircle2,
  },
  warn: {
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-300',
    icon: Sparkles,
  },
  critical: {
    border: 'border-rose-500/40',
    badge: 'bg-rose-500/10 text-rose-300',
    icon: AlertTriangle,
  },
};

export default function DecisionCards({ items, onAction }: DecisionCardsProps) {
  if (!items.length) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {items.map((item, index) => {
        const tone = toneClass[item.tone];
        const Icon = tone.icon;
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className={`rounded-2xl border ${tone.border} bg-zinc-900/60 p-4`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${tone.badge}`}>
                <Icon className="h-3.5 w-3.5" />
                Rekomendacja
              </span>
            </div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-100">{item.title}</h3>
            <p className="mb-4 text-sm leading-relaxed text-zinc-400">{item.insight}</p>
            <button
              onClick={() => onAction(item.actionIntent)}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              {item.actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
