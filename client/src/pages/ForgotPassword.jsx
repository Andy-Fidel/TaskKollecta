import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import api from '../api/axios';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/users/forgotpassword', { email });
      setSent(true);
      toast.success('Email sent! Check your inbox.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Reset Password</CardTitle>
          <CardDescription>Enter your email to receive a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
               <div className="bg-green-100 p-3 rounded-full w-fit mx-auto text-green-600">
                  <Mail className="w-6 h-6" />
               </div>
               <p className="text-sm text-slate-600">
                 If an account exists for <strong>{email}</strong>, we have sent a reset link.
               </p>
               <Button variant="outline" asChild className="w-full">
                 <Link to="/login">Back to Login</Link>
               </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full bg-slate-900" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : 'Send Reset Link'}
              </Button>
              <Button variant="link" asChild className="w-full text-slate-500">
                 <Link to="/" className="flex items-center gap-2 justify-center">
                    <ArrowLeft className="w-3 h-3" /> Back to Login
                 </Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}