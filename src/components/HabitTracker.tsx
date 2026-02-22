import { motion } from 'motion/react';
import { Check, Flame } from 'lucide-react';
import { Habit } from '../types';

interface HabitTrackerProps {
  habits: Habit[];
  onToggle: (id: number) => void;
}

export default function HabitTracker({ habits, onToggle }: HabitTrackerProps) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-zinc-100 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Nawyki
        </h3>
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Dziś</span>
      </div>

      <div className="space-y-3">
        {habits.map((habit) => (
          <div key={habit.id} className="flex items-center justify-between group">
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
              <span className={`text-sm font-medium ${habit.completed_today ? 'text-zinc-300' : 'text-zinc-100'}`}>
                {habit.name}
              </span>
            </div>

            <button
              onClick={() => onToggle(habit.id)}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center transition-all
                ${habit.completed_today 
                  ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                  : 'bg-zinc-800 text-zinc-600 hover:bg-zinc-700'}
              `}
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
