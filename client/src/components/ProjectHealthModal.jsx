import { useState, useEffect } from 'react';
import { TrendingUp, X, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import api from '../api/axios';

export function ProjectHealthModal({ projectId, isOpen, onClose }) {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
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
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen, projectId]);

  const getHealthColor = (snapshot) => {
    if (!snapshot) return 'text-gray-500';
    if (snapshot.includes('🚀') || snapshot.includes('✨')) return 'text-green-600 dark:text-green-400';
    if (snapshot.includes('⚠️')) return 'text-yellow-600 dark:text-yellow-400';
    if (snapshot.includes('🔥')) return 'text-red-600 dark:text-red-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md shadow-2xl border-border animate-in zoom-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">Project Health</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                <p className="text-sm text-muted-foreground">Analyzing project health...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            ) : (
              <>
                {/* Health Assessment */}
                <div className={`p-4 rounded-lg border-l-4 ${
                  health?.includes('🚀') || health?.includes('✨')
                    ? 'border-l-green-500 bg-green-50/50 dark:bg-green-900/20'
                    : health?.includes('⚠️')
                    ? 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/20'
                    : 'border-l-red-500 bg-red-50/50 dark:bg-red-900/20'
                }`}>
                  <p className={`text-base font-medium leading-relaxed ${getHealthColor(health)}`}>
                    {health}
                  </p>
                </div>

                {/* Stats Grid */}
                {stats && stats.totalTasks > 0 && (
                  <div className="space-y-4">
                    {/* Row 1 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Progress</p>
                        <p className="text-2xl font-bold text-foreground">
                          {Math.round((stats.completedTasks / stats.totalTasks) * 100)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stats.completedTasks}/{stats.totalTasks} tasks
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Status</p>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {stats.inProgressTasks} in progress
                          </p>
                          {stats.overdueTasks > 0 && (
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                              {stats.overdueTasks} overdue
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Row 2 */}
                    {stats.dueSoonTasks > 0 && (
                      <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                          ⏰ {stats.dueSoonTasks} task(s) due in next 3 days
                        </p>
                      </div>
                    )}

                    {/* Row 3 - Weekly Rate */}
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Weekly Completion Rate</p>
                      <p className="text-2xl font-bold text-foreground">{stats.weeklyCompletionRate}%</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={fetchHealth}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
              Done
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
