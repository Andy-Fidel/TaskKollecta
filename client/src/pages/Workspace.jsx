import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, MoreHorizontal, Calendar as CalendarIcon, Check
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import api from '../api/axios';

const COLORS = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#14b8a6', // Teal
];

export default function Workspace() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]); // Store org members for Lead selection
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLead, setNewLead] = useState('');
  const [newDate, setNewDate] = useState(null);
  const [newColor, setNewColor] = useState(COLORS[0]);

  // Fetch Data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      
      const [projRes, orgRes] = await Promise.all([
          api.get('/projects'), 
          api.get('/organizations')
      ]);
      
      setProjects(projRes.data);

      
      let activeOrgId = localStorage.getItem('activeOrgId');
      
      const userBelongsToStoredOrg = orgRes.data.find(o => o._id === activeOrgId);
      
      if (!activeOrgId || !userBelongsToStoredOrg) {
          if (orgRes.data.length > 0) {
              
              activeOrgId = orgRes.data[0]._id;
              localStorage.setItem('activeOrgId', activeOrgId);
          } else {
              // User has NO organizations
              activeOrgId = null;
              localStorage.removeItem('activeOrgId');
              setMembers([]); 
              return; 
          }
      }

      // Fetch Members ONLY if we have a valid Org ID
      if (activeOrgId) {
          const memRes = await api.get(`/organizations/${activeOrgId}/members`);
          setMembers(memRes.data);
      }

    } catch (error) {
      console.error("Failed to load workspace", error);
      // If error is 403 (Forbidden), it clears the bad ID
      if(error.response?.status === 403) localStorage.removeItem('activeOrgId');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    
    let targetOrgId = localStorage.getItem('activeOrgId');
    
    // Validation
    if (!targetOrgId) {
        return alert("You must create or join an Organization first!");
    }

    try {
      const { data } = await api.post('/projects', {
        name: newName,
        description: newDesc,
        orgId: targetOrgId,
        lead: newLead, 
        dueDate: newDate,
        color: newColor
      });
      
      // Add to list and reset form
      setProjects([data, ...projects]); 
      setNewName(''); setNewDesc(''); setNewLead(''); setNewDate(null); setNewColor(COLORS[0]);
      setIsModalOpen(false);
      fetchData(); // Re-fetch to get correct progress/team stats calculated by backend
    } catch (error) {
      alert('Failed to create project');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-[Poppins] py-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Workspace</h1>
          <p className="text-muted-foreground">Manage your projects and track progress.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-primary text-primary-foreground shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Create Project
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card 
            key={project._id} 
            className="group hover:shadow-md transition-all duration-200 cursor-pointer border-border bg-card"
            onClick={() => navigate(`/project/${project._id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div 
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
                    style={{ backgroundColor: project.color || '#3b82f6' }}
                >
                  {project.name.charAt(0)}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              <CardTitle className="mt-3 text-lg">{project.name}</CardTitle>
              <CardDescription className="line-clamp-2 min-h-[40px]">
                {project.description || "No description provided."}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pb-3">
               {/* Progress Bar */}
               <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-semibold text-muted-foreground">Progress</span>
                        <span className="text-sm font-bold text-foreground">{Math.round(project.progress || 0)}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                        <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ width: `${project.progress || 0}%`, backgroundColor: project.color || '#3b82f6' }}
                        ></div>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-3 border-t border-border flex justify-between items-center">
                {/* Team Avatars */}
                <div className="flex -space-x-2">
                    {project.team && project.team.length > 0 ? (
                        <>
                            {project.team.slice(0, 3).map((member) => (
                                <Avatar key={member._id} className="w-7 h-7 border-2 border-card">
                                    <AvatarImage src={member.avatar} />
                                    <AvatarFallback className="text-[9px]">{member.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            ))}
                            {project.team.length > 3 && (
                                <div className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-bold">
                                    +{project.team.length - 3}
                                </div>
                            )}
                        </>
                    ) : <span className="text-xs text-muted-foreground italic">No team</span>}
                </div>

                {/* Due Date Badge */}
                {project.dueDate && (
                    <Badge variant="outline" className="font-normal text-xs bg-background">
                        {format(new Date(project.dueDate), 'MMM d')}
                    </Badge>
                )}
            </CardFooter>
          </Card>
        ))}
        
        {/* Empty State / Create New Card */}
        <button 
            onClick={() => setIsModalOpen(true)}
            className="flex flex-col items-center justify-center h-[280px] rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/10 transition-all gap-3 text-muted-foreground hover:text-primary"
        >
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Plus className="w-6 h-6" />
            </div>
            <span className="font-semibold text-sm">Create New Project</span>
        </button>
      </div>

      {/* CREATE PROJECT DIALOG */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
                <DialogDescription>Start a new initiative for your team.</DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateProject} className="space-y-4 py-2">
                
                {/* Name */}
                <div className="space-y-2">
                    <Label htmlFor="name">Project Name <span className="text-red-500">*</span></Label>
                    <Input id="name" placeholder="e.g. Website Redesign" value={newName} onChange={e => setNewName(e.target.value)} required />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label htmlFor="desc">Description</Label>
                    <Textarea id="desc" placeholder="What is this project about?" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Lead */}
                    <div className="space-y-2">
                        <Label>Project Lead</Label>
                        <Select onValueChange={setNewLead}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select lead" />
                            </SelectTrigger>
                            <SelectContent>
                                {members.map((m) => (
                                    <SelectItem key={m.user._id} value={m.user._id}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5"><AvatarImage src={m.user.avatar} /><AvatarFallback>{m.user.name.charAt(0)}</AvatarFallback></Avatar>
                                            <span>{m.user.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                        <Label>Due Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !newDate && "text-muted-foreground")}>
                                    {newDate ? format(newDate, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={newDate} onSelect={setNewDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Color Picker */}
                <div className="space-y-2">
                    <Label>Project Color</Label>
                    <div className="flex gap-2 flex-wrap">
                        {COLORS.map((c) => (
                            <div 
                                key={c}
                                onClick={() => setNewColor(c)}
                                className={`w-8 h-8 rounded-full cursor-pointer flex items-center justify-center transition-all ${newColor === c ? 'ring-2 ring-offset-2 ring-black dark:ring-white scale-110' : 'hover:scale-105'}`}
                                style={{ backgroundColor: c }}
                            >
                                {newColor === c && <Check className="w-4 h-4 text-white" />}
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-primary text-primary-foreground">Create Project</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}