import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LangProvider } from './context/LangContext';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Workouts from './pages/Workouts';
import Meals from './pages/Meals';
import Weight from './pages/Weight';
import Coach from './pages/Coach';
import Settings from './pages/Settings';
import Calendar from './pages/Calendar';
import PRBoard from './pages/PRBoard';
import Navbar from './components/Navbar';
import RestTimer from './components/RestTimer';

// MusclePreview is a design-exploration page that pulls in three.js via
// MuscleMap3D. Lazy-load so the three.js bundle only downloads when someone
// actually visits /muscle-preview, not on every page load.
const MusclePreview = lazy(() => import('./pages/MusclePreview'));
const MusclePreviewV6 = lazy(() => import('./pages/MusclePreviewV6'));

const RouteFallback = () => (
  <div className="loading-screen"><div className="spinner" /></div>
);

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user, token } = useAuth();
  const [restDuration, setRestDuration] = useState(90);

  useEffect(() => {
    if (!token) return;
    fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(s => { if (s && s.default_rest_duration) setRestDuration(s.default_rest_duration); })
      .catch(() => {});
  }, [token]);

  return (
    <>
      {user && <Navbar />}
      {user && <RestTimer defaultSeconds={restDuration} />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/workouts" element={<PrivateRoute><Workouts /></PrivateRoute>} />
        <Route path="/meals" element={<PrivateRoute><Meals /></PrivateRoute>} />
        <Route path="/weight" element={<PrivateRoute><Weight /></PrivateRoute>} />
        <Route path="/coach" element={<PrivateRoute><Coach /></PrivateRoute>} />
        <Route path="/calendar" element={<PrivateRoute><Calendar /></PrivateRoute>} />
        <Route path="/prs" element={<PrivateRoute><PRBoard /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/muscle-preview" element={
          <PrivateRoute>
            <Suspense fallback={<RouteFallback />}>
              <MusclePreview />
            </Suspense>
          </PrivateRoute>
        } />
        <Route path="/muscle-preview-v6" element={
          <Suspense fallback={<RouteFallback />}>
            <MusclePreviewV6 />
          </Suspense>
        } />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
