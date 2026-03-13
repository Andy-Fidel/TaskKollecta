import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, MoreHorizontal, Calendar as CalendarIcon,
  Settings, Star, Lock, LayoutGrid, List as ListIcon,
  CheckCircle2, Circle, Pause, Archive, Pin, Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

// Project Wizard & Settings
import CreateProjectWizard from '@/components/CreateProjectWizard';
import { ProjectSettingsDialog } from '@/components/ProjectSettingsDialog';

import api from '../api/axios';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

// Pinned projects storage key
const PINNED_KEY = 'taskkollecta_pinned_projects';
const getPinned = () => {
  try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]'); }
  catch { return []; }
};

// Status filter tabs
const FILTER_TABS = [
  { id: 'all',        label: 'All',         icon: CheckCircle2 },
  { id: 'pinned',     label: 'Pinned',      icon: Pin },
  { id: 'active',     label: 'In Progress', icon: Circle },
  { id: 'completed',  label: 'Completed',   icon: CheckCircle2 },
  { id: 'paused',     label: 'Paused',      icon: Pause },
  { id: 'archived',   label: 'Archived',    icon: Archive },
];

// Priority color map
const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
};

// Status badge colors
const STATUS_COLORS = {
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  paused: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  archived: 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400',
};

const STATUS_LABELS = {
  active: 'In-progress',
  completed: 'Completed',
  paused: 'Paused',
  archived: 'Archived',
};

export default function Workspace() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState(getPinned);

  // Fetch Data
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, orgRes] = await Promise.all([
        api.get('/projects'),
        api.get('/organizations')
      ]);
      setProjects(projRes.data);

      let activeOrgId = localStorage.getItem('activeOrgId');
      const userBelongsToStoredOrg = orgRes.data.find(o => o._id === activeOrgId);

      if (!activeOrgId || !userBelongsToStoredOrg) {
        if (orgRes.data.length > 0) {
          activeOrgId = orgRes.data[0]._id;
          localStorage.setItem('activeOrgId', activeOrgId);
        } else {
          activeOrgId = null;
          localStorage.removeItem('activeOrgId');
          setMembers([]);
          return;
        }
      }

      if (activeOrgId) {
        const memRes = await api.get(`/organizations/${activeOrgId}/members`);
        setMembers(memRes.data);
      }
    } catch (error) {
      console.error("Failed to load workspace", error);
      if (error.response?.status === 403) localStorage.removeItem('activeOrgId');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = () => fetchData();

  const handleProjectUpdated = (updatedProject) => {
    setProjects(prev => prev.map(p => p._id === updatedProject._id ? { ...p, ...updatedProject } : p));
  };

  const openSettings = (e, project) => {
    e.stopPropagation();
    setSelectedProject(project);
    setIsSettingsOpen(true);
  };

  const togglePin = (e, projectId) => {
    e.stopPropagation();
    setPinnedIds(prev => {
      const next = prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId];
      localStorage.setItem(PINNED_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleStatusChange = async (e, projectId, newStatus) => {
    e.stopPropagation();
    try {
      await api.put(`/projects/${projectId}`, { status: newStatus });
      setProjects(prev => prev.map(p => p._id === projectId ? { ...p, status: newStatus } : p));
      toast.success(`Project ${STATUS_LABELS[newStatus] || newStatus}`);
    } catch { toast.error('Failed to update status'); }
  };

  // Counts for filter tabs
  const tabCounts = useMemo(() => {
    const counts = { all: 0, pinned: pinnedIds.length, active: 0, completed: 0, paused: 0, archived: 0 };
    projects.forEach(p => {
      if (!p.isTemplate) {
        counts.all++;
        if (counts[p.status] !== undefined) counts[p.status]++;
      }
    });
    return counts;
  }, [projects, pinnedIds]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    let result = projects.filter(p => !p.isTemplate);

    // Tab filter
    if (activeTab === 'pinned') {
      result = result.filter(p => pinnedIds.includes(p._id));
    } else if (activeTab !== 'all') {
      result = result.filter(p => p.status === activeTab);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }

    // Sort: pinned first, then by updatedAt
    result.sort((a, b) => {
      const aPinned = pinnedIds.includes(a._id) ? 1 : 0;
      const bPinned = pinnedIds.includes(b._id) ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    return result;
  }, [projects, activeTab, searchQuery, pinnedIds]);

  // Progress bar color
  const progressColor = (pct) => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 50) return 'bg-blue-500';
    if (pct >= 20) return 'bg-amber-500';
    return 'bg-slate-400';
  };

  // --- LOADING SKELETON ---
  if (loading) {
    return (
      <div className="space-y-6 py-8 px-2 md:px-0">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="flex gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 w-24 rounded-full" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex justify-between"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-6 w-6 rounded" /></div>
              <Skeleton className="h-3 w-full rounded-full" />
              <div className="flex justify-between"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-24" /></div>
              <div className="flex gap-1">{[...Array(3)].map((_, j) => <Skeleton key={j} className="h-7 w-7 rounded-full" />)}</div>
              <div className="flex gap-2">{[...Array(3)].map((_, j) => <Skeleton key={j} className="h-5 w-16 rounded-full" />)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- RENDER ---
  return (
    <div className="space-y-6 py-8 px-2 md:px-0">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects</h1>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-muted/50 p-1 rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`relative p-1.5 px-2.5 rounded-md flex items-center gap-1.5 text-sm transition-all ${viewMode === 'list' ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {viewMode === 'list' && (
                <motion.div layoutId="ws-view-bg" className="absolute inset-0 bg-background shadow rounded-md" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />
              )}
              <span className="relative z-10 flex items-center gap-1.5"><ListIcon className="w-4 h-4" /> List</span>
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`relative p-1.5 px-2.5 rounded-md flex items-center gap-1.5 text-sm transition-all ${viewMode === 'card' ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {viewMode === 'card' && (
                <motion.div layoutId="ws-view-bg" className="absolute inset-0 bg-background shadow rounded-md" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />
              )}
              <span className="relative z-10 flex items-center gap-1.5"><LayoutGrid className="w-4 h-4" /> Card</span>
            </button>
          </div>

          <Button onClick={() => setIsModalOpen(true)} className="bg-primary text-primary-foreground shadow-sm h-9">
            <Plus className="w-4 h-4 mr-2" /> Create new project
          </Button>
        </div>
      </div>

      {/* ── FILTER TABS + SEARCH ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map(tab => {
            const count = tabCounts[tab.id] || 0;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all ${
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="ws-tab-bg"
                    className="absolute inset-0 bg-muted rounded-md"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="h-9 pl-9 pr-3 w-full md:w-56 bg-background border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground"
              placeholder="Search projects"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="shrink-0 h-9">
            <Filter className="w-4 h-4 mr-1.5" /> Filter
          </Button>
        </div>
      </div>

      {/* ── PROJECT CARDS GRID ── */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-20">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Archive className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground">No projects found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery ? 'Try a different search term.' : 'Create your first project to get started.'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsModalOpen(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" /> Create Project
            </Button>
          )}
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project, idx) => {
            const pct = Math.round(project.progress || 0);
            const isPinned = pinnedIds.includes(project._id);
            const isPrivate = project.privacy === 'private';

            return (
              <motion.div
                key={project._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => navigate(`/project/${project._id}`)}
                className="group rounded-xl border border-border bg-card hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer p-5 flex flex-col gap-4"
              >
                {/* Row 1: Name + Icons */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
                      style={{ backgroundColor: project.color || '#3b82f6' }}
                    >
                      {project.name.charAt(0)}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground leading-snug truncate pt-1">{project.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isPrivate && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                    <button
                      onClick={(e) => togglePin(e, project._id)}
                      className={`p-1 rounded transition-colors ${isPinned ? 'text-amber-500' : 'text-transparent group-hover:text-muted-foreground hover:text-amber-500'}`}
                    >
                      <Star className={`w-4 h-4 ${isPinned ? 'fill-amber-400' : ''}`} />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <button className="p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-all">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40" onClick={e => e.stopPropagation()}>
                        <DropdownMenuItem onClick={(e) => openSettings(e, project)}>
                          <Settings className="w-3.5 h-3.5 mr-2" /> Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {project.status !== 'paused' && (
                          <DropdownMenuItem onClick={(e) => handleStatusChange(e, project._id, 'paused')}>
                            <Pause className="w-3.5 h-3.5 mr-2" /> Pause
                          </DropdownMenuItem>
                        )}
                        {project.status !== 'completed' && (
                          <DropdownMenuItem onClick={(e) => handleStatusChange(e, project._id, 'completed')}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Complete
                          </DropdownMenuItem>
                        )}
                        {project.status !== 'active' && (
                          <DropdownMenuItem onClick={(e) => handleStatusChange(e, project._id, 'active')}>
                            <Circle className="w-3.5 h-3.5 mr-2" /> Set Active
                          </DropdownMenuItem>
                        )}
                        {project.status !== 'archived' && (
                          <DropdownMenuItem onClick={(e) => handleStatusChange(e, project._id, 'archived')} className="text-destructive">
                            <Archive className="w-3.5 h-3.5 mr-2" /> Archive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Row 2: Task Count + Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
                      {project.completedTasks || 0}/{project.totalTasks || 0}
                    </span>
                    <span className="text-muted-foreground font-medium">({pct}% completed)</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${progressColor(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Row 3: Assigned to + Deadline */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Assigned to:</span>
                    <div className="flex items-center gap-1">
                      {project.team && project.team.length > 0 ? (
                        <div className="flex -space-x-1.5">
                          {project.team.slice(0, 3).map(member => (
                            <TooltipProvider key={member._id} delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Avatar className="w-6 h-6 border-2 border-card">
                                    <AvatarImage src={member.avatar} />
                                    <AvatarFallback className="text-[8px] bg-muted">{member.name?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">{member.name}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                          {project.team.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                              +{project.team.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">—</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Deadline</span>
                    {project.dueDate ? (
                      <div className="flex items-center gap-1 text-xs text-foreground font-medium">
                        <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                        {format(new Date(project.dueDate), 'MMM d, yyyy')}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">No deadline</span>
                    )}
                  </div>
                </div>

                {/* Row 4: Tags / Badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Status badge */}
                  <Badge className={`text-[10px] h-5 px-2 rounded-full font-medium border-0 ${STATUS_COLORS[project.status] || STATUS_COLORS.active}`}>
                    {STATUS_LABELS[project.status] || 'Active'}
                  </Badge>

                  {/* Project tags */}
                  {project.tags?.slice(0, 2).map((tag, i) => (
                    <Badge key={i} className="text-[10px] h-5 px-2 rounded-full font-medium border-0" style={{
                      backgroundColor: tag.color ? `${tag.color}20` : undefined,
                      color: tag.color || undefined
                    }}>
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            );
          })}

          {/* Create New Card */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex flex-col items-center justify-center min-h-[240px] rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/10 transition-all gap-3 text-muted-foreground hover:text-primary"
          >
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <span className="font-semibold text-sm">Create New Project</span>
          </button>
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          {/* List Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
            <div className="col-span-4">Project</div>
            <div className="col-span-2">Progress</div>
            <div className="col-span-2">Team</div>
            <div className="col-span-2">Deadline</div>
            <div className="col-span-2">Status</div>
          </div>

          {filteredProjects.map((project) => {
            const pct = Math.round(project.progress || 0);
            const isPinned = pinnedIds.includes(project._id);
            const isPrivate = project.privacy === 'private';

            return (
              <div
                key={project._id}
                onClick={() => navigate(`/project/${project._id}`)}
                className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors group"
              >
                {/* Project Name */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div
                    className="h-7 w-7 shrink-0 rounded-md flex items-center justify-center text-white font-bold text-xs shadow-sm"
                    style={{ backgroundColor: project.color || '#3b82f6' }}
                  >
                    {project.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">{project.name}</span>
                  {isPrivate && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                  {isPinned && <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
                </div>

                {/* Progress */}
                <div className="col-span-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-secondary/60 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${progressColor(pct)}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium w-8 text-right">{pct}%</span>
                </div>

                {/* Team */}
                <div className="col-span-2">
                  <div className="flex -space-x-1.5">
                    {project.team?.slice(0, 3).map(m => (
                      <Avatar key={m._id} className="w-6 h-6 border-2 border-card">
                        <AvatarImage src={m.avatar} />
                        <AvatarFallback className="text-[8px] bg-muted">{m.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ))}
                    {project.team?.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                        +{project.team.length - 3}
                      </div>
                    )}
                  </div>
                </div>

                {/* Deadline */}
                <div className="col-span-2 text-xs text-muted-foreground">
                  {project.dueDate ? format(new Date(project.dueDate), 'MMM d, yyyy') : '—'}
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <Badge className={`text-[10px] h-5 px-2 rounded-full font-medium border-0 ${STATUS_COLORS[project.status] || STATUS_COLORS.active}`}>
                    {STATUS_LABELS[project.status] || 'Active'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE PROJECT WIZARD */}
      <CreateProjectWizard
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        members={members}
        templates={projects.filter(p => p.isTemplate)}
        onProjectCreated={handleProjectCreated}
      />

      {/* PROJECT SETTINGS DIALOG */}
      <ProjectSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        project={selectedProject}
        onUpdate={handleProjectUpdated}
        members={members}
      />
    </div>
  );
}