import { LucideIcon } from 'lucide-react';

export interface Task {
  id: number;
  title: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'done' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  project_id?: number;
}

export interface Habit {
  id: number;
  name: string;
  cadence: 'daily' | 'weekly';
  target_count: number;
  completed_today: boolean;
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

export interface KPI {
  dailyExecutionPct: number;
  weeklyMomentumPct: number;
  overdueCount: number;
  habitsConsistencyPct: number;
}

export interface Project {
  id: number;
  name: string;
  status: 'active' | 'on_hold' | 'completed';
  deadline: string;
}

export interface Outcome {
  id: number;
  project_id: number;
  name: string;
  status: 'on_track' | 'at_risk' | 'off_track';
  progress: number;
}

export interface KnowledgeItem {
  id: number;
  category: string;
  title: string;
  content: string;
  tags: string;
}

export interface NavItem {
  label: string;
  icon: LucideIcon;
  id: string;
}
