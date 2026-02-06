import { useEffect, useState } from 'react';
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Popover, PopoverContent, PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  
  useEffect(() => {
    if (!user) return;
    const SOCKET_URL = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'http://localhost:5000';
    const socket = io(SOCKET_URL);
    socket.emit('join_user_room', user._id);
    socket.on('new_notification', (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });
    return () => socket.disconnect();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) { console.error("Failed to fetch notifications"); }
  };

  useEffect(() => { fetchNotifications(); }, []);

  
  const handleOpenChange = async (open) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      try {
        await api.put('/notifications/read');
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({...n, isRead: true})));
      } catch (e) { console.error(e); }
    }
  };

  const handleClearOne = async (e, id) => {
      e.stopPropagation(); 
      try {
          await api.delete(`/notifications/${id}`);
          setNotifications(prev => prev.filter(n => n._id !== id));
      } catch (e) { console.error("Failed to delete"); }
  };

  const handleClearAll = async () => {
      try {
          await api.delete('/notifications');
          setNotifications([]);
          setUnreadCount(0);
      } catch (e) { console.error("Failed to clear all"); }
  };

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
      <PopoverContent className="w-80 p-0 mr-4 bg-card border-border shadow-xl" align="end">
        
        {/* Header with Clear All */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
           <div className="flex items-center gap-2">
               <h4 className="font-bold text-sm text-foreground">Notifications</h4>
               {unreadCount > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 h-5">{unreadCount} New</Badge>}
           </div>
           {notifications.length > 0 && (
               <TooltipProvider>
                   <Tooltip>
                       <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={handleClearAll}>
                               <Trash2 className="w-3.5 h-3.5" />
                           </Button>
                       </TooltipTrigger>
                       <TooltipContent><p>Clear all</p></TooltipContent>
                   </Tooltip>
               </TooltipProvider>
           )}
        </div>
        
        <ScrollArea className="h-[300px]">
           {notifications.length === 0 ? (
               <div className="p-8 text-center flex flex-col items-center justify-center h-full text-muted-foreground">
                  <CheckCheck className="w-8 h-8 mb-2 opacity-20" />
                  <span className="text-xs">All caught up!</span>
               </div>
           ) : (
               <div className="divide-y divide-border">
                  {notifications.map((notif) => (
                      <div key={notif._id} className={`group relative p-4 flex gap-3 hover:bg-muted/50 transition ${!notif.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                          
                          {/* Avatar */}
                          <Avatar className="h-8 w-8 mt-1 border border-background">
                              <AvatarImage src={notif.sender?.avatar} />
                              <AvatarFallback className="text-[10px]">{notif.sender?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          
                          {/* Content */}
                          <div className="space-y-1 pr-4">
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                  <span className="font-bold text-foreground">{notif.sender?.name}</span> {notif.message}
                              </p>
                              <p className="text-[10px] text-muted-foreground/60 font-medium">
                                  {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                              </p>
                          </div>

                          {/* Delete Button (Visible on Hover) */}
                          <button 
                            onClick={(e) => handleClearOne(e, notif._id)}
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-opacity"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                      </div>
                  ))}
               </div>
           )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}