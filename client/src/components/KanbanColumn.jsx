import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTask } from './SortableTask';

const COLUMN_COLORS = {
  'todo': {
    header: 'bg-slate-100 dark:bg-slate-800',
    dot: 'bg-slate-500',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
  },
  'in-progress': {
    header: 'bg-blue-50 dark:bg-blue-950',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
  },
  'review': {
    header: 'bg-amber-50 dark:bg-amber-950',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
  },
  'done': {
    header: 'bg-green-50 dark:bg-green-950',
    dot: 'bg-green-500',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
  }
};

export function KanbanColumn({ column, tasks, onTaskClick, selectedTasks, onToggleSelect, hasMore, onLoadMore, isLoadingMore }) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  const colors = COLUMN_COLORS[column.id] || COLUMN_COLORS['todo'];

  return (
    <div
      ref={setNodeRef}
      className="flex-1 min-w-[280px] max-w-[320px] rounded-2xl bg-muted/50 dark:bg-muted/20 transition-colors duration-200"
    >
      {/* Column Header */}
      <div className={`flex justify-between items-center p-3 rounded-t-2xl ${colors.header}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`}></span>
          <h3 className="font-bold text-foreground text-sm">{column.label}</h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors.badge}`}>
          {tasks.length}
        </span>
      </div>

      {/* Tasks Container */}
      <div className="p-2.5">
        <SortableContext
          id={column.id}
          items={tasks.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex-1 space-y-3 min-h-[100px]">
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
            className="w-full mt-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading...' : 'Load more tasks'}
          </button>
        )}
      </div>
    </div>
  );
}