import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
    User as UserIcon, Check, MoreHorizontal, Trash2, Paperclip, FileText,
    Image as ImageIcon, Link2, Link2Off, AlertCircle, X, Plus,
    AlignLeft, Layout, Clock, CheckCircle2, ListChecks, History, Tag, Repeat,
    Calendar as CalendarIcon, Diamond, GitBranch
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar as UIAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { formatActivityAction } from '../utils/formatActivity';
import api from '../api/axios';
import { useAuth } from '../context/useAuth';
import { PriorityBadge } from './PriorityBadge';
import { TagPicker } from './TagPicker';
import { RecurrencePicker } from './RecurrencePicker';
import { MentionInput, renderMentions } from './MentionInput';

export function TaskDetailsModal({ task, isOpen, onClose, projectId, orgId, socket }) {
    const { user } = useAuth();

    // --- 1. HOOKS (Always run first) ---
    const [comments, setComments] = useState([]);
    const [activities, setActivities] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [subtasks, setSubtasks] = useState(task?.subtasks || []);
    const [dependencies, setDependencies] = useState(task?.dependencies || []);
    const [tags, setTags] = useState(task?.tags || []);
    const [recurrence, setRecurrence] = useState(task?.recurrence || null);
    const [attachments, setAttachments] = useState(task?.attachments || []);
    const [isMilestone, setIsMilestone] = useState(task?.isMilestone || false);
    const [childTasks, setChildTasks] = useState([]);
    const [newChildTitle, setNewChildTitle] = useState('');
    const [isCreatingChild, setIsCreatingChild] = useState(false);

    const [newComment, setNewComment] = useState('');
    const [newSubtask, setNewSubtask] = useState('');
    const [assignee, setAssignee] = useState(task?.assignee);
    const [startDate, setStartDate] = useState(task?.startDate ? new Date(task.startDate) : null);
    const [dueDate, setDueDate] = useState(task?.dueDate ? new Date(task.dueDate) : null);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [descInput, setDescInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [showCompletionAnim, setShowCompletionAnim] = useState(false);

    const [openUserSelect, setOpenUserSelect] = useState(false);
    const [isDependencySearchOpen, setIsDependencySearchOpen] = useState(false);
    const [projectTasks, setProjectTasks] = useState([]);

    const [currentStatus, setCurrentStatus] = useState(task?.status || 'todo');
    const [currentPriority, setCurrentPriority] = useState(task?.priority || 'medium');

    const [pendingAssignee, setPendingAssignee] = useState(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    
    // Typing indicator state
    const [typingUsers, setTypingUsers] = useState([]);
    const [typingTimeout, setTypingTimeout] = useState(null);

    // --- 2. EFFECTS ---
    useEffect(() => {
        if (isOpen && task) {
            api.get(`/comments/${task._id}`).then(({ data }) => setComments(data.comments || [])).catch(() => { });
            api.get(`/activities/task/${task._id}`).then(({ data }) => setActivities(data)).catch(() => { });

            // Fetch team members from organization - use orgId prop, task.organization, or localStorage fallback
            const effectiveOrgId = orgId || task.organization || localStorage.getItem('activeOrgId');
            if (effectiveOrgId) {
                api.get(`/organizations/${effectiveOrgId}/members`).then(({ data }) => setTeamMembers(data)).catch(() => { });
            }

            setAssignee(task.assignee);
            setStartDate(task.startDate ? new Date(task.startDate) : null);
            setDueDate(task.dueDate ? new Date(task.dueDate) : null);
            setCurrentStatus(task.status || 'todo');
            setCurrentPriority(task.priority || 'medium');
            setDescInput(task.description || '');
            setSubtasks(task.subtasks || []);
            setDependencies(task.dependencies || []);
            setTags(task.tags || []);
            setRecurrence(task.recurrence || null);
            setAttachments(task.attachments || []);
            setIsMilestone(task.isMilestone || false);

            // Fetch child tasks (real sub-task documents)
            api.get(`/tasks/${task._id}/children`).then(({ data }) => setChildTasks(data)).catch(() => {});
        }
    }, [isOpen, task, orgId]);

    useEffect(() => {
        if (isDependencySearchOpen && projectTasks.length === 0 && task) {
            api.get(`/tasks/project/${projectId}`).then(({ data }) => {
                setProjectTasks(data.filter(t => t._id !== task._id));
            });
        }
    }, [isDependencySearchOpen, projectId, task, projectTasks.length]);

    useEffect(() => {
        if (!socket || !task || !isOpen) return;

        // Join task room for typing events
        socket.emit("join_task", task._id);

        const handleNewComment = (comment) => {
            if (comment.task === task._id) {
                setComments((prev) => [...prev, comment]);
                // Remove the user from typing array since they sent the message
                if (comment.user) {
                   setTypingUsers(prev => prev.filter(u => u._id !== comment.user._id));
                }
            }
        };
        const handleNewActivity = (activity) => {
            if (activity.task === task._id) setActivities((prev) => [activity, ...prev]);
        };
        const handleOnlineUsers = (users) => {
            setOnlineUsers(users);
        };
        
        const handleUserTyping = ({ user: typingUser, taskId }) => {
            if (taskId === task._id && typingUser._id !== user._id) {
                setTypingUsers(prev => {
                    if (!prev.find(u => u._id === typingUser._id)) {
                        return [...prev, typingUser];
                    }
                    return prev;
                });
            }
        };

        const handleUserStoppedTyping = ({ userId, taskId }) => {
            if (taskId === task._id) {
                setTypingUsers(prev => prev.filter(u => u._id !== userId));
            }
        };

        socket.on('receive_new_comment', handleNewComment);
        socket.on('new_activity', handleNewActivity);
        socket.on('get_online_users', handleOnlineUsers);
        socket.on('user_typing', handleUserTyping);
        socket.on('user_stopped_typing', handleUserStoppedTyping);

        return () => {
            socket.emit("leave_task", task._id);
            socket.off('receive_new_comment', handleNewComment);
            socket.off('new_activity', handleNewActivity);
            socket.off('get_online_users', handleOnlineUsers);
            socket.off('user_typing', handleUserTyping);
            socket.off('user_stopped_typing', handleUserStoppedTyping);
        };
    }, [socket, task, isOpen, user]);

    // Clean up typing timeout on unmount or task change
    useEffect(() => {
        return () => {
             if (typingTimeout) clearTimeout(typingTimeout);
        };
    }, [typingTimeout]);

    // --- 3. GUARD CLAUSE (After hooks) ---
    if (!task) return null;

    // --- 4. DATA PROCESSING (Safe) ---
    const timeline = [
        ...(Array.isArray(comments) ? comments : []).map(c => ({ ...c, type: 'comment' })),
        ...(Array.isArray(activities) ? activities : []).map(a => ({ ...a, type: 'activity' }))
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Permission Check
    const currentMember = teamMembers.find(m => m.user?._id === user?._id);
    const userRole = currentMember?.role;
    const isAuthor = task.reporter === user?._id;
    const canDelete = ['owner', 'admin'].includes(userRole) || isAuthor;

    // --- 5. HANDLERS ---
    const handleSaveDescription = async () => {
        try {
            await api.put(`/tasks/${task._id}`, { description: descInput });
            setIsEditingDesc(false);
            toast.success("Description updated");
        } catch { toast.error("Failed to update description"); }
    };

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
            setPendingAssignee(null);
            setIsConfirmOpen(false);
            toast.success(`Assigned to ${pendingAssignee.name}`);
        } catch {
            toast.error("Assignment failed");
            setPendingAssignee(null);
        }
    };


    const handleStatusChange = async (newStatus) => {
        const isHighPriority = currentPriority === 'high' || currentPriority === 'urgent';
        const isMovingToDone = newStatus === 'done' || newStatus === 'completed';
        
        if (isHighPriority && isMovingToDone && currentStatus !== newStatus) {
            setShowCompletionAnim(true);
            setTimeout(() => setShowCompletionAnim(false), 3000);
        }

        setCurrentStatus(newStatus);
        try {
            await api.put(`/tasks/${task._id}`, { status: newStatus });
            if (socket) socket.emit("task_moved", { _id: task._id, status: newStatus, projectId });
            toast.success(`Status updated`);
        } catch { toast.error("Failed update status"); }
    };

    const handlePriorityChange = async (newPriority) => {
        setCurrentPriority(newPriority);
        try {
            await api.put(`/tasks/${task._id}`, { priority: newPriority });
            toast.success(`Priority updated`);
        } catch { toast.error("Failed update priority"); }
    };

    const handleAddSubtask = async (e) => {
        e.preventDefault();
        if (!newSubtask.trim()) return;
        try {
            const { data } = await api.post(`/tasks/${task._id}/subtasks`, { title: newSubtask });
            setSubtasks(data.subtasks);
            setNewSubtask('');
        } catch { toast.error("Failed to add subtask"); }
    };

    const handleToggleSubtask = async (id) => {
        const originalSubtasks = subtasks;
        setSubtasks(prev => prev.map(s => s._id === id ? { ...s, isCompleted: !s.isCompleted } : s));
        try {
            await api.put(`/tasks/${task._id}/subtasks/${id}`);
        } catch {
            setSubtasks(originalSubtasks);
            toast.error("Sync error");
        }
    };

    const handleDeleteSubtask = async (id) => {
        const originalSubtasks = subtasks;
        setSubtasks(prev => prev.filter(s => s._id !== id));
        try {
            await api.delete(`/tasks/${task._id}/subtasks/${id}`);
        } catch {
            setSubtasks(originalSubtasks);
            toast.error("Delete error");
        }
    };

    const handleToggleMilestone = async () => {
        const newVal = !isMilestone;
        setIsMilestone(newVal);
        try {
            await api.put(`/tasks/${task._id}`, { isMilestone: newVal });
            toast.success(newVal ? 'Marked as milestone' : 'Milestone removed');
        } catch { setIsMilestone(!newVal); toast.error('Failed to update'); }
    };

    const handleCreateChildTask = async (e) => {
        e.preventDefault();
        if (!newChildTitle.trim()) return;
        setIsCreatingChild(true);
        try {
            const { data } = await api.post(`/tasks/${task._id}/children`, { title: newChildTitle });
            setChildTasks(prev => [data, ...prev]);
            setNewChildTitle('');
            toast.success('Sub-task created');
        } catch { toast.error('Failed to create sub-task'); }
        setIsCreatingChild(false);
    };

    const handleAddDependency = async (dependencyId) => {
        try {
            const { data } = await api.post(`/tasks/${task._id}/dependencies`, { dependencyId });
            setDependencies(data.dependencies);
            setIsDependencySearchOpen(false);
            toast.success("Dependency linked");
        } catch { toast.error("Failed to link task"); }
    };

    const handleRemoveDependency = async (depId) => {
        try {
            const { data } = await api.delete(`/tasks/${task._id}/dependencies/${depId}`);
            setDependencies(data.dependencies);
            toast.success("Dependency removed");
        } catch { toast.error("Failed to unlink task"); }
    };

    const handleCommentChange = (val) => {
        setNewComment(val);
        
        // Emit typing event
        if (socket && task) {
            socket.emit("typing_comment", { taskId: task._id, user });
            
            // Clear existing timeout
            if (typingTimeout) clearTimeout(typingTimeout);
            
            // Set new timeout to stop typing after 2 seconds of inactivity
            const timeout = setTimeout(() => {
                socket.emit("stopped_typing_comment", { taskId: task._id, userId: user._id });
            }, 2000);
            setTypingTimeout(timeout);
        }
    };

    const handleSendComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            const { data } = await api.post('/comments', { content: newComment, taskId: task._id });
            setComments([...comments, data]);
            setNewComment('');
            if (socket) socket.emit('new_comment', { projectId, comment: data });
            toast.success("Comment added");
        } catch { toast.error("Message failed"); }
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setIsUploading(true);
        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                const uploadRes = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                const { url, filename, type } = uploadRes.data;
                const { data: updatedTask } = await api.post(`/tasks/${task._id}/attachments`, { url, filename, type });
                setAttachments(updatedTask.attachments || []);
            }
            toast.success(files.length > 1 ? `${files.length} files attached` : "File attached");
        } catch { toast.error("Upload failed"); }
        finally {
            setIsUploading(false);
            // Reset file input so the same file(s) can be re-selected
            e.target.value = '';
        }
    };

    const handleDeleteAttachment = async (attachmentId) => {
        const original = attachments;
        setAttachments(prev => prev.filter(a => a._id !== attachmentId));
        try {
            await api.delete(`/tasks/${task._id}/attachments/${attachmentId}`);
            toast.success("Attachment removed");
        } catch {
            setAttachments(original);
            toast.error("Failed to remove attachment");
        }
    };

    const handleDeleteTask = async () => {
        if (!window.confirm("Delete this task permanently?")) return;
        try {
            await api.delete(`/tasks/${task._id}`);
            toast.success("Task deleted");
            onClose();
        } catch { toast.error("Failed to delete"); }
    };

    // --- 6. HELPER COMPONENT ---
    const Avatar = ({ user }) => {
        if (!user) return null;
        const isOnline = onlineUsers.includes(user._id);
        const displayName = user?.name || 'User';

        return (
            <div className="relative inline-block">
                <img src={user.avatar || ''} className="w-8 h-8 rounded-full object-cover" alt={displayName} onError={() => { }} />
                {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                )}
            </div>
        );
    };

    // --- 7. RENDER ---
    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="w-full max-w-6xl h-[100dvh] md:h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
                    
                    {/* --- COMPLETION ANIMATION OVERLAY --- */}
                    <AnimatePresence>
                        {showCompletionAnim && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.5 }}
                                className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden"
                            >
                                <motion.div 
                                    initial={{ rotate: 0 }}
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className="relative flex items-center justify-center"
                                >
                                    {[...Array(12)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ x: 0, y: 0, opacity: 1 }}
                                            animate={{ 
                                                x: Math.cos(i * 30 * Math.PI / 180) * 150, 
                                                y: Math.sin(i * 30 * Math.PI / 180) * 150, 
                                                opacity: 0 
                                            }}
                                            transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                                            className="absolute w-2 h-2 rounded-full bg-primary"
                                        />
                                    ))}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: [0, 1.2, 1] }}
                                        className="bg-primary text-primary-foreground p-6 rounded-full shadow-2xl"
                                    >
                                        <Check className="w-12 h-12 stroke-[3]" />
                                    </motion.div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div className="bg-card border-b border-border p-3 md:p-4 px-4 md:px-6 flex justify-between items-center shrink-0 min-h-[56px] md:h-16">
                        <div className="flex items-center gap-2 md:gap-3 text-muted-foreground overflow-hidden">
                            <Badge variant="outline" className="rounded-md font-mono text-[10px] md:text-xs shrink-0">{task.project?.name || 'Project'}</Badge>
                            <span className="text-sm hidden md:inline">/</span>
                            <span className="text-xs md:text-sm font-medium font-mono truncate">TASK-{task._id.slice(-4)}</span>
                        </div>

                        <div className="flex items-center gap-2 mr-6 md:mr-8">
                            <Button variant="ghost" size="icon" onClick={() => toast.info("Share link copied!")}><Link2 className="w-4 h-4 text-muted-foreground" /></Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {canDelete && (
                                        <DropdownMenuItem onClick={handleDeleteTask} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                                        </DropdownMenuItem>
                                    )}
                                    {!canDelete && (
                                        <DropdownMenuItem disabled className="text-muted-foreground">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Restricted
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* ENHANCED LAYOUT - Tabs on Mobile, Split View on Desktop */}
                    <Tabs defaultValue="details" className="flex flex-col lg:flex-row flex-1 overflow-hidden w-full h-full">

                        {/* MOBILE TABS HEADER - Hidden on large screens */}
                        <div className="lg:hidden border-b border-border bg-card px-4 py-2 shrink-0">
                            <TabsList className="w-full grid grid-cols-2 bg-muted/50 p-1 rounded-lg">
                                <TabsTrigger value="details" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Details</TabsTrigger>
                                <TabsTrigger value="activity" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Activity</TabsTrigger>
                            </TabsList>
                        </div>

                        {/* LEFT: DETAILS CONTENT */}
                        <TabsContent value="details" forceMount={true} className="m-0 lg:flex-1 h-full lg:order-1 data-[state=inactive]:hidden lg:data-[state=inactive]:flex flex-col overflow-hidden focus-visible:outline-none">
                            <ScrollArea className="flex-1 h-full bg-background overflow-y-auto">
                                <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6 md:space-y-8 pb-32">
                                    <DialogTitle className="text-xl md:text-3xl font-bold text-foreground leading-tight tracking-tight">{task.title}</DialogTitle>

                                    {/* --- COMPACT INLINE PROPERTIES HEADER --- */}
                                    <div className="flex flex-wrap items-center gap-2 md:gap-4 p-3 md:p-4 bg-muted/10 border border-border/40 rounded-xl shadow-sm">
                                        
                                        {/* Status */}
                                        <div className="flex items-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 font-medium capitalize bg-background shadow-sm border border-border/50 hover:bg-muted text-xs md:text-sm rounded-full px-3">
                                                        <div className={`w-2 h-2 rounded-full mr-2 ${currentStatus === 'done' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                                                        {String(currentStatus || 'todo').replace(/-/g, ' ')}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="w-[180px]">
                                                    {['todo', 'in-progress', 'review', 'done'].map(s => (
                                                        <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)} className="capitalize">{String(s).replace(/-/g, ' ')}</DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        {/* Priority */}
                                        <div className="flex items-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="focus:outline-none">
                                                    <div className="bg-background shadow-sm border border-border/50 hover:bg-muted px-3 py-1.5 rounded-full flex items-center text-xs md:text-sm h-8 cursor-pointer transition-colors">
                                                        <PriorityBadge priority={currentPriority} />
                                                    </div>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-[180px]">
                                                    {['urgent', 'high', 'medium', 'low'].map(p => (
                                                        <DropdownMenuItem key={p} onClick={() => handlePriorityChange(p)} className="capitalize">{p}</DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        {/* Milestone Toggle */}
                                        <div className="flex items-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleToggleMilestone}
                                                className={`h-8 font-medium bg-background shadow-sm border border-border/50 hover:bg-muted rounded-full px-3 text-xs md:text-sm ${
                                                    isMilestone ? 'text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800' : 'text-muted-foreground'
                                                }`}
                                            >
                                                <Diamond className={`w-3.5 h-3.5 mr-2 ${isMilestone ? 'fill-amber-500' : ''}`} />
                                                {isMilestone ? 'Milestone' : 'Milestone'}
                                            </Button>
                                        </div>

                                        {/* Assignee */}
                                        <div className="flex items-center">
                                            <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 font-medium bg-background shadow-sm border border-border/50 hover:bg-muted rounded-full px-3">
                                                        {assignee ? (
                                                            <div className="flex items-center gap-2">
                                                                <UIAvatar className="h-5 w-5"><AvatarImage src={assignee.avatar} /><AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback></UIAvatar>
                                                                <span className="truncate max-w-[100px] text-xs md:text-sm">{assignee.name.split(' ')[0]}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <UserIcon className="w-3.5 h-3.5" />
                                                                <span className="text-xs md:text-sm">Unassigned</span>
                                                            </div>
                                                        )}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[220px] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Search team..." />
                                                        <CommandGroup>
                                                            {Array.isArray(teamMembers) && teamMembers.map((m) => (
                                                                <CommandItem key={m.user?._id} value={m.user?.name} onSelect={() => initiateAssignment(m.user)}>
                                                                    <Check className={`mr-2 h-4 w-4 ${assignee?._id === m.user?._id ? "opacity-100" : "opacity-0"}`} />
                                                                    <div className="flex items-center gap-2">
                                                                        <UIAvatar className="h-5 w-5"><AvatarImage src={m.user?.avatar} /><AvatarFallback>{m.user?.name?.charAt(0)}</AvatarFallback></UIAvatar>
                                                                        {m.user?.name}
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        {/* Start Date */}
                                        <div className="flex items-center">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="sm" className={`h-8 font-medium bg-background shadow-sm border border-border/50 hover:bg-muted rounded-full px-3 ${!startDate && "text-muted-foreground"}`}>
                                                        <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                                                        <span className="text-xs md:text-sm">{startDate ? format(startDate, "MMM d") : "Start"}</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="end">
                                                    <Calendar mode="single" selected={startDate} onSelect={async (d) => {
                                                        setStartDate(d);
                                                        if (d && dueDate && d > dueDate) {
                                                            setDueDate(null);
                                                            try { await api.put(`/tasks/${task._id}`, { startDate: d, dueDate: null }); toast.success("Start date updated"); } catch { /* silently ignore */ }
                                                        } else {
                                                            try { await api.put(`/tasks/${task._id}`, { startDate: d || null }); toast.success("Start date updated"); } catch { /* silently ignore */ }
                                                        }
                                                    }} initialFocus />
                                                    {startDate && (
                                                        <div className="px-3 pb-3">
                                                            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={async () => {
                                                                setStartDate(null);
                                                                try { await api.put(`/tasks/${task._id}`, { startDate: null }); toast.success("Start date cleared"); } catch { /* silently ignore */ }
                                                            }}>Clear start date</Button>
                                                        </div>
                                                    )}
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        {/* Due Date */}
                                        <div className="flex items-center">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="sm" className={`h-8 font-medium bg-background shadow-sm border border-border/50 hover:bg-muted rounded-full px-3 ${!dueDate && "text-muted-foreground"}`}>
                                                        <Clock className="w-3.5 h-3.5 mr-2" />
                                                        <span className="text-xs md:text-sm">{dueDate ? format(dueDate, "MMM d") : "Due"}</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="end">
                                                    <Calendar mode="single" selected={dueDate}
                                                        disabled={(date) => startDate && date < startDate}
                                                        onSelect={async (d) => {
                                                        setDueDate(d);
                                                        try { await api.put(`/tasks/${task._id}`, { dueDate: d }); toast.success("Date updated"); } catch { /* silently ignore */ }
                                                    }} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        {/* Tags */}
                                        <div className="flex items-center">
                                            <TagPicker
                                                taskId={task._id}
                                                tags={tags}
                                                onTagsChange={setTags}
                                            />
                                        </div>

                                        {/* Recurrence */}
                                        <div className="flex items-center">
                                            <RecurrencePicker
                                                taskId={task._id}
                                                recurrence={recurrence}
                                                onRecurrenceChange={setRecurrence}
                                            />
                                        </div>

                                        {/* Dependencies */}
                                        <div className="flex items-center flex-wrap gap-2">
                                            <Popover open={isDependencySearchOpen} onOpenChange={setIsDependencySearchOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 font-medium bg-background shadow-sm border border-border/50 hover:bg-muted rounded-full px-3 text-muted-foreground">
                                                        <Link2 className="w-3.5 h-3.5 mr-2" />
                                                        <span className="text-xs md:text-sm">Blocked by</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[280px] p-0" align="end">
                                                    <Command>
                                                        <CommandInput placeholder="Search tasks to depend on..." />
                                                        <CommandGroup>
                                                            {Array.isArray(projectTasks) && projectTasks.length === 0 && <div className="p-3 text-xs text-muted-foreground text-center">No other tasks in project</div>}
                                                            {Array.isArray(projectTasks) && projectTasks
                                                                .filter(t => !dependencies?.some(d => d._id === t._id))
                                                                .slice(0, 8)
                                                                .map((t) => (
                                                                <CommandItem key={t._id} onSelect={() => handleAddDependency(t._id)}>
                                                                    <div className={`w-2 h-2 rounded-full mr-2 ${t.status === 'done' ? 'bg-green-500' : 'bg-slate-400'}`} />
                                                                    {t.title}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            {dependencies?.length > 0 && (
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {dependencies.map(dep => (
                                                        <Badge key={dep._id} variant="secondary" className={`text-[10px] h-6 px-2 flex items-center gap-1 cursor-pointer transition-colors ${
                                                            dep.status === 'done' ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400' : 'hover:bg-red-100 hover:text-red-700'
                                                        }`} title={dep.status === 'done' ? 'Completed dependency' : 'Click to remove'} onClick={() => handleRemoveDependency(dep._id)}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${dep.status === 'done' ? 'bg-green-500' : 'bg-amber-500'}`} />
                                                            {dep.title?.substring(0, 15)}{dep.title?.length > 15 ? '…' : ''}
                                                            <X className="w-3 h-3 ml-0.5 opacity-40" />
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="group pt-2">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="bg-muted p-1.5 rounded-md"><AlignLeft className="w-4 h-4 text-primary" /></div>
                                            <h3 className="text-sm font-semibold text-foreground tracking-wide">Description</h3>
                                        </div>
                                        {isEditingDesc ? (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                                <Textarea
                                                    value={descInput}
                                                    onChange={e => setDescInput(e.target.value)}
                                                    className="min-h-[150px] bg-card border-primary/30 focus-visible:ring-primary/30 shadow-sm resize-none"
                                                    autoFocus
                                                />
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={handleSaveDescription}>Save Description</Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setIsEditingDesc(false)}>Cancel</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => setIsEditingDesc(true)}
                                                className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground p-5 rounded-xl border border-border/40 hover:border-primary/30 hover:bg-muted/30 cursor-text transition-all min-h-[100px] shadow-sm bg-card"
                                            >
                                                <p className="whitespace-pre-wrap leading-relaxed">{descInput || "Click to add a detailed description..."}</p>
                                            </div>
                                        )}
                                    </div>

                                    <Separator className="bg-border/60" />

                                    {/* Subtasks */}
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-muted p-1.5 rounded-md"><CheckCircle2 className="w-4 h-4 text-primary" /></div>
                                                <h3 className="text-sm font-semibold text-foreground tracking-wide">Subtasks</h3>
                                            </div>
                                            {subtasks.length > 0 && (
                                                <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded-full">
                                                    {Math.round((subtasks.filter(s => s.isCompleted).length / subtasks.length) * 100)}%
                                                </span>
                                            )}
                                        </div>

                                        {Array.isArray(subtasks) && subtasks.length > 0 && (
                                            <Progress value={(subtasks.filter(s => s.isCompleted).length / subtasks.length) * 100} className="h-2 mb-6 bg-muted border border-border/40 rounded-full overflow-hidden" />
                                        )}

                                        {!Array.isArray(subtasks) || subtasks.length === 0 ? (
                                            <div className="text-center py-8 border-2 border-dashed border-border/60 rounded-xl mb-4 bg-muted/10 hover:bg-muted/30 transition-colors">
                                                <div className="flex justify-center mb-3">
                                                    <div className="bg-background p-2.5 rounded-full border border-border shadow-sm">
                                                        <ListChecks className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                </div>
                                                <p className="text-sm font-medium text-foreground">No subtasks yet</p>
                                                <p className="text-xs text-muted-foreground mt-1">Break down this task into smaller chunks.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 mb-6">
                                                {Array.isArray(subtasks) && subtasks.map((st) => (
                                                    <div key={st._id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 group ${st.isCompleted ? 'bg-muted/30 border-transparent' : 'bg-card border-border/50 hover:border-primary/40 shadow-sm'}`}>
                                                        <button
                                                            onClick={() => handleToggleSubtask(st._id)}
                                                            className={`h-5 w-5 shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-all ${st.isCompleted ? 'bg-primary border-primary' : 'border-muted-foreground hover:border-primary'}`}
                                                        >
                                                            {st.isCompleted && <Check className="h-3 w-3 text-primary-foreground" />}
                                                        </button>
                                                        <span className={`text-sm flex-1 break-words transition-all duration-300 ${st.isCompleted ? 'text-muted-foreground line-through opacity-70' : 'text-foreground font-medium'}`}>
                                                            {st.title}
                                                        </span>
                                                        <button onClick={() => handleDeleteSubtask(st._id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <form onSubmit={handleAddSubtask} className="flex items-center gap-3 p-1">
                                            <Plus className="h-4 w-4 text-muted-foreground ml-2" />
                                            <input
                                                className="text-sm bg-transparent outline-none flex-1 placeholder:text-muted-foreground text-foreground border-b border-transparent focus:border-primary/50 py-1 transition-colors"
                                                placeholder={subtasks.length === 0 ? "Add your first subtask..." : "Add another subtask..."}
                                                value={newSubtask}
                                                onChange={e => setNewSubtask(e.target.value)}
                                            />
                                        </form>
                                    </div>

                                    <Separator className="bg-border/60" />

                                    {/* Child Tasks (Real Sub-task Documents) */}
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-muted p-1.5 rounded-md"><GitBranch className="w-4 h-4 text-primary" /></div>
                                                <h3 className="text-sm font-semibold text-foreground tracking-wide">Sub-tasks</h3>
                                                {childTasks.length > 0 && (
                                                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{childTasks.length}</span>
                                                )}
                                            </div>
                                        </div>

                                        {childTasks.length > 0 && (
                                            <div className="space-y-2 mb-4">
                                                {childTasks.map(child => (
                                                    <div key={child._id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${
                                                        child.status === 'done' ? 'bg-muted/30 border-transparent' : 'bg-card border-border/50 hover:border-primary/40 shadow-sm'
                                                    }`}>
                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                                                            child.status === 'done' ? 'bg-green-500' : child.status === 'in-progress' ? 'bg-blue-500' : 'bg-slate-400'
                                                        }`} />
                                                        <span className={`text-sm flex-1 break-words ${
                                                            child.status === 'done' ? 'text-muted-foreground line-through opacity-70' : 'text-foreground font-medium'
                                                        }`}>{child.title}</span>
                                                        {child.assignee && (
                                                            <UIAvatar className="h-5 w-5 border border-border">
                                                                <AvatarImage src={child.assignee.avatar} />
                                                                <AvatarFallback className="text-[8px]">{child.assignee.name?.charAt(0)}</AvatarFallback>
                                                            </UIAvatar>
                                                        )}
                                                        <Badge variant="outline" className="text-[9px] capitalize h-5">{child.status?.replace('-', ' ')}</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <form onSubmit={handleCreateChildTask} className="flex items-center gap-3 p-1">
                                            <Plus className="h-4 w-4 text-muted-foreground ml-2" />
                                            <input
                                                className="text-sm bg-transparent outline-none flex-1 placeholder:text-muted-foreground text-foreground border-b border-transparent focus:border-primary/50 py-1 transition-colors"
                                                placeholder={childTasks.length === 0 ? 'Add a sub-task with its own status & assignee...' : 'Add another sub-task...'}
                                                value={newChildTitle}
                                                onChange={e => setNewChildTitle(e.target.value)}
                                                disabled={isCreatingChild}
                                            />
                                        </form>
                                    </div>

                                    <Separator className="bg-border/60" />

                                    {/* Attachments */}
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-muted p-1.5 rounded-md"><Paperclip className="w-4 h-4 text-primary" /></div>
                                                <h3 className="text-sm font-semibold text-foreground tracking-wide">Attachments</h3>
                                                {attachments.length > 0 && (
                                                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{attachments.length}</span>
                                                )}
                                            </div>
                                            <label className="cursor-pointer text-xs font-medium px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 active:scale-95">
                                                {isUploading ? <span className="animate-pulse">Uploading...</span> : <><Plus className="w-3 h-3" /> Upload File</>}
                                                <input type="file" className="hidden" onChange={handleFileUpload} multiple disabled={isUploading} />
                                            </label>
                                        </div>

                                        {attachments.length === 0 ? (
                                            <div className="text-center py-8 border-2 border-dashed border-border/60 rounded-xl bg-muted/10 hover:bg-muted/30 transition-colors">
                                                <div className="flex justify-center mb-3">
                                                    <div className="bg-background p-2.5 rounded-full border border-border shadow-sm">
                                                        <Paperclip className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                </div>
                                                <p className="text-sm font-medium text-foreground">No attachments yet</p>
                                                <p className="text-xs text-muted-foreground mt-1">Upload files related to this task.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {attachments.map((file) => (
                                                    <div key={file._id} className="relative group">
                                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all">
                                                            <div className="h-10 w-10 bg-muted/50 rounded-lg flex items-center justify-center text-primary shrink-0">
                                                                {file.type?.includes('image') ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-foreground truncate">{file.filename}</p>
                                                                <p className="text-[10px] text-muted-foreground mt-0.5">Attached {new Date(file.uploadedAt).toLocaleDateString()}</p>
                                                            </div>
                                                        </a>
                                                        <button
                                                            onClick={() => handleDeleteAttachment(file._id)}
                                                            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-background border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all shadow-sm"
                                                            title="Remove attachment"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        {/* RIGHT: ACTIVITY SIDEBAR */}
                        <TabsContent value="activity" forceMount={true} className="m-0 lg:w-[380px] xl:w-[420px] h-full lg:border-l border-border bg-card lg:order-2 data-[state=inactive]:hidden lg:data-[state=inactive]:flex flex-col shrink-0 overflow-hidden focus-visible:outline-none">
                            <div className="flex-1 flex flex-col min-h-0 bg-background/50 h-full">
                                <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-2 shrink-0">
                                    <History className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-bold text-foreground uppercase tracking-widest">Activity & Chat</span>
                                </div>

                                <ScrollArea className="flex-1 p-4 lg:p-5">
                                    <div className="space-y-6">
                                        {timeline.length === 0 && (
                                            <div className="flex flex-col items-center justify-center text-center py-12 px-4 opacity-50">
                                                <History className="w-8 h-8 mb-3 text-muted-foreground/50" />
                                                <p className="text-sm font-medium text-foreground">Quiet here...</p>
                                                <p className="text-xs text-muted-foreground mt-1">Be the first to leave a comment.</p>
                                            </div>
                                        )}

                                        {timeline.map((item) => (
                                            <div key={item._id || Math.random()} className="flex gap-3 text-sm group">
                                                <div className="shrink-0 pt-1">
                                                    <Avatar user={item.user || item.performer} />
                                                </div>
                                                <div className="flex-1 space-y-1.5 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-semibold text-foreground text-xs truncate">
                                                            {item.user?.name || item.performer?.name}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 font-medium">
                                                            {item.createdAt ? format(new Date(item.createdAt), "MMM d, h:mm a") : ''}
                                                        </span>
                                                    </div>
                                                    {item.type === 'comment' ? (
                                                        <div className="bg-muted/40 p-3.5 rounded-2xl rounded-tl-sm border border-border/50 text-foreground shadow-sm">
                                                            <p className="whitespace-pre-wrap leading-relaxed text-[13px]">{renderMentions(item.content)}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-muted-foreground flex items-center gap-2 bg-background p-2 rounded-lg border border-border/30">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                                                            <span className="truncate">{formatActivityAction ? formatActivityAction(item) : "Action performed"}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>

                                <div className="p-4 border-t border-border bg-card shrink-0">
                                    {/* Typing Indicator */}
                                    {typingUsers.length > 0 && (
                                        <div className="flex items-center gap-2 mb-2 px-2 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex -space-x-1.5 overflow-hidden">
                                                {typingUsers.slice(0, 3).map((u) => (
                                                    <img 
                                                        key={u._id} 
                                                        src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=random`} 
                                                        className="inline-block h-4 w-4 rounded-full ring-2 ring-background grayscale opacity-70"
                                                        alt={u.name}
                                                    />
                                                ))}
                                            </div>
                                            <span>
                                                {typingUsers.length === 1 && `${typingUsers[0].name.split(' ')[0]} is typing...`}
                                                {typingUsers.length === 2 && `${typingUsers[0].name.split(' ')[0]} and ${typingUsers[1].name.split(' ')[0]} are typing...`}
                                                {typingUsers.length > 2 && `${typingUsers.length} people are typing...`}
                                            </span>
                                            <span className="flex gap-0.5 ml-1">
                                                <span className="animate-[bounce_1s_infinite] text-primary delay-75">.</span>
                                                <span className="animate-[bounce_1s_infinite] text-primary delay-150">.</span>
                                                <span className="animate-[bounce_1s_infinite] text-primary delay-300">.</span>
                                            </span>
                                        </div>
                                    )}
                                    <form onSubmit={handleSendComment} className="relative group">
                                        <MentionInput
                                            value={newComment}
                                            onChange={handleCommentChange}
                                            users={Array.isArray(teamMembers) ? teamMembers.map(m => m.user).filter(Boolean) : []}
                                            placeholder="Write a comment... Type @ to mention"
                                            className="pr-12 bg-background border-border focus-visible:ring-primary/40 shadow-sm transition-all text-sm rounded-xl py-3"
                                            onSubmit={handleSendComment}
                                        />
                                        <Button 
                                            size="sm" 
                                            type="submit" 
                                            disabled={!newComment.trim()} 
                                            className="absolute bottom-2.5 right-2.5 h-8 w-8 p-0 rounded-lg shadow-sm transition-all group-focus-within:bg-primary"
                                        >
                                            <div className="-rotate-90"><AlignLeft className="w-3.5 h-3.5" /></div>
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        </TabsContent>

                    </Tabs>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Change Assignee?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to assign this task to <strong>{pendingAssignee?.name}</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingAssignee(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmAssignment}>Confirm Assignment</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}