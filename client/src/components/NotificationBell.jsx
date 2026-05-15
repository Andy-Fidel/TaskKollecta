import { Fragment, useEffect, useMemo, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  AtSign,
  Bell,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  MessageCircle,
  Reply,
  Send,
  Trash2,
  UserPlus,
  Zap,
} from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, differenceInCalendarDays } from 'date-fns';
import { 
  Popover, PopoverContent, PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from '../api/axios';
import { useAuth } from '../context/useAuth';
import { SocketContext } from '../context/socketContextDef';

const NOTIFICATION_META = {
  task_assigned: {
    label: 'Assignment',
    Icon: UserPlus,
    iconClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  },
  new_comment: {
    label: 'Comment',
    Icon: MessageCircle,
    iconClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  mention: {
    label: 'Mention',
    Icon: AtSign,
    iconClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
    badgeClass: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  due_date: {
    label: 'Due date',
    Icon: CalendarClock,
    iconClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  task_status_change: {
    label: 'Status',
    Icon: CheckCircle2,
    iconClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300',
    badgeClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  },
  automation: {
    label: 'Automation',
    Icon: Zap,
    iconClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-300',
    badgeClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  },
};

const FALLBACK_NOTIFICATION_META = {
  label: 'Update',
  Icon: Bell,
  iconClass: 'bg-muted text-muted-foreground',
  badgeClass: 'bg-muted text-muted-foreground',
};

const getNotificationGroup = (createdAt) => {
  const date = new Date(createdAt);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (differenceInCalendarDays(new Date(), date) < 7) return 'This week';
  return 'Earlier';
};

export function NotificationBell() {
  const { user } = useAuth();
  const { socket } = useContext(SocketContext);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('unread');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !socket) return;
    const handleNewNotification = (newNotif) => {
      if (!newNotif?._id) return;
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    };
    socket.on('new_notification', handleNewNotification);
    return () => socket.off('new_notification', handleNewNotification);
  }, [user, socket]);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        setError('');
        const { data } = await api.get('/notifications');
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } catch {
        setError('Notifications could not be loaded.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleOpenChange = (open) => {
    setIsOpen(open);
  };

  const handleUpdateStatus = async (e, id, status) => {
      e.stopPropagation();
      try {
          const notif = notifications.find(n => n._id === id);
          const wasUnread = notif.status === 'unread' || (!notif.status && !notif.isRead);

          await api.put(`/notifications/${id}/status`, { status });
          
          if (wasUnread && (status === 'read' || status === 'archived')) {
             setUnreadCount(prev => Math.max(0, prev - 1));
          } else if (!wasUnread && status === 'unread') {
             setUnreadCount(prev => prev + 1);
          }
          
          setNotifications(prev => prev.map(n => n._id === id ? { ...n, status, isRead: status !== 'unread' } : n));
      } catch { console.error("Failed to update status"); }
  };

  const handleClearOne = async (e, id) => {
      e.stopPropagation(); 
      try {
          const notif = notifications.find(n => n._id === id);
          const wasUnread = notif.status === 'unread' || (!notif.status && !notif.isRead);
          
          await api.delete(`/notifications/${id}`);
          setNotifications(prev => prev.filter(n => n._id !== id));
          
          if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
      } catch { console.error("Failed to delete"); }
  };

  const handleMarkAllRead = async () => {
      try {
          await api.put('/notifications/read');
          setNotifications(prev => prev.map(n => (
            n.status === 'archived' ? n : { ...n, status: 'read', isRead: true }
          )));
          setUnreadCount(0);
      } catch { console.error("Failed to mark notifications as read"); }
  };

  const navigateToNotificationTarget = async (notif) => {
      if (notif.actionUrl) {
          const state = notif.relatedModel === 'Task' ? { openTaskId: notif.relatedId } : undefined;
          navigate(notif.actionUrl, { state });
          return;
      }

      if (notif.relatedModel === 'Project' && notif.relatedId) {
          navigate(`/project/${notif.relatedId}`);
          return;
      }

      if (notif.relatedModel === 'Task' && notif.relatedId) {
          try {
              const { data } = await api.get(`/tasks/single/${notif.relatedId}`);
              const targetProject = data.project?._id || data.project || data.projectMemberships?.[0]?.project?._id;
              if (targetProject) {
                  navigate(`/project/${targetProject}`, { state: { openTaskId: notif.relatedId } });
              } else {
                  navigate('/tasks');
              }
          } catch {
              navigate('/tasks');
          }
      }
  };

  const handleOpenNotification = async (notif) => {
      const isUnread = notif.status === 'unread' || (!notif.status && !notif.isRead);
      if (isUnread) {
          try {
              await api.put(`/notifications/${notif._id}/status`, { status: 'read' });
              setUnreadCount(prev => Math.max(0, prev - 1));
              setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, status: 'read', isRead: true } : n));
          } catch { /* preserve navigation even if read sync fails */ }
      }
      setIsOpen(false);
      await navigateToNotificationTarget(notif);
  };

  const handleReply = async (e, notif) => {
      e.preventDefault();
      if (!replyText.trim() || !notif.relatedId) return;
      try {
          await api.post('/comments', { taskId: notif.relatedId, content: replyText });
	          // Emit socket event for real-time
	          if (socket) {
	              socket.emit('new_comment', {
                    taskId: notif.relatedId,
                    projectId: notif.relatedProject,
                    comment: { content: replyText, user },
                  });
	          }
          // Auto-mark as read
          const isUnread = notif.status === 'unread' || (!notif.status && !notif.isRead);
          if (isUnread) {
              await api.put(`/notifications/${notif._id}/status`, { status: 'read' });
              setUnreadCount(prev => Math.max(0, prev - 1));
              setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, status: 'read', isRead: true } : n));
          }
          setReplyText('');
          setReplyingTo(null);
      } catch { console.error("Failed to send reply"); }
  };

  const displayedNotifications = notifications.filter(n => {
      const isUnread = n.status === 'unread' || (!n.status && !n.isRead);
      const isArchived = n.status === 'archived';
      
      if (activeTab === 'unread') return isUnread;
      if (activeTab === 'archived') return isArchived;
      if (activeTab === 'all') return !isArchived; 
      return true;
  });

  const groupedNotifications = useMemo(() => {
      const groups = [];
      for (const notification of displayedNotifications) {
          const label = getNotificationGroup(notification.createdAt);
          const currentGroup = groups[groups.length - 1];
          if (currentGroup?.label === label) {
              currentGroup.notifications.push(notification);
          } else {
              groups.push({ label, notifications: [notification] });
          }
      }
      return groups;
  }, [displayedNotifications]);

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="relative p-2 text-slate-400 hover:text-foreground transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse"></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 mr-4 bg-card border-border shadow-xl flex flex-col" align="end">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20 shrink-0">
           <div className="flex items-center gap-2">
               <h4 className="font-bold text-sm text-foreground">Inbox</h4>
               {unreadCount > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 h-5">{unreadCount} New</Badge>}
           </div>
           {unreadCount > 0 && (
               <TooltipProvider>
                   <Tooltip>
                       <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleMarkAllRead}>
                               <CheckCheck className="w-3.5 h-3.5" />
                           </Button>
                       </TooltipTrigger>
                       <TooltipContent><p>Mark all as read</p></TooltipContent>
                   </Tooltip>
               </TooltipProvider>
           )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2 border-b border-border bg-card shrink-0">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 h-8">
              <TabsTrigger value="unread" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">Unread</TabsTrigger>
              <TabsTrigger value="all" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">All</TabsTrigger>
              <TabsTrigger value="archived" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">Archived</TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="h-[350px] flex-1">
             {isLoading ? (
                 <div className="p-8 text-center text-sm text-muted-foreground">Loading notifications...</div>
             ) : error ? (
                 <div className="p-8 text-center text-sm text-destructive">{error}</div>
             ) : displayedNotifications.length === 0 ? (
                 <div className="p-8 text-center flex flex-col items-center justify-center h-full text-muted-foreground/60">
                    <CheckCheck className="w-10 h-10 mb-3 opacity-20" />
                    <span className="text-sm font-medium">No notifications here</span>
                    <span className="text-xs mt-1">You're all caught up!</span>
                 </div>
             ) : (
	                 <div className="divide-y divide-border">
	                    {groupedNotifications.map((group) => (
                          <Fragment key={group.label}>
                            <div className="sticky top-0 z-10 bg-card/95 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                              {group.label}
                            </div>
	                    {group.notifications.map((notif) => {
	                        const isUnread = notif.status === 'unread' || (!notif.status && !notif.isRead);
                          const meta = NOTIFICATION_META[notif.type] || FALLBACK_NOTIFICATION_META;
                          const TypeIcon = meta.Icon;
	                        
	                        return (
	                            <div
	                              key={notif._id}
                              role="button"
                              tabIndex={0}
                              className={`group relative w-full p-4 flex gap-3 text-left hover:bg-muted/40 transition-colors ${isUnread ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                              onClick={() => handleOpenNotification(notif)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  handleOpenNotification(notif);
                                }
                              }}
	                            >
	                                <div className="relative shrink-0">
	                                  <Avatar className="h-9 w-9 mt-0.5 border border-border/50">
	                                      <AvatarImage src={notif.sender?.avatar} />
	                                      <AvatarFallback className="text-xs bg-muted text-muted-foreground">{notif.sender?.name?.charAt(0) || '?'}</AvatarFallback>
	                                  </Avatar>
                                    <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-background ${meta.iconClass}`}>
                                      <TypeIcon className="h-3 w-3" />
                                    </span>
	                                </div>
	                                
	                                {/* Content */}
	                                <div className="space-y-1.5 pr-2 flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}>
                                        {meta.label}
                                      </span>
                                      {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Unread" />}
                                    </div>
	                                    <p className="text-xs text-muted-foreground leading-relaxed break-words">
	                                        <span className="font-semibold text-foreground">{notif.sender?.name}</span> {notif.message}
	                                    </p>
                                    <p className="text-[10px] text-muted-foreground/70 font-medium">
                                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                    </p>

                                    {/* Inline Reply for new_comment */}
                                    {notif.type === 'new_comment' && replyingTo === notif._id && (
                                        <form onSubmit={(e) => handleReply(e, notif)} className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                                            <input
                                                className="flex-1 text-xs bg-muted/50 border border-border/50 rounded-md px-2.5 py-1.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground transition-all"
                                                placeholder="Write a reply..."
                                                value={replyText}
                                                onChange={e => setReplyText(e.target.value)}
                                                autoFocus
                                            />
                                            <Button type="submit" size="icon" className="h-7 w-7 shrink-0" disabled={!replyText.trim()}>
                                                <Send className="w-3 h-3" />
                                            </Button>
                                        </form>
                                    )}
                                </div>
      
                                {/* Actions (Visible on Hover) */}
                                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-background/90 backdrop-blur-sm border border-border/50 p-1 rounded-md shadow-sm transition-opacity">
                                  {isUnread ? (
                                      <TooltipProvider>
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={(e) => handleUpdateStatus(e, notif._id, 'read')}>
                                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                                  </Button>
                                              </TooltipTrigger>
                                              <TooltipContent side="bottom" className="text-xs">Mark as read</TooltipContent>
                                          </Tooltip>
                                      </TooltipProvider>
                                  ) : (
                                      notif.status !== 'archived' && (
                                          <TooltipProvider>
                                              <Tooltip>
                                                  <TooltipTrigger asChild>
                                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={(e) => handleUpdateStatus(e, notif._id, 'unread')}>
                                                          <Bell className="w-3.5 h-3.5" />
                                                      </Button>
                                                  </TooltipTrigger>
                                                  <TooltipContent side="bottom" className="text-xs">Mark as unread</TooltipContent>
                                              </Tooltip>
                                          </TooltipProvider>
                                      )
                                  )}
                                  
                                  {notif.status !== 'archived' && (
                                      <TooltipProvider>
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10" onClick={(e) => handleUpdateStatus(e, notif._id, 'archived')}>
                                                      <Archive className="w-3.5 h-3.5" />
                                                  </Button>
                                              </TooltipTrigger>
                                              <TooltipContent side="bottom" className="text-xs">Archive</TooltipContent>
                                          </Tooltip>
                                      </TooltipProvider>
                                  )}
                                  
                                  <TooltipProvider>
                                      <Tooltip>
                                          <TooltipTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={(e) => handleClearOne(e, notif._id)}>
                                                  <Trash2 className="w-3.5 h-3.5" />
                                              </Button>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" className="text-xs">Delete</TooltipContent>
                                      </Tooltip>
                                  </TooltipProvider>

                                  {/* Reply button for comments */}
                                  {notif.type === 'new_comment' && notif.relatedModel === 'Task' && (
                                      <TooltipProvider>
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10" onClick={(e) => { e.stopPropagation(); setReplyingTo(replyingTo === notif._id ? null : notif._id); setReplyText(''); }}>
                                                      <Reply className="w-3.5 h-3.5" />
                                                  </Button>
                                              </TooltipTrigger>
                                              <TooltipContent side="bottom" className="text-xs">Reply</TooltipContent>
                                          </Tooltip>
                                      </TooltipProvider>
                                  )}

                                </div>
	                            </div>
	                        );
	                    })}
                          </Fragment>
                        ))}
	                 </div>
	             )}
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
