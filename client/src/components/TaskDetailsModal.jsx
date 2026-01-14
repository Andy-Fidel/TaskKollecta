import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  Calendar as CalendarIcon, User as UserIcon, Check, ChevronsUpDown, 
  History, MoreHorizontal, Trash2, Paperclip, FileText, 
  Image as ImageIcon, Link2, Link2Off, AlertCircle, X, Plus, 
  AlignLeft, Layout, Tag, Clock, CheckCircle2
} from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

import { formatActivityAction } from '../utils/formatActivity';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { PriorityBadge } from './PriorityBadge';

export function TaskDetailsModal({ task, isOpen, onClose, projectId, socket }) {
  const { user } = useAuth();
  
  // --- Data State ---
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]); 
  const [teamMembers, setTeamMembers] = useState([]);
  const [subtasks, setSubtasks] = useState(task?.subtasks || []);
  const [dependencies, setDependencies] = useState(task?.dependencies || []);
  
  // --- UI/Form State ---
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [assignee, setAssignee] = useState(task?.assignee);
  const [dueDate, setDueDate] = useState(task?.dueDate ? new Date(task.dueDate) : null);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Menus
  const [openUserSelect, setOpenUserSelect] = useState(false);
  const [isDependencySearchOpen, setIsDependencySearchOpen] = useState(false);
  const [projectTasks, setProjectTasks] = useState([]);
  
  // Optimistic UI
  const [currentStatus, setCurrentStatus] = useState(task?.status || 'todo');
  const [currentPriority, setCurrentPriority] = useState(task?.priority || 'medium');

  // Confirmation
  const [pendingAssignee, setPendingAssignee] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // --- 1. Initialization ---
  useEffect(() => {
    if (isOpen && task) {
      // Load Data
      api.get(`/comments/${task._id}`).then(({ data }) => setComments(data));
      api.get(`/activities/task/${task._id}`).then(({ data }) => setActivities(data));
      if (task.organization) {
         api.get(`/organizations/${task.organization}/members`).then(({ data }) => setTeamMembers(data));
      }
      
      // Fetch fresh details (for populated dependencies/subtasks)
      api.get(`/tasks/single/${task._id}`).then(({data}) => {
          setSubtasks(data.subtasks || []);
          setDependencies(data.dependencies || []);
      });

      // Sync Local State
      setAssignee(task.assignee);
      setDueDate(task.dueDate ? new Date(task.dueDate) : null);
      setCurrentStatus(task.status);
      setCurrentPriority(task.priority);
      setDescInput(task.description || '');
    }
  }, [isOpen, task]);

  // Load Tasks for Dependency Search
  useEffect(() => {
    if (isDependencySearchOpen && projectTasks.length === 0 && task) {
        api.get(`/tasks/project/${projectId}`).then(({ data }) => {
            setProjectTasks(data.filter(t => t._id !== task._id)); 
        });
    }
  }, [isDependencySearchOpen, projectId, task]);

  // --- 2. Real-time Listeners ---
  useEffect(() => {
    if (!socket || !task) return;

    const handleNewComment = (comment) => {
      if (comment.task === task._id) setComments((prev) => [...prev, comment]);
    };
    const handleNewActivity = (activity) => {
        if (activity.task === task._id) setActivities((prev) => [activity, ...prev]); 
    };

    socket.on('receive_new_comment', handleNewComment);
    socket.on('new_activity', handleNewActivity);

    return () => {
        socket.off('receive_new_comment', handleNewComment);
        socket.off('new_activity', handleNewActivity);
    };
  }, [socket, task]);


  // --- HANDLERS ---

  // Description
  const handleSaveDescription = async () => {
      try {
          await api.put(`/tasks/${task._id}`, { description: descInput });
          setIsEditingDesc(false);
          toast.success("Description updated");
      } catch (e) { toast.error("Failed to update description"); }
  };

  // Assignment
  const initiateAssignment = (memberUser) => {
    setPendingAssignee(memberUser);
    setOpenUserSelect(false);
    setIsConfirmOpen(true);
  };

  const confirmAssignment = async () => {
    if (!pendingAssignee) return;
    try {
        await api.put(`/tasks/${task._id}`, { assignee: pendingAssignee._id });
        setAssignee(pendingAssignee);
        setIsConfirmOpen(false);
        toast.success(`Assigned to ${pendingAssignee.name}`);
    } catch (error) { toast.error("Assignment failed"); }
  };

  // Status & Priority
  const handleStatusChange = async (newStatus) => {
    setCurrentStatus(newStatus);
    try {
        await api.put(`/tasks/${task._id}`, { status: newStatus });
        if (socket) socket.emit("task_moved", { _id: task._id, status: newStatus, projectId });
        toast.success(`Status: ${newStatus.replace('-', ' ')}`);
    } catch (error) { toast.error("Failed update status"); }
  };

  const handlePriorityChange = async (newPriority) => {
    setCurrentPriority(newPriority);
    try {
        await api.put(`/tasks/${task._id}`, { priority: newPriority });
        toast.success(`Priority: ${newPriority}`);
    } catch (error) { toast.error("Failed update priority"); }
  };

  // Subtasks
  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    try {
        const { data } = await api.post(`/tasks/${task._id}/subtasks`, { title: newSubtask });
        setSubtasks(data.subtasks);
        setNewSubtask('');
    } catch (e) { toast.error("Failed to add subtask"); }
  };

  const handleToggleSubtask = async (id) => {
    setSubtasks(prev => prev.map(s => s._id === id ? { ...s, isCompleted: !s.isCompleted } : s));
    try { await api.put(`/tasks/${task._id}/subtasks/${id}`); } catch (e) { toast.error("Sync error"); }
  };

  const handleDeleteSubtask = async (id) => {
    setSubtasks(prev => prev.filter(s => s._id !== id));
    try { await api.delete(`/tasks/${task._id}/subtasks/${id}`); } catch (e) { toast.error("Delete error"); }
  };

  // Dependencies
  const handleAddDependency = async (dependencyId) => {
    try {
        const { data } = await api.post(`/tasks/${task._id}/dependencies`, { dependencyId });
        setDependencies(data.dependencies);
        setIsDependencySearchOpen(false);
        toast.success("Dependency linked");
    } catch (e) { toast.error("Failed to link task"); }
  };

  const handleRemoveDependency = async (depId) => {
    try {
        const { data } = await api.delete(`/tasks/${task._id}/dependencies/${depId}`);
        setDependencies(data.dependencies);
        toast.success("Dependency removed");
    } catch (e) { toast.error("Failed to unlink task"); }
  };

  // Comments
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const { data } = await api.post('/comments', { content: newComment, taskId: task._id });
      setComments([...comments, data]);
      setNewComment('');
      socket.emit('new_comment', { projectId, comment: data });
    } catch (error) { toast.error("Message failed"); }
  };

  // Files
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
        const uploadRes = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        const { url, filename, type } = uploadRes.data;
        await api.post(`/tasks/${task._id}/attachments`, { url, filename, type });
        toast.success("File attached");
        // Trigger parent refresh or simple reload if critical
    } catch (error) { toast.error("Upload failed"); } 
    finally { setIsUploading(false); }
  };

  // Delete Task
  const handleDeleteTask = async () => {
    if (!window.confirm("Delete this task permanently?")) return;
    try {
        await api.delete(`/tasks/${task._id}`);
        toast.success("Task deleted");
        onClose();
        window.location.reload();
    } catch (error) { toast.error("Failed to delete"); }
  };

  // Timeline Merge
  const timeline = [
    ...comments.map(c => ({ ...c, type: 'comment' })),
    ...activities.map(a => ({ ...a, type: 'activity' }))
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (!task) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        
        {/* --- 1. HEADER --- */}
        <div className="bg-card border-b border-border p-4 px-6 flex justify-between items-center shrink-0 h-16">
             <div className="flex items-center gap-3 text-muted-foreground">
                <Badge variant="outline" className="rounded-md font-mono text-xs">{task.project?.name || 'Project'}</Badge>
                <span className="text-sm">/</span>
                <span className="text-sm font-medium font-mono">TASK-{task._id.slice(-4)}</span>
             </div>
             
             <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => toast.info("Share link copied!")}><Link2 className="w-4 h-4 text-muted-foreground" /></Button>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleDeleteTask} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                
                <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></Button>
             </div>
        </div>

        {/* --- 2. MAIN BODY (Split View) --- */}
        <div className="flex flex-1 overflow-hidden">
            
            {/* --- LEFT: CONTENT (Document Style) --- */}
            <ScrollArea className="flex-1 bg-background p-8">
                <div className="max-w-3xl mx-auto space-y-8 pb-20">
                    
                    {/* Title */}
                    <div>
                        <DialogTitle className="text-3xl font-bold text-foreground leading-tight">{task.title}</DialogTitle>
                    </div>

                    {/* Description (Click to Edit) */}
                    <div className="group">
                        <div className="flex items-center gap-2 mb-2">
                            <AlignLeft className="w-4 h-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold text-foreground">Description</h3>
                        </div>
                        
                        {isEditingDesc ? (
                            <div className="space-y-3">
                                <Textarea 
                                    value={descInput} 
                                    onChange={e => setDescInput(e.target.value)} 
                                    className="min-h-[150px] bg-card text-foreground border-border resize-none focus-visible:ring-1"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleSaveDescription} className="bg-primary text-primary-foreground">Save</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditingDesc(false)}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <div 
                                onClick={() => setIsEditingDesc(true)}
                                className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground p-4 rounded-xl border border-transparent hover:border-border hover:bg-muted/30 cursor-text transition-all min-h-[100px]"
                            >
                                <p className="whitespace-pre-wrap leading-relaxed">{descInput || "Click to add a description..."}</p>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Subtasks */}
                    <div>
                        <div className="flex justify-between items-end mb-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                                <h3 className="text-sm font-semibold text-foreground">Subtasks</h3>
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">
                                {Math.round((subtasks.filter(s => s.isCompleted).length / (subtasks.length || 1)) * 100)}%
                            </span>
                        </div>
                        
                        <Progress value={(subtasks.filter(s => s.isCompleted).length / (subtasks.length || 1)) * 100} className="h-1.5 mb-6" />

                        <div className="space-y-1">
                            {subtasks.map((st) => (
                                <div key={st._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 group transition-colors">
                                    <button 
                                        onClick={() => handleToggleSubtask(st._id)}
                                        className={`h-5 w-5 rounded border flex items-center justify-center transition-all 
                                            ${st.isCompleted ? 'bg-primary border-primary' : 'border-muted-foreground hover:border-primary'}`}
                                    >
                                        {st.isCompleted && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                                    </button>
                                    <span className={`text-sm flex-1 ${st.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                        {st.title}
                                    </span>
                                    <button onClick={() => handleDeleteSubtask(st._id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-opacity"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleAddSubtask} className="mt-4 flex items-center gap-3 pl-2">
                            <Plus className="h-4 w-4 text-muted-foreground" />
                            <input 
                                className="text-sm bg-transparent outline-none flex-1 placeholder:text-muted-foreground/60 text-foreground"
                                placeholder="Add a subtask..."
                                value={newSubtask}
                                onChange={e => setNewSubtask(e.target.value)}
                            />
                        </form>
                    </div>

                    <Separator />

                    {/* Attachments */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <Paperclip className="w-4 h-4 text-muted-foreground" />
                                <h3 className="text-sm font-semibold text-foreground">Attachments</h3>
                            </div>
                            <label className="cursor-pointer text-xs font-medium px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition flex items-center gap-2">
                                {isUploading ? <span className="animate-pulse">Uploading...</span> : <><Plus className="w-3 h-3"/> Add</>}
                                <input type="file" className="hidden" onChange={handleFileUpload} />
                            </label>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            {task.attachments?.map((file, i) => (
                                <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition group">
                                    <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                                        {file.type?.includes('image') ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{file.filename}</p>
                                        <p className="text-[10px] text-muted-foreground">Attached {new Date(file.uploadedAt).toLocaleDateString()}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </ScrollArea>

            {/* --- RIGHT: SIDEBAR (Properties & Chat) --- */}
            <div className="w-[350px] bg-muted/10 border-l border-border flex flex-col shrink-0">
                
                {/* Properties Panel */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[50%] border-b border-border">
                    
                    {/* Status */}
                    <div className="grid grid-cols-3 items-center gap-4">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-2"><Layout className="w-3.5 h-3.5"/> Status</span>
                        <div className="col-span-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full justify-start h-8 font-normal capitalize">
                                        <div className={`w-2 h-2 rounded-full mr-2 ${currentStatus === 'done' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                                        {currentStatus.replace('-', ' ')}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[200px]">
                                    {['todo', 'in-progress', 'review', 'done'].map(s => (
                                        <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)} className="capitalize">{s.replace('-', ' ')}</DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Priority */}
                    <div className="grid grid-cols-3 items-center gap-4">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5"/> Priority</span>
                        <div className="col-span-2">
                             <DropdownMenu>
                                <DropdownMenuTrigger className="focus:outline-none w-full text-left">
                                     <div className="w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground px-3 py-1.5 rounded-md flex items-center text-sm h-8">
                                         <PriorityBadge priority={currentPriority} />
                                     </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[200px]">
                                    {['urgent', 'high', 'medium', 'low'].map(p => (
                                        <DropdownMenuItem key={p} onClick={() => handlePriorityChange(p)} className="capitalize">{p}</DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                             </DropdownMenu>
                        </div>
                    </div>

                    {/* Assignee */}
                    <div className="grid grid-cols-3 items-center gap-4">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-2"><UserIcon className="w-3.5 h-3.5"/> Assignee</span>
                        <div className="col-span-2">
                            <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full justify-start h-8 font-normal px-2">
                                        {assignee ? (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5"><AvatarImage src={assignee.avatar} /><AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback></Avatar>
                                                <span className="truncate">{assignee.name}</span>
                                            </div>
                                        ) : <span className="text-muted-foreground">Unassigned</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[220px] p-0" align="end">
                                    <Command>
                                        <CommandInput placeholder="Search team..." />
                                        <CommandGroup>
                                            {teamMembers.map((m) => (
                                                <CommandItem key={m.user._id} value={m.user.name} onSelect={() => initiateAssignment(m.user)}>
                                                    <Check className={`mr-2 h-4 w-4 ${assignee?._id === m.user._id ? "opacity-100" : "opacity-0"}`} />
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-5 w-5"><AvatarImage src={m.user.avatar} /><AvatarFallback>{m.user.name.charAt(0)}</AvatarFallback></Avatar>
                                                        {m.user.name}
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Due Date */}
                    <div className="grid grid-cols-3 items-center gap-4">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-2"><Clock className="w-3.5 h-3.5"/> Due Date</span>
                        <div className="col-span-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className={`w-full justify-start h-8 font-normal ${!dueDate && "text-muted-foreground"}`}>
                                        {dueDate ? format(dueDate, "MMM d, yyyy") : <span>No date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar mode="single" selected={dueDate} onSelect={async (d) => {
                                        setDueDate(d);
                                        try { await api.put(`/tasks/${task._id}`, { dueDate: d }); toast.success("Date updated"); } catch(e){}
                                    }} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <Separator />

                    {/* Dependencies */}
                    <div className="space-y-3">
                         <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-2"><Link2 className="w-3.5 h-3.5"/> Blocking</span>
                            <Popover open={isDependencySearchOpen} onOpenChange={setIsDependencySearchOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-5 w-5"><Plus className="w-3 h-3" /></Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[250px] p-0" align="end">
                                    <Command>
                                        <CommandInput placeholder="Search tasks..." />
                                        <CommandGroup>
                                            {projectTasks.slice(0, 8).map((t) => (
                                               <CommandItem key={t._id} onSelect={() => handleAddDependency(t._id)}>{t.title}</CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                         </div>
                         {dependencies.length === 0 ? <p className="text-xs text-muted-foreground/50 italic">No dependencies</p> : (
                             <div className="space-y-2">
                                {dependencies.map(dep => (
                                    <div key={dep._id} className="flex items-center justify-between p-2 rounded-md bg-background border border-border text-xs">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {dep.status !== 'done' ? <AlertCircle className="w-3 h-3 text-orange-500 shrink-0"/> : <Check className="w-3 h-3 text-green-500 shrink-0"/>}
                                            <span className="truncate">{dep.title}</span>
                                        </div>
                                        <button onClick={() => handleRemoveDependency(dep._id)} className="text-muted-foreground hover:text-red-500"><Link2Off className="w-3 h-3"/></button>
                                    </div>
                                ))}
                             </div>
                         )}
                    </div>
                </div>

                {/* Activity / Chat Stream */}
                <div className="flex-1 flex flex-col min-h-0 bg-muted/20">
                    <div className="p-3 border-b border-border bg-muted/10">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Activity</h4>
                    </div>
                    
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-5">
                            {timeline.length === 0 && <div className="text-center text-xs text-muted-foreground mt-4">No activity yet.</div>}
                            
                            {timeline.map((item) => (
                                <div key={item._id} className="flex gap-3 text-sm">
                                    {item.type === 'activity' ? (
                                        <div className="flex gap-2 w-full">
                                             <div className="mt-0.5"><History className="w-3 h-3 text-muted-foreground" /></div>
                                             <div className="flex-1">
                                                 <p className="text-xs text-muted-foreground">
                                                     <span className="font-semibold text-foreground">{item.user?.name}</span> {formatActivityAction(item.action, item.details)}
                                                 </p>
                                                 <p className="text-[10px] text-muted-foreground/50">{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                             </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2 w-full group">
                                            <Avatar className="w-6 h-6 mt-0.5"><AvatarImage src={item.user?.avatar} /><AvatarFallback className="text-[9px]">{item.user?.name?.charAt(0)}</AvatarFallback></Avatar>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-baseline justify-between">
                                                    <span className="text-xs font-bold text-foreground">{item.user?.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                                <div className="bg-background p-2.5 rounded-lg border border-border text-foreground shadow-sm">{item.content}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    {/* Chat Input */}
                    <div className="p-3 bg-background border-t border-border">
                         <form onSubmit={handleSendComment} className="flex gap-2">
                            <Input 
                                value={newComment} 
                                onChange={(e) => setNewComment(e.target.value)} 
                                placeholder="Leave a comment..." 
                                className="h-9 text-xs bg-muted/30 border-transparent focus:bg-background focus:border-input transition-colors"
                            />
                            <Button type="submit" size="icon" className="h-9 w-9 shrink-0"><Check className="w-4 h-4" /></Button>
                        </form>
                    </div>
                </div>

            </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* CONFIRM ASSIGNMENT */}
    <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Assign Task?</AlertDialogTitle>
                <AlertDialogDescription>Assigning <strong>{task.title}</strong> to <strong>{pendingAssignee?.name}</strong>.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmAssignment}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}