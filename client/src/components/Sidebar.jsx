import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, CheckSquare, Users, Settings, LogOut,
    ChevronsUpDown, Plus, Check, Building2, FolderKanban,
    ChevronLeft, ChevronRight, Loader2, Calendar, GanttChartSquare,
    BarChart3, Users2
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'sonner';

export default function Sidebar({ onClose }) {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    // Sidebar State
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [userOrgs, setUserOrgs] = useState([]);
    const [activeOrg, setActiveOrg] = useState(null);

    // Create Org Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 1. Fetch User's Organizations
    useEffect(() => {
        fetchOrgs();
    }, []);

    const fetchOrgs = async () => {
        try {
            const { data } = await api.get('/organizations');
            setUserOrgs(data);
            const savedOrgId = localStorage.getItem('activeOrgId');
            const found = data.find(o => o._id === savedOrgId) || data[0];
            if (found) {
                setActiveOrg(found);
                if (!savedOrgId) localStorage.setItem('activeOrgId', found._id);
            }
        } catch { console.error("Failed to load orgs"); }
    };

    const handleSwitchOrg = (org) => {
        setActiveOrg(org);
        localStorage.setItem('activeOrgId', org._id);
        window.location.href = '/dashboard';
    };

    // --- NEW: Handle Create Organization ---
    const handleCreateOrg = async (e) => {
        e.preventDefault();
        if (!newOrgName.trim()) return;

        setIsLoading(true);
        try {
            const { data: newOrg } = await api.post('/organizations', { name: newOrgName });

            // 1. Close Modal
            setIsCreateOpen(false);
            setNewOrgName('');

            // 2. Refresh List
            await fetchOrgs();

            // 3. Auto-Switch to new Org
            handleSwitchOrg(newOrg);

            toast.success("Workspace created!");
        } catch {
            toast.error("Failed to create workspace");
        } finally {
            setIsLoading(false);
        }
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: FolderKanban, label: 'Projects', path: '/projects' },
        { icon: CheckSquare, label: 'My Tasks', path: '/tasks' },
        { icon: Calendar, label: 'Calendar', path: '/calendar' },
        { icon: GanttChartSquare, label: 'Timeline', path: '/gantt' },
        { icon: BarChart3, label: 'Reports', path: '/reports' },
        { icon: Users2, label: 'Workload', path: '/workload' },
        { icon: Users, label: 'Team', path: '/team' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <>
            <div
                className={`relative flex flex-col h-full md:h-screen border-r border-white/10 bg-background/40 backdrop-blur-xl transition-all duration-300 ease-in-out font-[Poppins] shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] ${isCollapsed ? 'w-20' : 'w-64'}`}
            >
                {/* COLLAPSE TOGGLE - hidden on mobile (sheet handles closing) */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden md:flex absolute -right-3 top-9 z-20 bg-background/80 backdrop-blur-md border border-white/20 rounded-full p-1.5 shadow-md hover:bg-muted transition-all hover:scale-110"
                >
                    {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-foreground" /> : <ChevronLeft className="h-3.5 w-3.5 text-foreground" />}
                </button>

                {/* ORGANIZATION SWITCHER */}
                <div className={`p-4 border-b border-white/10 h-16 flex items-center shrink-0 ${isCollapsed ? 'justify-center' : ''}`}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={`flex items-center gap-3 hover:bg-white/5 rounded-xl transition-all group outline-none ${isCollapsed ? 'p-0 justify-center' : 'w-full p-2 text-left'}`}>
                                <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xs uppercase shadow-[0_0_15px_-3px_hsl(var(--primary)/0.4)] shrink-0">
                                    {activeOrg ? activeOrg.name.substring(0, 2) : <Building2 className="w-4 h-4" />}
                                </div>

                                {!isCollapsed && (
                                    <>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-foreground truncate">
                                                {activeOrg ? activeOrg.name : 'No Org'}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground truncate capitalize">
                                                {user?.name}'s Workspace
                                            </p>
                                        </div>
                                        <ChevronsUpDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                                    </>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="start" side={isCollapsed ? "right" : "bottom"}>
                            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Switch Workspace</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {userOrgs.map(org => (
                                <DropdownMenuItem key={org._id} onClick={() => handleSwitchOrg(org)}>
                                    <div className="flex items-center justify-between w-full">
                                        <span className="font-medium">{org.name}</span>
                                        {activeOrg?._id === org._id && <Check className="w-4 h-4 text-primary" />}
                                    </div>
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            {/* TRIGGER THE MODAL */}
                            <DropdownMenuItem onClick={() => setIsCreateOpen(true)} className="text-primary font-medium cursor-pointer">
                                <Plus className="w-4 h-4 mr-2" /> Create New Workspace
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* NAVIGATION LINKS */}
                <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto min-h-0 scrollbar-hide">
                    <TooltipProvider delayDuration={0}>
                        {navItems.map((item) => (
                            <div key={item.path}>
                                {isCollapsed ? (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <NavLink to={item.path} onClick={onClose} className={({ isActive }) => `
                                                relative flex items-center justify-center w-full h-11 rounded-xl transition-all duration-300 group overflow-hidden
                                                ${isActive 
                                                    ? 'text-primary' 
                                                    : 'text-slate-500 hover:text-foreground'
                                                }
                                            `}>
                                                {({ isActive }) => (
                                                    <>
                                                        {isActive && (
                                                            <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm border border-primary/20 rounded-xl" />
                                                        )}
                                                        <item.icon className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
                                                        {isActive && (
                                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_2px_hsl(var(--primary)/0.6)] animate-pulse" />
                                                        )}
                                                    </>
                                                )}
                                            </NavLink>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
                                    </Tooltip>
                                ) : (
                                    <NavLink to={item.path} onClick={onClose} className={({ isActive }) => `
                                        relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group overflow-hidden
                                        ${isActive 
                                            ? 'text-primary shadow-[0_4px_20px_-8px_hsl(var(--primary)/0.3)]' 
                                            : 'text-slate-500 hover:text-foreground hover:bg-white/5'
                                        }
                                    `}>
                                        {({ isActive }) => (
                                            <>
                                                {/* Active Pill Background */}
                                                <div className={`absolute inset-0 bg-gradient-to-r from-primary/15 to-transparent border border-primary/20 rounded-xl transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                                                
                                                <item.icon className={`w-[18px] h-[18px] shrink-0 relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                                <span className="truncate relative z-10 tracking-wide">{item.label}</span>

                                                {/* Animated Indicator Dot */}
                                                {isActive && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_2px_hsl(var(--primary)/0.6)] relative z-10" />
                                                        <div className="absolute w-3 h-3 rounded-full bg-primary/40 animate-ping" />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </NavLink>
                                )}
                            </div>
                        ))}
                    </TooltipProvider>
                </nav>

                {/* USER FOOTER */}
                <div className={`shrink-0 p-4 border-t border-white/10 bg-white/5 backdrop-blur-md ${isCollapsed ? 'flex justify-center' : ''}`}>
                    {isCollapsed ? (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Avatar className="h-10 w-10 border-2 border-background shadow-md cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all hover:scale-105" onClick={() => navigate('/settings')}>
                                        <AvatarImage src={user?.avatar} />
                                        <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-primary/20 text-primary font-bold">{user?.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    <p className="font-medium">{user?.name}</p>
                                    <p className="text-xs text-muted-foreground">Click for settings</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 mb-4 px-1">
                                <Avatar className="h-10 w-10 border-2 border-background shadow-md">
                                    <AvatarImage src={user?.avatar} />
                                    <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-primary/20 text-primary font-bold">{user?.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-foreground truncate tracking-tight">{user?.name}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                                </div>
                            </div>
                            <Button variant="ghost" className="w-full justify-start text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors h-9" onClick={logout}>
                                <LogOut className="w-4 h-4 mr-2" /> <span className="font-medium">Log out</span>
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* CREATE ORGANIZATION MODAL */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Workspace</DialogTitle>
                        <DialogDescription>Create a new organization to collaborate with your team.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateOrg}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Workspace Name</Label>
                                <Input
                                    placeholder="e.g. Acme Corp, Design Team..."
                                    value={newOrgName}
                                    onChange={e => setNewOrgName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground">
                                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Create Workspace
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}