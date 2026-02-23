import {
  CreateTaskPayload,
  DashboardUiPrefs,
  DailyReview,
  DashboardSnapshot,
  AgentProfile,
  Task,
  TaskBulkAction,
} from './types';

type ApiErrorBody = { error?: string };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let message = `API error: ${response.status}`;
    try {
      const payload = (await response.json()) as ApiErrorBody;
      if (payload?.error) message = payload.error;
    } catch {
      // Ignore body parsing errors and keep fallback message.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export async function fetchDashboard(): Promise<DashboardSnapshot> {
  return requestJson<DashboardSnapshot>('/api/dashboard');
}

export async function createTask(payload: CreateTaskPayload): Promise<{ id: string }> {
  return requestJson<{ id: string }>('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function patchTask(id: string, patch: Partial<Task>): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

export async function bulkPatchTasks(ids: string[], action: TaskBulkAction): Promise<{ updatedCount: number }> {
  return requestJson<{ updatedCount: number }>('/api/tasks/bulk', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, action }),
  });
}

export async function toggleHabit(id: string): Promise<{ status: 'completed' | 'uncompleted' }> {
  return requestJson<{ status: 'completed' | 'uncompleted' }>(`/api/habits/${id}/toggle`, {
    method: 'POST',
  });
}

export async function createHabit(payload: {
  name: string;
  cadence: 'daily' | 'weekly';
  target_count: number;
}): Promise<{ id: string }> {
  return requestJson<{ id: string }>('/api/habits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function archiveHabit(id: string): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>(`/api/habits/${id}`, {
    method: 'DELETE',
  });
}

export async function restoreHabit(id: string): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>(`/api/habits/${id}/restore`, {
    method: 'POST',
  });
}

export async function fetchReview(date?: string): Promise<DailyReview | null> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return requestJson<DailyReview | null>(`/api/review${query}`);
}

export async function saveReview(payload: {
  review_date?: string;
  summary: string;
  tomorrow_plan: string;
}): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>('/api/review', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function generateReviewCopilotDraft(): Promise<{ summary: string; tomorrow_plan: string }> {
  return requestJson<{ summary: string; tomorrow_plan: string }>('/api/review/copilot', {
    method: 'POST',
  });
}

export async function saveUiPrefs(payload: DashboardUiPrefs): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>('/api/ui-prefs', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function createTaskFromKnowledge(params: {
  knowledgeId: string;
  due_date?: string;
  priority?: 'high' | 'medium' | 'low';
  project_id?: string | null;
}): Promise<{ id: string }> {
  return requestJson<{ id: string }>(`/api/knowledge/${params.knowledgeId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'create_task',
      due_date: params.due_date,
      priority: params.priority,
      project_id: params.project_id ?? null,
    }),
  });
}

export async function fetchAgents(): Promise<AgentProfile[]> {
  const payload = await requestJson<{ agents: AgentProfile[] }>('/api/agents');
  return payload.agents || [];
}

export async function fetchAgent(id: string): Promise<AgentProfile> {
  return requestJson<AgentProfile>(`/api/agents/${id}`);
}

export async function createAgent(payload: Omit<AgentProfile, 'updated_at'>): Promise<AgentProfile> {
  return requestJson<AgentProfile>('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateAgent(id: string, payload: Omit<AgentProfile, 'updated_at' | 'id'>): Promise<AgentProfile> {
  return requestJson<AgentProfile>(`/api/agents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteAgent(id: string): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>(`/api/agents/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchAgentToolsCatalog(): Promise<string[]> {
  const payload = await requestJson<{ tools: string[] }>('/api/agents/tools');
  return payload.tools || [];
}
