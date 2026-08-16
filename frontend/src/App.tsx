/* ═══════════════════════════════════════════════════════════
   App.tsx — Root application with routing
   ═══════════════════════════════════════════════════════════ */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from './stores/useAuthStore';
import AppLayout from './components/layout/AppLayout';
import LoginScreen from './components/auth/LoginScreen';
import Overview from './pages/Overview';
import ThreatIntelligence from './pages/ThreatIntelligence';
import NetworkMonitor from './pages/NetworkMonitor';
import PacketAnalyzer from './pages/PacketAnalyzer';
import VulnerabilityScanner from './pages/VulnerabilityScanner';
import Incidents from './pages/Incidents';
import Hosts from './pages/Hosts';
import SecurityLogs from './pages/SecurityLogs';
import Analytics from './pages/Analytics';
import AIAnalyst from './pages/AIAnalyst';
import Automation from './pages/Automation';
import Settings from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <LoginScreen />}
          />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Overview />} />
            <Route path="/threats" element={<ThreatIntelligence />} />
            <Route path="/network" element={<NetworkMonitor />} />
            <Route path="/packets" element={<PacketAnalyzer />} />
            <Route path="/vulnerabilities" element={<VulnerabilityScanner />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/hosts" element={<Hosts />} />
            <Route path="/logs" element={<SecurityLogs />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ai-analyst" element={<AIAnalyst />} />
            <Route path="/automation" element={<Automation />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
