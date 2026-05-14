import { CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { trackProductEvent } from '../utils/productAnalytics';

export function SetupChecklist({
  title = 'Recommended setup',
  description = 'Complete these steps to get more value from TaskKollecta.',
  items,
  organizationId,
  source,
}) {
  const completed = items.filter((item) => item.completed).length;
  const progress = items.length === 0 ? 0 : Math.round((completed / items.length) * 100);

  if (items.length === 0 || completed === items.length) return null;

  const handleAction = (item) => {
    trackProductEvent('setup_checklist_action_clicked', {
      organizationId,
      source,
      metadata: {
        itemId: item.id,
        title: item.title,
        completed: item.completed,
      },
    });
    item.onAction?.();
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Progress value={progress} className="h-2 max-w-xs" />
            <span className="text-xs font-medium text-muted-foreground">{completed} of {items.length}</span>
          </div>
        </div>
        <div className="grid gap-2 lg:min-w-[420px]">
          {items.map((item) => {
            const Icon = item.completed ? CheckCircle2 : Circle;
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/70 p-3">
                <Icon className={`h-4 w-4 shrink-0 ${item.completed ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs leading-5 text-muted-foreground">{item.description}</p>
                </div>
                {!item.completed && item.actionLabel && (
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleAction(item)}>
                    {item.actionLabel}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
