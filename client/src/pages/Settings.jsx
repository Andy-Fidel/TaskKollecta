import { useState } from 'react';
import { 
  User, Lock, Bell, Camera, Loader2, Save 
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
import { toast } from 'sonner'; // Use Toast instead of Alert

export default function Settings() {
  const { user, login } = useAuth(); // login() updates the local context
  
  // Profile State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 1. Handle Image Upload (Cloudinary)
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
        // Upload to the endpoint we created earlier
        const { data } = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        setAvatar(data.url); // Update preview immediately
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
      
      // Update global auth state (localStorage + Context)
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
      // We send 'newPassword' to match our controller logic
      await api.put('/users/profile', { 
          newPassword, 
          currentPassword // Optional: Backend can verify this if strict
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      
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
                      {/* Overlay on hover */}
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
                    {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Change Password'}
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
                     <p className="text-xs text-muted-foreground">Receive emails about new task assignments.</p>
                  </div>
                  <Switch defaultChecked />
               </div>
               <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                     <Label className="text-base">Project Updates</Label>
                     <p className="text-xs text-muted-foreground">Get notified when a project status changes.</p>
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