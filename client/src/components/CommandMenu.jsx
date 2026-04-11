import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckSquare,
  CreditCard,
  FolderKanban,
  Laptop,
  LayoutDashboard,
  Loader2,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Sun,
  User,
  Users,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "./ThemeProvider";
import { useDataRefresh } from "../context/useDataRefresh";
import api from "../api/axios";
import { trackProductEvent } from "../utils/productAnalytics";

const EMPTY_QUICK_TASK = {
  title: "",
  description: "",
  projectId: "",
};

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ tasks: [], projects: [], users: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [isSubmittingQuickTask, setIsSubmittingQuickTask] = useState(false);
  const [quickTask, setQuickTask] = useState(EMPTY_QUICK_TASK);
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const { triggerRefresh } = useDataRefresh();

  useEffect(() => {
    if (open) {
      Promise.all([
        api.get('/projects'),
        api.get('/organizations'),
      ])
        .then(([projectsRes, orgsRes]) => {
          setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
          setOrganizations(Array.isArray(orgsRes.data) ? orgsRes.data : []);
        })
        .catch(() => {});
    } else {
      setSearchQuery("");
      setSearchResults({ tasks: [], projects: [], users: [] });
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.startsWith('>')) {
      setSearchResults({ tasks: [], projects: [], users: [] });
      setIsSearching(false);
      return;
    }

    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults({ tasks: [], projects: [], users: [] });
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const activeOrgId = localStorage.getItem('activeOrgId');
        const orgParam = activeOrgId ? `&orgId=${activeOrgId}` : '';
        const { data } = await api.get(`/search?q=${encodeURIComponent(searchQuery)}${orgParam}`);
        setSearchResults(data);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  useEffect(() => {
    const down = (event) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command) => {
    setOpen(false);
    command();
  };

  const priorityColors = {
    low: "bg-blue-500/10 text-blue-500",
    medium: "bg-orange-500/10 text-orange-500",
    high: "bg-red-500/10 text-red-500",
    urgent: "bg-destructive/10 text-destructive"
  };

  const hasSearchResults = searchResults.tasks.length > 0 ||
    searchResults.projects.length > 0 ||
    searchResults.users.length > 0;

  const activeOrgId = localStorage.getItem('activeOrgId');
  const activeOrg = organizations.find((organization) => organization._id === activeOrgId);

  const projectOptions = useMemo(
    () => projects.filter((project) => project?._id && project?.organization),
    [projects],
  );

  const openQuickTaskDialog = () => {
    const defaultProjectId = projectOptions[0]?._id || '';
    setQuickTask({ ...EMPTY_QUICK_TASK, projectId: defaultProjectId });
    setOpen(false);
    setIsQuickTaskOpen(true);
  };

  const handleQuickTaskSubmit = async (event) => {
    event.preventDefault();
    if (!quickTask.title.trim() || !quickTask.projectId) return;

    const selectedProject = projectOptions.find((project) => project._id === quickTask.projectId);
    if (!selectedProject?.organization) return;

    setIsSubmittingQuickTask(true);
    try {
      const { data } = await api.post('/tasks', {
        title: quickTask.title.trim(),
        description: quickTask.description.trim(),
        priority: 'medium',
        projectId: selectedProject._id,
        orgId: selectedProject.organization,
        status: 'todo',
      });
      setIsQuickTaskOpen(false);
      setQuickTask(EMPTY_QUICK_TASK);
      trackProductEvent('command_quick_task_created', {
        organizationId: selectedProject.organization,
        projectId: selectedProject._id,
      });
      triggerRefresh();
      navigate(`/project/${selectedProject._id}`);
      return data;
    } finally {
      setIsSubmittingQuickTask(false);
    }
  };

  const switchWorkspace = (organization) => {
    localStorage.setItem('activeOrgId', organization._id);
    trackProductEvent('command_workspace_switched', {
      organizationId: organization._id,
      metadata: { workspaceName: organization.name },
    });
    runCommand(() => navigate(`/workspace/${organization._id}`));
  };

  const taskActions = [
    {
      label: 'Create Quick Task',
      icon: Plus,
      onSelect: openQuickTaskDialog,
      keywords: ['>', 'create', 'task', 'quick'],
      shortcut: '⌘T',
    },
    {
      label: 'Open Due Today',
      icon: Sparkles,
      onSelect: () => runCommand(() => navigate('/tasks?view=today')),
      keywords: ['>', 'today', 'due', 'overdue'],
    },
    {
      label: 'Open Needs Attention',
      icon: CheckSquare,
      onSelect: () => runCommand(() => navigate('/tasks?view=attention')),
      keywords: ['>', 'attention', 'blocked', 'urgent'],
    },
    {
      label: 'Invite Team Member',
      icon: User,
      onSelect: () => runCommand(() => navigate('/team')),
      keywords: ['>', 'invite', 'member', 'team'],
    },
  ];

  return (
    <>
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
              {hasSearchResults && (
                <>
                  {searchResults.tasks.length > 0 && (
                    <CommandGroup heading="Tasks">
                      {searchResults.tasks.map((task) => (
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
                      {searchResults.projects.map((project) => (
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
                      {searchResults.users.map((user) => (
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
                {searchQuery.startsWith('>')
                  ? "No actions found."
                  : (searchQuery.length >= 2 ? "No results found." : "Start typing to search or type > for actions...")}
              </CommandEmpty>

              {!hasSearchResults && (
                <>
                  <CommandGroup heading="Actions">
                    {taskActions.map((action) => (
                      <CommandItem key={action.label} onSelect={action.onSelect} keywords={action.keywords}>
                        <action.icon className="mr-2 h-4 w-4" />
                        <span>{action.label}</span>
                        {action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
                      </CommandItem>
                    ))}
                  </CommandGroup>

                  <CommandSeparator />

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

                  <CommandGroup heading={activeOrg ? `Projects in ${activeOrg.name}` : 'Projects'}>
                    {projects.slice(0, 5).map((project) => (
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

                  {organizations.length > 0 && (
                    <>
                      <CommandSeparator />
                      <CommandGroup heading="Switch Workspace">
                        {organizations.map((organization) => (
                          <CommandItem key={organization._id} onSelect={() => switchWorkspace(organization)}>
                            <FolderKanban className="mr-2 h-4 w-4" />
                            <span>{organization.name}</span>
                            {organization._id === activeOrgId && <CommandShortcut>Active</CommandShortcut>}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}

                  <CommandSeparator />

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

      <Dialog open={isQuickTaskOpen} onOpenChange={setIsQuickTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Quick Task</DialogTitle>
            <DialogDescription>
              Capture a task without leaving your current flow.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickTaskSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick-task-title">Title</Label>
              <Input
                id="quick-task-title"
                value={quickTask.title}
                onChange={(event) => setQuickTask((current) => ({ ...current, title: event.target.value }))}
                placeholder="What needs to happen?"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-task-description">Description</Label>
              <Input
                id="quick-task-description"
                value={quickTask.description}
                onChange={(event) => setQuickTask((current) => ({ ...current, description: event.target.value }))}
                placeholder="Optional context"
              />
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={quickTask.projectId}
                onValueChange={(value) => setQuickTask((current) => ({ ...current, projectId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.map((project) => (
                    <SelectItem key={project._id} value={project._id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmittingQuickTask || !quickTask.projectId || !quickTask.title.trim()}>
                {isSubmittingQuickTask ? 'Creating...' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
