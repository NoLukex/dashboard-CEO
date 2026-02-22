/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import KPIStrip from './components/KPIStrip';
import TaskList from './components/TaskList';
import HabitTracker from './components/HabitTracker';
import StrategyView from './components/StrategyView';
import KnowledgeView from './components/KnowledgeView';
import ActivityChart from './components/charts/ActivityChart';
import FocusDistribution from './components/charts/FocusDistribution';
import { KPI, Task, Habit, Project, Outcome, KnowledgeItem, ActivityData, FocusData } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [kpiData, setKpiData] = useState<KPI | null>(null);
  const [tasksToday, setTasksToday] = useState<Task[]>([]);
  const [tasksOverdue, setTasksOverdue] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [strategyData, setStrategyData] = useState<{ projects: Project[], outcomes: Outcome[] }>({ projects: [], outcomes: [] });
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [focusData, setFocusData] = useState<FocusData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [kpiRes, tasksTodayRes, tasksOverdueRes, habitsRes, strategyRes, knowledgeRes, activityRes, focusRes] = await Promise.all([
        fetch('/api/overview'),
        fetch('/api/tasks?scope=today'),
        fetch('/api/tasks?scope=overdue'),
        fetch('/api/habits'),
        fetch('/api/strategy'),
        fetch('/api/knowledge'),
        fetch('/api/charts/activity'),
        fetch('/api/charts/focus')
      ]);

      setKpiData(await kpiRes.json());
      setTasksToday(await tasksTodayRes.json());
      setTasksOverdue(await tasksOverdueRes.json());
      setHabits(await habitsRes.json());
      setStrategyData(await strategyRes.json());
      setKnowledgeItems(await knowledgeRes.json());
      setActivityData(await activityRes.json());
      setFocusData(await focusRes.json());
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Polling fallback for "Realtime"
    const interval = setInterval(fetchData, 30000);
    
    // Listen for manual refresh events
    const handleRefresh = () => fetchData();
    window.addEventListener('refresh-data', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-data', handleRefresh);
    };
  }, []);

  const handleTaskToggle = async (id: number, status: string) => {
    // Optimistic update
    setTasksToday(prev => prev.map(t => t.id === id ? { ...t, status: status as any } : t));
    setTasksOverdue(prev => prev.map(t => t.id === id ? { ...t, status: status as any } : t));

    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchData(); // Sync exact state
  };

  const handleHabitToggle = async (id: number) => {
    // Optimistic
    setHabits(prev => prev.map(h => h.id === id ? { ...h, completed_today: !h.completed_today } : h));

    await fetch(`/api/habits/${id}/toggle`, { method: 'POST' });
    fetchData();
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && (
        <>
          <KPIStrip data={kpiData} isLoading={isLoading} />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Focus Column */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Charts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-80">
                <ActivityChart data={activityData} />
                <FocusDistribution data={focusData} />
              </div>

              <div className="flex-1 min-h-[400px]">
                <TaskList 
                  title="Fokus Dnia" 
                  type="today" 
                  tasks={tasksToday} 
                  onToggle={handleTaskToggle} 
                />
              </div>
            </div>

            {/* Side Column */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="flex-none">
                <HabitTracker habits={habits} onToggle={handleHabitToggle} />
              </div>
              <div className="flex-1 min-h-[300px]">
                <TaskList 
                  title="Kolejka Krytyczna" 
                  type="overdue" 
                  tasks={tasksOverdue} 
                  onToggle={handleTaskToggle} 
                />
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'tasks' && (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TaskList title="Wszystkie na dziś" type="today" tasks={tasksToday} onToggle={handleTaskToggle} />
            <TaskList title="Zaległe" type="overdue" tasks={tasksOverdue} onToggle={handleTaskToggle} />
         </div>
      )}

      {activeTab === 'strategy' && (
        <StrategyView projects={strategyData.projects} outcomes={strategyData.outcomes} />
      )}

      {activeTab === 'knowledge' && (
        <KnowledgeView items={knowledgeItems} />
      )}
    </Layout>
  );
}

