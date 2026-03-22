import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, ChevronRight, Sparkles, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import api from '../api/axios';

export function AiRiskPanel({ projectId, isOpen, onClose, onTaskClick }) {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRisks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/ai/projects/${projectId}/risks`);
      setRisks(data.risks || []);
    } catch (err) {
      console.error('Failed to analyze risks:', err);
      setError('Unable to analyze project risks at this time.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchRisks();
    } else {
      setRisks([]);
      setError(null);
    }
  }, [isOpen, projectId, fetchRisks]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] border-border bg-card p-0 overflow-hidden shadow-2xl">
        <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600"></div>
        
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-orange-500" />
            AI Risk Analysis
          </DialogTitle>
          <DialogDescription>
            Gemini has analyzed your incomplete tasks to identify potential blockers and delayed deadlines.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500/80" />
              <p className="text-sm font-medium animate-pulse">Analyzing project tasks...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive text-sm bg-destructive/10 rounded-lg border border-destructive/20">
              {error}
            </div>
          ) : risks.length > 0 ? (
            <ScrollArea className="h-[350px] pr-4 -mr-4">
              <div className="space-y-3">
                {risks.map((risk, idx) => (
                  <div 
                    key={idx} 
                    className="group relative flex flex-col gap-2 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      onClose();
                      onTaskClick(risk.taskId);
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="font-semibold text-sm text-foreground line-clamp-1 flex-1">
                        {risk.title}
                      </h4>
                      <Badge variant="outline" className={`shrink-0 capitalize ${risk.riskLevel.toLowerCase() === 'high' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 'bg-orange-500/10 text-orange-600 border-orange-500/20'}`}>
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {risk.riskLevel} Risk
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {risk.reason}
                    </p>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow-sm rounded-full p-1 border border-border">
                      <ChevronRight className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-emerald-500/5 rounded-xl border border-emerald-500/20">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">All clear!</h3>
              <p className="text-sm text-emerald-600/80 dark:text-emerald-500/80 mt-1 max-w-[250px]">
                Gemini didn't find any immediate risks or bottlenecks in your current tasks.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 bg-muted/40 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {!loading && <Button onClick={fetchRisks} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Re-analyze
          </Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
