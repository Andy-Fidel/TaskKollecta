import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, MoreHorizontal, Calendar as CalendarIcon, Check
} from 'lucide-react';
import { format } from 'date-fns';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Project Wizard
import CreateProjectWizard from '@/components/CreateProjectWizard';

import api from '../api/axios';

export default function Workspace() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

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
              activeOrgId = null;
              localStorage.removeItem('activeOrgId');
              setMembers([]); 
              return; 
          }
      }

      if (activeOrgId) {
          const memRes = await api.get(`/organizations/${activeOrgId}/members`);
          setMembers(memRes.data);
      }

    } catch (error) {
      console.error("Failed to load workspace", error);
      if(error.response?.status === 403) localStorage.removeItem('activeOrgId');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = () => {
    fetchData();
  };

  return (
    <div className="space-y-10 font-[Poppins] py-10">
      
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

      {/* CREATE PROJECT WIZARD */}
      <CreateProjectWizard 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        members={members}
        onProjectCreated={handleProjectCreated}
      />

    </div>
  );
}