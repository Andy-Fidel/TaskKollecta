import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './useAuth';
import { SocketContext } from './socketContextDef';

export const SocketProvider = ({ children }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user } = useAuth();

  // Initialize socket with lazy initializer to ensure it's created only once
  // passing autoConnect: false to manage connection in useEffect
  const [socket] = useState(() => {
    // Resolve the backend URL depending on if we are dev or prod
    const isProd = import.meta.env.PROD || window.location.hostname !== 'localhost';
    const prodApi = import.meta.env.VITE_API_URL || 'https://taskkollecta-api.onrender.com/api';
    const SOCKET_URL = isProd 
      ? prodApi.replace('/api', '') 
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