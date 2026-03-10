import { useEffect, useState, useContext } from 'react';
import { Bell, X, CheckCheck, Trash2, Archive, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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

export function NotificationBell() {
  const { user } = useAuth();
  const { socket } = useContext(SocketContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('unread');

  useEffect(() => {
    if (!user || !socket) return;
    const handleNewNotification = (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    };
    socket.on('new_notification', handleNewNotification);
    return () => socket.off('new_notification', handleNewNotification);
  }, [user, socket]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/notifications');
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } catch { /* ignore */ }
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

  const handleClearAll = async () => {
      try {
          await api.delete('/notifications');
          setNotifications([]);
          setUnreadCount(0);
      } catch { console.error("Failed to clear all"); }
  };

  const displayedNotifications = notifications.filter(n => {
      const isUnread = n.status === 'unread' || (!n.status && !n.isRead);
      const isArchived = n.status === 'archived';
      
      if (activeTab === 'unread') return isUnread;
      if (activeTab === 'archived') return isArchived;
      if (activeTab === 'all') return !isArchived; 
      return true;
  });

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
           {notifications.length > 0 && (
               <TooltipProvider>
                   <Tooltip>
                       <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={handleClearAll}>
                               <Trash2 className="w-3.5 h-3.5" />
                           </Button>
                       </TooltipTrigger>
                       <TooltipContent><p>Clear all</p></TooltipContent>
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
             {displayedNotifications.length === 0 ? (
                 <div className="p-8 text-center flex flex-col items-center justify-center h-full text-muted-foreground/60">
                    <CheckCheck className="w-10 h-10 mb-3 opacity-20" />
                    <span className="text-sm font-medium">No notifications here</span>
                    <span className="text-xs mt-1">You're all caught up!</span>
                 </div>
             ) : (
                 <div className="divide-y divide-border">
                    {displayedNotifications.map((notif) => {
                        const isUnread = notif.status === 'unread' || (!notif.status && !notif.isRead);
                        
                        return (
                            <div key={notif._id} className={`group relative p-4 flex gap-3 hover:bg-muted/40 transition-colors ${isUnread ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                {/* Avatar */}
                                <Avatar className="h-9 w-9 mt-0.5 border border-border/50 shrink-0">
                                    <AvatarImage src={notif.sender?.avatar} />
                                    <AvatarFallback className="text-xs bg-muted text-muted-foreground">{notif.sender?.name?.charAt(0) || '?'}</AvatarFallback>
                                </Avatar>
                                
                                {/* Content */}
                                <div className="space-y-1.5 pr-2 flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground leading-relaxed break-words">
                                        <span className="font-semibold text-foreground">{notif.sender?.name}</span> {notif.message}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/70 font-medium">
                                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                    </p>
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
                                </div>
                            </div>
                        );
                    })}
                 </div>
             )}
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}