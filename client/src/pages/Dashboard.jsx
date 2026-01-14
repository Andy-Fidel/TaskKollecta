import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  CheckCircle2, TrendingUp, Users, FolderOpen, 
  Plus, FileText, AlertCircle, Loader2, History, Calendar as CalendarIcon 
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatActivityAction } from "../utils/formatActivity";

import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  
  // Date Filters
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Modal State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [userOrgs, setUserOrgs] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Pass date range to backend
        const start = dateRange.from ? dateRange.from.toISOString() : '';
        const end = dateRange.to ? dateRange.to.toISOString() : '';
        
        const dashboardRes = await api.get(`/dashboard?start=${start}&end=${end}`);
        setData(dashboardRes.data);
        
        const orgRes = await api.get('/organizations');
        setUserOrgs(orgRes.data);
      } catch (error) {
        console.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange]); // Refetch when dates change

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (userOrgs.length === 0) return alert("You need an organization first!");
    try {
      const { data } = await api.post('/projects', {
        name: newProjectName,
        description: newProjectDesc,
        orgId: userOrgs[0]._id 
      });
      navigate(`/project/${data._id}`); 
    } catch (error) { alert("Failed to create project"); }
  };

  if (loading && !data) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-slate-400"/></div>;
  if (!data) return <div>Error loading data</div>;

  const cardStyle = "border border-border bg-card text-card-foreground shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl";

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      
      {/* Header & Date Picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name.split(' ')[0]}!</p>
        </div>
        
        {/* Date Range Picker */}
        <div className="flex items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[240px] justify-start text-left font-normal bg-card">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                            dateRange.to ? (
                                <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Projects', value: data.stats.totalProjects, icon: FolderOpen, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Active Tasks', value: data.stats.activeTasks, icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          // NEW: Overdue Card
          { label: 'Overdue Tasks', value: data.stats.overdue, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Completed (Period)', value: data.stats.completedInPeriod, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map((stat, i) => (
          <Card key={i} className={`${cardStyle} hover:-translate-y-1`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-foreground">{stat.value}</h3>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Charts & Projects */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Productivity Bar Chart */}
              <Card className={cardStyle}>
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Completed Tasks (Daily)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] w-full min-h-[200px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.charts.productivity}>
                        <XAxis dataKey="name" hide />
                        <Tooltip cursor={{ fill: 'var(--muted)', radius: 4 }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                        <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Tasks by Project Pie Chart */}
              <Card className={cardStyle}>
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Active Workload by Project</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] w-full min-h-[200px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.charts.byProject}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {data.charts.byProject.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
          </div>

          {/* Recent Activity (Moved here for better layout) */}
          <Card className={cardStyle}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground" /> 
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <ScrollArea className="h-[300px] p-6 pt-0">
                  {data.recentActivities?.length > 0 ? (
                      <div className="space-y-6 relative border-l border-border ml-2 my-2">
                          {data.recentActivities.map((activity) => (
                              <div key={activity._id} className="relative pl-6">
                                  <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-border ring-4 ring-card"></div>
                                  <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                          <Avatar className="h-6 w-6">
                                              <AvatarImage src={activity.user?.avatar} />
                                              <AvatarFallback className="text-[9px] bg-muted">{activity.user?.name?.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          <p className="text-xs text-muted-foreground">
                                              <span className="font-bold text-foreground">{activity.user?.name}</span>
                                              <span className="mx-1">{formatActivityAction(activity.action, activity.details)}</span>
                                          </p>
                                      </div>
                                      <div className="bg-muted/50 p-2 rounded-lg border border-border mt-1">
                                          <p className="text-xs font-medium text-foreground line-clamp-1">{activity.task?.title}</p>
                                          <p className="text-[10px] text-muted-foreground mt-0.5">
                                              {activity.task?.project?.name} • {new Date(activity.createdAt).toLocaleDateString()}
                                          </p>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : <div className="text-center py-8 text-muted-foreground text-sm">No recent activity.</div>}
               </ScrollArea>
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <QuickAction icon={Plus} label="New Project" color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" onClick={() => setIsProjectModalOpen(true)} />
            <QuickAction icon={CheckCircle2} label="My Tasks" color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" onClick={() => navigate('/tasks')} />
          </div>

          {/* Today's Tasks */}
          <Card className={cardStyle}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold">Due Today</CardTitle>
              <Badge variant="secondary" className="cursor-pointer hover:bg-muted" onClick={() => navigate('/tasks')}>View All</Badge>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {data.todaysTasks?.length > 0 ? (
                data.todaysTasks.map(task => (
                    <TaskItem key={task._id} title={task.title} project={task.project?.name} priority={task.priority} />
                ))
              ) : <div className="text-center text-muted-foreground text-sm py-4">No tasks due today.</div>}
            </CardContent>
          </Card>

          {/* Calendar (Mini) */}
          <Card className={cardStyle}>
             <CardContent className="flex justify-center p-4">
                <Calendar mode="single" selected={new Date()} className="rounded-md border-none" />
             </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Project Modal */}
      <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Quick Create Project</DialogTitle>
                <DialogDescription>Start a new project immediately.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4 py-4">
                <div className="space-y-2"><Label>Name</Label><Input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} /></div>
                <DialogFooter><Button type="submit">Create</Button></DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Components
function QuickAction({ icon: Icon, label, color, bg, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 group">
      <div className={`p-3 rounded-xl mb-3 ${bg} ${color} group-hover:scale-110 transition-transform`}><Icon className="h-6 w-6" /></div>
      <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">{label}</span>
    </button>
  )
}

function TaskItem({ title, project, priority }) {
  const priorityColor = { high: 'text-red-600 bg-red-50 dark:bg-red-900/20', medium: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20', low: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' }[priority] || 'text-muted-foreground bg-muted';
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted transition border border-transparent hover:border-border cursor-pointer">
      <div className="mt-1 h-2 w-2 rounded-full bg-primary"></div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{project}</p>
      </div>
      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${priorityColor}`}>{priority}</span>
    </div>
  )
}