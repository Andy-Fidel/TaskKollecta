import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import api from '../api/axios';

// Priority badge styling
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

export function SmartFocusMode() {
  const [focusTasks, setFocusTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFocus = useCallback(async (forceRefresh = false) => {
    if (focusTasks.length > 0 && !forceRefresh) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/ai/focus');
      setFocusTasks(res.data.focusTasks || []);
    } catch (err) {
      console.error('Failed to fetch focus:', err);
      setError('Unable to load focus recommendations right now.');
    } finally {
      setLoading(false);
    }
  }, [focusTasks]);

  useEffect(() => {
    fetchFocus();
  }, [fetchFocus]);

  return (
    <Card className="border-border bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-red-500/5 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-red-500/5 border-primary/20 shadow-sm rounded-2xl overflow-hidden relative group">
      {/* Decorative shine */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
      
      <div className="flex items-center justify-between p-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/20 rounded-lg">
            <Target className="w-4 h-4 text-primary animate-pulse" />
          </div>
          <h3 className="font-bold text-sm bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
            Today's Focus
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
            {focusTasks.map((task, idx) => (
              <div 
                key={task.taskId || idx} 
                className="p-3 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="text-primary font-semibold text-sm mt-0.5 flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground line-clamp-2">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {task.focusReason}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
              ✨ Top priorities for maximum impact
            </p>
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <p>All tasks are up to date!</p>
            <p className="text-xs mt-2">Take a break or plan ahead 🎉</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
