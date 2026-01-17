import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calculator, Calendar, CreditCard, Settings, User,
  LayoutDashboard, FolderKanban, CheckSquare, Users,
  Sun, Moon, Laptop, Plus, Search, Loader2, FileText
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
import { Badge } from "@/components/ui/badge";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ tasks: [], projects: [], users: [] });
  const [isSearching, setIsSearching] = useState(false);

  // 1. Fetch Projects for Quick Access
  useEffect(() => {
    if (open) {
      api.get('/projects').then(({ data }) => setProjects(data)).catch(() => { });
    } else {
      // Reset search when closing
      setSearchQuery("");
      setSearchResults({ tasks: [], projects: [], users: [] });
    }
  }, [open]);

  // 2. Debounced Search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults({ tasks: [], projects: [], users: [] });
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(data);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // 3. Keyboard Event Listener
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

  // 4. Action Handler
  const runCommand = (command) => {
    setOpen(false);
    command();
  };

  const hasSearchResults = searchResults.tasks.length > 0 ||
    searchResults.projects.length > 0 ||
    searchResults.users.length > 0;

  const priorityColors = {
    low: "bg-blue-500/10 text-blue-500",
    medium: "bg-orange-500/10 text-orange-500",
    high: "bg-red-500/10 text-red-500",
    urgent: "bg-destructive/10 text-destructive"
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search tasks, projects, or type a command..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        {isSearching ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Searching...
          </div>
        ) : (
          <>
            {/* Search Results */}
            {hasSearchResults && (
              <>
                {searchResults.tasks.length > 0 && (
                  <CommandGroup heading="Tasks">
                    {searchResults.tasks.map(task => (
                      <CommandItem
                        key={task._id}
                        onSelect={() => runCommand(() => navigate(`/project/${task.project?._id}`))}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <CheckSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{task.title}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              in {task.project?.name || "Unknown"}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {searchResults.projects.length > 0 && (
                  <CommandGroup heading="Projects">
                    {searchResults.projects.map(project => (
                      <CommandItem
                        key={project._id}
                        onSelect={() => runCommand(() => navigate(`/project/${project._id}`))}
                      >
                        <FolderKanban className="mr-2 h-4 w-4" />
                        <span>{project.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {searchResults.users.length > 0 && (
                  <CommandGroup heading="Team Members">
                    {searchResults.users.map(user => (
                      <CommandItem
                        key={user._id}
                        onSelect={() => runCommand(() => navigate(`/team`))}
                      >
                        <User className="mr-2 h-4 w-4" />
                        <span>{user.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{user.email}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                <CommandSeparator />
              </>
            )}

            <CommandEmpty>
              {searchQuery.length >= 2 ? "No results found." : "Start typing to search..."}
            </CommandEmpty>

            {/* Navigation - Show when not searching */}
            {!hasSearchResults && (
              <>
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
              </>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
