import { useState } from 'react';
import { X, ExternalLink, MapPin, Calendar, GraduationCap, Users, Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeIdeology, type IdeologyAnalysis } from '@/utils/geminiService';

export const RepresentativePanel: React.FC = () => {
  const { map, setSelectedRepresentative } = useStore();
  const rep = map.selectedRepresentative;
  const [ideology, setIdeology] = useState<IdeologyAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!rep) return null;

  const handleAnalyzeIdeology = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeIdeology(
        rep.name,
        rep.party,
        rep.bio?.summary
      );
      setIdeology(result);
    } catch (error) {
      console.error('Failed to analyze ideology:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const partyColors = {
    Democrat: 'from-blue-600 via-blue-500 to-cyan-500',
    Republican: 'from-red-600 via-rose-500 to-pink-500',
    Independent: 'from-purple-600 via-violet-500 to-indigo-500',
    Other: 'from-slate-600 via-slate-500 to-gray-500',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 400 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 400 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-screen w-full max-w-xl bg-gradient-to-b from-slate-900/98 to-slate-950/98 backdrop-blur-2xl border-l border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-40 flex flex-col"
      >
        {/* Header */}
        <div className={`relative bg-gradient-to-br ${partyColors[rep.party]} p-8 text-white overflow-hidden`}>
          <div className="absolute inset-0 bg-black/10"></div>
          <button
            onClick={() => setSelectedRepresentative(null)}
            className="absolute top-5 right-5 p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all hover:scale-110 active:scale-95 backdrop-blur-sm z-10"
          >
            <X size={24} />
          </button>

          <div className="relative z-10">
            {rep.imageUrl && (
              <img
                src={rep.imageUrl}
                alt={rep.name}
                className="w-36 h-36 rounded-2xl border-4 border-white/40 mb-5 object-cover shadow-xl"
              />
            )}

            <h2 className="text-4xl font-bold mb-3 tracking-tight">{rep.name}</h2>
            <div className="flex items-center gap-2.5 text-lg mb-3 opacity-90">
              <MapPin size={20} />
              <span>{rep.state} - District {rep.district}</span>
            </div>
            <div className="inline-block px-4 py-1.5 bg-white/25 backdrop-blur-sm rounded-full text-sm font-semibold shadow-lg">
              {rep.party}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5" style={{ scrollBehavior: 'smooth' }}>
          {/* Term Information */}
          <section className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50 shadow-lg">
            <div className="flex items-center gap-2.5 mb-3">
              <Calendar size={20} className="text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Term of Service</h3>
            </div>
            <p className="text-slate-300 font-medium text-lg">
              {rep.startYear} - {rep.endYear || 'Present'}
            </p>
          </section>

          {/* Biography */}
          {rep.bio && (
            <>
              {rep.bio.summary && (
                <section className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-3">Biography</h3>
                  <p className="text-slate-300 leading-relaxed">{rep.bio.summary}</p>
                  
                  {/* Analyze Ideologies Button */}
                  <button
                    onClick={handleAnalyzeIdeology}
                    disabled={isAnalyzing}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-600 disabled:to-slate-700 rounded-lg transition-all shadow-lg hover:shadow-purple-500/30 text-white font-semibold hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>Analyze Ideologies</span>
                      </>
                    )}
                  </button>
                </section>
              )}

              {/* Ideology Analysis Results */}
              {ideology && (
                <section className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-sm rounded-2xl p-5 border border-purple-500/50 shadow-lg">
                  <div className="flex items-center gap-2.5 mb-4">
                    <Sparkles size={20} className="text-purple-400" />
                    <h3 className="text-lg font-bold text-white">Ideology Analysis</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-purple-300 font-semibold">Economic:</span>{' '}
                      <span className="text-white">{ideology.economic}</span>
                    </div>
                    <div>
                      <span className="text-purple-300 font-semibold">Social:</span>{' '}
                      <span className="text-white">{ideology.social}</span>
                    </div>
                    <div className="pt-2 border-t border-purple-500/30">
                      <p className="text-slate-300 leading-relaxed">{ideology.summary}</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Early Life */}
              {rep.bio.earlyLife && (
                <section className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-3">Early Life</h3>
                  <div className="space-y-3 text-slate-300">
                    {rep.bio.birthDate && (
                      <div>
                        <span className="text-slate-400 font-medium">Born:</span>{' '}
                        <span>{rep.bio.birthDate}</span>
                        {rep.bio.birthPlace && <span> in {rep.bio.birthPlace}</span>}
                      </div>
                    )}
                    <p className="leading-relaxed">{rep.bio.earlyLife}</p>
                  </div>
                </section>
              )}

              {/* Education */}
              {rep.bio.education && rep.bio.education.length > 0 && (
                <section className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50 shadow-lg">
                  <div className="flex items-center gap-2.5 mb-3">
                    <GraduationCap size={20} className="text-emerald-400" />
                    <h3 className="text-lg font-bold text-white">Education</h3>
                  </div>
                  <ul className="space-y-2">
                    {rep.bio.education.map((edu, idx) => (
                      <li key={idx} className="text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">•</span>
                        <span>{edu}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Family */}
              {rep.bio.family && (
                <section className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50 shadow-lg">
                  <div className="flex items-center gap-2.5 mb-3">
                    <Users size={20} className="text-emerald-400" />
                    <h3 className="text-lg font-bold text-white">Family</h3>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{rep.bio.family}</p>
                </section>
              )}
            </>
          )}

          {/* Key Stances */}
          {rep.stances && rep.stances.length > 0 && (
            <section className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4">Key Political Stances</h3>
              <div className="space-y-3">
                {rep.stances.map((stance, idx) => (
                  <div key={idx} className="border-l-4 border-emerald-500 pl-4 py-2">
                    <div className="font-semibold text-white mb-1">{stance.topic}</div>
                    <p className="text-sm text-slate-300 mb-1">{stance.position}</p>
                    <span className="text-xs text-slate-500 font-medium">Year: {stance.year}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Debates */}
          {rep.debates && rep.debates.length > 0 && (
            <section className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4">Notable Debates</h3>
              <div className="space-y-3">
                {rep.debates.map((debate, idx) => (
                  <div key={idx} className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/30">
                    <div className="font-semibold text-white mb-1">{debate.topic}</div>
                    <div className="text-sm text-slate-400">{debate.date}</div>
                    {debate.opponent && (
                      <div className="text-sm text-slate-300 mt-1">vs. {debate.opponent}</div>
                    )}
                    {debate.notes && (
                      <p className="text-sm text-slate-400 mt-2">{debate.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Wikipedia Link */}
          {rep.wikiUrl && (
            <a
              href={rep.wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/30 text-white font-semibold hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>View on Wikipedia</span>
              <ExternalLink size={18} />
            </a>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
