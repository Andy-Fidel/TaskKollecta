import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTask } from './SortableTask';
import { Loader2 } from 'lucide-react';

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

export function KanbanColumn({ column, tasks, onTaskClick, selectedTasks, onToggleSelect, hasMore, onLoadMore, isLoadingMore }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const colors = COLUMN_COLORS[column.id] || COLUMN_COLORS['todo'];

  return (
    <div
      ref={setNodeRef}
      className={`
        flex-1 min-w-[280px] max-w-[320px] rounded-2xl 
        bg-muted/50 dark:bg-muted/20 
        transition-all duration-300 ease-out
        flex flex-col max-h-[calc(100vh-220px)]
        ${isOver 
          ? `ring-2 ${colors.glow} ${colors.dropGlow} scale-[1.01] shadow-lg` 
          : 'ring-0 shadow-none'
        }
      `}
    >
      {/* Column Header */}
      <div className={`flex justify-between items-center p-3 rounded-t-2xl ${colors.header} transition-colors duration-200 shrink-0`}>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${colors.dot} ${isOver ? 'animate-pulse' : ''}`}></span>
          <h3 className="font-bold text-foreground text-sm">{column.label}</h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors.badge} tabular-nums`}>
          {tasks.length}
        </span>
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
              />
            ))}
          </div>
        </SortableContext>

        {/* Load More */}
        {hasMore && (
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="w-full mt-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading...
              </>
            ) : 'Load more tasks'}
          </button>
        )}
      </div>
    </div>
  );
}