import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PriorityBadge } from './PriorityBadge';

export function ProjectList({ tasks, onTaskClick }) {
  if (tasks.length === 0) return <div className="p-8 text-center text-slate-500">No tasks found.</div>;

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="px-6 py-3 font-medium text-slate-500 dark:text-slate-400">Title</th>
            <th className="px-6 py-3 font-medium text-slate-500 dark:text-slate-400">Status</th>
            <th className="px-6 py-3 font-medium text-slate-500 dark:text-slate-400">Priority</th>
            <th className="px-6 py-3 font-medium text-slate-500 dark:text-slate-400">Assignee</th>
            <th className="px-6 py-3 font-medium text-slate-500 dark:text-slate-400">Due Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {tasks.map((task) => (
            <tr 
                key={task._id} 
                onClick={() => onTaskClick(task)}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
            >
              <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-200">{task.title}</td>
              <td className="px-6 py-4">
                <Badge variant="secondary" className="capitalize bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {task.status.replace('-', ' ')}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <PriorityBadge priority={task.priority} />
              </td>
              <td className="px-6 py-4">
                {task.assignee ? (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={task.assignee.avatar} />
                            <AvatarFallback>{task.assignee.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-slate-600 dark:text-slate-400">{task.assignee.name}</span>
                    </div>
                ) : <span className="text-slate-400 italic">Unassigned</span>}
              </td>
              <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}