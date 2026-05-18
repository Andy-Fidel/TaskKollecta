import { Fragment, useCallback, useEffect, useMemo, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  AtSign,
  Bell,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  Clock,
  MessageCircle,
  Reply,
  RefreshCw,
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
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
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

  const fetchNotifications = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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

  const handleSnooze = async (e, id, snoozedUntil) => {
      e.stopPropagation();
      try {
          const notif = notifications.find(n => n._id === id);
          const wasUnread = notif.status === 'unread' || (!notif.status && !notif.isRead);

          await api.put(`/notifications/${id}/status`, { status: 'snoozed', snoozedUntil: snoozedUntil.toISOString() });
          setNotifications(prev => prev.map(n => n._id === id ? { ...n, status: 'snoozed', isRead: true, snoozedUntil: snoozedUntil.toISOString() } : n));
          if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {
          setError('Notification could not be snoozed.');
      }
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

  const handleArchiveDisplayed = async () => {
      const targets = displayedNotifications.filter((notification) => notification.status !== 'archived');
      if (targets.length === 0) return;
      setIsBulkUpdating(true);
      try {
          await Promise.all(targets.map((notification) => api.put(`/notifications/${notification._id}/status`, { status: 'archived' })));
          const unreadArchived = targets.filter((notification) => notification.status === 'unread' || (!notification.status && !notification.isRead)).length;
          setNotifications(prev => prev.map(n => targets.some(target => target._id === n._id) ? { ...n, status: 'archived', isRead: true } : n));
          setUnreadCount(prev => Math.max(0, prev - unreadArchived));
      } catch {
          setError('Some notifications could not be archived.');
      } finally {
          setIsBulkUpdating(false);
      }
  };

  const handleClearAll = async () => {
      if (notifications.length === 0) return;
      setIsBulkUpdating(true);
      try {
          await api.delete('/notifications');
          setNotifications([]);
          setUnreadCount(0);
      } catch {
          setError('Notifications could not be cleared.');
      } finally {
          setIsBulkUpdating(false);
      }
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
      if (activeTab === 'all') return !isArchived && n.status !== 'snoozed'; 
      return true;
  });

  const tabCounts = useMemo(() => ({
      unread: notifications.filter(n => n.status === 'unread' || (!n.status && !n.isRead)).length,
      all: notifications.filter(n => n.status !== 'archived' && n.status !== 'snoozed').length,
      archived: notifications.filter(n => n.status === 'archived').length,
  }), [notifications]);

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

        <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2">
          <div className="text-[11px] font-medium text-muted-foreground">
            {displayedNotifications.length} visible
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={fetchNotifications}
              disabled={isLoading || isBulkUpdating}
            >
              <RefreshCw className={`mr-1 h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={handleArchiveDisplayed}
              disabled={displayedNotifications.length === 0 || activeTab === 'archived' || isBulkUpdating}
            >
              <Archive className="mr-1 h-3 w-3" />
              Archive visible
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={handleClearAll}
              disabled={notifications.length === 0 || isBulkUpdating}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Clear all
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2 border-b border-border bg-card shrink-0">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 h-8">
              <TabsTrigger value="unread" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">Unread {tabCounts.unread}</TabsTrigger>
              <TabsTrigger value="all" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">All {tabCounts.all}</TabsTrigger>
              <TabsTrigger value="archived" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">Archived {tabCounts.archived}</TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="h-[350px] flex-1">
             {isLoading ? (
                 <div className="p-8 text-center text-sm text-muted-foreground">Loading notifications...</div>
             ) : error ? (
                 <div className="flex h-full flex-col items-center justify-center p-8 text-center text-sm text-destructive">
                    <Bell className="mb-3 h-10 w-10 opacity-20" />
                    <p className="font-medium">{error}</p>
                    <Button type="button" variant="outline" size="sm" className="mt-4" onClick={fetchNotifications}>
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                      Retry
                    </Button>
                 </div>
             ) : displayedNotifications.length === 0 ? (
                 <div className="p-8 text-center flex flex-col items-center justify-center h-full text-muted-foreground/60">
                    <CheckCheck className="w-10 h-10 mb-3 opacity-20" />
                    <span className="text-sm font-medium">
                      {activeTab === 'unread' ? 'No unread notifications' : activeTab === 'archived' ? 'No archived notifications' : 'No notifications yet'}
                    </span>
                    <span className="text-xs mt-1">
                      {activeTab === 'unread' ? "You're all caught up." : activeTab === 'archived' ? 'Archived updates will appear here.' : 'Task assignments, mentions, and comments will appear here.'}
                    </span>
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

                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleOpenNotification(notif);
                                        }}
                                      >
                                        Open
                                      </Button>
                                      {notif.type === 'new_comment' && notif.relatedModel === 'Task' && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2 text-xs text-muted-foreground"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            setReplyingTo(replyingTo === notif._id ? null : notif._id);
                                            setReplyText('');
                                          }}
                                        >
                                          <Reply className="mr-1 h-3 w-3" />
                                          Reply
                                        </Button>
                                      )}
                                      {notif.status !== 'archived' && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2 text-xs text-muted-foreground"
                                          onClick={(event) => handleSnooze(event, notif._id, new Date(Date.now() + 4 * 60 * 60 * 1000))}
                                        >
                                          <Clock className="mr-1 h-3 w-3" />
                                          Later
                                        </Button>
                                      )}
                                    </div>

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

                                  {notif.status !== 'archived' && (
                                      <TooltipProvider>
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10" onClick={(e) => handleSnooze(e, notif._id, new Date(Date.now() + 24 * 60 * 60 * 1000))}>
                                                      <Clock className="w-3.5 h-3.5" />
                                                  </Button>
                                              </TooltipTrigger>
                                              <TooltipContent side="bottom" className="text-xs">Snooze until tomorrow</TooltipContent>
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
