import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SocketContext } from './socketContextDef';

export const SocketProvider = ({ children }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user } = useAuth();

  // Initialize socket with lazy initializer to ensure it's created only once
  // passing autoConnect: false to manage connection in useEffect
  const [socket] = useState(() => {
    const SOCKET_URL = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'http://localhost:5000';
    return io(SOCKET_URL, {
      autoConnect: false,
      auth: {
        token: localStorage.getItem('token')
      }
    });
  });

  useEffect(() => {
    // Establish connection
    socket.connect();

    // Join organization room for presence (scoped to workspace)
    if (user) {
      const activeOrgId = localStorage.getItem('activeOrgId');
      if (activeOrgId) {
        socket.emit('join_org', { userId: user._id, orgId: activeOrgId });
      }
      // Join user room for private notifications
      socket.emit('join_user_room', user._id);
    }

    // Listen for online users in the same org
    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };
    socket.on('get_online_users', handleOnlineUsers);

    return () => {
      socket.off('get_online_users', handleOnlineUsers);
      socket.disconnect();
    };
  }, [user, socket]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};