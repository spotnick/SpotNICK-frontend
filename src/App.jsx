import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import VerifyEmail from './components/VerifyEmail';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ResendVerification from './components/ResendVerification';
import AdminPage from './components/AdminPage';
import PortalWifi from './components/PortalWifi';
import VerifySmsCode from './components/VerifySmsCode';
import LocationsMap from './components/LocationsMap';
import StatusWifi from './components/StatusWifi';
import Termos from './components/Termos';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-spotnicik-light">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-spotnicik-dark">Carregando...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/resend-verification" element={<ResendVerification />} />
		<Route path="/wifi" element={<PortalWifi />} />
		<Route path="/verify-sms" element={<VerifySmsCode />} />
        <Route path="/mapa" element={<LocationsMap />} />
        <Route path="/status" element={<StatusWifi />} />
		<Route path="/termos" element={<Termos />} />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AdminPage />
            </PrivateRoute>
          }
        />
		<Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}
