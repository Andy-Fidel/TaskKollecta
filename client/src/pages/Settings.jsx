import { useState } from 'react';
import { 
  User, Lock, Bell, Shield, Camera, Loader2 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Settings() {
  const { user, login } = useAuth(); // We might need to update the global user state
  
  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  // Handlers
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Send update
      const { data } = await api.put('/users/profile', { name, email, avatar: avatarUrl });
      // We need to update the local context/storage. 
      // A quick hack is to reload, but ideally AuthContext exposes a setUser method.
      localStorage.setItem('token', data.token);
      alert('Profile updated! Please refresh to see changes.'); 
    } catch (error) {
      alert('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setPasswordMsg('');
    try {
      await api.put('/users/password', { currentPassword, newPassword });
      setPasswordMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      setPasswordMsg(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your account settings and preferences.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        
        {/* Navigation Tabs */}
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* --- GENERAL TAB --- */}
        <TabsContent value="general" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your photo and personal details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20 border-2 border-slate-100">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-xl bg-slate-100">{name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Label>Profile Picture URL</Label>
                    <div className="flex gap-2">
                        <Input 
                            value={avatarUrl} 
                            onChange={(e) => setAvatarUrl(e.target.value)} 
                            placeholder="https://example.com/me.jpg" 
                            className="w-[300px]"
                        />
                    </div>
                    <p className="text-xs text-slate-500">Enter a URL for now (File upload coming next).</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                </div>

                <Button type="submit" disabled={isSaving} className="bg-slate-900">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- SECURITY TAB --- */}
        <TabsContent value="security" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your password to keep your account secure.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-[400px]">
                <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input 
                        type="password" 
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)} 
                    />
                </div>
                <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input 
                        type="password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                    />
                </div>
                
                {passwordMsg && (
                    <p className={`text-sm ${passwordMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordMsg}
                    </p>
                )}

                <Button type="submit" variant="outline" disabled={isSaving}>
                    Change Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- NOTIFICATIONS TAB --- */}
        <TabsContent value="notifications" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage how you receive alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                     <Label className="text-base">Email Notifications</Label>
                     <p className="text-xs text-slate-500">Receive emails about new task assignments.</p>
                  </div>
                  <Switch defaultChecked />
               </div>
               <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                     <Label className="text-base">Project Updates</Label>
                     <p className="text-xs text-slate-500">Get notified when a project status changes.</p>
                  </div>
                  <Switch defaultChecked />
               </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}