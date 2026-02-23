import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MomentumData, TrendSummary } from '../../types';

interface MomentumBacklogChartProps {
  data: MomentumData[];
  trend: TrendSummary;
  rangeDays: 7 | 14 | 30;
  onRangeChange: (days: 7 | 14 | 30) => void;
}

export default function MomentumBacklogChart({ data, trend, rangeDays, onRangeChange }: MomentumBacklogChartProps) {
  const sliced = data.slice(-rangeDays);
  const deltaTone = trend.deltaExecutionPct >= 0 ? 'text-emerald-300' : 'text-rose-300';
  const backlogTone = trend.deltaBacklog <= 0 ? 'text-emerald-300' : 'text-amber-300';

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Momentum i Backlog</h3>
          <p className="text-xs text-zinc-400">Trend wykonania i presji zadan</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={`rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 ${deltaTone}`}>
              Egzekucja WoW: {trend.deltaExecutionPct >= 0 ? '+' : ''}{trend.deltaExecutionPct} pp
            </span>
            <span className={`rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 ${backlogTone}`}>
              Backlog WoW: {trend.deltaBacklog >= 0 ? '+' : ''}{trend.deltaBacklog}
            </span>
          </div>
        </div>
        <div className="inline-flex items-center rounded-xl border border-zinc-700 bg-zinc-950 p-1 text-xs">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => onRangeChange(days as 7 | 14 | 30)}
              className={`rounded-lg px-3 py-1.5 transition ${rangeDays === days ? 'bg-emerald-500 text-zinc-950 font-semibold' : 'text-zinc-300 hover:bg-zinc-800'}`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sliced} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="label" stroke="#71717a" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis stroke="#71717a" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false} width={34} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                borderColor: '#3f3f46',
                borderRadius: '10px',
                color: '#f4f4f5',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Area type="monotone" dataKey="total" stroke="#0ea5e9" fill="url(#gradTotal)" name="Wszystkie" />
            <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2.2} dot={false} name="Done" />
            <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} dot={false} name="Pending" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
