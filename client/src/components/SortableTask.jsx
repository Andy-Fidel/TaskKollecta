import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MoreHorizontal, User as UserIcon } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function SortableTask({ task, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const priorityColors = {
    high: 'bg-red-50 text-red-700 hover:bg-red-50 border-red-100',
    medium: 'bg-orange-50 text-orange-700 hover:bg-orange-50 border-orange-100',
    low: 'bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100',
    urgent: 'bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        group relative p-4 rounded-xl bg-white 
        border border-white/60 shadow-sm hover:shadow-md 
        transition-all duration-200 cursor-grab active:cursor-grabbing
        ${isDragging ? 'rotate-2 scale-105 shadow-xl z-50' : ''}
      `}
    >
      {/* Hover Action */}
      <button className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity">
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {/* Tags */}
      <div className="flex gap-2 mb-3">
        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-bold border ${priorityColors[task.priority] || priorityColors.medium}`}>
          {task.priority}
        </Badge>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-slate-800 text-sm leading-snug mb-3">
        {task.title}
      </h4>

      {/* Footer (Date & Avatar) */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
        
        {/* Due Date */}
        {task.dueDate ? (
           <div className={`flex items-center text-xs gap-1.5 transition-colors
             ${task.status !== 'done' && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) 
                ? 'text-red-600 font-bold' 
                : 'text-slate-400 font-medium' 
             }`}
           >
             <Calendar className="h-3.5 w-3.5" />
             <span>{format(new Date(task.dueDate), 'MMM d')}</span>
           </div>
        ) : (
           <div className="h-4"></div> 
        )}

        {/* Assignee Avatar */}
        {task.assignee ? (
            <Avatar className="h-6 w-6 border border-slate-100">
                <AvatarImage src={task.assignee.avatar} />
                <AvatarFallback className="text-[9px] bg-slate-100 text-slate-600 font-bold">
                    {task.assignee.name?.charAt(0)}
                </AvatarFallback>
            </Avatar>
        ) : (
            <div className="h-6 w-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center bg-slate-50/50" title="Unassigned">
                <UserIcon className="h-3 w-3 text-slate-300" />
            </div>
        )}
      </div>
    </div>
  );
}