import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MoreHorizontal, User as UserIcon, Repeat, Check } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function SortableTask({ task, onClick, isSelected, onToggleSelect }) {
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
    high: 'bg-red-50 text-red-700 hover:bg-red-50 border-red-100 dark:bg-red-950 dark:text-red-400 dark:border-red-900',
    medium: 'bg-orange-50 text-orange-700 hover:bg-orange-50 border-orange-100 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-900',
    low: 'bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900',
    urgent: 'bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-900'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        group relative p-4 rounded-xl bg-card 
        border shadow-sm hover:shadow-md 
        transition-all duration-200 cursor-grab active:cursor-grabbing
        ${isDragging ? 'rotate-2 scale-105 shadow-xl z-50' : ''}
        ${isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border'}
      `}
    >
      {/* Selection checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect?.(task._id); }}
        className={`absolute top-3 left-3 w-5 h-5 rounded border flex items-center justify-center transition-all z-10
          ${isSelected
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-muted-foreground/30 bg-card opacity-0 group-hover:opacity-100 hover:border-primary'
          }
        `}
      >
        {isSelected && <Check className="h-3 w-3" />}
      </button>

      {/* Hover Action */}
      <button className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity">
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {/* Priority Badge & Recurring Indicator */}
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-bold border ${priorityColors[task.priority] || priorityColors.medium}`}>
          {task.priority}
        </Badge>
        {task.recurrence?.enabled && (
          <Repeat className="h-3 w-3 text-violet-500" title="Recurring task" />
        )}
      </div>

      {/* Title */}
      <h4 className="font-semibold text-foreground text-sm leading-snug mb-2">
        {task.title}
      </h4>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag._id}
              className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                border: `1px solid ${tag.color}40`
              }}
            >
              {tag.name}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[9px] text-muted-foreground">+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer (Date & Avatar) */}
      <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">

        {/* Due Date */}
        {task.dueDate ? (
          <div className={`flex items-center text-xs gap-1.5 transition-colors
             ${task.status !== 'done' && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))
              ? 'text-red-600 dark:text-red-400 font-bold'
              : 'text-muted-foreground font-medium'
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
          <Avatar className="h-6 w-6 border border-border">
            <AvatarImage src={task.assignee.avatar} />
            <AvatarFallback className="text-[9px] bg-muted text-muted-foreground font-bold">
              {task.assignee.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-6 w-6 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/50" title="Unassigned">
            <UserIcon className="h-3 w-3 text-muted-foreground/50" />
          </div>
        )}
      </div>
    </div>
  );
}