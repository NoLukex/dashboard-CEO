import { useMemo, useState } from 'react';
import { InboxItem } from '../types';

interface InboxPanelProps {
  items: InboxItem[];
  onCreateTaskFromItem: (item: InboxItem) => Promise<void>;
  triageMap: Record<string, 'new' | 'triaged' | 'archived'>;
  onSetTriage: (key: string, value: 'new' | 'triaged' | 'archived') => void;
  onBulkTriage: (keys: string[], value: 'triaged' | 'archived') => void;
}

export default function InboxPanel({ items, onCreateTaskFromItem, triageMap, onSetTriage, onBulkTriage }: InboxPanelProps) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<'all' | 'user' | 'assistant' | 'system'>('all');
  const [triageFilter, setTriageFilter] = useState<'all' | 'new' | 'triaged' | 'archived'>('all');
  const [isCreatingId, setIsCreatingId] = useState('');

  const filtered = useMemo(() => {
    const probe = query.trim().toLowerCase();
    return items.filter((item) => {
      if (role !== 'all' && item.role !== role) return false;
      const key = `${item.source}-${item.id}`;
      const triage = triageMap[key] || 'new';
      if (triageFilter !== 'all' && triage !== triageFilter) return false;
      if (!probe) return true;
      return `${item.category} ${item.content}`.toLowerCase().includes(probe);
    });
  }, [items, query, role, triageFilter, triageMap]);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100">Inbox Telegram</h3>
        <span className="text-xs text-zinc-500">{filtered.length} wpisów</span>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-5">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Szukaj w treści"
          className="md:col-span-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as 'all' | 'user' | 'assistant' | 'system')}
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
        >
          <option value="all">Wszystkie role</option>
          <option value="user">User</option>
          <option value="assistant">Assistant</option>
          <option value="system">System</option>
        </select>
        <select
          value={triageFilter}
          onChange={(event) => setTriageFilter(event.target.value as 'all' | 'new' | 'triaged' | 'archived')}
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
        >
          <option value="all">Status: wszystkie</option>
          <option value="new">Nowe</option>
          <option value="triaged">Przetriagowane</option>
          <option value="archived">Zarchiwizowane</option>
        </select>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onBulkTriage(filtered.map((item) => `${item.source}-${item.id}`), 'triaged')}
            className="rounded-lg border border-zinc-700 px-2 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Bulk triage
          </button>
          <button
            onClick={() => onBulkTriage(filtered.map((item) => `${item.source}-${item.id}`), 'archived')}
            className="rounded-lg border border-zinc-700 px-2 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Bulk archive
          </button>
        </div>
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {filtered.slice(0, 80).map((item) => (
          <div key={`${item.source}-${item.id}`} className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-3">
            <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-500">
              <span>{item.role} · {item.category} · {item.source} · {triageMap[`${item.source}-${item.id}`] || 'new'}</span>
              <span>{item.created_at ? new Date(item.created_at).toLocaleString('pl-PL') : '-'}</span>
            </div>
            <div className="line-clamp-3 text-sm text-zinc-200">{item.content || '(pusty wpis)'}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={() => onSetTriage(`${item.source}-${item.id}`, 'triaged')}
                className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Triage
              </button>
              <button
                onClick={() => onSetTriage(`${item.source}-${item.id}`, 'archived')}
                className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Archiwizuj
              </button>
              {item.role === 'user' ? (
                <button
                  onClick={async () => {
                    setIsCreatingId(item.id);
                    try {
                      await onCreateTaskFromItem(item);
                      onSetTriage(`${item.source}-${item.id}`, 'triaged');
                    } finally {
                      setIsCreatingId('');
                    }
                  }}
                  disabled={isCreatingId === item.id}
                  className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isCreatingId === item.id ? 'Tworzenie...' : 'Zamień na task'}
                </button>
              ) : null}
            </div>
          </div>
        ))}

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-xs text-zinc-500">
            Brak wpisów dla aktualnych filtrów.
          </div>
        ) : null}
      </div>
    </section>
  );
}
