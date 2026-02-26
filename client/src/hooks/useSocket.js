import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

export const useSocket = (projectId) => {
  const [socket, setSocket] = useState(null);
  const previousProjectId = useRef(null);

  useEffect(() => {
    const isProd = import.meta.env.PROD || window.location.hostname !== 'localhost';
    const prodApi = import.meta.env.VITE_API_URL || 'https://taskkollecta-api.onrender.com/api';
    const SOCKET_URL = isProd
      ? prodApi.replace('/api', '')
      : 'http://localhost:5000';

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Join the project room
    if (projectId) {
      newSocket.emit('join_project', projectId);
      previousProjectId.current = projectId;
    }

    return () => {
      // Leave the project room before disconnecting
      if (previousProjectId.current) {
        newSocket.emit('leave_project', previousProjectId.current);
      }
      newSocket.disconnect();
    };
  }, [projectId]);

  return socket;
};