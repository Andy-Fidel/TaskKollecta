import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  Calendar as CalendarIcon, User as UserIcon, Check, ChevronsUpDown, 
  History, MoreHorizontal, Trash2 
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { PriorityBadge } from './PriorityBadge';

export function TaskDetailsModal({ task, isOpen, onClose, projectId, socket }) {
  const { user } = useAuth();
  
  // --- Data State ---
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]); // System logs
  const [teamMembers, setTeamMembers] = useState([]);
  
  // --- Form & UI State ---
  const [newComment, setNewComment] = useState('');
  const [assignee, setAssignee] = useState(task?.assignee);
  const [dueDate, setDueDate] = useState(task?.dueDate ? new Date(task.dueDate) : null);
  const [openUserSelect, setOpenUserSelect] = useState(false);
  
  // Local status/priority for instant UI updates
  const [currentStatus, setCurrentStatus] = useState(task?.status || 'todo');
  const [currentPriority, setCurrentPriority] = useState(task?.priority || 'medium');

  // Confirmation State
  const [pendingAssignee, setPendingAssignee] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // --- 1. Fetch Data ---
  useEffect(() => {
    if (isOpen && task) {
      // 1. Load Comments
      api.get(`/comments/${task._id}`).then(({ data }) => setComments(data));
      
      // 2. Load Activity Log
      api.get(`/activities/task/${task._id}`).then(({ data }) => setActivities(data));

      // 3. Load Team Members
      if (task.organization) {
         api.get(`/organizations/${task.organization}/members`).then(({ data }) => setTeamMembers(data));
      }
      
      // 4. Sync State
      setAssignee(task.assignee);
      setDueDate(task.dueDate ? new Date(task.dueDate) : null);
      setCurrentStatus(task.status);
      setCurrentPriority(task.priority);
    }
  }, [isOpen, task]);

  // --- 2. Real-time Listeners ---
  useEffect(() => {
    if (!socket) return;

    // Listen for new comments
    const handleNewComment = (comment) => {
      if (comment.task === task._id) setComments((prev) => [...prev, comment]);
    };

    // Listen for new system activities (e.g. status changes)
    const handleNewActivity = (activity) => {
        if (activity.task === task._id) setActivities((prev) => [activity, ...prev]); 
        // Note: Activities usually come sorted new -> old from API, but we sort timeline below anyway
    };

    socket.on('receive_new_comment', handleNewComment);
    socket.on('new_activity', handleNewActivity);

    return () => {
        socket.off('receive_new_comment', handleNewComment);
        socket.off('new_activity', handleNewActivity);
    };
  }, [socket, task]);

  // --- ACTIONS ---

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
        toast.success(`Task assigned to ${pendingAssignee.name}`);
    } catch (error) {
        toast.error("Failed to assign user");
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const { data } = await api.post('/comments', { content: newComment, taskId: task._id });
      setComments([...comments, data]);
      setNewComment('');
      socket.emit('new_comment', { projectId, comment: data });
    } catch (error) { console.error("Failed to send comment"); }
  };

  const handleDateSelect = async (date) => {
    setDueDate(date);
    try {
        await api.put(`/tasks/${task._id}`, { dueDate: date });
        toast.success("Due date updated");
    } catch (error) { toast.error("Failed to update date"); }
  };

  const handleStatusChange = async (newStatus) => {
    setCurrentStatus(newStatus);
    try {
        await api.put(`/tasks/${task._id}`, { status: newStatus });
        if (socket) socket.emit("task_moved", { _id: task._id, status: newStatus, projectId });
        toast.success(`Status moved to ${newStatus}`);
    } catch (error) { console.error("Failed update status"); }
  };

  const handlePriorityChange = async (newPriority) => {
    setCurrentPriority(newPriority);
    try {
        await api.put(`/tasks/${task._id}`, { priority: newPriority });
        toast.success(`Priority set to ${newPriority}`);
    } catch (error) { console.error("Failed update priority"); }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm("Are you sure you want to delete this task? This cannot be undone.")) return;
    try {
        await api.delete(`/tasks/${task._id}`);
        toast.success("Task deleted");
        onClose();
        window.location.reload(); // Simple refresh to update board
    } catch (error) {
        toast.error("Failed to delete task");
    }
  };

  // --- HELPER: Merge & Sort Timeline ---
  // Combine Comments (User) and Activities (System) into one chronological list
  const timeline = [
    ...comments.map(c => ({ ...c, type: 'comment' })),
    ...activities.map(a => ({ ...a, type: 'activity' }))
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));


  if (!task) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50">
        
        {/* HEADER */}
        <div className="bg-white p-6 border-b flex justify-between items-start">
          <div className="space-y-1">
             <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="uppercase text-[10px] tracking-widest">{task.project?.name || 'Project'}</Badge>
                <span className="text-xs text-slate-400">task-{task._id.slice(-4)}</span>
             </div>
             <DialogTitle className="text-2xl font-bold text-slate-900">{task.title}</DialogTitle>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Priority */}
             <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none"><PriorityBadge priority={currentPriority} className="cursor-pointer" /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {['urgent', 'high', 'medium', 'low'].map(p => (
                        <DropdownMenuItem key={p} onClick={() => handlePriorityChange(p)} className="capitalize">{p}</DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
             </DropdownMenu>

             {/* Status */}
             <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none">
                    <Badge className={`cursor-pointer hover:opacity-80 border-none capitalize px-3 py-1 text-sm
                        ${currentStatus === 'done' ? 'bg-green-100 text-green-700' : 
                          currentStatus === 'in-progress' ? 'bg-blue-100 text-blue-700' : 
                          currentStatus === 'review' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-slate-100 text-slate-700'}
                    `}>{currentStatus.replace('-', ' ')}</Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {['todo', 'in-progress', 'review', 'done'].map(s => (
                        <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)} className="capitalize">{s.replace('-', ' ')}</DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
             </DropdownMenu>

             {/* More Options (Delete) */}
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDeleteTask} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* BODY */}
        <div className="flex flex-1 overflow-hidden">
            
            {/* LEFT COL: Details */}
            <div className="w-2/3 p-8 overflow-y-auto bg-white border-r">
                <div className="grid grid-cols-2 gap-6 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    
                    {/* Assignee */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assignee</label>
                            {(!assignee || assignee._id !== user._id) && (
                                <button onClick={() => initiateAssignment(user)} className="text-[10px] text-blue-600 hover:underline font-medium">Assign to me</button>
                            )}
                        </div>

                        <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={openUserSelect} className="w-full justify-start pl-2 h-10 border-slate-200 bg-white">
                                    {assignee ? (
                                        <>
                                            <Avatar className="h-6 w-6 mr-2"><AvatarImage src={assignee.avatar} /><AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback></Avatar>
                                            <span className="truncate">{assignee.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="h-6 w-6 rounded-full bg-slate-100 mr-2 flex items-center justify-center"><UserIcon className="h-3 w-3 text-slate-400" /></div>
                                            <span className="text-slate-500">Unassigned</span>
                                        </>
                                    )}
                                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search team..." />
                                    <CommandEmpty>No members found.</CommandEmpty>
                                    <CommandGroup>
                                        {teamMembers.map((m) => (
                                            <CommandItem key={m.user._id} value={m.user.name} onSelect={() => initiateAssignment(m.user)}>
                                                <Check className={`mr-2 h-4 w-4 ${assignee?._id === m.user._id ? "opacity-100" : "opacity-0"}`} />
                                                {m.user.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={`w-full justify-start text-left font-normal h-10 border-slate-200 bg-white ${!dueDate && "text-muted-foreground"}`}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={dueDate} onSelect={handleDateSelect} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Tags (Basic Visual) */}
                <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-900 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                        {(task.tags || []).map((tag, i) => (
                            <Badge key={i} className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200">{tag.name}</Badge>
                        ))}
                        <Button variant="outline" size="sm" className="h-5 text-[10px] rounded-full px-2" onClick={() => toast.info("Tag management coming in v2")}>+ Add Tag</Button>
                    </div>
                </div>

                {/* Description */}
                <h3 className="text-sm font-bold text-slate-900 mb-2">Description</h3>
                <div className="prose prose-sm max-w-none text-slate-600">
                    <p className="whitespace-pre-wrap leading-relaxed">{task.description || "No description provided."}</p>
                </div>
            </div>

            {/* RIGHT COL: Unified Activity Log */}
            <div className="w-1/3 flex flex-col bg-slate-50/50">
                <div className="p-4 border-b bg-white/50 backdrop-blur flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Activity & Comments</span>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                        {timeline.length === 0 && <div className="text-center text-xs text-slate-400 mt-10">No activity yet.</div>}
                        
                        {timeline.map((item) => {
                            // RENDER: System Activity
                            if (item.type === 'activity') {
                                return (
                                    <div key={item._id} className="flex gap-3 items-center text-xs text-slate-500 pl-2">
                                        <History className="w-3 h-3 text-slate-400" />
                                        <p>
                                            <span className="font-bold text-slate-700">{item.user?.name}</span> 
                                            <span className="mx-1">{item.action.replace(/_/g, ' ')}</span>
                                            {item.details && <span className="italic text-slate-500">{item.details}</span>}
                                            <span className="ml-2 opacity-40 text-[10px]">{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </p>
                                    </div>
                                );
                            } 
                            // RENDER: User Comment
                            else {
                                return (
                                    <div key={item._id} className="flex gap-3">
                                        <Avatar className="w-8 h-8 mt-1 border border-white shadow-sm"><AvatarImage src={item.user?.avatar} /><AvatarFallback className="text-[10px]">{item.user?.name?.charAt(0)}</AvatarFallback></Avatar>
                                        <div className="flex-1">
                                            <div className="flex items-baseline justify-between mb-1">
                                                <span className="text-xs font-bold text-slate-700">{item.user?.name}</span>
                                                <span className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm text-sm text-slate-600 border border-slate-100">{item.content}</div>
                                        </div>
                                    </div>
                                );
                            }
                        })}
                    </div>
                </ScrollArea>
                
                {/* Chat Input */}
                <div className="p-4 bg-white border-t">
                    <form onSubmit={handleSendComment} className="flex gap-2">
                        <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Type a message..." className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"/>
                        <Button type="submit" size="icon" className="bg-blue-600 hover:bg-blue-700 shrink-0"><Check className="w-4 h-4" /></Button>
                    </form>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* CONFIRMATION DIALOG */}
    <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Assign Task?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will assign <strong>{task.title}</strong> to <strong>{pendingAssignee?.name}</strong>. They will be notified immediately.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmAssignment} className="bg-slate-900">Confirm Assignment</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}