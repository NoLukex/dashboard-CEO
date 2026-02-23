import { LucideIcon } from 'lucide-react';

export interface Task {
  id: string;
  title: string;
  due_date: string;
  status: 'pending' | 'done' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  project_id?: string | null;
  note?: string | null;
  created_at?: string;
  completed_at?: string | null;
}

export type TaskBulkAction =
  | 'mark_done'
  | 'mark_pending'
  | 'cancel'
  | 'postpone_day'
  | 'postpone_week';

export interface CreateTaskPayload {
  title: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  project_id?: string | null;
}

export interface Habit {
  id: string;
  name: string;
  cadence: 'daily' | 'weekly';
  target_count: number;
  completed_today: boolean;
  active: boolean;
  completions_week: number;
  streak_days: number;
}

export interface ActivityData {
  date: string;
  completed: number;
  total: number;
}

export interface FocusData {
  name: string;
  value: number;
  color: string;
}

export interface MomentumData {
  date: string;
  label: string;
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

export interface KPI {
  dailyExecutionPct: number;
  weeklyMomentumPct: number;
  overdueCount: number;
  habitsConsistencyPct: number;
}

export interface Project {
  id: string;
  name: string;
  status: string;
  deadline: string;
  task_total?: number;
  task_done?: number;
  task_overdue?: number;
  execution_pct?: number;
}

export interface Outcome {
  id: string;
  project_id: string;
  name: string;
  status: string;
  progress: number;
}

export interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string;
}

export interface RiskItem {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  due_date: string;
  daysOverdue: number;
  reason: string;
  recommendedAction: string;
}

export interface DecisionCard {
  id: string;
  title: string;
  insight: string;
  actionLabel: string;
  actionIntent: 'focus' | 'tasks' | 'habits' | 'strategy' | 'review';
  tone: 'good' | 'warn' | 'critical';
}

export interface AdviceItem {
  id: string;
  title: string;
  rationale: string;
  actionLabel: string;
  actionIntent: 'focus' | 'tasks' | 'habits' | 'strategy' | 'review';
  priority: 'high' | 'medium' | 'low';
  horizon: 'today' | 'week';
}

export interface ReflectionItem {
  id: string;
  category: string;
  excerpt: string;
  insight: string;
  suggestedAction: string;
  created_at: string;
  mood: 'positive' | 'neutral' | 'negative';
  score: number;
}

export interface OpsAlert {
  id: string;
  level: 'critical' | 'warn' | 'info';
  title: string;
  detail: string;
  actionIntent: 'focus' | 'tasks' | 'habits' | 'strategy' | 'review';
}

export interface TrendSummary {
  currentWeekExecutionPct: number;
  previousWeekExecutionPct: number;
  deltaExecutionPct: number;
  currentWeekBacklog: number;
  previousWeekBacklog: number;
  deltaBacklog: number;
}

export interface DashboardUiPrefs {
  cockpitSection: 'overview' | 'execution' | 'insights' | 'ops';
  panelPrefs: {
    charts: boolean;
    advice: boolean;
    risk: boolean;
  };
  hiddenAdviceIds: Record<string, boolean>;
  inboxTriage: Record<string, 'new' | 'triaged' | 'archived'>;
}

export interface HabitHeatmapCell {
  date: string;
  label: string;
  completions: number;
  target: number;
  ratio: number;
}

export interface DailyReview {
  review_date: string;
  summary: string;
  tomorrow_plan: string;
  created_at: string;
  updated_at?: string;
}

export interface ConversationSummary {
  messages24h: number;
  lifeEvents24h: number;
  topCategories: Array<{ category: string; count: number }>;
  pendingSignals: number;
}

export interface MemorySummary {
  chunkCount: number;
  sourceBreakdown: Array<{ sourceType: string; count: number }>;
  lastIndexedAt: string;
}

export interface ReminderOpsSummary {
  pending: number;
  sending: number;
  sent24h: number;
  failed24h: number;
  nextDueAt: string;
}

export interface SystemHealthSummary {
  pendingErrors: number;
  totalErrors24h: number;
  latestError: { module: string; message: string; timestamp: string } | null;
}

export interface OpsSnapshot {
  conversation: ConversationSummary;
  memory: MemorySummary;
  reminders: ReminderOpsSummary;
  system: SystemHealthSummary;
}

export interface InboxItem {
  id: string;
  source: 'events' | 'life_events';
  role: 'user' | 'assistant' | 'system';
  category: string;
  content: string;
  created_at: string;
}

export interface DashboardSnapshot {
  overview: KPI;
  tasksToday: Task[];
  tasksWeek: Task[];
  tasksOverdue: Task[];
  habits: Habit[];
  habitsCatalog: Habit[];
  inbox: InboxItem[];
  strategy: { projects: Project[]; outcomes: Outcome[] };
  knowledge: KnowledgeItem[];
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
}

export interface NavItem {
  label: string;
  icon: LucideIcon;
  id: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  kind: 'general' | 'special';
  description: string;
  routingHints: string[];
  allowedTools: string[];
  enabled: boolean;
  soul: string;
  updated_at: string;
}
