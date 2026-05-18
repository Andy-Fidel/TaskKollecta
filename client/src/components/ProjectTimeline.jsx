import { useMemo, useState } from 'react';
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  format,
  isAfter,
  isBefore,
  isToday,
  startOfDay,
  subDays,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Diamond, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getBlockingDependents, getDependencyScheduleConflicts } from '../utils/taskState';

const PRIORITY_COLORS = {
  urgent: 'bg-red-600',
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
};

const STATUS_COLORS = {
  done: 'bg-emerald-500',
  completed: 'bg-emerald-500',
};

const clampDate = (date, min, max) => {
  if (isBefore(date, min)) return min;
  if (isAfter(date, max)) return max;
  return date;
};

const getTaskStart = (task) => {
  if (task.startDate) return startOfDay(new Date(task.startDate));
  if (task.dueDate) return startOfDay(new Date(task.dueDate));
  return null;
};

const getTaskEnd = (task) => {
  if (task.dueDate) return endOfDay(new Date(task.dueDate));
  if (task.startDate) return endOfDay(new Date(task.startDate));
  return null;
};

export function ProjectTimeline({ tasks, onTaskClick, statusOptions = [] }) {
  const [rangeStart, setRangeStart] = useState(() => startOfDay(subDays(new Date(), 7)));
  const rangeEnd = useMemo(() => endOfDay(addDays(rangeStart, 34)), [rangeStart]);
  const days = useMemo(() => eachDayOfInterval({ start: rangeStart, end: rangeEnd }), [rangeStart, rangeEnd]);
  const statusMap = useMemo(() => new Map(statusOptions.map((status) => [status.id, status])), [statusOptions]);
  const dependencyMeta = useMemo(() => tasks.reduce((meta, task) => {
    meta[task._id] = {
      blockingCount: getBlockingDependents(task, tasks).length,
      scheduleConflicts: getDependencyScheduleConflicts(task),
    };
    return meta;
  }, {}), [tasks]);

  const scheduledTasks = useMemo(() => tasks
    .map((task) => {
      const start = getTaskStart(task);
      const end = getTaskEnd(task);
      if (!start || !end) return null;
      if (isBefore(end, rangeStart) || isAfter(start, rangeEnd)) return null;

      const clampedStart = clampDate(start, rangeStart, rangeEnd);
      const clampedEnd = clampDate(end, rangeStart, rangeEnd);
      const offset = Math.max(0, differenceInCalendarDays(clampedStart, rangeStart));
      const duration = Math.max(1, differenceInCalendarDays(clampedEnd, clampedStart) + 1);

      return {
        ...task,
        timelineStart: start,
        timelineEnd: end,
        offset,
        duration,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const startDiff = a.timelineStart - b.timelineStart;
      if (startDiff !== 0) return startDiff;
      return (a.index ?? 0) - (b.index ?? 0);
    }), [tasks, rangeStart, rangeEnd]);

  const unscheduledCount = tasks.filter((task) => !getTaskStart(task) && !getTaskEnd(task)).length;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarDays className="h-4 w-4 text-primary" />
            Roadmap timeline
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {scheduledTasks.length} scheduled tasks across {format(rangeStart, 'MMM d')} - {format(rangeEnd, 'MMM d')}
            {unscheduledCount > 0 ? `, ${unscheduledCount} unscheduled` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setRangeStart((date) => subDays(date, 14))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setRangeStart(startOfDay(subDays(new Date(), 7)))}>
            Today
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setRangeStart((date) => addDays(date, 14))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {scheduledTasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
          <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-base font-semibold text-foreground">No scheduled work in this range</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add start dates or due dates to tasks, or move the timeline range to see planned work.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="min-w-[980px]">
            <div className="sticky top-0 z-10 grid grid-cols-[260px_1fr] border-b border-border bg-card">
              <div className="border-r border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Task
              </div>
              <div className="grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(26px, 1fr))` }}>
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`border-r border-border/60 px-1 py-2 text-center text-[10px] font-medium ${isToday(day) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                  >
                    <div>{format(day, 'EEE')}</div>
                    <div>{format(day, 'd')}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              {scheduledTasks.map((task) => {
                const status = statusMap.get(task.status);
                const meta = dependencyMeta[task._id] || { blockingCount: 0, scheduleConflicts: [] };
                const barColor = STATUS_COLORS[task.status] || PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
                const dateLabel = task.timelineStart.toDateString() === task.timelineEnd.toDateString()
                  ? format(task.timelineEnd, 'MMM d')
                  : `${format(task.timelineStart, 'MMM d')} - ${format(task.timelineEnd, 'MMM d')}`;

                return (
                  <div key={task._id} className="grid min-h-[64px] grid-cols-[260px_1fr] border-b border-border/70">
                    <button
                      type="button"
                      onClick={() => onTaskClick(task)}
                      className="flex min-w-0 flex-col items-start justify-center gap-1 border-r border-border px-4 py-3 text-left transition hover:bg-muted/40"
                    >
                      <span className="max-w-full truncate text-sm font-semibold text-foreground">{task.title}</span>
                      <span className="flex max-w-full items-center gap-1.5 text-xs text-muted-foreground">
                        {task.isMilestone && <Diamond className="h-3 w-3 fill-amber-500 text-amber-500" />}
                        {task.dependencies?.length > 0 && <Link2 className="h-3 w-3 text-blue-500" />}
                        {meta.blockingCount > 0 && <span>{`Blocking ${meta.blockingCount}`}</span>}
                        {meta.scheduleConflicts.length > 0 && <span className="font-semibold text-red-600">Date risk</span>}
                        <span className="truncate">{dateLabel}</span>
                      </span>
                    </button>
                    <div
                      className="relative grid"
                      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(26px, 1fr))` }}
                    >
                      {days.map((day) => (
                        <div key={day.toISOString()} className={`border-r border-border/50 ${isToday(day) ? 'bg-primary/5' : ''}`} />
                      ))}
                      <button
                        type="button"
                        onClick={() => onTaskClick(task)}
                        className={`absolute top-1/2 flex h-8 -translate-y-1/2 items-center gap-2 rounded-md px-2 text-left text-xs font-semibold text-white shadow-sm transition hover:brightness-110 ${task.isMilestone ? 'rounded-sm bg-amber-500 px-0 rotate-45' : barColor}`}
                        style={{
                          left: `calc(${task.offset} * (100% / ${days.length}) + 4px)`,
                          width: task.isMilestone ? '24px' : `calc(${task.duration} * (100% / ${days.length}) - 8px)`,
                        }}
                        aria-label={`Open ${task.title}`}
                        title={meta.scheduleConflicts.length > 0 ? `Starts before ${meta.scheduleConflicts.length} blocker${meta.scheduleConflicts.length === 1 ? '' : 's'} finish` : undefined}
                      >
                        {!task.isMilestone && (
                          <>
                            <span className="min-w-0 flex-1 truncate">{task.title}</span>
                            <Badge variant="secondary" className="hidden h-5 shrink-0 bg-white/20 px-1.5 text-[10px] text-white md:inline-flex">
                              {status?.label || task.status}
                            </Badge>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
        {Object.entries(PRIORITY_COLORS).map(([priority, color]) => (
          <span key={priority} className="flex items-center gap-1.5 capitalize">
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
            {priority}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Done
        </span>
        <span className="flex items-center gap-1.5">
          <Diamond className="h-3 w-3 fill-amber-500 text-amber-500" />
          Milestone
        </span>
      </div>
    </div>
  );
}
