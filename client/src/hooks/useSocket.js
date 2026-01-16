import { useEffect, useState } from 'react';
import io from 'socket.io-client';



export const useSocket = (projectId) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    
    const SOCKET_URL = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'http://localhost:5000'; // Fallback for safety

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    if (projectId) {
      newSocket.emit('join_project', projectId);
    }

    return () => newSocket.disconnect();
  }, [projectId]);

  return socket;
};