import { useState, useEffect } from 'react';
import { AlertTriangle, X, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import api from '../api/axios';

export function RealtimeRisksSheet({ projectId, isOpen, onClose }) {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRisks = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/ai/projects/${projectId}/realtime-risks`);
      setRisks(data.risks || []);
    } catch (err) {
      console.error('Failed to fetch real-time risks:', err);
      setError('Unable to load risk analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRisks();
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      
      {/* Sheet */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h2 className="font-semibold text-lg">Real-Time Risks</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground">Analyzing risks...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          ) : risks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm font-medium">✨ No critical risks detected!</p>
              <p className="text-xs mt-2">Your tasks are on track.</p>
            </div>
          ) : (
            risks.map((risk, idx) => (
              <Card key={idx} className={`p-4 border-l-4 ${
                risk.risklevel === 'CRITICAL' 
                  ? 'border-l-red-500 bg-red-50/50 dark:bg-red-900/20' 
                  : 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/20'
              }`}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm leading-snug">{risk.title}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${
                      risk.risklevel === 'CRITICAL'
                        ? 'bg-red-600 text-white'
                        : 'bg-yellow-600 text-white'
                    }`}>
                      {risk.risklevel}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{risk.reason}</p>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={fetchRisks}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </>
  );
}
