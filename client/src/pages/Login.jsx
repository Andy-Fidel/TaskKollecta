import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, Eye, EyeOff, HelpCircle, Users } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Invite State
  const [inviteToken, setInviteToken] = useState('');
  const [inviteInfo, setInviteInfo] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // --- Detect invite token and OAuth redirect ---
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const invite = params.get('invite');

    // Handle Google OAuth redirect
    if (token) {
      localStorage.setItem('token', token);
      window.location.href = '/dashboard';
      return;
    }

    // Handle invite link
    if (invite) {
      setInviteToken(invite);
      setIsLogin(false); // Switch to signup

      // Validate invite
      api.get(`/invites/${invite}`)
        .then(({ data }) => {
          setInviteInfo(data);
          if (data.email) setEmail(data.email);
        })
        .catch(() => {
          setError('Invalid or expired invite link');
        });
    }
  }, [location]);

  // --- Google Button Handler ---
  const handleGoogleLogin = () => {
    const googleUrl = inviteToken
      ? `http://localhost:5000/api/users/google?invite=${inviteToken}`
      : 'http://localhost:5000/api/users/google';
    window.location.href = googleUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        navigate('/dashboard');
      } else {
        // Register Logic - include invite token if present
        const payload = { name, email, password };
        if (inviteToken) payload.inviteToken = inviteToken;

        const { data } = await api.post('/users', payload);
        localStorage.setItem('token', data.token);
        window.location.href = '/onboarding';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">

      {/* LEFT SIDE: Image & Branding */}
      <div className="hidden lg:flex relative h-full flex-col bg-slate-900 text-white p-10 dark:border-r">
        <div className="absolute inset-0 bg-slate-900">
          <img
            src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=2000"
            alt="Team collaboration"
            className="w-full h-full object-cover opacity-50"
          />
        </div>
        <div className="relative z-20 flex items-center text-lg font-medium">
          <div className="bg-purple-600 text-white p-1 rounded mr-2 font-bold">TK</div>
          TaskKollecta
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <h1 className="text-3xl font-bold">Manage your projects with ease</h1>
            <p className="text-lg text-slate-300">
              TaskKollecta helps teams collaborate efficiently, track progress, and deliver projects on time.
            </p>
          </blockquote>
        </div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="mx-auto w-full max-w-[400px] flex flex-col justify-center space-y-6">

          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-sm text-slate-500">
              {isLogin ? 'Sign in to your account to continue' : 'Enter your details below to create your account'}
            </p>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-1 gap-4">
            <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin}>
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
              Continue with Google
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">Or continue with email</span></div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter your e-mail.." value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" />
                  <Label htmlFor="remember" className="text-sm font-medium leading-none">Remember me</Label>
                </div>
                <a href="/forgot-password" class="text-xs text-blue-600 hover:underline">Forgot?</a>
              </div>
            )}

            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded">{error}</div>}

            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLogin ? 'Sign in' : 'Create Account'}
            </Button>
          </form>

          <div className="text-center text-sm text-slate-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="underline underline-offset-4 hover:text-primary font-semibold text-blue-600">
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>

        </div>
      </div>

      {/* Help Button */}
      <button className="fixed bottom-6 right-6 bg-slate-900 text-white p-3 rounded-full shadow-lg hover:bg-slate-800 transition">
        <HelpCircle className="h-6 w-6" />
      </button>
    </div>
  );
}