import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import ProjectBoard from './pages/ProjectBoard';
import AppLayout from './components/AppLayout';
import Team from './pages/Team';
import MyTasks from './pages/MyTasks';
import CalendarView from './pages/CalendarView';
import GanttChart from './pages/GanttChart';
import SprintReports from './pages/SprintReports';
import WorkloadView from './pages/WorkloadView';
import Settings from './pages/Settings';
import FormBuilder from './pages/FormBuilder';
import PublicForm from './pages/PublicForm';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import OnboardingWizard from './pages/OnboardingWizard';
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider"
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import LandingPage from './pages/LandingPage';
import { SocketProvider } from './context/SocketContext';


const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (user) {
    // Redirect to onboarding if not completed
    if (!user.onboardingCompleted) return <Navigate to="/onboarding" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// A wrapper to protect routes - redirects to onboarding if not completed
const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" />;

  // Allow access to onboarding page even if not completed
  if (!user.onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

// A wrapper for superadmin routes
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'superadmin') return <Navigate to="/dashboard" />;
  return children;
};

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <SocketProvider>
          <Router>
            <Routes>
              <Route path="/" element={
                <PublicRoute>
                  <LandingPage />
                </PublicRoute>
              } />

              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/forms/:formId" element={<PublicForm />} />

              {/* Onboarding - outside AppLayout */}
              <Route path="/onboarding" element={
                <PrivateRoute>
                  <OnboardingWizard />
                </PrivateRoute>
              } />

              {/* Wrap all internal pages with AppLayout */}
              <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/projects" element={<Workspace />} />
                <Route path="/workspace/:orgId" element={<Workspace />} />
                <Route path="/project/:projectId" element={<ProjectBoard />} />
                <Route path="/team" element={<Team />} />
                <Route path="/tasks" element={<MyTasks />} />
                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/gantt" element={<GanttChart />} />
                <Route path="/reports" element={<SprintReports />} />
                <Route path="/workload" element={<WorkloadView />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/project/:projectId/forms/new" element={<FormBuilder />} />
                <Route path="/admin" element={<AdminRoute><SuperAdminDashboard /></AdminRoute>} />
              </Route>

            </Routes>
          </Router>
          <Toaster position="top-center" richColors />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;