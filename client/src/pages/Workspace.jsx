import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Plus, Search, Clock, MoreHorizontal 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '../api/axios';

export default function Workspace() {
  const { orgId } = useParams();
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const endpoint = orgId ? `/projects/${orgId}` : '/projects';
        const { data } = await api.get(endpoint);
        setProjects(data);
      } catch (error) {
        console.error("Failed to load projects", error);
      }
    };
    fetchProjects();
  }, [orgId]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    let targetOrgId = orgId;
    
    if (!targetOrgId) {
        const orgRes = await api.get('/organizations');
        if (orgRes.data.length > 0) targetOrgId = orgRes.data[0]._id;
        else return alert("You need to create an Organization first!");
    }

    try {
      const { data } = await api.post('/projects', {
        name: newProjectName,
        description: newProjectDesc,
        orgId: targetOrgId
      });
      setProjects([data, ...projects]);
      setNewProjectName('');
      setNewProjectDesc('');
      setIsModalOpen(false);
    } catch (error) {
      alert('Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter projects based on search
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-10">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Projects</h1>
          <p className="text-slate-500 mt-1">List of your ongoing projects</p>
        </div>
        
        <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="relative w-full max-w-md hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-slate-200 focus:ring-slate-900"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 border border-slate-200 rounded px-1.5 text-[10px] text-slate-400 font-medium">⌘ K</div>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200">
                <Plus className="w-4 h-4 mr-2" /> New Project
            </Button>
        </div>
      </div>

      {/* 2. Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {filteredProjects.map((project, index) => {
            const progress = Math.floor(Math.random() * 60) + 20; 
            const weeksLeft = Math.floor(Math.random() * 4) + 1;
            const progressColor = index % 3 === 0 ? 'bg-orange-500' : index % 3 === 1 ? 'bg-blue-500' : 'bg-emerald-500';
            const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            return (
                <Link to={`/project/${project._id}`} key={project._id}>
                    <Card className="group border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl cursor-pointer bg-white h-full">
                        <CardContent className="p-6 flex flex-col h-full justify-between gap-6">
                            
                            {/* Top: Title & Date */}
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-slate-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                                        {project.name}
                                    </h3>
                                    {/* Optional Menu Icon */}
                                    {/* <MoreHorizontal className="h-5 w-5 text-slate-300 hover:text-slate-600" /> */}
                                </div>
                                <p className="text-sm text-slate-500 font-medium">{project.description || "UI/UX Design"}</p>
                                <p className="text-xs text-slate-400 mt-4 font-medium">{dateStr}</p>
                            </div>

                           {/* Middle: Progress */}
              <div className="space-y-2">
                  <div className="flex justify-between items-end">
                      <span className="text-xs font-semibold text-slate-500">Progress</span>
                      <span className="text-sm font-bold text-slate-900">{Math.round(project.progress)}%</span>
                  </div>
                  
                  {/* Custom Colored Progress Bar */}
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                          className={`h-full rounded-full transition-all duration-500
                              ${project.progress === 100 ? 'bg-green-500' : 
                                project.progress > 50 ? 'bg-blue-600' : 'bg-orange-500'} 
                          `} 
                          style={{ width: `${project.progress}%` }}
                      ></div>
                  </div>
              </div>

              {/* Bottom: Team & Status Badge */}
              <div className="flex items-center justify-between pt-2">
                  <div className="flex -space-x-2">
                      {project.team && project.team.length > 0 ? (
                          <>
                              {project.team.slice(0, 3).map((member) => (
                                  <Avatar key={member._id} className="w-8 h-8 border-2 border-white">
                                      <AvatarImage src={member.avatar} />
                                      <AvatarFallback className="bg-slate-200 text-[10px] text-slate-600 font-bold uppercase">
                                          {member.name?.charAt(0)}
                                      </AvatarFallback>
                                  </Avatar>
                              ))}
                              {project.team.length > 3 && (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-slate-500 font-bold">
                                      +{project.team.length - 3}
                                  </div>
                              )}
                          </>
                      ) : (
                          <div className="text-xs text-slate-400 italic pl-1">No active tasks</div>
                      )}
                  </div>
                  
                  {/* Status Badge (Calculated based on activity) */}
                  <Badge variant="secondary" className={`font-semibold px-3 py-1 text-xs rounded-lg bg-slate-100 text-slate-600`}>
                      {new Date(project.updatedAt) > new Date(Date.now() - 86400000 * 3) ? 'Active' : 'Idle'}
                  </Badge>
              </div>

                                      </CardContent>
                                  </Card>
                              </Link>
                          );
                      })}

                      {/* Empty State / Add New Card */}
                      {filteredProjects.length === 0 && (
                          <button 
                              onClick={() => setIsModalOpen(true)}
                              className="flex flex-col items-center justify-center h-[300px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 transition-all group"
                          >
                              <div className="h-14 w-14 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                  <Plus className="h-6 w-6 text-slate-400 group-hover:text-emerald-600" />
                              </div>
                              <h3 className="font-semibold text-slate-600">Create New Project</h3>
                          </button>
                      )}

                    </div>

      {/* Create Project Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Add a new project to your workspace to start tracking tasks.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. Mobile App Redesign"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="Brief description..."
              />
            </div>
            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
               <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Project'}
               </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}