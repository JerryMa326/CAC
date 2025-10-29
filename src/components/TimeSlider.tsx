import { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Calendar } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { motion } from 'framer-motion';

export const TimeSlider: React.FC = () => {
  const { timeline, setYear, togglePlay, setPlaySpeed } = useStore();
  const [localYear, setLocalYear] = useState(timeline.currentYear);

  useEffect(() => {
    setLocalYear(timeline.currentYear);
  }, [timeline.currentYear]);

  useEffect(() => {
    if (!timeline.isPlaying) return;

    const interval = setInterval(() => {
      setYear(Math.min(timeline.currentYear + 2, timeline.maxYear));
      if (timeline.currentYear >= timeline.maxYear) {
        togglePlay();
      }
    }, 1000 / timeline.playSpeed);

    return () => clearInterval(interval);
  }, [timeline.isPlaying, timeline.currentYear, timeline.playSpeed]);

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const year = parseInt(e.target.value);
    setLocalYear(year);
  };

  const commitYear = () => {
    setYear(localYear);
  };

  const jumpYears = (delta: number) => {
    const newYear = Math.max(timeline.minYear, Math.min(timeline.maxYear, timeline.currentYear + delta));
    setYear(newYear);
  };

  const getEraName = (year: number): string => {
    if (year < 1969) return 'LBJ, Great Society';
    if (year < 1974) return 'Nixon';
    if (year < 1977) return 'Ford';
    if (year < 1981) return 'Carter';
    if (year < 1989) return 'Reagan, Reagan Revolution';
    if (year < 1993) return 'George H.W. Bush';
    if (year < 2001) return 'Clinton';
    if (year < 2009) return 'George W. Bush';
    if (year < 2017) return 'Obama';
    if (year < 2021) return 'Trump';
    return 'Biden';
  };

  const majorElections = [1964, 1968, 1972, 1976, 1980, 1984, 1988, 1992, 1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed bottom-6 left-0 right-0 mx-auto w-[95%] max-w-[80rem] bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-2xl border border-slate-600/30 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-50"
    >
      <div className="px-6 py-5 flex flex-col gap-5">
        {/* Year Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="text-emerald-400" size={32} />
            <div>
              <div className="text-5xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent tracking-tight transition-all duration-300">
                {timeline.currentYear}
              </div>
              <div className="text-xs text-emerald-500/60 mt-1 font-medium uppercase tracking-wide">
                {getEraName(timeline.currentYear)}
              </div>
            </div>
          </div>
          
          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => jumpYears(-10)}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600/40 transition-all hover:scale-105 active:scale-95"
              title="Back 10 years"
            >
              <SkipBack size={18} className="text-slate-300" />
            </button>
            
            <button
              onClick={togglePlay}
              className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95"
            >
              {timeline.isPlaying ? (
                <Pause size={22} className="text-white" />
              ) : (
                <Play size={22} className="text-white ml-0.5" />
              )}
            </button>
            
            <button
              onClick={() => jumpYears(10)}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600/40 transition-all hover:scale-105 active:scale-95"
              title="Forward 10 years"
            >
              <SkipForward size={18} className="text-slate-300" />
            </button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 font-medium">Speed:</span>
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaySpeed(speed)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  timeline.playSpeed === speed
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700 border border-slate-600/30'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Slider */}
        <div className="relative py-2">
          <input
            type="range"
            min={timeline.minYear}
            max={timeline.maxYear}
            value={localYear}
            onChange={handleYearChange}
            onMouseUp={commitYear}
            onTouchEnd={commitYear}
            className="w-full h-2 rounded-full appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, 
                #10b981 0%, 
                #14b8a6 ${
                ((localYear - timeline.minYear) / (timeline.maxYear - timeline.minYear)) * 100
              }%, 
                #1e293b ${
                ((localYear - timeline.minYear) / (timeline.maxYear - timeline.minYear)) * 100
              }%, 
                #1e293b 100%)`,
            }}
          />
          
          {/* Major Election Markers */}
          <div className="absolute w-full top-0 h-2 pointer-events-none">
            {majorElections
              .filter(year => year >= timeline.minYear && year <= timeline.maxYear)
              .map((year) => {
                const position = ((year - timeline.minYear) / (timeline.maxYear - timeline.minYear)) * 100;
                return (
                  <div
                    key={year}
                    className="absolute w-1.5 h-5 bg-amber-400 rounded-full shadow-lg shadow-amber-400/50"
                    style={{ left: `${position}%`, top: '-6px', transform: 'translateX(-50%)' }}
                    title={`Major election: ${year}`}
                  />
                );
              })}
          </div>
        </div>

        {/* Year Labels */}
        <div className="flex justify-between text-xs text-slate-500 font-medium px-1">
          <span>{timeline.minYear}</span>
          <span>1975</span>
          <span>1985</span>
          <span>1995</span>
          <span>2005</span>
          <span>2015</span>
          <span>{timeline.maxYear}</span>
        </div>
      </div>
    </motion.div>
  );
};
