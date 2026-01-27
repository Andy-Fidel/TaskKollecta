import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, Eye, EyeOff, HelpCircle, Shield, LayoutActive } from 'lucide-react';

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
          setInviteInfo(data);
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
      ? `http://localhost:5000/api/users/google?invite=${inviteToken}`
      : 'http://localhost:5000/api/users/google';
    window.location.href = googleUrl;
  };

  const handleMicrosoftLogin = () => {
    const microsoftUrl = inviteToken
      ? `http://localhost:5000/api/users/microsoft?invite=${inviteToken}`
      : 'http://localhost:5000/api/users/microsoft';
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
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4 sm:p-8">
      {/* Background patterns/glows for aesthetic flair */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-[450px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Logo and Branding */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="h-12 w-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 mb-2">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            TaskKollecta
          </h1>
          <p className="text-muted-foreground max-w-xs">
            {isLogin
              ? 'Welcome back to your workspace'
              : 'Join your team and start collaborating'}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="space-y-6">
            <div className="flex flex-col space-y-2 text-center mb-4">
              <h2 className="text-xl font-semibold">
                {isLogin ? 'Sign In' : 'Create Account'}
              </h2>
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" className="w-full h-11 border-border bg-background hover:bg-accent transition-all" onClick={handleGoogleLogin}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M5.26628414,19.7674419 C4.45615483,19.7674419 3.71235844,19.5350303 3.03489814,19.0702081 L1.2134548,20.4851457 C2.2882252,21.5600216 3.6934419,22.2222222 5.26628414,22.2222222 C11.0880327,22.2222222 15.8139535,17.4963014 15.8139535,11.6745528 C15.8139535,11.0425946 15.7508678,10.4259461 15.6310243,9.83333333 L5.26628414,9.83333333 L5.26628414,12.924874 L12.5152503,12.924874 C12.2037943,14.545239 11.2721853,15.9392231 10.0153835,16.8967406 L12.3387877,18.6657802 C13.7196011,17.3917822 14.5581395,15.5492448 14.5581395,13.4883721 C14.5581395,12.420959 13.9870195,11.4552846 13.1166649,10.8333333 L5.26628414,10.8333333 Z"
                  />
                  <path
                    fill="#34A853"
                    d="M16.0407269,5.11258547 L13.4357416,7.71757077 C11.9329759,6.72661871 10.1245089,6.13953488 8.18604651,6.13953488 C4.32924151,6.13953488 1.20930233,9.25947406 1.20930233,13.1162791 C1.20930233,14.0544833 1.39344449,14.9496057 1.72493541,15.7674419 L3.54637875,14.3525043 C3.19702175,13.7190038 3,12.996124 3,12.2222222 C3,9.3381295 5.3381295,7 8.22222222,7 C9.6618705,7 10.9634543,7.58273381 11.9064748,8.52575432 L13.6262444,6.80598472 C12.285514,5.46525432 10.4504104,4.63953488 8.41860465,4.63953488 C5.24589965,4.63953488 2.41031333,6.29910469 0.77884814,8.83333333 L2.60029148,10.2482709 C3.67506188,9.1735005 5.15243169,8.51162791 6.80232558,8.51162791 C10.6591306,8.51162791 13.7790698,11.6315671 13.7790698,15.4883721 C13.7790698,16.4265763 13.5949276,17.3216987 13.2634367,18.1395349 L15.0848801,16.7245973 C15.4342371,17.3580978 15.6312588,18.0809776 15.6312588,18.8548794 L15.6312588,18.8548794 L16.0407269,5.11258547 Z"
                  />
                  <path
                    fill="#4285F4"
                    d="M19.8333333,12.2222222 C19.8333333,11.2384214 19.6738466,10.2917781 19.3797669,9.40697674 L16.0348837,9.40697674 C16.5494208,10.2917781 16.8333333,11.3148148 16.8333333,12.4069767 C16.8333333,15.7196057 14.145939,18.4069767 10.8333333,18.4069767 C10.1245089,18.4069767 9.4447702,18.2831541 8.81395349,18.0560706 L7.4042861,19.8704204 C8.4552467,20.3703378 9.6151323,20.6511628 10.8333333,20.6511628 C15.8039324,20.6511628 19.8333333,16.6217619 19.8333333,11.6511628 L19.8333333,12.2222222 Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.7365633,15.7674419 C3.38720629,15.1339414 3.19018464,14.4110616 3.19018464,13.6371598 L3.19018464,13.6371598 L0.77884814,14.2482709 L0.77884814,15.3413142 C2.1265633,18.0069767 4.96214962,19.7674419 8.18604651,19.7674419 C9.6618705,19.7674419 11.0116279,19.3488372 12.1395349,18.627907 L10.3180915,17.2129694 C9.67056461,17.6369062 8.91054371,17.8837209 8.09302326,17.8837209 C5.98188176,17.8837209 4.16104278,16.545239 3.44755106,14.3525043 L1.62610772,15.7674419 Z"
                  />
                </svg>
                Google
              </Button>
              <Button type="button" variant="outline" className="w-full h-11 border-border bg-background hover:bg-accent transition-all" onClick={handleMicrosoftLogin}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
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
              <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground font-medium">Or continue with email</span></div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" className="h-11 bg-background" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="name@example.com" className="h-11 bg-background" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {isLogin && (
                    <a href="/forgot-password" size="sm" className="text-xs text-primary font-medium hover:underline underline-offset-4">
                      Forgot?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="h-11 bg-background pr-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" className="rounded-[4px]" />
                  <Label htmlFor="remember" className="text-sm font-medium leading-none cursor-pointer text-muted-foreground">Keep me signed in</Label>
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg flex items-center">
                  <div className="mr-2">⚠️</div>
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-primary font-semibold hover:underline underline-offset-4">
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground px-8">
          By clicking continue, you agree to our{' '}
          <a href="#" className="underline underline-offset-4 hover:text-primary">Terms of Service</a>{' '}
          and{' '}
          <a href="#" className="underline underline-offset-4 hover:text-primary">Privacy Policy</a>.
        </p>
      </div>

      {/* Help Button - subtle version */}
      <button className="fixed bottom-6 right-6 p-3 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-all shadow-sm">
        <HelpCircle className="h-5 w-5" />
      </button>
    </div>
  );
}
