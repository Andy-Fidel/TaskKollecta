import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Calculator, Calendar, CreditCard, Settings, User, 
  LayoutDashboard, FolderKanban, CheckSquare, Users, 
  Sun, Moon, Laptop, Plus
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useTheme } from "./ThemeProvider";
import api from "../api/axios";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [projects, setProjects] = useState([]);

  // 1. Fetch Projects for Search
  useEffect(() => {
    if (open) {
        api.get('/projects').then(({ data }) => setProjects(data)).catch(() => {});
    }
  }, [open]);

  // 2. Keyboard Event Listener
  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // 3. Action Handler
  const runCommand = (command) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {/* Navigation */}
        <CommandGroup heading="Suggestions">
          <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/tasks"))}>
            <CheckSquare className="mr-2 h-4 w-4" />
            <span>My Tasks</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/team"))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Team</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        {/* Projects (Dynamic) */}
        <CommandGroup heading="Projects">
            {projects.slice(0, 5).map(project => (
                <CommandItem key={project._id} onSelect={() => runCommand(() => navigate(`/project/${project._id}`))}>
                    <FolderKanban className="mr-2 h-4 w-4" />
                    <span>{project.name}</span>
                </CommandItem>
            ))}
            <CommandItem onSelect={() => runCommand(() => navigate("/projects"))}>
                <Plus className="mr-2 h-4 w-4" />
                <span>View all projects...</span>
            </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Settings & Theme */}
        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
            <CommandShortcut>⌘B</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Theme">
            <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
                <Sun className="mr-2 h-4 w-4" /> Light
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
                <Moon className="mr-2 h-4 w-4" /> Dark
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
                <Laptop className="mr-2 h-4 w-4" /> System
            </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}