import { Map as MapIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export const Header: React.FC = () => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 bg-slate-900 border-b border-slate-800 shadow-md z-30"
    >
      <div className="max-w-screen-2xl mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-xl shadow">
              <MapIcon size={22} className="text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Atlas of Independence
            </h1>
          </div>

          {/* Controls removed for now (no turnout/margin/battlegrounds data) */}
          <div />
        </div>
      </div>
    </motion.header>
  );
};
