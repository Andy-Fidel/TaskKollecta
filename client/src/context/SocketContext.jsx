import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_API_URL.replace('/api', '');
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Join organization room for presence (scoped to workspace)
    if (user) {
      const activeOrgId = localStorage.getItem('activeOrgId');
      if (activeOrgId) {
        newSocket.emit('join_org', { userId: user._id, orgId: activeOrgId });
      }
      // Join user room for private notifications
      newSocket.emit('join_user_room', user._id);
    }

    // Listen for online users in the same org
    newSocket.on('get_online_users', (users) => {
      setOnlineUsers(users);
    });

    return () => newSocket.close();
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};