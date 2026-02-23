import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

type CommandAction = {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  actions: CommandAction[];
}

export default function CommandPalette({ open, onClose, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((action) => `${action.label} ${action.hint || ''}`.toLowerCase().includes(q));
  }, [actions, query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive((idx) => Math.min(filtered.length - 1, idx + 1));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive((idx) => Math.max(0, idx - 1));
      }
      if (event.key === 'Enter') {
        const item = filtered[active];
        if (!item) return;
        item.run();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, filtered, active]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto mt-24 w-[min(680px,92vw)] rounded-2xl border border-zinc-700 bg-zinc-900/95 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
          <Search className="h-4.5 w-4.5 text-zinc-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            className="w-full bg-transparent text-sm text-zinc-100 outline-none"
            placeholder="Wpisz komendę..."
          />
        </div>
        <div className="max-h-80 overflow-auto p-2">
          {filtered.length === 0 ? (
            <div className="rounded-xl p-3 text-sm text-zinc-500">Brak wyników</div>
          ) : (
            filtered.map((item, index) => (
              <button
                key={item.id}
                onClick={() => {
                  item.run();
                  onClose();
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                  index === active
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <span>{item.label}</span>
                {item.hint ? <span className="text-xs text-zinc-500">{item.hint}</span> : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
