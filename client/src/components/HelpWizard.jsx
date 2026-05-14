import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  Compass,
  FolderKanban,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Rocket,
  Search,
  Target,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { trackProductEvent } from '../utils/productAnalytics';

const HELP_PATHS = [
  {
    id: 'start',
    title: 'Set up work',
    description: 'Create a workspace, project, workflow, custom fields, and intake process.',
    icon: Rocket,
    accent: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20',
    route: '/projects',
    steps: [
      {
        title: 'Create or choose a workspace',
        body: 'Use the workspace switcher in the sidebar to create a team space or switch into the right organization.',
        icon: Users,
      },
      {
        title: 'Create a project',
        body: 'Open Projects, start a project, choose the layout, and invite the people responsible for delivery.',
        icon: FolderKanban,
      },
      {
        title: 'Shape the workflow',
        body: 'Use project settings to customize statuses, custom fields, privacy, and the default view for how this team works.',
        icon: Workflow,
      },
      {
        title: 'Save reusable views',
        body: 'Filter by owner, priority, due date, blockers, or custom fields, then save the view for yourself or the team.',
        icon: ClipboardList,
      },
    ],
  },
  {
    id: 'focus',
    title: 'Find what needs attention',
    description: 'Triage your assigned work, blockers, overdue tasks, and priority items.',
    icon: ListChecks,
    accent: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    route: '/tasks',
    steps: [
      {
        title: 'Open My Tasks',
        body: 'Start with Today for due and overdue work, or Needs Attention for blocked and high-signal tasks.',
        icon: CheckCircle2,
      },
      {
        title: 'Narrow the list',
        body: 'Use search, priority, and project filters to focus on one delivery lane without losing cross-project context.',
        icon: Search,
      },
      {
        title: 'Act directly',
        body: 'Complete, reprioritize, or snooze tasks from the triage list so cleanup does not require opening every project.',
        icon: Target,
      },
      {
        title: 'Save your triage view',
        body: 'Save recurring views like Launch Blockers or This Week High Priority and share them with the team when useful.',
        icon: ClipboardList,
      },
    ],
  },
  {
    id: 'lead',
    title: 'Track outcomes',
    description: 'Use portfolios, goals, reports, workload, and health signals to manage execution.',
    icon: Compass,
    accent: 'text-sky-600 bg-sky-500/10 border-sky-500/20',
    route: '/portfolios',
    steps: [
      {
        title: 'Create a portfolio',
        body: 'Group related projects so leaders can track progress, risk, and completion without opening every board.',
        icon: Compass,
      },
      {
        title: 'Connect goals',
        body: 'Attach projects to goals so progress reflects the work that actually moves the outcome forward.',
        icon: Target,
      },
      {
        title: 'Review delivery health',
        body: 'Use Reports, Workload, and project health snapshots to spot capacity pressure and delivery risk early.',
        icon: Lightbulb,
      },
      {
        title: 'Export or share status',
        body: 'Export filtered task lists and reports when stakeholders need a clean update outside TaskKollecta.',
        icon: ClipboardList,
      },
    ],
  },
  {
    id: 'automate',
    title: 'Automate intake and updates',
    description: 'Turn repeatable requests, reminders, and AI assistance into reliable systems.',
    icon: Bot,
    accent: 'text-violet-600 bg-violet-500/10 border-violet-500/20',
    route: '/projects',
    steps: [
      {
        title: 'Build intake forms',
        body: 'Create a project form for bugs, requests, or approvals and map answers into custom fields.',
        icon: ClipboardList,
      },
      {
        title: 'Add automations',
        body: 'Use project automations to trigger notifications and status actions when work changes.',
        icon: Workflow,
      },
      {
        title: 'Use AI where it saves time',
        body: 'Generate subtasks, suggest priority or effort, and review project risk before work gets stuck.',
        icon: Bot,
      },
      {
        title: 'Keep the loop visible',
        body: 'Use comments, mentions, reminders, and updates so context stays attached to the work.',
        icon: HelpCircle,
      },
    ],
  },
];

export function HelpWizard({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [selectedPathId, setSelectedPathId] = useState(HELP_PATHS[0].id);
  const [stepIndex, setStepIndex] = useState(0);

  const selectedPath = useMemo(
    () => HELP_PATHS.find((path) => path.id === selectedPathId) || HELP_PATHS[0],
    [selectedPathId],
  );
  const currentStep = selectedPath.steps[stepIndex];
  const StepIcon = currentStep.icon;
  const isLastStep = stepIndex === selectedPath.steps.length - 1;

  const selectPath = (pathId) => {
    setSelectedPathId(pathId);
    setStepIndex(0);
    trackProductEvent('help_wizard_path_selected', {
      organizationId: localStorage.getItem('activeOrgId'),
      source: 'help_wizard',
      metadata: { pathId },
    });
  };

  const closeAndNavigate = (route) => {
    trackProductEvent('help_wizard_workflow_opened', {
      organizationId: localStorage.getItem('activeOrgId'),
      source: 'help_wizard',
      metadata: {
        pathId: selectedPath.id,
        route,
        stepIndex,
      },
    });
    onOpenChange(false);
    navigate(route);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-5xl">
        <div className="grid min-h-[620px] lg:grid-cols-[320px_1fr]">
          <aside className="border-b border-border bg-muted/30 p-5 lg:border-b-0 lg:border-r">
            <DialogHeader className="text-left">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HelpCircle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl">Help Wizard</DialogTitle>
              <DialogDescription>
                Choose what you are trying to do and follow the recommended workflow.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid gap-2">
              {HELP_PATHS.map((path) => {
                const Icon = path.icon;
                const selected = path.id === selectedPath.id;
                return (
                  <button
                    key={path.id}
                    type="button"
                    onClick={() => selectPath(path.id)}
                    className={`rounded-lg border p-3 text-left transition ${
                      selected
                        ? 'border-primary bg-background shadow-sm'
                        : 'border-transparent hover:border-border hover:bg-background/70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${path.accent}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{path.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{path.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col">
            <div className="border-b border-border p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full">
                  {selectedPath.title}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Step {stepIndex + 1} of {selectedPath.steps.length}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                {selectedPath.steps.map((step, index) => (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setStepIndex(index)}
                    className={`h-1.5 flex-1 rounded-full transition ${
                      index <= stepIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                    aria-label={`Go to step ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mx-auto max-w-2xl">
                <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-xl border ${selectedPath.accent}`}>
                  <StepIcon className="h-7 w-7" />
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">{currentStep.title}</h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">{currentStep.body}</p>

                <div className="mt-8 rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Product tip</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        If this is a workflow your team repeats weekly, save the resulting view and share it with the team.
                        That turns one-time filtering into an operating habit.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Button variant="outline" className="justify-start" onClick={() => closeAndNavigate('/docs')}>
                    Open docs
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="justify-start" onClick={() => closeAndNavigate('/community')}>
                    Visit community
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                  disabled={stepIndex === 0}
                >
                  Back
                </Button>
                {isLastStep ? (
                  <Button onClick={() => closeAndNavigate(selectedPath.route)}>
                    Open workflow
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={() => setStepIndex((current) => Math.min(selectedPath.steps.length - 1, current + 1))}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
