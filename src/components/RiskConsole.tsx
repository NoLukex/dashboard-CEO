import { AlertTriangle, Clock3 } from 'lucide-react';
import { RiskItem } from '../types';

interface RiskConsoleProps {
  items: RiskItem[];
}

function severityBadge(severity: RiskItem['severity']) {
  if (severity === 'high') return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
  if (severity === 'medium') return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
  return 'bg-zinc-700/20 text-zinc-300 border-zinc-600/30';
}

export default function RiskConsole({ items }: RiskConsoleProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4.5 w-4.5 text-rose-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100">Konsola Ryzyka</h3>
        </div>
        <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs font-mono text-zinc-400">{items.length}</span>
      </header>
      <div className="max-h-80 overflow-auto p-2">
        {!items.length ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
            Brak krytycznych ryzyk. Kolejka jest czysta.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="truncate text-sm font-medium text-zinc-100">{item.title}</h4>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${severityBadge(item.severity)}`}>
                    {item.severity}
                  </span>
                </div>
                <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  {item.daysOverdue} dni opóźnienia · termin {item.due_date}
                </div>
                <p className="text-xs text-zinc-400">{item.reason}</p>
                <p className="mt-1 text-xs font-medium text-zinc-300">Akcja: {item.recommendedAction}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
