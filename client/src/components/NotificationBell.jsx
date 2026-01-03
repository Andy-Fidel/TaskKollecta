import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Popover, PopoverContent, PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // 1. Connect Socket for Real-time alerts
  useEffect(() => {
    if (!user) return;
    
    // Connect to same socket instance
    const socket = io('http://localhost:5000');
    
    // Join my private room
    socket.emit('join_user_room', user._id);

    // Listen
    socket.on('new_notification', (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
      // Optional: Play sound or show browser toast
    });

    return () => socket.disconnect();
  }, [user]);

  // 2. Fetch Initial Data
  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error("Failed to fetch notifications");
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // 3. Mark as Read on Open
  const handleOpenChange = async (open) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      try {
        await api.put('/notifications/read');
        setUnreadCount(0);
        // Visually mark all as read
        setNotifications(prev => prev.map(n => ({...n, isRead: true})));
      } catch (e) { console.error(e); }
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50">
           <h4 className="font-bold text-sm text-slate-700">Notifications</h4>
           {unreadCount > 0 && <Badge variant="secondary" className="text-xs">{unreadCount} New</Badge>}
        </div>
        
        <ScrollArea className="h-[300px]">
           {notifications.length === 0 ? (
               <div className="p-8 text-center text-xs text-slate-400">
                  No notifications yet.
               </div>
           ) : (
               <div className="divide-y">
                  {notifications.map((notif) => (
                      <div key={notif._id} className={`p-4 flex gap-3 hover:bg-slate-50 transition ${!notif.isRead ? 'bg-blue-50/50' : ''}`}>
                          <Avatar className="h-8 w-8 mt-1 border border-white">
                              <AvatarImage src={notif.sender?.avatar} />
                              <AvatarFallback>{notif.sender?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                              <p className="text-xs text-slate-600 leading-relaxed">
                                  <span className="font-bold text-slate-900">{notif.sender?.name}</span> {notif.message}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">
                                  {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                              </p>
                          </div>
                      </div>
                  ))}
               </div>
           )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}