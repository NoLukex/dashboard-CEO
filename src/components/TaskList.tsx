import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Plus } from 'lucide-react';
import { CreateTaskPayload, Project, Task, TaskBulkAction } from '../types';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string, status: string) => void;
  onCreateTask?: (payload: CreateTaskPayload) => Promise<void>;
  onBulkAction?: (ids: string[], action: TaskBulkAction) => Promise<void>;
  projectOptions?: Project[];
  title: string;
  type: 'today' | 'overdue' | 'week';
  enableBulk?: boolean;
}

export default function TaskList({
  tasks,
  onToggle,
  onCreateTask,
  onBulkAction,
  projectOptions = [],
  title,
  type,
  enableBulk = true,
}: TaskListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newTaskProjectId, setNewTaskProjectId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectableIds = useMemo(() => tasks.map((task) => task.id), [tasks]);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => selectableIds.includes(id)));
  }, [selectableIds]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    if (!onCreateTask) return;

    await onCreateTask({
      title: newTaskTitle,
      priority: newTaskPriority,
      due_date: newTaskDueDate,
      project_id: newTaskProjectId || null,
    });

    setNewTaskTitle('');
    setNewTaskProjectId('');
    setIsAdding(false);
  };

  const runBulkAction = async (action: TaskBulkAction) => {
    if (!onBulkAction || selectedIds.length === 0) return;
    setIsBulkSaving(true);
    try {
      await onBulkAction(selectedIds, action);
      setSelectedIds([]);
    } finally {
      setIsBulkSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <div className="border-b border-zinc-800 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className={`text-lg font-semibold ${type === 'overdue' ? 'text-rose-400' : 'text-zinc-100'}`}>
              {title}
            </h3>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-400">{tasks.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {type === 'today' && (
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-emerald-500"
                aria-label="Dodaj zadanie"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {enableBulk && onBulkAction ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => {
                if (allSelected) setSelectedIds([]);
                else setSelectedIds(selectableIds);
              }}
              className="rounded-lg border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:bg-zinc-800"
            >
              {allSelected ? 'Odznacz wszystko' : 'Zaznacz wszystko'}
            </button>
            <span className="text-zinc-500">Wybrane: {selectedIds.length}</span>
            <button
              onClick={() => runBulkAction('mark_done')}
              disabled={selectedIds.length === 0 || isBulkSaving}
              className="rounded-lg border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              Zakończ
            </button>
            <button
              onClick={() => runBulkAction('postpone_day')}
              disabled={selectedIds.length === 0 || isBulkSaving}
              className="rounded-lg border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              +1 dzień
            </button>
            <button
              onClick={() => runBulkAction('postpone_week')}
              disabled={selectedIds.length === 0 || isBulkSaving}
              className="rounded-lg border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              +1 tydzień
            </button>
            <button
              onClick={() => runBulkAction('cancel')}
              disabled={selectedIds.length === 0 || isBulkSaving}
              className="rounded-lg border border-rose-900/60 px-2.5 py-1 text-rose-300 hover:bg-rose-900/20 disabled:opacity-40"
            >
              Anuluj
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {isAdding && (
          <form onSubmit={handleAdd} className="mb-2 space-y-2 p-2">
            <input
              autoFocus
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Co masz do zrobienia?"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              onBlur={() => !newTaskTitle && setIsAdding(false)}
            />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as 'high' | 'medium' | 'low')}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
              >
                <option value="high">Wysoki</option>
                <option value="medium">Średni</option>
                <option value="low">Niski</option>
              </select>
              <select
                value={newTaskProjectId}
                onChange={(e) => setNewTaskProjectId(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
              >
                <option value="">Bez projektu</option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              Dodaj zadanie
            </button>
          </form>
        )}

        <AnimatePresence mode="popLayout">
          {tasks.length === 0 && !isAdding ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-40 flex-col items-center justify-center text-zinc-500"
            >
              <Check className="mb-2 h-8 w-8 opacity-20" />
              <p className="text-sm">Wszystko zrobione</p>
            </motion.div>
          ) : (
            tasks.map((task) => {
              const selected = selectedIds.includes(task.id);
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    selected ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-transparent hover:bg-zinc-800/50'
                  } ${task.status === 'done' ? 'opacity-50' : ''}`}
                >
                  {enableBulk ? (
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) => {
                        if (event.target.checked) setSelectedIds((prev) => [...prev, task.id]);
                        else setSelectedIds((prev) => prev.filter((id) => id !== task.id));
                      }}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-emerald-500"
                    />
                  ) : null}

                  <button
                    onClick={() => onToggle(task.id, task.status === 'done' ? 'pending' : 'done')}
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-all ${
                      task.status === 'done'
                        ? 'border-emerald-500 bg-emerald-500 text-black'
                        : 'border-zinc-600 hover:border-emerald-500/50'
                    }`}
                  >
                    {task.status === 'done' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm ${task.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                      {task.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {task.priority === 'high' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Pilne</span>
                      )}
                      {task.project_id && <span className="text-[10px] text-zinc-500">Projekt</span>}
                    </div>
                  </div>

                  {(type === 'overdue' || type === 'week') && (
                    <div className={`text-xs font-mono ${type === 'overdue' ? 'text-rose-500' : 'text-zinc-500'}`}>
                      {task.due_date.slice(5)}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
