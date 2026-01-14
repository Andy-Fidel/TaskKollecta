import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTask } from './SortableTask';

export function KanbanColumn({ column, tasks, onTaskClick }) {
  // This hook makes the specific column ID a valid drop target
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
        <div
      ref={setNodeRef}
      className={`
        flex-1 rounded-2xl p-2.5 transition-colors duration-200
        ${column.id === 'done' ? 'bg-secondary/40' : 'bg-secondary/70'} 
      `}
    >
      {/* Column Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-700">{column.label}</h3>
        <span className="text-xs bg-white/50 px-2 py-1 rounded font-semibold text-slate-500">
          {tasks.length}
        </span>
      </div>

      {/* Sortable Context manages the items INSIDE the column */}
      <SortableContext
        id={column.id}
        items={tasks.map((t) => t._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-3 min-h-[100px]">
          {tasks.map((task) => (
            <SortableTask key={task._id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}