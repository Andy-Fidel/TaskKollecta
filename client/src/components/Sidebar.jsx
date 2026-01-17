import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, CheckSquare, Users, Settings, LogOut,
    ChevronsUpDown, Plus, Check, Building2, FolderKanban,
    ChevronLeft, ChevronRight, Loader2, Calendar
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

export default function Sidebar() {
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
        } catch (e) { console.error("Failed to load orgs"); }
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
        } catch (error) {
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
        { icon: Users, label: 'Team', path: '/team' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <>
            <div
                className={`relative flex flex-col h-screen border-r border-border bg-card/50 transition-all duration-300 ease-in-out font-[Poppins] ${isCollapsed ? 'w-20' : 'w-64'}`}
            >
                {/* COLLAPSE TOGGLE */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-9 z-20 bg-background border border-border rounded-full p-1 shadow-sm hover:bg-muted transition-colors"
                >
                    {isCollapsed ? <ChevronRight className="h-3 w-3 text-foreground" /> : <ChevronLeft className="h-3 w-3 text-foreground" />}
                </button>

                {/* ORGANIZATION SWITCHER */}
                <div className={`p-4 border-b border-border h-16 flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={`flex items-center gap-3 hover:bg-muted/50 rounded-lg transition-colors group outline-none ${isCollapsed ? 'p-0 justify-center' : 'w-full p-2 text-left'}`}>
                                <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold text-xs uppercase shadow-sm shrink-0">
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
                <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
                    <TooltipProvider delayDuration={0}>
                        {navItems.map((item) => (
                            <div key={item.path}>
                                {isCollapsed ? (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <NavLink to={item.path} className={({ isActive }) => `flex items-center justify-center w-full h-10 rounded-lg transition-all ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                                <item.icon className="w-5 h-5" />
                                            </NavLink>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
                                    </Tooltip>
                                ) : (
                                    <NavLink to={item.path} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                        <item.icon className="w-5 h-5 shrink-0" />
                                        <span className="truncate">{item.label}</span>
                                    </NavLink>
                                )}
                            </div>
                        ))}
                    </TooltipProvider>
                </nav>

                {/* USER FOOTER */}
                <div className={`p-4 border-t border-border bg-card/30 ${isCollapsed ? 'flex justify-center' : ''}`}>
                    {isCollapsed ? (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Avatar className="h-9 w-9 border border-border cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all" onClick={() => navigate('/settings')}>
                                        <AvatarImage src={user?.avatar} />
                                        <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    <p>{user?.name}</p>
                                    <p className="text-xs text-muted-foreground">Click for settings</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 mb-4 px-1">
                                <Avatar className="h-9 w-9 border border-border shadow-sm">
                                    <AvatarImage src={user?.avatar} />
                                    <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                                </div>
                            </div>
                            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-red-600 hover:bg-red-50" onClick={logout}>
                                <LogOut className="w-4 h-4 mr-2" /> Log out
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