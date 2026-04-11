import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckSquare,
  FolderKanban,
  Loader2,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';
import api from '../api/axios';
import { trackProductEvent } from '../utils/productAnalytics';

function getPriorityColor(priority) {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return 'bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800';
    case 'high':
      return 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800';
    case 'low':
      return 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
    default:
      return 'bg-slate-500/20 text-slate-700 dark:text-slate-400';
  }
}

function formatDueDate(dueDate) {
  if (!dueDate) return 'No due date';
  const parsed = new Date(dueDate);
  if (isToday(parsed)) return `Today, ${format(parsed, 'p')}`;
  if (isTomorrow(parsed)) return `Tomorrow, ${format(parsed, 'p')}`;
  return format(parsed, 'MMM d, p');
}

function FocusTaskActions({
  task,
  busyAction,
  onCreateSubtasks,
  onReschedule,
  onStartNow,
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
      <Button
        size="sm"
        className="h-7 rounded-full px-3 text-[11px]"
        onClick={() => onStartNow(task)}
        disabled={busyAction !== null}
      >
        {busyAction === 'start' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
        Start Now
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 rounded-full px-3 text-[11px]"
        onClick={() => onReschedule(task)}
        disabled={busyAction !== null}
      >
        {busyAction === 'reschedule' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
        Tomorrow
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 rounded-full px-3 text-[11px]"
        onClick={() => onCreateSubtasks(task)}
        disabled={busyAction !== null}
      >
        {busyAction === 'subtasks' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        Create Subtasks
      </Button>
      {task.project?._id ? (
        <Button asChild size="sm" variant="ghost" className="h-7 rounded-full px-2 text-[11px]">
          <Link to={`/project/${task.project._id}`}>
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 rounded-full px-2 text-[11px]"
          onClick={() => navigate('/tasks')}
          disabled={busyAction !== null}
        >
          My Tasks
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export function SmartFocusMode() {
  const [focusTasks, setFocusTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busyTaskId, setBusyTaskId] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const [subtaskSuggestions, setSubtaskSuggestions] = useState({});

  const fetchFocus = useCallback(async (forceRefresh = false) => {
    if (focusTasks.length > 0 && !forceRefresh) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/ai/focus');
      setFocusTasks(Array.isArray(res.data?.focusTasks) ? res.data.focusTasks : []);
    } catch (err) {
      console.error('Failed to fetch focus:', err);
      setFocusTasks([]);
      setError(
        err.response?.status === 429
          ? 'Focus recommendations are temporarily rate-limited.'
          : 'Unable to load focus recommendations right now.',
      );
    } finally {
      setLoading(false);
    }
  }, [focusTasks]);

  useEffect(() => {
    fetchFocus();
  }, [fetchFocus]);

  const withBusy = async (taskId, action, handler) => {
    setBusyTaskId(taskId);
    setBusyAction(action);
    try {
      await handler();
    } finally {
      setBusyTaskId(null);
      setBusyAction(null);
    }
  };

  const handleStartNow = async (task) => {
    await withBusy(task.taskId, 'start', async () => {
      const { data } = await api.put(`/tasks/${task.taskId}`, {
        status: 'in-progress',
        priority: task.priority === 'low' ? 'medium' : task.priority,
      });
      trackProductEvent('focus_task_started', {
        projectId: task.project?._id,
        metadata: { priority: task.priority },
      });

      setFocusTasks((current) => current.map((item) => (
        item.taskId === task.taskId
          ? { ...item, status: data.status, priority: data.priority, focusReason: 'In progress now' }
          : item
      )));
    });
  };

  const handleReschedule = async (task) => {
    await withBusy(task.taskId, 'reschedule', async () => {
      const base = task.dueDate ? new Date(task.dueDate) : new Date();
      const nextDue = new Date(base);
      nextDue.setDate(base.getDate() + 1);
      const { data } = await api.put(`/tasks/${task.taskId}`, {
        dueDate: nextDue.toISOString(),
      });
      trackProductEvent('focus_task_rescheduled', {
        projectId: task.project?._id,
        metadata: { from: task.dueDate, to: data.dueDate },
      });

      setFocusTasks((current) => current.map((item) => (
        item.taskId === task.taskId
          ? { ...item, dueDate: data.dueDate, focusReason: 'Rescheduled for tomorrow' }
          : item
      )));
    });
  };

  const handleCreateSubtasks = async (task) => {
    await withBusy(task.taskId, 'subtasks', async () => {
      const { data } = await api.post('/ai/generate-subtasks', {
        title: task.title,
        description: task.description || task.focusReason || '',
      });

      const subtasks = Array.isArray(data?.subtasks) ? data.subtasks : [];
      if (subtasks.length === 0) {
        setSubtaskSuggestions((current) => ({
          ...current,
          [task.taskId]: [{ title: 'No suggestions available right now', description: '' }],
        }));
        return;
      }

      const created = [];
      for (const subtask of subtasks.slice(0, 3)) {
        await api.post(`/tasks/${task.taskId}/subtasks`, { title: subtask.title });
        created.push(subtask);
      }
      trackProductEvent('focus_subtasks_created', {
        projectId: task.project?._id,
        metadata: { count: created.length },
      });

      setSubtaskSuggestions((current) => ({
        ...current,
        [task.taskId]: created,
      }));
    });
  };

  return (
    <Card className="border-border bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-red-500/5 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-red-500/5 border-primary/20 shadow-sm rounded-2xl overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />

      <div className="flex items-center justify-between p-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/20 rounded-lg">
            <Target className="w-4 h-4 text-primary animate-pulse" />
          </div>
          <h3 className="font-bold text-sm bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
            Today&apos;s Focus
          </h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
          onClick={() => fetchFocus(true)}
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <CardContent className="p-4">
        {loading && focusTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
            <p className="text-xs font-medium animate-pulse">Finding your focus tasks...</p>
          </div>
        ) : error ? (
          <div className="py-4 text-center text-sm text-destructive flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        ) : focusTasks && focusTasks.length > 0 ? (
          <div className="space-y-3">
            {focusTasks.map((task, idx) => {
              const taskBusy = busyTaskId === task.taskId ? busyAction : null;
              const suggestions = subtaskSuggestions[task.taskId] || [];

              return (
                <div
                  key={task.taskId || idx}
                  className="p-3 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-border/50 hover:border-primary/30 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="text-primary font-semibold text-sm mt-0.5 flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-sm text-foreground line-clamp-2">
                            {task.title}
                          </p>
                          {task.status && (
                            <Badge variant="outline" className="capitalize">
                              {task.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {task.focusReason}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDueDate(task.dueDate)}
                          </span>
                          {task.project?.name && (
                            <span className="inline-flex items-center gap-1">
                              <FolderKanban className="h-3.5 w-3.5" />
                              {task.project.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>

                  <FocusTaskActions
                    task={task}
                    busyAction={taskBusy}
                    onCreateSubtasks={handleCreateSubtasks}
                    onReschedule={handleReschedule}
                    onStartNow={handleStartNow}
                  />

                  {suggestions.length > 0 && (
                    <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                        <CheckSquare className="h-3.5 w-3.5" />
                        AI subtasks created
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-foreground/80">
                        {suggestions.map((subtask, suggestionIndex) => (
                          <li key={`${task.taskId}-${suggestionIndex}`} className="line-clamp-1">
                            {subtask.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
              Focus mode now supports immediate task actions.
            </p>
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <p>All tasks are up to date!</p>
            <p className="text-xs mt-2">Take a break or plan ahead.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
