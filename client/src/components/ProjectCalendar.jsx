import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export function ProjectCalendar({ tasks, onTaskClick }) {
  // 1. Transform Tasks into Calendar Events
  const events = tasks
    .filter(t => t.dueDate) // Only tasks with dates
    .map(t => ({
      id: t._id,
      title: t.title,
      start: new Date(t.dueDate),
      end: new Date(t.dueDate), // For single-day tasks, start = end
      originalTask: t, // Keep ref to full object
      status: t.status
    }));

  // 2. Custom Event Styling
  const eventStyleGetter = (event) => {
    let backgroundColor = '#3b82f6'; // Blue (todo)
    if (event.status === 'done') backgroundColor = '#10b981'; // Green
    if (event.status === 'in-progress') backgroundColor = '#f59e0b'; // Orange
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px'
      }
    };
  };

  // 3. Custom Toolbar (Matches your app design)
  const CustomToolbar = (toolbar) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };
    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };
    const goToCurrent = () => {
      toolbar.onNavigate('TODAY');
    };

    const label = () => {
      const date = new Date(toolbar.date);
      return <span className="text-lg font-bold text-slate-800">{format(date, 'MMMM yyyy')}</span>;
    };

    return (
      <div className="flex justify-between items-center mb-4 p-2">
        <div className="flex items-center gap-4">
            {label()}
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
           <button onClick={goToBack} className="p-1 hover:bg-white rounded shadow-sm transition"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
           <button onClick={goToCurrent} className="px-3 text-xs font-semibold text-slate-600 hover:bg-white rounded shadow-sm transition">Today</button>
           <button onClick={goToNext} className="p-1 hover:bg-white rounded shadow-sm transition"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-200px)] bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={(event) => onTaskClick(event.originalTask)}
        eventPropGetter={eventStyleGetter}
        components={{
            toolbar: CustomToolbar
        }}
        views={['month', 'week', 'day']}
      />
    </div>
  );
}