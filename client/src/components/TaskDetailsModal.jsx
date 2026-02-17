import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
    User as UserIcon, Check, MoreHorizontal, Trash2, Paperclip, FileText,
    Image as ImageIcon, Link2, Link2Off, AlertCircle, X, Plus,
    AlignLeft, Layout, Clock, CheckCircle2, ListChecks, History, Tag, Repeat,
    Calendar as CalendarIcon
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

import { formatActivityAction } from '../utils/formatActivity';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
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

    const [newComment, setNewComment] = useState('');
    const [newSubtask, setNewSubtask] = useState('');
    const [assignee, setAssignee] = useState(task?.assignee);
    const [startDate, setStartDate] = useState(task?.startDate ? new Date(task.startDate) : null);
    const [dueDate, setDueDate] = useState(task?.dueDate ? new Date(task.dueDate) : null);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [descInput, setDescInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const [openUserSelect, setOpenUserSelect] = useState(false);
    const [isDependencySearchOpen, setIsDependencySearchOpen] = useState(false);
    const [projectTasks, setProjectTasks] = useState([]);

    const [currentStatus, setCurrentStatus] = useState(task?.status || 'todo');
    const [currentPriority, setCurrentPriority] = useState(task?.priority || 'medium');

    const [pendingAssignee, setPendingAssignee] = useState(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);

    // --- 2. EFFECTS ---
    useEffect(() => {
        if (isOpen && task) {
            api.get(`/comments/${task._id}`).then(({ data }) => setComments(data)).catch(() => { });
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
        }
    }, [isOpen, task, orgId]);

    useEffect(() => {
        if (isDependencySearchOpen && projectTasks.length === 0 && task) {
            api.get(`/tasks/project/${projectId}`).then(({ data }) => {
                setProjectTasks(data.filter(t => t._id !== task._id));
            });
        }
    }, [isDependencySearchOpen, projectId, task]);

    useEffect(() => {
        if (!socket || !task) return;

        const handleNewComment = (comment) => {
            if (comment.task === task._id) setComments((prev) => [...prev, comment]);
        };
        const handleNewActivity = (activity) => {
            if (activity.task === task._id) setActivities((prev) => [activity, ...prev]);
        };
        const handleOnlineUsers = (users) => {
            setOnlineUsers(users);
        };

        socket.on('receive_new_comment', handleNewComment);
        socket.on('new_activity', handleNewActivity);
        socket.on('get_online_users', handleOnlineUsers);

        return () => {
            socket.off('receive_new_comment', handleNewComment);
            socket.off('new_activity', handleNewActivity);
            socket.off('get_online_users', handleOnlineUsers);
        };
    }, [socket, task]);

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

                    {/* HEADER */}
                    <div className="bg-card border-b border-border p-3 md:p-4 px-4 md:px-6 flex justify-between items-center shrink-0 min-h-[56px] md:h-16">
                        <div className="flex items-center gap-2 md:gap-3 text-muted-foreground overflow-hidden">
                            <Badge variant="outline" className="rounded-md font-mono text-[10px] md:text-xs shrink-0">{task.project?.name || 'Project'}</Badge>
                            <span className="text-sm hidden md:inline">/</span>
                            <span className="text-xs md:text-sm font-medium font-mono truncate">TASK-{task._id.slice(-4)}</span>
                        </div>

                        <div className="flex items-center gap-2">
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

                    {/* SPLIT VIEW - Stack on mobile, side-by-side on desktop */}
                    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

                        {/* LEFT: CONTENT */}
                        <ScrollArea className="flex-1 bg-background p-4 md:p-8 order-1">
                            <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-20">
                                <DialogTitle className="text-xl md:text-3xl font-bold text-foreground leading-tight">{task.title}</DialogTitle>

                                {/* Description */}
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
                                                className="min-h-[150px] bg-card resize-none"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={handleSaveDescription}>Save</Button>
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
                                            {subtasks.length > 0 ? `${Math.round((subtasks.filter(s => s.isCompleted).length / subtasks.length) * 100)}%` : '0%'}
                                        </span>
                                    </div>

                                    {Array.isArray(subtasks) && subtasks.length > 0 && (
                                        <Progress value={(subtasks.filter(s => s.isCompleted).length / subtasks.length) * 100} className="h-1.5 mb-6" />
                                    )}

                                    {!Array.isArray(subtasks) || subtasks.length === 0 ? (
                                        <div className="text-center py-6 border-2 border-dashed border-border/60 rounded-xl mb-4 bg-muted/5">
                                            <div className="flex justify-center mb-2">
                                                <div className="bg-background p-2 rounded-full border border-border shadow-sm">
                                                    <ListChecks className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            </div>
                                            <p className="text-xs font-medium text-foreground">No subtasks yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1 mb-4">
                                            {Array.isArray(subtasks) && subtasks.map((st) => (
                                                <div key={st._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 group transition-colors">
                                                    <button
                                                        onClick={() => handleToggleSubtask(st._id)}
                                                        className={`h-5 w-5 rounded border flex items-center justify-center transition-all ${st.isCompleted ? 'bg-primary border-primary' : 'border-muted-foreground hover:border-primary'}`}
                                                    >
                                                        {st.isCompleted && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                                                    </button>
                                                    <span className={`text-sm flex-1 ${st.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                                        {st.title}
                                                    </span>
                                                    <button onClick={() => handleDeleteSubtask(st._id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <form onSubmit={handleAddSubtask} className="flex items-center gap-3 pl-2">
                                        <Plus className="h-4 w-4 text-muted-foreground" />
                                        <input
                                            className="text-sm bg-transparent outline-none flex-1 placeholder:text-muted-foreground/60 text-foreground"
                                            placeholder={subtasks.length === 0 ? "Add your first subtask..." : "Add another subtask..."}
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
                                            {attachments.length > 0 && (
                                                <span className="text-xs text-muted-foreground">({attachments.length})</span>
                                            )}
                                        </div>
                                        <label className="cursor-pointer text-xs font-medium px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition flex items-center gap-2">
                                            {isUploading ? <span className="animate-pulse">Uploading...</span> : <><Plus className="w-3 h-3" /> Add</>}
                                            <input type="file" className="hidden" onChange={handleFileUpload} multiple disabled={isUploading} />
                                        </label>
                                    </div>

                                    {attachments.length === 0 ? (
                                        <div className="text-center py-6 border-2 border-dashed border-border/60 rounded-xl bg-muted/5">
                                            <div className="flex justify-center mb-2">
                                                <div className="bg-background p-2 rounded-full border border-border shadow-sm">
                                                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            </div>
                                            <p className="text-xs font-medium text-foreground">No attachments yet</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">Click Add to attach files</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {attachments.map((file) => (
                                                <div key={file._id} className="relative group">
                                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition">
                                                        <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground shrink-0">
                                                            {file.type?.includes('image') ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-foreground truncate">{file.filename}</p>
                                                            <p className="text-[10px] text-muted-foreground">Attached {new Date(file.uploadedAt).toLocaleDateString()}</p>
                                                        </div>
                                                    </a>
                                                    <button
                                                        onClick={() => handleDeleteAttachment(file._id)}
                                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-background border border-border text-muted-foreground hover:text-red-500 hover:border-red-200 transition-all shadow-sm"
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

                        {/* RIGHT: SIDEBAR - Full width on mobile, fixed on desktop */}
                        <div className="w-full lg:w-[350px] bg-muted/10 border-t lg:border-t-0 lg:border-l border-border flex flex-col shrink-0 order-2 lg:order-none max-h-[40vh] lg:max-h-none overflow-y-auto lg:overflow-visible">

                            {/* Properties */}
                            <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto lg:max-h-[50%] border-b border-border">
                                {/* Status */}
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-2"><Layout className="w-3.5 h-3.5" /> Status</span>
                                    <div className="col-span-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" className="w-full justify-start h-8 font-normal capitalize">
                                                    <div className={`w-2 h-2 rounded-full mr-2 ${currentStatus === 'done' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                                                    {/* FIX 1: Safe Replace */}
                                                    {String(currentStatus || 'todo').replace(/-/g, ' ')}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[200px]">
                                                {['todo', 'in-progress', 'review', 'done'].map(s => (
                                                    <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)} className="capitalize">{String(s).replace(/-/g, ' ')}</DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* Priority */}
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" /> Priority</span>
                                    <div className="col-span-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger className="focus:outline-none w-full text-left">
                                                <div className="w-full border border-input bg-background hover:bg-accent px-3 py-1.5 rounded-md flex items-center text-sm h-8">
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
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-2"><UserIcon className="w-3.5 h-3.5" /> Assignee</span>
                                    <div className="col-span-2">
                                        <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="sm" className="w-full justify-start h-8 font-normal px-2">
                                                    {assignee ? (
                                                        <div className="flex items-center gap-2">
                                                            <UIAvatar className="h-5 w-5"><AvatarImage src={assignee.avatar} /><AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback></UIAvatar>
                                                            <span className="truncate">{assignee.name}</span>
                                                        </div>
                                                    ) : <span className="text-muted-foreground">Unassigned</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[220px] p-0" align="end">
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
                                </div>

                                {/* Start Date */}
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-2"><CalendarIcon className="w-3.5 h-3.5" /> Start Date</span>
                                    <div className="col-span-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="sm" className={`w-full justify-start h-8 font-normal ${!startDate && "text-muted-foreground"}`}>
                                                    {startDate ? format(startDate, "MMM d, yyyy") : <span>No start date</span>}
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
                                </div>

                                {/* Due Date */}
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Due Date</span>
                                    <div className="col-span-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="sm" className={`w-full justify-start h-8 font-normal ${!dueDate && "text-muted-foreground"}`}>
                                                    {dueDate ? format(dueDate, "MMM d, yyyy") : <span>No date</span>}
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
                                </div>

                                {/* Tags */}
                                <div className="grid grid-cols-3 items-start gap-4">
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-2 pt-1"><Tag className="w-3.5 h-3.5" /> Tags</span>
                                    <div className="col-span-2">
                                        <TagPicker
                                            taskId={task._id}
                                            tags={tags}
                                            onTagsChange={setTags}
                                        />
                                    </div>
                                </div>

                                {/* Recurrence */}
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-2"><Repeat className="w-3.5 h-3.5" /> Repeat</span>
                                    <div className="col-span-2">
                                        <RecurrencePicker
                                            taskId={task._id}
                                            recurrence={recurrence}
                                            onRecurrenceChange={setRecurrence}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                {/* Dependencies */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-2"><Link2 className="w-3.5 h-3.5" /> Blocking</span>
                                        <Popover open={isDependencySearchOpen} onOpenChange={setIsDependencySearchOpen}>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-muted"><Plus className="w-3 h-3" /></Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[250px] p-0" align="end">
                                                <Command>
                                                    <CommandInput placeholder="Search tasks..." />
                                                    <CommandGroup>
                                                        {Array.isArray(projectTasks) && projectTasks.length === 0 && <div className="p-3 text-xs text-muted-foreground text-center">No other tasks in project</div>}
                                                        {Array.isArray(projectTasks) && projectTasks.slice(0, 8).map((t) => (
                                                            <CommandItem key={t._id} onSelect={() => handleAddDependency(t._id)}>{t.title}</CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {!Array.isArray(dependencies) || dependencies.length === 0 ? (
                                        <div className="text-center py-4 border-2 border-dashed border-border/60 rounded-xl bg-muted/5">
                                            <p className="text-[10px] font-medium text-muted-foreground">No dependencies</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {dependencies.map(dep => (
                                                <div key={dep._id} className="flex items-center justify-between p-2 rounded-md bg-background border border-border text-xs shadow-sm">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        {dep.status !== 'done' ? <AlertCircle className="w-3 h-3 text-orange-500 shrink-0" /> : <Check className="w-3 h-3 text-green-500 shrink-0" />}
                                                        <span className={`truncate ${dep.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{dep.title}</span>
                                                    </div>
                                                    <button onClick={() => handleRemoveDependency(dep._id)} className="text-muted-foreground hover:text-red-500 transition-colors"><Link2Off className="w-3 h-3" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ACTIVITY & CHAT FEED */}
                            <div className="flex-1 flex flex-col min-h-0 bg-background hidden lg:flex">
                                <div className="p-3 border-b border-border bg-muted/20 flex items-center gap-2">
                                    <History className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity</span>
                                </div>

                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-6">
                                        {timeline.length === 0 && (
                                            <div className="text-center text-xs text-muted-foreground py-8 opacity-50">
                                                No activity yet.
                                            </div>
                                        )}

                                        {timeline.map((item) => (
                                            <div key={item._id || Math.random()} className="flex gap-3 text-sm group">
                                                <div className="shrink-0 pt-1">
                                                    <Avatar user={item.user || item.performer} />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold text-foreground text-xs">
                                                            {item.user?.name || item.performer?.name}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground tabular-nums">
                                                            {item.createdAt ? format(new Date(item.createdAt), "MMM d, h:mm a") : ''}
                                                        </span>
                                                    </div>
                                                    {item.type === 'comment' ? (
                                                        <div className="bg-muted/30 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-border/50 text-foreground shadow-sm">
                                                            <p className="whitespace-pre-wrap leading-relaxed">{renderMentions(item.content)}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                            <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                                                            {/* FIX 2: Check if helper function exists and is safe */}
                                                            {formatActivityAction ? formatActivityAction(item) : "Action performed"}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>

                                <div className="p-4 border-t border-border bg-background mt-auto">
                                    <form onSubmit={handleSendComment} className="relative">
                                        <MentionInput
                                            value={newComment}
                                            onChange={setNewComment}
                                            users={Array.isArray(teamMembers) ? teamMembers.map(m => m.user).filter(Boolean) : []}
                                            placeholder="Write a comment... Use @ to mention someone"
                                            className="pr-12 bg-muted/20 focus:bg-background transition-all"
                                            onSubmit={handleSendComment}
                                        />
                                        <Button size="sm" type="submit" disabled={!newComment.trim()} className="absolute bottom-2 right-2 h-7 w-7 p-0 rounded-lg">
                                            <div className="-rotate-90"><AlignLeft className="w-3 h-3" /></div>
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
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