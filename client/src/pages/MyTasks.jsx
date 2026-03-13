import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Circle, Calendar, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import { useDataRefresh } from '../context/useDataRefresh';
import { ExportMenu } from '../components/ExportMenu';
import { exportToCSV, exportToPDF, buildTaskExportData } from '../utils/exportUtils';

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const { refreshKey, triggerRefresh } = useDataRefresh();

  useEffect(() => {
    const orgId = localStorage.getItem('activeOrgId');
    const endpoint = orgId ? `/tasks/my-tasks?orgId=${orgId}` : '/tasks/my-tasks';
    api.get(endpoint).then(({ data }) => setTasks(data));
  }, [refreshKey]);

  const toggleTask = async (id, currentStatus) => {
    // Optimistic update
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    setTasks(tasks.map(t => t._id === id ? { ...t, status: newStatus } : t));
    await api.put(`/tasks/${id}`, { status: newStatus });
    triggerRefresh();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Tasks</h1>
          <p className="text-slate-500">All your assigned work in one place.</p>
        </div>
        <ExportMenu
          onExportCSV={() => {
            const { headers, rows } = buildTaskExportData(tasks);
            exportToCSV({ headers, rows, filename: 'my-tasks.csv' });
          }}
          onExportPDF={() => {
            const { headers, rows } = buildTaskExportData(tasks);
            exportToPDF({ title: 'My Tasks', headers, rows, filename: 'my-tasks.pdf' });
          }}
        />
      </div>

      <Card className="border border-white/60 shadow-sm rounded-2xl bg-white min-h-[500px]">
        {/* Desktop header — hidden on mobile */}
        <CardHeader className="border-b border-gray-50 bg-slate-50/50 rounded-t-2xl hidden md:block">
          <div className="grid grid-cols-12 text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">
             <div className="col-span-6">Task Name</div>
             <div className="col-span-3">Project</div>
             <div className="col-span-2">Due Date</div>
             <div className="col-span-1">Priority</div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="mb-6 opacity-50">
                <circle cx="60" cy="50" r="35" stroke="currentColor" strokeWidth="2.5" opacity="0.1"/>
                <path d="M45 50l10 10 20-20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.18"/>
                <rect x="30" y="95" width="60" height="8" rx="4" fill="currentColor" opacity="0.06"/>
              </svg>
              <h3 className="text-lg font-semibold text-foreground mb-1">You're all clear!</h3>
              <p className="text-sm text-muted-foreground max-w-xs">No tasks are assigned to you right now. When a teammate assigns you work, it will show up here.</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task._id} className="p-4 border-b border-gray-50 hover:bg-slate-50 transition group">

                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-12 items-center">
                  <div className="col-span-6 flex items-center gap-3">
                     <button onClick={() => toggleTask(task._id, task.status)} className="text-slate-300 hover:text-green-600 transition">
                        {task.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5" />}
                     </button>
                     <span className={`text-sm font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {task.title}
                     </span>
                  </div>
                  <div className="col-span-3">
                      {task.project && (
                          <Link to={`/project/${task.project._id}`} className="flex items-center text-xs text-slate-500 hover:text-blue-600 hover:underline">
                             {task.project.name} <ArrowRight className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100" />
                          </Link>
                      )}
                  </div>
                  <div className="col-span-2 flex items-center text-xs text-slate-500">
                      {task.dueDate && (
                          <span className={new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500 font-bold' : ''}>
                             {format(new Date(task.dueDate), 'MMM d')}
                          </span>
                      )}
                  </div>
                  <div className="col-span-1">
                      <Badge variant="outline" className={`text-[10px] capitalize 
                          ${task.priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-100'}
                      `}>
                          {task.priority}
                      </Badge>
                  </div>
                </div>

                {/* Mobile card layout */}
                <div className="md:hidden space-y-2">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleTask(task._id, task.status)} className="text-slate-300 hover:text-green-600 transition shrink-0">
                      {task.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <span className={`text-sm font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pl-8 flex-wrap">
                    {task.project && (
                      <Link to={`/project/${task.project._id}`} className="text-xs text-slate-500 hover:text-blue-600 hover:underline">
                        {task.project.name}
                      </Link>
                    )}
                    {task.dueDate && (
                      <span className={`text-xs flex items-center gap-1 ${new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                        <Calendar className="w-3 h-3" /> {format(new Date(task.dueDate), 'MMM d')}
                      </span>
                    )}
                    <Badge variant="outline" className={`text-[10px] capitalize 
                        ${task.priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-100'}
                    `}>
                        {task.priority}
                    </Badge>
                  </div>
                </div>

              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}