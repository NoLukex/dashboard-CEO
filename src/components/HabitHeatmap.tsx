import { HabitHeatmapCell } from '../types';

interface HabitHeatmapProps {
  data: HabitHeatmapCell[];
}

function cellTone(ratio: number) {
  if (ratio >= 0.95) return 'bg-emerald-400';
  if (ratio >= 0.65) return 'bg-emerald-500/80';
  if (ratio >= 0.35) return 'bg-amber-500/70';
  if (ratio > 0) return 'bg-rose-500/60';
  return 'bg-zinc-800';
}

export default function HabitHeatmap({ data }: HabitHeatmapProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100">Heatmap Nawyków (28 dni)</h3>
        <span className="text-xs text-zinc-500">od najstarszego do dziś</span>
      </div>
      <div className="grid grid-cols-14 gap-1.5">
        {data.map((cell) => (
          <div
            key={cell.date}
            className={`h-5 rounded-sm ${cellTone(cell.ratio)} transition hover:scale-105`}
            title={`${cell.label}: ${cell.completions}/${cell.target}`}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500">
        <span>niska</span>
        <span className="h-2 w-2 rounded-sm bg-zinc-800" />
        <span className="h-2 w-2 rounded-sm bg-rose-500/60" />
        <span className="h-2 w-2 rounded-sm bg-amber-500/70" />
        <span className="h-2 w-2 rounded-sm bg-emerald-400" />
        <span>wysoka</span>
      </div>
    </section>
  );
}
