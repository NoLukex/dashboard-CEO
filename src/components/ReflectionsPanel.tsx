import { MessageCircle, TrendingDown, TrendingUp, WandSparkles } from 'lucide-react';
import { ReflectionItem } from '../types';

interface ReflectionsPanelProps {
  items: ReflectionItem[];
  onCreateTaskFromReflection: (item: ReflectionItem) => Promise<void>;
}

function moodMeta(mood: ReflectionItem['mood']) {
  if (mood === 'positive') return { icon: TrendingUp, tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' };
  if (mood === 'negative') return { icon: TrendingDown, tone: 'text-rose-300 bg-rose-500/10 border-rose-500/30' };
  return { icon: MessageCircle, tone: 'text-zinc-300 bg-zinc-700/30 border-zinc-600' };
}

export default function ReflectionsPanel({ items, onCreateTaskFromReflection }: ReflectionsPanelProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">Przemyslenia i Wzorce</h3>
        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400">
          <WandSparkles className="h-3 w-3" />
          AI synthesis
        </span>
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-700 p-3 text-sm text-zinc-500">
            Brak przemyślen na teraz.
          </div>
        )}

        {items.map((item) => {
          const { icon: Icon, tone } = moodMeta(item.mood);
          return (
            <article key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] uppercase tracking-wider ${tone}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {item.mood}
                  </span>
                  <span className="text-[11px] text-zinc-500">{item.category}</span>
                </div>
                <span className="text-[11px] text-zinc-500">score {item.score}</span>
              </div>
              <p className="text-xs text-zinc-400">{item.excerpt}</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">{item.insight}</p>
              <p className="mt-2 text-xs text-zinc-400">Akcja: {item.suggestedAction}</p>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => onCreateTaskFromReflection(item)}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-emerald-500/50 hover:bg-zinc-800"
                >
                  Zamien na task
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
