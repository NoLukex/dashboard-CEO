import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Clock, AlertTriangle, MoreHorizontal, Plus } from 'lucide-react';
import { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: number, status: string) => void;
  title: string;
  type: 'today' | 'overdue';
}

export default function TaskList({ tasks, onToggle, title, type }: TaskListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    // Optimistic update would go here, but for now we just rely on parent refresh or simple fetch
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTaskTitle,
        priority: 'medium',
        due_date: new Date().toISOString().split('T')[0]
      })
    });
    
    setNewTaskTitle('');
    setIsAdding(false);
    // Trigger refresh in parent (simplified for this snippet)
    window.dispatchEvent(new Event('refresh-data'));
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className={`font-semibold text-lg ${type === 'overdue' ? 'text-rose-400' : 'text-zinc-100'}`}>
            {title}
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-xs text-zinc-400 font-mono">
            {tasks.length}
          </span>
        </div>
        {type === 'today' && (
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-emerald-500 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isAdding && (
          <form onSubmit={handleAdd} className="p-2 mb-2">
            <input
              autoFocus
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Co masz do zrobienia?"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
              onBlur={() => !newTaskTitle && setIsAdding(false)}
            />
          </form>
        )}

        <AnimatePresence mode="popLayout">
          {tasks.length === 0 && !isAdding ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-40 text-zinc-500"
            >
              <Check className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">Wszystko zrobione</p>
            </motion.div>
          ) : (
            tasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`
                  group flex items-center gap-3 p-3 rounded-xl border border-transparent hover:bg-zinc-800/50 transition-colors
                  ${task.status === 'done' ? 'opacity-50' : ''}
                `}
              >
                <button
                  onClick={() => onToggle(task.id, task.status === 'done' ? 'pending' : 'done')}
                  className={`
                    flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all
                    ${task.status === 'done' 
                      ? 'bg-emerald-500 border-emerald-500 text-black' 
                      : 'border-zinc-600 hover:border-emerald-500/50'}
                  `}
                >
                  {task.status === 'done' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${task.status === 'done' ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.priority === 'high' && (
                      <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">Pilne</span>
                    )}
                    {task.project_id && (
                      <span className="text-[10px] text-zinc-500">Projekt #{task.project_id}</span>
                    )}
                  </div>
                </div>

                {type === 'overdue' && (
                  <div className="text-xs text-rose-500 font-mono">
                    {task.due_date.slice(5)}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
