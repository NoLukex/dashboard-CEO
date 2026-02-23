import dotenv from 'dotenv';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'node:fs/promises';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const PORT = Number(process.env.PORT || 3000);
const APP_USER_ID = Number(process.env.APP_USER_ID || process.env.ALLOWED_USER_ID || 1);
const DASHBOARD_TIMEZONE = process.env.DASHBOARD_TIMEZONE || process.env.HABITS_PLANNER_TIMEZONE || 'Europe/Warsaw';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const clientSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const clientSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const DASHBOARD_LLM_MODEL = process.env.DASHBOARD_LLM_MODEL || process.env.NVIDIA_MODEL || 'meta/llama-3.1-405b-instruct';
const DASHBOARD_LLM_ENABLED = (process.env.DASHBOARD_LLM_ENABLED || 'true').toLowerCase() !== 'false';
const DASHBOARD_LLM_TIMEOUT_MS = Number(process.env.DASHBOARD_LLM_TIMEOUT_MS || 15000);

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL and Supabase key (service role or anon).');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type TaskStatus = 'pending' | 'done' | 'cancelled';
type TaskScope = 'today' | 'week' | 'overdue';
type TaskPriority = 'high' | 'medium' | 'low';
type TaskSortBy = 'smart' | 'due_date' | 'priority' | 'created_at';
type TaskSortDirection = 'asc' | 'desc';

type TaskRow = {
  id: string;
  user_id: number;
  title: string;
  due_date: string;
  status: TaskStatus;
  priority?: TaskPriority | null;
  project_id?: string | null;
  note: string | null;
  created_at: string;
  completed_at: string | null;
};

type TaskDto = {
  id: string;
  user_id: number;
  title: string;
  due_date: string;
  status: TaskStatus;
  priority: TaskPriority;
  project_id?: string | null;
  note: string | null;
  created_at: string;
  completed_at: string | null;
};

type HabitDto = {
  id: string;
  name: string;
  cadence: 'daily' | 'weekly';
  target_count: number;
  completed_today: boolean;
  active: boolean;
  completions_week: number;
  streak_days: number;
};

type KpiDto = {
  dailyExecutionPct: number;
  weeklyMomentumPct: number;
  overdueCount: number;
  habitsConsistencyPct: number;
};

type ActivityPoint = { date: string; completed: number; total: number };
type FocusPoint = { name: string; value: number; color: string };
type HeatmapPoint = { date: string; label: string; completions: number; target: number; ratio: number };
type MomentumPoint = {
  date: string;
  label: string;
  total: number;
  completed: number;
  pending: number;
  overdue: number;
};

type RiskItem = {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  due_date: string;
  daysOverdue: number;
  reason: string;
  recommendedAction: string;
};

type DecisionCard = {
  id: string;
  title: string;
  insight: string;
  actionLabel: string;
  actionIntent: 'focus' | 'tasks' | 'habits' | 'strategy' | 'review';
  tone: 'good' | 'warn' | 'critical';
};

type AdviceItem = {
  id: string;
  title: string;
  rationale: string;
  actionLabel: string;
  actionIntent: 'focus' | 'tasks' | 'habits' | 'strategy' | 'review';
  priority: 'high' | 'medium' | 'low';
  horizon: 'today' | 'week';
};

type ReflectionItem = {
  id: string;
  category: string;
  excerpt: string;
  insight: string;
  suggestedAction: string;
  created_at: string;
  mood: 'positive' | 'neutral' | 'negative';
  score: number;
};

type OpsAlert = {
  id: string;
  level: 'critical' | 'warn' | 'info';
  title: string;
  detail: string;
  actionIntent: 'focus' | 'tasks' | 'habits' | 'strategy' | 'review';
};

type TrendSummary = {
  currentWeekExecutionPct: number;
  previousWeekExecutionPct: number;
  deltaExecutionPct: number;
  currentWeekBacklog: number;
  previousWeekBacklog: number;
  deltaBacklog: number;
};

type DashboardUiPrefsDto = {
  cockpitSection: 'overview' | 'execution' | 'insights' | 'ops';
  panelPrefs: {
    charts: boolean;
    advice: boolean;
    risk: boolean;
  };
  hiddenAdviceIds: Record<string, boolean>;
  inboxTriage: Record<string, 'new' | 'triaged' | 'archived'>;
};

type ProjectDto = {
  id: string;
  name: string;
  status: string;
  deadline: string;
  task_total: number;
  task_done: number;
  task_overdue: number;
  execution_pct: number;
};
type OutcomeDto = { id: string; project_id: string; name: string; status: string; progress: number };
type KnowledgeDto = { id: string; category: string; title: string; content: string; tags: string };
type DailyReviewDto = { review_date: string; summary: string; tomorrow_plan: string; created_at: string; updated_at: string };
type ConversationSummaryDto = {
  messages24h: number;
  lifeEvents24h: number;
  topCategories: Array<{ category: string; count: number }>;
  pendingSignals: number;
};
type MemorySummaryDto = {
  chunkCount: number;
  sourceBreakdown: Array<{ sourceType: string; count: number }>;
  lastIndexedAt: string;
};
type ReminderOpsSummaryDto = {
  pending: number;
  sending: number;
  sent24h: number;
  failed24h: number;
  nextDueAt: string;
};
type SystemHealthSummaryDto = {
  pendingErrors: number;
  totalErrors24h: number;
  latestError: { module: string; message: string; timestamp: string } | null;
};
type OpsSnapshotDto = {
  conversation: ConversationSummaryDto;
  memory: MemorySummaryDto;
  reminders: ReminderOpsSummaryDto;
  system: SystemHealthSummaryDto;
};

type InboxItemDto = {
  id: string;
  source: 'events' | 'life_events';
  role: 'user' | 'assistant' | 'system';
  category: string;
  content: string;
  created_at: string;
};

type DashboardSnapshot = {
  overview: KpiDto;
  tasksToday: TaskDto[];
  tasksWeek: TaskDto[];
  tasksOverdue: TaskDto[];
  habits: HabitDto[];
  habitsCatalog: HabitDto[];
  inbox: InboxItemDto[];
  strategy: { projects: ProjectDto[]; outcomes: OutcomeDto[] };
  knowledge: KnowledgeDto[];
  activityData: ActivityPoint[];
  focusData: FocusPoint[];
  momentumData: MomentumPoint[];
  habitsHeatmap: HeatmapPoint[];
  riskItems: RiskItem[];
  decisionCards: DecisionCard[];
  advice: AdviceItem[];
  reflections: ReflectionItem[];
  alerts: OpsAlert[];
  trendSummary: TrendSummary;
  uiPrefs: DashboardUiPrefsDto;
  review: DailyReviewDto | null;
  ops: OpsSnapshotDto;
  generatedAt: string;
};

type AgentKind = 'general' | 'special';

type AgentProfileDto = {
  id: string;
  name: string;
  kind: AgentKind;
  description: string;
  routingHints: string[];
  allowedTools: string[];
  enabled: boolean;
  soul: string;
  updated_at: string;
};

const scopeSchema = z.enum(['today', 'week', 'overdue']);
const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(240),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  note: z.string().max(2000).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});
const patchTaskSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  status: z.enum(['pending', 'done', 'cancelled']).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  note: z.string().max(2000).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});
const bulkTaskSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1).max(200),
  action: z.enum(['mark_done', 'mark_pending', 'cancel', 'postpone_day', 'postpone_week']),
});
const tasksQuerySchema = z.object({
  scope: z.enum(['today', 'week', 'overdue']).default('today'),
  status: z.enum(['pending', 'done', 'cancelled']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  project_id: z.string().uuid().optional(),
  sort_by: z.enum(['smart', 'due_date', 'priority', 'created_at']).default('smart'),
  sort_dir: z.enum(['asc', 'desc']).default('asc'),
});
const reviewSchema = z.object({
  review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  summary: z.string().trim().max(8000),
  tomorrow_plan: z.string().trim().max(8000),
});
const knowledgeActionSchema = z.object({
  type: z.literal('create_task'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  project_id: z.string().uuid().optional().nullable(),
});
const createHabitSchema = z.object({
  name: z.string().trim().min(1).max(120),
  cadence: z.enum(['daily', 'weekly']).default('daily'),
  target_count: z.number().int().min(1).max(14).default(1),
});
const uiPrefsSchema = z.object({
  cockpitSection: z.enum(['overview', 'execution', 'insights', 'ops']),
  panelPrefs: z.object({
    charts: z.boolean(),
    advice: z.boolean(),
    risk: z.boolean(),
  }),
  hiddenAdviceIds: z.record(z.boolean()).default({}),
  inboxTriage: z.record(z.enum(['new', 'triaged', 'archived'])).default({}),
});

const AGENT_ALLOWED_TOOLS = [
  'get_current_time',
  'search_web',
  'browse_url',
  'push_live_canvas',
  'sessions_list',
  'sessions_history',
  'sessions_send',
  'list_files',
  'read_file',
  'write_file',
  'create_directory',
  'delete_path',
  'search_files',
  'execute_shell_command',
  'analyze_logs',
] as const;
const AGENT_ALLOWED_TOOLS_SET = new Set<string>(AGENT_ALLOWED_TOOLS);

const agentIdSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9_-]+$/i);
const agentProfileSchema = z.object({
  id: agentIdSchema,
  name: z.string().trim().min(1).max(120),
  kind: z.enum(['general', 'special']).default('general'),
  description: z.string().trim().max(2000).default(''),
  routingHints: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  allowedTools: z.array(z.string().trim().min(1).max(120)).max(300).default([])
    .refine((items) => items.every((item) => item === '*' || AGENT_ALLOWED_TOOLS_SET.has(item)), {
      message: `allowedTools zawiera niedozwolone narzedzie. Dozwolone: ${AGENT_ALLOWED_TOOLS.join(', ')}, *`,
    }),
  enabled: z.boolean().default(true),
  soul: z.string().trim().min(1).max(50000),
});

const APP_USER_LINKS_TABLE = process.env.APP_USER_LINKS_TABLE || 'app_user_links';
const DASHBOARD_CACHE_TTL_MS = Number(process.env.DASHBOARD_CACHE_TTL_MS || 10000);
const MUTATION_WINDOW_MS = Number(process.env.MUTATION_WINDOW_MS || 60000);
const MUTATION_LIMIT = Number(process.env.MUTATION_LIMIT || 60);
const PREDEFINED_AGENTS_DIR = process.env.PREDEFINED_AGENTS_DIR || path.resolve(__dirname, '..', 'data', 'agents');

const mutationBuckets = new Map<string, { count: number; resetAt: number }>();
const dashboardCache = new Map<number, { generatedAtMs: number; data: DashboardSnapshot }>();

const CRITICAL_TABLES = [
  'task_items',
  'habit_definitions',
  'habit_completions',
  'daily_reviews',
  'events',
  'life_events',
  'memory_chunks',
  'reminders',
  'system_logs',
];

function normalizeAgentId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-');
}

function agentDirPath(agentId: string): string {
  return path.join(PREDEFINED_AGENTS_DIR, normalizeAgentId(agentId));
}

async function ensureAgentsDir(): Promise<void> {
  await fs.mkdir(PREDEFINED_AGENTS_DIR, { recursive: true });
}

async function readAgentProfileFromDir(directory: string): Promise<AgentProfileDto | null> {
  const manifestPath = path.join(directory, 'agent.json');
  const soulPath = path.join(directory, 'soul.md');

  try {
    const [manifestRaw, soulRaw, stat] = await Promise.all([
      fs.readFile(manifestPath, 'utf8'),
      fs.readFile(soulPath, 'utf8'),
      fs.stat(soulPath),
    ]);

    const parsed = JSON.parse(manifestRaw) as Record<string, unknown>;
    const validated = agentProfileSchema.safeParse({
      id: normalizeAgentId(String(parsed.id || path.basename(directory))),
      name: String(parsed.name || path.basename(directory)),
      kind: parsed.kind,
      description: parsed.description,
      routingHints: parsed.routingHints,
      allowedTools: parsed.allowedTools,
      enabled: parsed.enabled,
      soul: soulRaw,
    });

    if (!validated.success) return null;
    return {
      id: normalizeAgentId(validated.data.id),
      name: validated.data.name,
      kind: validated.data.kind,
      description: validated.data.description,
      routingHints: validated.data.routingHints,
      allowedTools: validated.data.allowedTools,
      enabled: validated.data.enabled,
      soul: validated.data.soul,
      updated_at: stat.mtime.toISOString(),
    };
  } catch {
    return null;
  }
}

async function listAgentProfiles(): Promise<AgentProfileDto[]> {
  await ensureAgentsDir();
  const entries = await fs.readdir(PREDEFINED_AGENTS_DIR, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
  const profiles: AgentProfileDto[] = [];

  for (const dirName of dirs) {
    const profile = await readAgentProfileFromDir(path.join(PREDEFINED_AGENTS_DIR, dirName));
    if (profile) profiles.push(profile);
  }

  return profiles;
}

async function getAgentProfile(agentId: string): Promise<AgentProfileDto | null> {
  const directory = agentDirPath(agentId);
  return readAgentProfileFromDir(directory);
}

async function saveAgentProfile(payload: AgentProfileDto): Promise<AgentProfileDto> {
  await ensureAgentsDir();
  const id = normalizeAgentId(payload.id);
  const directory = agentDirPath(id);
  await fs.mkdir(directory, { recursive: true });

  const manifest = {
    id,
    name: payload.name,
    kind: payload.kind,
    description: payload.description,
    routingHints: payload.routingHints,
    allowedTools: payload.allowedTools,
    enabled: payload.enabled,
  };

  await Promise.all([
    fs.writeFile(path.join(directory, 'agent.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    fs.writeFile(path.join(directory, 'soul.md'), payload.soul, 'utf8'),
  ]);

  const saved = await getAgentProfile(id);
  if (!saved) {
    throw new Error('Failed to save agent profile.');
  }

  return saved;
}

async function removeAgentProfile(agentId: string): Promise<void> {
  const directory = agentDirPath(agentId);
  await fs.rm(directory, { recursive: true, force: true });
}

function apiError(res: express.Response, error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  res.status(status).json({ error: message });
}

function getClientIp(req: express.Request): string {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function shouldRateLimit(req: express.Request): boolean {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return false;
  return req.path.startsWith('/api/');
}

function invalidateDashboardCache(userId: number) {
  dashboardCache.delete(userId);
}

function getCachedDashboard(userId: number): DashboardSnapshot | null {
  const record = dashboardCache.get(userId);
  if (!record) return null;
  if (Date.now() - record.generatedAtMs > DASHBOARD_CACHE_TTL_MS) {
    dashboardCache.delete(userId);
    return null;
  }
  return record.data;
}

function setCachedDashboard(userId: number, data: DashboardSnapshot) {
  dashboardCache.set(userId, { generatedAtMs: Date.now(), data });
}

async function logDashboardEvent(client: SupabaseClient, userId: number, content: string, category = 'DashboardAction') {
  const text = content.trim();
  if (!text) return;
  const payload = {
    user_id: userId,
    content: text.slice(0, 1200),
    category,
    role: 'assistant',
    created_at: new Date().toISOString(),
  };
  const { error } = await client.from('events').insert([payload]);
  if (error && !maybeMissingTable(error)) {
    console.warn('dashboard event logging failed:', error.message || error);
  }
}

async function checkTableAvailability(client: SupabaseClient): Promise<Record<string, 'ok' | 'missing'>> {
  const out: Record<string, 'ok' | 'missing'> = {};
  await Promise.all(CRITICAL_TABLES.map(async (table) => {
    const { error } = await client.from(table).select('*').limit(1);
    out[table] = error && maybeMissingTable(error) ? 'missing' : 'ok';
  }));
  return out;
}

function authHeaderToken(req: express.Request): string {
  const raw = String(req.headers.authorization || '').trim();
  if (!raw.toLowerCase().startsWith('bearer ')) return '';
  return raw.slice(7).trim();
}

async function resolveRequestUserId(req: express.Request): Promise<number | null> {
  const token = authHeaderToken(req);
  if (!token) {
    if (process.env.NODE_ENV !== 'production') return APP_USER_ID;
    return null;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from(APP_USER_LINKS_TABLE)
    .select('app_user_id')
    .eq('auth_uid', userData.user.id)
    .single();

  if (error || !data) {
    return null;
  }

  const mapped = Number((data as any).app_user_id);
  return Number.isFinite(mapped) ? mapped : null;
}

function dateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const d = `${date.getUTCDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDatePartsInZone(date: Date, timezone: string): { year: number; month: number; day: number; weekday: number } {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = dtf.formatToParts(date);
  const bag: Record<string, string> = {};
  for (const part of parts) {
    if (part.type === 'literal') continue;
    bag[part.type] = part.value;
  }
  const weekdays: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    weekday: weekdays[bag.weekday] || 1,
  };
}

function localDateKey(timezone: string, date = new Date()): string {
  const parts = getDatePartsInZone(date, timezone);
  return `${parts.year}-${`${parts.month}`.padStart(2, '0')}-${`${parts.day}`.padStart(2, '0')}`;
}

function parseDateKey(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function shiftDate(baseDateKey: string, days: number): string {
  const date = parseDateKey(baseDateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

function todayUtc(): string {
  return localDateKey(DASHBOARD_TIMEZONE);
}

function weekRangeUtc() {
  const nowKey = todayUtc();
  const parts = getDatePartsInZone(new Date(), DASHBOARD_TIMEZONE);
  const diffToMonday = parts.weekday - 1;
  const monday = parseDateKey(shiftDate(nowKey, -diffToMonday));
  const sunday = new Date(monday.getTime());
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return { from: dateKey(monday), to: dateKey(sunday) };
}

function daysOverdue(today: string, dueDate: string): number {
  const a = parseDateKey(today).getTime();
  const b = parseDateKey(dueDate).getTime();
  return Math.max(0, Math.floor((a - b) / (24 * 60 * 60 * 1000)));
}

function maybeMissingTable(error: unknown): boolean {
  const message = (error as any)?.message || '';
  return typeof message === 'string' && /does not exist|relation .* does not exist|schema cache/i.test(message);
}

function priorityFromNote(note: string | null | undefined): TaskPriority | null {
  if (!note) return null;
  const match = note.match(/\[p:(high|medium|low)\]/i);
  if (!match) return null;
  return match[1].toLowerCase() as TaskPriority;
}

function attachPriorityToNote(priority: TaskPriority, note?: string | null): string {
  const clean = (note || '').replace(/\[p:(high|medium|low)\]/gi, '').trim();
  return clean ? `[p:${priority}] ${clean}` : `[p:${priority}]`;
}

function stripPriorityFromNote(note: string | null): string | null {
  if (!note) return null;
  const clean = note.replace(/\[p:(high|medium|low)\]/gi, '').trim();
  return clean || null;
}

function derivePriority(task: TaskRow, today: string, week: { from: string; to: string }): TaskPriority {
  if (task.priority === 'high' || task.priority === 'medium' || task.priority === 'low') {
    return task.priority;
  }
  const explicit = priorityFromNote(task.note);
  if (explicit) return explicit;
  if (task.status === 'done') return 'low';
  if (task.due_date < today) return 'high';
  if (task.due_date === today) return 'high';
  if (task.due_date >= week.from && task.due_date <= week.to) return 'medium';
  return 'low';
}

function normalizeTask(task: TaskRow, today: string, week: { from: string; to: string }): TaskDto {
  return {
    ...task,
    priority: derivePriority(task, today, week),
    project_id: task.project_id || null,
    note: stripPriorityFromNote(task.note),
  };
}

function taskSort(a: TaskDto, b: TaskDto): number {
  const statusRank = (status: TaskStatus) => (status === 'pending' ? 0 : status === 'done' ? 1 : 2);
  const priorityRank = (priority: TaskPriority) => (priority === 'high' ? 0 : priority === 'medium' ? 1 : 2);
  if (statusRank(a.status) !== statusRank(b.status)) return statusRank(a.status) - statusRank(b.status);
  if (priorityRank(a.priority) !== priorityRank(b.priority)) return priorityRank(a.priority) - priorityRank(b.priority);
  if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
  return a.created_at.localeCompare(b.created_at);
}

type TaskQueryOptions = {
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  sortBy?: TaskSortBy;
  sortDirection?: TaskSortDirection;
};

function sortTasks(tasks: TaskDto[], sortBy: TaskSortBy, direction: TaskSortDirection): TaskDto[] {
  const sorted = [...tasks];
  const dir = direction === 'asc' ? 1 : -1;
  const priorityRank = (priority: TaskPriority) => (priority === 'high' ? 0 : priority === 'medium' ? 1 : 2);

  if (sortBy === 'smart') {
    sorted.sort(taskSort);
    return direction === 'asc' ? sorted : sorted.reverse();
  }

  sorted.sort((a, b) => {
    if (sortBy === 'priority') {
      if (priorityRank(a.priority) !== priorityRank(b.priority)) {
        return (priorityRank(a.priority) - priorityRank(b.priority)) * dir;
      }
      return a.due_date.localeCompare(b.due_date) * dir;
    }
    if (sortBy === 'created_at') {
      return a.created_at.localeCompare(b.created_at) * dir;
    }
    return a.due_date.localeCompare(b.due_date) * dir;
  });

  return sorted;
}

type ReflectionSourceRow = {
  id: string;
  category: string;
  raw_text: string;
  created_at: string;
};

function clipText(value: string, max = 220): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

function detectMood(text: string): 'positive' | 'neutral' | 'negative' {
  const normalized = text.toLowerCase();
  if (/(stres|problem|blad|błąd|zmecz|zmęcz|nie zdaz|nie wyrab|chaos|trudno|opozni|opóźni|frustr|kryzys)/i.test(normalized)) {
    return 'negative';
  }
  if (/(dobrze|sukces|zrobione|postep|postęp|spoko|udalo|udało|jest moc|stabilnie|domkniete|domknięte)/i.test(normalized)) {
    return 'positive';
  }
  return 'neutral';
}

function extractJsonPayload(raw: string): Record<string, any> | null {
  const text = String(raw || '').trim();
  if (!text) return null;

  const direct = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(direct);
  } catch {
    const match = direct.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeActionIntent(value: string): AdviceItem['actionIntent'] {
  const normalized = value.toLowerCase().trim();
  if (normalized === 'focus' || normalized === 'tasks' || normalized === 'habits' || normalized === 'strategy' || normalized === 'review') {
    return normalized;
  }
  return 'tasks';
}

function defaultUiPrefs(): DashboardUiPrefsDto {
  return {
    cockpitSection: 'overview',
    panelPrefs: {
      charts: true,
      advice: true,
      risk: true,
    },
    hiddenAdviceIds: {},
    inboxTriage: {},
  };
}

function normalizeUiPrefs(raw: unknown): DashboardUiPrefsDto {
  const base = defaultUiPrefs();
  const candidate = typeof raw === 'object' && raw ? (raw as Record<string, any>) : {};
  const section = String(candidate.cockpitSection || '');
  const cockpitSection: DashboardUiPrefsDto['cockpitSection'] =
    section === 'execution' || section === 'insights' || section === 'ops' ? section : 'overview';

  const panelPrefsRaw = (candidate.panelPrefs && typeof candidate.panelPrefs === 'object') ? candidate.panelPrefs : {};
  const panelPrefs = {
    charts: panelPrefsRaw.charts !== false,
    advice: panelPrefsRaw.advice !== false,
    risk: panelPrefsRaw.risk !== false,
  };

  const hiddenAdviceIds: Record<string, boolean> = {};
  const hiddenRaw = (candidate.hiddenAdviceIds && typeof candidate.hiddenAdviceIds === 'object') ? candidate.hiddenAdviceIds : {};
  for (const [key, value] of Object.entries(hiddenRaw)) {
    hiddenAdviceIds[String(key)] = Boolean(value);
  }

  const inboxTriage: Record<string, 'new' | 'triaged' | 'archived'> = {};
  const triageRaw = (candidate.inboxTriage && typeof candidate.inboxTriage === 'object') ? candidate.inboxTriage : {};
  for (const [key, value] of Object.entries(triageRaw)) {
    const v = String(value);
    if (v === 'new' || v === 'triaged' || v === 'archived') inboxTriage[String(key)] = v;
  }

  return {
    ...base,
    cockpitSection,
    panelPrefs,
    hiddenAdviceIds,
    inboxTriage,
  };
}

async function loadUserDashboardPrefs(client: SupabaseClient, userId: number): Promise<DashboardUiPrefsDto> {
  const { data, error } = await client
    .from('user_preferences')
    .select('dashboard_prefs')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (maybeMissingTable(error)) return defaultUiPrefs();
    const message = String((error as any)?.message || '');
    if (/dashboard_prefs|column/i.test(message)) return defaultUiPrefs();
    throw new Error(message || 'Failed to load dashboard prefs');
  }

  return normalizeUiPrefs((data as any)?.dashboard_prefs || null);
}

async function saveUserDashboardPrefs(client: SupabaseClient, userId: number, prefs: DashboardUiPrefsDto): Promise<void> {
  const { error } = await client
    .from('user_preferences')
    .upsert(
      [{ user_id: userId, dashboard_prefs: prefs, updated_at: new Date().toISOString() }],
      { onConflict: 'user_id' },
    );

  if (error) {
    if (maybeMissingTable(error)) return;
    const message = String((error as any)?.message || '');
    if (/dashboard_prefs|column/i.test(message)) return;
    throw new Error(message || 'Failed to save dashboard prefs');
  }
}

async function callNvidiaLlamaJson(systemPrompt: string, userPrompt: string): Promise<Record<string, any> | null> {
  if (!DASHBOARD_LLM_ENABLED || !NVIDIA_API_KEY) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(3000, DASHBOARD_LLM_TIMEOUT_MS));

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DASHBOARD_LLM_MODEL,
        temperature: 0.25,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn(`NVIDIA LLM call failed: ${response.status} ${response.statusText} ${body.slice(0, 300)}`);
      return null;
    }

    const payload = await response.json();
    const content = String(payload?.choices?.[0]?.message?.content || '');
    return extractJsonPayload(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('NVIDIA LLM insights unavailable:', message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildRuleBasedAdvice(params: {
  kpi: KpiDto;
  tasksToday: TaskDto[];
  tasksOverdue: TaskDto[];
  habits: HabitDto[];
  pendingSignals: number;
}): AdviceItem[] {
  const pendingToday = params.tasksToday.filter((task) => task.status === 'pending').length;
  const doneToday = params.tasksToday.filter((task) => task.status === 'done').length;
  const habitsDone = params.habits.filter((habit) => habit.completed_today).length;
  const cards: AdviceItem[] = [];

  if (params.tasksOverdue.length > 0) {
    cards.push({
      id: 'rb-overdue',
      title: 'Odetnij źródło poślizgu',
      rationale: `Masz ${params.tasksOverdue.length} zaległych zadań. Największa dźwignia to domknięcie 1-2 najstarszych pozycji.`,
      actionLabel: 'Przejdź do kolejki krytycznej',
      actionIntent: 'tasks',
      priority: params.tasksOverdue.length >= 5 ? 'high' : 'medium',
      horizon: 'today',
    });
  }

  if (pendingToday >= 3) {
    cards.push({
      id: 'rb-focus',
      title: 'Zbij rozproszenie na dziś',
      rationale: `Otwarte dzisiaj: ${pendingToday}. Ustaw 90 minut na jedno zadanie high-impact bez przełączania kontekstu.`,
      actionLabel: 'Otwórz fokus dnia',
      actionIntent: 'focus',
      priority: 'high',
      horizon: 'today',
    });
  }

  if (params.habits.length > 0 && params.kpi.habitsConsistencyPct < 60) {
    cards.push({
      id: 'rb-habits',
      title: 'Odbuduj rytm nawyków',
      rationale: `Nawyki dziś: ${habitsDone}/${params.habits.length}. Podniesienie konsystencji stabilizuje wykonanie tygodnia.`,
      actionLabel: 'Sprawdź nawyki',
      actionIntent: 'habits',
      priority: 'medium',
      horizon: 'week',
    });
  }

  if (params.pendingSignals >= 3) {
    cards.push({
      id: 'rb-review',
      title: 'Domknij pętle decyzyjne',
      rationale: 'W konwersacjach rośnie liczba sygnałów odkładania. Zrób krótki review i przypisz terminy do decyzji.',
      actionLabel: 'Otwórz review',
      actionIntent: 'review',
      priority: 'medium',
      horizon: 'today',
    });
  }

  if (cards.length === 0) {
    cards.push({
      id: 'rb-keep',
      title: 'Utrzymaj tempo',
      rationale: `Dzisiaj domknięte: ${doneToday}. System wygląda stabilnie, utrzymaj rytm i nie zwiększaj liczby równoległych tematów.`,
      actionLabel: 'Przejdź do strategii',
      actionIntent: 'strategy',
      priority: 'low',
      horizon: 'week',
    });
  }

  return cards.slice(0, 5);
}

function buildRuleBasedReflections(rows: ReflectionSourceRow[]): ReflectionItem[] {
  return rows.slice(0, 8).map((row, index) => {
    const mood = detectMood(row.raw_text);
    const score = mood === 'positive' ? 72 : mood === 'negative' ? 38 : 55;
    const insight = mood === 'negative'
      ? 'Wpis sygnalizuje tarcie operacyjne; warto zamienić to na konkretną decyzję lub jedno zadanie naprawcze.'
      : mood === 'positive'
        ? 'Wpis pokazuje działający wzorzec. Utrwal go jako nawyk lub standard tygodnia.'
        : 'Neutralny sygnał. Sprawdź, czy temat wymaga decyzji, terminu albo doprecyzowania.';
    const suggestedAction = mood === 'negative'
      ? 'Dodaj jedno zadanie naprawcze z terminem na dziś/jutro.'
      : mood === 'positive'
        ? 'Dodaj krótką checklistę powtarzalnych kroków i użyj jej ponownie.'
        : 'Zdecyduj: usunąć, oddelegować, czy zaplanować na konkretny dzień.';

    return {
      id: `rb-ref-${index}-${row.id}`,
      category: row.category || 'Refleksja',
      excerpt: clipText(row.raw_text, 180),
      insight,
      suggestedAction,
      created_at: row.created_at,
      mood,
      score,
    };
  });
}

async function loadTasksByScope(
  client: SupabaseClient,
  userId: number,
  scope: TaskScope,
  options: TaskQueryOptions = {}
): Promise<TaskDto[]> {
  const today = todayUtc();
  const week = weekRangeUtc();
  let query = client
    .from('task_items')
    .select('*')
    .eq('user_id', userId);

  if (options.status !== 'cancelled') {
    query = query.neq('status', 'cancelled');
  }

  if (scope === 'today') {
    query = query.eq('due_date', today);
  } else if (scope === 'overdue') {
    query = query.eq('status', 'pending').lt('due_date', today);
  } else {
    query = query.gte('due_date', week.from).lte('due_date', week.to);
  }

  if (options.status) {
    query = query.eq('status', options.status);
  }
  if (options.projectId) {
    query = query.eq('project_id', options.projectId);
  }

  const { data, error } = await query.order('due_date', { ascending: true });
  if (error) throw new Error(error.message);

  const normalized = ((data || []) as TaskRow[])
    .map((row) => normalizeTask(row, today, week))
    .filter((row) => (options.priority ? row.priority === options.priority : true));

  return sortTasks(normalized, options.sortBy || 'smart', options.sortDirection || 'asc');
}

async function loadHabits(client: SupabaseClient, userId: number, includeInactive = false): Promise<HabitDto[]> {
  const today = todayUtc();
  const nextDay = shiftDate(today, 1);
  const week = weekRangeUtc();
  const monthFrom = shiftDate(today, -29);

  let defsQuery = client
    .from('habit_definitions')
    .select('id, name, cadence, target_count, active, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (!includeInactive) {
    defsQuery = defsQuery.eq('active', true);
  }

  const [defsRes, doneRes, recentRes] = await Promise.all([
    defsQuery,
    client
      .from('habit_completions')
      .select('habit_id')
      .eq('user_id', userId)
      .gte('completed_at', `${today}T00:00:00.000Z`)
      .lt('completed_at', `${nextDay}T00:00:00.000Z`),
    client
      .from('habit_completions')
      .select('habit_id, completed_at')
      .eq('user_id', userId)
      .gte('completed_at', `${monthFrom}T00:00:00.000Z`)
      .lt('completed_at', `${nextDay}T00:00:00.000Z`),
  ]);

  if (defsRes.error) throw new Error(defsRes.error.message);
  if (doneRes.error) throw new Error(doneRes.error.message);
  if (recentRes.error) throw new Error(recentRes.error.message);

  const completedSet = new Set((doneRes.data || []).map((row: any) => String(row.habit_id)));

  const weeklyMap = new Map<string, number>();
  const dayMap = new Map<string, Set<string>>();
  for (const row of recentRes.data || []) {
    const habitId = String((row as any).habit_id || '');
    const day = String((row as any).completed_at || '').slice(0, 10);
    if (!habitId || !day) continue;
    if (day >= week.from && day <= week.to) {
      weeklyMap.set(habitId, (weeklyMap.get(habitId) || 0) + 1);
    }
    if (!dayMap.has(habitId)) dayMap.set(habitId, new Set<string>());
    dayMap.get(habitId)!.add(day);
  }

  const streakFor = (habitId: string) => {
    const days = dayMap.get(habitId);
    if (!days) return 0;
    let streak = 0;
    for (let i = 0; i < 60; i += 1) {
      const probe = shiftDate(today, -i);
      if (days.has(probe)) streak += 1;
      else break;
    }
    return streak;
  };

  return (defsRes.data || []).map((habit: any) => ({
    id: String(habit.id),
    name: String(habit.name || ''),
    cadence: habit.cadence === 'weekly' ? 'weekly' : 'daily',
    target_count: Number(habit.target_count || 1),
    completed_today: completedSet.has(String(habit.id)),
    active: Boolean(habit.active),
    completions_week: weeklyMap.get(String(habit.id)) || 0,
    streak_days: streakFor(String(habit.id)),
  }));
}

async function loadInbox(client: SupabaseClient, userId: number): Promise<InboxItemDto[]> {
  const [eventsRes, lifeRes] = await Promise.all([
    client
      .from('events')
      .select('id, role, category, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(80),
    client
      .from('life_events')
      .select('id, category, raw_text, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40),
  ]);

  const events = (eventsRes.data || []).map((row: any) => ({
    id: String(row.id),
    source: 'events' as const,
    role: row.role === 'assistant' ? 'assistant' as const : 'user' as const,
    category: String(row.category || 'Inbox'),
    content: String(row.content || ''),
    created_at: String(row.created_at || ''),
  }));

  const life = (lifeRes.data || []).map((row: any) => ({
    id: String(row.id),
    source: 'life_events' as const,
    role: 'system' as const,
    category: String(row.category || 'life_event'),
    content: String(row.raw_text || ''),
    created_at: String(row.created_at || ''),
  }));

  return [...events, ...life]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 100);
}

async function loadStrategy(client: SupabaseClient, userId: number): Promise<{ projects: ProjectDto[]; outcomes: OutcomeDto[] }> {
  const projects: ProjectDto[] = [];
  const outcomes: OutcomeDto[] = [];

  const projectsRes = await client.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(25);
  if (!projectsRes.error) {
    for (const row of projectsRes.data || []) {
      projects.push({
        id: String((row as any).id),
        name: String((row as any).name || (row as any).Name || 'Projekt'),
        status: String((row as any).status || (row as any).Status || 'active'),
        deadline: String((row as any).deadline || (row as any).due_date || (row as any).DueDate || ''),
        task_total: 0,
        task_done: 0,
        task_overdue: 0,
        execution_pct: 0,
      });
    }
  }

  const projectIds = projects.map((project) => project.id);
  const outcomesRes = projectIds.length
    ? await client.from('outcomes').select('*').in('project_id', projectIds).limit(200)
    : { data: [], error: null };
  if (!outcomesRes.error && Array.isArray(outcomesRes.data)) {
    for (const row of outcomesRes.data || []) {
      const raw = Number((row as any).progress ?? (row as any).KPI ?? 0);
      const progress = raw <= 1 ? Math.round(raw * 100) : Math.max(0, Math.min(100, Math.round(raw)));
      outcomes.push({
        id: String((row as any).id),
        project_id: String((row as any).project_id || (row as any).Project || ''),
        name: String((row as any).name || (row as any).Name || 'Outcome'),
        status: String((row as any).status || (row as any).Status || 'on_track'),
        progress,
      });
    }
  }

  if (projectIds.length > 0) {
    const today = todayUtc();
    const taskStatsRes = await client
      .from('task_items')
      .select('project_id, status, due_date')
      .eq('user_id', userId)
      .in('project_id', projectIds)
      .neq('status', 'cancelled');

    if (!taskStatsRes.error) {
      const map = new Map<string, { total: number; done: number; overdue: number }>();
      for (const projectId of projectIds) {
        map.set(projectId, { total: 0, done: 0, overdue: 0 });
      }

      for (const row of taskStatsRes.data || []) {
        const projectId = String((row as any).project_id || '');
        if (!projectId || !map.has(projectId)) continue;
        const stat = map.get(projectId)!;
        stat.total += 1;
        if ((row as any).status === 'done') stat.done += 1;
        if ((row as any).status === 'pending' && String((row as any).due_date || '') < today) {
          stat.overdue += 1;
        }
      }

      for (const project of projects) {
        const stat = map.get(project.id) || { total: 0, done: 0, overdue: 0 };
        project.task_total = stat.total;
        project.task_done = stat.done;
        project.task_overdue = stat.overdue;
        project.execution_pct = stat.total > 0 ? Math.round((stat.done / stat.total) * 100) : 0;
      }

      for (const outcome of outcomes) {
        const project = projects.find((item) => item.id === outcome.project_id);
        if (!project) continue;
        const weighted = Math.round(outcome.progress * 0.6 + project.execution_pct * 0.4);
        outcome.progress = Math.max(0, Math.min(100, weighted));
      }
    }
  }

  if (projects.length === 0) {
    const today = todayUtc();
    const week = weekRangeUtc();
    const { data: rows } = await client
      .from('task_items')
      .select('status, due_date')
      .eq('user_id', userId)
      .neq('status', 'cancelled')
      .gte('due_date', week.from)
      .lte('due_date', week.to);

    const total = (rows || []).length;
    const done = (rows || []).filter((row: any) => row.status === 'done').length;
    const overdue = (rows || []).filter((row: any) => row.status === 'pending' && String(row.due_date || '') < today).length;
    const execution = total > 0 ? Math.round((done / total) * 100) : 0;

    projects.push({
      id: 'derived-execution',
      name: 'Wykonanie tygodnia (derived)',
      status: overdue > 0 ? 'at_risk' : 'active',
      deadline: week.to,
      task_total: total,
      task_done: done,
      task_overdue: overdue,
      execution_pct: execution,
    });
    outcomes.push({
      id: 'derived-outcome-execution',
      project_id: 'derived-execution',
      name: 'Stabilna egzekucja tygodnia',
      status: execution >= 70 ? 'on_track' : execution >= 40 ? 'at_risk' : 'off_track',
      progress: execution,
    });
  }

  return { projects, outcomes };
}

async function loadKnowledge(client: SupabaseClient, userId: number): Promise<KnowledgeDto[]> {
  const { data, error } = await client
    .from('bot_knowledge')
    .select('*')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .limit(80);
  if (error) {
    if (maybeMissingTable(error)) {
      const fallback = await client
        .from('life_events')
        .select('id, category, raw_text, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(80);
      if (fallback.error) return [];
      return (fallback.data || []).map((row: any) => ({
        id: String(row.id),
        category: String(row.category || 'operacje'),
        title: String((row.raw_text || '').slice(0, 80) || 'Wpis wiedzy'),
        content: String(row.raw_text || ''),
        tags: 'life_event',
      }));
    }
    throw new Error(error.message);
  }

  const normalized = (data || []).map((row: any) => {
    const category = String(row.category || row.source || 'operacje');
    const content = String(row.content || row.fact || '');
    const title = String(row.title || row.name || content.slice(0, 80) || 'Wpis wiedzy');
    const tagsValue = row.tags;
    const tags = Array.isArray(tagsValue)
      ? tagsValue.join(',')
      : String(tagsValue || row.source || '');

    return {
      id: String(row.id),
      category,
      title,
      content,
      tags,
    };
  });

  if (normalized.length > 0) return normalized;

  const fallback = await client
    .from('life_events')
    .select('id, category, raw_text, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(40);
  if (fallback.error) return normalized;
  return (fallback.data || []).map((row: any) => ({
    id: String(row.id),
    category: String(row.category || 'operacje'),
    title: String((row.raw_text || '').slice(0, 80) || 'Wpis wiedzy'),
    content: String(row.raw_text || ''),
    tags: 'life_event',
  }));
}

async function loadReflectionSignals(client: SupabaseClient, userId: number): Promise<ReflectionSourceRow[]> {
  const { data, error } = await client
    .from('life_events')
    .select('id, category, raw_text, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) {
    if (maybeMissingTable(error)) return [];
    throw new Error(error.message);
  }

  return (data || [])
    .map((row: any) => ({
      id: String(row.id || ''),
      category: String(row.category || 'Refleksja'),
      raw_text: String(row.raw_text || '').trim(),
      created_at: String(row.created_at || new Date().toISOString()),
    }))
    .filter((row: ReflectionSourceRow) => row.raw_text.length > 0);
}

async function loadMomentumData(client: SupabaseClient, userId: number, days = 30): Promise<MomentumPoint[]> {
  const rangeDays = Math.max(7, Math.min(60, days));
  const end = todayUtc();
  const start = shiftDate(end, -(rangeDays - 1));

  const { data, error } = await client
    .from('task_items')
    .select('due_date, status')
    .eq('user_id', userId)
    .gte('due_date', start)
    .lte('due_date', end)
    .neq('status', 'cancelled');

  if (error) throw new Error(error.message);

  const daysList: string[] = [];
  for (let i = rangeDays - 1; i >= 0; i -= 1) {
    daysList.push(shiftDate(end, -i));
  }

  const map = new Map<string, { total: number; completed: number; pending: number }>();
  for (const day of daysList) {
    map.set(day, { total: 0, completed: 0, pending: 0 });
  }

  for (const row of data || []) {
    const due = String((row as any).due_date || '');
    if (!map.has(due)) continue;
    const bucket = map.get(due)!;
    bucket.total += 1;
    const status = String((row as any).status || '');
    if (status === 'done') bucket.completed += 1;
    if (status === 'pending') bucket.pending += 1;
  }

  return daysList.map((day) => {
    const bucket = map.get(day) || { total: 0, completed: 0, pending: 0 };
    return {
      date: day,
      label: parseDateKey(day).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
      total: bucket.total,
      completed: bucket.completed,
      pending: bucket.pending,
      overdue: 0,
    };
  });
}

function buildTrendSummary(momentumData: MomentumPoint[]): TrendSummary {
  if (!momentumData.length) {
    return {
      currentWeekExecutionPct: 0,
      previousWeekExecutionPct: 0,
      deltaExecutionPct: 0,
      currentWeekBacklog: 0,
      previousWeekBacklog: 0,
      deltaBacklog: 0,
    };
  }

  const current = momentumData.slice(-7);
  const previous = momentumData.slice(-14, -7);

  const sum = (arr: MomentumPoint[], key: keyof MomentumPoint) => arr.reduce((acc, row) => acc + Number(row[key] || 0), 0);
  const currentTotal = sum(current, 'total');
  const previousTotal = sum(previous, 'total');
  const currentDone = sum(current, 'completed');
  const previousDone = sum(previous, 'completed');
  const currentBacklog = sum(current, 'pending');
  const previousBacklog = sum(previous, 'pending');

  const currentWeekExecutionPct = currentTotal ? Math.round((currentDone / currentTotal) * 100) : 0;
  const previousWeekExecutionPct = previousTotal ? Math.round((previousDone / previousTotal) * 100) : 0;

  return {
    currentWeekExecutionPct,
    previousWeekExecutionPct,
    deltaExecutionPct: currentWeekExecutionPct - previousWeekExecutionPct,
    currentWeekBacklog: currentBacklog,
    previousWeekBacklog: previousBacklog,
    deltaBacklog: currentBacklog - previousBacklog,
  };
}

function buildOperationalAlerts(params: {
  kpi: KpiDto;
  ops: OpsSnapshotDto;
  habits: HabitDto[];
  trend: TrendSummary;
}): OpsAlert[] {
  const alerts: OpsAlert[] = [];
  const habitsDone = params.habits.filter((habit) => habit.completed_today).length;

  if (params.kpi.overdueCount >= 5) {
    alerts.push({
      id: 'alert-overdue',
      level: 'critical',
      title: 'Backlog krytyczny',
      detail: `Zalegle zadania: ${params.kpi.overdueCount}. Potrzebne szybkie przeplanowanie i domkniecie 2 pozycji dzisiaj.`,
      actionIntent: 'tasks',
    });
  }

  if (params.ops.system.pendingErrors > 0 || params.ops.system.totalErrors24h > 0) {
    alerts.push({
      id: 'alert-system',
      level: params.ops.system.pendingErrors > 0 ? 'critical' : 'warn',
      title: 'Bledy systemowe',
      detail: `Pending errors: ${params.ops.system.pendingErrors}, 24h: ${params.ops.system.totalErrors24h}.`,
      actionIntent: 'review',
    });
  }

  if (params.habits.length > 0 && habitsDone === 0) {
    alerts.push({
      id: 'alert-habits',
      level: 'warn',
      title: 'Brak odhaczonych nawykow',
      detail: 'Nie ma jeszcze domknietych nawykow na dzisiaj. Zacznij od najlatwiejszego rytualu.',
      actionIntent: 'habits',
    });
  }

  if (params.trend.deltaExecutionPct < -10) {
    alerts.push({
      id: 'alert-trend',
      level: 'warn',
      title: 'Spadek egzekucji tydzien do tygodnia',
      detail: `Egzekucja spadla o ${Math.abs(params.trend.deltaExecutionPct)} pp. Zmniejsz WIP i wybierz 1 priorytet dzienny.`,
      actionIntent: 'focus',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'alert-green',
      level: 'info',
      title: 'System stabilny',
      detail: 'Brak krytycznych alertow operacyjnych. Utrzymuj tempo i regularny review.',
      actionIntent: 'strategy',
    });
  }

  return alerts.slice(0, 4);
}

async function loadActivityData(client: SupabaseClient, userId: number): Promise<ActivityPoint[]> {
  const days: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    days.push(dateKey(d));
  }

  const { data, error } = await client
    .from('task_items')
    .select('due_date, status')
    .eq('user_id', userId)
    .gte('due_date', days[0])
    .lte('due_date', days[days.length - 1])
    .neq('status', 'cancelled');

  if (error) throw new Error(error.message);

  const bucket = new Map<string, { total: number; done: number }>();
  for (const day of days) bucket.set(day, { total: 0, done: 0 });

  for (const row of data || []) {
    const due = String((row as any).due_date || '');
    const item = bucket.get(due);
    if (!item) continue;
    item.total += 1;
    if ((row as any).status === 'done') item.done += 1;
  }

  return days.map((day) => {
    const item = bucket.get(day) || { total: 0, done: 0 };
    return {
      date: parseDateKey(day).toLocaleDateString('pl-PL', { weekday: 'short' }),
      completed: item.done,
      total: item.total,
    };
  });
}

async function loadFocusData(client: SupabaseClient, userId: number): Promise<FocusPoint[]> {
  const today = todayUtc();
  const week = weekRangeUtc();

  const { data, error } = await client
    .from('task_items')
    .select('due_date, status')
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (error) throw new Error(error.message);

  let overdue = 0;
  let todayCount = 0;
  let weekCount = 0;
  let later = 0;

  for (const row of data || []) {
    const due = String((row as any).due_date || '');
    if (!due) continue;
    if (due < today) overdue += 1;
    else if (due === today) todayCount += 1;
    else if (due >= week.from && due <= week.to) weekCount += 1;
    else later += 1;
  }

  return [
    { name: 'Overdue', value: overdue, color: '#f43f5e' },
    { name: 'Dzisiaj', value: todayCount, color: '#22c55e' },
    { name: 'Tydzień', value: weekCount, color: '#06b6d4' },
    { name: 'Później', value: later, color: '#a78bfa' },
  ];
}

async function loadHabitsHeatmap(client: SupabaseClient, userId: number, activeHabitsCount: number): Promise<HeatmapPoint[]> {
  const dates: string[] = [];
  for (let i = 27; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(dateKey(d));
  }

  const from = dates[0];
  const toExclusive = shiftDate(dates[dates.length - 1], 1);

  const { data, error } = await client
    .from('habit_completions')
    .select('habit_id, completed_at')
    .eq('user_id', userId)
    .gte('completed_at', `${from}T00:00:00.000Z`)
    .lt('completed_at', `${toExclusive}T00:00:00.000Z`);

  if (error) throw new Error(error.message);

  const map = new Map<string, Set<string>>();
  for (const key of dates) map.set(key, new Set<string>());

  for (const row of data || []) {
    const completedAt = String((row as any).completed_at || '');
    const day = completedAt.slice(0, 10);
    if (!map.has(day)) continue;
    map.get(day)!.add(String((row as any).habit_id));
  }

  const target = Math.max(1, activeHabitsCount);
  return dates.map((day) => {
    const completions = map.get(day)?.size || 0;
    return {
      date: day,
      label: parseDateKey(day).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
      completions,
      target,
      ratio: completions / target,
    };
  });
}

function buildOverview(tasksToday: TaskDto[], tasksWeek: TaskDto[], tasksOverdue: TaskDto[], habits: HabitDto[]): KpiDto {
  const todayDone = tasksToday.filter((task) => task.status === 'done').length;
  const weekDone = tasksWeek.filter((task) => task.status === 'done').length;
  const habitsDone = habits.filter((habit) => habit.completed_today).length;

  const dailyExecutionPct = tasksToday.length ? Math.round((todayDone / tasksToday.length) * 100) : 0;
  const tasksWeekPct = tasksWeek.length ? Math.round((weekDone / tasksWeek.length) * 100) : 0;
  const habitsPct = habits.length ? Math.round((habitsDone / habits.length) * 100) : 0;
  const weeklyMomentumPct = Math.round(tasksWeekPct * 0.7 + habitsPct * 0.3);

  return {
    dailyExecutionPct,
    weeklyMomentumPct,
    overdueCount: tasksOverdue.length,
    habitsConsistencyPct: habitsPct,
  };
}

function buildRiskItems(tasksOverdue: TaskDto[]): RiskItem[] {
  const today = todayUtc();

  return tasksOverdue.slice(0, 8).map((task) => {
    const overdue = daysOverdue(today, task.due_date);
    const severity: RiskItem['severity'] = overdue >= 7 ? 'high' : overdue >= 3 ? 'medium' : 'low';
    const reason = overdue >= 7
      ? 'Długi poślizg. Zadanie blokuje wiarygodność planu tygodnia.'
      : overdue >= 3
        ? 'Rosnące opóźnienie. Wymaga przesunięcia lub domknięcia dziś.'
        : 'Nowe opóźnienie. Zareaguj zanim przejdzie w krytyczne.';
    const recommendedAction = severity === 'high'
      ? 'Zredukuj backlog i domknij ten temat jako pierwszy blok dnia.'
      : severity === 'medium'
        ? 'Przypisz slot 30-60 min dzisiaj i oznacz po wykonaniu.'
        : 'Przenieś termin świadomie albo zamknij w szybkim bloku.';

    return {
      id: task.id,
      title: task.title,
      severity,
      due_date: task.due_date,
      daysOverdue: overdue,
      reason,
      recommendedAction,
    };
  });
}

function buildDecisionCards(kpi: KpiDto, tasksToday: TaskDto[], tasksOverdue: TaskDto[], habits: HabitDto[]): DecisionCard[] {
  const pendingToday = tasksToday.filter((task) => task.status === 'pending').length;
  const habitDone = habits.filter((habit) => habit.completed_today).length;

  const cards: DecisionCard[] = [
    {
      id: 'd1',
      title: 'Fokus najbliższych 2 godzin',
      insight: pendingToday > 0
        ? `Masz ${pendingToday} otwarte zadania na dziś. Zacznij od jednego zadania o najwyższym wpływie.`
        : 'Dzisiejsza lista jest domknięta. Możesz przejść do planu tygodnia.',
      actionLabel: 'Przejdź do Fokusu Dnia',
      actionIntent: 'focus',
      tone: pendingToday > 0 ? 'warn' : 'good',
    },
    {
      id: 'd2',
      title: 'Stabilność tygodnia',
      insight: kpi.overdueCount > 0
        ? `W kolejce krytycznej jest ${kpi.overdueCount} zaległych pozycji. To główne ryzyko tygodnia.`
        : 'Brak zaległości. Utrzymaj tempo i nie rozbudowuj listy ponad 3 zadania dziennie.',
      actionLabel: 'Otwórz kolejkę ryzyka',
      actionIntent: 'tasks',
      tone: kpi.overdueCount > 0 ? 'critical' : 'good',
    },
    {
      id: 'd3',
      title: 'Rytm nawyków',
      insight: habits.length
        ? `Nawyki dziś: ${habitDone}/${habits.length}. Konsystencja wpływa na momentum tygodnia.`
        : 'Brak aktywnych nawyków. Dodaj minimum 1 codzienny rytuał.',
      actionLabel: 'Sprawdź nawyki',
      actionIntent: 'habits',
      tone: kpi.habitsConsistencyPct < 50 ? 'warn' : 'good',
    },
  ];

  if (tasksOverdue.length >= 5) {
    cards.push({
      id: 'd4',
      title: 'Tryb odzyskiwania kontroli',
      insight: 'Zaległości przekraczają bezpieczny próg. Wykonaj krótką sesję review i przeplanuj 3 najważniejsze zadania.',
      actionLabel: 'Otwórz Review',
      actionIntent: 'review',
      tone: 'critical',
    });
  }

  return cards;
}

async function buildAdviceAndReflections(params: {
  kpi: KpiDto;
  tasksToday: TaskDto[];
  tasksOverdue: TaskDto[];
  habits: HabitDto[];
  review: DailyReviewDto | null;
  conversation: ConversationSummaryDto;
  reflectionSignals: ReflectionSourceRow[];
}): Promise<{ advice: AdviceItem[]; reflections: ReflectionItem[] }> {
  const fallbackAdvice = buildRuleBasedAdvice({
    kpi: params.kpi,
    tasksToday: params.tasksToday,
    tasksOverdue: params.tasksOverdue,
    habits: params.habits,
    pendingSignals: params.conversation.pendingSignals,
  });
  const fallbackReflections = buildRuleBasedReflections(params.reflectionSignals);

  if (!DASHBOARD_LLM_ENABLED || !NVIDIA_API_KEY) {
    return {
      advice: fallbackAdvice,
      reflections: fallbackReflections,
    };
  }

  const lifeSamples = params.reflectionSignals
    .slice(0, 20)
    .map((row) => ({
      category: row.category,
      text: clipText(row.raw_text, 240),
      created_at: row.created_at,
    }));

  const input = {
    metrics: {
      dailyExecutionPct: params.kpi.dailyExecutionPct,
      weeklyMomentumPct: params.kpi.weeklyMomentumPct,
      overdueCount: params.kpi.overdueCount,
      habitsConsistencyPct: params.kpi.habitsConsistencyPct,
      pendingToday: params.tasksToday.filter((task) => task.status === 'pending').length,
      pendingSignals24h: params.conversation.pendingSignals,
      topCategories24h: params.conversation.topCategories,
    },
    review: params.review
      ? {
          summary: clipText(params.review.summary, 400),
          tomorrow_plan: clipText(params.review.tomorrow_plan, 400),
        }
      : null,
    lifeEvents: lifeSamples,
  };

  const systemPrompt = [
    'Jesteś operacyjnym coachem CEO dashboardu.',
    'Zwracaj WYŁĄCZNIE poprawny JSON bez markdownu i bez komentarzy.',
    'Wygeneruj krótkie, konkretne porady i przemyślenia na podstawie danych wejściowych.',
    'Nie wymyślaj faktów spoza danych wejściowych.',
    'actionIntent musi być jednym z: focus,tasks,habits,strategy,review.',
    'priority: high|medium|low; horizon: today|week; mood: positive|neutral|negative; score: 0-100.',
  ].join(' ');

  const userPrompt = [
    'Zwróć JSON o strukturze:',
    '{',
    '  "advice": [{"title":"...","rationale":"...","actionLabel":"...","actionIntent":"tasks","priority":"high","horizon":"today"}],',
    '  "reflections": [{"category":"...","sourceSnippet":"...","insight":"...","suggestedAction":"...","mood":"neutral","score":60}]',
    '}',
    'Wymagania:',
    '- advice: 3-5 elementów, maksymalnie konkretne.',
    '- reflections: 4-8 elementów, opartych o lifeEvents.',
    '- sourceSnippet ma być krótkim cytatem/parafrazą sygnału.',
    '',
    JSON.stringify(input),
  ].join('\n');

  const raw = await callNvidiaLlamaJson(systemPrompt, userPrompt);
  if (!raw) {
    return {
      advice: fallbackAdvice,
      reflections: fallbackReflections,
    };
  }

  const adviceRaw = Array.isArray(raw.advice) ? raw.advice : [];
  const reflectionsRaw = Array.isArray(raw.reflections) ? raw.reflections : [];

  const advice: AdviceItem[] = adviceRaw
    .map((item: any, index: number) => {
      const priorityRaw = String(item?.priority || '').toLowerCase();
      const horizonRaw = String(item?.horizon || '').toLowerCase();
      const priority: AdviceItem['priority'] = priorityRaw === 'high' ? 'high' : priorityRaw === 'low' ? 'low' : 'medium';
      const horizon: AdviceItem['horizon'] = horizonRaw === 'today' ? 'today' : 'week';
      return {
        id: `ai-adv-${index}`,
        title: clipText(String(item?.title || ''), 120),
        rationale: clipText(String(item?.rationale || ''), 280),
        actionLabel: clipText(String(item?.actionLabel || 'Przejdź do zadań'), 48),
        actionIntent: normalizeActionIntent(String(item?.actionIntent || 'tasks')),
        priority,
        horizon,
      };
    })
    .filter((item: AdviceItem) => item.title.length > 0 && item.rationale.length > 0)
    .slice(0, 5);

  const reflections: ReflectionItem[] = reflectionsRaw
    .map((item: any, index: number) => {
      const moodValue = String(item?.mood || '').toLowerCase();
      const mood: ReflectionItem['mood'] = moodValue === 'positive' || moodValue === 'negative' ? moodValue : 'neutral';
      const scoreRaw = Number(item?.score);
      return {
        id: `ai-ref-${index}`,
        category: clipText(String(item?.category || 'Refleksja'), 60),
        excerpt: clipText(String(item?.sourceSnippet || ''), 180),
        insight: clipText(String(item?.insight || ''), 280),
        suggestedAction: clipText(String(item?.suggestedAction || ''), 180),
        created_at: new Date().toISOString(),
        mood,
        score: Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, Math.round(scoreRaw))) : (mood === 'negative' ? 38 : mood === 'positive' ? 72 : 55),
      };
    })
    .filter((item: ReflectionItem) => item.insight.length > 0)
    .slice(0, 8);

  return {
    advice: advice.length > 0 ? advice : fallbackAdvice,
    reflections: reflections.length > 0 ? reflections : fallbackReflections,
  };
}

async function buildReviewCopilotDraft(params: {
  tasksToday: TaskDto[];
  tasksOverdue: TaskDto[];
  habits: HabitDto[];
  latestReview: DailyReviewDto | null;
  reflectionSignals: ReflectionSourceRow[];
}): Promise<{ summary: string; tomorrow_plan: string }> {
  const todayDone = params.tasksToday.filter((task) => task.status === 'done').length;
  const todayPending = params.tasksToday.filter((task) => task.status === 'pending').length;
  const habitsDone = params.habits.filter((habit) => habit.completed_today).length;

  const fallback = {
    summary: [
      `Dzis zamkniete zadania: ${todayDone}.`,
      `Otwarte na dzis: ${todayPending}.`,
      `Zalegle: ${params.tasksOverdue.length}.`,
      `Nawyki domkniete: ${habitsDone}/${params.habits.length || 0}.`,
    ].join(' '),
    tomorrow_plan: [
      '1) Jedno zadanie strategiczne jako pierwszy blok 90 min.',
      '2) Domknij 1 najstarsza zaleglosc.',
      '3) Odhacz minimum 1 nawyk do godziny 10:00.',
    ].join('\n'),
  };

  if (!DASHBOARD_LLM_ENABLED || !NVIDIA_API_KEY) return fallback;

  const input = {
    tasksToday: params.tasksToday.map((task) => ({ title: task.title, status: task.status, due_date: task.due_date, priority: task.priority })).slice(0, 20),
    tasksOverdue: params.tasksOverdue.map((task) => ({ title: task.title, due_date: task.due_date, priority: task.priority })).slice(0, 12),
    habits: params.habits.map((habit) => ({ name: habit.name, completed_today: habit.completed_today, streak_days: habit.streak_days })).slice(0, 12),
    previousReview: params.latestReview
      ? { summary: clipText(params.latestReview.summary, 500), tomorrow_plan: clipText(params.latestReview.tomorrow_plan, 500) }
      : null,
    reflections: params.reflectionSignals.slice(0, 12).map((row) => ({ category: row.category, text: clipText(row.raw_text, 180) })),
  };

  const prompt = [
    'Zwroc JSON bez markdown: {"summary":"...","tomorrow_plan":"..."}.',
    'summary: 3-5 zdan podsumowania dnia.',
    'tomorrow_plan: 3-6 konkretnych punktow, kazdy w osobnej linii, z naciskiem na wykonanie i redukcje backlogu.',
    JSON.stringify(input),
  ].join('\n');

  const raw = await callNvidiaLlamaJson(
    'Jestes asystentem executive review. Zwracasz tylko poprawny JSON.',
    prompt,
  );

  if (!raw) return fallback;

  const summary = clipText(String(raw.summary || ''), 2000);
  const tomorrowPlan = clipText(String(raw.tomorrow_plan || ''), 3000);
  if (!summary || !tomorrowPlan) return fallback;
  return { summary, tomorrow_plan: tomorrowPlan };
}

async function loadLatestReview(client: SupabaseClient, userId: number): Promise<DailyReviewDto | null> {
  const { data, error } = await client
    .from('daily_reviews')
    .select('review_date, summary, tomorrow_plan, created_at, updated_at')
    .eq('user_id', userId)
    .order('review_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (maybeMissingTable(error)) return null;
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    review_date: String((data as any).review_date || ''),
    summary: String((data as any).summary || ''),
    tomorrow_plan: String((data as any).tomorrow_plan || ''),
    created_at: String((data as any).created_at || new Date().toISOString()),
    updated_at: String((data as any).updated_at || (data as any).created_at || new Date().toISOString()),
  };
}

async function loadConversationSummary(client: SupabaseClient, userId: number): Promise<ConversationSummaryDto> {
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [eventsRes, lifeRes] = await Promise.all([
    client.from('events').select('category, content, created_at').eq('user_id', userId).gte('created_at', sinceIso).limit(500),
    client.from('life_events').select('category, raw_text, created_at').eq('user_id', userId).gte('created_at', sinceIso).limit(400),
  ]);

  const eventsRows = Array.isArray(eventsRes.data) ? eventsRes.data : [];
  const lifeRows = Array.isArray(lifeRes.data) ? lifeRes.data : [];
  const categoryMap = new Map<string, number>();
  for (const row of lifeRows) {
    const category = String((row as any).category || 'inne');
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
  }
  const topCategories = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, count]) => ({ category, count }));

  const pendingSignals = eventsRows.filter((row: any) => /musze|powinienem|pozniej|odkladam|nie zdaz/i.test(String(row?.content || ''))).length;
  return {
    messages24h: eventsRows.length,
    lifeEvents24h: lifeRows.length,
    topCategories,
    pendingSignals,
  };
}

async function loadMemorySummary(client: SupabaseClient, userId: number): Promise<MemorySummaryDto> {
  const { data, error } = await client
    .from('memory_chunks')
    .select('source_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    if (maybeMissingTable(error)) {
      return { chunkCount: 0, sourceBreakdown: [], lastIndexedAt: '' };
    }
    throw new Error(error.message);
  }

  const rows = (data || []) as Array<{ source_type?: string; created_at?: string }>;
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = String(row.source_type || 'unknown');
    map.set(key, (map.get(key) || 0) + 1);
  }

  return {
    chunkCount: rows.length,
    sourceBreakdown: [...map.entries()].sort((a, b) => b[1] - a[1]).map(([sourceType, count]) => ({ sourceType, count })),
    lastIndexedAt: String(rows[0]?.created_at || ''),
  };
}

async function loadReminderOpsSummary(client: SupabaseClient, userId: number): Promise<ReminderOpsSummaryDto> {
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from('reminders')
    .select('status, due_at, created_at')
    .eq('user_id', userId)
    .order('due_at', { ascending: true })
    .limit(500);

  if (error) {
    if (maybeMissingTable(error)) {
      return { pending: 0, sending: 0, sent24h: 0, failed24h: 0, nextDueAt: '' };
    }
    throw new Error(error.message);
  }

  const rows = data || [];
  const pending = rows.filter((row: any) => row.status === 'pending').length;
  const sending = rows.filter((row: any) => row.status === 'sending').length;
  const sent24h = rows.filter((row: any) => row.status === 'sent' && String(row.created_at || '') >= sinceIso).length;
  const failed24h = rows.filter((row: any) => row.status === 'failed' && String(row.created_at || '') >= sinceIso).length;
  const nextDue = rows.find((row: any) => row.status === 'pending') as any;
  return {
    pending,
    sending,
    sent24h,
    failed24h,
    nextDueAt: String(nextDue?.due_at || ''),
  };
}

async function loadSystemHealthSummary(client: SupabaseClient): Promise<SystemHealthSummaryDto> {
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from('system_logs')
    .select('module, message, timestamp, level, status')
    .eq('level', 'error')
    .order('timestamp', { ascending: false })
    .limit(500);

  if (error) {
    if (maybeMissingTable(error)) {
      return { pendingErrors: 0, totalErrors24h: 0, latestError: null };
    }
    throw new Error(error.message);
  }

  const rows = data || [];
  const latest = rows[0] as any;
  return {
    pendingErrors: rows.filter((row: any) => row.status === 'pending').length,
    totalErrors24h: rows.filter((row: any) => String(row.timestamp || '') >= sinceIso).length,
    latestError: latest
      ? { module: String(latest.module || 'unknown'), message: String(latest.message || ''), timestamp: String(latest.timestamp || '') }
      : null,
  };
}

async function loadOpsSnapshot(client: SupabaseClient, userId: number): Promise<OpsSnapshotDto> {
  const [conversation, memory, reminders, system] = await Promise.all([
    loadConversationSummary(client, userId),
    loadMemorySummary(client, userId),
    loadReminderOpsSummary(client, userId),
    loadSystemHealthSummary(client),
  ]);
  return { conversation, memory, reminders, system };
}

async function buildDashboardSnapshot(client: SupabaseClient, userId: number): Promise<DashboardSnapshot> {
  const [
    tasksToday,
    tasksWeek,
    tasksOverdue,
    habits,
    habitsCatalog,
    inbox,
    strategy,
    knowledge,
    activityData,
    focusData,
    momentumData,
    review,
    ops,
    reflectionSignals,
    uiPrefs,
  ] = await Promise.all([
    loadTasksByScope(client, userId, 'today'),
    loadTasksByScope(client, userId, 'week'),
    loadTasksByScope(client, userId, 'overdue'),
    loadHabits(client, userId),
    loadHabits(client, userId, true),
    loadInbox(client, userId),
    loadStrategy(client, userId),
    loadKnowledge(client, userId),
    loadActivityData(client, userId),
    loadFocusData(client, userId),
    loadMomentumData(client, userId, 30),
    loadLatestReview(client, userId),
    loadOpsSnapshot(client, userId),
    loadReflectionSignals(client, userId),
    loadUserDashboardPrefs(client, userId),
  ]);

  const habitsHeatmap = await loadHabitsHeatmap(client, userId, habits.length);
  const overview = buildOverview(tasksToday, tasksWeek, tasksOverdue, habits);
  const riskItems = buildRiskItems(tasksOverdue);
  const decisionCards = buildDecisionCards(overview, tasksToday, tasksOverdue, habits);
  const trendSummary = buildTrendSummary(momentumData);
  const alerts = buildOperationalAlerts({
    kpi: overview,
    ops,
    habits,
    trend: trendSummary,
  });
  const { advice, reflections } = await buildAdviceAndReflections({
    kpi: overview,
    tasksToday,
    tasksOverdue,
    habits,
    review,
    conversation: ops.conversation,
    reflectionSignals,
  });

  return {
    overview,
    tasksToday,
    tasksWeek,
    tasksOverdue,
    habits,
    habitsCatalog,
    inbox,
    strategy,
    knowledge,
    activityData,
    focusData,
    momentumData,
    habitsHeatmap,
    riskItems,
    decisionCards,
    advice,
    reflections,
    alerts,
    trendSummary,
    uiPrefs,
    review,
    ops,
    generatedAt: new Date().toISOString(),
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('x-request-id', String(requestId));
    next();
  });

  app.use((req, res, next) => {
    if (!shouldRateLimit(req)) return next();
    const key = `${getClientIp(req)}:${req.method}:${req.path}`;
    const now = Date.now();
    const bucket = mutationBuckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      mutationBuckets.set(key, { count: 1, resetAt: now + MUTATION_WINDOW_MS });
      return next();
    }

    if (bucket.count >= MUTATION_LIMIT) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again soon.' });
    }

    bucket.count += 1;
    mutationBuckets.set(key, bucket);
    return next();
  });

  app.get('/api/health', (_req, res) => {
    void checkTableAvailability(supabase)
      .then((tables) => {
        const missing = Object.entries(tables).filter(([, state]) => state === 'missing').map(([table]) => table);
        res.json({ ok: missing.length === 0, generatedAt: new Date().toISOString(), timezone: DASHBOARD_TIMEZONE, tables, missing });
      })
      .catch(() => {
        res.json({ ok: true, generatedAt: new Date().toISOString(), timezone: DASHBOARD_TIMEZONE });
      });
  });

  app.get('/api/client-config', (_req, res) => {
    res.json({
      supabaseUrl: clientSupabaseUrl,
      anonKey: clientSupabaseAnonKey,
      userId: APP_USER_ID,
      timezone: DASHBOARD_TIMEZONE,
    });
  });

  app.get('/api/dashboard', async (_req, res) => {
    try {
      const userId = await resolveRequestUserId(_req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const cached = getCachedDashboard(userId);
      if (cached) return res.json(cached);

      const snapshot = await buildDashboardSnapshot(supabase, userId);
      setCachedDashboard(userId, snapshot);
      res.json(snapshot);
    } catch (error) {
      apiError(res, error);
    }
  });

  app.put('/api/ui-prefs', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const parsed = uiPrefsSchema.safeParse(req.body || {});
      if (!parsed.success) return apiError(res, parsed.error.issues[0]?.message || 'Invalid payload', 400);

      const normalized = normalizeUiPrefs(parsed.data);
      await saveUserDashboardPrefs(supabase, userId, normalized);
      invalidateDashboardCache(userId);
      res.json({ success: true });
    } catch (error) {
      apiError(res, error);
    }
  });

  app.get('/api/overview', async (_req, res) => {
    try {
      const userId = await resolveRequestUserId(_req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const cached = getCachedDashboard(userId);
      const snapshot = cached || await buildDashboardSnapshot(supabase, userId);
      if (!cached) setCachedDashboard(userId, snapshot);
      res.json(snapshot.overview);
    } catch (error) {
      apiError(res, error);
    }
  });

  app.get('/api/ops', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);
      const ops = await loadOpsSnapshot(supabase, userId);
      res.json(ops);
    } catch (error) {
      apiError(res, error);
    }
  });

  app.get('/api/tasks', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const parsed = tasksQuerySchema.safeParse({
        scope: String(req.query.scope || 'today'),
        status: req.query.status ? String(req.query.status) : undefined,
        priority: req.query.priority ? String(req.query.priority) : undefined,
        project_id: req.query.project_id ? String(req.query.project_id) : undefined,
        sort_by: req.query.sort_by ? String(req.query.sort_by) : 'smart',
        sort_dir: req.query.sort_dir ? String(req.query.sort_dir) : 'asc',
      });
      if (!parsed.success) return apiError(res, parsed.error.issues[0]?.message || 'Invalid query', 400);
      const tasks = await loadTasksByScope(supabase, userId, parsed.data.scope, {
        status: parsed.data.status,
        priority: parsed.data.priority,
        projectId: parsed.data.project_id,
        sortBy: parsed.data.sort_by,
        sortDirection: parsed.data.sort_dir,
      });
      res.json(tasks);
    } catch (error) {
      apiError(res, error);
    }
  });

  app.get('/api/inbox', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);
      const inbox = await loadInbox(supabase, userId);
      res.json(inbox);
    } catch (error) {
      apiError(res, error);
    }
  });

  app.post('/api/tasks', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const parsed = createTaskSchema.safeParse(req.body || {});
      if (!parsed.success) return apiError(res, parsed.error.issues[0]?.message || 'Invalid payload', 400);

      const payload = parsed.data;
      const note = stripPriorityFromNote(payload.note || null);

      const { data, error } = await supabase
        .from('task_items')
        .insert([
          {
            user_id: userId,
            title: payload.title,
            due_date: payload.due_date,
            status: 'pending',
            priority: payload.priority,
            project_id: payload.project_id || null,
            note,
          },
        ])
        .select('id')
        .single();

      if (error) throw new Error(error.message);
      invalidateDashboardCache(userId);
      await logDashboardEvent(supabase, userId, `Dashboard: dodano zadanie "${payload.title}" na ${payload.due_date}.`);
      res.json({ id: data?.id });
    } catch (error) {
      apiError(res, error);
    }
  });

  app.patch('/api/tasks/:id([0-9a-fA-F-]+)', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const taskId = String(req.params.id || '').trim();
      if (!taskId) return apiError(res, 'Missing task id', 400);

      const parsed = patchTaskSchema.safeParse(req.body || {});
      if (!parsed.success) return apiError(res, parsed.error.issues[0]?.message || 'Invalid payload', 400);

      const patchData = parsed.data;
      const payload: Record<string, unknown> = {};
      if (patchData.title) {
        payload.title = patchData.title;
      }
      if (patchData.status) {
        payload.status = patchData.status;
        payload.completed_at = patchData.status === 'done' ? new Date().toISOString() : null;
      }
      if (patchData.due_date) {
        payload.due_date = patchData.due_date;
      }
      if (patchData.priority) {
        payload.priority = patchData.priority;
      }
      if (patchData.note !== undefined) {
        payload.note = stripPriorityFromNote(patchData.note || null);
      }
      if (patchData.project_id !== undefined) {
        payload.project_id = patchData.project_id || null;
      }

      if (Object.keys(payload).length === 0) {
        return apiError(res, 'Empty patch payload', 400);
      }

      const { error } = await supabase
        .from('task_items')
        .update(payload)
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) throw new Error(error.message);
      invalidateDashboardCache(userId);
      await logDashboardEvent(supabase, userId, `Dashboard: zaktualizowano zadanie ${taskId}.`);
      res.json({ success: true });
    } catch (error) {
      apiError(res, error);
    }
  });

  app.patch('/api/tasks/bulk', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const parsed = bulkTaskSchema.safeParse(req.body || {});
      if (!parsed.success) return apiError(res, parsed.error.issues[0]?.message || 'Invalid payload', 400);

      const ids = [...new Set(parsed.data.ids.map((id) => id.trim()).filter(Boolean))];
      if (!ids.length) return apiError(res, 'No task ids provided', 400);

      const action = parsed.data.action;
      let updatedCount = 0;

      if (action === 'mark_done' || action === 'mark_pending' || action === 'cancel') {
        const status: TaskStatus = action === 'mark_done' ? 'done' : action === 'mark_pending' ? 'pending' : 'cancelled';
        const { data: updatedRows, error } = await supabase
          .from('task_items')
          .update({
            status,
            completed_at: status === 'done' ? new Date().toISOString() : null,
          })
          .eq('user_id', userId)
          .in('id', ids)
          .select('id');

        if (error) throw new Error(error.message);
        updatedCount = (updatedRows || []).length;
      } else {
        const days = action === 'postpone_week' ? 7 : 1;
        const { data: rows, error: listError } = await supabase
          .from('task_items')
          .select('id, due_date')
          .eq('user_id', userId)
          .in('id', ids)
          .eq('status', 'pending');

        if (listError) throw new Error(listError.message);

        const updates = (rows || []).map((row: any) => {
          const dueDate = String(row.due_date || '');
          if (!dueDate) return Promise.resolve({ error: new Error('Missing due date') });
          const shifted = shiftDate(dueDate, days);
          return supabase
            .from('task_items')
            .update({ due_date: shifted })
            .eq('user_id', userId)
            .eq('id', String(row.id));
        });

        const results = await Promise.all(updates);
        updatedCount = results.filter((item) => !item.error).length;
      }

      invalidateDashboardCache(userId);
      await logDashboardEvent(supabase, userId, `Dashboard: akcja masowa ${action} na ${updatedCount} zadaniach.`);
      res.json({ updatedCount });
    } catch (error) {
      apiError(res, error);
    }
  });

  app.get('/api/habits', async (_req, res) => {
    try {
      const userId = await resolveRequestUserId(_req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const includeInactive = String(_req.query.include_inactive || '').toLowerCase();
      const habits = await loadHabits(supabase, userId, includeInactive === '1' || includeInactive === 'true');
      res.json(habits);
    } catch (error) {
      apiError(res, error);
    }
  });

  app.post('/api/habits', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const parsed = createHabitSchema.safeParse(req.body || {});
      if (!parsed.success) return apiError(res, parsed.error.issues[0]?.message || 'Invalid payload', 400);

      const payload = parsed.data;
      const { data, error } = await supabase
        .from('habit_definitions')
        .insert([
          {
            user_id: userId,
            name: payload.name,
            cadence: payload.cadence,
            target_count: payload.target_count,
            active: true,
          },
        ])
        .select('id')
        .single();

      if (error) throw new Error(error.message);
      invalidateDashboardCache(userId);
      await logDashboardEvent(supabase, userId, `Dashboard: dodano nawyk "${payload.name}" (${payload.cadence}).`);
      res.json({ id: data?.id });
    } catch (error) {
      apiError(res, error);
    }
  });

  app.delete('/api/habits/:id', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const habitId = String(req.params.id || '').trim();
      if (!habitId) return apiError(res, 'Missing habit id', 400);

      const { error } = await supabase
        .from('habit_definitions')
        .update({ active: false })
        .eq('id', habitId)
        .eq('user_id', userId);

      if (error) throw new Error(error.message);
      invalidateDashboardCache(userId);
      await logDashboardEvent(supabase, userId, `Dashboard: zarchiwizowano nawyk ${habitId}.`);
      res.json({ success: true });
    } catch (error) {
      apiError(res, error);
    }
  });

  app.post('/api/habits/:id/restore', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const habitId = String(req.params.id || '').trim();
      if (!habitId) return apiError(res, 'Missing habit id', 400);

      const { error } = await supabase
        .from('habit_definitions')
        .update({ active: true })
        .eq('id', habitId)
        .eq('user_id', userId);

      if (error) throw new Error(error.message);
      invalidateDashboardCache(userId);
      await logDashboardEvent(supabase, userId, `Dashboard: przywrocono nawyk ${habitId}.`);
      res.json({ success: true });
    } catch (error) {
      apiError(res, error);
    }
  });

  app.post('/api/habits/:id/toggle', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const habitId = String(req.params.id || '').trim();
      if (!habitId) return apiError(res, 'Missing habit id', 400);

      const today = todayUtc();
      const nextDay = shiftDate(today, 1);

      const { data: existing, error: existingError } = await supabase
        .from('habit_completions')
        .select('id')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .gte('completed_at', `${today}T00:00:00.000Z`)
        .lt('completed_at', `${nextDay}T00:00:00.000Z`)
        .limit(1);

      if (existingError) throw new Error(existingError.message);

      const row = (existing || [])[0] as { id: string } | undefined;
      if (row?.id) {
        const { error } = await supabase.from('habit_completions').delete().eq('id', row.id);
        if (error) throw new Error(error.message);
        invalidateDashboardCache(userId);
        await logDashboardEvent(supabase, userId, `Dashboard: odznaczono nawyk ${habitId}.`);
        return res.json({ status: 'uncompleted' });
      }

      const { error } = await supabase
        .from('habit_completions')
        .insert([{ habit_id: habitId, user_id: userId, completed_at: new Date().toISOString() }]);

      if (error) throw new Error(error.message);
      invalidateDashboardCache(userId);
      await logDashboardEvent(supabase, userId, `Dashboard: odhaczono nawyk ${habitId}.`);
      res.json({ status: 'completed' });
    } catch (error) {
      apiError(res, error);
    }
  });

  app.get('/api/strategy', async (_req, res) => {
    try {
      const userId = await resolveRequestUserId(_req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const strategy = await loadStrategy(supabase, userId);
      res.json(strategy);
    } catch (error) {
      apiError(res, error);
    }
  });

  app.get('/api/review', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const dateProbe = String(req.query.date || '').trim();
      const query = supabase
        .from('daily_reviews')
        .select('review_date, summary, tomorrow_plan, created_at, updated_at')
        .eq('user_id', userId);

      if (dateProbe) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateProbe)) {
          return apiError(res, 'Invalid date format', 400);
        }
        const { data, error } = await query.eq('review_date', dateProbe).maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) return res.json(null);
        return res.json(data);
      }

      const { data, error } = await query.order('review_date', { ascending: false }).limit(1).maybeSingle();
      if (error) throw new Error(error.message);
      res.json(data || null);
    } catch (error) {
      apiError(res, error);
    }
  });

  app.put('/api/review', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const parsed = reviewSchema.safeParse(req.body || {});
      if (!parsed.success) return apiError(res, parsed.error.issues[0]?.message || 'Invalid payload', 400);

      const payload = parsed.data;
      const reviewDate = payload.review_date || todayUtc();
      const { error } = await supabase
        .from('daily_reviews')
        .upsert(
          {
            user_id: userId,
            review_date: reviewDate,
            summary: payload.summary,
            tomorrow_plan: payload.tomorrow_plan,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,review_date' }
        );

      if (error) throw new Error(error.message);
      invalidateDashboardCache(userId);
      await logDashboardEvent(supabase, userId, `Dashboard: zapisano review na ${reviewDate}.`);
      res.json({ success: true });
    } catch (error) {
      apiError(res, error);
    }
  });

  app.post('/api/review/copilot', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const [tasksToday, tasksOverdue, habits, latestReview, reflectionSignals] = await Promise.all([
        loadTasksByScope(supabase, userId, 'today'),
        loadTasksByScope(supabase, userId, 'overdue'),
        loadHabits(supabase, userId),
        loadLatestReview(supabase, userId),
        loadReflectionSignals(supabase, userId),
      ]);

      const draft = await buildReviewCopilotDraft({
        tasksToday,
        tasksOverdue,
        habits,
        latestReview,
        reflectionSignals,
      });

      res.json(draft);
    } catch (error) {
      apiError(res, error);
    }
  });

  app.get('/api/knowledge', async (_req, res) => {
    try {
      const userId = await resolveRequestUserId(_req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const knowledge = await loadKnowledge(supabase, userId);
      res.json(knowledge);
    } catch (error) {
      apiError(res, error);
    }
  });

  app.post('/api/knowledge/:id/action', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const knowledgeId = String(req.params.id || '').trim();
      if (!knowledgeId) return apiError(res, 'Missing knowledge id', 400);

      const parsed = knowledgeActionSchema.safeParse(req.body || {});
      if (!parsed.success) return apiError(res, parsed.error.issues[0]?.message || 'Invalid payload', 400);

      const { data: knowledgeRow, error: knowledgeError } = await supabase
        .from('bot_knowledge')
        .select('id, title, content, category, user_id')
        .eq('id', knowledgeId)
        .or(`user_id.eq.${userId},user_id.is.null`)
        .limit(1)
        .maybeSingle();

      if (knowledgeError) throw new Error(knowledgeError.message);
      if (!knowledgeRow) return apiError(res, 'Knowledge item not found', 404);

      const dueDate = parsed.data.due_date || todayUtc();
      const titleSource = String((knowledgeRow as any).title || (knowledgeRow as any).content || '').trim();
      const title = titleSource.length > 0
        ? `Z wiedzy: ${titleSource.slice(0, 140)}`
        : `Z wiedzy #${knowledgeId.slice(0, 6)}`;
      const contentSource = String((knowledgeRow as any).content || '').trim();
      const noteBase = contentSource.length > 0 ? contentSource.slice(0, 500) : null;

      const { data, error } = await supabase
        .from('task_items')
        .insert([
          {
            user_id: userId,
            title,
            due_date: dueDate,
            status: 'pending',
            priority: parsed.data.priority,
            project_id: parsed.data.project_id || null,
            note: noteBase,
          },
        ])
        .select('id')
        .single();

      if (error) throw new Error(error.message);
      invalidateDashboardCache(userId);
      await logDashboardEvent(supabase, userId, `Dashboard: utworzono task z wiedzy ${knowledgeId}.`);
      res.json({ id: data?.id });
    } catch (error) {
      apiError(res, error);
    }
  });

  app.get('/api/agents', async (_req, res) => {
    try {
      const userId = await resolveRequestUserId(_req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const profiles = await listAgentProfiles();
      res.json({ agents: profiles });
    } catch (error) {
      apiError(res, error);
    }
  });

  app.get('/api/agents/tools', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);
      res.json({ tools: AGENT_ALLOWED_TOOLS });
    } catch (error) {
      apiError(res, error);
    }
  });

  app.get('/api/agents/:id', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const agentId = normalizeAgentId(String(req.params.id || ''));
      if (!agentId) return apiError(res, 'Invalid agent id', 400);

      const profile = await getAgentProfile(agentId);
      if (!profile) return apiError(res, 'Agent not found', 404);
      res.json(profile);
    } catch (error) {
      apiError(res, error);
    }
  });

  app.post('/api/agents', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const parsed = agentProfileSchema.safeParse(req.body || {});
      if (!parsed.success) return apiError(res, parsed.error.issues[0]?.message || 'Invalid payload', 400);

      const id = normalizeAgentId(parsed.data.id);
      const existing = await getAgentProfile(id);
      if (existing) return apiError(res, `Agent ${id} already exists`, 409);

      const profile = await saveAgentProfile({
        id,
        name: parsed.data.name,
        kind: parsed.data.kind,
        description: parsed.data.description,
        routingHints: parsed.data.routingHints,
        allowedTools: parsed.data.allowedTools,
        enabled: parsed.data.enabled,
        soul: parsed.data.soul,
        updated_at: new Date().toISOString(),
      });

      res.status(201).json(profile);
    } catch (error) {
      apiError(res, error);
    }
  });

  app.put('/api/agents/:id', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const pathId = normalizeAgentId(String(req.params.id || ''));
      if (!pathId) return apiError(res, 'Invalid agent id', 400);

      const parsed = agentProfileSchema.safeParse({ ...(req.body || {}), id: pathId });
      if (!parsed.success) return apiError(res, parsed.error.issues[0]?.message || 'Invalid payload', 400);

      const profile = await saveAgentProfile({
        id: pathId,
        name: parsed.data.name,
        kind: parsed.data.kind,
        description: parsed.data.description,
        routingHints: parsed.data.routingHints,
        allowedTools: parsed.data.allowedTools,
        enabled: parsed.data.enabled,
        soul: parsed.data.soul,
        updated_at: new Date().toISOString(),
      });

      res.json(profile);
    } catch (error) {
      apiError(res, error);
    }
  });

  app.delete('/api/agents/:id', async (req, res) => {
    try {
      const userId = await resolveRequestUserId(req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const agentId = normalizeAgentId(String(req.params.id || ''));
      if (!agentId) return apiError(res, 'Invalid agent id', 400);
      await removeAgentProfile(agentId);
      res.json({ success: true });
    } catch (error) {
      apiError(res, error);
    }
  });

  app.get('/api/charts/activity', async (_req, res) => {
    try {
      const userId = await resolveRequestUserId(_req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const activity = await loadActivityData(supabase, userId);
      res.json(activity);
    } catch (error) {
      apiError(res, error);
    }
  });

  app.get('/api/charts/focus', async (_req, res) => {
    try {
      const userId = await resolveRequestUserId(_req);
      if (!userId) return apiError(res, 'Unauthorized', 401);

      const focus = await loadFocusData(supabase, userId);
      res.json(focus);
    } catch (error) {
      apiError(res, error);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dashboard server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});
