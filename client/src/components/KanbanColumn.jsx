import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTask } from './SortableTask';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, MoreHorizontal, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const COLUMN_COLORS = {
  'todo': {
    header: 'bg-slate-100 dark:bg-slate-800/60',
    dot: 'bg-slate-500',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    glow: 'ring-slate-400/30',
    dropGlow: 'bg-slate-200/50 dark:bg-slate-700/30'
  },
  'in-progress': {
    header: 'bg-blue-50 dark:bg-blue-950/40',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    glow: 'ring-blue-400/30',
    dropGlow: 'bg-blue-200/50 dark:bg-blue-800/20'
  },
  'review': {
    header: 'bg-amber-50 dark:bg-amber-950/40',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    glow: 'ring-amber-400/30',
    dropGlow: 'bg-amber-200/50 dark:bg-amber-800/20'
  },
  'done': {
    header: 'bg-green-50 dark:bg-green-950/40',
    dot: 'bg-green-500',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    glow: 'ring-green-400/30',
    dropGlow: 'bg-green-200/50 dark:bg-green-800/20'
  }
};

export function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  selectedTasks,
  onToggleSelect,
  onRenameTask,
  onSetPriority,
  onSetStatus,
  statusOptions,
  members,
  onSetAssignee,
  onSetDueDate,
  onArchiveTask,
  onCopyTaskLink,
  isCollapsed,
  onToggleCollapse,
  onSetWipLimit,
  onQuickCreate,
  isQuickCreating,
  className,
}) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [isEditingWipLimit, setIsEditingWipLimit] = useState(false);
  const [wipLimitInput, setWipLimitInput] = useState(column.wipLimit ? String(column.wipLimit) : '');
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const colors = COLUMN_COLORS[column.id] || COLUMN_COLORS['todo'];
  const customColorStyle = column.color ? {
    borderTop: `3px solid ${column.color}`,
  } : {};
  const dotStyle = column.color ? { backgroundColor: column.color } : {};
  const trimmedQuickTitle = quickTitle.trim();
  const wipLimit = Number.isFinite(Number(column.wipLimit)) && Number(column.wipLimit) > 0 ? Number(column.wipLimit) : null;
  const isOverWipLimit = Boolean(wipLimit && tasks.length > wipLimit);

  const handleQuickSubmit = async (event) => {
    event.preventDefault();
    if (!trimmedQuickTitle || isQuickCreating) return;

    const created = await onQuickCreate?.(column.id, trimmedQuickTitle);
    if (created) {
      setQuickTitle('');
      setIsAddingTask(false);
    }
  };

  const handleCancelQuickCreate = () => {
    setQuickTitle('');
    setIsAddingTask(false);
  };

  const handleWipSubmit = async (event) => {
    event.preventDefault();
    const parsedLimit = Number(wipLimitInput);
    await onSetWipLimit?.(column.id, Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : null);
    setIsEditingWipLimit(false);
  };

  if (isCollapsed) {
    return (
      <button
        ref={setNodeRef}
        type="button"
        style={customColorStyle}
        onClick={() => onToggleCollapse?.(column.id)}
        className={cn(
          `
          flex min-h-[280px] w-14 shrink-0 flex-col items-center gap-3 rounded-2xl
          bg-muted/50 px-2 py-3 text-muted-foreground transition-all hover:bg-muted hover:text-foreground
          ${isOver ? `ring-2 ${colors.glow} ${colors.dropGlow}` : 'ring-0'}
          ${isOverWipLimit ? 'border border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300' : ''}
        `,
          className,
        )}
        aria-label={`Expand ${column.label} column`}
      >
        <span style={dotStyle} className={`h-2.5 w-2.5 rounded-full ${column.color ? '' : colors.dot}`} />
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors.badge} tabular-nums`}>
          {tasks.length}
        </span>
        <span className="mt-2 [writing-mode:vertical-rl] rotate-180 text-xs font-bold tracking-wide">
          {column.label}
        </span>
        <ChevronRight className="mt-auto h-4 w-4" />
      </button>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={customColorStyle}
      className={cn(
        `
        flex-1 min-w-[280px] max-w-[320px] rounded-2xl 
        bg-muted/50 dark:bg-muted/20 
        transition-all duration-300 ease-out
        flex flex-col max-h-[calc(100vh-220px)]
        ${isOverWipLimit ? 'border border-amber-300 dark:border-amber-800' : ''}
        ${isOver 
          ? `ring-2 ${colors.glow} ${colors.dropGlow} scale-[1.01] shadow-lg` 
          : 'ring-0 shadow-none'
        }
      `,
        className,
      )}
    >
      {/* Column Header */}
      <div className={`flex justify-between items-center p-3 rounded-t-2xl ${colors.header} transition-colors duration-200 shrink-0`}>
        <div className="flex min-w-0 items-center gap-2">
          <span style={dotStyle} className={`w-2.5 h-2.5 rounded-full ${column.color ? '' : colors.dot} ${isOver ? 'animate-pulse' : ''}`}></span>
          <h3 className="truncate font-bold text-foreground text-sm">{column.label}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors.badge} tabular-nums`}>
            {tasks.length}
          </span>
          {wipLimit && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${isOverWipLimit ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-background/70 text-muted-foreground'}`}>
              / {wipLimit}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`${column.label} column actions`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setIsAddingTask(true)}>
                <Plus className="h-4 w-4" />
                Add task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleCollapse?.(column.id)}>
                <ChevronLeft className="h-4 w-4" />
                Collapse column
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setWipLimitInput(wipLimit ? String(wipLimit) : '');
                setIsEditingWipLimit(true);
              }}>
                <AlertTriangle className="h-4 w-4" />
                {wipLimit ? 'Edit WIP limit' : 'Set WIP limit'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isOverWipLimit && (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            WIP limit exceeded by {tasks.length - wipLimit}
          </div>
        </div>
      )}

      {isEditingWipLimit && (
        <form onSubmit={handleWipSubmit} className="border-b border-border/50 bg-background/70 px-2.5 py-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              value={wipLimitInput}
              onChange={(event) => setWipLimitInput(event.target.value)}
              placeholder="No limit"
              aria-label={`WIP limit for ${column.label}`}
              className="h-8 text-sm"
              autoFocus
            />
            <Button type="submit" size="sm" className="h-8 px-2">Save</Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => {
                setWipLimitInput('');
                onSetWipLimit?.(column.id, null);
                setIsEditingWipLimit(false);
              }}
            >
              Clear
            </Button>
          </div>
        </form>
      )}

      <div className="border-b border-border/50 px-2.5 py-2">
        {isAddingTask ? (
          <form onSubmit={handleQuickSubmit} className="space-y-2">
            <Input
              value={quickTitle}
              onChange={(event) => setQuickTitle(event.target.value)}
              placeholder={`Add to ${column.label}`}
              aria-label={`New task title for ${column.label}`}
              className="h-8 bg-background text-sm"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  handleCancelQuickCreate();
                }
              }}
            />
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" className="h-7 px-2" disabled={!trimmedQuickTitle || isQuickCreating}>
                {isQuickCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={handleCancelQuickCreate} disabled={isQuickCreating}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingTask(true)}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-background/70 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
          </button>
        )}
      </div>

      {/* Tasks Container */}
      <div className="p-2.5 overflow-y-auto flex-1">
        <SortableContext
          id={column.id}
          items={tasks.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={`flex-1 space-y-3 min-h-[100px] transition-all duration-200 rounded-xl ${isOver ? 'border-2 border-dashed border-primary/20 p-2' : 'border-2 border-transparent p-0'}`}>
            {tasks.length === 0 && !isOver && (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="mb-3 opacity-50">
                  <rect x="10" y="14" width="36" height="7" rx="3.5" fill="currentColor" opacity="0.12"/>
                  <rect x="10" y="25" width="36" height="7" rx="3.5" fill="currentColor" opacity="0.08"/>
                  <rect x="10" y="36" width="24" height="7" rx="3.5" fill="currentColor" opacity="0.05"/>
                </svg>
                <p className="text-xs font-medium">Drop tasks here</p>
              </div>
            )}
            {tasks.length === 0 && isOver && (
              <div className="flex items-center justify-center py-12 text-primary/60">
                <p className="text-sm font-semibold animate-pulse">Drop here</p>
              </div>
            )}
            {tasks.map((task) => (
              <SortableTask
                key={task._id}
                task={task}
                onClick={() => onTaskClick(task)}
                isSelected={selectedTasks?.has(task._id)}
                onToggleSelect={onToggleSelect}
                onRenameTask={onRenameTask}
                onSetPriority={onSetPriority}
                onSetStatus={onSetStatus}
                statusOptions={statusOptions}
                members={members}
                onSetAssignee={onSetAssignee}
                onSetDueDate={onSetDueDate}
                onArchiveTask={onArchiveTask}
                onCopyTaskLink={onCopyTaskLink}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
