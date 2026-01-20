import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  Search,
  Users, Plus,
  LayoutGrid, List as ListIcon,
  Activity, CheckCircle2,
  Circle, ArrowLeft, Settings, FileText,
  Columns, Calendar as CalendarIcon, Zap, Archive, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ProjectSettingsDialog } from '@/components/ProjectSettingsDialog';
import { AdvancedFilters, applyFilters } from '@/components/Filters/AdvancedFilters';

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
  const [newTaskDueDate, setNewTaskDueDate] = useState(null);
  const [newTaskDueTime, setNewTaskDueTime] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
    api.get(`/tasks/project/${projectId}`).then(({ data }) => setTasks(data));
  }, [projectId]);

  useEffect(() => {
    if (!socket) return;
    socket.on('receive_task_update', (updatedTask) => {
      setTasks((prev) => prev.map((t) => t._id === updatedTask._id ? { ...t, status: updatedTask.status } : t));
    });
    return () => socket.off('receive_task_update');
  }, [socket, tasks]);

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
    if (!over) return;

    const activeTask = tasks.find(t => t._id === active.id);
    const overId = over.id;
    let newStatus = overId;

    if (!COLUMNS.some(col => col.id === overId)) {
      const overTask = tasks.find(t => t._id === overId);
      newStatus = overTask ? overTask.status : activeTask.status;
    }

    if (activeTask && activeTask.status !== newStatus) {
      setTasks((prev) => prev.map(t => t._id === activeTask._id ? { ...t, status: newStatus } : t));
      if (socket) socket.emit("task_moved", { _id: activeTask._id, status: newStatus, projectId });
      try { await api.put(`/tasks/${activeTask._id}`, { status: newStatus }); }
      catch (error) { console.error("Failed to move task"); }
    }
    setActiveId(null);
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
      const { data } = await api.post('/tasks', {
        title: newTaskTitle,
        projectId,
        orgId: projectDetails.organization,
        status: 'todo',
        priority: newTaskPriority,
        dueDate
      });
      setTasks([data, ...tasks]);
      setNewTaskTitle('');
      setNewTaskDueDate(null);
      setNewTaskDueTime('');
      setNewTaskPriority('medium');
      setIsCreateModalOpen(false);
    } catch (err) { alert('Error creating task'); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background font-[Poppins]">

      {/* 1. Board Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-8 bg-card shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="font-bold text-xl text-foreground tracking-tight">
            {projectDetails?.name || 'Loading...'}
          </h1>
          <div className="h-6 w-[1px] bg-border"></div>

          {/* Analytics / Updates Toggle */}
          <div className="flex bg-muted/50 p-1 rounded-lg">
            <button onClick={() => setView('board')} className="hidden">Board</button> {/* Hidden accessible fallback */}
            <button onClick={() => setView('analytics')} className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-md transition ${view === 'analytics' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Activity className="w-3.5 h-3.5" /> Analytics
            </button>
            <button onClick={() => setView('updates')} className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-md transition ${view === 'updates' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Updates
            </button>
          </div>

          {/* View Switcher (Board vs List) */}
          <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
            <button
              onClick={() => setView('board')}
              className={`p-1.5 px-3 rounded-md flex items-center gap-2 text-sm transition-all ${view === 'board' ? 'bg-background shadow text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Board
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 px-3 rounded-md flex items-center gap-2 text-sm transition-all ${view === 'list' ? 'bg-background shadow text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <ListIcon className="w-4 h-4" /> List
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsAutoOpen(true)}>
            <Zap className="w-4 h-4 mr-2 text-yellow-500" /> Automations
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Avatars */}
          <div className="flex -space-x-2 mr-2">
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

          <button
            onClick={() => setView('calendar')}
            className={`p-1.5 px-3 rounded-md flex items-center gap-2 text-sm transition-all ${view === 'calendar' ? 'bg-background shadow text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <CalendarIcon className="w-4 h-4" /> Calendar
          </button>

          {/* NEW: Forms Button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            title="Create Intake Form"
            onClick={() => navigate(`/project/${projectId}/forms/new`)}
          >
            <FileText className="w-5 h-5" />
          </Button>

          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="w-5 h-5" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 h-7 px-2 shadow-sm">
            <Plus className="w-3 h-3 mr-2" /> New Task
          </Button>
        </div>
      </div>

      {/* 2. Filter Bar (Only show on Board/List views) */}
      {(view === 'board' || view === 'list') && (
        <div className="h-14 border-b border-border flex items-center px-8 bg-card/50 backdrop-blur-sm shrink-0 gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9 bg-transparent border-transparent hover:bg-muted/50 focus:bg-background focus:border-border transition-all rounded-lg text-sm"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="h-6 w-[1px] bg-border"></div>
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
            <Archive className="w-4 h-4 text-muted-foreground" /> Archived
          </Button>
        </div>
      )}

      {/* 3. Main Content Area - SWITCH LOGIC */}
      {view === 'board' ? (
        // VIEW: BOARD
        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-secondary/30 p-8 dark:bg-background">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-6 h-full min-w-max">
              {COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={filteredTasks.filter(t => t.status === col.id)}
                  onTaskClick={(t) => { setSelectedTask(t); setIsDetailsOpen(true); }}
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
        <div className="flex-1 overflow-y-auto bg-background p-8">
          <ProjectList
            tasks={filteredTasks}
            onTaskClick={(t) => { setSelectedTask(t); setIsDetailsOpen(true); }}
          />
        </div>
      ) : view === 'calendar' ? (
        // VIEW: CALENDAR
        <div className="flex-1 overflow-y-auto bg-background p-8">
          <ProjectCalendar
            tasks={filteredTasks}
            onTaskClick={(t) => { setSelectedTask(t); setIsDetailsOpen(true); }}
          />
        </div>
      ) : (

        // VIEW: ANALYTICS / UPDATES
        <div className="flex-1 overflow-y-auto bg-secondary/10 p-6">
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
          <div className="bg-card text-card-foreground p-6 rounded-2xl w-[420px] shadow-2xl border border-border">
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

              <div className="grid grid-cols-2 gap-3">
                {/* Due Date */}
                <div>
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTaskDueDate ? newTaskDueDate.toLocaleDateString() : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={newTaskDueDate} onSelect={setNewTaskDueDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

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
          api.get(`/tasks/project/${projectId}`).then(res => setTasks(res.data));
        }}
      />
    </div>
  );
}