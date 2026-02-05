import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Sector, Legend
} from 'recharts';
import {
  CheckCircle2, TrendingUp, Users, FolderOpen,
  Plus, AlertCircle, Loader2, History, Calendar as CalendarIcon
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
import { ReminderWidget } from '@/components/ReminderWidget';

// Using CSS variables for Recharts (Theme Compatible)
const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
];

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
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
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
  }, [dateRange]);

  const statusData = data ? [
    { name: 'Active', value: data.stats.activeTasks || 0, color: 'hsl(var(--chart-2))' }, // Blue/Primary
    { name: 'Completed', value: data.stats.completedInPeriod || 0, color: 'hsl(var(--chart-4))' }, // Green-ish
    { name: 'Overdue', value: data.stats.overdue || 0, color: 'hsl(var(--destructive))' }, // Red
  ].filter(i => i.value > 0) : [];

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

  if (loading && !data) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">Unable to load dashboard data.</div>;

  const cardStyle = "border-border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-300 rounded-xl";

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10 font-[Poppins]">

      {/* Header & Date Picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview for <span className="font-semibold text-foreground">{user?.name}</span></p>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal bg-card hover:bg-accent hover:text-accent-foreground border-input">
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
          { label: 'Total Projects', value: data.stats.totalProjects, icon: FolderOpen, color: 'text-slate-700', bg: 'bg-white/20', cardBg: '#B7BDF7' },
          { label: 'Active Tasks', value: data.stats.activeTasks, icon: CheckCircle2, color: 'text-slate-700', bg: 'bg-white/20', cardBg: '#DDAED3' },
          { label: 'Overdue Tasks', value: data.stats.overdue, icon: AlertCircle, color: 'text-slate-700', bg: 'bg-white/20', cardBg: '#F375C2' },
          { label: 'Completed', value: data.stats.completedInPeriod, icon: TrendingUp, color: 'text-slate-700', bg: 'bg-white/20', cardBg: '#FE7F2D' },
        ].map((stat, i) => (
          <Card 
            key={i} 
            className={`border-transparent shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 rounded-xl text-slate-800`}
            style={{ backgroundColor: stat.cardBg }}
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} backdrop-blur-sm`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                <p className="text-sm font-medium text-slate-700">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN: Charts & Activity */}
        <div className="lg:col-span-2 space-y-8">

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* CHART 1: Task Status (Interactive Pie) */}
            <Card className={cardStyle}>
              <CardHeader>
                <CardTitle className="text-sm font-bold text-foreground">Task Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full min-h-[250px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--background)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                        itemStyle={{ color: 'var(--foreground)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* CHART 2: Workload (Donut Active) */}
            <Card className={cardStyle}>
              <CardHeader>
                <CardTitle className="text-sm font-bold text-foreground">Workload by Project</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full min-h-[250px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        data={data.charts.byProject}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="var(--primary)"
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                        paddingAngle={2}
                      >
                        {data.charts.byProject.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} stroke="var(--background)" strokeWidth={2} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center text-xs text-muted-foreground mt-[-10px]">
                  Hover segments for details
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className={cardStyle}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px] p-6 pt-4">
                {data.recentActivities?.length > 0 ? (
                  <div className="space-y-6 relative border-l border-border ml-2 my-2">
                    {data.recentActivities.map((activity) => (
                      <div key={activity._id} className="relative pl-6 group">
                        <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-border ring-4 ring-card group-hover:bg-primary transition-colors"></div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 border border-border">
                              <AvatarImage src={activity.user?.avatar} />
                              <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">{activity.user?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{activity.user?.name}</span>
                              <span className="mx-1">{formatActivityAction(activity.action, activity.details)}</span>
                            </p>
                          </div>
                          <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50 mt-1 hover:border-primary/20 transition-colors">
                            <p className="text-xs font-medium text-foreground line-clamp-1">{activity.task?.title || "Deleted Task"}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/50 inline-block"></span>
                              {activity.task?.project?.name || "Unknown Project"} • {new Date(activity.createdAt).toLocaleDateString()}
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

          {/* Recent Projects Card */}
          <Card className={cardStyle}>
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                Recent Projects
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="text-xs text-muted-foreground">View All</Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {data.recentProjects?.length > 0 ? (
                  data.recentProjects.map(project => (
                    <div key={project._id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => navigate(`/project/${project._id}`)}>
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Icon/Avatar Placeholder */}
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 font-bold text-sm">
                          {project.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-sm text-foreground truncate">{project.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            {/* Lead */}
                            {project.lead && (
                              <div className="flex items-center gap-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={project.lead.avatar} />
                                  <AvatarFallback>{project.lead.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{project.lead.name}</span>
                              </div>
                            )}
                            <span className="hidden md:inline">•</span>
                            <span>Due {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats & Progress */}
                      <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                        <Badge variant="secondary" className="capitalize text-[10px] h-5 px-1.5 font-normal bg-muted text-muted-foreground border-border">
                          {project.status || 'Active'}
                        </Badge>
                        <div className="w-full flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${project.progress || 0}%` }}></div>
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground w-6 text-right">{project.progress || 0}%</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : <div className="p-8 text-center text-sm text-muted-foreground">No recent projects found.</div>}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <QuickAction icon={Plus} label="New Project" color="text-primary" bg="bg-primary/10" onClick={() => setIsProjectModalOpen(true)} />
            <QuickAction icon={CheckCircle2} label="My Tasks" color="text-foreground" bg="bg-accent" onClick={() => navigate('/tasks')} />
          </div>

          {/* Reminder Widget */}
          <div className="h-[320px]">
            <ReminderWidget />
          </div>

          {/* Today's Tasks */}
          <Card className={cardStyle}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold">Due Today</CardTitle>
              <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors" onClick={() => navigate('/tasks')}>View All</Badge>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {data.todaysTasks?.length > 0 ? (
                data.todaysTasks.map(task => (
                  <TaskItem key={task._id} title={task.title} project={task.project?.name} priority={task.priority} />
                ))
              ) : <div className="text-center text-muted-foreground text-sm py-8 bg-muted/20 rounded-lg border border-dashed border-border">All clear for today!</div>}
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
            <DialogFooter><Button type="submit" className="bg-primary text-primary-foreground">Create Project</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Components
function QuickAction({ icon: Icon, label, color, bg, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 group">
      <div className={`p-3 rounded-full mb-3 ${bg} ${color} group-hover:scale-110 transition-transform`}><Icon className="h-6 w-6" /></div>
      <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">{label}</span>
    </button>
  )
}

function TaskItem({ title, project, priority }) {
  // Map priority to theme colors if possible, or keep semantic alerts
  const priorityStyle = {
    high: 'text-destructive bg-destructive/10 border-destructive/20',
    medium: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    low: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
  }[priority] || 'text-muted-foreground bg-muted border-transparent';

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition border border-transparent hover:border-border cursor-pointer group">
      <div className="h-2 w-2 rounded-full bg-primary/50 group-hover:bg-primary transition-colors"></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{project}</p>
      </div>
      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize border ${priorityStyle}`}>{priority}</span>
    </div>
  )
}

// --- Custom Renderer for Active Donut Segment ---
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;

  return (
    <g>
      <text x={cx} y={cy} dy={-10} textAnchor="middle" fill={fill} className="text-sm font-bold">
        {payload.name}
      </text>
      <text x={cx} y={cy} dy={15} textAnchor="middle" fill="#999" className="text-xs">
        {`${value} Tasks`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={innerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
        opacity={0.2}
      />
    </g>
  );
};