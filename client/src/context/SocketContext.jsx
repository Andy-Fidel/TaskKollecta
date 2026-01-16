import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext'; // Assuming you have AuthContext

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]); // <--- NEW STATE
  const { user } = useAuth();

  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_API_URL.replace('/api', '');
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // ✅ NEW: Tell server we are here
    if (user) {
      newSocket.emit('join_app', user._id);
    }

    // ✅ NEW: Listen for online users list
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