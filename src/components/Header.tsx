import { Map as MapIcon, Target, Info, Layers } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { motion } from 'framer-motion';

export const Header: React.FC = () => {
  const { map, toggleBattlegrounds, setColorBy } = useStore();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 bg-gradient-to-r from-slate-900/98 via-slate-800/98 to-slate-900/98 backdrop-blur-2xl border-b border-slate-700/50 shadow-xl z-50"
    >
      <div className="max-w-screen-2xl mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl blur-md opacity-50"></div>
              <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-2xl shadow-lg">
                <MapIcon size={28} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
                Congressional Atlas
              </h1>
              <p className="text-sm text-slate-400 font-medium">
                Interactive Historical Political Map • 1789 - 2024
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Color By Selector */}
            <div className="flex items-center gap-2.5">
              <Layers size={18} className="text-slate-400" />
              <select
                value={map.colorBy}
                onChange={(e) => setColorBy(e.target.value as any)}
                className="px-4 py-2.5 bg-slate-800/80 border border-slate-600/50 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all cursor-pointer hover:bg-slate-700/80"
              >
                <option value="party">Party Affiliation</option>
                <option value="margin">Election Margin</option>
                <option value="turnout">Voter Turnout</option>
              </select>
            </div>

            {/* Battleground Toggle */}
            <button
              onClick={toggleBattlegrounds}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                map.showBattlegrounds
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 scale-105'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-600/50'
              }`}
            >
              <Target size={18} />
              <span>Battlegrounds</span>
            </button>

            {/* Info Button */}
            <button className="p-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 rounded-xl transition-all hover:scale-105 active:scale-95">
              <Info size={20} className="text-slate-300" />
            </button>
          </div>
        </div>
      </div>
    </motion.header>
  );
};
