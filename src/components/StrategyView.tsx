import { useMemo, useState } from 'react';
import { Project, Outcome } from '../types';

interface StrategyViewProps {
  projects: Project[];
  outcomes: Outcome[];
}

function projectStatusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('done') || normalized.includes('completed')) return 'bg-emerald-500/10 text-emerald-400';
  if (normalized.includes('risk') || normalized.includes('blocked') || normalized.includes('off')) return 'bg-rose-500/10 text-rose-400';
  if (normalized.includes('progress') || normalized.includes('active') || normalized.includes('track')) return 'bg-cyan-500/10 text-cyan-400';
  return 'bg-zinc-800 text-zinc-300';
}

export default function StrategyView({ projects, outcomes }: StrategyViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'risk' | 'done'>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'overdue' | 'next14'>('all');

  const today = new Date().toISOString().slice(0, 10);
  const next14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const status = project.status.toLowerCase();
      const statusPass =
        statusFilter === 'all'
          ? true
          : statusFilter === 'done'
            ? status.includes('done') || status.includes('completed')
            : statusFilter === 'risk'
              ? status.includes('risk') || status.includes('blocked') || status.includes('off')
              : status.includes('active') || status.includes('track') || status.includes('progress');

      const deadline = project.deadline || '';
      const deadlinePass =
        deadlineFilter === 'all'
          ? true
          : deadlineFilter === 'overdue'
            ? Boolean(deadline && deadline < today)
            : Boolean(deadline && deadline >= today && deadline <= next14);

      return statusPass && deadlinePass;
    });
  }, [projects, statusFilter, deadlineFilter, today, next14]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'risk' | 'done')}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200"
        >
          <option value="all">Status: wszystkie</option>
          <option value="active">Status: aktywne</option>
          <option value="risk">Status: at risk</option>
          <option value="done">Status: zakończone</option>
        </select>
        <select
          value={deadlineFilter}
          onChange={(event) => setDeadlineFilter(event.target.value as 'all' | 'overdue' | 'next14')}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200"
        >
          <option value="all">Deadline: wszystkie</option>
          <option value="overdue">Deadline: overdue</option>
          <option value="next14">Deadline: kolejne 14 dni</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-100">Aktywne Projekty</h3>
          <div className="space-y-4">
            {!filteredProjects.length && (
              <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">
                Brak projektów dla aktualnych filtrów.
              </div>
            )}
            {filteredProjects.map((project) => {
              const deadlineTone =
                project.deadline && project.deadline < today
                  ? 'text-rose-400'
                  : project.deadline && project.deadline <= next14
                    ? 'text-amber-400'
                    : 'text-zinc-500';

              return (
                <div key={project.id} className="rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <h4 className="font-medium text-zinc-200">{project.name}</h4>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${projectStatusTone(project.status)}`}>
                      {project.status}
                    </span>
                  </div>

                  <div className={`text-xs ${deadlineTone}`}>Deadline: {project.deadline || 'brak'}</div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
                    <div className="rounded-lg bg-zinc-900 p-2 text-zinc-400">
                      <div className="text-zinc-200">{project.task_total || 0}</div>
                      <div>Tasks</div>
                    </div>
                    <div className="rounded-lg bg-zinc-900 p-2 text-zinc-400">
                      <div className="text-emerald-300">{project.task_done || 0}</div>
                      <div>Done</div>
                    </div>
                    <div className="rounded-lg bg-zinc-900 p-2 text-zinc-400">
                      <div className="text-rose-300">{project.task_overdue || 0}</div>
                      <div>Overdue</div>
                    </div>
                    <div className="rounded-lg bg-zinc-900 p-2 text-zinc-400">
                      <div className="text-cyan-300">{project.execution_pct || 0}%</div>
                      <div>Exec</div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {outcomes.filter((outcome) => outcome.project_id === project.id).map((outcome) => (
                      <div key={outcome.id} className="text-sm">
                        <div className="mb-1 flex justify-between">
                          <span className="text-xs text-zinc-400">{outcome.name}</span>
                          <span className="text-xs font-mono text-zinc-300">{outcome.progress}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className={`h-full rounded-full ${outcome.progress >= 70 ? 'bg-emerald-500' : outcome.progress >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${outcome.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-100">Kluczowe Wyniki (Outcomes)</h3>
          <div className="grid grid-cols-1 gap-3">
            {!outcomes.length && (
              <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">
                Brak outcome'ów. Dodaj wynik kluczowy do każdego projektu.
              </div>
            )}
            {outcomes.map((outcome) => (
              <div key={outcome.id} className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-zinc-800/30">
                <div className={`h-2 w-2 rounded-full ${outcome.progress >= 70 ? 'bg-emerald-500' : outcome.progress >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-zinc-200">{outcome.name}</div>
                  <div className="text-xs text-zinc-500">Projekt #{outcome.project_id.slice(0, 6)}</div>
                </div>
                <div className="text-lg font-bold text-zinc-300">{outcome.progress}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
