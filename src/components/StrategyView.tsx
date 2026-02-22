import { Project, Outcome } from '../types';

interface StrategyViewProps {
  projects: Project[];
  outcomes: Outcome[];
}

export default function StrategyView({ projects, outcomes }: StrategyViewProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">Aktywne Projekty</h3>
          <div className="space-y-4">
            {projects.map((project) => (
              <div key={project.id} className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-zinc-200">{project.name}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                    project.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <div className="text-xs text-zinc-500">Deadline: {project.deadline}</div>
                
                {/* Related Outcomes */}
                <div className="mt-4 space-y-2">
                  {outcomes.filter(o => o.project_id === project.id).map(outcome => (
                    <div key={outcome.id} className="flex items-center gap-3 text-sm">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-zinc-400 text-xs">{outcome.name}</span>
                          <span className={`text-xs font-mono ${
                            outcome.status === 'on_track' ? 'text-emerald-500' : 
                            outcome.status === 'at_risk' ? 'text-amber-500' : 'text-rose-500'
                          }`}>{outcome.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              outcome.status === 'on_track' ? 'bg-emerald-500' : 
                              outcome.status === 'at_risk' ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${outcome.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* OKR / Outcomes Summary */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">Kluczowe Wyniki (Outcomes)</h3>
          <div className="grid grid-cols-1 gap-4">
             {outcomes.map(outcome => (
               <div key={outcome.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-800/30 transition-colors">
                 <div className={`w-2 h-2 rounded-full ${
                    outcome.status === 'on_track' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                    outcome.status === 'at_risk' ? 'bg-amber-500' : 'bg-rose-500'
                 }`} />
                 <div className="flex-1">
                   <div className="text-sm font-medium text-zinc-200">{outcome.name}</div>
                   <div className="text-xs text-zinc-500">Projekt #{outcome.project_id}</div>
                 </div>
                 <div className="text-lg font-mono font-bold text-zinc-300">{outcome.progress}%</div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
