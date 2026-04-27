import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
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

export default function App() {
  return (
    <DataProvider>
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
            <Route path="*" element={<div className="text-center py-20 text-slate-400">Page not found</div>} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </DataProvider>
  );
}
