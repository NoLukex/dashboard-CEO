import { Search, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { KnowledgeItem, Project } from '../types';

interface KnowledgeViewProps {
  items: KnowledgeItem[];
  projects: Project[];
  onCreateTaskFromItem: (params: {
    knowledgeId: string;
    due_date?: string;
    priority?: 'high' | 'medium' | 'low';
    project_id?: string | null;
  }) => Promise<void>;
}

export default function KnowledgeView({ items, projects, onCreateTaskFromItem }: KnowledgeViewProps) {
  const [query, setQuery] = useState('');
  const [defaultDueDate, setDefaultDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [defaultPriority, setDefaultPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [savingId, setSavingId] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.category} ${item.title} ${item.content} ${item.tags}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj w bazie wiedzy bota..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-4 pl-12 pr-4 text-zinc-100 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
        </div>
        <input
          type="date"
          value={defaultDueDate}
          onChange={(event) => setDefaultDueDate(event.target.value)}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-200"
        />
        <select
          value={selectedProjectId}
          onChange={(event) => setSelectedProjectId(event.target.value)}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-200"
        >
          <option value="">Task bez projektu</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <select
          value={defaultPriority}
          onChange={(event) => setDefaultPriority(event.target.value as 'high' | 'medium' | 'low')}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-200"
        >
          <option value="high">Priorytet: wysoki</option>
          <option value="medium">Priorytet: średni</option>
          <option value="low">Priorytet: niski</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-zinc-700 p-5 text-sm text-zinc-500">
            Brak wyników dla podanej frazy.
          </div>
        )}
        {filtered.map((item) => (
          <div key={item.id} className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-700">
            <div className="mb-2 text-xs font-mono uppercase tracking-wider text-emerald-500">{item.category}</div>
            <h3 className="mb-2 font-semibold text-zinc-100 transition-colors group-hover:text-emerald-400">{item.title}</h3>
            <p className="mb-4 line-clamp-3 text-sm text-zinc-400">{item.content}</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {String(item.tags || '')
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean)
                .map((tag) => (
                  <span key={tag} className="flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
            </div>
            <button
              onClick={async () => {
                setSavingId(item.id);
                try {
                  await onCreateTaskFromItem({
                    knowledgeId: item.id,
                    due_date: defaultDueDate,
                    priority: defaultPriority,
                    project_id: selectedProjectId || null,
                  });
                } finally {
                  setSavingId('');
                }
              }}
              disabled={savingId === item.id}
              className="w-full rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-emerald-500/50 hover:bg-zinc-800 disabled:opacity-50"
            >
              {savingId === item.id ? 'Tworzenie taska...' : 'Utwórz task z insightu'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
