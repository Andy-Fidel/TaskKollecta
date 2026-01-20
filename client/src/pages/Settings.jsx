import { useState, useEffect } from 'react';
import {
  User, Lock, Bell, Camera, Loader2, Save, Moon, Sun, Monitor
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '@/components/ThemeProvider';
import api from '../api/axios';
import { toast } from 'sonner';

export default function Settings() {
  const { user, login } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState({
    emailAssignments: true,
    emailComments: true,
    emailDueDates: true,
    emailStatusChanges: false,
    emailMentions: true
  });
  const [notifLoading, setNotifLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Load notification preferences on mount
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const { data } = await api.get('/users/notifications');
        setNotifPrefs(data);
      } catch (error) {
        console.error('Failed to load notification preferences');
      }
    };
    fetchPrefs();
  }, []);

  // 1. Handle Image Upload (Cloudinary)
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAvatar(data.url);
      toast.success("Image uploaded (Click Save to apply)");
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/users/profile', {
        name,
        email,
        avatar
      });
      login(data);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/users/profile', {
        newPassword,
        currentPassword
      });
      toast.success("Password changed successfully.");
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      toast.error("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Notification Preference Toggle
  const handleNotifToggle = async (key, value) => {
    setNotifPrefs(prev => ({ ...prev, [key]: value }));
    setNotifLoading(true);

    try {
      await api.put('/users/notifications', { [key]: value });
      toast.success("Preference saved");
    } catch (error) {
      // Revert on error
      setNotifPrefs(prev => ({ ...prev, [key]: !value }));
      toast.error("Failed to save preference");
    } finally {
      setNotifLoading(false);
    }
  };

  const notificationOptions = [
    {
      key: 'emailAssignments',
      title: 'Task Assignments',
      description: 'Receive emails when assigned to a task'
    },
    {
      key: 'emailComments',
      title: 'Comments',
      description: 'Receive emails when someone comments on your task'
    },
    {
      key: 'emailMentions',
      title: 'Mentions',
      description: 'Receive emails when someone @mentions you'
    },
    {
      key: 'emailDueDates',
      title: 'Due Date Reminders',
      description: 'Receive reminder emails before tasks are due'
    },
    {
      key: 'emailStatusChanges',
      title: 'Status Updates',
      description: 'Receive emails when your task status changes'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10 font-[Poppins]">

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">

        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* --- GENERAL TAB --- */}
        <TabsContent value="general" className="space-y-4 mt-6">

          {/* Appearance Card */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how TaskKollecta looks on your device.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'light', icon: Sun, label: 'Light' },
                  { value: 'dark', icon: Moon, label: 'Dark' },
                  { value: 'system', icon: Monitor, label: 'System' },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${theme === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <Icon className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your photo and personal details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-6">

                {/* Avatar Upload */}
                <div className="flex items-center gap-6">
                  <div className="relative group cursor-pointer">
                    <Avatar className="h-24 w-24 border-2 border-border">
                      <AvatarImage src={avatar} />
                      <AvatarFallback className="text-2xl">{name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                      {isUploading ? <Loader2 className="animate-spin" /> : <Camera />}
                      <input type="file" className="hidden" onChange={handleAvatarUpload} accept="image/*" />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-medium text-foreground">Profile Picture</h3>
                    <p className="text-xs text-muted-foreground">Click the image to upload a new one.</p>
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

                <Button type="submit" disabled={loading || isUploading} className="bg-primary text-primary-foreground">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

                <Button type="submit" variant="outline" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- NOTIFICATIONS TAB --- */}
        <TabsContent value="notifications" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Choose what email notifications you receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationOptions.map(({ key, title, description }) => (
                <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base">{title}</Label>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Switch
                    checked={notifPrefs[key]}
                    onCheckedChange={(checked) => handleNotifToggle(key, checked)}
                    disabled={notifLoading}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}