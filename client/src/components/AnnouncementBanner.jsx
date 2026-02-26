import React, { useState, useEffect } from 'react';
import { X, Megaphone, AlertCircle, CheckCircle, Info } from 'lucide-react';
import api from '../api/axios';
import io from 'socket.io-client';

export function AnnouncementBanner() {
    const [announcement, setAnnouncement] = useState(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Fetch active on mount
        const fetchActive = async () => {
            try {
                const { data } = await api.get('/announcements/active');
                if (data && data._id !== localStorage.getItem('dismissed_announcement_id')) {
                    setAnnouncement(data);
                    setIsVisible(true);
                }
            } catch {
                // Ignore
            }
        };
        fetchActive();

        // Listen for socket events
        const isProd = import.meta.env.PROD || window.location.hostname !== 'localhost';
        const prodApi = import.meta.env.VITE_API_URL || 'https://taskkollecta-api.onrender.com/api';
        const socketUrl = isProd
          ? prodApi.replace('/api', '')
          : 'http://localhost:5000';
        const socket = io(socketUrl, { withCredentials: true });

        socket.on('new_announcement', (data) => {
            setAnnouncement(data);
            setIsVisible(true);
            localStorage.removeItem('dismissed_announcement_id');
        });

        socket.on('clear_announcement', () => {
            setAnnouncement(null);
            setIsVisible(false);
        });

        return () => socket.disconnect();
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        if (announcement) {
            localStorage.setItem('dismissed_announcement_id', announcement._id);
        }
    };

    if (!announcement || !isVisible) return null;

    const config = {
        info: { bg: 'bg-blue-600', text: 'text-white', icon: Info },
        success: { bg: 'bg-emerald-600', text: 'text-white', icon: CheckCircle },
        warning: { bg: 'bg-amber-500', text: 'text-black', icon: AlertCircle },
        danger: { bg: 'bg-red-600', text: 'text-white', icon: Megaphone }
    };
    
    const { bg, text, icon: Icon } = config[announcement.type] || config.info;

    return (
        <div className={`${bg} ${text} w-full py-2.5 px-4 shadow-md relative z-50 flex items-center justify-center shrink-0`} style={{ animation: 'slideDown 0.3s ease-out' }}>
            <div className="flex items-center gap-2 max-w-4xl w-full pr-8">
                <Icon className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium tracking-wide">{announcement.message}</p>
            </div>
            <button 
                onClick={handleDismiss}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-black/10 rounded-full transition-colors"
            >
                <X className="w-4 h-4 opacity-80" />
            </button>
            <style>{`
                @keyframes slideDown {
                    from { transform: translateY(-100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
