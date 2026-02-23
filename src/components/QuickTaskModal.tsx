import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CreateTaskPayload, Project } from '../types';

interface QuickTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTaskPayload) => Promise<void>;
  projects: Project[];
}

export default function QuickTaskModal({ open, onClose, onSubmit, projects }: QuickTaskModalProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [projectId, setProjectId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDueDate(new Date().toISOString().slice(0, 10));
      setPriority('medium');
      setProjectId('');
      setIsSaving(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto mt-20 w-[min(620px,92vw)] rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-100">Szybkie dodanie zadania</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200" aria-label="Zamknij">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!title.trim()) return;
            setIsSaving(true);
            try {
              await onSubmit({
                title: title.trim(),
                due_date: dueDate,
                priority,
                project_id: projectId || null,
              });
              onClose();
            } finally {
              setIsSaving(false);
            }
          }}
        >
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nazwa zadania"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
          />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
            />
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as 'high' | 'medium' | 'low')}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
            >
              <option value="high">Wysoki priorytet</option>
              <option value="medium">Średni priorytet</option>
              <option value="low">Niski priorytet</option>
            </select>
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
            >
              <option value="">Bez projektu</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!title.trim() || isSaving}
            className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Zapisywanie...' : 'Dodaj zadanie'}
          </button>
        </form>
      </div>
    </div>
  );
}
