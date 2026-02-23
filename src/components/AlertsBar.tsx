import { AlertTriangle, ArrowRight, Info, Siren } from 'lucide-react';
import { DecisionCard, OpsAlert } from '../types';

interface AlertsBarProps {
  items: OpsAlert[];
  onAction: (intent: DecisionCard['actionIntent']) => void;
}

function styleFor(level: OpsAlert['level']) {
  if (level === 'critical') return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
  if (level === 'warn') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200';
}

function iconFor(level: OpsAlert['level']) {
  if (level === 'critical') return Siren;
  if (level === 'warn') return AlertTriangle;
  return Info;
}

export default function AlertsBar({ items, onAction }: AlertsBarProps) {
  if (!items.length) return null;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Red Alerts</div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        {items.slice(0, 3).map((item) => {
          const Icon = iconFor(item.level);
          return (
            <div key={item.id} className={`rounded-xl border px-3 py-2 ${styleFor(item.level)}`}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider">
                  <Icon className="h-3.5 w-3.5" />
                  {item.level}
                </span>
                <button
                  onClick={() => onAction(item.actionIntent)}
                  className="inline-flex items-center gap-1 rounded-md border border-current/40 px-1.5 py-0.5 text-[10px] hover:bg-black/10"
                >
                  Akcja
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <p className="text-xs font-semibold">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-[11px] opacity-90">{item.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
