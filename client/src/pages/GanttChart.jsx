import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  format,
  isAfter,
  isBefore,
  startOfDay,
  subDays,
} from 'date-fns';
import {
  AlertTriangle,
  Baseline,
  Calendar as CalendarIcon,
  ChevronDown,
  Filter,
  GanttChartSquare,
  GripVertical,
  Link2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { ExportMenu } from '../components/ExportMenu';
import { exportToCSV, exportToPDF, buildGanttExportData } from '../utils/exportUtils';
import { getDependencyScheduleConflicts } from '../utils/taskState';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';

import api from '../api/axios';
import { useDataRefresh } from '../context/useDataRefresh';

const PRIORITY_COLORS = {
  urgent: 'bg-red-600',
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
};

const PRIORITY_HEX = {
  urgent: '#dc2626',
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
};

const ROW_HEIGHT = 48;
const GROUP_HEIGHT = 34;
const DAY_WIDTH = 36;
const TASK_LABEL_WIDTH = 280;

const dateKey = (date) => startOfDay(date).toISOString();

const toDate = (value) => {
  if (!value) return null;
  const date = startOfDay(new Date(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const getTaskStart = (task) => toDate(task.startDate) || toDate(task.dueDate);
const getTaskEnd = (task) => toDate(task.dueDate) || toDate(task.startDate);

const shiftDate = (date, deltaDays) => addDays(startOfDay(date), deltaDays);

const getInteractionPreview = (interaction, clientX) => {
  const delta = Math.round((clientX - interaction.originX) / DAY_WIDTH);
  let nextStart = interaction.start;
  let nextEnd = interaction.end;

  if (interaction.mode === 'move') {
    nextStart = shiftDate(interaction.start, delta);
    nextEnd = shiftDate(interaction.end, delta);
  } else if (interaction.mode === 'start') {
    const candidate = shiftDate(interaction.start, delta);
    nextStart = isAfter(candidate, interaction.end) ? interaction.end : candidate;
  } else if (interaction.mode === 'end') {
    const candidate = shiftDate(interaction.end, delta);
    nextEnd = isBefore(candidate, interaction.start) ? interaction.start : candidate;
  }

  return { start: nextStart, end: nextEnd };
};

const normalizeRange = (range) => {
  if (!range?.from) {
    return { from: startOfDay(subDays(new Date(), 7)), to: startOfDay(addDays(new Date(), 30)) };
  }
  return {
    from: startOfDay(range.from),
    to: startOfDay(range.to || range.from),
  };
};

const getId = (value) => value?._id || value;

function getAssigneeLabel(task) {
  return task.assignee?.name || task.assignee?.email || task.assigneeEmail || 'Unassigned';
}

function getProjectLabel(task) {
  return task.project?.name || task.projectName || task.projectMemberships?.[0]?.project?.name || 'No Project';
}

function getGroupLabel(task, groupBy) {
  if (groupBy === 'project') return getProjectLabel(task);
  if (groupBy === 'assignee') return getAssigneeLabel(task);
  if (groupBy === 'status') return task.status || 'No status';
  if (groupBy === 'milestone') return task.isMilestone ? 'Milestones' : 'Tasks';
  return 'Timeline';
}

function computeCriticalTaskIds(tasks) {
  const byId = new Map(tasks.map((task) => [task._id, task]));
  const memo = new Map();
  const visiting = new Set();

  const visit = (task) => {
    if (!task?._id) return { length: 0, path: [] };
    if (memo.has(task._id)) return memo.get(task._id);
    if (visiting.has(task._id)) return { length: 0, path: [] };

    visiting.add(task._id);
    const duration = Math.max(1, task.duration || 1);
    let best = { length: 0, path: [] };

    for (const dependency of task.dependencies || []) {
      const dependencyTask = byId.get(getId(dependency));
      if (!dependencyTask) continue;
      const candidate = visit(dependencyTask);
      if (candidate.length > best.length) best = candidate;
    }

    visiting.delete(task._id);
    const result = { length: best.length + duration, path: [...best.path, task._id] };
    memo.set(task._id, result);
    return result;
  };

  let critical = { length: 0, path: [] };
  for (const task of tasks) {
    const candidate = visit(task);
    if (candidate.length > critical.length) critical = candidate;
  }

  return new Set(critical.path);
}

export default function GanttChart() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [statusFilters, setStatusFilters] = useState(['todo', 'in-progress', 'review', 'done']);
  const [priorityFilters, setPriorityFilters] = useState(['low', 'medium', 'high', 'urgent']);
  const [groupBy, setGroupBy] = useState('project');
  const [pendingDependencyId, setPendingDependencyId] = useState(null);
  const [interaction, setInteraction] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7),
    to: addDays(new Date(), 30),
  });

  const chartRef = useRef(null);
  const { refreshKey } = useDataRefresh();
  const normalizedRange = useMemo(() => normalizeRange(dateRange), [dateRange]);
  const days = useMemo(
    () => eachDayOfInterval({ start: normalizedRange.from, end: normalizedRange.to }),
    [normalizedRange],
  );
  const totalDays = Math.max(1, days.length);
  const timelineWidth = totalDays * DAY_WIDTH;
  const todayOffset = useMemo(() => {
    const today = startOfDay(new Date());
    if (isBefore(today, normalizedRange.from) || isAfter(today, normalizedRange.to)) return null;
    return differenceInCalendarDays(today, normalizedRange.from);
  }, [normalizedRange]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tasksRes, projectsRes] = await Promise.all([
          selectedProject === 'all'
            ? api.get('/tasks/my-tasks')
            : api.get(`/tasks/project/${selectedProject}`),
          api.get('/projects'),
        ]);
        setTasks(tasksRes.data);
        setProjects(projectsRes.data);
      } catch {
        toast.error('Failed to load Gantt data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedProject, refreshKey]);

  const visibleTasks = useMemo(() => {
    const rangeStart = startOfDay(normalizedRange.from);
    const rangeEnd = endOfDay(normalizedRange.to);

    const scheduled = tasks
      .filter((task) => {
        if (!statusFilters.includes(task.status)) return false;
        if (!priorityFilters.includes(task.priority)) return false;
        const start = getTaskStart(task);
        const end = getTaskEnd(task);
        if (!start || !end) return false;
        return end >= rangeStart && start <= rangeEnd;
      })
      .map((task) => {
        const preview = interaction?.taskId === task._id ? interaction.preview : null;
        const start = preview?.start || getTaskStart(task);
        const end = preview?.end || getTaskEnd(task);
        const clampedStart = isBefore(start, rangeStart) ? rangeStart : start;
        const clampedEnd = isAfter(end, rangeEnd) ? rangeEnd : end;
        const offset = Math.max(0, differenceInCalendarDays(clampedStart, rangeStart));
        const duration = Math.max(1, differenceInCalendarDays(clampedEnd, clampedStart) + 1);
        const plannedStart = toDate(task.plannedStartDate);
        const plannedEnd = toDate(task.plannedDueDate);
        const baselineOffset = plannedStart ? Math.max(0, differenceInCalendarDays(plannedStart, rangeStart)) : null;
        const baselineDuration = plannedStart && plannedEnd
          ? Math.max(1, differenceInCalendarDays(plannedEnd, plannedStart) + 1)
          : null;

        return {
          ...task,
          name: task.title,
          projectName: getProjectLabel(task),
          assigneeName: getAssigneeLabel(task),
          timelineStart: start,
          timelineEnd: end,
          offset,
          duration,
          baselineOffset,
          baselineDuration,
          scheduleConflicts: getDependencyScheduleConflicts({ ...task, startDate: start, dependencies: task.dependencies || [] }),
        };
      })
      .sort((a, b) => {
        const groupDiff = getGroupLabel(a, groupBy).localeCompare(getGroupLabel(b, groupBy));
        if (groupDiff !== 0) return groupDiff;
        const startDiff = a.timelineStart - b.timelineStart;
        if (startDiff !== 0) return startDiff;
        return (a.index ?? 0) - (b.index ?? 0);
      });

    const criticalIds = computeCriticalTaskIds(scheduled);
    return scheduled.map((task) => ({ ...task, isCritical: criticalIds.has(task._id) }));
  }, [tasks, statusFilters, priorityFilters, normalizedRange, groupBy, interaction]);

  const rows = useMemo(() => {
    if (groupBy === 'none') return visibleTasks.map((task) => ({ type: 'task', task }));
    const grouped = [];
    let currentGroup = null;
    for (const task of visibleTasks) {
      const label = getGroupLabel(task, groupBy);
      if (label !== currentGroup) {
        currentGroup = label;
        grouped.push({ type: 'group', label });
      }
      grouped.push({ type: 'task', task });
    }
    return grouped;
  }, [visibleTasks, groupBy]);

  const taskRowMeta = useMemo(() => {
    const map = new Map();
    let y = 0;
    for (const row of rows) {
      if (row.type === 'group') {
        y += GROUP_HEIGHT;
      } else {
        map.set(row.task._id, { y, height: ROW_HEIGHT, task: row.task });
        y += ROW_HEIGHT;
      }
    }
    return map;
  }, [rows]);

  const chartHeight = rows.reduce((height, row) => height + (row.type === 'group' ? GROUP_HEIGHT : ROW_HEIGHT), 0);

  const dependencyLines = useMemo(() => {
    const lines = [];
    for (const task of visibleTasks) {
      const targetMeta = taskRowMeta.get(task._id);
      if (!targetMeta) continue;

      for (const dependency of task.dependencies || []) {
        const sourceId = getId(dependency);
        const sourceMeta = taskRowMeta.get(sourceId);
        if (!sourceMeta) continue;
        const source = sourceMeta.task;
        const x1 = (source.offset + source.duration) * DAY_WIDTH;
        const y1 = sourceMeta.y + ROW_HEIGHT / 2;
        const x2 = task.offset * DAY_WIDTH;
        const y2 = targetMeta.y + ROW_HEIGHT / 2;
        lines.push({
          id: `${sourceId}-${task._id}`,
          critical: source.isCritical && task.isCritical,
          conflict: task.scheduleConflicts.some((conflict) => getId(conflict) === sourceId),
          path: `M ${x1} ${y1} C ${x1 + 28} ${y1}, ${x2 - 28} ${y2}, ${x2} ${y2}`,
        });
      }
    }
    return lines;
  }, [visibleTasks, taskRowMeta]);

  const unscheduledCount = useMemo(
    () => tasks.filter((task) => !getTaskStart(task) && !getTaskEnd(task)).length,
    [tasks],
  );

  const updateTaskInState = useCallback((taskId, patch) => {
    setTasks((current) => current.map((task) => (task._id === taskId ? { ...task, ...patch } : task)));
  }, []);

  const persistTaskPatch = useCallback(async (taskId, patch, rollbackPatch) => {
    updateTaskInState(taskId, patch);
    try {
      const { data } = await api.put(`/tasks/${taskId}`, patch);
      setTasks((current) => current.map((task) => (task._id === taskId ? { ...task, ...data } : task)));
    } catch {
      updateTaskInState(taskId, rollbackPatch);
      toast.error('Schedule update failed');
    }
  }, [updateTaskInState]);

  const startInteraction = (event, task, mode) => {
    event.preventDefault();
    event.stopPropagation();
    const start = getTaskStart(task);
    const end = getTaskEnd(task);
    if (!start || !end) return;
    setInteraction({
      taskId: task._id,
      mode,
      originX: event.clientX,
      start,
      end,
      preview: { start, end },
    });
  };

  useEffect(() => {
    if (!interaction) return undefined;

    const onPointerMove = (event) => {
      setInteraction((current) => current
        ? { ...current, preview: getInteractionPreview(current, event.clientX) }
        : current);
    };

    const onPointerUp = (event) => {
      const task = tasks.find((item) => item._id === interaction.taskId);
      const preview = getInteractionPreview(interaction, event.clientX);
      setInteraction(null);
      if (!task || !preview) return;

      const patch = {
        startDate: preview.start.toISOString(),
        dueDate: endOfDay(preview.end).toISOString(),
      };
      const rollbackPatch = {
        startDate: task.startDate,
        dueDate: task.dueDate,
      };
      persistTaskPatch(task._id, patch, rollbackPatch);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [interaction, persistTaskPatch, tasks]);

  const handleDependencyHandle = async (event, task) => {
    event.preventDefault();
    event.stopPropagation();

    if (!pendingDependencyId) {
      setPendingDependencyId(task._id);
      toast.info(`Select the task blocked by "${task.title}"`);
      return;
    }

    if (pendingDependencyId === task._id) {
      setPendingDependencyId(null);
      return;
    }

    const alreadyLinked = task.dependencies?.some((dependency) => getId(dependency) === pendingDependencyId);
    if (alreadyLinked) {
      setPendingDependencyId(null);
      toast.info('Dependency already exists');
      return;
    }

    const previousDependencies = task.dependencies || [];
    const blocker = tasks.find((item) => item._id === pendingDependencyId);
    updateTaskInState(task._id, { dependencies: [...previousDependencies, blocker].filter(Boolean) });
    setPendingDependencyId(null);

    try {
      const { data } = await api.post(`/tasks/${task._id}/dependencies`, { dependencyId: pendingDependencyId });
      setTasks((current) => current.map((item) => (item._id === task._id ? { ...item, dependencies: data.dependencies } : item)));
      toast.success('Dependency added');
    } catch {
      updateTaskInState(task._id, { dependencies: previousDependencies });
      toast.error('Dependency update failed');
    }
  };

  const captureVisibleBaseline = async () => {
    const baselineTasks = visibleTasks.filter((task) => task.timelineStart && task.timelineEnd);
    if (baselineTasks.length === 0) return;

    const patches = baselineTasks.map((task) => ({
      taskId: task._id,
      patch: {
        plannedStartDate: task.timelineStart.toISOString(),
        plannedDueDate: endOfDay(task.timelineEnd).toISOString(),
      },
      rollback: {
        plannedStartDate: task.plannedStartDate,
        plannedDueDate: task.plannedDueDate,
      },
    }));

    setTasks((current) => current.map((task) => {
      const item = patches.find((patch) => patch.taskId === task._id);
      return item ? { ...task, ...item.patch } : task;
    }));

    try {
      await Promise.all(patches.map(({ taskId, patch }) => api.put(`/tasks/${taskId}`, patch)));
      toast.success('Baseline captured for visible tasks');
    } catch {
      setTasks((current) => current.map((task) => {
        const item = patches.find((patch) => patch.taskId === task._id);
        return item ? { ...task, ...item.rollback } : task;
      }));
      toast.error('Baseline capture failed');
    }
  };

  const openTask = (task) => {
    setSelectedTask(task);
    setIsDetailsOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <GanttChartSquare className="h-6 w-6 text-primary" />
            Timeline View
          </h1>
          <p className="text-muted-foreground">
            Plan dates, dependencies, baselines, and critical work across time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full bg-card sm:w-[200px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All My Tasks</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project._id} value={project._id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-full bg-card sm:w-[170px]">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="project">Group: Project</SelectItem>
              <SelectItem value="assignee">Group: Assignee</SelectItem>
              <SelectItem value="status">Group: Status</SelectItem>
              <SelectItem value="milestone">Group: Milestone</SelectItem>
              <SelectItem value="none">No grouping</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="bg-card">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(normalizedRange.from, 'MMM d')} - {format(normalizedRange.to, 'MMM d')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={normalizedRange.from}
                selected={dateRange}
                onSelect={(range) => range && setDateRange(range)}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-card">
                <Filter className="mr-2 h-4 w-4" />
                Status
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {['todo', 'in-progress', 'review', 'done'].map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilters.includes(status)}
                  onCheckedChange={(checked) => {
                    setStatusFilters(checked
                      ? [...statusFilters, status]
                      : statusFilters.filter((item) => item !== status));
                  }}
                  className="capitalize"
                >
                  {status.replace('-', ' ')}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-card">
                <Filter className="mr-2 h-4 w-4" />
                Priority
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {['low', 'medium', 'high', 'urgent'].map((priority) => (
                <DropdownMenuCheckboxItem
                  key={priority}
                  checked={priorityFilters.includes(priority)}
                  onCheckedChange={(checked) => {
                    setPriorityFilters(checked
                      ? [...priorityFilters, priority]
                      : priorityFilters.filter((item) => item !== priority));
                  }}
                  className="capitalize"
                >
                  {priority}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" className="bg-card" onClick={captureVisibleBaseline} disabled={visibleTasks.length === 0}>
            <Baseline className="mr-2 h-4 w-4" />
            Set baseline
          </Button>

          <ExportMenu
            onExportCSV={() => {
              const { headers, rows: exportRows } = buildGanttExportData(visibleTasks);
              exportToCSV({ headers, rows: exportRows, filename: 'gantt-chart.csv' });
            }}
            onExportPDF={() => {
              const { headers, rows: exportRows } = buildGanttExportData(visibleTasks);
              exportToPDF({ title: 'Gantt Chart - Timeline', headers, rows: exportRows, filename: 'gantt-chart.pdf' });
            }}
          />
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border/50 pb-2">
          <CardTitle className="flex flex-col gap-2 text-sm font-semibold md:flex-row md:items-center md:justify-between">
            <span>
              {visibleTasks.length} tasks in timeline
              {unscheduledCount > 0 ? `, ${unscheduledCount} unscheduled` : ''}
            </span>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-purple-600" />Critical path</span>
              <span className="flex items-center gap-1.5"><span className="h-1 w-5 rounded-full bg-slate-400" />Baseline</span>
              {Object.entries(PRIORITY_HEX).map(([priority, color]) => (
                <span key={priority} className="flex items-center gap-1.5 capitalize">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  {priority}
                </span>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {visibleTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <GanttChartSquare className="mb-4 h-12 w-12 opacity-40" />
              <h3 className="mb-1 text-base font-semibold text-foreground">No tasks in this timeline</h3>
              <p className="max-w-xs text-sm">Try adjusting the date range or filters to see scheduled work.</p>
            </div>
          ) : (
            <div ref={chartRef} className="overflow-auto">
              <div
                className="grid min-w-max"
                style={{ gridTemplateColumns: `${TASK_LABEL_WIDTH}px ${timelineWidth}px` }}
              >
                <div className="sticky left-0 top-0 z-30 border-b border-r border-border bg-card px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Task
                </div>
                <div
                  className="sticky top-0 z-20 grid border-b border-border bg-card"
                  style={{ gridTemplateColumns: `repeat(${totalDays}, ${DAY_WIDTH}px)` }}
                >
                  {days.map((day) => (
                    <div
                      key={dateKey(day)}
                      className="border-r border-border/70 px-1 py-2 text-center text-[10px] font-medium text-muted-foreground"
                    >
                      <div>{format(day, 'MMM')}</div>
                      <div className="text-foreground">{format(day, 'd')}</div>
                    </div>
                  ))}
                </div>

                <div className="sticky left-0 z-10 border-r border-border bg-card" style={{ height: chartHeight }}>
                  {rows.map((row, index) => {
                    if (row.type === 'group') {
                      return (
                        <div key={`${row.label}-${index}`} className="flex items-center border-b border-border/70 bg-muted/40 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ height: GROUP_HEIGHT }}>
                          {row.label}
                        </div>
                      );
                    }
                    return (
                      <button
                        key={row.task._id}
                        type="button"
                        onClick={() => openTask(row.task)}
                        className="flex w-full min-w-0 flex-col items-start justify-center gap-1 border-b border-border/70 px-4 text-left transition hover:bg-muted/40"
                        style={{ height: ROW_HEIGHT }}
                      >
                        <span className="max-w-full truncate text-sm font-semibold text-foreground">{row.task.title}</span>
                        <span className="flex max-w-full items-center gap-1.5 text-xs text-muted-foreground">
                          {row.task.isMilestone && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Milestone</Badge>}
                          {row.task.isCritical && <Badge className="h-5 bg-purple-600 px-1.5 text-[10px]">Critical</Badge>}
                          {row.task.scheduleConflicts.length > 0 && <AlertTriangle className="h-3 w-3 text-red-600" />}
                          <span className="truncate">{row.task.assigneeName}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div
                  className="relative"
                  style={{
                    width: timelineWidth,
                    height: chartHeight,
                    backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${DAY_WIDTH - 1}px, hsl(var(--border) / 0.55) ${DAY_WIDTH - 1}px, hsl(var(--border) / 0.55) ${DAY_WIDTH}px)`,
                  }}
                >
                  <svg className="pointer-events-none absolute inset-0 z-10" width={timelineWidth} height={chartHeight}>
                    <defs>
                      <marker id="dependency-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M 0 0 L 8 4 L 0 8 z" fill="#64748b" />
                      </marker>
                      <marker id="dependency-arrow-risk" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M 0 0 L 8 4 L 0 8 z" fill="#dc2626" />
                      </marker>
                    </defs>
                    {dependencyLines.map((line) => (
                      <path
                        key={line.id}
                        d={line.path}
                        fill="none"
                        stroke={line.conflict ? '#dc2626' : line.critical ? '#9333ea' : '#64748b'}
                        strokeWidth={line.critical ? 2.5 : 1.8}
                        strokeDasharray={line.conflict ? '5 4' : undefined}
                        markerEnd={line.conflict ? 'url(#dependency-arrow-risk)' : 'url(#dependency-arrow)'}
                      />
                    ))}
                  </svg>

                  {todayOffset !== null && (
                    <div
                      className="pointer-events-none absolute bottom-0 top-0 z-10 border-l-2 border-dashed border-primary"
                      style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                    >
                      <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        Today
                      </span>
                    </div>
                  )}

                  {rows.map((row, index) => {
                    const y = rows.slice(0, index).reduce((sum, item) => sum + (item.type === 'group' ? GROUP_HEIGHT : ROW_HEIGHT), 0);
                    if (row.type === 'group') {
                      return (
                        <div key={`${row.label}-${index}-grid`} className="absolute left-0 right-0 border-b border-border/70 bg-muted/30" style={{ top: y, height: GROUP_HEIGHT }} />
                      );
                    }

                    const task = row.task;
                    const left = task.offset * DAY_WIDTH;
                    const width = Math.max(task.isMilestone ? 24 : 18, task.duration * DAY_WIDTH - 8);
                    const baselineLeft = task.baselineOffset !== null ? task.baselineOffset * DAY_WIDTH : null;
                    const baselineWidth = task.baselineDuration !== null ? Math.max(18, task.baselineDuration * DAY_WIDTH - 8) : null;
                    const color = task.isCritical ? 'bg-purple-600' : PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
                    const hasRisk = task.scheduleConflicts.length > 0;

                    return (
                      <div key={`${task._id}-lane`} className="absolute left-0 right-0 border-b border-border/60" style={{ top: y, height: ROW_HEIGHT }}>
                        {baselineLeft !== null && baselineWidth !== null && (
                          <div
                            className="absolute top-2 h-1.5 rounded-full bg-slate-400/80"
                            style={{ left: baselineLeft + 4, width: baselineWidth }}
                            title="Baseline"
                          />
                        )}
                        <button
                          type="button"
                          onPointerDown={(event) => startInteraction(event, task, 'move')}
                          onDoubleClick={() => openTask(task)}
                          aria-label={`Schedule ${task.title}`}
                          className={`absolute top-1/2 z-20 flex h-8 -translate-y-1/2 items-center gap-1.5 rounded-md px-2 text-left text-xs font-semibold text-white shadow-sm transition hover:brightness-110 ${task.isMilestone ? 'rotate-45 rounded-sm bg-amber-500 px-0' : color} ${hasRisk ? 'ring-2 ring-red-500 ring-offset-1 ring-offset-card' : ''}`}
                          style={{ left: left + 4, width: task.isMilestone ? 24 : width }}
                          title={hasRisk ? `Starts before ${task.scheduleConflicts.length} blocker${task.scheduleConflicts.length === 1 ? '' : 's'} finish` : 'Drag to reschedule. Drag edges to resize.'}
                        >
                          {!task.isMilestone && (
                            <>
                              <span
                                className="absolute left-0 top-0 flex h-full w-2 cursor-ew-resize items-center justify-center rounded-l-md bg-black/15"
                                onPointerDown={(event) => startInteraction(event, task, 'start')}
                                role="button"
                                aria-label={`Resize start ${task.title}`}
                              />
                              <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-80" />
                              <span className="min-w-0 flex-1 truncate">{task.title}</span>
                              {hasRisk && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                              <span
                                className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-md bg-black/15"
                                onPointerDown={(event) => startInteraction(event, task, 'end')}
                                role="button"
                                aria-label={`Resize end ${task.title}`}
                              />
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => handleDependencyHandle(event, task)}
                          aria-label={pendingDependencyId ? `Make ${task.title} blocked by selected task` : `Start dependency from ${task.title}`}
                          className={`absolute top-1/2 z-30 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition hover:text-foreground ${pendingDependencyId === task._id ? 'border-primary text-primary' : 'border-border'}`}
                          style={{ left: left + width + 10 }}
                          title={pendingDependencyId ? 'Click to make this task blocked by the selected task' : 'Start dependency link from this task'}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TaskDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        task={selectedTask}
        projectId={selectedTask?.project?._id}
        orgId={selectedTask?.organization}
      />
    </div>
  );
}
