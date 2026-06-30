import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Flame,
  Gauge,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import api from '../api/axios';

const healthThemes = {
  positive: {
    label: 'On track',
    icon: CheckCircle2,
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    panel: 'border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-500/25 dark:bg-emerald-500/10',
    accent: 'text-emerald-600 dark:text-emerald-300',
    ring: 'bg-emerald-500',
  },
  warning: {
    label: 'Needs attention',
    icon: AlertTriangle,
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    panel: 'border-amber-200/80 bg-amber-50/80 dark:border-amber-500/25 dark:bg-amber-500/10',
    accent: 'text-amber-700 dark:text-amber-300',
    ring: 'bg-amber-500',
  },
  critical: {
    label: 'At risk',
    icon: Flame,
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    panel: 'border-rose-200/80 bg-rose-50/80 dark:border-rose-500/25 dark:bg-rose-500/10',
    accent: 'text-rose-700 dark:text-rose-300',
    ring: 'bg-rose-500',
  },
  neutral: {
    label: 'Monitoring',
    icon: Activity,
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    panel: 'border-sky-200/80 bg-sky-50/80 dark:border-sky-500/25 dark:bg-sky-500/10',
    accent: 'text-sky-700 dark:text-sky-300',
    ring: 'bg-sky-500',
  },
};

function getHealthTheme(snapshot) {
  if (!snapshot) return healthThemes.neutral;
  if (snapshot.includes('🚀') || snapshot.includes('✨')) return healthThemes.positive;
  if (snapshot.includes('⚠️')) return healthThemes.warning;
  if (snapshot.includes('🔥')) return healthThemes.critical;
  return healthThemes.neutral;
}

function StatTile({ icon, label, value, detail, tone = 'default' }) {
  const toneClass = {
    default: 'bg-muted/50 text-foreground',
    blue: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  }[tone];

  return (
    <div className="rounded-lg border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-md ${toneClass}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold leading-none text-foreground">{value}</p>
      {detail ? <p className="mt-2 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

export function ProjectHealthModal({ projectId, isOpen, onClose }) {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/ai/projects/${projectId}/health`);
      setHealth(data.healthSnapshot);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch project health:', err);
      setError('Unable to load project health');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      void fetchHealth();
    }
  }, [isOpen, fetchHealth]);

  if (!isOpen) return null;

  const theme = getHealthTheme(health);
  const ThemeIcon = theme.icon;
  const totalTasks = stats?.totalTasks ?? 0;
  const progress = totalTasks > 0 ? Math.round((stats.completedTasks / totalTasks) * 100) : 0;
  const hasStats = Boolean(stats && totalTasks > 0);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-health-title"
          className="max-h-[92vh] w-full max-w-2xl overflow-hidden border-border/80 bg-card shadow-2xl animate-in zoom-in-95 fade-in duration-200"
        >
          <div className="relative overflow-hidden border-b border-border/70 bg-gradient-to-br from-background via-card to-muted/60 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 id="project-health-title" className="text-xl font-semibold leading-tight text-foreground">
                      Project Health
                    </h2>
                    {!loading && !error ? (
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${theme.ring}`} />
                        {theme.label}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A focused snapshot of delivery momentum, workload pressure, and near-term risk.
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 shrink-0 rounded-md">
                <X className="h-4 w-4" />
                <span className="sr-only">Close project health modal</span>
              </Button>
            </div>
          </div>

          <div className="max-h-[calc(92vh-152px)] overflow-y-auto p-6">
            {loading ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Analyzing project health</p>
                  <p className="mt-1 text-sm text-muted-foreground">Reviewing task progress and deadline signals.</p>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-destructive">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Health snapshot unavailable</p>
                    <p className="mt-1 text-sm opacity-90">{error}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <section className={`rounded-lg border p-5 ${theme.panel}`}>
                  <div className="flex gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-card/80 shadow-sm ${theme.accent}`}>
                      <ThemeIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI assessment</p>
                      <p className={`mt-2 text-base font-medium leading-relaxed ${theme.accent}`}>
                        {health || 'No health assessment is available yet.'}
                      </p>
                    </div>
                  </div>
                </section>

                {hasStats ? (
                  <>
                    <section className="rounded-lg border border-border/70 bg-card/80 p-5 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completion</p>
                          <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-4xl font-semibold leading-none text-foreground">{progress}%</span>
                            <span className="text-sm text-muted-foreground">
                              {stats.completedTasks} of {totalTasks} tasks done
                            </span>
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                          <Gauge className="h-4 w-4 text-primary" />
                          {stats.weeklyCompletionRate}% weekly completion
                        </div>
                      </div>
                      <Progress value={progress} className="mt-5 h-2.5 bg-muted" />
                    </section>

                    <section className="grid gap-3 sm:grid-cols-3">
                      <StatTile
                        icon={<Zap className="h-4 w-4" />}
                        label="In progress"
                        value={stats.inProgressTasks}
                        detail="Tasks currently moving"
                        tone="blue"
                      />
                      <StatTile
                        icon={<Clock3 className="h-4 w-4" />}
                        label="Due soon"
                        value={stats.dueSoonTasks}
                        detail="Due in the next 3 days"
                        tone={stats.dueSoonTasks > 0 ? 'amber' : 'default'}
                      />
                      <StatTile
                        icon={<Flame className="h-4 w-4" />}
                        label="Overdue"
                        value={stats.overdueTasks}
                        detail="Tasks past due date"
                        tone={stats.overdueTasks > 0 ? 'rose' : 'default'}
                      />
                    </section>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
                    <Target className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 font-semibold text-foreground">No task metrics yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add tasks to this project to unlock completion and deadline insights.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border/70 bg-muted/20 p-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              Done
            </Button>
            <Button variant="outline" onClick={fetchHealth} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh snapshot
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
