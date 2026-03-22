import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import api from '../api/axios';
import ReactMarkdown from 'react-markdown';

export function DailyAiDigest() {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDigest = useCallback(async (forceRefresh = false) => {
    // If we already have it and aren't forcing a refresh, just return
    if (digest && !forceRefresh) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/ai/digest');
      setDigest(res.data.digest);
    } catch (err) {
      console.error('Failed to fetch AI digest:', err);
      setError('Unable to load your digest right now.');
    } finally {
      setLoading(false);
    }
  }, [digest]);

  useEffect(() => {
    fetchDigest();
  }, [fetchDigest]);

  return (
    <Card className="border-border bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-pink-500/5 border-primary/20 shadow-sm rounded-2xl overflow-hidden relative group">
      {/* Decorative shine */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
      
      <div className="flex items-center justify-between p-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/20 rounded-lg">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          </div>
          <h3 className="font-bold text-sm bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Daily AI Digest
          </h3>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
          onClick={() => fetchDigest(true)}
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <CardContent className="p-4">
        {loading && !digest ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
            <p className="text-xs font-medium animate-pulse">Generating your daily briefing...</p>
          </div>
        ) : error ? (
          <div className="py-4 text-center text-sm text-destructive">{error}</div>
        ) : digest ? (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed prose-headings:text-base prose-headings:font-bold prose-headings:mt-0 prose-headings:mb-2 prose-p:mb-2 prose-li:my-0.5">
            <ReactMarkdown>{digest}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">No digest available.</div>
        )}
      </CardContent>
    </Card>
  );
}
