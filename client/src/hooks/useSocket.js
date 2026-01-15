import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL.replace('/api', ''), {});

export const useSocket = (projectId) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // 1. Connect
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // 2. Join the Project Room
    if (projectId) {
      newSocket.emit('join_project', projectId);
    }

    // 3. Cleanup on unmount
    return () => newSocket.disconnect();
  }, [projectId]);

  return socket;
};