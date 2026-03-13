import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadialBarChart, RadialBar, Legend, CartesianGrid,
  ComposedChart, Line
} from 'recharts';
import {
  CheckCircle2, TrendingUp, Users, FolderOpen,
  Plus, AlertCircle, Loader2, History, Calendar as CalendarIcon,
  Flame, Zap, Target, Activity
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CreateProjectWizard from '@/components/CreateProjectWizard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatActivityAction } from "../utils/formatActivity";

import api from '../api/axios';
import { useAuth } from '../context/useAuth';
import { ReminderWidget } from '@/components/ReminderWidget';
import { Skeleton } from '@/components/ui/skeleton';
import { useDataRefresh } from '../context/useDataRefresh';

// --- Theme-compatible chart colors ---
const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
];

// --- Priority config for Priority Breakdown chart ---
const PRIORITY_CONFIG = {
  urgent: { color: '#ef4444', label: 'Urgent' },
  high: { color: '#f97316', label: 'High' },
  medium: { color: '#eab308', label: 'Medium' },
  low: { color: '#22c55e', label: 'Low' },
  none: { color: '#94a3b8', label: 'No Priority' },
};

// --- Animated count-up hook ---
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target == null || target === 0) return;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame((now) => {
      setCount(0);
      animate(now);
    });
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return count;
}

// --- Time-aware greeting ---
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
  if (hour < 17) return { text: 'Good afternoon', emoji: '🌤️' };
  if (hour < 21) return { text: 'Good evening', emoji: '🌅' };
  return { text: 'Good night', emoji: '🌙' };
}

// --- Generate sparkline-like data from productivity array ---
function buildSparkline(productivityData = [], days = 7) {
  const result = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const found = productivityData.find(p => p.name === dateStr);
    result.push({ d: dateStr, v: found ? found.value : 0 });
  }
  return result;
}

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
  const [orgMembers, setOrgMembers] = useState([]);
  const { refreshKey, triggerRefresh } = useDataRefresh();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const start = dateRange.from ? dateRange.from.toISOString() : '';
        const end = dateRange.to ? dateRange.to.toISOString() : '';

        const dashboardRes = await api.get(`/dashboard?start=${start}&end=${end}`);
        setData(dashboardRes.data);

        const orgRes = await api.get('/organizations');

        // Fetch org members for the project wizard
        const activeOrgId = localStorage.getItem('activeOrgId') || orgRes.data?.[0]?._id;
        if (activeOrgId) {
          const memRes = await api.get(`/organizations/${activeOrgId}/members`);
          setOrgMembers(memRes.data);
        }
      } catch {
        console.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange, refreshKey]);

  // Radial gauge data for Task Status
  const radialData = data ? [
    { name: 'Completed', value: data.stats.completionRate || 0, fill: 'hsl(var(--chart-4))' },
    { name: 'Active', value: Math.min(((data.stats.activeTasks || 0) / Math.max(data.stats.activeTasks + data.stats.completedInPeriod, 1)) * 100, 100), fill: 'hsl(var(--chart-2))' },
    { name: 'Overdue', value: Math.min(((data.stats.overdue || 0) / Math.max(data.stats.activeTasks + data.stats.completedInPeriod, 1)) * 100, 100), fill: 'hsl(var(--destructive))' },
  ] : [];

  // Compute moving average for Productivity
  const productivityWithMA = useMemo(() => {
    if (!data?.charts?.productivity) return [];
    const raw = data.charts.productivity;
    return raw.map((d, i) => {
      const window = raw.slice(Math.max(0, i - 2), i + 1);
      const avg = window.reduce((s, x) => s + x.value, 0) / window.length;
      return { ...d, ma: Math.round(avg * 10) / 10 };
    });
  }, [data]);

  // Priority breakdown data
  const priorityData = useMemo(() => {
    if (!data?.charts?.byPriority) return [];
    const total = data.charts.byPriority.reduce((s, d) => s + d.value, 0);
    return data.charts.byPriority
      .map(d => ({
        name: PRIORITY_CONFIG[d.name]?.label || d.name,
        value: d.value,
        pct: total > 0 ? Math.round((d.value / total) * 100) : 0,
        color: PRIORITY_CONFIG[d.name]?.color || '#94a3b8',
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const handleProjectCreated = (project) => {
    triggerRefresh();
    navigate(`/project/${project._id}`);
  };

  const greeting = getGreeting();

  // Animated counters
  const totalProjects = useCountUp(data?.stats?.totalProjects);
  const activeTasks = useCountUp(data?.stats?.activeTasks);
  const overdueTasks = useCountUp(data?.stats?.overdue);
  const completedTasks = useCountUp(data?.stats?.completedInPeriod);
  const completionRate = useCountUp(data?.stats?.completionRate);

  // Sparkline data (from productivity chart data)
  const sparklineData = data ? buildSparkline(data.charts?.productivity, 7) : [];

  // --- Compute streak ---
  const streak = (() => {
    if (!data?.charts?.productivity) return 0;
    const prodMap = new Map(data.charts.productivity.map(p => [p.name, p.value]));
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (prodMap.get(dateStr) > 0) {
        count++;
      } else if (i > 0) { // allow today to have 0
        break;
      }
    }
    return count;
  })();

  // --- SKELETON LOADING STATE ---
  if (loading && !data) return (
    <div className="space-y-10 pb-12">
      {/* Greeting skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-4 w-48 opacity-60" />
      </div>
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-4 w-16 opacity-40" />
            </div>
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-28 opacity-40" />
          </div>
        ))}
      </div>
      {/* Chart skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6">
                <Skeleton className="h-4 w-32 mb-8" />
                <Skeleton className="h-[250px] w-full bg-muted/30 rounded-lg" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <Skeleton className="h-5 w-40 mb-8" />
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-full opacity-40" />
                    <Skeleton className="h-8 w-full opacity-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl border border-border bg-card" />
            ))}
          </div>
          <Skeleton className="h-[320px] rounded-xl border border-border bg-card" />
        </div>
      </div>
    </div>
  );

  if (!data) return <div className="p-8 text-center text-muted-foreground">Unable to load dashboard data.</div>;

  const glassCls = "relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-gradient-to-br backdrop-blur-sm shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300";

  const statCards = [
    { label: 'Total Projects', value: totalProjects, raw: data.stats.totalProjects, icon: FolderOpen, gradient: 'from-violet-500/20 to-indigo-500/10 dark:from-violet-500/15 dark:to-indigo-900/20', iconColor: 'text-violet-500', ring: 'ring-violet-500/20' },
    { label: 'Active Tasks', value: activeTasks, raw: data.stats.activeTasks, icon: Activity, gradient: 'from-sky-500/20 to-cyan-500/10 dark:from-sky-500/15 dark:to-cyan-900/20', iconColor: 'text-sky-500', ring: 'ring-sky-500/20' },
    { label: 'Overdue', value: overdueTasks, raw: data.stats.overdue, icon: AlertCircle, gradient: 'from-rose-500/20 to-pink-500/10 dark:from-rose-500/15 dark:to-pink-900/20', iconColor: 'text-rose-500', ring: 'ring-rose-500/20' },
    { label: 'Completed', value: completedTasks, raw: data.stats.completedInPeriod, icon: CheckCircle2, gradient: 'from-emerald-500/20 to-green-500/10 dark:from-emerald-500/15 dark:to-green-900/20', iconColor: 'text-emerald-500', ring: 'ring-emerald-500/20' },
  ];

  const cardStyle = "border-border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl";

  return (
    <div className="space-y-10 pb-12"
         style={{ animation: 'fadeInUp 0.5s ease-out' }}>

      {/* ====== GREETING HEADER ====== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
          <p className="text-sm text-muted-foreground font-medium mb-1">{greeting.emoji} {greeting.text}</p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/80 to-primary bg-clip-text text-transparent">
            {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Here's what's happening with your projects</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Streak pill */}
          {streak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400"
                 style={{ animation: 'fadeInUp 0.6s ease-out' }}>
              <Flame className="w-4 h-4" />
              <span className="text-xs font-bold">{streak} day streak</span>
            </div>
          )}

          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal bg-card hover:bg-accent hover:text-accent-foreground border-input rounded-xl">
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

      {/* ====== STAT CARDS (Glassmorphism + Animated Counters + Sparklines) ====== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div
            key={stat.label}
            className={`${glassCls} ${stat.gradient} group cursor-default`}
            style={{ animation: `fadeInUp ${0.3 + i * 0.1}s ease-out` }}
          >
            {/* Decorative background orb */}
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${stat.iconColor} opacity-[0.07] blur-2xl group-hover:opacity-[0.12] transition-opacity`} />

            <div className="relative p-5">
              <div className="flex justify-between items-start mb-3">
                <div className={`p-2.5 rounded-xl bg-background/40 dark:bg-background/20 ring-1 ${stat.ring} backdrop-blur-sm`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                {/* Mini sparkline for "Completed" card */}
                {stat.label === 'Completed' && sparklineData.length > 0 && (
                  <div className="w-20 h-8 opacity-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparklineData}>
                        <defs>
                          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" fill="url(#sparkGrad)" strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <h3 className="text-3xl font-extrabold text-foreground tabular-nums">{stat.value}</h3>
              <p className="text-xs font-medium text-muted-foreground mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ====== COMPLETION RATE BAR ====== */}
      <div className={`${cardStyle} p-5`}>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Overall Completion</span>
          </div>
          <span className="text-sm font-bold text-primary tabular-nums">{completionRate}%</span>
        </div>
        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${data.stats.completionRate || 0}%` }}
          />
        </div>
      </div>

      {/* ====== MAIN GRID ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN: Charts & Activity */}
        <div className="lg:col-span-2 space-y-10">

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* CHART 1: Completion Radial Gauge */}
            <Card className={cardStyle}>
              <CardHeader>
                <CardTitle className="text-sm font-bold text-foreground">Task Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full min-h-[250px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="30%"
                      outerRadius="90%"
                      barSize={14}
                      data={radialData}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar
                        background={{ fill: 'hsl(var(--muted))' }}
                        dataKey="value"
                        cornerRadius={8}
                      />
                      <Legend
                        iconSize={10}
                        layout="horizontal"
                        verticalAlign="bottom"
                        iconType="circle"
                        wrapperStyle={{ fontSize: '11px' }}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', fontSize: '12px' }}
                        formatter={(value) => [`${Math.round(value)}%`]}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center -mt-4">
                  <span className="text-2xl font-extrabold text-primary tabular-nums">{completionRate}%</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Overall Completion Rate</p>
                </div>
              </CardContent>
            </Card>

            {/* CHART 2: Priority Breakdown */}
            <Card className={cardStyle}>
              <CardHeader>
                <CardTitle className="text-sm font-bold text-foreground">Priority Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {priorityData.length > 0 ? priorityData.map((d) => (
                    <div key={d.name} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="font-medium text-foreground">{d.name}</span>
                        </div>
                        <span className="text-muted-foreground tabular-nums">{d.value} tasks ({d.pct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${d.pct}%`, backgroundColor: d.color }}
                        />
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12 text-muted-foreground text-sm">No active tasks</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CHART 3: Workload by Project × Status (Horizontal Stacked Bars) */}
          {data.charts?.byProjectStatus?.length > 0 && (
            <Card className={cardStyle}>
              <CardHeader>
                <CardTitle className="text-sm font-bold text-foreground">Workload by Project</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.charts.byProjectStatus} layout="vertical" barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', fontSize: '12px' }}
                      />
                      <Bar dataKey="todo" stackId="a" fill="hsl(var(--chart-1))" name="To Do" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="in-progress" stackId="a" fill="hsl(var(--chart-2))" name="In Progress" />
                      <Bar dataKey="review" stackId="a" fill="hsl(var(--chart-3))" name="Review" />
                      <Bar dataKey="done" stackId="a" fill="hsl(var(--chart-4))" name="Done" radius={[0, 4, 4, 0]} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* CHART 4: Productivity Trend (Gradient Bars + Moving Average Line) */}
          {productivityWithMA.length > 0 && (
            <Card className={cardStyle}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Productivity Trend
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">{dateRange.from ? format(dateRange.from, "MMM d") : ''} – {dateRange.to ? format(dateRange.to, "MMM d") : ''}</Badge>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={productivityWithMA}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', fontSize: '12px' }}
                        labelFormatter={(d) => new Date(d).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                      />
                      <Bar dataKey="value" fill="url(#barGrad)" radius={[4, 4, 0, 0]} name="Completed" barSize={16} />
                      <Line type="monotone" dataKey="ma" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="3-Day Avg" strokeDasharray="4 2" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

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
                  <div className="space-y-8 relative border-l border-border ml-2 my-2">
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
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 font-bold text-sm">
                          {project.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-sm text-foreground truncate">{project.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
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

                      <div className="flex flex-col items-end gap-1.5 shrink-0 w-[100px] sm:w-[120px]">
                        <Badge variant="secondary" className="capitalize text-[10px] h-5 px-1.5 font-normal bg-muted text-muted-foreground border-border">
                          {project.status || 'Active'}
                        </Badge>
                        <div className="w-full flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${project.progress || 0}%` }}></div>
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
        <div className="space-y-10">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              ) : <div className="text-center text-muted-foreground text-sm py-8 bg-muted/20 rounded-lg border border-dashed border-border">All clear for today! 🎉</div>}
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

      {/* Create Project Wizard */}
      <CreateProjectWizard
        open={isProjectModalOpen}
        onOpenChange={setIsProjectModalOpen}
        members={orgMembers}
        onProjectCreated={handleProjectCreated}
      />

      {/* Inline CSS animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

    </div>
  );
}

// Components
function QuickAction(props) {
  const { icon: Icon, label, color, bg, onClick } = props;
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 group">
      <div className={`p-3 rounded-full mb-3 ${bg} ${color} group-hover:scale-110 transition-transform`}><Icon className="h-6 w-6" /></div>
      <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">{label}</span>
    </button>
  )
}

function TaskItem({ title, project, priority }) {
  const priorityStyle = {
    high: 'text-destructive bg-destructive/10 border-destructive/20',
    medium: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    low: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    urgent: 'text-rose-600 bg-rose-500/10 border-rose-500/20'
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
