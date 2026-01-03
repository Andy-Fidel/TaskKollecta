import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  CheckCircle2, TrendingUp, Users, FolderOpen, 
  Plus, FileText, Calendar as CalendarIcon, Loader2, History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [date, setDate] = useState(new Date());

  // Quick Action Modal States
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  
  // We need to know which Org to create the project in. 
  // For Quick Actions, we'll default to the user's first org or ask them.
  // For simplicity, we fetch orgs to populate a dropdown if needed, or pick the first one.
  const [userOrgs, setUserOrgs] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardRes = await api.get('/dashboard');
        setData(dashboardRes.data);
        
        // Fetch orgs for the "New Project" modal logic
        const orgRes = await api.get('/organizations');
        setUserOrgs(orgRes.data);
      } catch (error) {
        console.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (userOrgs.length === 0) return alert("You need an organization first!");
    
    try {
      const { data } = await api.post('/projects', {
        name: newProjectName,
        description: newProjectDesc,
        orgId: userOrgs[0]._id // Defaulting to first org for Quick Action
      });
      navigate(`/project/${data._id}`); // Go straight to the new project
    } catch (error) {
      alert("Failed to create project");
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-slate-400"/></div>;
  if (!data) return <div>Error loading data</div>;

  const cardStyle = "border border-white/60 bg-white shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl";

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Welcome back, {user?.name.split(' ')[0]}! Here's your overview.</p>
      </div>

      {/* Stats Row (REAL DATA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Projects', value: data.stats.totalProjects, icon: FolderOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Tasks', value: data.stats.activeTasks, icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Team Members', value: data.stats.teamMembers, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Completion Rate', value: `${data.stats.completionRate}%`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat, i) => (
          <Card key={i} className={`${cardStyle} hover:-translate-y-1`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Chart (REAL DATA) */}
          <Card className={cardStyle}>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Your Productivity (Tasks Completed)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                    <Tooltip cursor={{ fill: '#f8fafc', radius: 4 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Projects (REAL DATA) */}
          <Card className={cardStyle}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold">Recent Projects</CardTitle>
              {/* This could link to a full projects list page later */}
              {/* <button className="text-sm text-blue-600 font-medium hover:underline">View All</button> */}
            </CardHeader>
            <CardContent className="space-y-6">
              {data.recentProjects.length > 0 ? (
                data.recentProjects.map((project) => (
                    <Link to={`/project/${project._id}`} key={project._id} className="block">
                        <div className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition cursor-pointer border border-transparent hover:border-slate-100">
                            <div className="space-y-1">
                                <h4 className="font-bold text-slate-800">{project.name}</h4>
                                <p className="text-xs text-slate-500">
                                    Last active: {new Date(project.updatedAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">Open &rarr;</span>
                            </div>
                        </div>
                    </Link>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">No projects found. Create one!</div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions (Functional) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickAction icon={Plus} label="New Project" color="text-blue-600" bg="bg-blue-50" onClick={() => setIsProjectModalOpen(true)} />
            <QuickAction icon={CheckCircle2} label="My Tasks" color="text-green-600" bg="bg-green-50" onClick={() => navigate('/tasks')} />
            <QuickAction icon={Users} label="Team" color="text-purple-600" bg="bg-purple-50" onClick={() => navigate('/team')} />
            <QuickAction icon={FileText} label="Dashboard" color="text-orange-600" bg="bg-orange-50" onClick={() => window.location.reload()} />
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-8">
          
          {/* Calendar */}
          <Card className={cardStyle}>
             <CardHeader>
                <CardTitle className="text-lg font-bold">Calendar</CardTitle>
             </CardHeader>
             <CardContent className="flex justify-center p-0 pb-6">
                <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border-none" />
             </CardContent>
          </Card>

          {/* Today's Tasks (REAL DATA) */}
          <Card className={cardStyle}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold">Today's Tasks</CardTitle>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 cursor-pointer hover:bg-slate-200" onClick={() => navigate('/tasks')}>
                View All
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {data.todaysTasks.length > 0 ? (
                data.todaysTasks.map(task => (
                    <TaskItem 
                        key={task._id}
                        title={task.title} 
                        project={task.project?.name} 
                        priority={task.priority} 
                    />
                ))
              ) : (
                <div className="text-center text-slate-400 text-sm py-4">No tasks due today.</div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Card */}
          <Card className={cardStyle}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-slate-500" /> 
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <ScrollArea className="h-[350px] p-6 pt-0">
                  {data.recentActivities && data.recentActivities.length > 0 ? (
                      <div className="space-y-6 relative border-l border-slate-200 ml-2 my-2">
                          {data.recentActivities.map((activity, index) => (
                              <div key={activity._id} className="relative pl-6">
                                  {/* Timeline Dot */}
                                  <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-slate-200 ring-4 ring-white"></div>
                                  
                                  <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                          <Avatar className="h-6 w-6">
                                              <AvatarImage src={activity.user?.avatar} />
                                              <AvatarFallback className="text-[9px] bg-slate-100">{activity.user?.name?.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          <p className="text-xs text-slate-500">
                                              <span className="font-bold text-slate-700">{activity.user?.name}</span>
                                              <span className="mx-1">{activity.action.replace(/_/g, ' ')}</span>
                                          </p>
                                      </div>
                                      
                                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                                          <p className="text-xs font-medium text-slate-700 line-clamp-1">
                                              {activity.task?.title}
                                          </p>
                                          <p className="text-[10px] text-slate-400 mt-0.5">
                                              {activity.task?.project?.name} • {new Date(activity.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                                          </p>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="text-center py-8 text-slate-400 text-sm">
                          No recent activity.
                      </div>
                  )}
               </ScrollArea>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Quick Create Project Modal */}
      <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Quick Create Project</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} />
                </div>
                <div className="text-xs text-slate-500">
                    Creating in: <strong>{userOrgs[0]?.name || 'Your Default Org'}</strong>
                </div>
                <DialogFooter><Button type="submit">Create</Button></DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Helper Components
function QuickAction({ icon: Icon, label, color, bg, onClick }) {
  return (
    <button 
        onClick={onClick}
        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-white/60 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
    >
      <div className={`p-3 rounded-xl mb-3 ${bg} ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="h-6 w-6" />
      </div>
      <span className="text-xs font-bold text-slate-600">{label}</span>
    </button>
  )
}

function TaskItem({ title, project, priority }) {
  const priorityColor = {
    high: 'text-red-600 bg-red-50',
    medium: 'text-yellow-600 bg-yellow-50',
    low: 'text-blue-600 bg-blue-50',
    urgent: 'text-rose-600 bg-rose-50'
  }[priority] || 'text-slate-600 bg-slate-50';

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100 cursor-pointer">
      <div className="mt-1 h-5 w-5 rounded-md border border-slate-300 flex items-center justify-center"></div>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{project}</p>
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${priorityColor}`}>
        {priority}
      </span>
    </div>
  )
}