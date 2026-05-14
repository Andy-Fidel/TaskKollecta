import { useEffect, useMemo, useState } from 'react';
import { addDays, format, isSameDay, isToday, isTomorrow, startOfDay } from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Circle,
  Clock3,
  Filter,
  FolderKanban,
  GitBranch,
  Search,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExportMenu } from '../components/ExportMenu';
import api from '../api/axios';
import { useDataRefresh } from '../context/useDataRefresh';
import { exportToCSV, exportToPDF, buildTaskExportData } from '../utils/exportUtils';
import { trackProductEvent } from '../utils/productAnalytics';

const VIEWS = [
  { id: 'today', label: 'Today', description: 'Due today and overdue work first' },
  { id: 'attention', label: 'Needs Attention', description: 'Blocked, urgent, and slipping tasks' },
  { id: 'upcoming', label: 'Upcoming', description: 'Plan what lands next' },
  { id: 'all', label: 'All Tasks', description: 'Everything assigned to you' },
];

const SECTIONS = [
  { id: 'overdue', label: 'Overdue', empty: 'Nothing is overdue.' },
  { id: 'today', label: 'Due Today', empty: 'No tasks due today.' },
  { id: 'blocked', label: 'Blocked', empty: 'Nothing is blocked right now.' },
  { id: 'upcoming', label: 'Upcoming', empty: 'No upcoming work in this view.' },
  { id: 'done', label: 'Completed', empty: 'No completed tasks match these filters.' },
  { id: 'backlog', label: 'No Due Date', empty: 'No undated tasks match these filters.' },
];

const PRIORITY_ORDER = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_BADGE_CLASS = {
  urgent: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  low: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
};

export function getTaskTriageMeta(task, now = new Date()) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const blockers = Array.isArray(task.dependencies)
    ? task.dependencies.filter((dependency) => dependency?.status !== 'done')
    : [];
  const completed = task.status === 'done';
  const blocked = !completed && blockers.length > 0;
  const todayStart = startOfDay(now);
  const dueToday = !completed && dueDate ? isSameDay(dueDate, now) : false;
  const overdue = !completed && dueDate ? dueDate < todayStart : false;
  const upcoming = !completed && dueDate ? dueDate > todayStart && !dueToday : false;

  let section = 'backlog';
  if (completed) section = 'done';
  else if (overdue) section = 'overdue';
  else if (dueToday) section = 'today';
  else if (blocked) section = 'blocked';
  else if (upcoming) section = 'upcoming';

  return {
    blockers,
    blocked,
    completed,
    dueDate,
    dueToday,
    overdue,
    section,
    upcoming,
  };
}

export function filterTasksForView(tasks, { view, priority, project, query }) {
  const normalizedQuery = query.trim().toLowerCase();

  return tasks.filter((task) => {
    const meta = getTaskTriageMeta(task);

    if (priority !== 'all' && task.priority !== priority) return false;
    if (project !== 'all' && task.project?._id !== project) return false;

    if (normalizedQuery) {
      const haystack = [
        task.title,
        task.project?.name,
        task.priority,
        ...meta.blockers.map((blocker) => blocker.title),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(normalizedQuery)) return false;
    }

    switch (view) {
      case 'today':
        return meta.section === 'overdue' || meta.section === 'today';
      case 'attention':
        return !meta.completed && (meta.blocked || meta.overdue || ['urgent', 'high'].includes(task.priority));
      case 'upcoming':
        return meta.section === 'upcoming' || meta.section === 'backlog';
      case 'all':
      default:
        return true;
    }
  });
}

function groupTasks(tasks) {
  const groups = {
    overdue: [],
    today: [],
    blocked: [],
    upcoming: [],
    done: [],
    backlog: [],
  };

  tasks.forEach((task) => {
    groups[getTaskTriageMeta(task).section].push(task);
  });

  Object.values(groups).forEach((sectionTasks) => {
    sectionTasks.sort((a, b) => {
      const aMeta = getTaskTriageMeta(a);
      const bMeta = getTaskTriageMeta(b);
      const aDue = aMeta.dueDate ? aMeta.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = bMeta.dueDate ? bMeta.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
      const priorityDelta = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);

      if (aDue !== bDue) return aDue - bDue;
      if (priorityDelta !== 0) return priorityDelta;
      return a.title.localeCompare(b.title);
    });
  });

  return groups;
}

function formatDueLabel(dueDate) {
  if (!dueDate) return 'No due date';
  if (isToday(dueDate)) return `Today, ${format(dueDate, 'p')}`;
  if (isTomorrow(dueDate)) return `Tomorrow, ${format(dueDate, 'p')}`;
  return format(dueDate, "MMM d, p");
}

function summarizeCounts(tasks) {
  return tasks.reduce(
    (summary, task) => {
      const meta = getTaskTriageMeta(task);
      if (meta.overdue) summary.overdue += 1;
      if (meta.dueToday) summary.today += 1;
      if (meta.blocked) summary.blocked += 1;
      if (meta.completed) summary.done += 1;
      return summary;
    },
    { blocked: 0, done: 0, overdue: 0, today: 0 },
  );
}

function QuickActionButton({ children, onClick, variant = 'outline' }) {
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className="h-7 rounded-full px-2.5 text-[11px]"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function TaskRow({ task, onToggleDone, onSetPriority, onSnooze }) {
  const meta = getTaskTriageMeta(task);
  const blockerPreview = meta.blockers.slice(0, 2).map((blocker) => blocker.title).join(', ');
  const dueLabel = formatDueLabel(meta.dueDate);

  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm transition hover:border-primary/30 hover:bg-muted/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => onToggleDone(task)}
              className="mt-0.5 text-muted-foreground transition hover:text-emerald-600"
              aria-label={task.status === 'done' ? `Reopen ${task.title}` : `Mark ${task.title} done`}
            >
              {task.status === 'done' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className={`text-sm font-semibold ${task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {task.title}
                </p>
                {meta.overdue && <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-rose-600">Overdue</Badge>}
                {meta.dueToday && <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600">Today</Badge>}
                {meta.blocked && <Badge variant="outline" className="border-violet-500/20 bg-violet-500/10 text-violet-600">Blocked</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <FolderKanban className="h-3.5 w-3.5" />
                  {task.project ? (
                    <Link to={`/project/${task.project._id}`} className="hover:text-primary hover:underline">
                      {task.project.name}
                    </Link>
                  ) : (
                    'No project'
                  )}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className={meta.overdue ? 'font-semibold text-rose-600' : ''}>{dueLabel}</span>
                </span>
                <Badge variant="outline" className={`capitalize ${PRIORITY_BADGE_CLASS[task.priority] ?? ''}`}>
                  {task.priority}
                </Badge>
              </div>
            </div>
          </div>

          {meta.blocked && (
            <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 px-3 py-2 text-xs text-violet-700 dark:text-violet-300">
              <div className="flex items-center gap-2 font-medium">
                <GitBranch className="h-3.5 w-3.5" />
                Waiting on {meta.blockers.length} task{meta.blockers.length > 1 ? 's' : ''}
              </div>
              <p className="mt-1 text-violet-700/80 dark:text-violet-300/80">
                {blockerPreview}
                {meta.blockers.length > 2 ? ` +${meta.blockers.length - 2} more` : ''}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:w-[320px] lg:justify-end">
          {task.status !== 'done' && (
            <QuickActionButton onClick={() => onToggleDone(task)}>
              Mark Done
            </QuickActionButton>
          )}
          {task.priority !== 'urgent' && task.status !== 'done' && (
            <QuickActionButton onClick={() => onSetPriority(task, 'urgent')}>
              Set Urgent
            </QuickActionButton>
          )}
          {task.status !== 'done' && (
            <>
              <QuickActionButton onClick={() => onSnooze(task, 1)}>
                Snooze 1d
              </QuickActionButton>
              <QuickActionButton onClick={() => onSnooze(task, 7)}>
                Snooze 7d
              </QuickActionButton>
            </>
          )}
          {task.project?._id ? (
            <Button asChild size="sm" className="h-7 rounded-full px-3 text-[11px]">
              <Link to={`/project/${task.project._id}`}>
                Open
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <Button size="sm" variant="secondary" className="h-7 rounded-full px-3 text-[11px]" disabled>
              No Project
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-20 text-center">
      <div className="mb-4 rounded-2xl bg-emerald-500/10 p-4 text-emerald-600">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Nothing needs you right now</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        This view is clear. Switch to another saved view, or let new assignments come to you here.
      </p>
    </div>
  );
}

export default function MyTasks() {
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(searchParams.get('view') || 'today');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || 'all');
  const [projectFilter, setProjectFilter] = useState(searchParams.get('project') || 'all');
  const { refreshKey, triggerRefresh } = useDataRefresh();

  useEffect(() => {
    setView(searchParams.get('view') || 'today');
    setSearchQuery(searchParams.get('q') || '');
    setPriorityFilter(searchParams.get('priority') || 'all');
    setProjectFilter(searchParams.get('project') || 'all');
  }, [searchParams]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const orgId = localStorage.getItem('activeOrgId');
        const endpoint = orgId ? `/tasks/my-tasks?orgId=${orgId}` : '/tasks/my-tasks';
        const { data } = await api.get(endpoint);
        setTasks(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [refreshKey]);

  const projectOptions = useMemo(() => {
    const seen = new Map();
    tasks.forEach((task) => {
      if (task.project?._id && !seen.has(task.project._id)) {
        seen.set(task.project._id, task.project);
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const filteredTasks = useMemo(
    () => filterTasksForView(tasks, {
      priority: priorityFilter,
      project: projectFilter,
      query: searchQuery,
      view,
    }),
    [tasks, priorityFilter, projectFilter, searchQuery, view],
  );

  const groupedTasks = useMemo(() => groupTasks(filteredTasks), [filteredTasks]);
  const counts = useMemo(() => summarizeCounts(filteredTasks), [filteredTasks]);

  const replaceTask = (taskId, nextTask) => {
    setTasks((current) => current.map((task) => (task._id === taskId ? { ...task, ...nextTask } : task)));
  };

  const handleToggleDone = async (task) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    replaceTask(task._id, { status: nextStatus });
    try {
      const { data } = await api.put(`/tasks/${task._id}`, { status: nextStatus });
      replaceTask(task._id, data);
      trackProductEvent(nextStatus === 'done' ? 'my_tasks_task_completed' : 'my_tasks_task_reopened', {
        organizationId: localStorage.getItem('activeOrgId'),
        projectId: task.project?._id,
        metadata: { view, priority: task.priority },
      });
      triggerRefresh();
    } catch {
      replaceTask(task._id, task);
    }
  };

  const handleSetPriority = async (task, priority) => {
    const previous = { ...task };
    replaceTask(task._id, { priority });
    try {
      const { data } = await api.put(`/tasks/${task._id}`, { priority });
      replaceTask(task._id, data);
      trackProductEvent('my_tasks_priority_changed', {
        organizationId: localStorage.getItem('activeOrgId'),
        projectId: task.project?._id,
        metadata: { from: task.priority, to: priority, view },
      });
      triggerRefresh();
    } catch {
      replaceTask(task._id, previous);
    }
  };

  const handleSnooze = async (task, days) => {
    const baseDate = task.dueDate ? new Date(task.dueDate) : new Date();
    const nextDueDate = addDays(baseDate, days);
    const previous = { ...task };
    replaceTask(task._id, { dueDate: nextDueDate.toISOString() });
    try {
      const { data } = await api.put(`/tasks/${task._id}`, { dueDate: nextDueDate.toISOString() });
      replaceTask(task._id, data);
      trackProductEvent('my_tasks_snoozed', {
        organizationId: localStorage.getItem('activeOrgId'),
        projectId: task.project?._id,
        metadata: { days, view },
      });
      triggerRefresh();
    } catch {
      replaceTask(task._id, previous);
    }
  };

  const hasVisibleTasks = Object.values(groupedTasks).some((sectionTasks) => sectionTasks.length > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Tasks</h1>
            <p className="text-muted-foreground">
              Triage what is due, blocked, or slipping without jumping across projects.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-rose-600">
              {counts.overdue} overdue
            </Badge>
            <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600">
              {counts.today} due today
            </Badge>
            <Badge variant="outline" className="border-violet-500/20 bg-violet-500/10 text-violet-600">
              {counts.blocked} blocked
            </Badge>
            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
              {counts.done} done
            </Badge>
          </div>
        </div>

        <ExportMenu
          onExportCSV={() => {
            const { headers, rows } = buildTaskExportData(filteredTasks);
            exportToCSV({ headers, rows, filename: 'my-tasks.csv' });
          }}
          onExportPDF={() => {
            const { headers, rows } = buildTaskExportData(filteredTasks);
            exportToPDF({
              title: 'My Tasks Triage',
              headers,
              rows,
              filename: 'my-tasks.pdf',
              subtitle: `Saved view: ${VIEWS.find((item) => item.id === view)?.label || 'All Tasks'}`,
            });
          }}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              view === item.id
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-card hover:border-primary/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{item.label}</span>
              {view === item.id && <Clock3 className="h-4 w-4 text-primary" />}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{item.description}</p>
          </button>
        ))}
      </div>

      <Card className="rounded-3xl border-border/80 bg-card/90 shadow-sm">
        <CardHeader className="space-y-4 border-b border-border/80">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1.5fr,1fr,1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tasks, projects, or blockers"
                className="pl-9"
              />
            </div>

            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Priority
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Project
              <select
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All projects</option>
                {projectOptions.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 p-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted/40" />
              ))}
            </div>
          ) : !hasVisibleTasks ? (
            <EmptyState />
          ) : (
            SECTIONS.map((section) => (
              <section key={section.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {section.label}
                    </h2>
                    <Badge variant="secondary" className="rounded-full">
                      {groupedTasks[section.id].length}
                    </Badge>
                  </div>
                </div>

                {groupedTasks[section.id].length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-4 py-5 text-sm text-muted-foreground">
                    {section.empty}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {groupedTasks[section.id].map((task) => (
                      <TaskRow
                        key={task._id}
                        task={task}
                        onToggleDone={handleToggleDone}
                        onSetPriority={handleSetPriority}
                        onSnooze={handleSnooze}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))
          )}
        </CardContent>
      </Card>

      {counts.blocked > 0 && (
        <div className="rounded-3xl border border-violet-500/20 bg-violet-500/5 px-5 py-4 text-sm text-violet-800 dark:text-violet-200">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Blocked work is now visible here.
          </div>
          <p className="mt-1 text-violet-800/80 dark:text-violet-200/80">
            Tasks with unfinished dependencies are separated automatically so you can unblock work before it slips.
          </p>
        </div>
      )}
    </div>
  );
}
