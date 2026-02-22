import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FocusData } from '../../types';

interface FocusDistributionProps {
  data: FocusData[];
}

export default function FocusDistribution({ data }: FocusDistributionProps) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-zinc-100 mb-6">Dystrybucja Fokusu</h3>
      <div className="flex-1 min-h-[200px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#18181b', 
                borderColor: '#27272a', 
                borderRadius: '8px',
                color: '#f4f4f5'
              }}
              itemStyle={{ color: '#e4e4e7' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              formatter={(value) => <span className="text-zinc-400 text-xs ml-1">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div className="text-center">
             <span className="text-2xl font-bold text-zinc-100">{data.reduce((acc, curr) => acc + curr.value, 0)}</span>
             <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Zadań</p>
           </div>
        </div>
      </div>
    </div>
  );
}
