import { ArrowRight, CalendarClock, Flame, Target } from 'lucide-react';
import { AdviceItem, DecisionCard } from '../types';

interface AdvicePanelProps {
  items: AdviceItem[];
  onAction: (intent: DecisionCard['actionIntent']) => void;
  onCreateTaskFromAdvice: (item: AdviceItem) => Promise<void>;
  onDismissAdvice: (id: string) => void;
}

function priorityTone(priority: AdviceItem['priority']) {
  if (priority === 'high') return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
  if (priority === 'low') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

export default function AdvicePanel({ items, onAction, onCreateTaskFromAdvice, onDismissAdvice }: AdvicePanelProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">Porady Operacyjne</h3>
        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400">
          <Flame className="h-3 w-3" />
          Llama assisted
        </span>
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-700 p-3 text-sm text-zinc-500">
            Brak porad na teraz.
          </div>
        )}

        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-zinc-100">{item.title}</h4>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${priorityTone(item.priority)}`}>
                {item.priority}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">{item.rationale}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                <CalendarClock className="h-3.5 w-3.5" />
                {item.horizon === 'today' ? 'Horyzont: dzisiaj' : 'Horyzont: tydzien'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDismissAdvice(item.id)}
                  className="rounded-lg border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                >
                  Ukryj
                </button>
                <button
                  onClick={() => onCreateTaskFromAdvice(item)}
                  className="rounded-lg border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                >
                  Dodaj task
                </button>
                <button
                  onClick={() => onAction(item.actionIntent)}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 transition hover:border-emerald-500/50 hover:bg-zinc-800"
                >
                  <Target className="h-3.5 w-3.5" />
                  {item.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
