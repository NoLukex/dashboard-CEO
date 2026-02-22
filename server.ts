import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('local.db');

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- active, on_hold, completed
    deadline TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'on_track', -- on_track, at_risk, off_track
    progress INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS habit_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    cadence TEXT DEFAULT 'daily', -- daily, weekly
    target_count INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS habit_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER,
    user_id INTEGER,
    completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    FOREIGN KEY(habit_id) REFERENCES habit_definitions(id)
  );

  CREATE TABLE IF NOT EXISTS task_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    due_date TEXT,
    status TEXT DEFAULT 'pending', -- pending, in_progress, done, cancelled
    priority TEXT DEFAULT 'medium', -- high, medium, low
    note TEXT,
    project_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS daily_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    review_date TEXT,
    summary TEXT,
    tomorrow_plan TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS bot_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    title TEXT,
    content TEXT,
    tags TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed Data if empty
const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  console.log('Seeding database...');
  const userId = 1;
  db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run(userId, 'ceo@example.com', 'CEO');

  // Projects
  const p1 = db.prepare('INSERT INTO projects (user_id, name, status, deadline) VALUES (?, ?, ?, ?)').run(userId, 'Q1 Growth Strategy', 'active', '2026-03-31').lastInsertRowid;
  const p2 = db.prepare('INSERT INTO projects (user_id, name, status, deadline) VALUES (?, ?, ?, ?)').run(userId, 'Team Hiring', 'active', '2026-02-28').lastInsertRowid;

  // Outcomes
  db.prepare('INSERT INTO outcomes (project_id, name, status, progress) VALUES (?, ?, ?, ?)').run(p1, 'Increase MRR by 20%', 'on_track', 65);
  db.prepare('INSERT INTO outcomes (project_id, name, status, progress) VALUES (?, ?, ?, ?)').run(p2, 'Hire Senior Backend Dev', 'at_risk', 30);

  // Habits
  db.prepare('INSERT INTO habit_definitions (user_id, name, cadence, target_count) VALUES (?, ?, ?, ?)').run(userId, 'Deep Work (2h)', 'daily', 1);
  db.prepare('INSERT INTO habit_definitions (user_id, name, cadence, target_count) VALUES (?, ?, ?, ?)').run(userId, 'Zero Inbox', 'daily', 1);
  db.prepare('INSERT INTO habit_definitions (user_id, name, cadence, target_count) VALUES (?, ?, ?, ?)').run(userId, 'Weekly Team Sync', 'weekly', 1);

  // Tasks
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  db.prepare('INSERT INTO task_items (user_id, title, due_date, status, priority, project_id) VALUES (?, ?, ?, ?, ?, ?)').run(userId, 'Review Q1 Budget', today, 'pending', 'high', p1);
  db.prepare('INSERT INTO task_items (user_id, title, due_date, status, priority, project_id) VALUES (?, ?, ?, ?, ?, ?)').run(userId, 'Interview Candidate A', today, 'done', 'high', p2);
  db.prepare('INSERT INTO task_items (user_id, title, due_date, status, priority) VALUES (?, ?, ?, ?, ?)') .run(userId, 'Approve Marketing Copy', today, 'pending', 'medium');
  db.prepare('INSERT INTO task_items (user_id, title, due_date, status, priority) VALUES (?, ?, ?, ?, ?)') .run(userId, 'Sign Contract with Vendor X', yesterday, 'pending', 'high'); // Overdue

  // Knowledge
  db.prepare('INSERT INTO bot_knowledge (category, title, content, tags) VALUES (?, ?, ?, ?)').run('Operations', 'Invoice Approval Process', 'All invoices > $5k need CFO approval. Send to finance@example.com.', 'finance,approval');
}

// Ensure user name is updated
db.prepare('UPDATE users SET name = ? WHERE id = 1').run('Krystian Brzeski');

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // GET /api/overview (KPIs)
  app.get('/api/overview', (req, res) => {
    const userId = 1; // Mock user
    const today = new Date().toISOString().split('T')[0];
    
    // Daily Execution % (Tasks done today / Total tasks today)
    const tasksToday = db.prepare(`
      SELECT count(*) as total, 
      sum(case when status = 'done' then 1 else 0 end) as completed 
      FROM task_items 
      WHERE user_id = ? AND date(due_date) = ?
    `).get(userId, today) as { total: number, completed: number };
    
    const dailyExecutionPct = tasksToday.total > 0 ? Math.round((tasksToday.completed / tasksToday.total) * 100) : 0;

    // Overdue Count
    const overdue = db.prepare(`
      SELECT count(*) as count 
      FROM task_items 
      WHERE user_id = ? AND status != 'done' AND date(due_date) < ?
    `).get(userId, today) as { count: number };

    // Habits Consistency (Active habits completed today / Total active habits)
    // Simplified logic for demo
    const activeHabits = db.prepare('SELECT count(*) as count FROM habit_definitions WHERE user_id = ? AND active = 1').get(userId) as { count: number };
    const completedHabits = db.prepare(`
      SELECT count(DISTINCT habit_id) as count 
      FROM habit_completions 
      WHERE user_id = ? AND date(completed_at) = ?
    `).get(userId, today) as { count: number };
    
    const habitsConsistencyPct = activeHabits.count > 0 ? Math.round((completedHabits.count / activeHabits.count) * 100) : 0;

    res.json({
      dailyExecutionPct,
      weeklyMomentumPct: 78, // Mocked for complexity reduction in demo
      overdueCount: overdue.count,
      habitsConsistencyPct
    });
  });

// ... existing imports ...

// ... existing code ...

  // GET /api/tasks
  app.get('/api/tasks', (req, res) => {
    const userId = 1;
    const scope = req.query.scope as string || 'today';
    const today = new Date().toISOString().split('T')[0];

    let query = `SELECT * FROM task_items WHERE user_id = ?`;
    const params: (string | number)[] = [userId];

    if (scope === 'today') {
      query += ` AND date(due_date) = ? ORDER BY priority = 'high' DESC, status ASC`;
      params.push(today);
    } else if (scope === 'overdue') {
      query += ` AND date(due_date) < ? AND status != 'done' ORDER BY due_date ASC`;
      params.push(today);
    } else if (scope === 'week') {
       // Simplified week logic
       query += ` AND date(due_date) >= ? ORDER BY due_date ASC`;
       params.push(today);
    }

    const tasks = db.prepare(query).all(...params);
    res.json(tasks);
  });

  // POST /api/tasks
  app.post('/api/tasks', (req, res) => {
    const { title, priority, due_date } = req.body;
    const userId = 1;
    const result = db.prepare('INSERT INTO task_items (user_id, title, priority, due_date) VALUES (?, ?, ?, ?)').run(userId, title, priority, due_date);
    res.json({ id: result.lastInsertRowid });
  });

  // PATCH /api/tasks/:id
  app.patch('/api/tasks/:id', (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    
    if (status === 'done') {
        db.prepare("UPDATE task_items SET status = ?, completed_at = datetime('now') WHERE id = ?").run(status, id);
    } else {
        db.prepare("UPDATE task_items SET status = ?, completed_at = NULL WHERE id = ?").run(status, id);
    }
    res.json({ success: true });
  });

  // GET /api/habits
  app.get('/api/habits', (req, res) => {
    const userId = 1;
    const today = new Date().toISOString().split('T')[0];
    
    const habits = db.prepare('SELECT * FROM habit_definitions WHERE user_id = ? AND active = 1').all(userId);
    const completions = db.prepare(`
        SELECT habit_id 
        FROM habit_completions 
        WHERE user_id = ? AND date(completed_at) = ?
    `).all(userId, today) as { habit_id: number }[];

    const completedSet = new Set(completions.map(c => c.habit_id));

    const result = habits.map((h: any) => ({
        ...h,
        completed_today: completedSet.has(h.id)
    }));

    res.json(result);
  });

  // POST /api/habits/:id/toggle
  app.post('/api/habits/:id/toggle', (req, res) => {
    const userId = 1;
    const habitId = req.params.id;
    const today = new Date().toISOString().split('T')[0];

    const existing = db.prepare('SELECT id FROM habit_completions WHERE habit_id = ? AND user_id = ? AND date(completed_at) = ?').get(habitId, userId, today) as { id: number } | undefined;

    if (existing) {
        db.prepare('DELETE FROM habit_completions WHERE id = ?').run(existing.id);
        res.json({ status: 'uncompleted' });
    } else {
        db.prepare('INSERT INTO habit_completions (habit_id, user_id, completed_at) VALUES (?, ?, ?)').run(habitId, userId, today);
        res.json({ status: 'completed' });
    }
  });

  // GET /api/strategy
  app.get('/api/strategy', (req, res) => {
    const userId = 1;
    const projects = db.prepare('SELECT * FROM projects WHERE user_id = ? AND status = "active"').all(userId);
    const outcomes = db.prepare('SELECT o.* FROM outcomes o JOIN projects p ON o.project_id = p.id WHERE p.user_id = ?').all(userId);
    
    res.json({ projects, outcomes });
  });

  // GET /api/knowledge
  app.get('/api/knowledge', (req, res) => {
      const items = db.prepare('SELECT * FROM bot_knowledge').all();
      res.json(items);
  });

  // GET /api/charts/activity
  app.get('/api/charts/activity', (req, res) => {
    const userId = 1;
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    const data = days.map(date => {
      const stats = db.prepare(`
        SELECT 
          count(*) as total,
          sum(case when status = 'done' then 1 else 0 end) as completed
        FROM task_items 
        WHERE user_id = ? AND date(due_date) = ?
      `).get(userId, date) as { total: number, completed: number };
      
      return {
        date: new Date(date).toLocaleDateString('pl-PL', { weekday: 'short' }),
        completed: stats.completed || 0,
        total: stats.total || 0
      };
    });

    res.json(data);
  });

  // GET /api/charts/focus
  app.get('/api/charts/focus', (req, res) => {
    const userId = 1;
    const data = db.prepare(`
      SELECT 
        COALESCE(p.name, 'Inne') as name,
        count(t.id) as value
      FROM task_items t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.user_id = ? AND t.status != 'done'
      GROUP BY p.id
    `).all(userId) as { name: string, value: number }[];

    const colors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444'];
    const result = data.map((item, index) => ({
      ...item,
      color: colors[index % colors.length]
    }));

    res.json(result);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
