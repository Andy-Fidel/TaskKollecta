import { useEffect, useState } from 'react';
import { Mail, Plus, Shield, User, Building2, Search, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Import Tabs
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'sonner';

export default function Team() {
  const { user } = useAuth();  
  const [members, setMembers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // States for Join/Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]); // For Admins

  // Modals
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false); // Search Modal
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  
  // Forms
  const [inviteEmail, setInviteEmail] = useState('');
  const [newOrgName, setNewOrgName] = useState('');

  const isAdmin = members.find(m => m.user._id === user?._id)?.role === 'admin';

  // 1. Fetch Orgs
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const { data } = await api.get('/organizations');
        setOrgs(data);
        if (data.length > 0) setSelectedOrgId(data[0]._id);
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    };
    fetchOrgs();
  }, []);

  // 2. Fetch Members & Requests (if Admin)
  useEffect(() => {
    if (selectedOrgId) {
      api.get(`/organizations/${selectedOrgId}/members`).then(({ data }) => setMembers(data));
      
      // If admin, check for join requests
      // Note: We check isAdmin logic inside the .then because state updates are async
      // For simplicity, we just try to fetch. The backend will 403 if not admin, which we catch.
      api.get(`/organizations/${selectedOrgId}/requests`)
         .then(({ data }) => setPendingRequests(data))
         .catch(() => setPendingRequests([])); // Ignore error if not admin
    }
  }, [selectedOrgId, user]); // Re-run if org changes

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
        // Remove from search results to indicate success visually
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
          // Refresh members if accepted
          if(action === 'accept') {
             const { data } = await api.get(`/organizations/${selectedOrgId}/members`);
             setMembers(data);
          }
      } catch (error) {
          toast.error("Action failed");
      }
  };

  
  const handleInvite = async (e) => {
      e.preventDefault();
      try {
        await api.post(`/organizations/${selectedOrgId}/members`, { email: inviteEmail });
        const { data } = await api.get(`/organizations/${selectedOrgId}/members`);
        setMembers(data); 
        setIsInviteOpen(false);
        setInviteEmail('');
        toast.success('Member added!');
      } catch (error) { toast.error("Failed to invite"); }
  };

  const handleCreateOrg = async (e) => {
      e.preventDefault();
      try {
          const { data } = await api.post('/organizations', { name: newOrgName });
          setOrgs([data]); setSelectedOrgId(data._id); setIsOrgModalOpen(false);
      } catch (e) { toast.error("Failed to create org"); }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  // EMPTY STATE (Modified to include "Join" option)
  if (orgs.length === 0) {
    return (
        <div className="max-w-2xl mx-auto mt-20 text-center space-y-6 font-[Poppins]">
            <div className="bg-slate-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto">
                <Building2 className="h-10 w-10 text-slate-400" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-900">No Organization Found</h2>
                <p className="text-slate-500 mt-2">Create a new workspace or join an existing one.</p>
            </div>
            <div className="flex gap-4 justify-center">
                <Button onClick={() => setIsOrgModalOpen(true)} className="bg-slate-900">Create Organization</Button>
                <Button variant="outline" onClick={() => setIsJoinOpen(true)}>Join Existing</Button>
            </div>
            
            {/* Create Org Modal */}
            <Dialog open={isOrgModalOpen} onOpenChange={setIsOrgModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Organization</DialogTitle>
                        <DialogDescription>Start a new team.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateOrg} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={newOrgName} onChange={e => setNewOrgName(e.target.value)} required />
                        </div>
                        <Button type="submit" className="w-full">Create</Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Join Modal */}
            <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Find Organization</DialogTitle>
                        <DialogDescription>Search for your team by name.</DialogDescription>
                    </DialogHeader>
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
                        {searchResults.length === 0 && searchQuery && <p className="text-xs text-slate-500 text-center">No results found.</p>}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
  }

  // NORMAL STATE
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team Management</h1>
          <p className="text-slate-500">
             Manage <strong>{orgs.find(o => o._id === selectedOrgId)?.name}</strong>
          </p>
        </div>
        <div className="flex gap-2">
             <Button variant="outline" onClick={() => setIsJoinOpen(true)}>Find Another Team</Button>
             {isAdmin && <Button onClick={() => setIsInviteOpen(true)} className="bg-slate-900"><Plus className="w-4 h-4 mr-2" /> Invite Member</Button>}
        </div>
      </div>

      <Tabs defaultValue="members" className="w-full">
         <TabsList>
            <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
            {isAdmin && <TabsTrigger value="requests">Requests ({pendingRequests.length})</TabsTrigger>}
         </TabsList>

         {/* MEMBERS TAB */}
         <TabsContent value="members">
             <Card className="border border-slate-200 shadow-sm rounded-xl">
                <CardContent className="pt-6">
                   <div className="space-y-4">
                      {members.map((m) => (
                         <div key={m._id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                            <div className="flex items-center gap-4">
                               <Avatar><AvatarImage src={m.user.avatar} /><AvatarFallback>{m.user.name.charAt(0)}</AvatarFallback></Avatar>
                               <div><h4 className="font-bold text-slate-900">{m.user.name}</h4><p className="text-sm text-slate-500">{m.user.email}</p></div>
                            </div>
                            <Badge variant="secondary" className="capitalize">{m.role}</Badge>
                         </div>
                      ))}
                   </div>
                </CardContent>
             </Card>
         </TabsContent>

         {/* REQUESTS TAB (Admin Only) */}
         {isAdmin && (
             <TabsContent value="requests">
                 <Card className="border border-slate-200 shadow-sm rounded-xl">
                    <CardHeader><CardTitle>Pending Requests</CardTitle><CardDescription>Users requesting to join this workspace.</CardDescription></CardHeader>
                    <CardContent>
                        {pendingRequests.length === 0 ? (
                            <div className="text-center text-slate-400 py-8">No pending requests.</div>
                        ) : (
                            <div className="space-y-4">
                                {pendingRequests.map(req => (
                                    <div key={req._id} className="flex items-center justify-between p-4 border rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <Avatar><AvatarImage src={req.user.avatar} /><AvatarFallback>{req.user.name.charAt(0)}</AvatarFallback></Avatar>
                                            <div>
                                                <h4 className="font-bold text-slate-900">{req.user.name}</h4>
                                                <p className="text-sm text-slate-500">Requested {new Date(req.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => handleResolveRequest(req._id, 'accept')} className="bg-green-600 hover:bg-green-700"><Check className="w-4 h-4 mr-1"/> Accept</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleResolveRequest(req._id, 'reject')}><X className="w-4 h-4 mr-1"/> Reject</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                 </Card>
             </TabsContent>
         )}
      </Tabs>

      {/* Re-use the Search Modal from empty state */}
      <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Find Organization</DialogTitle>
                <DialogDescription>Search for a team to join.</DialogDescription>
            </DialogHeader>
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
                {searchResults.length === 0 && searchQuery && <p className="text-xs text-slate-500 text-center">No results found.</p>}
            </div>
        </DialogContent>
      </Dialog>
      
      {/* Invite Modal (Existing) */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Invite Member</DialogTitle><DialogDescription>Add via email.</DialogDescription></DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4 py-4">
                <Input placeholder="Email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
                <Button type="submit" className="w-full">Invite</Button>
            </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}