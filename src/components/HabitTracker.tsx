import { motion } from 'motion/react';
import { Check, Flame, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Habit } from '../types';

interface HabitTrackerProps {
  habits: Habit[];
  habitsCatalog: Habit[];
  onToggle: (id: string) => void;
  onCreate: (payload: { name: string; cadence: 'daily' | 'weekly'; target_count: number }) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
}

export default function HabitTracker({ habits, habitsCatalog, onToggle, onCreate, onArchive, onRestore }: HabitTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState('');
  const [cadence, setCadence] = useState<'daily' | 'weekly'>('daily');
  const [target, setTarget] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const archivedHabits = habitsCatalog.filter((habit) => !habit.active);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-zinc-100 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Nawyki
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived((value) => !value)}
            className="rounded-lg border border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-400 hover:bg-zinc-800"
          >
            {showArchived ? 'Ukryj archiwalne' : 'Pokaż archiwalne'}
          </button>
          <button
            onClick={() => setIsAdding((value) => !value)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-emerald-300"
            aria-label="Dodaj nawyk"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-2">
          <div className="text-lg font-semibold text-zinc-100">{habits.length}</div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Aktywne</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-2">
          <div className="text-lg font-semibold text-emerald-300">{habits.filter((habit) => habit.completed_today).length}</div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Dzisiaj</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-2">
          <div className="text-lg font-semibold text-zinc-300">{archivedHabits.length}</div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Archiwalne</div>
        </div>
      </div>

      {isAdding ? (
        <form
          className="mb-4 space-y-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!name.trim()) return;
            setIsSaving(true);
            try {
              await onCreate({
                name: name.trim(),
                cadence,
                target_count: cadence === 'weekly' ? Math.max(1, Math.min(7, target)) : 1,
              });
              setName('');
              setCadence('daily');
              setTarget(1);
              setIsAdding(false);
            } finally {
              setIsSaving(false);
            }
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nazwa nawyku"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={cadence}
              onChange={(event) => setCadence(event.target.value as 'daily' | 'weekly')}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="daily">Codziennie</option>
              <option value="weekly">Tygodniowo</option>
            </select>
            <input
              type="number"
              min={1}
              max={7}
              value={target}
              onChange={(event) => setTarget(Number(event.target.value || 1))}
              disabled={cadence === 'daily'}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isSaving || !name.trim()}
            className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            {isSaving ? 'Zapisywanie...' : 'Dodaj nawyk'}
          </button>
        </form>
      ) : null}

      <div className="space-y-3">
        {habits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-3 text-xs text-zinc-500">
            Brak aktywnych nawyków dla tego użytkownika. Dodaj pierwszy nawyk lub sprawdź APP_USER_ID.
          </div>
        ) : null}
        {habits.map((habit) => (
          <div key={habit.id} className="flex items-center justify-between group rounded-xl border border-zinc-800/60 bg-zinc-950/40 px-3 py-2">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${habit.completed_today ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>
                <motion.div
                  initial={false}
                  animate={{ scale: habit.completed_today ? 1.1 : 1 }}
                >
                   {/* Icon placeholder based on name or generic */}
                   <div className="w-4 h-4 rounded-full border-2 border-current" />
                </motion.div>
              </div>
              <div>
                <span className={`text-sm font-medium ${habit.completed_today ? 'text-zinc-300' : 'text-zinc-100'}`}>
                  {habit.name}
                </span>
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {habit.cadence === 'weekly' ? `Tygodniowo: ${habit.completions_week}/${habit.target_count}` : `Streak: ${habit.streak_days} dni`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggle(habit.id)}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-all
                  ${habit.completed_today 
                    ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                    : 'bg-zinc-800 text-zinc-600 hover:bg-zinc-700'}
                `}
                aria-label="Odhacz nawyk"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => onArchive(habit.id)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-800 text-zinc-500 hover:bg-rose-900/30 hover:text-rose-300"
                aria-label="Archiwizuj nawyk"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {showArchived ? (
          <div className="mt-2 space-y-2 border-t border-zinc-800 pt-3">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">Archiwalne</div>
            {archivedHabits.length === 0 ? (
              <div className="text-xs text-zinc-600">Brak archiwalnych nawyków.</div>
            ) : archivedHabits.map((habit) => (
              <div key={habit.id} className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-950/40 px-3 py-2">
                <div className="text-sm text-zinc-400">{habit.name}</div>
                <button
                  onClick={() => onRestore(habit.id)}
                  className="rounded-lg border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                >
                  Przywróć
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
