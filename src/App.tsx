import { Header } from './components/Header';
import { Map } from './components/Map';
import { TimeSlider } from './components/TimeSlider';
import { RepresentativePanel } from './components/RepresentativePanel';
import { useEffect, useState } from 'react';
import { congressDataAPI } from '@/utils/congressDataApi';

function App() {
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    // Load congressional data on startup
    congressDataAPI.init()
      .then(() => {
        console.log('✅ Congressional data loaded');
        console.log('Stats:', congressDataAPI.getStats());
        setDataReady(true);
      })
      .catch(error => {
        console.error('❌ Failed to load data:', error);
        // App will use mock data as fallback
        setDataReady(true);
      });
  }, []);

  if (!dataReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-xl text-slate-300">Loading Congressional Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-950">
      <Header />
      <Map />
      <TimeSlider />
      <RepresentativePanel />
    </div>
  );
}

export default App;
