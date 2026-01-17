import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

export default function CalendarView() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState('month');

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const { data } = await api.get('/tasks/my-tasks');
                setTasks(data);
            } catch (error) {
                console.error('Failed to load tasks');
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    // Transform tasks to calendar events
    const events = tasks
        .filter(t => t.dueDate)
        .map(t => ({
            id: t._id,
            title: t.title,
            start: new Date(t.dueDate),
            end: new Date(t.dueDate),
            task: t,
            status: t.status,
            priority: t.priority,
            projectId: t.project?._id
        }));

    // Event styling based on status
    const eventStyleGetter = (event) => {
        const statusColors = {
            'todo': 'hsl(var(--primary))',
            'in-progress': '#f59e0b',
            'review': '#8b5cf6',
            'done': '#10b981'
        };

        return {
            style: {
                backgroundColor: statusColors[event.status] || 'hsl(var(--primary))',
                borderRadius: '6px',
                opacity: event.status === 'done' ? 0.6 : 0.9,
                color: 'white',
                border: '0px',
                fontSize: '12px',
                fontWeight: '500',
                padding: '2px 6px',
            }
        };
    };

    // Custom Toolbar
    const CustomToolbar = (toolbar) => {
        const goToBack = () => toolbar.onNavigate('PREV');
        const goToNext = () => toolbar.onNavigate('NEXT');
        const goToCurrent = () => toolbar.onNavigate('TODAY');

        return (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <CalendarIcon className="h-6 w-6 text-primary" />
                        Calendar
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {format(toolbar.date, 'MMMM yyyy')}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Selector */}
                    <div className="flex bg-muted rounded-lg p-1 gap-1">
                        {['month', 'week', 'day'].map(view => (
                            <Button
                                key={view}
                                variant={currentView === view ? 'default' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs capitalize"
                                onClick={() => {
                                    setCurrentView(view);
                                    toolbar.onView(view);
                                }}
                            >
                                {view}
                            </Button>
                        ))}
                    </div>

                    {/* Navigation */}
                    <div className="flex bg-muted rounded-lg p-1 gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToBack}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={goToCurrent}>
                            Today
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNext}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    // Handle event click
    const handleEventClick = (event) => {
        if (event.projectId) {
            navigate(`/project/${event.projectId}`);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 font-[Poppins]">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Tasks', value: tasks.length, color: 'text-primary' },
                    {
                        label: 'Due This Week', value: tasks.filter(t => {
                            if (!t.dueDate) return false;
                            const due = new Date(t.dueDate);
                            const now = new Date();
                            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                            return due >= now && due <= weekFromNow;
                        }).length, color: 'text-orange-500'
                    },
                    {
                        label: 'Overdue', value: tasks.filter(t => {
                            if (!t.dueDate || t.status === 'done') return false;
                            return new Date(t.dueDate) < new Date();
                        }).length, color: 'text-destructive'
                    },
                    { label: 'Completed', value: tasks.filter(t => t.status === 'done').length, color: 'text-green-500' },
                ].map((stat, i) => (
                    <Card key={i} className="p-4">
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </Card>
                ))}
            </div>

            {/* Calendar */}
            <Card className="p-6">
                <div className="h-[calc(100vh-350px)] min-h-[500px]">
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        onSelectEvent={handleEventClick}
                        eventPropGetter={eventStyleGetter}
                        components={{ toolbar: CustomToolbar }}
                        views={['month', 'week', 'day']}
                        view={currentView}
                        onView={(view) => setCurrentView(view)}
                        popup
                        selectable={false}
                    />
                </div>
            </Card>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center">
                {[
                    { status: 'Todo', color: 'hsl(var(--primary))' },
                    { status: 'In Progress', color: '#f59e0b' },
                    { status: 'Review', color: '#8b5cf6' },
                    { status: 'Done', color: '#10b981' },
                ].map(item => (
                    <div key={item.status} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                        {item.status}
                    </div>
                ))}
            </div>
        </div>
    );
}
