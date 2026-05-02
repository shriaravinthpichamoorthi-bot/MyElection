import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { LiveResultsProvider } from './context/LiveResultsContext';
import { createApiClient } from './utils/api';
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

const BIHAR_API_URL = import.meta.env.VITE_BIHAR_API_URL || 'http://127.0.0.1:8000';

const biharApiClient = createApiClient(BIHAR_API_URL);

const biharConfig = {
  candidateJson: '/bihar_candidates_2025.json',
  districtJson: '/bihar_districts.json',
  apiClient: biharApiClient,
  allianceColors: {
    NDA: '#2E8B57',
    MGB: '#228B22',
    'Mahagathbandhan (Grand Alliance)': '#228B22',
    Others: '#607d8b',
    IND: '#607d8b',
  },
};

export default function App() {
  return (
    <DataProvider>
      <LiveResultsProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              {/* Historical / Static pages */}
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

              {/* Tamil Nadu Live */}
              <Route path="/live" element={<LiveDashboard />} />
              <Route path="/live/constituencies" element={<LiveConstituencies />} />
              <Route path="/live/districts" element={<LiveDistricts />} />
              <Route path="/live/district/:slug" element={<LiveDistrictDetail />} />
              <Route path="/live/:slug" element={<LiveConstituency />} />
              <Route path="/live-map" element={<LiveMapView />} />

              {/* Bihar Live */}
              <Route path="/bihar/live" element={
                <LiveResultsProvider config={biharConfig}>
                  <LiveDashboard
                    title="Bihar Assembly Elections 2025"
                    year="2025"
                    totalConstituencies={243}
                    alliancesOrder={['NDA', 'MGB', 'GDA', 'Others', 'IND']}
                    showAllianceChart={false}
                    declaredTitle="Live Results — 243 Declared"
                  />
                </LiveResultsProvider>
              } />
              <Route path="/bihar/live/constituencies" element={
                <LiveResultsProvider config={biharConfig}>
                  <LiveConstituencies />
                </LiveResultsProvider>
              } />
              <Route path="/bihar/live/districts" element={
                <LiveResultsProvider config={biharConfig}>
                  <LiveDistricts />
                </LiveResultsProvider>
              } />
              <Route path="/bihar/live/district/:slug" element={
                <LiveResultsProvider config={biharConfig}>
                  <LiveDistrictDetail />
                </LiveResultsProvider>
              } />
              <Route path="/bihar/live/:slug" element={
                <LiveResultsProvider config={biharConfig}>
                  <LiveConstituency />
                </LiveResultsProvider>
              } />

              <Route path="*" element={<div className="text-center py-20 text-slate-400">Page not found</div>} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </LiveResultsProvider>
    </DataProvider>
  );
}
