import { OpsSnapshot } from '../types';

interface OpsPanelProps {
  data: OpsSnapshot;
}

export default function OpsPanel({ data }: OpsPanelProps) {
  const alerts: string[] = [];
  if (data.system.pendingErrors > 0) alerts.push(`System ma ${data.system.pendingErrors} niezamkniętych błędów.`);
  if (data.reminders.failed24h > 0) alerts.push(`Przypomnienia: ${data.reminders.failed24h} błędów w ostatnich 24h.`);
  if (data.reminders.pending > 20) alerts.push(`Kolejka reminderów rośnie (${data.reminders.pending} pending).`);
  if (data.conversation.pendingSignals > 8) alerts.push('Wysoki poziom sygnałów odkładania/prokrastynacji w konwersacjach.');
  if (!data.memory.lastIndexedAt) alerts.push('Brak świeżego indeksowania pamięci (memory_chunks).');

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100">Bot Operations</h3>
        <span className="text-xs text-zinc-500">live quality signals</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Conversation 24h</p>
          <p className="mt-1 text-xl font-semibold text-zinc-100">{data.conversation.messages24h}</p>
          <p className="text-xs text-zinc-500">Life events: {data.conversation.lifeEvents24h}</p>
          <p className="text-xs text-amber-300">Pending signals: {data.conversation.pendingSignals}</p>
        </article>

        <article className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Memory</p>
          <p className="mt-1 text-xl font-semibold text-zinc-100">{data.memory.chunkCount}</p>
          <p className="text-xs text-zinc-500">Last index: {data.memory.lastIndexedAt ? new Date(data.memory.lastIndexedAt).toLocaleString('pl-PL') : '-'}</p>
        </article>

        <article className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Reminders</p>
          <p className="mt-1 text-xl font-semibold text-zinc-100">{data.reminders.pending}</p>
          <p className="text-xs text-zinc-500">sending: {data.reminders.sending} · sent24h: {data.reminders.sent24h}</p>
          <p className="text-xs text-rose-300">failed24h: {data.reminders.failed24h}</p>
        </article>

        <article className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">System</p>
          <p className="mt-1 text-xl font-semibold text-zinc-100">{data.system.pendingErrors}</p>
          <p className="text-xs text-zinc-500">errors24h: {data.system.totalErrors24h}</p>
          <p className="line-clamp-1 text-xs text-zinc-400">{data.system.latestError?.module || 'No latest error'}</p>
        </article>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
        <div className="mb-2 text-[11px] uppercase tracking-wider text-zinc-500">Ops Alerts</div>
        {alerts.length === 0 ? (
          <div className="text-xs text-emerald-300">Brak krytycznych alertów operacyjnych.</div>
        ) : (
          <div className="space-y-1">
            {alerts.map((alert) => (
              <div key={alert} className="text-xs text-amber-300">- {alert}</div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500">
        {data.conversation.topCategories.slice(0, 5).map((item) => (
          <span key={item.category} className="rounded-full bg-zinc-800 px-2 py-1">{item.category}: {item.count}</span>
        ))}
        {data.memory.sourceBreakdown.slice(0, 4).map((item) => (
          <span key={item.sourceType} className="rounded-full bg-zinc-800 px-2 py-1">{item.sourceType}: {item.count}</span>
        ))}
      </div>
    </section>
  );
}
