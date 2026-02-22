import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ActivityData } from '../../types';

interface ActivityChartProps {
  data: ActivityData[];
}

export default function ActivityChart({ data }: ActivityChartProps) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-zinc-100 mb-6">Aktywność (7 dni)</h3>
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#71717a', fontSize: 12 }} 
              dy={10}
            />
            <Tooltip 
              cursor={{ fill: '#27272a', opacity: 0.4 }}
              contentStyle={{ 
                backgroundColor: '#18181b', 
                borderColor: '#27272a', 
                borderRadius: '8px',
                color: '#f4f4f5'
              }}
              itemStyle={{ color: '#10b981' }}
            />
            <Bar dataKey="total" stackId="a" fill="#27272a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
