import { 
  LayoutDashboard, 
  CheckSquare, 
  Target, 
  BrainCircuit, 
  Settings, 
  Menu,
  Bell,
  Search,
  User
} from 'lucide-react';
import { NavItem } from './types';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Cockpit', icon: LayoutDashboard, id: 'dashboard' },
  { label: 'Zadania', icon: CheckSquare, id: 'tasks' },
  { label: 'Strategia', icon: Target, id: 'strategy' },
  { label: 'Wiedza', icon: BrainCircuit, id: 'knowledge' },
];
