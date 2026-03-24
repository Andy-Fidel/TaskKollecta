import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '../api/axios';

export function ProjectHealthSnapshot({ projectId }) {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
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
  };

  useEffect(() => {
    fetchHealth();
  }, [projectId]);

  const getHealthColor = (snapshot) => {
    if (!snapshot) return 'text-gray-500';
    if (snapshot.includes('🚀') || snapshot.includes('✨')) return 'text-green-600 dark:text-green-400';
    if (snapshot.includes('⚠️')) return 'text-yellow-600 dark:text-yellow-400';
    if (snapshot.includes('🔥')) return 'text-red-600 dark:text-red-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getHealthBgColor = (snapshot) => {
    if (!snapshot) return 'bg-gray-50 dark:bg-gray-900/30';
    if (snapshot.includes('🚀') || snapshot.includes('✨')) return 'bg-green-50 dark:bg-green-900/20';
    if (snapshot.includes('⚠️')) return 'bg-yellow-50 dark:bg-yellow-900/20';
    if (snapshot.includes('🔥')) return 'bg-red-50 dark:bg-red-900/20';
    return 'bg-blue-50 dark:bg-blue-900/20';
  };

  return (
    <Card className={`border-border shadow-sm rounded-2xl overflow-hidden ${getHealthBgColor(health)}`}>
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Project Health</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
          onClick={fetchHealth}
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <CardContent className="p-4 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p className="text-sm">Analyzing project...</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-4 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : health ? (
          <div className="space-y-4">
            {/* Health Snapshot */}
            <div className={`text-base font-medium leading-relaxed ${getHealthColor(health)}`}>
              {health}
            </div>

            {/* Quick Stats */}
            {stats && stats.totalTasks > 0 && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/30">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Progress</p>
                  <p className="text-lg font-bold text-foreground">
                    {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.completedTasks}/{stats.totalTasks} complete
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Status</p>
                  <div className="flex gap-1.5 text-xs font-semibold">
                    <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                      {stats.inProgressTasks} in progress
                    </span>
                  </div>
                  {stats.overdueTasks > 0 && (
                    <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                      {stats.overdueTasks} overdue
                    </div>
                  )}
                </div>

                {/* Additional insights */}
                {stats.dueSoonTasks > 0 && (
                  <div className="col-span-2 text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 p-2 rounded border border-yellow-200 dark:border-yellow-800/50">
                    ⏰ {stats.dueSoonTasks} task(s) due in the next 3 days
                  </div>
                )}

                <div className="col-span-2 text-xs text-muted-foreground">
                  📊 Weekly completion rate: <span className="font-semibold text-foreground">{stats.weeklyCompletionRate}%</span>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
