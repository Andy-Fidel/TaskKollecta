import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, Search, User, Settings, LogOut, Shield } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

// Custom Components
import Sidebar from './Sidebar';
import { ModeToggle } from './ModeToggle';
import { NotificationBell } from './NotificationBell';
import { CommandMenu } from './CommandMenu';
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from '../hooks/useKeyboardShortcuts';

// Context
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showHelp, setShowHelp } = useKeyboardShortcuts();

  return (
    <div className="flex h-screen bg-background font-sans text-foreground">

      {/* --- DESKTOP SIDEBAR --- */}
      <div className="hidden md:block h-full shrink-0">
        <Sidebar />
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0">

        {/* HEADER */}
        <header className="h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 shrink-0">

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
                <Sidebar />
              </SheetContent>
            </Sheet>

            {/* Global Search Bar (Trigger for Cmd+K) */}
            <div
              className="relative w-full max-w-sm hidden md:block cursor-pointer"
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

            {/* Header User Dropdown */}
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
                  {user?.role === 'superadmin' && (
                    <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer text-purple-600 focus:text-purple-600">
                      <Shield className="mr-2 h-4 w-4" /> Admin Dashboard
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth w-full">
          <Outlet />
        </main>

        {/* GLOBAL COMMAND MENU */}
        <CommandMenu />

        {/* KEYBOARD SHORTCUTS HELP */}
        <KeyboardShortcutsHelp open={showHelp} onOpenChange={setShowHelp} />

      </div>
    </div>
  );
}