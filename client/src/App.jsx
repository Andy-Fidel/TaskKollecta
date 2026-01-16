import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import ProjectBoard from './pages/ProjectBoard';
import AppLayout from './components/AppLayout';
import Team from './pages/Team';
import MyTasks from './pages/MyTasks';
import Settings from './pages/Settings';
import FormBuilder from './pages/FormBuilder';
import PublicForm from './pages/PublicForm';
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider"
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import LandingPage from './pages/LandingPage';
import { SocketProvider } from './context/SocketContext';


const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

// A wrapper to protect routes
const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
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
          
          {/* Wrap all internal pages with AppLayout */}
          <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Workspace />} />
            <Route path="/workspace/:orgId" element={<Workspace />} />
            <Route path="/project/:projectId" element={<ProjectBoard />} />
            <Route path="/team" element={<Team />} />
            <Route path="/tasks" element={<MyTasks />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/project/:projectId/forms/new" element={<FormBuilder />} />
            {/* Add placeholders for other sidebar links if needed */}
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