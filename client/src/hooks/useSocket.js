import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const getSocketUrl = () => {
  const isProd = import.meta.env.PROD || window.location.hostname !== 'localhost';
  const prodApi = import.meta.env.VITE_API_URL || 'https://taskkollecta-api.onrender.com/api';
  return isProd ? prodApi.replace('/api', '') : 'http://localhost:5000';
};

export const useSocket = (projectId) => {
  const [socket] = useState(() => io(getSocketUrl()));
  const previousProjectId = useRef(null);

  useEffect(() => {
    if (!socket) return;

    if (projectId) {
      socket.emit('join_project', projectId);
      previousProjectId.current = projectId;
    }

    return () => {
      if (previousProjectId.current) {
        socket.emit('leave_project', previousProjectId.current);
      }
    };
  }, [projectId, socket]);

  useEffect(() => {
    if (!socket) return;
    return () => socket.disconnect();
  }, [socket]);

  return socket;
};