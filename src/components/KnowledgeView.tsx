import { KnowledgeItem } from '../types';
import { Search, Tag } from 'lucide-react';

interface KnowledgeViewProps {
  items: KnowledgeItem[];
}

export default function KnowledgeView({ items }: KnowledgeViewProps) {
  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input 
          type="text" 
          placeholder="Szukaj w bazie wiedzy bota..." 
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors cursor-pointer group">
            <div className="text-xs font-mono text-emerald-500 mb-2 uppercase tracking-wider">{item.category}</div>
            <h3 className="font-semibold text-zinc-100 mb-2 group-hover:text-emerald-400 transition-colors">{item.title}</h3>
            <p className="text-sm text-zinc-400 line-clamp-3 mb-4">{item.content}</p>
            <div className="flex flex-wrap gap-2">
              {item.tags.split(',').map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 text-[10px] text-zinc-400">
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
