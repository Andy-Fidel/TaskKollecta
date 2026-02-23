import { useState, useEffect, useRef, useCallback } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Users, Building2, FolderKanban, ListTodo,
    Activity, Shield, Ban, RefreshCw, Key,
    Search, ChevronLeft, ChevronRight, MoreHorizontal,
    CheckCircle2, AlertTriangle, XCircle, Loader2,
    TrendingUp, Crown, ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '../api/axios';

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
    // First frame resets to 0, then animates up — all inside rAF callbacks
    rafRef.current = requestAnimationFrame((now) => {
      setCount(0);
      animate(now);
    });
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return count;
}

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState(null);
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [usersLoading, setUsersLoading] = useState(false);

    const [actionDialog, setActionDialog] = useState({ open: false, type: '', user: null });
    const [actionReason, setActionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Animated counters
    const totalUsers = useCountUp(stats?.totals?.users);
    const totalOrgs = useCountUp(stats?.totals?.organizations);
    const totalProjects = useCountUp(stats?.totals?.projects);
    const totalTasks = useCountUp(stats?.totals?.tasks);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [statsRes, healthRes] = await Promise.all([
                    api.get('/admin/stats'),
                    api.get('/admin/health')
                ]);
                setStats(statsRes.data);
                setHealth(healthRes.data);
            } catch {
                toast.error('Failed to load dashboard stats');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const fetchUsers = useCallback(async (page = 1) => {
        setUsersLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 10 });
            if (searchQuery) params.append('search', searchQuery);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            const { data } = await api.get(`/admin/users?${params}`);
            setUsers(data.users);
            setPagination(data.pagination);
        } catch {
            toast.error('Failed to load users');
        } finally {
            setUsersLoading(false);
        }
    }, [searchQuery, statusFilter]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleSearch = (e) => { e.preventDefault(); fetchUsers(1); };

    const handleAction = async () => {
        if (!actionDialog.user) return;
        setActionLoading(true);
        try {
            const { type, user } = actionDialog;
            switch (type) {
                case 'suspend':
                    await api.put(`/admin/users/${user._id}/suspend`, { reason: actionReason });
                    toast.success('User suspended');
                    break;
                case 'ban':
                    await api.put(`/admin/users/${user._id}/ban`, { reason: actionReason });
                    toast.success('User banned');
                    break;
                case 'activate':
                    await api.put(`/admin/users/${user._id}/activate`);
                    toast.success('User activated');
                    break;
                case 'reset':
                    await api.post(`/admin/users/${user._id}/reset-password`);
                    toast.success('Password reset email sent');
                    break;
            }
            setActionDialog({ open: false, type: '', user: null });
            setActionReason('');
            fetchUsers(pagination.page);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    // Inline role change
    const handleRoleChange = async (userId, newRole) => {
        try {
            await api.put(`/admin/users/${userId}/role`, { role: newRole });
            toast.success(`Role changed to ${newRole}`);
            fetchUsers(pagination.page);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to change role');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            banned: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        };
        return <Badge className={styles[status] || styles.active}>{status}</Badge>;
    };

    const getRoleBadge = (role) => {
        const styles = {
            superadmin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            user: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        };
        return <Badge variant="outline" className={styles[role] || styles.user}>{role}</Badge>;
    };

    // Glassmorphism class
    const glassCls = "relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-gradient-to-br backdrop-blur-sm shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300";
    const cardStyle = "border-border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl";

    // --- SKELETON LOADING ---
    if (loading) return (
        <div className="space-y-8 pb-10" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
            <div className="space-y-2">
                <div className="h-8 w-72 bg-muted rounded-lg animate-pulse" />
                <div className="h-4 w-48 bg-muted/60 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-card p-6 space-y-4">
                        <div className="flex justify-between">
                            <div className="h-10 w-10 bg-muted rounded-xl animate-pulse" />
                            <div className="h-4 w-16 bg-muted/40 rounded animate-pulse" />
                        </div>
                        <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-28 bg-muted/40 rounded animate-pulse" />
                    </div>
                ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-card p-6">
                        <div className="h-5 w-40 bg-muted rounded animate-pulse mb-6" />
                        <div className="h-[200px] bg-muted/30 rounded-lg animate-pulse" />
                    </div>
                ))}
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
                <div className="h-5 w-40 bg-muted rounded animate-pulse mb-6" />
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        </div>
    );

    const statCards = [
        { label: 'Total Users', value: totalUsers, weekly: stats?.thisWeek?.users, icon: Users, gradient: 'from-blue-500/20 to-cyan-500/10 dark:from-blue-500/15 dark:to-cyan-900/20', iconColor: 'text-blue-500', ring: 'ring-blue-500/20' },
        { label: 'Organizations', value: totalOrgs, weekly: stats?.thisWeek?.organizations, icon: Building2, gradient: 'from-purple-500/20 to-violet-500/10 dark:from-purple-500/15 dark:to-violet-900/20', iconColor: 'text-purple-500', ring: 'ring-purple-500/20' },
        { label: 'Projects', value: totalProjects, weekly: null, icon: FolderKanban, gradient: 'from-orange-500/20 to-amber-500/10 dark:from-orange-500/15 dark:to-amber-900/20', iconColor: 'text-orange-500', ring: 'ring-orange-500/20' },
        { label: 'Tasks', value: totalTasks, weekly: stats?.thisWeek?.tasks, icon: ListTodo, gradient: 'from-emerald-500/20 to-green-500/10 dark:from-emerald-500/15 dark:to-green-900/20', iconColor: 'text-emerald-500', ring: 'ring-emerald-500/20' },
    ];

    return (
        <div className="space-y-8 pb-10" style={{ animation: 'fadeInUp 0.4s ease-out' }}>

            {/* ====== HEADER ====== */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl ring-1 ring-primary/10">
                    <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Super Admin</h1>
                    <p className="text-sm text-muted-foreground">Platform overview & user management</p>
                </div>
            </div>

            {/* ====== STAT CARDS (Glassmorphism + Animated Counters) ====== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {statCards.map((stat, i) => (
                    <div
                        key={stat.label}
                        className={`${glassCls} ${stat.gradient} group cursor-default`}
                        style={{ animation: `fadeInUp ${0.3 + i * 0.1}s ease-out` }}
                    >
                        <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${stat.iconColor} opacity-[0.07] blur-2xl group-hover:opacity-[0.12] transition-opacity`} />
                        <div className="relative p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div className={`p-2.5 rounded-xl bg-background/40 dark:bg-background/20 ring-1 ${stat.ring} backdrop-blur-sm`}>
                                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-extrabold text-foreground tabular-nums">{stat.value}</h3>
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                                {stat.weekly != null && stat.weekly > 0 && (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                        <ArrowUpRight className="w-3 h-3" />+{stat.weekly} this week
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ====== CHARTS ROW ====== */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* User Growth Chart */}
                <Card className={cardStyle}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            User Growth (30 days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats?.growth || []}>
                                    <defs>
                                        <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="_id"
                                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                        tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                        axisLine={false} tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', fontSize: '12px' }}
                                        labelFormatter={(d) => new Date(d).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#userGrowthGrad)" strokeWidth={2} dot={false} name="New Users" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Task Activity Chart */}
                <Card className={cardStyle}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-500" />
                            Task Activity (30 days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats?.taskActivity || []}>
                                    <XAxis
                                        dataKey="_id"
                                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                        tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                        axisLine={false} tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', fontSize: '12px' }}
                                        labelFormatter={(d) => new Date(d).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    />
                                    <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Tasks Created" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ====== SYSTEM HEALTH + TOP ORGS + USER STATUS ====== */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* System Health */}
                <Card className={cardStyle}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Activity className="w-4 h-4" /> System Health
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                            <span className="text-sm font-medium">Database</span>
                            {health?.database?.connected ? (
                                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-emerald-600 text-xs font-semibold">Connected</span></div>
                            ) : (
                                <div className="flex items-center gap-1.5"><XCircle className="w-4 h-4 text-red-500" /><span className="text-red-600 text-xs font-semibold">Disconnected</span></div>
                            )}
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                            <span className="text-sm font-medium">Memory</span>
                            <span className="text-xs text-muted-foreground font-medium">{health?.memory?.heapUsed} / {health?.memory?.heapTotal}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                            <span className="text-sm font-medium">Uptime</span>
                            <span className="text-xs text-muted-foreground font-medium">{health?.uptime}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                            <span className="text-sm font-medium">Environment</span>
                            <Badge variant="outline" className="text-[10px] font-semibold">{health?.environment}</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Organizations */}
                <Card className={cardStyle}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-500" /> Top Organizations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.topOrgs?.length > 0 ? (
                            <div className="space-y-3">
                                {stats.topOrgs.map((org, i) => (
                                    <div key={org._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                                            i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : 'bg-orange-400/70'
                                        }`}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate text-foreground">{org.name}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {org.memberCount} members • {org.projectCount} projects
                                            </p>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px] tabular-nums shrink-0">
                                            {org.taskCount} tasks
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">No organizations yet</div>
                        )}
                    </CardContent>
                </Card>

                {/* User Status Breakdown */}
                <Card className={cardStyle}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Users className="w-4 h-4" /> User Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm font-medium">Active</span>
                            </div>
                            <span className="text-lg font-bold text-emerald-600 tabular-nums">{stats?.userStatus?.active || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <span className="text-sm font-medium">Suspended</span>
                            </div>
                            <span className="text-lg font-bold text-amber-600 tabular-nums">{stats?.userStatus?.suspended || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                            <div className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-600" />
                                <span className="text-sm font-medium">Banned</span>
                            </div>
                            <span className="text-lg font-bold text-red-600 tabular-nums">{stats?.userStatus?.banned || 0}</span>
                        </div>
                        {/* Visual ratio bar */}
                        {stats?.totals?.users > 0 && (
                            <div className="pt-2">
                                <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                                    <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${((stats.userStatus.active || 0) / stats.totals.users) * 100}%` }} />
                                    <div className="bg-amber-500 transition-all duration-700" style={{ width: `${((stats.userStatus.suspended || 0) / stats.totals.users) * 100}%` }} />
                                    <div className="bg-red-500 transition-all duration-700" style={{ width: `${((stats.userStatus.banned || 0) / stats.totals.users) * 100}%` }} />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ====== USER MANAGEMENT TABLE ====== */}
            <Card className={cardStyle}>
                <CardHeader>
                    <CardTitle className="text-lg font-bold">User Management</CardTitle>
                    <CardDescription>Search, filter, and manage user accounts</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Search & Filter */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 rounded-xl"
                                />
                            </div>
                            <Button type="submit" variant="secondary" className="rounded-xl">Search</Button>
                        </form>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px] rounded-xl">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="banned">Banned</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Table */}
                    <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Email</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Role</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Joined</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {usersLoading ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user._id} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8 border border-border">
                                                        <AvatarImage src={user.avatar} />
                                                        <AvatarFallback className="text-xs font-bold">{user.name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium text-sm truncate max-w-[120px]">{user.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 hidden md:table-cell">
                                                <span className="text-sm text-muted-foreground truncate max-w-[200px] block">{user.email}</span>
                                            </td>
                                            <td className="py-3 px-4">{getStatusBadge(user.status || 'active')}</td>
                                            {/* Inline Role Change */}
                                            <td className="py-3 px-4 hidden sm:table-cell">
                                                <Select
                                                    value={user.role || 'user'}
                                                    onValueChange={(newRole) => handleRoleChange(user._id, newRole)}
                                                >
                                                    <SelectTrigger className="w-[120px] h-7 text-xs border-none bg-transparent hover:bg-muted/50 rounded-lg p-1 pl-2">
                                                        <SelectValue>
                                                            {getRoleBadge(user.role || 'user')}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="user">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-gray-400" />
                                                                User
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="admin">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                                Admin
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="superadmin">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-purple-500" />
                                                                Super Admin
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="py-3 px-4 hidden lg:table-cell">
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {user.status !== 'active' && (
                                                            <DropdownMenuItem onClick={() => setActionDialog({ open: true, type: 'activate', user })}>
                                                                <RefreshCw className="w-4 h-4 mr-2" /> Activate
                                                            </DropdownMenuItem>
                                                        )}
                                                        {user.status === 'active' && (
                                                            <DropdownMenuItem onClick={() => setActionDialog({ open: true, type: 'suspend', user })}>
                                                                <AlertTriangle className="w-4 h-4 mr-2" /> Suspend
                                                            </DropdownMenuItem>
                                                        )}
                                                        {user.status !== 'banned' && user.role !== 'superadmin' && (
                                                            <DropdownMenuItem
                                                                onClick={() => setActionDialog({ open: true, type: 'ban', user })}
                                                                className="text-red-600 focus:text-red-600"
                                                            >
                                                                <Ban className="w-4 h-4 mr-2" /> Ban
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => setActionDialog({ open: true, type: 'reset', user })}>
                                                            <Key className="w-4 h-4 mr-2" /> Reset Password
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {users.length} of {pagination.total} users
                            </p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={pagination.page === 1} onClick={() => fetchUsers(pagination.page - 1)} className="rounded-lg">
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-sm tabular-nums">Page {pagination.page} of {pagination.pages}</span>
                                <Button variant="outline" size="sm" disabled={pagination.page === pagination.pages} onClick={() => fetchUsers(pagination.page + 1)} className="rounded-lg">
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ====== ACTION DIALOG ====== */}
            <AlertDialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, type: '', user: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {actionDialog.type === 'suspend' && 'Suspend User'}
                            {actionDialog.type === 'ban' && 'Ban User'}
                            {actionDialog.type === 'activate' && 'Activate User'}
                            {actionDialog.type === 'reset' && 'Reset Password'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {actionDialog.type === 'suspend' && (
                                <>Are you sure you want to suspend <strong>{actionDialog.user?.name}</strong>? They will not be able to access their account.</>
                            )}
                            {actionDialog.type === 'ban' && (
                                <>Are you sure you want to permanently ban <strong>{actionDialog.user?.name}</strong>? This action is severe.</>
                            )}
                            {actionDialog.type === 'activate' && (
                                <>This will reactivate <strong>{actionDialog.user?.name}</strong>'s account, removing any suspension or ban.</>
                            )}
                            {actionDialog.type === 'reset' && (
                                <>A password reset email will be sent to <strong>{actionDialog.user?.email}</strong> with a temporary password.</>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {(actionDialog.type === 'suspend' || actionDialog.type === 'ban') && (
                        <div className="my-4">
                            <Textarea
                                placeholder="Reason (optional)"
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                className="min-h-[80px]"
                            />
                        </div>
                    )}

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAction}
                            disabled={actionLoading}
                            className={actionDialog.type === 'ban' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                            {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
