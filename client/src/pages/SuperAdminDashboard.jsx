import { useState, useEffect, useRef, useCallback } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Users, Building2, FolderKanban, ListTodo,
    Activity, Shield, Ban, RefreshCw, Key,
    Search, ChevronLeft, ChevronRight, MoreHorizontal,
    CheckCircle2, AlertTriangle, XCircle, Loader2,
    TrendingUp, Crown, ArrowUpRight, Megaphone, Send, Cpu, Database, Trash2,
    Eye, UserCheck, Clock, History, FileText, Download, ArrowUpDown, CalendarDays
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
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '../api/axios';
import { useAuth } from '../context/useAuth';

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
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');
    const [organizationFilter, setOrganizationFilter] = useState('all');
    const [createdFrom, setCreatedFrom] = useState('');
    const [lastLoginTo, setLastLoginTo] = useState('');
    const [inactiveDays, setInactiveDays] = useState('');
    const [oauthProvider, setOauthProvider] = useState('all');
    const [onboardingState, setOnboardingState] = useState('all');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortDir, setSortDir] = useState('desc');
    const [usersLoading, setUsersLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [organizationOptions, setOrganizationOptions] = useState([]);

    const [actionDialog, setActionDialog] = useState({ open: false, type: '', user: null });
    const [actionReason, setActionReason] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const [announcementMsg, setAnnouncementMsg] = useState('');
    const [announcementReason, setAnnouncementReason] = useState('');
    const [announcementType, setAnnouncementType] = useState('info');
    const [announcementStartsAt, setAnnouncementStartsAt] = useState('');
    const [announcementExpiresAt, setAnnouncementExpiresAt] = useState('');
    const [announcementRole, setAnnouncementRole] = useState('all');
    const [announcementOrg, setAnnouncementOrg] = useState('all');
    const [announcementLoading, setAnnouncementLoading] = useState(false);
    const [activeAnnouncement, setActiveAnnouncement] = useState(null);
    const [announcementHistory, setAnnouncementHistory] = useState([]);

    const [auditLogs, setAuditLogs] = useState([]);
    const [auditPagination, setAuditPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditSearch, setAuditSearch] = useState('');

    const [organizations, setOrganizations] = useState([]);
    const [orgPagination, setOrgPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [orgSearch, setOrgSearch] = useState('');
    const [orgStatusFilter, setOrgStatusFilter] = useState('all');
    const [orgLoading, setOrgLoading] = useState(false);
    const [orgDrawerOpen, setOrgDrawerOpen] = useState(false);
    const [orgDetails, setOrgDetails] = useState(null);
    const [orgDrawerLoading, setOrgDrawerLoading] = useState(false);
    const [orgAction, setOrgAction] = useState({ open: false, type: '', organization: null });
    const [orgReason, setOrgReason] = useState('');
    const [orgOwnerId, setOrgOwnerId] = useState('');
    const [retentionSettings, setRetentionSettings] = useState(null);
    const [retentionReason, setRetentionReason] = useState('');

    // User Details Drawer & Impersonation
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerDetails, setDrawerDetails] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [supportDetails, setSupportDetails] = useState(null);
    const [privacyReason, setPrivacyReason] = useState('');

    // Animated counters
    const totalUsers = useCountUp(stats?.totals?.users);
    const totalOrgs = useCountUp(stats?.totals?.organizations);
    const totalProjects = useCountUp(stats?.totals?.projects);
    const totalTasks = useCountUp(stats?.totals?.tasks);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [statsRes, healthRes, orgRes, annRes] = await Promise.all([
                    api.get('/admin/stats'),
                    api.get('/admin/health'),
                    api.get('/admin/organizations?limit=100').catch(() => ({ data: { organizations: [] } })),
                    api.get('/announcements/active').catch(() => ({ data: null }))
                ]);
                setStats(statsRes.data);
                setHealth(healthRes.data);
                setOrganizationOptions(orgRes.data.organizations || []);
                if (annRes?.data) setActiveAnnouncement(annRes.data);
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
            if (roleFilter !== 'all') params.append('role', roleFilter);
            if (organizationFilter !== 'all') params.append('organization', organizationFilter);
            if (createdFrom) params.append('createdFrom', createdFrom);
            if (lastLoginTo) params.append('lastLoginTo', lastLoginTo);
            if (inactiveDays) params.append('inactiveDays', inactiveDays);
            if (oauthProvider !== 'all') params.append('oauthProvider', oauthProvider);
            if (onboardingState !== 'all') params.append('onboardingState', onboardingState);
            params.append('sortBy', sortBy);
            params.append('sortDir', sortDir);
            const { data } = await api.get(`/admin/users?${params}`);
            setUsers(data.users);
            setPagination(data.pagination);
        } catch {
            toast.error('Failed to load users');
        } finally {
            setUsersLoading(false);
        }
    }, [searchQuery, statusFilter, roleFilter, organizationFilter, createdFrom, lastLoginTo, inactiveDays, oauthProvider, onboardingState, sortBy, sortDir]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleSearch = (e) => { e.preventDefault(); fetchUsers(1); };

    const toggleSort = (field) => {
        if (sortBy === field) {
            setSortDir((current) => current === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortDir('asc');
        }
    };

    const buildUserExportParams = () => {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (roleFilter !== 'all') params.append('role', roleFilter);
        if (organizationFilter !== 'all') params.append('organization', organizationFilter);
        if (createdFrom) params.append('createdFrom', createdFrom);
        if (lastLoginTo) params.append('lastLoginTo', lastLoginTo);
        if (inactiveDays) params.append('inactiveDays', inactiveDays);
        if (oauthProvider !== 'all') params.append('oauthProvider', oauthProvider);
        if (onboardingState !== 'all') params.append('onboardingState', onboardingState);
        params.append('sortBy', sortBy);
        params.append('sortDir', sortDir);
        return params;
    };

    const exportUsers = async () => {
        try {
            const response = await api.get(`/admin/users/export?${buildUserExportParams()}`, { responseType: 'blob' });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'taskkollecta-users.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Failed to export users');
        }
    };

    const fetchAuditLogs = useCallback(async (page = 1) => {
        setAuditLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (auditSearch) params.append('search', auditSearch);
            const { data } = await api.get(`/admin/audit-logs?${params}`);
            setAuditLogs(data.logs);
            setAuditPagination(data.pagination);
        } catch {
            toast.error('Failed to load audit logs');
        } finally {
            setAuditLoading(false);
        }
    }, [auditSearch]);

    useEffect(() => {
        if (activeTab === 'audit') fetchAuditLogs();
    }, [activeTab, fetchAuditLogs]);

    const fetchOrganizations = useCallback(async (page = 1) => {
        setOrgLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 10 });
            if (orgSearch) params.append('search', orgSearch);
            if (orgStatusFilter !== 'all') params.append('status', orgStatusFilter);
            const { data } = await api.get(`/admin/organizations?${params}`);
            setOrganizations(data.organizations);
            setOrgPagination(data.pagination);
        } catch {
            toast.error('Failed to load organizations');
        } finally {
            setOrgLoading(false);
        }
    }, [orgSearch, orgStatusFilter]);

    useEffect(() => {
        if (activeTab === 'organizations') fetchOrganizations();
    }, [activeTab, fetchOrganizations]);

    const handleViewOrganization = async (organization) => {
        setOrgDetails({ organization });
        setOrgDrawerOpen(true);
        setOrgDrawerLoading(true);
        try {
            const { data } = await api.get(`/admin/organizations/${organization._id}`);
            setOrgDetails(data);
        } catch {
            toast.error('Failed to load organization details');
        } finally {
            setOrgDrawerLoading(false);
        }
    };

    const handleOrgAction = async () => {
        if (!orgAction.organization) return;
        setActionLoading(true);
        try {
            if (orgAction.type === 'suspend') {
                await api.put(`/admin/organizations/${orgAction.organization._id}/suspend`, { reason: orgReason });
                toast.success('Organization suspended');
            }
            if (orgAction.type === 'activate') {
                await api.put(`/admin/organizations/${orgAction.organization._id}/activate`, { reason: orgReason });
                toast.success('Organization activated');
            }
            if (orgAction.type === 'transfer') {
                await api.put(`/admin/organizations/${orgAction.organization._id}/transfer-owner`, {
                    reason: orgReason,
                    currentPassword,
                    newOwnerId: orgOwnerId,
                });
                toast.success('Organization owner transferred');
            }
            setOrgAction({ open: false, type: '', organization: null });
            setOrgReason('');
            setOrgOwnerId('');
            setCurrentPassword('');
            fetchOrganizations(orgPagination.page);
            if (orgDrawerOpen && orgAction.organization) handleViewOrganization(orgAction.organization);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Organization action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAction = async () => {
        if (!actionDialog.user) return;
        setActionLoading(true);
        try {
            const { type, user } = actionDialog;
            const body = { reason: actionReason.trim(), currentPassword };
            switch (type) {
                case 'suspend':
                    await api.put(`/admin/users/${user._id}/suspend`, body);
                    toast.success('User suspended');
                    break;
                case 'ban':
                    await api.put(`/admin/users/${user._id}/ban`, body);
                    toast.success('User banned');
                    break;
                case 'activate':
                    await api.put(`/admin/users/${user._id}/activate`, body);
                    toast.success('User activated');
                    break;
                case 'reset':
                    await api.post(`/admin/users/${user._id}/reset-password`, body);
                    toast.success('Password reset link sent');
                    break;
                case 'role':
                    await api.put(`/admin/users/${user._id}/role`, { ...body, role: actionDialog.newRole });
                    toast.success(`Role changed to ${actionDialog.newRole}`);
                    break;
                case 'impersonate': {
                    const { data } = await api.post(`/admin/users/${user._id}/impersonate`, body);
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('impersonation', JSON.stringify({
                        targetName: data.name,
                        targetEmail: data.email,
                        adminName: data.impersonatedBy?.name,
                        expiresAt: data.impersonationExpiresAt
                    }));
                    window.location.href = '/dashboard';
                    break;
                }
                case 'privacyDelete':
                    await api.post(`/admin/users/${user._id}/privacy-delete`, body);
                    toast.success('Privacy deletion workflow completed');
                    break;
            }
            fetchUsers(pagination.page);
            if (activeTab === 'audit') fetchAuditLogs(auditPagination.page);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(false);
            setActionDialog({ open: false, type: '', user: null });
            setActionReason('');
            setCurrentPassword('');
        }
    };

    const handleViewDetails = async (user) => {
        setDrawerDetails({ user }); // Show base details instantly
        setDrawerOpen(true);
        setDrawerLoading(true);
        try {
            const { data } = await api.get(`/admin/users/${user._id}/details`);
            setDrawerDetails(data);
            const support = await api.get(`/admin/users/${user._id}/support-timeline`).catch(() => ({ data: null }));
            setSupportDetails(support.data);
        } catch {
            toast.error('Failed to load user details');
        } finally {
            setDrawerLoading(false);
        }
    };

    const handlePushAnnouncement = async () => {
        if (!announcementMsg.trim()) {
            return toast.error("Please enter a message");
        }
        if (!announcementReason.trim()) {
            return toast.error("Please enter an admin reason");
        }
        setAnnouncementLoading(true);
        try {
            const { data } = await api.post('/admin/announcements', {
                message: announcementMsg,
                type: announcementType,
                reason: announcementReason,
                startsAt: announcementStartsAt || undefined,
                expiresAt: announcementExpiresAt || undefined,
                targetRoles: announcementRole === 'all' ? [] : [announcementRole],
                targetOrganizations: announcementOrg === 'all' ? [] : [announcementOrg]
            });
            toast.success("Announcement pushed live globally!");
            setAnnouncementMsg('');
            setAnnouncementReason('');
            setAnnouncementStartsAt('');
            setAnnouncementExpiresAt('');
            setAnnouncementRole('all');
            setAnnouncementOrg('all');
            setActiveAnnouncement(data);
            if (activeTab === 'audit') fetchAuditLogs(auditPagination.page);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to push announcement');
        } finally {
            setAnnouncementLoading(false);
        }
    };

    const handleDismissAnnouncement = async () => {
        if (!activeAnnouncement) return;
        if (!announcementReason.trim()) {
            return toast.error("Please enter an admin reason");
        }
        setAnnouncementLoading(true);
        try {
            await api.put(`/admin/announcements/${activeAnnouncement._id}/dismiss`, { reason: announcementReason });
            toast.success("Announcement removed");
            setActiveAnnouncement(null);
            setAnnouncementReason('');
            if (activeTab === 'audit') fetchAuditLogs(auditPagination.page);
        } catch {
            toast.error("Failed to dismiss");
        } finally {
            setAnnouncementLoading(false);
        }
    };

    // Inline role change
    const handleRoleChange = async (userId, newRole) => {
        const selectedUser = users.find((item) => item._id === userId);
        setActionDialog({ open: true, type: 'role', user: selectedUser, newRole });
    };

    const fetchAnnouncementHistory = async () => {
        try {
            const { data } = await api.get('/admin/announcements');
            setAnnouncementHistory(data.announcements || []);
        } catch {
            toast.error('Failed to load announcement history');
        }
    };

    const fetchRetentionSettings = async () => {
        try {
            const { data } = await api.get('/admin/retention-settings');
            setRetentionSettings(data);
        } catch {
            toast.error('Failed to load retention settings');
        }
    };

    useEffect(() => {
        if (activeTab === 'compliance') fetchRetentionSettings();
    }, [activeTab]);

    const saveRetentionSettings = async () => {
        if (!retentionReason.trim()) return toast.error('Enter an admin reason');
        try {
            const { data } = await api.put('/admin/retention-settings', { ...retentionSettings, reason: retentionReason });
            setRetentionSettings(data);
            setRetentionReason('');
            toast.success('Retention settings updated');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update retention settings');
        }
    };

    const handlePrivacyExport = async () => {
        if (!drawerDetails?.user || !privacyReason.trim()) return toast.error('Enter a privacy export reason');
        try {
            const { data } = await api.get(`/admin/users/${drawerDetails.user._id}/privacy-export?reason=${encodeURIComponent(privacyReason)}`);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `privacy-export-${drawerDetails.user._id}.json`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            toast.success('Privacy export prepared');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Privacy export failed');
        }
    };

    const handleRevokeSession = async (sessionId) => {
        if (!drawerDetails?.user || !privacyReason.trim()) return toast.error('Enter a support reason');
        try {
            await api.post(`/admin/users/${drawerDetails.user._id}/sessions/${sessionId}/revoke`, { reason: privacyReason });
            toast.success('Session revoked');
            handleViewDetails(drawerDetails.user);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Session revoke failed');
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
        <div className="space-y-10 pb-12" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
            <div className="space-y-2">
                <div className="h-8 w-72 bg-muted rounded-lg animate-pulse" />
                <div className="h-4 w-48 bg-muted/60 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
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
            <div className="grid lg:grid-cols-2 gap-8">
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
        <div className="space-y-10 pb-12" style={{ animation: 'fadeInUp 0.4s ease-out' }}>

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

            <div className="inline-flex h-10 items-center rounded-lg bg-muted p-1 text-muted-foreground">
                <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`h-8 rounded-md px-3 text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'}`}
                >
                    Overview
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    className={`h-8 rounded-md px-3 text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'}`}
                >
                    Users
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('organizations')}
                    className={`h-8 rounded-md px-3 text-sm font-medium transition-colors ${activeTab === 'organizations' ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'}`}
                >
                    Organizations
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('audit')}
                    className={`h-8 rounded-md px-3 text-sm font-medium transition-colors ${activeTab === 'audit' ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'}`}
                >
                    Audit Log
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('compliance')}
                    className={`h-8 rounded-md px-3 text-sm font-medium transition-colors ${activeTab === 'compliance' ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'}`}
                >
                    Compliance
                </button>
            </div>

            {activeTab === 'overview' && (
            <>
            {/* ====== STAT CARDS (Glassmorphism + Animated Counters) ====== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
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
            <div className="grid lg:grid-cols-2 gap-8">
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
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="_id"
                                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                        tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                        axisLine={false} tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', fontSize: '12px' }}
                                        labelFormatter={(d) => new Date(d).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="var(--primary)" fill="url(#userGrowthGrad)" strokeWidth={2} dot={false} name="New Users" />
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
                                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                        tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                        axisLine={false} tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', fontSize: '12px' }}
                                        labelFormatter={(d) => new Date(d).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    />
                                    <Bar dataKey="count" fill="var(--chart-4)" radius={[4, 4, 0, 0]} name="Tasks Created" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ====== SYSTEM HEALTH + TOP ORGS + USER STATUS ====== */}
            <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
                
                {/* System Health Gauges */}
                <Card className={cardStyle}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-500" /> System Health
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                        <div className="flex gap-4 justify-around py-2">
                            {/* CPU Gauge */}
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative w-24 h-24">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40" strokeWidth="8" stroke="currentColor" fill="transparent" className="text-muted/30" />
                                        <circle 
                                            cx="50" cy="50" r="40" strokeWidth="8" fill="transparent" 
                                            stroke="hsl(var(--primary))" 
                                            strokeLinecap="round"
                                            strokeDasharray={2 * Math.PI * 40}
                                            strokeDashoffset={2 * Math.PI * 40 - ((health?.system?.cpuPercent || 0) / 100) * (2 * Math.PI * 40)}
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <Cpu className="w-4 h-4 text-muted-foreground mb-0.5" />
                                        <span className="text-lg font-bold tabular-nums">{health?.system?.cpuPercent || 0}%</span>
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CPU Load</span>
                            </div>

                            {/* Memory Gauge */}
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative w-24 h-24">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40" strokeWidth="8" stroke="currentColor" fill="transparent" className="text-muted/30" />
                                        <circle 
                                            cx="50" cy="50" r="40" strokeWidth="8" fill="transparent" 
                                            stroke="hsl(var(--chart-2))" 
                                            strokeLinecap="round"
                                            strokeDasharray={2 * Math.PI * 40}
                                            strokeDashoffset={2 * Math.PI * 40 - ((health?.system?.memoryPercent || 0) / 100) * (2 * Math.PI * 40)}
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <Database className="w-4 h-4 text-muted-foreground mb-0.5" />
                                        <span className="text-lg font-bold tabular-nums">{health?.system?.memoryPercent || 0}%</span>
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Memory</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                            <div className="bg-muted/30 p-2.5 rounded-lg">
                                <p className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold">Uptime</p>
                                <p className="text-xs font-medium tabular-nums">{health?.uptime}</p>
                            </div>
                            <div className="bg-muted/30 p-2.5 rounded-lg">
                                <p className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold">Database</p>
                                <div className="flex items-center gap-1.5">
                                    {health?.database?.connected ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                                    <span className={`text-xs font-medium ${health?.database?.connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>{health?.database?.status}</span>
                                </div>
                            </div>
                            <div className="bg-muted/30 p-2.5 rounded-lg">
                                <p className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold">API P95</p>
                                <p className="text-xs font-medium tabular-nums">{health?.api?.p95ResponseMs || 0} ms</p>
                            </div>
                            <div className="bg-muted/30 p-2.5 rounded-lg">
                                <p className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold">API Errors</p>
                                <p className="text-xs font-medium tabular-nums">{health?.api?.errorRate || 0}%</p>
                            </div>
                            <div className="bg-muted/30 p-2.5 rounded-lg">
                                <p className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold">DB Latency</p>
                                <p className="text-xs font-medium tabular-nums">{health?.databaseMetrics?.latencyMs ?? 'n/a'} ms</p>
                            </div>
                            <div className="bg-muted/30 p-2.5 rounded-lg">
                                <p className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold">Email</p>
                                <p className="text-xs font-medium">{health?.email?.configured ? `${health.email.failureRate}% fail` : 'Not configured'}</p>
                            </div>
                            <div className="bg-muted/30 p-2.5 rounded-lg">
                                <p className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold">Sockets</p>
                                <p className="text-xs font-medium tabular-nums">{health?.socket?.connectedClients || 0} clients</p>
                            </div>
                            <div className="bg-muted/30 p-2.5 rounded-lg">
                                <p className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold">Version</p>
                                <p className="text-xs font-medium truncate">{health?.deploy?.version || health?.nodeVersion}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Global Announcement Composer */}
                <Card className={`${cardStyle} flex flex-col`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Megaphone className="w-4 h-4 text-primary" />
                                Global Banner
                            </div>
                            {activeAnnouncement && (
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-3">
                        {activeAnnouncement ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-border bg-muted/20 rounded-xl">
                                <p className="text-sm font-medium italic mb-4 max-w-[200px] break-words">"{activeAnnouncement.message}"</p>
                                <Textarea
                                    placeholder="Admin reason for removing banner..."
                                    className="resize-none min-h-[70px] mb-3"
                                    value={announcementReason}
                                    onChange={(e) => setAnnouncementReason(e.target.value)}
                                    maxLength={500}
                                />
                                <Button variant="destructive" size="sm" onClick={handleDismissAnnouncement} disabled={announcementLoading} className="w-full">
                                    {announcementLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                    Remove Banner
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Textarea 
                                    placeholder="Write a message to broadcast to all users..." 
                                    className="resize-none flex-1 min-h-[80px]" 
                                    value={announcementMsg}
                                    onChange={(e) => setAnnouncementMsg(e.target.value)}
                                    maxLength={250}
                                />
                                <Textarea
                                    placeholder="Admin reason for this announcement..."
                                    className="resize-none min-h-[60px]"
                                    value={announcementReason}
                                    onChange={(e) => setAnnouncementReason(e.target.value)}
                                    maxLength={500}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input type="datetime-local" value={announcementStartsAt} onChange={(e) => setAnnouncementStartsAt(e.target.value)} title="Starts at" />
                                    <Input type="datetime-local" value={announcementExpiresAt} onChange={(e) => setAnnouncementExpiresAt(e.target.value)} title="Expires at" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Select value={announcementRole} onValueChange={setAnnouncementRole}>
                                        <SelectTrigger><SelectValue placeholder="Role target" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Roles</SelectItem>
                                            <SelectItem value="user">Users</SelectItem>
                                            <SelectItem value="admin">Admins</SelectItem>
                                            <SelectItem value="superadmin">Superadmins</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={announcementOrg} onValueChange={setAnnouncementOrg}>
                                        <SelectTrigger><SelectValue placeholder="Org target" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Organizations</SelectItem>
                                            {organizationOptions.map((org) => (
                                                <SelectItem key={org._id} value={org._id}>{org.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {announcementMsg.trim() && (
                                    <div className="rounded-lg border border-border bg-muted/30 p-2 text-xs">
                                        <p className="mb-1 font-semibold flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Preview</p>
                                        <p>{announcementMsg}</p>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Select value={announcementType} onValueChange={setAnnouncementType}>
                                        <SelectTrigger className="w-[110px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="info">Info</SelectItem>
                                            <SelectItem value="success">Success</SelectItem>
                                            <SelectItem value="warning">Warning</SelectItem>
                                            <SelectItem value="danger">Danger</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button className="flex-1" onClick={handlePushAnnouncement} disabled={announcementLoading || !announcementMsg.trim()}>
                                        {announcementLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Push
                                    </Button>
                                </div>
                                <Button variant="ghost" size="sm" onClick={fetchAnnouncementHistory} className="w-full">
                                    <History className="w-4 h-4 mr-2" /> Load History
                                </Button>
                                {announcementHistory.length > 0 && (
                                    <div className="max-h-32 space-y-2 overflow-auto text-xs">
                                        {announcementHistory.slice(0, 5).map((item) => (
                                            <div key={item._id} className="rounded-lg border border-border bg-muted/20 p-2">
                                                <p className="font-medium truncate">{item.message}</p>
                                                <p className="text-muted-foreground">{item.isActive ? 'Active' : 'Inactive'} • {new Date(item.createdAt).toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
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
            </>
            )}

            {activeTab === 'users' && (
            <>
            {/* ====== USER MANAGEMENT TABLE ====== */}
            <Card className={cardStyle}>
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold">User Management</CardTitle>
                            <CardDescription>Search, filter, sort, export, and manage user accounts</CardDescription>
                        </div>
                        <Button variant="outline" onClick={exportUsers} className="rounded-xl">
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Search & Filter */}
                    <div className="grid gap-3 mb-6 lg:grid-cols-4">
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
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="banned">Banned</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="superadmin">Super Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Organization" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Organizations</SelectItem>
                                {organizationOptions.map((org) => (
                                    <SelectItem key={org._id} value={org._id}>{org.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input type="date" value={createdFrom} onChange={(event) => setCreatedFrom(event.target.value)} className="rounded-xl" title="Created after" />
                        <Input type="date" value={lastLoginTo} onChange={(event) => setLastLoginTo(event.target.value)} className="rounded-xl" title="Last login before" />
                        <Input type="number" min="1" value={inactiveDays} onChange={(event) => setInactiveDays(event.target.value)} className="rounded-xl" placeholder="Inactive days" />
                        <Select value={oauthProvider} onValueChange={setOauthProvider}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="OAuth" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Providers</SelectItem>
                                <SelectItem value="password">Password</SelectItem>
                                <SelectItem value="google">Google</SelectItem>
                                <SelectItem value="microsoft">Microsoft</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={onboardingState} onValueChange={setOnboardingState}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Onboarding" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Onboarding</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="incomplete">Incomplete</SelectItem>
                                <SelectItem value="skipped">Skipped</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Table */}
                    <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    {[
                                        ['name', 'User', ''],
                                        ['email', 'Email', 'hidden md:table-cell'],
                                        ['status', 'Status', ''],
                                        ['role', 'Role', 'hidden sm:table-cell'],
                                        ['createdAt', 'Joined', 'hidden lg:table-cell'],
                                        ['lastLogin', 'Last Login', 'hidden xl:table-cell'],
                                    ].map(([field, label, cls]) => (
                                        <th key={field} className={`text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${cls}`}>
                                            <button type="button" onClick={() => toggleSort(field)} className="inline-flex items-center gap-1 hover:text-foreground">
                                                {label}
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </th>
                                    ))}
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
                                            <td className="py-3 px-4 hidden xl:table-cell">
                                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3" />
                                                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
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
                                                        <DropdownMenuItem onClick={() => handleViewDetails(user)} className="cursor-pointer">
                                                            <Eye className="w-4 h-4 mr-2 text-primary" /> View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
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
            </>
            )}

            {activeTab === 'organizations' && (
                <Card className={cardStyle}>
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-primary" />
                            Organization Management
                        </CardTitle>
                        <CardDescription>Inspect tenants, ownership, activity, storage, and health</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-3 mb-6 sm:flex-row">
                            <form
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    fetchOrganizations(1);
                                }}
                                className="flex flex-1 gap-2"
                            >
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search organizations..."
                                        value={orgSearch}
                                        onChange={(event) => setOrgSearch(event.target.value)}
                                        className="pl-10 rounded-xl"
                                    />
                                </div>
                                <Button type="submit" variant="secondary" className="rounded-xl">Search</Button>
                            </form>
                            <Select value={orgStatusFilter} onValueChange={setOrgStatusFilter}>
                                <SelectTrigger className="w-full rounded-xl sm:w-[170px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="suspended">Suspended</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="border border-border rounded-xl overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Organization</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Owner</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Members</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Projects</th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {orgLoading ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                            </td>
                                        </tr>
                                    ) : organizations.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                                                No organizations found
                                            </td>
                                        </tr>
                                    ) : organizations.map((org) => (
                                        <tr key={org._id} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-3 px-4">
                                                <p className="text-sm font-semibold">{org.name}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(org.createdAt).toLocaleDateString()}</p>
                                            </td>
                                            <td className="py-3 px-4 hidden md:table-cell">
                                                <p className="text-sm">{org.createdBy?.name || 'Unknown'}</p>
                                                <p className="text-xs text-muted-foreground">{org.createdBy?.email}</p>
                                            </td>
                                            <td className="py-3 px-4">{getStatusBadge(org.status || 'active')}</td>
                                            <td className="py-3 px-4 hidden lg:table-cell text-sm tabular-nums">{org.memberCount}</td>
                                            <td className="py-3 px-4 hidden lg:table-cell text-sm tabular-nums">{org.projectCount} / {org.taskCount} tasks</td>
                                            <td className="py-3 px-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleViewOrganization(org)} className="cursor-pointer">
                                                            <Eye className="w-4 h-4 mr-2 text-primary" /> View Details
                                                        </DropdownMenuItem>
                                                        {org.status === 'suspended' ? (
                                                            <DropdownMenuItem onClick={() => setOrgAction({ open: true, type: 'activate', organization: org })}>
                                                                <RefreshCw className="w-4 h-4 mr-2" /> Activate
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => setOrgAction({ open: true, type: 'suspend', organization: org })}>
                                                                <AlertTriangle className="w-4 h-4 mr-2" /> Suspend
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {orgPagination.pages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-muted-foreground">
                                    Showing {organizations.length} of {orgPagination.total} organizations
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" disabled={orgPagination.page === 1} onClick={() => fetchOrganizations(orgPagination.page - 1)} className="rounded-lg">
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <span className="text-sm tabular-nums">Page {orgPagination.page} of {orgPagination.pages}</span>
                                    <Button variant="outline" size="sm" disabled={orgPagination.page === orgPagination.pages} onClick={() => fetchOrganizations(orgPagination.page + 1)} className="rounded-lg">
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'audit' && (
                <Card className={cardStyle}>
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Admin Audit Log
                        </CardTitle>
                        <CardDescription>Privileged actions with actor, target, reason, diff, and correlation ID</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                fetchAuditLogs(1);
                            }}
                            className="flex flex-col sm:flex-row gap-3 mb-6"
                        >
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search action, reason, or correlation ID..."
                                    value={auditSearch}
                                    onChange={(event) => setAuditSearch(event.target.value)}
                                    className="pl-10 rounded-xl"
                                />
                            </div>
                            <Button type="submit" variant="secondary" className="rounded-xl">Search</Button>
                        </form>

                        <div className="border border-border rounded-xl overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Actor</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Target</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reason</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Correlation</th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {auditLoading ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                            </td>
                                        </tr>
                                    ) : auditLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                                                No audit events found
                                            </td>
                                        </tr>
                                    ) : auditLogs.map((log) => (
                                        <tr key={log._id} className="hover:bg-muted/20 transition-colors align-top">
                                            <td className="py-3 px-4">
                                                <Badge variant="outline" className="font-mono text-[11px]">{log.action}</Badge>
                                                <details className="mt-2 text-xs text-muted-foreground">
                                                    <summary className="cursor-pointer">Diff</summary>
                                                    <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-muted/40 p-2 text-[10px] leading-relaxed">
                                                        {JSON.stringify({ before: log.before, after: log.after }, null, 2)}
                                                    </pre>
                                                </details>
                                            </td>
                                            <td className="py-3 px-4 hidden md:table-cell">
                                                <p className="text-sm font-medium">{log.actor?.name || 'Unknown'}</p>
                                                <p className="text-xs text-muted-foreground">{log.actor?.email}</p>
                                            </td>
                                            <td className="py-3 px-4 hidden lg:table-cell">
                                                <p className="text-sm font-medium">{log.target?.name || log.targetModel}</p>
                                                <p className="text-xs text-muted-foreground">{log.target?.email || log.target}</p>
                                            </td>
                                            <td className="py-3 px-4">
                                                <p className="max-w-[260px] text-sm break-words">{log.reason}</p>
                                                <p className="mt-1 text-[10px] text-muted-foreground hidden sm:block">{log.ip} • {log.userAgent?.slice(0, 48)}</p>
                                            </td>
                                            <td className="py-3 px-4 hidden xl:table-cell">
                                                <span className="font-mono text-[10px] text-muted-foreground">{log.correlationId}</span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {auditPagination.pages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-muted-foreground">
                                    Showing {auditLogs.length} of {auditPagination.total} events
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" disabled={auditPagination.page === 1} onClick={() => fetchAuditLogs(auditPagination.page - 1)} className="rounded-lg">
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <span className="text-sm tabular-nums">Page {auditPagination.page} of {auditPagination.pages}</span>
                                    <Button variant="outline" size="sm" disabled={auditPagination.page === auditPagination.pages} onClick={() => fetchAuditLogs(auditPagination.page + 1)} className="rounded-lg">
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'compliance' && (
                <Card className={cardStyle}>
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            Retention Settings
                        </CardTitle>
                        <CardDescription>Configure global compliance retention windows</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {retentionSettings ? (
                            <>
                                <div className="grid gap-3 md:grid-cols-4">
                                    {[
                                        ['auditLogDays', 'Audit logs'],
                                        ['productEventDays', 'Product events'],
                                        ['inactiveUserDays', 'Inactive users'],
                                        ['deletedUserTombstoneDays', 'Deleted user tombstones'],
                                    ].map(([field, label]) => (
                                        <div key={field} className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground">{label}</label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={retentionSettings[field] || ''}
                                                onChange={(event) => setRetentionSettings((current) => ({ ...current, [field]: Number(event.target.value) }))}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <Textarea
                                    placeholder="Admin reason for retention change..."
                                    value={retentionReason}
                                    onChange={(event) => setRetentionReason(event.target.value)}
                                    className="min-h-[80px]"
                                />
                                <Button onClick={saveRetentionSettings}>Save Settings</Button>
                            </>
                        ) : (
                            <div className="py-10 text-center text-sm text-muted-foreground">Loading retention settings...</div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ====== ACTION DIALOG ====== */}
            <AlertDialog open={actionDialog.open} onOpenChange={(open) => {
                if (!open) {
                    setActionDialog({ open: false, type: '', user: null });
                    setActionReason('');
                    setCurrentPassword('');
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {actionDialog.type === 'suspend' && 'Suspend User'}
                            {actionDialog.type === 'ban' && 'Ban User'}
                            {actionDialog.type === 'activate' && 'Activate User'}
                            {actionDialog.type === 'reset' && 'Reset Password'}
                            {actionDialog.type === 'role' && 'Change User Role'}
                            {actionDialog.type === 'impersonate' && 'Login As User'}
                            {actionDialog.type === 'privacyDelete' && 'Privacy Delete User'}
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
                                <>A secure password reset link will be sent to <strong>{actionDialog.user?.email}</strong>.</>
                            )}
                            {actionDialog.type === 'role' && (
                                <>This will change <strong>{actionDialog.user?.name}</strong> to <strong>{actionDialog.newRole}</strong>.</>
                            )}
                            {actionDialog.type === 'impersonate' && (
                                <>This starts a 15-minute audited support session as <strong>{actionDialog.user?.name}</strong>.</>
                            )}
                            {actionDialog.type === 'privacyDelete' && (
                                <>This anonymizes <strong>{actionDialog.user?.email}</strong> and disables the account.</>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="my-4 space-y-3">
                        <Textarea
                            placeholder="Admin reason (required)"
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            className="min-h-[80px]"
                            maxLength={1000}
                        />
                        {['ban', 'reset', 'role', 'impersonate', 'privacyDelete'].includes(actionDialog.type) && (
                            <Input
                                type="password"
                                placeholder="Confirm your password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAction}
                            disabled={
                                actionLoading
                                || !actionReason.trim()
                                || (['ban', 'reset', 'role', 'impersonate', 'privacyDelete'].includes(actionDialog.type) && !currentPassword)
                            }
                            className={actionDialog.type === 'ban' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                            {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ====== USER DETAILS DRAWER ====== */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle>User Details</SheetTitle>
                        <SheetDescription>
                            Detailed view and history
                        </SheetDescription>
                    </SheetHeader>

                    {drawerLoading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : drawerDetails?.user ? (
                        <div className="space-y-8 pb-8">
                            {/* Profile Header */}
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16 border-2 border-primary/20">
                                    <AvatarImage src={drawerDetails.user.avatar} />
                                    <AvatarFallback className="text-2xl">{drawerDetails.user.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-xl font-bold">{drawerDetails.user.name}</h3>
                                    <p className="text-sm text-muted-foreground">{drawerDetails.user.email}</p>
                                    <div className="flex gap-2 mt-2">
                                        {getStatusBadge(drawerDetails.user.status || 'active')}
                                        {getRoleBadge(drawerDetails.user.role || 'user')}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Actions */}
                            {drawerDetails.user._id !== user._id && (
                                <div className="flex gap-2">
                                    <Button onClick={() => setActionDialog({ open: true, type: 'impersonate', user: drawerDetails.user })} className="w-full rounded-xl bg-primary/10 text-primary hover:bg-primary/20">
                                        <UserCheck className="w-4 h-4 mr-2" />
                                        Login As User
                                    </Button>
                                </div>
                            )}

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-muted/30 p-3 rounded-xl border border-border">
                                    <p className="text-xs text-muted-foreground mb-1">Organizations</p>
                                    <p className="font-bold">{drawerDetails.organizations?.length || 0}</p>
                                </div>
                                <div className="bg-muted/30 p-3 rounded-xl border border-border">
                                    <p className="text-xs text-muted-foreground mb-1">Projects</p>
                                    <p className="font-bold">{drawerDetails.projects?.length || 0}</p>
                                </div>
                            </div>

                            {/* Compliance & Support */}
                            <div className="space-y-3 rounded-xl border border-border p-4">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Shield className="w-4 h-4" /> Compliance & Support
                                </h4>
                                <Textarea
                                    placeholder="Admin reason for support/compliance action..."
                                    value={privacyReason}
                                    onChange={(event) => setPrivacyReason(event.target.value)}
                                    className="min-h-[70px]"
                                />
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="rounded-lg bg-muted/30 p-2">
                                        <p className="text-muted-foreground">Terms</p>
                                        <p>{supportDetails?.consent?.termsAcceptedAt ? new Date(supportDetails.consent.termsAcceptedAt).toLocaleDateString() : 'Not recorded'}</p>
                                    </div>
                                    <div className="rounded-lg bg-muted/30 p-2">
                                        <p className="text-muted-foreground">Privacy</p>
                                        <p>{supportDetails?.consent?.privacyAcceptedAt ? new Date(supportDetails.consent.privacyAcceptedAt).toLocaleDateString() : 'Not recorded'}</p>
                                    </div>
                                    <div className="rounded-lg bg-muted/30 p-2">
                                        <p className="text-muted-foreground">Failed logins</p>
                                        <p>{supportDetails?.security?.failedLoginCount || 0}</p>
                                    </div>
                                    <div className="rounded-lg bg-muted/30 p-2">
                                        <p className="text-muted-foreground">Unique IPs</p>
                                        <p>{supportDetails?.security?.uniqueIpCount || 0}</p>
                                    </div>
                                </div>
                                {supportDetails?.security?.anomalyIndicators?.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {supportDetails.security.anomalyIndicators.map((indicator) => (
                                            <Badge key={indicator} variant="outline" className="text-amber-600">{indicator}</Badge>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={handlePrivacyExport} className="flex-1">
                                        <Download className="w-4 h-4 mr-2" /> Export
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setActionDialog({ open: true, type: 'privacyDelete', user: drawerDetails.user })}
                                        className="flex-1"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                    </Button>
                                </div>
                                {supportDetails?.security?.sessions?.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-muted-foreground">Recent Sessions</p>
                                        {supportDetails.security.sessions.slice(0, 4).map((session) => (
                                            <div key={session.sessionId} className="flex items-center justify-between gap-2 rounded-lg bg-muted/20 p-2 text-xs">
                                                <div className="min-w-0">
                                                    <p className="truncate">{session.ip || 'Unknown IP'}</p>
                                                    <p className="text-muted-foreground">{new Date(session.timestamp).toLocaleString()}</p>
                                                </div>
                                                <Button variant="ghost" size="sm" disabled={Boolean(session.revokedAt)} onClick={() => handleRevokeSession(session.sessionId)}>
                                                    {session.revokedAt ? 'Revoked' : 'Revoke'}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Login History */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <History className="w-4 h-4" /> Recent Logins
                                </h4>
                                {drawerDetails.user.loginHistory?.length > 0 ? (
                                    <div className="space-y-2">
                                        {[...drawerDetails.user.loginHistory].reverse().slice(0, 5).map((login, i) => (
                                            <div key={i} className="text-[10px] flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(login.timestamp).toLocaleString()}
                                                </div>
                                                <span className="truncate max-w-[100px] text-slate-500" title={login.device}>{login.device?.split(' ')[0]}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">No login history recorded.</p>
                                )}
                            </div>

                        </div>
                    ) : null}
                </SheetContent>
            </Sheet>

            {/* ====== ORGANIZATION DETAILS DRAWER ====== */}
            <Sheet open={orgDrawerOpen} onOpenChange={setOrgDrawerOpen}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle>Organization Details</SheetTitle>
                        <SheetDescription>Tenant ownership, members, activity, storage, and health</SheetDescription>
                    </SheetHeader>

                    {orgDrawerLoading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : orgDetails?.organization ? (
                        <div className="space-y-6 pb-8">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold">{orgDetails.organization.name}</h3>
                                    <p className="text-sm text-muted-foreground">{orgDetails.organization.website || 'No website'}</p>
                                    <div className="mt-2">{getStatusBadge(orgDetails.organization.status || 'active')}</div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm">Manage</Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setOrgAction({ open: true, type: 'transfer', organization: orgDetails.organization })}>
                                            <UserCheck className="w-4 h-4 mr-2" /> Transfer Owner
                                        </DropdownMenuItem>
                                        {orgDetails.organization.status === 'suspended' ? (
                                            <DropdownMenuItem onClick={() => setOrgAction({ open: true, type: 'activate', organization: orgDetails.organization })}>
                                                <RefreshCw className="w-4 h-4 mr-2" /> Activate
                                            </DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem onClick={() => setOrgAction({ open: true, type: 'suspend', organization: orgDetails.organization })}>
                                                <AlertTriangle className="w-4 h-4 mr-2" /> Suspend
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-xl border border-border bg-muted/30 p-3">
                                    <p className="text-xs text-muted-foreground">Members</p>
                                    <p className="text-lg font-bold">{orgDetails.counts?.members || 0}</p>
                                </div>
                                <div className="rounded-xl border border-border bg-muted/30 p-3">
                                    <p className="text-xs text-muted-foreground">Projects</p>
                                    <p className="text-lg font-bold">{orgDetails.counts?.projects || 0}</p>
                                </div>
                                <div className="rounded-xl border border-border bg-muted/30 p-3">
                                    <p className="text-xs text-muted-foreground">Tasks</p>
                                    <p className="text-lg font-bold">{orgDetails.counts?.tasks || 0}</p>
                                </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-xl border border-border p-4">
                                    <h4 className="mb-3 text-sm font-semibold">Tenant Health</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span className="text-muted-foreground">Owner present</span><span>{orgDetails.health?.hasOwner ? 'Yes' : 'No'}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Active projects</span><span>{orgDetails.health?.activeProjects || 0}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Last activity</span><span>{orgDetails.health?.lastActivityAt ? new Date(orgDetails.health.lastActivityAt).toLocaleDateString() : 'None'}</span></div>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-border p-4">
                                    <h4 className="mb-3 text-sm font-semibold">Storage</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span className="text-muted-foreground">Tracked assets</span><span>{orgDetails.storage?.logoAssets || 0}</span></div>
                                        <p className="text-xs text-muted-foreground">{orgDetails.storage?.note}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold">Members</h4>
                                <div className="max-h-56 space-y-2 overflow-auto">
                                    {orgDetails.members?.map((member) => (
                                        <div key={member._id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-2">
                                            <div>
                                                <p className="text-sm font-medium">{member.user?.name}</p>
                                                <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                                            </div>
                                            <Badge variant="outline">{member.role}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold">Recent Activity</h4>
                                <div className="space-y-2">
                                    {[...(orgDetails.activity || []), ...(orgDetails.productEvents || [])].slice(0, 8).map((event) => (
                                        <div key={event._id} className="rounded-lg border border-border bg-muted/20 p-2 text-xs">
                                            <p className="font-medium">{event.action || event.eventName}</p>
                                            <p className="text-muted-foreground">{event.user?.name || 'System'} • {new Date(event.createdAt).toLocaleString()}</p>
                                        </div>
                                    ))}
                                    {(orgDetails.activity?.length || 0) + (orgDetails.productEvents?.length || 0) === 0 && (
                                        <p className="text-xs text-muted-foreground">No recent activity.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </SheetContent>
            </Sheet>

            {/* ====== ORGANIZATION ACTION DIALOG ====== */}
            <AlertDialog open={orgAction.open} onOpenChange={(open) => {
                if (!open) {
                    setOrgAction({ open: false, type: '', organization: null });
                    setOrgReason('');
                    setOrgOwnerId('');
                    setCurrentPassword('');
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {orgAction.type === 'suspend' && 'Suspend Organization'}
                            {orgAction.type === 'activate' && 'Activate Organization'}
                            {orgAction.type === 'transfer' && 'Transfer Ownership'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {orgAction.type === 'transfer'
                                ? `Choose a new owner for ${orgAction.organization?.name}.`
                                : `This changes tenant access for ${orgAction.organization?.name}.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="my-4 space-y-3">
                        {orgAction.type === 'transfer' && (
                            <>
                                <Select value={orgOwnerId} onValueChange={setOrgOwnerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select new owner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {orgDetails?.members?.map((member) => (
                                            <SelectItem key={member.user?._id} value={member.user?._id}>
                                                {member.user?.name} ({member.user?.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="password"
                                    placeholder="Confirm your password"
                                    value={currentPassword}
                                    onChange={(event) => setCurrentPassword(event.target.value)}
                                />
                            </>
                        )}
                        <Textarea
                            placeholder="Admin reason (required)"
                            value={orgReason}
                            onChange={(event) => setOrgReason(event.target.value)}
                            className="min-h-[80px]"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleOrgAction}
                            disabled={actionLoading || !orgReason.trim() || (orgAction.type === 'transfer' && (!orgOwnerId || !currentPassword))}
                            className={orgAction.type === 'suspend' ? 'bg-red-600 hover:bg-red-700' : ''}
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
