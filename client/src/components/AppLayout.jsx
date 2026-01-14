import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, FolderKanban, CheckSquare, Users, 
  Settings, Bell, Search, Menu, LogOut, User, 
  ChevronLeft, ChevronRight, PanelLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ModeToggle } from './ModeToggle';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '../context/AuthContext';
import { CommandMenu } from './CommandMenu';

// --- Reusable Nav Content ---
const SidebarContent = ({ isCollapsed }) => {
  const location = useLocation();
  
  const NAV_ITEMS = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: FolderKanban, label: 'Projects', path: '/projects' },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
    { icon: Users, label: 'Team', path: '/team' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Logo Area */}
      <div className={`h-16 flex items-center border-b border-border ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
        <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
          TK
        </div>
        {!isCollapsed && <span className="font-bold text-lg tracking-tight ml-3 text-foreground">TaskKollecta</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <item.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-foreground'}`} />
              {!isCollapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Upgrade Card (Only show if NOT collapsed) */}
      {!isCollapsed && (
        <div className="p-4 mt-auto">
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <h4 className="font-bold text-sm mb-1">Upgrade to Pro</h4>
            <p className="text-xs text-muted-foreground mb-3">Unlock advanced features.</p>
            <Button size="sm" className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs h-8">
              Upgrade
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State for Desktop Sidebar
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background font-sans text-foreground">
      
      {/* --- DESKTOP SIDEBAR (Hidden on Mobile) --- */}
      <aside 
        className={`
          hidden md:flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out relative
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        <SidebarContent isCollapsed={isCollapsed} />
        
        {/* Desktop Collapse Toggle Button */}
        <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-20 bg-white dark:bg-slate-800 border border-border rounded-full p-1 shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors z-50"
        >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        
        {/* HEADER */}
        <header className="h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
          
          {/* LEFT: Mobile Menu & Search */}
          <div className="flex items-center gap-4 flex-1">
             
             {/* MOBILE MENU TRIGGER (Sheet) */}
             <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground">
                        <Menu className="h-5 w-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 bg-card">
                    <SidebarContent isCollapsed={false} />
                </SheetContent>
             </Sheet>

             {/* Search Bar */}
             <div 
                className="relative w-full max-w-sm hidden md:block cursor-pointer"
                onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
             >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                {/* Make input readOnly so it acts as a button to trigger the real menu */}
                <Input 
                  readOnly 
                  placeholder="Search..." 
                  className="pl-10 bg-secondary/50 border-transparent focus:bg-background focus:border-border transition-all rounded-xl cursor-pointer pointer-events-none"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 border border-border bg-background rounded px-1.5 text-[10px] text-muted-foreground font-medium">
                    ⌘ K
                </div>
             </div>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <ModeToggle />
            
            <div className="relative">
                <NotificationBell />
            </div>
            
            <div className="h-8 w-[1px] bg-border mx-1 md:mx-2"></div>
            
            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-transparent p-0">
                  <Avatar className="h-9 w-9 border-2 border-background shadow-sm cursor-pointer hover:scale-105 transition-transform">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 font-bold">
                      {user?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth w-full">
          <Outlet />
        </main>
        {/* COMMAND MENU (Global) */}
        <CommandMenu />

      </div>
    </div>
  );
}