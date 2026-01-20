import { useState, useEffect } from 'react';
import {
    Users, Building2, FolderKanban, ListTodo,
    Activity, Shield, Ban, RefreshCw, Key,
    Search, ChevronLeft, ChevronRight, MoreHorizontal,
    CheckCircle2, AlertTriangle, XCircle, Loader2
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

export default function SuperAdminDashboard() {
    // Stats state
    const [stats, setStats] = useState(null);
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    // Users state
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [usersLoading, setUsersLoading] = useState(false);

    // Action dialogs
    const [actionDialog, setActionDialog] = useState({ open: false, type: '', user: null });
    const [actionReason, setActionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Fetch dashboard stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [statsRes, healthRes] = await Promise.all([
                    api.get('/admin/stats'),
                    api.get('/admin/health')
                ]);
                setStats(statsRes.data);
                setHealth(healthRes.data);
            } catch (error) {
                toast.error('Failed to load dashboard stats');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // Fetch users
    const fetchUsers = async (page = 1) => {
        setUsersLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 10 });
            if (searchQuery) params.append('search', searchQuery);
            if (statusFilter !== 'all') params.append('status', statusFilter);

            const { data } = await api.get(`/admin/users?${params}`);
            setUsers(data.users);
            setPagination(data.pagination);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setUsersLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [statusFilter]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchUsers(1);
    };

    // User actions
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

    const getStatusBadge = (status) => {
        const styles = {
            active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            suspended: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Super Admin Dashboard</h1>
                    <p className="text-muted-foreground">Monitor system health and manage users</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats?.totals?.users || 0}</p>
                                <p className="text-sm text-muted-foreground">Total Users</p>
                            </div>
                        </div>
                        <p className="text-xs text-green-600 mt-2">+{stats?.thisWeek?.users || 0} this week</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats?.totals?.organizations || 0}</p>
                                <p className="text-sm text-muted-foreground">Organizations</p>
                            </div>
                        </div>
                        <p className="text-xs text-green-600 mt-2">+{stats?.thisWeek?.organizations || 0} this week</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                                <FolderKanban className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats?.totals?.projects || 0}</p>
                                <p className="text-sm text-muted-foreground">Projects</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                <ListTodo className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats?.totals?.tasks || 0}</p>
                                <p className="text-sm text-muted-foreground">Tasks</p>
                            </div>
                        </div>
                        <p className="text-xs text-green-600 mt-2">+{stats?.thisWeek?.tasks || 0} this week</p>
                    </CardContent>
                </Card>
            </div>

            {/* System Health & User Status */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* System Health */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            System Health
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm font-medium">Database</span>
                            <div className="flex items-center gap-2">
                                {health?.database?.connected ? (
                                    <><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-green-600 text-sm">Connected</span></>
                                ) : (
                                    <><XCircle className="w-4 h-4 text-red-500" /><span className="text-red-600 text-sm">Disconnected</span></>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm font-medium">Memory (Heap)</span>
                            <span className="text-sm text-muted-foreground">{health?.memory?.heapUsed} / {health?.memory?.heapTotal}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm font-medium">Uptime</span>
                            <span className="text-sm text-muted-foreground">{health?.uptime}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm font-medium">Environment</span>
                            <Badge variant="outline">{health?.environment}</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* User Status Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            User Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium">Active</span>
                            </div>
                            <span className="text-lg font-bold text-green-600">{stats?.userStatus?.active || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm font-medium">Suspended</span>
                            </div>
                            <span className="text-lg font-bold text-yellow-600">{stats?.userStatus?.suspended || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-600" />
                                <span className="text-sm font-medium">Banned</span>
                            </div>
                            <span className="text-lg font-bold text-red-600">{stats?.userStatus?.banned || 0}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* User Management Table */}
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
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
                                    className="pl-10"
                                />
                            </div>
                            <Button type="submit" variant="secondary">Search</Button>
                        </form>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px]">
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
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Email</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Role</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {usersLoading ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user._id} className="hover:bg-muted/30">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={user.avatar} />
                                                        <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium truncate max-w-[120px]">{user.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 hidden md:table-cell">
                                                <span className="text-sm text-muted-foreground truncate max-w-[200px] block">{user.email}</span>
                                            </td>
                                            <td className="py-3 px-4">{getStatusBadge(user.status || 'active')}</td>
                                            <td className="py-3 px-4 hidden sm:table-cell">{getRoleBadge(user.role || 'user')}</td>
                                            <td className="py-3 px-4 hidden lg:table-cell">
                                                <span className="text-sm text-muted-foreground">
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
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page === 1}
                                    onClick={() => fetchUsers(pagination.page - 1)}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-sm">
                                    Page {pagination.page} of {pagination.pages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page === pagination.pages}
                                    onClick={() => fetchUsers(pagination.page + 1)}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Action Dialog */}
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
        </div>
    );
}
