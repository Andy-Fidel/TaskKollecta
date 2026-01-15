import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Circle, Calendar, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import api from '../api/axios';
import { Link } from 'react-router-dom';

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    api.get('/tasks/my-tasks').then(({ data }) => setTasks(data));
  }, []);

  const toggleTask = async (id, currentStatus) => {
    // Optimistic update
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    setTasks(tasks.map(t => t._id === id ? { ...t, status: newStatus } : t));
    await api.put(`/tasks/${id}`, { status: newStatus });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-[Poppins] py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Tasks</h1>
        <p className="text-slate-500">All your assigned work in one place.</p>
      </div>

      <Card className="border border-white/60 shadow-sm rounded-2xl bg-white min-h-[500px]">
        <CardHeader className="border-b border-gray-50 bg-slate-50/50 rounded-t-2xl">
          <div className="grid grid-cols-12 text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">
             <div className="col-span-6">Task Name</div>
             <div className="col-span-3">Project</div>
             <div className="col-span-2">Due Date</div>
             <div className="col-span-1">Priority</div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {tasks.length === 0 ? (
            <div className="p-10 text-center text-slate-400">No tasks assigned to you.</div>
          ) : (
            tasks.map((task) => (
              <div key={task._id} className="grid grid-cols-12 items-center p-4 border-b border-gray-50 hover:bg-slate-50 transition group">
                
                {/* Task Title + Checkbox */}
                <div className="col-span-6 flex items-center gap-3">
                   <button onClick={() => toggleTask(task._id, task.status)} className="text-slate-300 hover:text-green-600 transition">
                      {task.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5" />}
                   </button>
                   <span className={`text-sm font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                      {task.title}
                   </span>
                </div>

                {/* Project Link */}
                <div className="col-span-3">
                    {task.project && (
                        <Link to={`/project/${task.project._id}`} className="flex items-center text-xs text-slate-500 hover:text-blue-600 hover:underline">
                           {task.project.name} <ArrowRight className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100" />
                        </Link>
                    )}
                </div>

                {/* Due Date */}
                <div className="col-span-2 flex items-center text-xs text-slate-500">
                    {task.dueDate && (
                        <span className={new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500 font-bold' : ''}>
                           {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                    )}
                </div>

                {/* Priority */}
                <div className="col-span-1">
                    <Badge variant="outline" className={`text-[10px] capitalize 
                        ${task.priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-100'}
                    `}>
                        {task.priority}
                    </Badge>
                </div>

              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}