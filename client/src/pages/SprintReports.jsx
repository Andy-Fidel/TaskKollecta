import { useEffect, useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, CheckCircle2, Activity, Target, CalendarDays, Loader2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '../api/axios';

export default function SprintReports() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Default: last 14 days
  const today = new Date();
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  const [startDate, setStartDate] = useState(twoWeeksAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  // Load projects for org
  useEffect(() => {
    const orgId = localStorage.getItem('activeOrgId');
    if (orgId) {
      api.get(`/projects/org/${orgId}`).then(({ data }) => {
        setProjects(data);
        if (data.length > 0) setSelectedProject(data[0]._id);
      });
    }
  }, []);

  // Fetch data when project or dates change
  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    api.get(`/analytics/sprint/${selectedProject}?start=${startDate}&end=${endDate}`)
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedProject, startDate, endDate]);

  const statCards = useMemo(() => {
    if (!data) return [];
    const { summary } = data;
    return [
      { label: 'Total Tasks', value: summary.totalTasks, icon: Target, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { label: 'Completed', value: summary.completedTasks, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
      { label: 'In Progress', value: summary.inProgressTasks, icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { label: 'Avg Velocity', value: `${summary.avgVelocity}/wk`, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ];
  }, [data]);

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm px-6 md:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              Sprint Reports
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Burndown charts and velocity tracking</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Project Picker */}
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[200px] h-9 text-sm">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-[140px] text-sm"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-[140px] text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Select a project to view sprint analytics</p>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map((card) => (
                <div key={card.label} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${card.bg}`}>
                      <card.icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                      <p className="text-xl font-bold text-foreground">{card.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Completion Rate Bar */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-foreground">Sprint Completion</span>
                <span className="text-sm font-bold text-primary">{data.summary.completionRate}%</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700"
                  style={{ width: `${data.summary.completionRate}%` }}
                />
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Burndown Chart */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-bold text-foreground mb-4">Burndown Chart</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.burndown}>
                      <defs>
                        <linearGradient id="burndownGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }}
                        labelFormatter={(d) => new Date(d).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="remaining"
                        stroke="hsl(var(--primary))"
                        fill="url(#burndownGrad)"
                        strokeWidth={2}
                        name="Remaining"
                      />
                      <Area
                        type="monotone"
                        dataKey="ideal"
                        stroke="hsl(var(--muted-foreground))"
                        fill="none"
                        strokeWidth={1.5}
                        strokeDasharray="5 5"
                        name="Ideal"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Velocity Chart */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-bold text-foreground mb-4">Velocity</h3>
                <div className="h-72">
                  {data.velocity.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      No completed tasks in this period
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.velocity}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip
                          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }}
                        />
                        <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={40} name="Tasks Completed" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
