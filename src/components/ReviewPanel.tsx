import { useEffect, useState } from 'react';
import { DailyReview } from '../types';

interface ReviewPanelProps {
  value: DailyReview | null;
  onSave: (payload: { review_date?: string; summary: string; tomorrow_plan: string }) => Promise<void>;
  onCopilotGenerate?: () => Promise<{ summary: string; tomorrow_plan: string }>;
}

export default function ReviewPanel({ value, onSave, onCopilotGenerate }: ReviewPanelProps) {
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setReviewDate(value?.review_date || new Date().toISOString().slice(0, 10));
    setSummary(value?.summary || '');
    setTomorrowPlan(value?.tomorrow_plan || '');
  }, [value]);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">Daily / Weekly Review</h3>
          <p className="text-xs text-zinc-500">Domknij dzień i zaplanuj jutro bez przełączania narzędzi.</p>
        </div>
        <input
          type="date"
          value={reviewDate}
          onChange={(event) => setReviewDate(event.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Co dziś zadziałało</span>
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={6}
            placeholder="Najważniejsze domknięcia, bottlenecks i decyzje"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Plan na jutro</span>
          <textarea
            value={tomorrowPlan}
            onChange={(event) => setTomorrowPlan(event.target.value)}
            rows={6}
            placeholder="Top 3 priorytety + pierwszy blok focus"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        {onCopilotGenerate ? (
          <button
            onClick={async () => {
              setIsGenerating(true);
              setStatus('');
              try {
                const draft = await onCopilotGenerate();
                setSummary(draft.summary || '');
                setTomorrowPlan(draft.tomorrow_plan || '');
                setStatus('Wygenerowano draft review.');
              } catch {
                setStatus('Nie udało się wygenerować draftu.');
              } finally {
                setIsGenerating(false);
              }
            }}
            disabled={isGenerating || isSaving}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? 'Generowanie...' : 'Copilot draft'}
          </button>
        ) : null}
        <button
          onClick={async () => {
            setIsSaving(true);
            setStatus('');
            try {
              await onSave({ review_date: reviewDate, summary, tomorrow_plan: tomorrowPlan });
              setStatus('Zapisano review.');
            } catch {
              setStatus('Nie udało się zapisać review.');
            } finally {
              setIsSaving(false);
            }
          }}
          disabled={isSaving || isGenerating || (!summary.trim() && !tomorrowPlan.trim())}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Zapisywanie...' : 'Zapisz review'}
        </button>
        {status ? <span className="text-xs text-zinc-400">{status}</span> : null}
      </div>
    </section>
  );
}
