import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Users, Waypoints } from 'lucide-react';
import { getCongressForYear, getCoalitionEvents, getOrdinalSuffix, type CoalitionEvent } from '@/utils/congress-majorities';

interface Props {
    currentYear: number;
}

export const CongressMajorityPanel: React.FC<Props> = ({ currentYear }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const congress = getCongressForYear(currentYear);
    const coalitionEvents = congress ? getCoalitionEvents(congress.number) : [];

    if (!congress) return null;

    const majorityColor = congress.houseMajority === 'Democrat' ? '#2563eb' : '#dc2626';
    const majorityBg = congress.houseMajority === 'Democrat' ? 'from-blue-500/20 to-blue-600/10' : 'from-red-500/20 to-red-600/10';
    const ordinal = getOrdinalSuffix(congress.number);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed top-24 left-4 z-50 max-w-xs"
        >
            <div className={`bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-slate-600/30 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] overflow-hidden`}>
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Users size={18} className="text-slate-400" />
                            <div>
                                <div className="text-lg font-bold text-white">
                                    {congress.number}{ordinal} Congress
                                </div>
                                <div className="text-xs text-slate-400">
                                    {congress.startYear}–{congress.endYear}
                                </div>
                            </div>
                        </div>

                        {coalitionEvents.length > 0 && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                                title={isExpanded ? 'Collapse' : 'Show coalition events'}
                            >
                                {isExpanded ? (
                                    <ChevronUp size={16} className="text-slate-300" />
                                ) : (
                                    <ChevronDown size={16} className="text-slate-300" />
                                )}
                            </button>
                        )}
                    </div>

                    <div className={`mt-3 px-3 py-2 rounded-xl bg-gradient-to-r ${majorityBg} border border-opacity-20`} style={{ borderColor: majorityColor }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full shadow-lg"
                                    style={{ backgroundColor: majorityColor, boxShadow: `0 0 8px ${majorityColor}60` }}
                                />
                                <span className="text-sm font-semibold" style={{ color: majorityColor }}>
                                    {congress.houseMajority} Majority
                                </span>
                            </div>
                            {congress.houseSeats && (
                                <div className="text-xs text-slate-400">
                                    <span style={{ color: '#2563eb' }}>{congress.houseSeats.dem}</span>
                                    <span className="mx-1">–</span>
                                    <span style={{ color: '#dc2626' }}>{congress.houseSeats.rep}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {isExpanded && coalitionEvents.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-3 border-t border-slate-700/50 pt-3">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Waypoints size={14} className="text-amber-400" />
                                    <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">
                                        Coalition Events
                                    </span>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {coalitionEvents.map((event: CoalitionEvent, idx: number) => (
                                        <div key={idx} className="bg-slate-800/50 rounded-lg px-3 py-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-white">{event.title}</span>
                                                <span className="text-xs text-slate-500">{event.year}</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                {event.description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {coalitionEvents.length > 0 && !isExpanded && (
                    <div className="px-4 pb-2">
                        <div className="text-xs text-amber-400/70 flex items-center gap-1">
                            <Waypoints size={12} />
                            <span>{coalitionEvents.length} coalition event{coalitionEvents.length > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
