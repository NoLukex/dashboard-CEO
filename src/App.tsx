import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Brain, Command, Eye, EyeOff, RefreshCcw, ShieldCheck, SquareCheckBig, TrendingUp } from 'lucide-react';
import Layout from './components/Layout';
import KPIStrip from './components/KPIStrip';
import TaskList from './components/TaskList';
import HabitTracker from './components/HabitTracker';
import StrategyView from './components/StrategyView';
import KnowledgeView from './components/KnowledgeView';
import DecisionCards from './components/DecisionCards';
import RiskConsole from './components/RiskConsole';
import HabitHeatmap from './components/HabitHeatmap';
import CommandPalette from './components/CommandPalette';
import ReviewPanel from './components/ReviewPanel';
import QuickTaskModal from './components/QuickTaskModal';
import OpsPanel from './components/OpsPanel';
import InboxPanel from './components/InboxPanel';
import AdvicePanel from './components/AdvicePanel';
import ReflectionsPanel from './components/ReflectionsPanel';
import MomentumBacklogChart from './components/charts/MomentumBacklogChart';
import AlertsBar from './components/AlertsBar';
import AgentsAdminView from './components/AgentsAdminView';
import {
  AdviceItem,
  DashboardUiPrefs,
  OpsAlert,
  ReflectionItem,
  TrendSummary,
  DashboardSnapshot,
  DecisionCard,
  KPI,
  Task,
  Habit,
  Project,
  Outcome,
  KnowledgeItem,
  ActivityData,
  FocusData,
  MomentumData,
  HabitHeatmapCell,
  RiskItem,
  DailyReview,
  OpsSnapshot,
  InboxItem,
  CreateTaskPayload,
  TaskBulkAction,
  AgentProfile,
} from './types';
import {
  archiveHabit,
  createAgent,
  createHabit,
  bulkPatchTasks,
  createTask,
  createTaskFromKnowledge,
  deleteAgent,
  fetchAgentToolsCatalog,
  fetchAgents,
  fetchDashboard,
  generateReviewCopilotDraft,
  patchTask,
  saveUiPrefs,
  saveReview,
  toggleHabit,
  updateAgent,
  restoreHabit,
} from './api';

const ActivityChart = lazy(() => import('./components/charts/ActivityChart'));
const FocusDistribution = lazy(() => import('./components/charts/FocusDistribution'));

type LocalState = {
  kpiData: KPI | null;
  tasksToday: Task[];
  tasksOverdue: Task[];
  tasksWeek: Task[];
  habits: Habit[];
  habitsCatalog: Habit[];
  inbox: InboxItem[];
  strategyData: { projects: Project[]; outcomes: Outcome[] };
  knowledgeItems: KnowledgeItem[];
  activityData: ActivityData[];
  focusData: FocusData[];
  momentumData: MomentumData[];
  habitsHeatmap: HabitHeatmapCell[];
  riskItems: RiskItem[];
  decisionCards: DecisionCard[];
  advice: AdviceItem[];
  reflections: ReflectionItem[];
  alerts: OpsAlert[];
  trendSummary: TrendSummary;
  uiPrefs: DashboardUiPrefs;
  review: DailyReview | null;
  ops: OpsSnapshot;
  generatedAt: string;
};

const INITIAL_STATE: LocalState = {
  kpiData: null,
  tasksToday: [],
  tasksOverdue: [],
  tasksWeek: [],
  habits: [],
  habitsCatalog: [],
  inbox: [],
  strategyData: { projects: [], outcomes: [] },
  knowledgeItems: [],
  activityData: [],
  focusData: [],
  momentumData: [],
  habitsHeatmap: [],
  riskItems: [],
  decisionCards: [],
  advice: [],
  reflections: [],
  alerts: [],
  trendSummary: {
    currentWeekExecutionPct: 0,
    previousWeekExecutionPct: 0,
    deltaExecutionPct: 0,
    currentWeekBacklog: 0,
    previousWeekBacklog: 0,
    deltaBacklog: 0,
  },
  uiPrefs: {
    cockpitSection: 'overview',
    panelPrefs: { charts: true, advice: true, risk: true },
    hiddenAdviceIds: {},
    inboxTriage: {},
  },
  review: null,
  ops: {
    conversation: { messages24h: 0, lifeEvents24h: 0, topCategories: [], pendingSignals: 0 },
    memory: { chunkCount: 0, sourceBreakdown: [], lastIndexedAt: '' },
    reminders: { pending: 0, sending: 0, sent24h: 0, failed24h: 0, nextDueAt: '' },
    system: { pendingErrors: 0, totalErrors24h: 0, latestError: null },
  },
  generatedAt: '',
};

function applySnapshot(snapshot: DashboardSnapshot): LocalState {
  return {
    kpiData: snapshot.overview,
    tasksToday: snapshot.tasksToday,
    tasksOverdue: snapshot.tasksOverdue,
    tasksWeek: snapshot.tasksWeek,
    habits: snapshot.habits,
    habitsCatalog: snapshot.habitsCatalog,
    inbox: snapshot.inbox,
    strategyData: snapshot.strategy,
    knowledgeItems: snapshot.knowledge,
    activityData: snapshot.activityData,
    focusData: snapshot.focusData,
    momentumData: snapshot.momentumData,
    habitsHeatmap: snapshot.habitsHeatmap,
    riskItems: snapshot.riskItems,
    decisionCards: snapshot.decisionCards,
    advice: snapshot.advice,
    reflections: snapshot.reflections,
    alerts: snapshot.alerts,
    trendSummary: snapshot.trendSummary,
    uiPrefs: snapshot.uiPrefs,
    review: snapshot.review,
    ops: snapshot.ops,
    generatedAt: snapshot.generatedAt,
  };
}

function filterAndSortTasks(
  tasks: Task[],
  filters: {
    status: 'all' | Task['status'];
    priority: 'all' | Task['priority'];
    projectId: string;
    sortBy: 'smart' | 'due_date' | 'priority' | 'created_at';
    sortDir: 'asc' | 'desc';
  }
) {
  const priorityRank = (priority: Task['priority']) => (priority === 'high' ? 0 : priority === 'medium' ? 1 : 2);
  const statusRank = (status: Task['status']) => (status === 'pending' ? 0 : status === 'done' ? 1 : 2);
  const dir = filters.sortDir === 'asc' ? 1 : -1;

  const filtered = tasks.filter((task) => {
    if (filters.status !== 'all' && task.status !== filters.status) return false;
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
    if (filters.projectId && task.project_id !== filters.projectId) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (filters.sortBy === 'smart') {
      if (statusRank(a.status) !== statusRank(b.status)) return (statusRank(a.status) - statusRank(b.status)) * dir;
      if (priorityRank(a.priority) !== priorityRank(b.priority)) return (priorityRank(a.priority) - priorityRank(b.priority)) * dir;
      if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date) * dir;
      return a.id.localeCompare(b.id) * dir;
    }
    if (filters.sortBy === 'priority') return (priorityRank(a.priority) - priorityRank(b.priority)) * dir;
    if (filters.sortBy === 'created_at') {
      const aCreated = a.created_at || '';
      const bCreated = b.created_at || '';
      if (aCreated !== bCreated) return aCreated.localeCompare(bCreated) * dir;
      return a.id.localeCompare(b.id) * dir;
    }
    return a.due_date.localeCompare(b.due_date) * dir;
  });

  return sorted;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [state, setState] = useState<LocalState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [trendRangeDays, setTrendRangeDays] = useState<7 | 14 | 30>(14);
  const [cockpitSection, setCockpitSection] = useState<'overview' | 'execution' | 'insights' | 'ops'>('overview');
  const [hiddenAdviceIds, setHiddenAdviceIds] = useState<Record<string, boolean>>({});
  const [panelPrefs, setPanelPrefs] = useState<{ charts: boolean; advice: boolean; risk: boolean }>({ charts: true, advice: true, risk: true });
  const [inboxTriageMap, setInboxTriageMap] = useState<Record<string, 'new' | 'triaged' | 'archived'>>({});
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => window.matchMedia('(max-width: 768px)').matches);
  const refreshTimeoutRef = useRef<number | null>(null);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState('');
  const [agentToolsCatalog, setAgentToolsCatalog] = useState<string[]>([]);

  const [taskFilters, setTaskFilters] = useState<{
    status: 'all' | Task['status'];
    priority: 'all' | Task['priority'];
    projectId: string;
    sortBy: 'smart' | 'due_date' | 'priority' | 'created_at';
    sortDir: 'asc' | 'desc';
  }>({
    status: 'all',
    priority: 'all',
    projectId: '',
    sortBy: 'smart',
    sortDir: 'asc',
  });

  const fetchSnapshot = async () => {
    try {
      setError('');
      const snapshot = await fetchDashboard();
      setState(applySnapshot(snapshot));
      setIsLoading(false);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Błąd ładowania danych');
      setIsLoading(false);
    }
  };

  const fetchAgentsSnapshot = async () => {
    try {
      setAgentsError('');
      setAgentsLoading(true);
      const payload = await fetchAgents();
      setAgents(payload);
    } catch (loadError) {
      setAgentsError(loadError instanceof Error ? loadError.message : 'Blad ladowania agentow');
    } finally {
      setAgentsLoading(false);
    }
  };

  const fetchAgentTools = async () => {
    try {
      const tools = await fetchAgentToolsCatalog();
      setAgentToolsCatalog(tools);
    } catch {
      setAgentToolsCatalog([]);
    }
  };

  const scheduleRefresh = () => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = window.setTimeout(() => {
      fetchSnapshot();
    }, 400);
  };

  useEffect(() => {
    if (!prefsHydrated && state.generatedAt) {
      setCockpitSection(state.uiPrefs.cockpitSection);
      setPanelPrefs(state.uiPrefs.panelPrefs);
      setHiddenAdviceIds(state.uiPrefs.hiddenAdviceIds || {});
      setInboxTriageMap(state.uiPrefs.inboxTriage || {});
      setPrefsHydrated(true);
    }
  }, [prefsHydrated, state.generatedAt, state.uiPrefs]);

  useEffect(() => {
    if (!prefsHydrated) return;
    const timeout = window.setTimeout(() => {
      void saveUiPrefs({
        cockpitSection,
        panelPrefs,
        hiddenAdviceIds,
        inboxTriage: inboxTriageMap,
      }).catch(() => {
        // best-effort sync
      });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [prefsHydrated, cockpitSection, panelPrefs, hiddenAdviceIds, inboxTriageMap]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    fetchSnapshot();

    const polling = window.setInterval(fetchSnapshot, 60_000);
    let unsubscribe = () => {};

    fetch('/api/client-config')
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => {
        if (!config?.supabaseUrl || !config?.anonKey) return;
        const userId = Number(config.userId || 1);
        const client = createClient(String(config.supabaseUrl), String(config.anonKey));
        const channel = client
          .channel('dashboard-live')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'task_items', filter: `user_id=eq.${userId}` }, scheduleRefresh)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions', filter: `user_id=eq.${userId}` }, scheduleRefresh)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_reviews', filter: `user_id=eq.${userId}` }, scheduleRefresh)
          .subscribe();

        unsubscribe = () => {
          client.removeChannel(channel);
        };
      })
      .catch(() => {
        // Ignore realtime config failures; polling fallback stays active.
      });

    const keyHandler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsPaletteOpen(true);
        return;
      }
      if (event.altKey && event.key === '1') setActiveTab('dashboard');
      if (event.altKey && event.key === '2') setActiveTab('tasks');
      if (event.altKey && event.key === '3') setActiveTab('strategy');
      if (event.altKey && event.key === '4') setActiveTab('review');
      if (event.altKey && event.key === '5') setActiveTab('knowledge');
      if (event.altKey && event.key === '6') {
        setActiveTab('agents');
      }
      if (event.altKey && event.key === '7') {
        setActiveTab('dashboard');
        setCockpitSection('overview');
      }
      if (event.altKey && event.key === '8') {
        setActiveTab('dashboard');
        setCockpitSection('execution');
      }
      if (event.altKey && event.key === '9') {
        setActiveTab('dashboard');
        setCockpitSection('insights');
      }
      if (event.altKey && event.key === '0') {
        setActiveTab('dashboard');
        setCockpitSection('ops');
      }
    };
    window.addEventListener('keydown', keyHandler);

    return () => {
      window.clearInterval(polling);
      if (refreshTimeoutRef.current) window.clearTimeout(refreshTimeoutRef.current);
      window.removeEventListener('keydown', keyHandler);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'agents') {
      void fetchAgentsSnapshot();
      void fetchAgentTools();
    }
  }, [activeTab]);

  const handleTaskToggle = async (id: string, status: string) => {
    setState((previous) => ({
      ...previous,
      tasksToday: previous.tasksToday.map((task) => (task.id === id ? { ...task, status: status as Task['status'] } : task)),
      tasksOverdue: previous.tasksOverdue.map((task) => (task.id === id ? { ...task, status: status as Task['status'] } : task)),
      tasksWeek: previous.tasksWeek.map((task) => (task.id === id ? { ...task, status: status as Task['status'] } : task)),
    }));

    await patchTask(id, { status: status as Task['status'] });
    fetchSnapshot();
  };

  const handleBulkAction = async (ids: string[], action: TaskBulkAction) => {
    await bulkPatchTasks(ids, action);
    fetchSnapshot();
  };

  const handleHabitToggle = async (id: string) => {
    setState((previous) => ({
      ...previous,
      habits: previous.habits.map((habit) => (
        habit.id === id
          ? { ...habit, completed_today: !habit.completed_today }
          : habit
      )),
    }));

    await toggleHabit(id);
    fetchSnapshot();
  };

  const handleCreateHabit = async (payload: { name: string; cadence: 'daily' | 'weekly'; target_count: number }) => {
    await createHabit(payload);
    fetchSnapshot();
  };

  const handleArchiveHabit = async (id: string) => {
    await archiveHabit(id);
    fetchSnapshot();
  };

  const handleRestoreHabit = async (id: string) => {
    await restoreHabit(id);
    fetchSnapshot();
  };

  const handleCreateTask = async (payload: CreateTaskPayload) => {
    await createTask(payload);
    fetchSnapshot();
  };

  const handleSaveReview = async (payload: { review_date?: string; summary: string; tomorrow_plan: string }) => {
    await saveReview(payload);
    fetchSnapshot();
  };

  const handleCreateTaskFromKnowledge = async (params: {
    knowledgeId: string;
    due_date?: string;
    priority?: 'high' | 'medium' | 'low';
    project_id?: string | null;
  }) => {
    await createTaskFromKnowledge(params);
    setActiveTab('tasks');
    fetchSnapshot();
  };

  const handleCreateTaskFromInbox = async (item: InboxItem) => {
    const today = new Date().toISOString().slice(0, 10);
    const title = item.content?.trim().slice(0, 180) || `Inbox ${item.id.slice(0, 6)}`;
    await createTask({
      title: `Inbox: ${title}`,
      due_date: today,
      priority: 'medium',
      project_id: null,
    });
    setActiveTab('tasks');
    fetchSnapshot();
  };

  const handleCreateTaskFromReflection = async (item: ReflectionItem) => {
    const today = new Date().toISOString().slice(0, 10);
    const title = item.suggestedAction?.trim() || item.insight?.trim() || item.excerpt?.trim() || 'Task z refleksji';
    await createTask({
      title: `Refleksja: ${title.slice(0, 180)}`,
      due_date: today,
      priority: item.mood === 'negative' ? 'high' : item.mood === 'positive' ? 'low' : 'medium',
      project_id: null,
    });
    setActiveTab('tasks');
    fetchSnapshot();
  };

  const handleCreateTaskFromAdvice = async (item: AdviceItem) => {
    const today = new Date().toISOString().slice(0, 10);
    await createTask({
      title: `Porada: ${item.title.slice(0, 160)}`,
      due_date: item.horizon === 'today' ? today : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      priority: item.priority,
      project_id: null,
    });
    setActiveTab('tasks');
    fetchSnapshot();
  };

  const handleDismissAdvice = (id: string) => {
    setHiddenAdviceIds((prev) => ({ ...prev, [id]: true }));
  };

  const handleGenerateReviewDraft = async () => {
    return generateReviewCopilotDraft();
  };

  const handleSetInboxTriage = (key: string, value: 'new' | 'triaged' | 'archived') => {
    setInboxTriageMap((prev) => ({ ...prev, [key]: value }));
  };

  const handleBulkInboxTriage = (keys: string[], value: 'triaged' | 'archived') => {
    setInboxTriageMap((prev) => {
      const next = { ...prev };
      for (const key of keys) next[key] = value;
      return next;
    });
  };

  const handleCreateAgent = async (payload: Omit<AgentProfile, 'updated_at'>) => {
    await createAgent(payload);
    await fetchAgentsSnapshot();
  };

  const handleUpdateAgent = async (id: string, payload: Omit<AgentProfile, 'updated_at' | 'id'>) => {
    await updateAgent(id, payload);
    await fetchAgentsSnapshot();
  };

  const handleDeleteAgent = async (id: string) => {
    await deleteAgent(id);
    await fetchAgentsSnapshot();
  };

  const jumpTo = (intent: DecisionCard['actionIntent']) => {
    if (intent === 'tasks') {
      setActiveTab('tasks');
      return;
    }
    if (intent === 'strategy') {
      setActiveTab('strategy');
      return;
    }
    if (intent === 'review') {
      setActiveTab('review');
      return;
    }
    setActiveTab('dashboard');
    setCockpitSection('execution');
  };

  const commandActions = useMemo(() => [
    {
      id: 'open-dashboard',
      label: 'Otwórz Cockpit',
      hint: 'Alt+1',
      run: () => setActiveTab('dashboard'),
    },
    {
      id: 'open-tasks',
      label: 'Otwórz Zadania',
      hint: 'Alt+2',
      run: () => setActiveTab('tasks'),
    },
    {
      id: 'open-strategy',
      label: 'Otwórz Strategię',
      hint: 'Alt+3',
      run: () => setActiveTab('strategy'),
    },
    {
      id: 'open-review',
      label: 'Otwórz Review',
      hint: 'Alt+4',
      run: () => setActiveTab('review'),
    },
    {
      id: 'open-agents',
      label: 'Otwórz Agentów',
      hint: 'Alt+6',
      run: () => setActiveTab('agents'),
    },
    {
      id: 'toggle-focus',
      label: isFocusMode ? 'Wyłącz Focus Mode' : 'Włącz Focus Mode',
      run: () => setIsFocusMode((value) => !value),
    },
    {
      id: 'refresh',
      label: 'Odśwież dane',
      run: () => fetchSnapshot(),
    },
    {
      id: 'quick-task',
      label: 'Dodaj zadanie (modal)',
      run: () => setIsQuickTaskOpen(true),
    },
  ], [isFocusMode]);

  const projectOptions = state.strategyData.projects;
  const visibleAdvice = useMemo(() => state.advice.filter((item) => !hiddenAdviceIds[item.id]), [state.advice, hiddenAdviceIds]);
  const tasksToday = useMemo(() => filterAndSortTasks(state.tasksToday, taskFilters), [state.tasksToday, taskFilters]);
  const tasksWeek = useMemo(() => filterAndSortTasks(state.tasksWeek, taskFilters), [state.tasksWeek, taskFilters]);
  const tasksOverdue = useMemo(() => filterAndSortTasks(state.tasksOverdue, taskFilters), [state.tasksOverdue, taskFilters]);

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isFocusMode={isFocusMode}
        onToggleFocusMode={() => setIsFocusMode((value) => !value)}
        onOpenCommandPalette={() => setIsPaletteOpen(true)}
      >
        {activeTab === 'dashboard' && (
          <>
            <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 shadow-[0_24px_60px_rgba(0,0,0,.35)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-100">Executive Command Center</h2>
                  <p className="mt-1 text-sm text-zinc-400">Najpierw decyzje, potem dane. Ostatnia aktualizacja: {state.generatedAt ? new Date(state.generatedAt).toLocaleTimeString('pl-PL') : '--:--'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => fetchSnapshot()}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Odśwież
                  </button>
                  <button
                    onClick={() => setIsQuickTaskOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                  >
                    Nowe zadanie
                  </button>
                  <button
                    onClick={() => setIsFocusMode((value) => !value)}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                  >
                    {isFocusMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {isFocusMode ? 'Tryb pełny' : 'Focus Mode'}
                  </button>
                  <button
                    onClick={() => setIsPaletteOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
                  >
                    <Command className="h-4 w-4" />
                    Komendy
                  </button>
                </div>
              </div>
            </section>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            <KPIStrip data={state.kpiData} isLoading={isLoading} />

            <AlertsBar items={state.alerts} onAction={jumpTo} />

            {isMobile && (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">CEO Lite</div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => {
                      setActiveTab('tasks');
                    }}
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-left text-sm text-zinc-200"
                  >
                    Najważniejsze zadanie: {state.tasksToday.find((t) => t.status === 'pending')?.title || 'Brak'}
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('dashboard');
                      setCockpitSection('ops');
                    }}
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-left text-sm text-zinc-200"
                  >
                    Alert: {state.alerts[0]?.title || 'Brak alertow'}
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('dashboard');
                      setCockpitSection('insights');
                    }}
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-left text-sm text-zinc-200"
                  >
                    Porada: {visibleAdvice[0]?.title || 'Brak porad'}
                  </button>
                </div>
              </section>
            )}

            <section className="sticky top-20 z-10 rounded-2xl border border-zinc-800 bg-zinc-900/85 p-2 backdrop-blur-md">
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <button
                  onClick={() => setCockpitSection('overview')}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${cockpitSection === 'overview' ? 'bg-emerald-500 text-zinc-950' : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}
                >
                  <TrendingUp className="h-4 w-4" />
                  Przeglad
                </button>
                <button
                  onClick={() => setCockpitSection('execution')}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${cockpitSection === 'execution' ? 'bg-emerald-500 text-zinc-950' : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}
                >
                  <SquareCheckBig className="h-4 w-4" />
                  Wykonanie
                </button>
                <button
                  onClick={() => setCockpitSection('insights')}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${cockpitSection === 'insights' ? 'bg-emerald-500 text-zinc-950' : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}
                >
                  <Brain className="h-4 w-4" />
                  Porady i mysli
                </button>
                <button
                  onClick={() => setCockpitSection('ops')}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${cockpitSection === 'ops' ? 'bg-emerald-500 text-zinc-950' : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Ops i inbox
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
                <button
                  onClick={() => setPanelPrefs((prev) => ({ ...prev, charts: !prev.charts }))}
                  className={`rounded-md border px-2 py-1 text-[11px] ${panelPrefs.charts ? 'border-emerald-500/40 text-emerald-300' : 'border-zinc-700 text-zinc-400'}`}
                >
                  Wykresy
                </button>
                <button
                  onClick={() => setPanelPrefs((prev) => ({ ...prev, advice: !prev.advice }))}
                  className={`rounded-md border px-2 py-1 text-[11px] ${panelPrefs.advice ? 'border-emerald-500/40 text-emerald-300' : 'border-zinc-700 text-zinc-400'}`}
                >
                  Porady
                </button>
                <button
                  onClick={() => setPanelPrefs((prev) => ({ ...prev, risk: !prev.risk }))}
                  className={`rounded-md border px-2 py-1 text-[11px] ${panelPrefs.risk ? 'border-emerald-500/40 text-emerald-300' : 'border-zinc-700 text-zinc-400'}`}
                >
                  Ryzyka
                </button>
              </div>
            </section>

            {cockpitSection === 'overview' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="flex flex-col gap-6 lg:col-span-8">
                  {!isFocusMode && <DecisionCards items={state.decisionCards} onAction={jumpTo} />}
                  {!isFocusMode && panelPrefs.charts && (
                    <>
                      <MomentumBacklogChart
                        data={state.momentumData}
                        trend={state.trendSummary}
                        rangeDays={trendRangeDays}
                        onRangeChange={setTrendRangeDays}
                      />
                      <div className="grid h-80 grid-cols-1 gap-6 md:grid-cols-2">
                        <Suspense fallback={<div className="h-full animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />}>
                          <ActivityChart data={state.activityData} />
                        </Suspense>
                        <Suspense fallback={<div className="h-full animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />}>
                          <FocusDistribution data={state.focusData} />
                        </Suspense>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-6 lg:col-span-4">
                  {panelPrefs.advice && (
                    <AdvicePanel
                      items={visibleAdvice}
                      onAction={jumpTo}
                      onCreateTaskFromAdvice={handleCreateTaskFromAdvice}
                      onDismissAdvice={handleDismissAdvice}
                    />
                  )}
                  {!isFocusMode && panelPrefs.risk && <RiskConsole items={state.riskItems} />}
                </div>
              </div>
            )}

            {cockpitSection === 'execution' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="flex flex-col gap-6 lg:col-span-8">
                  <TaskList
                    title="Fokus Dnia"
                    type="today"
                    tasks={state.tasksToday}
                    onToggle={handleTaskToggle}
                    onCreateTask={handleCreateTask}
                    onBulkAction={handleBulkAction}
                    projectOptions={projectOptions}
                  />
                  {!isFocusMode && <HabitHeatmap data={state.habitsHeatmap} />}
                </div>
                <div className="flex flex-col gap-6 lg:col-span-4">
                  <HabitTracker
                    habits={state.habits}
                    habitsCatalog={state.habitsCatalog}
                    onToggle={handleHabitToggle}
                    onCreate={handleCreateHabit}
                    onArchive={handleArchiveHabit}
                    onRestore={handleRestoreHabit}
                  />
                  <TaskList
                    title="Kolejka Krytyczna"
                    type="overdue"
                    tasks={state.tasksOverdue}
                    onToggle={handleTaskToggle}
                    onBulkAction={handleBulkAction}
                  />
                </div>
              </div>
            )}

            {cockpitSection === 'insights' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="flex flex-col gap-6 lg:col-span-8">
                  <ReflectionsPanel items={state.reflections} onCreateTaskFromReflection={handleCreateTaskFromReflection} />
                  <ReviewPanel value={state.review} onSave={handleSaveReview} onCopilotGenerate={handleGenerateReviewDraft} />
                </div>
                <div className="flex flex-col gap-6 lg:col-span-4">
                  <AdvicePanel
                    items={visibleAdvice}
                    onAction={jumpTo}
                    onCreateTaskFromAdvice={handleCreateTaskFromAdvice}
                    onDismissAdvice={handleDismissAdvice}
                  />
                </div>
              </div>
            )}

            {cockpitSection === 'ops' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="flex flex-col gap-6 lg:col-span-8">
                  <OpsPanel data={state.ops} />
                  <InboxPanel
                    items={state.inbox}
                    onCreateTaskFromItem={handleCreateTaskFromInbox}
                    triageMap={inboxTriageMap}
                    onSetTriage={handleSetInboxTriage}
                    onBulkTriage={handleBulkInboxTriage}
                  />
                </div>
                <div className="flex flex-col gap-6 lg:col-span-4">
                  <RiskConsole items={state.riskItems} />
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <section className="grid grid-cols-1 gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 md:grid-cols-5">
              <select
                value={taskFilters.status}
                onChange={(event) => setTaskFilters((prev) => ({ ...prev, status: event.target.value as 'all' | Task['status'] }))}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"
              >
                <option value="all">Status: wszystkie</option>
                <option value="pending">Status: pending</option>
                <option value="done">Status: done</option>
                <option value="cancelled">Status: cancelled</option>
              </select>
              <select
                value={taskFilters.priority}
                onChange={(event) => setTaskFilters((prev) => ({ ...prev, priority: event.target.value as 'all' | Task['priority'] }))}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"
              >
                <option value="all">Priorytet: wszystkie</option>
                <option value="high">Wysoki</option>
                <option value="medium">Średni</option>
                <option value="low">Niski</option>
              </select>
              <select
                value={taskFilters.projectId}
                onChange={(event) => setTaskFilters((prev) => ({ ...prev, projectId: event.target.value }))}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"
              >
                <option value="">Projekt: wszystkie</option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <select
                value={taskFilters.sortBy}
                onChange={(event) => setTaskFilters((prev) => ({ ...prev, sortBy: event.target.value as 'smart' | 'due_date' | 'priority' | 'created_at' }))}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"
              >
                <option value="smart">Sort: smart</option>
                <option value="due_date">Sort: due date</option>
                <option value="priority">Sort: priority</option>
                <option value="created_at">Sort: created</option>
              </select>
              <select
                value={taskFilters.sortDir}
                onChange={(event) => setTaskFilters((prev) => ({ ...prev, sortDir: event.target.value as 'asc' | 'desc' }))}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"
              >
                <option value="asc">Kolejność: rosnąco</option>
                <option value="desc">Kolejność: malejąco</option>
              </select>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <TaskList
                title="Dziś"
                type="today"
                tasks={tasksToday}
                onToggle={handleTaskToggle}
                onCreateTask={handleCreateTask}
                onBulkAction={handleBulkAction}
                projectOptions={projectOptions}
              />
              <TaskList title="Ten tydzień" type="week" tasks={tasksWeek} onToggle={handleTaskToggle} onBulkAction={handleBulkAction} />
              <TaskList title="Zaległe" type="overdue" tasks={tasksOverdue} onToggle={handleTaskToggle} onBulkAction={handleBulkAction} />
            </div>
          </div>
        )}

        {activeTab === 'strategy' && (
          <StrategyView projects={state.strategyData.projects} outcomes={state.strategyData.outcomes} />
        )}

        {activeTab === 'review' && (
          <ReviewPanel value={state.review} onSave={handleSaveReview} onCopilotGenerate={handleGenerateReviewDraft} />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeView
            items={state.knowledgeItems}
            projects={state.strategyData.projects}
            onCreateTaskFromItem={handleCreateTaskFromKnowledge}
          />
        )}

        {activeTab === 'agents' && (
          <AgentsAdminView
            agents={agents}
            toolCatalog={agentToolsCatalog}
            loading={agentsLoading}
            error={agentsError}
            onReload={fetchAgentsSnapshot}
            onCreate={handleCreateAgent}
            onUpdate={handleUpdateAgent}
            onDelete={handleDeleteAgent}
          />
        )}
      </Layout>

      <CommandPalette
        open={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        actions={commandActions}
      />

      <QuickTaskModal
        open={isQuickTaskOpen}
        onClose={() => setIsQuickTaskOpen(false)}
        onSubmit={handleCreateTask}
        projects={projectOptions}
      />
    </>
  );
}
