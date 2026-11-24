import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SiteSettingsProvider } from './context/SiteSettingsContext';
import { PublicLayout } from './components/PublicLayout';
import { HomePage } from './pages/HomePage';
import { InventoryPage } from './pages/InventoryPage';
import { CarDetailPage } from './pages/CarDetailPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  return (
    <SiteSettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/cars" element={<InventoryPage />} />
            <Route path="/cars/:id" element={<CarDetailPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
          </Route>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SiteSettingsProvider>
  );
}
