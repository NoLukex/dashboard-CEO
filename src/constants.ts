import {
  LayoutDashboard,
  CheckSquare,
  Target,
  BrainCircuit,
  NotebookPen,
  Bot,
} from 'lucide-react';
import { NavItem } from './types';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Cockpit', icon: LayoutDashboard, id: 'dashboard' },
  { label: 'Zadania', icon: CheckSquare, id: 'tasks' },
  { label: 'Strategia', icon: Target, id: 'strategy' },
  { label: 'Review', icon: NotebookPen, id: 'review' },
  { label: 'Wiedza', icon: BrainCircuit, id: 'knowledge' },
  { label: 'Agenci', icon: Bot, id: 'agents' },
];
