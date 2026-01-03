import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { 
  Search, Filter, Users, Plus, LayoutGrid, List, Activity, CheckCircle2, Circle, ArrowLeft, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ProjectSettingsDialog } from '@/components/ProjectSettingsDialog';

import api from '../api/axios';
import { useSocket } from '../hooks/useSocket';
import { KanbanColumn } from '../components/KanbanColumn';
import { TaskDetailsModal } from '../components/TaskDetailsModal';
import { ProjectAnalytics } from '../components/ProjectAnalytics';
import { ProjectUpdates } from '../components/ProjectUpdates';

const COLUMNS = [
  { id: 'todo', label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' }
];

export default function ProjectBoard() {
  const { projectId } = useParams();
  const socket = useSocket(projectId);
  
  // State
  const [tasks, setTasks] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  const [selectedTask, setSelectedTask] = useState(null); 
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const [view, setView] = useState('board');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Effects
  useEffect(() => {
    // Fetch Project Name & Details
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
    try {
      const { data } = await api.post('/tasks', {
        title: newTaskTitle,
        projectId,
        orgId: projectDetails.organization,
        status: 'todo'
      });
      setTasks([data, ...tasks]);
      setNewTaskTitle('');
      setIsCreateModalOpen(false);
    } catch (err) { alert('Error creating task'); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      
      {/* 1. Board Header */}
      <div className="h-16 border-b border-gray-100 flex items-center justify-between px-8 bg-white shrink-0">
        <div className="flex items-center gap-6">
            <h1 className="font-bold text-xl text-slate-800 tracking-tight">
                {projectDetails?.name || 'Loading...'}
            </h1>
            <div className="h-6 w-[1px] bg-slate-200"></div>
            
            {/* View Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setView('board')} className="...">Board</button>
                <button onClick={() => setView('analytics')} className="...">Analytics</button>
                <button onClick={() => setView('updates')} className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-md transition ${view === 'updates' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Activity className="w-3.5 h-3.5" /> Updates
                </button>
            </div>
        </div>

        <div className="flex items-center gap-3">
            {/* Avatars */}
            <div className="flex -space-x-2 mr-2">
                {[1,2,3].map(i => (
                    <Avatar key={i} className="w-8 h-8 border-2 border-white"><AvatarFallback className="bg-slate-100 text-[10px]">U{i}</AvatarFallback></Avatar>
                ))}
                <div className="w-8 h-8 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[10px] text-slate-400 font-bold">+2</div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-slate-400 hover:text-slate-700"
              onClick={() => setIsSettingsOpen(true)}
          >
              <Settings className="w-5 h-5" />
          </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-slate-900 text-white hover:bg-slate-800 h-9 px-4 shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> New Task
            </Button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="h-14 border-b border-gray-50 flex items-center px-8 bg-white/50 backdrop-blur-sm shrink-0 gap-4">
        <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="pl-9 h-9 bg-transparent border-transparent hover:bg-slate-50 focus:bg-white focus:border-slate-200 transition-all rounded-lg text-sm" placeholder="Filter tasks..." />
        </div>
        <div className="h-6 w-[1px] bg-slate-200"></div>
        <Button variant="ghost" size="sm" className="text-slate-500 h-8 gap-2">
            <Filter className="w-3.5 h-3.5" /> Filter
        </Button>
        <Button variant="ghost" size="sm" className="text-slate-500 h-8 gap-2">
            <Users className="w-3.5 h-3.5" /> Assignee
        </Button>
      </div>

      {/* 3. Main Board Area */}
      {view === 'board' ? (
        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-50/50 p-8">
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
                            tasks={tasks.filter(t => t.status === col.id)}
                            onTaskClick={(t) => { setSelectedTask(t); setIsDetailsOpen(true); }}
                        />
                    ))}
                </div>
                
                <DragOverlay>
                    {activeId ? (
                        <div className="w-72 bg-white p-4 rounded-xl shadow-2xl border border-blue-500/30 rotate-3 cursor-grabbing opacity-90">
                           {tasks.find(t => t._id === activeId)?.title}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
      ) : ( 
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
            {/* NAVIGATION FIX: Back Button Container */}
            <div className="max-w-5xl mx-auto mb-6">
                <Button 
                    variant="outline" 
                    onClick={() => setView('board')} 
                    className="gap-2 bg-white"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Board
                </Button>
            </div>
             {view ==='analytics'? ( 
                <ProjectAnalytics projectId={projectId} /> 
            ) : (
                <ProjectUpdates projectId={projectId} /> 
            )}
        </div>
      )}

      {/* Modals */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-96 shadow-2xl border border-white/20 transform transition-all scale-100">
            <h3 className="font-bold text-lg mb-1">Add New Task</h3>
            <p className="text-slate-500 text-sm mb-4">Create a card for your team.</p>
            <form onSubmit={handleCreateTask}>
              <Input 
                autoFocus
                className="mb-4"
                placeholder="What needs to be done?"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-slate-900">Create Task</Button>
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
    </div>
  );
}