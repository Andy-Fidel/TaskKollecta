import { useEffect, useState } from 'react';
import { Mail, Plus, Shield, User, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Team() {
  const { user } = useAuth();  
  const [members, setMembers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Invite State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  // New Org State
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  // --- ROLE CHECK (Industry Standard) ---
  // We check if the current logged-in user is an 'admin' in the current list
  const isAdmin = members.find(m => m.user._id === user?._id)?.role === 'admin';

  // 1. Fetch Orgs
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const { data } = await api.get('/organizations');
        setOrgs(data);
        if (data.length > 0) {
          setSelectedOrgId(data[0]._id);
        }
      } catch (error) {
        console.error("Failed to fetch orgs");
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  // 2. Fetch Members
  useEffect(() => {
    if (selectedOrgId) {
      api.get(`/organizations/${selectedOrgId}/members`).then(({ data }) => setMembers(data));
    }
  }, [selectedOrgId]);

  // 3. Handle Invite
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!selectedOrgId) return;

    try {
      const { data } = await api.post(`/organizations/${selectedOrgId}/members`, { email: inviteEmail });
      setMembers([...members, data]);
      setInviteEmail('');
      setIsInviteOpen(false);
      alert('Member added successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add member');
    }
  };

  // 4. Handle Create Organization
  const handleCreateOrg = async (e) => {
    e.preventDefault();
    try {
        const { data } = await api.post('/organizations', { name: newOrgName });
        setOrgs([data]);
        setSelectedOrgId(data._id);
        setNewOrgName('');
        setIsOrgModalOpen(false);
    } catch (error) {
        alert('Failed to create organization');
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  // EMPTY STATE
  if (orgs.length === 0) {
    return (
        <div className="max-w-2xl mx-auto mt-20 text-center space-y-6">
            <div className="bg-slate-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto">
                <Building2 className="h-10 w-10 text-slate-400" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Create your Workspace</h2>
                <p className="text-slate-500 mt-2">You need to create an organization before you can invite team members.</p>
            </div>
            <Button onClick={() => setIsOrgModalOpen(true)} className="bg-slate-900">
                Create Organization
            </Button>

            <Dialog open={isOrgModalOpen} onOpenChange={setIsOrgModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create Organization</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreateOrg} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Organization Name</Label>
                            <Input value={newOrgName} onChange={e => setNewOrgName(e.target.value)} placeholder="Acme Inc." required />
                        </div>
                        <DialogFooter><Button type="submit">Create</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
  }

  // NORMAL STATE
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team Management</h1>
          <p className="text-slate-500">
            Managing members for <strong>{orgs.find(o => o._id === selectedOrgId)?.name}</strong>
          </p>
        </div>
        
        {/* ACTION: Only Admins can see the Invite Button */}
        {isAdmin && (
            <Button onClick={() => setIsInviteOpen(true)} className="bg-slate-900">
               <Plus className="w-4 h-4 mr-2" /> Invite Member
            </Button>
        )}
      </div>

      {/* Team List Card */}
      <Card className="border border-white/60 shadow-sm rounded-2xl bg-white">
        <CardHeader>
           <CardTitle>Members</CardTitle>
           <CardDescription>People with access to this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="space-y-4">
              {members.map((m) => (
                 <div key={m._id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-4">
                       <Avatar className="h-10 w-10 border border-white shadow-sm">
                          <AvatarImage src={m.user.avatar} />
                          <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">{m.user.name.charAt(0)}</AvatarFallback>
                       </Avatar>
                       <div>
                          <h4 className="font-bold text-slate-900">{m.user.name}</h4>
                          <p className="text-sm text-slate-500">{m.user.email}</p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <Badge variant="secondary" className={`capitalize ${m.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                           {m.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                           {m.role}
                        </Badge>
                        
                        {/* ACTION: Only Admins can remove people, and they cannot remove themselves */}
                        {isAdmin && m.user._id !== user._id && (
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600">Remove</Button>
                        )}
                    </div>
                 </div>
              ))}
           </div>
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Invite to Team</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input 
                        placeholder="colleague@example.com" 
                        type="email" 
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                    />
                    <p className="text-xs text-slate-500">
                        Note: For this demo, the user must already have registered an account on TaskKollecta.
                    </p>
                </div>
                <DialogFooter>
                    <Button type="submit" className="bg-slate-900">Add Member</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}