import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, Eye, EyeOff, HelpCircle, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Signup
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // --- LOGIN LOGIC ---
        await login(email, password);
        navigate('/dashboard');
      } else {
        // --- REGISTER LOGIC ---
        // We call the API directly since AuthContext only had login()
        const { data } = await api.post('/users', { name, email, password });
        // Auto-login after register by saving token
        localStorage.setItem('token', data.token);
        window.location.href = '/dashboard'; // Hard reload to trigger AuthContext check
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
            {/* Placeholder Image fitting the "Team" theme */}
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
              TaskKollecta helps teams collaborate efficiently, track progress, and deliver projects on time. Join thousands of teams already using our platform.
            </p>
          </blockquote>
        </div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="mx-auto w-full max-w-[400px] flex flex-col justify-center space-y-6">
          
          {/* Header */}
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-sm text-slate-500">
              {isLogin ? 'Sign in to your account to continue' : 'Enter your details below to create your account'}
            </p>
          </div>

          {/* Social Login Buttons (Visual Only) */}
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" type="button" disabled={isLoading}>
              {/* Google SVG Icon */}
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
              Google
            </Button>
            <Button variant="outline" type="button" disabled={isLoading}>
              {/* GitHub SVG Icon */}
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="github" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512"><path fill="currentColor" d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-24.4 7.6-48 20.1-65.5-2-5.6-8.7-31 1.9-66.2 0 0 19.3-6.2 63.5 24.6 18.3-5.1 38-7.7 58-7.7 19.9 0 39.7 2.6 58 7.7 44.2-30.8 63.5-24.6 63.5-24.6 10.6 35.2 4 60.6 2 66.2 12.6 17.5 20.1 41.1 20.1 65.5 0 96.6-56.7 104.2-112.6 110.2 9.1 7.9 17.3 23.5 17.3 47.3 0 34.3-.3 62-.3 70.3 0 6.5 4.6 14.7 17.3 12.1C426.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"></path></svg>
              GitHub
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">Or continue with email</span></div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Show Name field ONLY if registering */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="John Doe" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password (Only on Login) */}
            {isLogin && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" />
                  <Label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Remember me
                  </Label>
                </div>
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  Forgot password?
                </a>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded flex items-center">
                 {error}
              </div>
            )}

            <Button type="submit" className="w-full bg-slate-950 hover:bg-slate-800 text-white" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLogin ? 'Sign in' : 'Create Account'}
            </Button>
          </form>

          {/* Footer / Toggle */}
          <div className="text-center text-sm text-slate-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="underline underline-offset-4 hover:text-primary font-semibold text-blue-600"
            >
              {isLogin ? 'Sign up for free' : 'Sign in'}
            </button>
          </div>

          <p className="px-8 text-center text-xs text-slate-500">
            By continuing, you agree to our{' '}
            <a href="#" className="underline underline-offset-4 hover:text-primary">Terms of Service</a>{' '}
            and{' '}
            <a href="#" className="underline underline-offset-4 hover:text-primary">Privacy Policy</a>.
          </p>

        </div>
      </div>

      {/* Help Button (Floating) */}
      <button className="fixed bottom-6 right-6 bg-slate-900 text-white p-3 rounded-full shadow-lg hover:bg-slate-800 transition">
        <HelpCircle className="h-6 w-6" />
      </button>

    </div>
  );
}