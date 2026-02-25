import { useEffect, useState, useRef } from 'react';
import { Mail, Plus, Shield, User, Building2, Search, Check, X, MoreHorizontal, Settings, Globe, Camera, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; 
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const ROLE_COLORS = {
    owner: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400',
    admin: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    member: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
    guest: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
};

export default function Team() {
    const { user } = useAuth();
    const [members, setMembers] = useState([]);
    const [orgs, setOrgs] = useState([]);
    const [selectedOrgId, setSelectedOrgId] = useState(null);
    const [loading, setLoading] = useState(true);

    // States for Join/Search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);

    // Modals
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isJoinOpen, setIsJoinOpen] = useState(false); 
    const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);

    // Forms
    const [inviteEmail, setInviteEmail] = useState('');
    const [newOrgName, setNewOrgName] = useState('');

    // Org Settings State
    const [orgSettings, setOrgSettings] = useState(null);
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const logoInputRef = useRef(null);

    // Check permissions
    const currentUserRole = members.find(m => m.user._id === user?._id)?.role;
    const canManage = ['owner', 'admin'].includes(currentUserRole);

    // 1. Fetch Orgs
    useEffect(() => {
        const fetchOrgs = async () => {
            try {
                const { data } = await api.get('/organizations');
                setOrgs(data);

                const savedOrgId = localStorage.getItem('activeOrgId');
                const activeOrg = data.find(o => o._id === savedOrgId);

                if (activeOrg) {
                    setSelectedOrgId(activeOrg._id);
                } else if (data.length > 0) {
                    setSelectedOrgId(data[0]._id);
                    localStorage.setItem('activeOrgId', data[0]._id);
                }
            } catch (error) { console.error(error); }
            finally { setLoading(false); }
        };
        fetchOrgs();
    }, []);

    // 2. Fetch Members, Requests & Org Detail when org changes
    useEffect(() => {
        if (!selectedOrgId) return;

        api.get(`/organizations/${selectedOrgId}/members`).then(({ data }) => setMembers(data));
        api.get(`/organizations/${selectedOrgId}/requests`)
            .then(({ data }) => setPendingRequests(data))
            .catch(() => setPendingRequests([]));

        // Fetch detailed org info for settings
        api.get(`/organizations/${selectedOrgId}`)
            .then(({ data }) => setOrgSettings({
                name: data.name || '',
                description: data.description || '',
                logo: data.logo || '',
                website: data.website || '',
                defaultProjectSettings: {
                    defaultStatus: data.defaultProjectSettings?.defaultStatus || 'To Do',
                    allowGuestAccess: data.defaultProjectSettings?.allowGuestAccess ?? false,
                    requireApprovalToJoin: data.defaultProjectSettings?.requireApprovalToJoin ?? true,
                }
            }))
            .catch(() => setOrgSettings(null));
    }, [selectedOrgId]);

    // --- ACTIONS ---
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery) return;
        const { data } = await api.get(`/organizations/search?query=${searchQuery}`);
        setSearchResults(data);
    };

    const handleRequestJoin = async (orgId) => {
        try {
            await api.post(`/organizations/${orgId}/join`);
            toast.success("Request sent!");
            setSearchResults(prev => prev.filter(org => org._id !== orgId));
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send request");
        }
    };

    const handleResolveRequest = async (requestId, action) => {
        try {
            await api.post(`/organizations/${selectedOrgId}/requests/${requestId}/resolve`, { action });
            setPendingRequests(prev => prev.filter(r => r._id !== requestId));
            toast.success(action === 'accept' ? "User accepted!" : "Request rejected");
            if (action === 'accept') {
                const { data } = await api.get(`/organizations/${selectedOrgId}/members`);
                setMembers(data);
            }
        } catch {
            toast.error("Action failed");
        }
    };

    const handleUpdateRole = async (userId, newRole) => {
        try {
            const { data } = await api.put(`/organizations/${selectedOrgId}/members/${userId}`, { role: newRole });
            setMembers(prev => prev.map(m => m.user._id === userId ? { ...m, role: data.role } : m));
            toast.success(`Role updated to ${newRole}`);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update role");
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        try {
            await api.post('/invites', { email: inviteEmail, organizationId: selectedOrgId });
            setIsInviteOpen(false);
            setInviteEmail('');
            toast.success('Invitation sent!');
        } catch (error) { 
            toast.error(error.response?.data?.message || "Failed to send invite"); 
        }
    };

    const handleCreateOrg = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/organizations', { name: newOrgName });
            setOrgs(prev => [...prev, data]);
            setSelectedOrgId(data._id);
            setIsOrgModalOpen(false);
            setNewOrgName('');
        } catch { toast.error("Failed to create org"); }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setOrgSettings(prev => ({ ...prev, logo: data.url }));
            toast.success('Logo uploaded!');
        } catch {
            toast.error('Upload failed');
        } finally {
            setLogoUploading(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!orgSettings?.name?.trim()) return toast.error('Name is required');
        setSettingsSaving(true);
        try {
            const updated = await api.put(`/organizations/${selectedOrgId}`, orgSettings);
            setOrgs(prev => prev.map(o => o._id === selectedOrgId ? { ...o, name: updated.data.name, logo: updated.data.logo } : o));
            toast.success('Organization settings saved!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save settings');
        } finally {
            setSettingsSaving(false);
        }
    };

    const selectedOrg = orgs.find(o => o._id === selectedOrgId);

    if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;

    // EMPTY STATE
    if (orgs.length === 0) {
        return (
            <div className="mt-20 text-center space-y-8">
                <div className="bg-muted h-20 w-20 rounded-full flex items-center justify-center mx-auto">
                    <Building2 className="h-10 w-10 text-muted-foreground" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">No Organization Found</h2>
                    <p className="text-muted-foreground mt-2">Create a new workspace or join an existing one.</p>
                </div>
                <div className="flex gap-4 justify-center">
                    <Button onClick={() => setIsOrgModalOpen(true)}>Create Organization</Button>
                    <Button variant="outline" onClick={() => setIsJoinOpen(true)}>Join Existing</Button>
                </div>

                <Dialog open={isOrgModalOpen} onOpenChange={setIsOrgModalOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Create Organization</DialogTitle><DialogDescription>Start a new team.</DialogDescription></DialogHeader>
                        <form onSubmit={handleCreateOrg} className="space-y-4 py-4">
                            <div className="space-y-2"><Label>Name</Label><Input value={newOrgName} onChange={e => setNewOrgName(e.target.value)} required /></div>
                            <Button type="submit" className="w-full">Create</Button>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Find Organization</DialogTitle><DialogDescription>Search for your team by name.</DialogDescription></DialogHeader>
                        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                            <Input placeholder="e.g. Acme Corp" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                            <Button type="submit"><Search className="w-4 h-4" /></Button>
                        </form>
                        <div className="space-y-2">
                            {searchResults.map(org => (
                                <div key={org._id} className="flex justify-between items-center p-3 border rounded-lg">
                                    <span className="font-medium">{org.name}</span>
                                    <Button size="sm" variant="outline" onClick={() => handleRequestJoin(org._id)}>Request to Join</Button>
                                </div>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // --- NORMAL STATE ---
    return (
        <div className="space-y-8 pb-12" style={{ animation: 'fadeInUp 0.3s ease-out' }}>

            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    {selectedOrg?.logo ? (
                        <img src={selectedOrg.logo} alt="logo" className="w-12 h-12 rounded-xl object-cover ring-2 ring-border" />
                    ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-border">
                            <Building2 className="w-6 h-6 text-primary" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight">{selectedOrg?.name}</h1>
                        <p className="text-sm text-muted-foreground">
                            <span className={`inline-flex items-center gap-1 font-medium capitalize px-2 py-0.5 rounded-full text-xs border ${ROLE_COLORS[currentUserRole] || ROLE_COLORS.member}`}>
                                <Shield className="w-3 h-3" />{currentUserRole}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setIsJoinOpen(true)}>Find Another Team</Button>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setIsOrgModalOpen(true)}><Plus className="w-4 h-4 mr-1"/>New Org</Button>
                    {canManage && <Button size="sm" className="rounded-xl" onClick={() => setIsInviteOpen(true)}><Mail className="w-4 h-4 mr-2"/> Invite Member</Button>}
                </div>
            </div>

            <Tabs defaultValue="members" className="w-full">
                <TabsList className="h-10 rounded-xl">
                    <TabsTrigger value="members" className="rounded-lg">Members ({members.length})</TabsTrigger>
                    {canManage && <TabsTrigger value="requests" className="rounded-lg">Requests {pendingRequests.length > 0 && <Badge className="ml-1.5 h-4 px-1.5 text-[10px]">{pendingRequests.length}</Badge>}</TabsTrigger>}
                    {canManage && <TabsTrigger value="settings" className="rounded-lg"><Settings className="w-3.5 h-3.5 mr-1.5" />Settings</TabsTrigger>}
                </TabsList>

                {/* --- MEMBERS TAB --- */}
                <TabsContent value="members">
                    <Card className="rounded-2xl shadow-sm">
                        <CardContent className="pt-6">
                            <div className="space-y-3">
                                {members.map((m) => (
                                    <div key={m._id} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="border border-border"><AvatarImage src={m.user.avatar} /><AvatarFallback className="font-bold text-sm">{m.user.name.charAt(0)}</AvatarFallback></Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-foreground">{m.user.name}</h4>
                                                    {m.user._id === user?._id && <Badge variant="outline" className="text-[10px] py-0">You</Badge>}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{m.user.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {(!canManage || m.role === 'owner' || m.user._id === user._id) ? (
                                                <Badge variant="secondary" className={`capitalize border text-xs ${ROLE_COLORS[m.role] || ROLE_COLORS.member}`}>{m.role}</Badge>
                                            ) : (
                                                <Select defaultValue={m.role} onValueChange={(val) => handleUpdateRole(m.user._id, val)}>
                                                    <SelectTrigger className="h-8 w-[110px] text-xs border rounded-lg">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                        <SelectItem value="member">Member</SelectItem>
                                                        <SelectItem value="guest">Guest</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- REQUESTS TAB (Admin Only) --- */}
                {canManage && (
                    <TabsContent value="requests">
                        <Card className="rounded-2xl shadow-sm">
                            <CardHeader><CardTitle className="text-base">Pending Requests</CardTitle><CardDescription>Users requesting to join this workspace.</CardDescription></CardHeader>
                            <CardContent>
                                {pendingRequests.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-10 text-sm">No pending requests.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {pendingRequests.map(req => (
                                            <div key={req._id} className="flex items-center justify-between p-4 border rounded-xl">
                                                <div className="flex items-center gap-4">
                                                    <Avatar><AvatarImage src={req.user.avatar} /><AvatarFallback>{req.user.name.charAt(0)}</AvatarFallback></Avatar>
                                                    <div>
                                                        <h4 className="font-semibold">{req.user.name}</h4>
                                                        <p className="text-sm text-muted-foreground">Requested {new Date(req.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl" onClick={() => handleResolveRequest(req._id, 'accept')}><Check className="w-4 h-4 mr-1" />Accept</Button>
                                                    <Button size="sm" variant="destructive" className="rounded-xl" onClick={() => handleResolveRequest(req._id, 'reject')}><X className="w-4 h-4 mr-1" />Reject</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* --- SETTINGS TAB (Admin Only) --- */}
                {canManage && (
                    <TabsContent value="settings">
                        {orgSettings ? (
                            <div className="grid lg:grid-cols-2 gap-6">
                                {/* Identity Settings */}
                                <Card className="rounded-2xl shadow-sm">
                                    <CardHeader className="bg-muted/30 rounded-t-2xl border-b border-border/50 pb-4">
                                        <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" /> Organization Profile</CardTitle>
                                        <CardDescription>Visible to all members</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-5">

                                        {/* Logo Upload */}
                                        <div className="flex items-center gap-4">
                                            <div className="relative shrink-0">
                                                {orgSettings.logo ? (
                                                    <img src={orgSettings.logo} alt="logo" className="w-20 h-20 rounded-2xl object-cover ring-2 ring-border" />
                                                ) : (
                                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-border">
                                                        <Building2 className="w-8 h-8 text-primary/60" />
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => logoInputRef.current?.click()}
                                                    className="absolute -bottom-2 -right-2 bg-background rounded-full p-1.5 shadow-md border border-border hover:bg-muted transition-colors"
                                                    disabled={logoUploading}
                                                >
                                                    {logoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                                                </button>
                                                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm font-medium">Organization Logo</p>
                                                <p className="text-xs text-muted-foreground">Recommended: 256×256px PNG or JPG</p>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Name */}
                                        <div className="space-y-2">
                                            <Label>Organization Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={orgSettings.name}
                                                onChange={e => setOrgSettings(p => ({ ...p, name: e.target.value }))}
                                            />
                                        </div>

                                        {/* Description */}
                                        <div className="space-y-2">
                                            <Label>Description</Label>
                                            <Textarea
                                                value={orgSettings.description}
                                                onChange={e => setOrgSettings(p => ({ ...p, description: e.target.value }))}
                                                placeholder="What is your organization about?"
                                                className="min-h-[80px] resize-none"
                                            />
                                        </div>

                                        {/* Website */}
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Website</Label>
                                            <Input
                                                value={orgSettings.website}
                                                onChange={e => setOrgSettings(p => ({ ...p, website: e.target.value }))}
                                                placeholder="https://yourcompany.com"
                                                type="url"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Default Project Settings */}
                                <div className="space-y-4">
                                    <Card className="rounded-2xl shadow-sm">
                                        <CardHeader className="bg-muted/30 rounded-t-2xl border-b border-border/50 pb-4">
                                            <CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4" /> Default Settings for New Projects</CardTitle>
                                            <CardDescription>Applied automatically when a new project is created</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-6 space-y-5">
                                            <div className="space-y-2">
                                                <Label>Default Task Status</Label>
                                                <Select
                                                    value={orgSettings.defaultProjectSettings.defaultStatus}
                                                    onValueChange={v => setOrgSettings(p => ({ ...p, defaultProjectSettings: { ...p.defaultProjectSettings, defaultStatus: v } }))}
                                                >
                                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="To Do">To Do</SelectItem>
                                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                                        <SelectItem value="In Review">In Review</SelectItem>
                                                        <SelectItem value="Done">Done</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <Separator />

                                            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                                                <div>
                                                    <p className="text-sm font-semibold">Allow Guest Access</p>
                                                    <p className="text-xs text-muted-foreground">Guests can view projects without full membership</p>
                                                </div>
                                                <Switch
                                                    checked={orgSettings.defaultProjectSettings.allowGuestAccess}
                                                    onCheckedChange={v => setOrgSettings(p => ({ ...p, defaultProjectSettings: { ...p.defaultProjectSettings, allowGuestAccess: v } }))}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                                                <div>
                                                    <p className="text-sm font-semibold">Require Approval to Join</p>
                                                    <p className="text-xs text-muted-foreground">Admins must approve all join requests</p>
                                                </div>
                                                <Switch
                                                    checked={orgSettings.defaultProjectSettings.requireApprovalToJoin}
                                                    onCheckedChange={v => setOrgSettings(p => ({ ...p, defaultProjectSettings: { ...p.defaultProjectSettings, requireApprovalToJoin: v } }))}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Button onClick={handleSaveSettings} disabled={settingsSaving} className="w-full h-11 rounded-xl font-semibold shadow-md">
                                        {settingsSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                        Save Settings
                                    </Button>

                                    <p className="text-xs text-muted-foreground text-center">
                                        Only admins and owners can modify organization settings. Changes affect all projects.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground text-sm">Loading settings…</div>
                        )}
                    </TabsContent>
                )}
            </Tabs>

            {/* --- Join Modal --- */}
            <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Find Organization</DialogTitle><DialogDescription>Search for a team to join.</DialogDescription></DialogHeader>
                    <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                        <Input placeholder="e.g. Acme Corp" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        <Button type="submit"><Search className="w-4 h-4" /></Button>
                    </form>
                    <div className="space-y-2">
                        {searchResults.map(org => (
                            <div key={org._id} className="flex justify-between items-center p-3 border rounded-lg">
                                <span className="font-medium">{org.name}</span>
                                <Button size="sm" variant="outline" onClick={() => handleRequestJoin(org._id)}>Request to Join</Button>
                            </div>
                        ))}
                        {searchResults.length === 0 && searchQuery && <p className="text-xs text-muted-foreground text-center">No results found.</p>}
                    </div>
                </DialogContent>
            </Dialog>

            {/* --- Create Org Modal --- */}
            <Dialog open={isOrgModalOpen} onOpenChange={setIsOrgModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create Organization</DialogTitle><DialogDescription>Start a new team.</DialogDescription></DialogHeader>
                    <form onSubmit={handleCreateOrg} className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Name</Label><Input value={newOrgName} onChange={e => setNewOrgName(e.target.value)} required /></div>
                        <Button type="submit" className="w-full">Create</Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* --- Invite Modal --- */}
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Invite Member</DialogTitle><DialogDescription>Add via email.</DialogDescription></DialogHeader>
                    <form onSubmit={handleInvite} className="space-y-4 py-4">
                        <Input placeholder="Email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
                        <Button type="submit" className="w-full">Invite</Button>
                    </form>
                </DialogContent>
            </Dialog>

            <style>{`
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}