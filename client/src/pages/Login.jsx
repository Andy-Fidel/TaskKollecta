import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, Eye, EyeOff, HelpCircle, Shield } from 'lucide-react';

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

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // --- Detect invite token and OAuth redirect ---
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const invite = params.get('invite');

    // Handle OAuth redirect
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
          if (data.email) setEmail(data.email);
        })
        .catch(() => {
          setError('Invalid or expired invite link');
        });
    }
  }, [location]);

  // --- SSO Handlers ---
  const handleGoogleLogin = () => {
    const googleUrl = inviteToken
      ? `https://taskkollecta-api.onrender.com/api/users/google?invite=${inviteToken}`
      : 'https://taskkollecta-api.onrender.com/api/users/google';
    window.location.href = googleUrl;
  };

  const handleMicrosoftLogin = () => {
    const microsoftUrl = inviteToken
      ? `https://taskkollecta-api.onrender.com/api/users/microsoft?invite=${inviteToken}`
      : 'https://taskkollecta-api.onrender.com/api/users/microsoft';
    window.location.href = microsoftUrl;
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
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 text-slate-900 p-4 sm:p-8 font-[Poppins]">
      {/* Background patterns/glows for aesthetic flair */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-grid-slate-200/[0.2]">
        <div className="absolute top-0 left-[20%] w-[500px] h-[500px] bg-indigo-200 rounded-full blur-[100px] opacity-20" />
        <div className="absolute bottom-0 right-[20%] w-[500px] h-[500px] bg-purple-200 rounded-full blur-[100px] opacity-20" />
      </div>

      <div className="w-full max-w-[450px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Logo and Branding */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="h-12 w-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20 mb-2">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            TaskKollecta
          </h1>
          <p className="text-slate-500 max-w-xs">
            {isLogin
              ? 'Welcome back to your workspace'
              : 'Join your team and start collaborating'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50">
          <div className="space-y-6">
            <div className="flex flex-col space-y-2 text-center mb-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {isLogin ? 'Sign In' : 'Create Account'}
              </h2>
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" className="w-full h-11 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all font-medium" onClick={handleGoogleLogin}>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </Button>
              <Button type="button" variant="outline" className="w-full h-11 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all font-medium" onClick={handleMicrosoftLogin}>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#80bb03" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
                Microsoft
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><Separator className="w-full bg-slate-200" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-slate-400 font-medium">Or continue with email</span></div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700">Full Name</Label>
                  <Input id="name" placeholder="John Doe" className="h-11 bg-slate-50 border-slate-200 text-slate-900 focus:ring-slate-900" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">Email</Label>
                <Input id="email" type="email" placeholder="name@example.com" className="h-11 bg-slate-50 border-slate-200 text-slate-900 focus:ring-slate-900" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700">Password</Label>
                  {isLogin && (
                    <a href="/forgot-password" size="sm" className="text-xs text-indigo-600 font-medium hover:underline underline-offset-4">
                      Forgot?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="h-11 bg-slate-50 border-slate-200 pr-10 text-slate-900 focus:ring-slate-900" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" className="rounded-[4px] border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:text-white" />
                  <Label htmlFor="remember" className="text-sm font-medium leading-none cursor-pointer text-slate-600">Keep me signed in</Label>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-center">
                  <div className="mr-2">⚠️</div>
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-slate-900/20" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="text-center text-sm">
              <span className="text-slate-500">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-indigo-600 font-semibold hover:underline underline-offset-4">
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 px-8">
          By clicking continue, you agree to our{' '}
          <a href="#" className="underline underline-offset-4 hover:text-slate-900">Terms of Service</a>{' '}
          and{' '}
          <a href="#" className="underline underline-offset-4 hover:text-slate-900">Privacy Policy</a>.
        </p>
      </div>

      {/* Help Button - subtle version */}
      <button className="fixed bottom-6 right-6 p-3 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm">
        <HelpCircle className="h-5 w-5" />
      </button>
    </div>
  );
}
