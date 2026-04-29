import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { LiveResultsProvider } from './context/LiveResultsContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Districts from './pages/Districts';
import DistrictDetail from './pages/DistrictDetail';
import Constituencies from './pages/Constituencies';
import ConstituencyDetail from './pages/ConstituencyDetail';
import Analytics from './pages/Analytics';
import Compare from './pages/Compare';
import Candidates from './pages/Candidates';
import CandidateProfile from './pages/CandidateProfile';
import MapView from './pages/MapView';
import Predictions from './pages/Predictions';
import LiveDashboard from './pages/LiveDashboard';
import LiveConstituencies from './pages/LiveConstituencies';
import LiveDistricts from './pages/LiveDistricts';
import LiveDistrictDetail from './pages/LiveDistrictDetail';
import LiveConstituency from './pages/LiveConstituency';
import LiveMapView from './pages/LiveMapView';

export default function App() {
  return (
    <DataProvider>
      <LiveResultsProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/districts" element={<Districts />} />
              <Route path="/district/:slug" element={<DistrictDetail />} />
              <Route path="/constituencies" element={<Constituencies />} />
              <Route path="/constituency/:slug" element={<ConstituencyDetail />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/candidates" element={<Candidates />} />
              <Route path="/candidate/:slug" element={<CandidateProfile />} />
              <Route path="/map" element={<MapView />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/live" element={<LiveDashboard />} />
              <Route path="/live/constituencies" element={<LiveConstituencies />} />
              <Route path="/live/districts" element={<LiveDistricts />} />
              <Route path="/live/district/:slug" element={<LiveDistrictDetail />} />
              <Route path="/live/:slug" element={<LiveConstituency />} />
              <Route path="/live-map" element={<LiveMapView />} />
              <Route path="*" element={<div className="text-center py-20 text-slate-400">Page not found</div>} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </LiveResultsProvider>
    </DataProvider>
  );
}
