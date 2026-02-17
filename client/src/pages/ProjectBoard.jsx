import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  Search,
  Users, Plus, Mail,
  LayoutGrid, List as ListIcon,
  Activity, CheckCircle2,
  Circle, ArrowLeft, Settings, FileText,
  Columns, Calendar as CalendarIcon, Zap, Archive, X, Clock, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ProjectSettingsDialog } from '@/components/ProjectSettingsDialog';
import { AdvancedFilters, applyFilters } from '@/components/Filters/AdvancedFilters';

import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { useSocket } from '../hooks/useSocket';
import { KanbanColumn } from '../components/KanbanColumn';
import { TaskDetailsModal } from '../components/TaskDetailsModal';
import { AutomationModal } from '../components/AutomationModal';
import { ArchivedTasksModal } from '../components/ArchivedTasksModal';
import { ProjectAnalytics } from '../components/ProjectAnalytics';
import { ProjectUpdates } from '../components/ProjectUpdates';
import { ProjectList } from '../components/ProjectList';
import { ProjectCalendar } from '../components/ProjectCalendar';

const COLUMNS = [
  { id: 'todo', label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' }
];

export default function ProjectBoard() {
  const { user } = useAuth();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket(projectId);

  // State
  const [tasks, setTasks] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAutoOpen, setIsAutoOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskStartDate, setNewTaskStartDate] = useState(null);
  const [newTaskDueDate, setNewTaskDueDate] = useState(null);
  const [newTaskDueTime, setNewTaskDueTime] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState(null);  // { id, name, email } or null
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  // Bulk selection
  const [selectedTasks, setSelectedTasks] = useState(new Set());

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleBulkUpdate = async (updates) => {
    try {
      const { data } = await api.put('/tasks/bulk', {
        taskIds: Array.from(selectedTasks),
        updates
      });
      setTasks(prev => {
        const updatedMap = new Map(data.map(t => [t._id, t]));
        return prev.map(t => updatedMap.get(t._id) || t);
      });
      setSelectedTasks(new Set());
    } catch { alert('Bulk update failed'); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTasks.size} task(s)?`)) return;
    const deletedIds = Array.from(selectedTasks);
    try {
      await api.delete('/tasks/bulk', { data: { taskIds: deletedIds } });
      setTasks(prev => prev.filter(t => !selectedTasks.has(t._id)));
      // Notify teammates
      if (socket) deletedIds.forEach(id => socket.emit('task_deleted', { _id: id, projectId }));
      setSelectedTasks(new Set());
    } catch { alert('Bulk delete failed'); }
  };

  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [taskPage, setTaskPage] = useState(0);
  const [hasMoreTasks, setHasMoreTasks] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [view, setView] = useState('board');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Advanced Filters State
  const [filters, setFilters] = useState({
    statuses: [],
    priorities: [],
    assignees: [],
    tags: [],
    dateFrom: null,
    dateTo: null
  });
  const [filterPresets, setFilterPresets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Effects
  useEffect(() => {
    api.get(`/projects/single/${projectId}`).then(({ data }) => setProjectDetails(data));
    api.get(`/tasks/project/${projectId}?page=0&limit=50`).then(({ data }) => {
      setTasks(data.tasks);
      setHasMoreTasks(data.pagination.hasMore);
      setTaskPage(0);
    });
  }, [projectId]);

  const loadMoreTasks = useCallback(async () => {
    if (isLoadingMore || !hasMoreTasks) return;
    setIsLoadingMore(true);
    try {
      const nextPage = taskPage + 1;
      const { data } = await api.get(`/tasks/project/${projectId}?page=${nextPage}&limit=50`);
      setTasks(prev => {
        const existingIds = new Set(prev.map(t => t._id));
        const newTasks = data.tasks.filter(t => !existingIds.has(t._id));
        return [...prev, ...newTasks];
      });
      setTaskPage(nextPage);
      setHasMoreTasks(data.pagination.hasMore);
    } catch (err) {
      console.error('Failed to load more tasks', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [projectId, taskPage, hasMoreTasks, isLoadingMore]);

  useEffect(() => {
    if (!socket) return;

    // Live status/field update from teammate
    socket.on('receive_task_update', (updatedTask) => {
      setTasks((prev) => prev.map((t) => t._id === updatedTask._id ? { ...t, ...updatedTask } : t));
    });

    // Live new task from teammate
    socket.on('receive_new_task', (newTask) => {
      setTasks((prev) => {
        if (prev.some(t => t._id === newTask._id)) return prev;
        return [newTask, ...prev];
      });
    });

    // Live task deletion from teammate
    socket.on('receive_task_deleted', (data) => {
      setTasks((prev) => prev.filter(t => t._id !== data._id));
    });

    return () => {
      socket.off('receive_task_update');
      socket.off('receive_new_task');
      socket.off('receive_task_deleted');
    };
  }, [socket]);

  useEffect(() => {
    if (projectDetails?.organization) {
      api.get(`/organizations/${projectDetails.organization}/members`)
        .then(({ data }) => setProjectMembers(data))
        .catch(err => console.error("Failed to load members", err));
    }
  }, [projectDetails]);

  // Fetch filter presets
  useEffect(() => {
    if (projectId) {
      api.get(`/filter-presets/project/${projectId}`)
        .then(({ data }) => setFilterPresets(data))
        .catch(err => console.error("Failed to load filter presets", err));
    }
  }, [projectId]);

  // Extract unique tags from all tasks
  const availableTags = useMemo(() => {
    const tagMap = new Map();
    tasks.forEach(task => {
      task.tags?.forEach(tag => {
        if (!tagMap.has(tag.name)) {
          tagMap.set(tag.name, tag);
        }
      });
    });
    return Array.from(tagMap.values());
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = applyFilters(tasks, filters);

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [tasks, filters, searchQuery]);

  // Handlers
  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeTask = tasks.find(t => t._id === active.id);
    const overId = over.id;
    let newStatus = overId;

    if (!COLUMNS.some(col => col.id === overId)) {
      const overTask = tasks.find(t => t._id === overId);
      newStatus = overTask ? overTask.status : activeTask.status;
    }

    if (activeTask && activeTask.status !== newStatus) {
      const previousStatus = activeTask.status;

      // Optimistic update
      setTasks((prev) => prev.map(t => t._id === activeTask._id ? { ...t, status: newStatus } : t));
      if (socket) socket.emit("task_moved", { _id: activeTask._id, status: newStatus, projectId });

      try {
        await api.put(`/tasks/${activeTask._id}`, { status: newStatus });
      } catch (error) {
        // Revert on failure
        setTasks((prev) => prev.map(t => t._id === activeTask._id ? { ...t, status: previousStatus } : t));
        alert(`Failed to move task: ${error.response?.data?.message || 'Network error'}`);
      }
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle) return;

    // Combine date and time if both provided
    let dueDate = newTaskDueDate;
    if (dueDate && newTaskDueTime) {
      const [hours, minutes] = newTaskDueTime.split(':').map(Number);
      dueDate = new Date(dueDate);
      dueDate.setHours(hours, minutes, 0, 0);
    }

    try {
      const payload = {
        title: newTaskTitle,
        description: newTaskDescription || undefined,
        projectId,
        orgId: projectDetails.organization,
        status: 'todo',
        priority: newTaskPriority,
        startDate: newTaskStartDate || undefined,
        dueDate: dueDate || undefined
      };

      // Add assignee info
      if (newTaskAssignee) {
        if (newTaskAssignee.id) {
          payload.assignee = newTaskAssignee.id;
        } else if (newTaskAssignee.email) {
          payload.assigneeEmail = newTaskAssignee.email;
        }
      }

      const { data } = await api.post('/tasks', payload);
      setTasks([data, ...tasks]);
      if (socket) socket.emit('task_created', { task: data, projectId });
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskStartDate(null);
      setNewTaskDueDate(null);
      setNewTaskDueTime('');
      setNewTaskPriority('medium');
      setNewTaskAssignee(null);
      setAssigneeSearch('');
      setIsCreateModalOpen(false);
    } catch (err) { alert('Error creating task'); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background font-[Poppins]">

      {/* 1. Board Header */}
      <div className="border-b border-border bg-card shrink-0">
        {/* Top row: Project name + create button */}
        <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-0 md:h-16">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <h1 className="font-bold text-lg md:text-xl text-foreground tracking-tight truncate">
              {projectDetails?.name || 'Loading...'}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {/* Avatars - hidden on mobile */}
            <div className="hidden md:flex -space-x-2 mr-2">
              {projectMembers.slice(0, 4).map((member) => (
                <Avatar key={member.user._id} className="w-8 h-8 border-2 border-background cursor-help" title={member.user.name}>
                  <AvatarImage src={member.user.avatar || `https://ui-avatars.com/api/?name=${member.user.name}&background=random`} />
                  <AvatarFallback className="bg-muted text-[10px] uppercase">
                    {member.user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {projectMembers.length > 4 && (
                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] text-muted-foreground font-bold">
                  +{projectMembers.length - 4}
                </div>
              )}
            </div>

            {/* Calendar - icon only on mobile */}
            <button
              onClick={() => setView('calendar')}
              className={`p-1.5 md:px-3 rounded-md flex items-center gap-2 text-sm transition-all ${view === 'calendar' ? 'bg-background shadow text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="hidden md:inline">Calendar</span>
            </button>

            {/* Forms Button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              title="Create Intake Form"
              onClick={() => navigate(`/project/${projectId}/forms/new`)}
            >
              <FileText className="w-5 h-5" />
            </Button>

            {/* Settings - Only Owner/Admin */}
            {['owner', 'admin'].includes(projectMembers.find(m => m.user._id === user?._id)?.role) && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="w-5 h-5" />
              </Button>
            )}

            <Separator orientation="vertical" className="h-6 hidden md:block" />

            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 h-7 px-2 shadow-sm">
              <Plus className="w-3 h-3 md:mr-2" />
              <span className="hidden md:inline">New Task</span>
            </Button>
          </div>
        </div>

        {/* Bottom row: View switcher + toggles - scrollable on mobile */}
        <div className="flex items-center gap-2 md:gap-3 px-4 md:px-8 pb-3 md:pb-0 md:py-2 overflow-x-auto scrollbar-hide">
          {/* Analytics / Updates Toggle */}
          <div className="flex bg-muted/50 p-1 rounded-lg shrink-0">
            <button onClick={() => setView('board')} className="hidden">Board</button>
            <button onClick={() => setView('analytics')} className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1 text-xs font-medium rounded-md transition whitespace-nowrap ${view === 'analytics' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Activity className="w-3.5 h-3.5" /> Analytics
            </button>
            <button onClick={() => setView('updates')} className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1 text-xs font-medium rounded-md transition whitespace-nowrap ${view === 'updates' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Updates
            </button>
          </div>

          {/* View Switcher (Board vs List) */}
          <div className="flex bg-muted/50 p-1 rounded-lg border border-border shrink-0">
            <button
              onClick={() => setView('board')}
              className={`p-1.5 px-2.5 md:px-3 rounded-md flex items-center gap-1.5 md:gap-2 text-sm transition-all whitespace-nowrap ${view === 'board' ? 'bg-background shadow text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="w-4 h-4" /> <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 px-2.5 md:px-3 rounded-md flex items-center gap-1.5 md:gap-2 text-sm transition-all whitespace-nowrap ${view === 'list' ? 'bg-background shadow text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <ListIcon className="w-4 h-4" /> <span className="hidden sm:inline">List</span>
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setIsAutoOpen(true)} className="shrink-0">
            <Zap className="w-4 h-4 mr-1.5 md:mr-2 text-yellow-500" />
            <span className="hidden sm:inline">Automations</span>
            <span className="sm:hidden">Auto</span>
          </Button>
        </div>
      </div>

      {/* 2. Filter Bar (Only show on Board/List views) */}
      {(view === 'board' || view === 'list') && (
        <div className="h-auto md:h-14 border-b border-border flex flex-col md:flex-row items-stretch md:items-center px-4 md:px-8 py-3 md:py-0 bg-card/50 backdrop-blur-sm shrink-0 gap-3 md:gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9 bg-transparent border-transparent hover:bg-muted/50 focus:bg-background focus:border-border transition-all rounded-lg text-sm"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="hidden md:block h-6 w-[1px] bg-border"></div>
          <div className="flex items-center gap-3 overflow-x-auto">
            <AdvancedFilters
              projectId={projectId}
              filters={filters}
              onFiltersChange={setFilters}
              members={projectMembers}
              availableTags={availableTags}
              presets={filterPresets}
              onPresetsChange={setFilterPresets}
            />
            <Button variant="ghost" size="sm" onClick={() => setIsArchiveOpen(true)} title="View Archive">
              <Archive className="w-4 h-4 text-muted-foreground" /> <span className="hidden sm:inline ml-1">Archived</span>
            </Button>
          </div>
        </div>
      )}

      {/* 3. Main Content Area - SWITCH LOGIC */}
      {view === 'board' ? (
        // VIEW: BOARD
        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-secondary/30 p-4 md:p-8 dark:bg-background">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 md:gap-6 h-full min-w-max">
              {COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={filteredTasks.filter(t => t.status === col.id)}
                  onTaskClick={(t) => { setSelectedTask(t); setIsDetailsOpen(true); }}
                  selectedTasks={selectedTasks}
                  onToggleSelect={toggleTaskSelection}
                  hasMore={hasMoreTasks}
                  onLoadMore={loadMoreTasks}
                  isLoadingMore={isLoadingMore}
                />
              ))}
            </div>

            <DragOverlay>
              {activeId ? (
                <div className="w-72 bg-card p-4 rounded-xl shadow-2xl border border-primary/30 rotate-3 cursor-grabbing opacity-90">
                  {tasks.find(t => t._id === activeId)?.title}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : view === 'list' ? (
        // VIEW: LIST
        <div className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
          <ProjectList
            tasks={filteredTasks}
            onTaskClick={(t) => { setSelectedTask(t); setIsDetailsOpen(true); }}
          />
        </div>
      ) : view === 'calendar' ? (
        // VIEW: CALENDAR
        <div className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
          <ProjectCalendar
            tasks={filteredTasks}
            onTaskClick={(t) => { setSelectedTask(t); setIsDetailsOpen(true); }}
          />
        </div>
      ) : (

        // VIEW: ANALYTICS / UPDATES
        <div className="flex-1 overflow-y-auto bg-secondary/10 p-4 md:p-6">
          <div className="max-w-5xl mx-auto mb-6">
            <Button
              variant="outline"
              onClick={() => setView('board')}
              className="gap-2 bg-card"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Board
            </Button>
          </div>
          {view === 'analytics' ? (
            <ProjectAnalytics projectId={projectId} />
          ) : (
            <ProjectUpdates projectId={projectId} />
          )}
        </div>
      )}

      {/* Modals */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card text-card-foreground p-4 md:p-6 rounded-2xl w-[calc(100%-2rem)] sm:w-[420px] shadow-2xl border border-border mx-4 sm:mx-0">
            <h3 className="font-bold text-lg mb-1">Add New Task</h3>
            <p className="text-muted-foreground text-sm mb-4">Create a card for your team.</p>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <Label htmlFor="task-title">Title</Label>
                <Input
                  id="task-title"
                  autoFocus
                  placeholder="What needs to be done?"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="task-desc">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  id="task-desc"
                  placeholder="Add details, context, or instructions..."
                  className="min-h-[60px] max-h-[120px] resize-none text-sm"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Start Date */}
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start text-left font-normal h-9 ${!newTaskStartDate ? 'text-muted-foreground' : ''}`}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTaskStartDate ? newTaskStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Start'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newTaskStartDate}
                        onSelect={(date) => {
                          setNewTaskStartDate(date);
                          // If end date is before start date, adjust it
                          if (date && newTaskDueDate && date > newTaskDueDate) {
                            setNewTaskDueDate(null);
                          }
                        }}
                        initialFocus
                      />
                      {newTaskStartDate && (
                        <div className="px-3 pb-3">
                          <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => setNewTaskStartDate(null)}>Clear start date</Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End Date */}
                <div>
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start text-left font-normal h-9 ${!newTaskDueDate ? 'text-muted-foreground' : ''}`}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTaskDueDate ? newTaskDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'End'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newTaskDueDate}
                        onSelect={setNewTaskDueDate}
                        disabled={(date) => newTaskStartDate && date < newTaskStartDate}
                        initialFocus
                      />
                      {newTaskDueDate && (
                        <div className="px-3 pb-3">
                          <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => setNewTaskDueDate(null)}>Clear end date</Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Date range summary */}
              {(newTaskStartDate || newTaskDueDate) && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>
                    {newTaskStartDate && newTaskDueDate
                      ? `${newTaskStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${newTaskDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                      : newTaskStartDate
                        ? `Starts ${newTaskStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : `Due ${newTaskDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    }
                    {newTaskDueTime && ` at ${newTaskDueTime}`}
                  </span>
                </div>
              )}

              {/* Due Time */}
              <div>
                <Label>Due Time</Label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    className="pl-9 h-9"
                    value={newTaskDueTime}
                    onChange={(e) => setNewTaskDueTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <Label>Priority</Label>
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div>
                <Label>Assignee</Label>
                {newTaskAssignee ? (
                  <div className="flex items-center gap-2 px-3 h-9 border border-border rounded-md bg-muted/30">
                    {newTaskAssignee.id ? (
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={newTaskAssignee.avatar} />
                        <AvatarFallback className="text-[10px]">{newTaskAssignee.name?.[0]}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm truncate flex-1">{newTaskAssignee.name || newTaskAssignee.email}</span>
                    <button type="button" onClick={() => setNewTaskAssignee(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      placeholder="Search members or type email..."
                      className="h-9"
                      value={assigneeSearch}
                      onChange={(e) => {
                        setAssigneeSearch(e.target.value);
                        setShowAssigneeDropdown(true);
                      }}
                      onFocus={() => setShowAssigneeDropdown(true)}
                      onBlur={() => setTimeout(() => setShowAssigneeDropdown(false), 200)}
                    />
                    {showAssigneeDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {projectMembers
                          .filter(m => {
                            const q = assigneeSearch.toLowerCase();
                            return !q || m.user?.name?.toLowerCase().includes(q) || m.user?.email?.toLowerCase().includes(q);
                          })
                          .map(m => (
                            <button
                              key={m.user?._id}
                              type="button"
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setNewTaskAssignee({ id: m.user?._id, name: m.user?.name, email: m.user?.email, avatar: m.user?.avatar });
                                setAssigneeSearch('');
                                setShowAssigneeDropdown(false);
                              }}
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={m.user?.avatar} />
                                <AvatarFallback className="text-[10px]">{m.user?.name?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-medium">{m.user?.name}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{m.user?.email}</p>
                              </div>
                            </button>
                          ))}
                        {assigneeSearch && assigneeSearch.includes('@') && !projectMembers.some(m => m.user?.email?.toLowerCase() === assigneeSearch.toLowerCase()) && (
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left border-t border-border"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setNewTaskAssignee({ id: null, email: assigneeSearch, name: null });
                              setAssigneeSearch('');
                              setShowAssigneeDropdown(false);
                            }}
                          >
                            <Mail className="h-4 w-4 text-indigo-500" />
                            <span>Invite & assign <strong>{assigneeSearch}</strong></span>
                          </button>
                        )}
                        {projectMembers.length === 0 && !assigneeSearch && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No members found</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                <Button type="submit">Create Task</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TaskDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        task={selectedTask}
        projectId={projectId}
        orgId={projectDetails?.organization}
        socket={socket}
      />

      <ProjectSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        project={projectDetails}
        onUpdate={(updated) => setProjectDetails(updated)}
      />

      <AutomationModal
        isOpen={isAutoOpen}
        onClose={() => setIsAutoOpen(false)}
        projectId={projectId}
      />

      <ArchivedTasksModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        projectId={projectId}
        onRestore={() => {
          // Refresh the main board to show the restored task
          api.get(`/tasks/project/${projectId}?page=0&limit=50`).then(res => {
            setTasks(res.data.tasks);
            setHasMoreTasks(res.data.pagination.hasMore);
            setTaskPage(0);
          });
        }}
      />

      {/* Floating Bulk Action Bar */}
      {selectedTasks.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl shadow-2xl px-4 py-2.5">
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">
              {selectedTasks.size} selected
            </span>
            <Separator orientation="vertical" className="h-6" />

            {/* Status */}
            <Select onValueChange={(val) => handleBulkUpdate({ status: val })}>
              <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority */}
            <Select onValueChange={(val) => handleBulkUpdate({ priority: val })}>
              <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            {/* Delete */}
            <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={handleBulkDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete
            </Button>

            {/* Clear */}
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => setSelectedTasks(new Set())}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}