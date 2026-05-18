import { memo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, Archive, Calendar, Copy, MoreHorizontal, User as UserIcon, Repeat, Check, Diamond, Link2 } from 'lucide-react';
import { addDays, differenceInCalendarDays, format, isPast, isToday } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getIncompleteDependencies, isTaskBlocked } from '../utils/taskState';

import { motion as Motion } from 'framer-motion';

export const SortableTask = memo(function SortableTask({
  task,
  onClick,
  isSelected,
  onToggleSelect,
  onRenameTask,
  onSetPriority,
  onSetStatus,
  statusOptions = [],
  members = [],
  onSetAssignee,
  onSetDueDate,
  onArchiveTask,
  onCopyTaskLink,
  blockingCount = 0,
  scheduleConflictCount = 0,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(task.title || '');
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    zIndex: isDragging ? 100 : 'auto',
  };

  const priorityColors = {
    high: 'bg-red-50 text-red-700 hover:bg-red-50 border-red-100 dark:bg-red-950 dark:text-red-400 dark:border-red-900',
    medium: 'bg-orange-50 text-orange-700 hover:bg-orange-50 border-orange-100 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-900',
    low: 'bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900',
    urgent: 'bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-900'
  };

  const incompleteDependencies = getIncompleteDependencies(task);
  const blocked = isTaskBlocked(task);
  const currentAssigneeId = task.assignee?._id || task.assignee || null;
  const currentStatus = statusOptions.find((status) => status.id === task.status);
  const isDone = currentStatus?.isDone || task.status === 'done' || task.status === 'completed';
  const daysWithoutUpdate = task.updatedAt ? differenceInCalendarDays(new Date(), new Date(task.updatedAt)) : 0;
  const isAging = !isDone && daysWithoutUpdate >= 7;
  const stopCardInteraction = (event) => {
    event.stopPropagation();
  };

  const handleTitleSubmit = async (event) => {
    event.preventDefault();
    const nextTitle = titleInput.trim();
    if (!nextTitle || isSavingTitle) return;

    setIsSavingTitle(true);
    const saved = await onRenameTask?.(task, nextTitle);
    setIsSavingTitle(false);
    if (saved !== false) {
      setIsEditingTitle(false);
    }
  };

  const cancelTitleEdit = () => {
    setTitleInput(task.title || '');
    setIsEditingTitle(false);
  };

  return (
    <Motion.div
      ref={setNodeRef}
      style={style}
      layout
      animate={{
        rotate: isDragging ? 2 : 0,
        scale: isDragging ? 1.05 : 1,
        boxShadow: isDragging ? "0 25px 50px -12px rgba(0, 0, 0, 0.25)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        group relative p-4 rounded-xl bg-card 
        border shadow-sm 
        transition-colors duration-200 cursor-grab active:cursor-grabbing
        ${isDragging 
          ? 'ring-2 ring-primary/20 z-50 opacity-90' 
          : 'hover:shadow-md hover:-translate-y-0.5'
        }
        ${isSelected ? 'border-primary ring-1 ring-primary/30' : blocked ? 'border-amber-300/80 dark:border-amber-700/70' : 'border-border'}
      `}
    >
      {/* Selection checkbox */}
      <button
        type="button"
        aria-label={isSelected ? `Deselect ${task.title}` : `Select ${task.title}`}
        onPointerDown={stopCardInteraction}
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Task actions for ${task.title}`}
            onPointerDown={stopCardInteraction}
            onClick={stopCardInteraction}
            className="absolute top-3 right-3 rounded-md p-1 opacity-0 transition-opacity text-muted-foreground hover:bg-muted hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44" onClick={stopCardInteraction} onPointerDown={stopCardInteraction}>
          <DropdownMenuItem onClick={() => onClick?.()}>
            Open details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            setTitleInput(task.title || '');
            setIsEditingTitle(true);
          }}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCopyTaskLink?.(task)}>
            <Copy className="h-4 w-4" />
            Copy link
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Priority</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {['urgent', 'high', 'medium', 'low'].map((priority) => (
                <DropdownMenuItem
                  key={priority}
                  onClick={() => onSetPriority?.(task, priority)}
                  className="capitalize"
                >
                  {task.priority === priority && <Check className="h-4 w-4" />}
                  {priority}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {statusOptions.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {statusOptions.map((status) => (
                  <DropdownMenuItem
                    key={status.id}
                    onClick={() => onSetStatus?.(task, status.id)}
                    className="capitalize"
                  >
                    {task.status === status.id && <Check className="h-4 w-4" />}
                    {status.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          {members.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Assignee</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                <DropdownMenuItem onClick={() => onSetAssignee?.(task, null)}>
                  {!currentAssigneeId && <Check className="h-4 w-4" />}
                  Unassigned
                </DropdownMenuItem>
                {members.map((member) => {
                  const memberUser = member.user || member;
                  return (
                    <DropdownMenuItem
                      key={memberUser._id}
                      onClick={() => onSetAssignee?.(task, { ...member, user: memberUser })}
                    >
                      {currentAssigneeId === memberUser._id && <Check className="h-4 w-4" />}
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={memberUser.avatar} />
                        <AvatarFallback className="text-[9px]">{memberUser.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{memberUser.name}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Due date</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onSetDueDate?.(task, new Date())}>
                Today
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSetDueDate?.(task, addDays(new Date(), 1))}>
                Tomorrow
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSetDueDate?.(task, addDays(new Date(), 7))}>
                Next week
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSetDueDate?.(task, null)}>
                Clear due date
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onArchiveTask?.(task)}>
            <Archive className="h-4 w-4" />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Priority Badge & Indicators */}
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-bold border ${priorityColors[task.priority] || priorityColors.medium}`}>
          {task.priority}
        </Badge>
        {blocked && (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Blocked
          </Badge>
        )}
        {isAging && (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300">
            No update {daysWithoutUpdate}d
          </Badge>
        )}
        {task.isMilestone && (
          <Diamond className="h-3.5 w-3.5 text-amber-500 fill-amber-500" title="Milestone" />
        )}
        {task.recurrence?.enabled && (
          <Repeat className="h-3 w-3 text-violet-500" title="Recurring task" />
        )}
        {task.dependencies?.length > 0 && (
          <Link2 className="h-3 w-3 text-blue-500" title={`${task.dependencies.length} dependenc${task.dependencies.length === 1 ? 'y' : 'ies'}`} />
        )}
        {blockingCount > 0 && (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
            Blocking {blockingCount}
          </Badge>
        )}
        {scheduleConflictCount > 0 && (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Date risk
          </Badge>
        )}
      </div>

      {/* Title */}
      {isEditingTitle ? (
        <form
          onSubmit={handleTitleSubmit}
          onClick={stopCardInteraction}
          onPointerDown={stopCardInteraction}
          className="mb-2 space-y-2"
        >
          <Input
            value={titleInput}
            onChange={(event) => setTitleInput(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Escape') {
                event.preventDefault();
                cancelTitleEdit();
              }
            }}
            aria-label={`Rename ${task.title}`}
            className="h-8 text-sm font-semibold"
            autoFocus
            disabled={isSavingTitle}
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isSavingTitle || !titleInput.trim()}
              className="rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
            >
              {isSavingTitle ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancelTitleEdit}
              disabled={isSavingTitle}
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <h4 className="font-semibold text-foreground text-sm leading-snug mb-2">
          {task.title}
        </h4>
      )}

      {blocked && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-2 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" />
            Waiting on {incompleteDependencies.length} blocker{incompleteDependencies.length === 1 ? '' : 's'}
          </div>
          <p className="mt-1 line-clamp-2">
            {incompleteDependencies.map((dependency) => dependency.title).join(', ')}
          </p>
        </div>
      )}

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
    </Motion.div>
  );
});
