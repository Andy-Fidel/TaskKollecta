import { useState, useEffect } from 'react';
import {
  User, Lock, Bell, Camera, Loader2, Save, Moon, Sun, Monitor, Clock, BellOff, BellRing, AlarmClock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
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

  // Reminder Preferences State
  const [reminderPrefs, setReminderPrefs] = useState({
    defaultReminderTime: '1_day',
    remindDueDates: true,
    remindOverdue: true,
    remindAssignments: true,
    remindMeetings: false,
    remindStatusUpdates: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00'
  });
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderSaving, setReminderSaving] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Load notification preferences on mount
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const { data } = await api.get('/users/notifications');
        setNotifPrefs(data);
      } catch {
        console.error('Failed to load notification preferences');
      }
    };
    fetchPrefs();
  }, []);

  // Load reminder preferences on mount
  useEffect(() => {
    const fetchReminderPrefs = async () => {
      setReminderLoading(true);
      try {
        const { data } = await api.get('/users/reminders');
        setReminderPrefs(data);
      } catch {
        console.error('Failed to load reminder preferences');
      } finally {
        setReminderLoading(false);
      }
    };
    fetchReminderPrefs();
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
    } catch {
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
    } catch {
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
    } catch {
      // Revert on error
      setNotifPrefs(prev => ({ ...prev, [key]: !value }));
      toast.error("Failed to save preference");
    } finally {
      setNotifLoading(false);
    }
  };

  // 5. Handle Reminder Preference Toggle (instant save for booleans)
  const handleReminderToggle = async (key, value) => {
    setReminderPrefs(prev => ({ ...prev, [key]: value }));
    try {
      await api.put('/users/reminders', { [key]: value });
      toast.success("Reminder preference saved");
    } catch {
      setReminderPrefs(prev => ({ ...prev, [key]: !value }));
      toast.error("Failed to save preference");
    }
  };

  // 6. Save all reminder prefs (for timing/quiet hour changes)
  const handleSaveReminders = async () => {
    setReminderSaving(true);
    try {
      await api.put('/users/reminders', reminderPrefs);
      toast.success("Reminder settings saved!");
    } catch {
      toast.error("Failed to save reminder settings");
    } finally {
      setReminderSaving(false);
    }
  };

  const notificationOptions = [
    { key: 'emailAssignments', title: 'Task Assignments', description: 'Receive emails when assigned to a task' },
    { key: 'emailComments', title: 'Comments', description: 'Receive emails when someone comments on your task' },
    { key: 'emailMentions', title: 'Mentions', description: 'Receive emails when someone @mentions you' },
    { key: 'emailDueDates', title: 'Due Date Reminders', description: 'Receive reminder emails before tasks are due' },
    { key: 'emailStatusChanges', title: 'Status Updates', description: 'Receive emails when your task status changes' }
  ];

  const reminderTypeOptions = [
    { key: 'remindDueDates', title: 'Due Date Reminders', description: 'Get reminded before a task is due', icon: AlarmClock },
    { key: 'remindOverdue', title: 'Overdue Tasks', description: 'Get notified when a task is past its due date', icon: BellRing },
    { key: 'remindAssignments', title: 'New Assignments', description: 'Get a reminder shortly after being assigned a task', icon: Bell },
    { key: 'remindMeetings', title: 'Meetings & Events', description: 'Reminders for scheduled meetings or events', icon: Clock },
    { key: 'remindStatusUpdates', title: 'Status Changes', description: 'Remind you to update tasks stuck in a status', icon: Bell },
  ];

  const timingOptions = [
    { value: '15_min', label: '15 minutes before' },
    { value: '30_min', label: '30 minutes before' },
    { value: '1_hour', label: '1 hour before' },
    { value: '3_hours', label: '3 hours before' },
    { value: '1_day', label: '1 day before' },
    { value: '2_days', label: '2 days before' },
    { value: '1_week', label: '1 week before' },
  ];

  return (
    <div className="space-y-10 pb-12 font-[Poppins]">

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">

        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
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
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setTheme(item.value)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${theme === item.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <item.icon className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">{item.label}</span>
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
              <form onSubmit={handleUpdateProfile} className="space-y-8">

                {/* Avatar Upload */}
                <div className="flex items-center gap-8">
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

        {/* --- REMINDERS TAB --- */}
        <TabsContent value="reminders" className="space-y-6 mt-6">

          {reminderLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading reminder preferences…</div>
          ) : (
            <>
              {/* Default Timing */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="bg-muted/30 rounded-t-2xl border-b border-border/50 pb-4">
                  <CardTitle className="text-base flex items-center gap-2.5"><Clock className="w-4 h-4 text-primary" /> Reminder Timing</CardTitle>
                  <CardDescription>Choose how far in advance you want to be reminded about upcoming tasks.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3 max-w-sm">
                    <Label>Default Reminder Time</Label>
                    <Select
                      value={reminderPrefs.defaultReminderTime}
                      onValueChange={v => setReminderPrefs(p => ({ ...p, defaultReminderTime: v }))}
                    >
                      <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {timingOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">This applies to all task-type reminders by default.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Enable/Disable Per Type */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="bg-muted/30 rounded-t-2xl border-b border-border/50 pb-4">
                  <CardTitle className="text-base flex items-center gap-2.5"><BellRing className="w-4 h-4 text-primary" /> Reminder Types</CardTitle>
                  <CardDescription>Enable or disable reminders for specific task types.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  {/* eslint-disable-next-line no-unused-vars */}
                  {reminderTypeOptions.map(({ key, title, description, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{title}</p>
                          <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={reminderPrefs[key]}
                        onCheckedChange={(checked) => handleReminderToggle(key, checked)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quiet Hours */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="bg-muted/30 rounded-t-2xl border-b border-border/50 pb-4">
                  <CardTitle className="text-base flex items-center gap-2.5"><BellOff className="w-4 h-4 text-amber-500" /> Quiet Hours</CardTitle>
                  <CardDescription>Pause all reminders during specific hours so you can focus or rest.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">

                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                    <div>
                      <p className="text-sm font-semibold">Enable Quiet Hours</p>
                      <p className="text-xs text-muted-foreground">Reminders will be silenced during the configured window</p>
                    </div>
                    <Switch
                      checked={reminderPrefs.quietHoursEnabled}
                      onCheckedChange={(checked) => handleReminderToggle('quietHoursEnabled', checked)}
                    />
                  </div>

                  {reminderPrefs.quietHoursEnabled && (
                    <div className="grid grid-cols-2 gap-4 pl-1" style={{ animation: 'fadeInUp 0.2s ease-out' }}>
                      <div className="space-y-2">
                        <Label className="text-sm flex items-center gap-1.5"><Moon className="w-3.5 h-3.5" /> Start Time</Label>
                        <Input
                          type="time"
                          value={reminderPrefs.quietHoursStart}
                          onChange={e => setReminderPrefs(p => ({ ...p, quietHoursStart: e.target.value }))}
                          className="rounded-xl h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm flex items-center gap-1.5"><Sun className="w-3.5 h-3.5" /> End Time</Label>
                        <Input
                          type="time"
                          value={reminderPrefs.quietHoursEnd}
                          onChange={e => setReminderPrefs(p => ({ ...p, quietHoursEnd: e.target.value }))}
                          className="rounded-xl h-11"
                        />
                      </div>
                      <p className="col-span-2 text-xs text-muted-foreground">Reminders scheduled during this window will be held until quiet hours end.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Save Button */}
              <Button onClick={handleSaveReminders} disabled={reminderSaving} className="w-full sm:w-auto h-11 rounded-xl font-semibold shadow-md">
                {reminderSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Reminder Settings
              </Button>
            </>
          )}
        </TabsContent>

      </Tabs>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}