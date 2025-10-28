import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { dataManager, type ScrapingProgress } from '@/utils/dataManager';
import { geminiCollector } from '@/utils/geminiClient';

export const DataSetup: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [scraping, setScraping] = useState(false);
  const [progress, setProgress] = useState<ScrapingProgress | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setHasGeminiKey(geminiCollector.hasAPIKey());
    setHasData(await dataManager.hasData());
    
    try {
      const dbStats = await dataManager.getStats();
      setStats(dbStats);
    } catch (error) {
      console.error('Error getting stats:', error);
    }
  };

  const startFullScrape = async () => {
    if (!hasGeminiKey) {
      alert('Please add VITE_GEMINI_API_KEY to your .env file first!');
      return;
    }

    if (!confirm('This will scrape ALL congressional data from 1789-2024. This may take 30-60 minutes and use API quota. Continue?')) {
      return;
    }

    setScraping(true);
    
    try {
      await dataManager.scrapeFullHistory((prog) => {
        setProgress(prog);
      });
      
      alert('✅ Full scrape complete! Refresh to use the data.');
      await checkStatus();
    } catch (error) {
      console.error('Scrape failed:', error);
      alert('❌ Scrape failed. Check console for details.');
    } finally {
      setScraping(false);
      setProgress(null);
    }
  };

  const exportData = async () => {
    try {
      const json = await dataManager.exportToJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `congressional-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('❌ Export failed');
    }
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        await dataManager.importFromJSON(text);
        alert('✅ Data imported successfully!');
        await checkStatus();
      } catch (error) {
        console.error('Import failed:', error);
        alert('❌ Import failed');
      }
    };
    input.click();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Data Setup</h2>
                <p className="text-slate-400 text-sm mt-1">Configure congressional data scraping</p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* API Status */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-3">API Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Gemini API</span>
                  {hasGeminiKey ? (
                    <span className="text-emerald-400 flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                      Connected
                    </span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                      Not configured
                    </span>
                  )}
                </div>
                {!hasGeminiKey && (
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-300">
                      Add <code className="bg-slate-900 px-2 py-1 rounded">VITE_GEMINI_API_KEY</code> to your .env file
                    </p>
                    <p className="text-xs text-amber-400 mt-1">
                      Get your key at: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">aistudio.google.com</a>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Database Stats */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-3">Database Status</h3>
              {stats ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-3xl font-bold text-emerald-400">{stats.totalMembers.toLocaleString()}</div>
                    <div className="text-sm text-slate-400">Total Members</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-400">{stats.congressesCovered.length}</div>
                    <div className="text-sm text-slate-400">Congress Sessions</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-purple-400">{stats.yearRange.min}</div>
                    <div className="text-sm text-slate-400">Earliest Year</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-purple-400">{stats.yearRange.max}</div>
                    <div className="text-sm text-slate-400">Latest Year</div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-center py-4">
                  {hasData ? 'Loading stats...' : 'No data yet - scrape to begin'}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={startFullScrape}
                disabled={!hasGeminiKey || scraping}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {scraping ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Scraping...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Scrape Full History (1789-2024)
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={exportData}
                  disabled={!hasData}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2 px-4 rounded-xl transition-colors"
                >
                  Export Data
                </button>
                <button
                  onClick={importData}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors"
                >
                  Import Data
                </button>
              </div>
            </div>

            {/* Progress */}
            {progress && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">
                    Congress {progress.congressNumber}
                  </span>
                  <span className="text-slate-400 text-sm">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-slate-300">{progress.message}</p>
              </div>
            )}

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <h4 className="text-blue-300 font-semibold mb-2">ℹ️ How This Works</h4>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• Gemini AI scrapes Wikipedia and other sources</li>
                <li>• Data is stored locally in your browser (IndexedDB)</li>
                <li>• Covers all 118 Congress sessions (1789-2024)</li>
                <li>• Includes biographies, votes, spectrum analysis</li>
                <li>• Export/import for backup and sharing</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
