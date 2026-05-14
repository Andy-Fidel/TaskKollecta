import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Target, Plus, Save, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { SetupChecklist } from '@/components/SetupChecklist';
import api from '../api/axios';
import { toast } from 'sonner';

export default function Goals() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [linkedProjects, setLinkedProjects] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const orgId = localStorage.getItem('activeOrgId');
  const setupItems = [
    {
      id: 'have-projects',
      title: 'Create projects to connect',
      description: 'Goals are most useful when progress can sync from linked project work.',
      completed: projects.length > 0,
      actionLabel: 'Open projects',
      onAction: () => navigate('/projects'),
    },
    {
      id: 'create-goal',
      title: 'Create a goal',
      description: 'Define the outcome the team is trying to move, not just the tasks.',
      completed: goals.length > 0,
      actionLabel: 'Use form',
      onAction: () => document.querySelector('input[placeholder="Goal title"]')?.focus(),
    },
    {
      id: 'link-goal-project',
      title: 'Link work to the goal',
      description: 'Connect at least one project so progress can reflect delivery activity.',
      completed: goals.some((goal) => (goal.linkedProjects || []).length > 0),
      actionLabel: 'Select project',
      onAction: () => document.querySelector('input[placeholder="Goal title"]')?.focus(),
    },
  ];

  const fetchData = async () => {
    if (!orgId) return;
    const [goalRes, projectRes] = await Promise.all([
      api.get(`/goals?orgId=${orgId}`),
      api.get('/projects'),
    ]);
    setGoals(goalRes.data);
    setProjects(projectRes.data);
  };

  useEffect(() => {
    fetchData().catch(() => toast.error('Failed to load goals'));
  }, [orgId]);

  const createGoal = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    try {
      const { data } = await api.post('/goals', {
        title,
        description,
        orgId,
        targetDate: targetDate || undefined,
        linkedProjects,
      });
      setGoals((current) => [data, ...current]);
      setTitle('');
      setDescription('');
      setTargetDate('');
      setLinkedProjects([]);
      toast.success('Goal created');
    } catch {
      toast.error('Failed to create goal');
    }
  };

  const updateGoal = async (goalId, updates) => {
    setSavingId(goalId);
    try {
      const { data } = await api.put(`/goals/${goalId}`, updates);
      setGoals((current) => current.map((goal) => goal._id === goalId ? data : goal));
      toast.success('Goal updated');
    } catch {
      toast.error('Failed to update goal');
    } finally {
      setSavingId(null);
    }
  };

  const deleteGoal = async (goalId) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await api.delete(`/goals/${goalId}`);
      setGoals((current) => current.filter((goal) => goal._id !== goalId));
      toast.success('Goal deleted');
    } catch {
      toast.error('Failed to delete goal');
    }
  };

  const toggleGoalProject = (goal, projectId) => {
    const currentIds = (goal.linkedProjects || []).map((project) => project._id || project);
    const nextProjects = currentIds.includes(projectId)
      ? currentIds.filter((id) => id !== projectId)
      : [...currentIds, projectId];
    updateGoal(goal._id, { linkedProjects: nextProjects });
  };

  const syncGoalProgress = (goal) => {
    if (goal.linkedWorkProgress === null || goal.linkedWorkProgress === undefined) return;
    updateGoal(goal._id, { progress: goal.linkedWorkProgress });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <SetupChecklist
        title="Goal setup"
        description="Connect outcomes to the work that moves them forward."
        items={setupItems}
        organizationId={orgId}
        source="goals"
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
        <p className="text-sm text-muted-foreground">Connect team goals to the projects that move them forward.</p>
      </div>

      <form onSubmit={createGoal} className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Goal title" />
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          <Button type="submit" className="gap-2"><Plus className="h-4 w-4" />Create</Button>
        </div>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
        <div className="flex flex-wrap gap-2">
          {projects.map((project) => {
            const selected = linkedProjects.includes(project._id);
            return (
              <button
                key={project._id}
                type="button"
                onClick={() => setLinkedProjects((current) => selected ? current.filter((id) => id !== project._id) : [...current, project._id])}
                className={`rounded-full border px-3 py-1 text-xs ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
              >
                {project.name}
              </button>
            );
          })}
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {goals.map((goal) => (
          <div key={goal._id} className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold">{goal.title}</h2>
                </div>
                {goal.description && <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => deleteGoal(goal._id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
              <select
                value={goal.status || 'on-track'}
                onChange={(event) => updateGoal(goal._id, { status: event.target.value })}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm capitalize"
                disabled={savingId === goal._id}
              >
                <option value="on-track">On track</option>
                <option value="at-risk">At risk</option>
                <option value="off-track">Off track</option>
                <option value="achieved">Achieved</option>
                <option value="paused">Paused</option>
              </select>
              <Badge variant="secondary" className="capitalize justify-center">{goal.status?.replace('-', ' ')}</Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'No target date'}</span>
                <span>{goal.progress || 0}%</span>
              </div>
              <Progress value={goal.progress || 0} />
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  type="range"
                  min="0"
                  max="100"
                  value={goal.progress || 0}
                  onChange={(event) => {
                    const nextProgress = Number(event.target.value);
                    setGoals((current) => current.map((item) => item._id === goal._id ? { ...item, progress: nextProgress } : item));
                  }}
                  onMouseUp={(event) => updateGoal(goal._id, { progress: Number(event.currentTarget.value) })}
                  onTouchEnd={(event) => updateGoal(goal._id, { progress: Number(event.currentTarget.value) })}
                  disabled={savingId === goal._id}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => updateGoal(goal._id, { progress: goal.progress || 0 })}
                  disabled={savingId === goal._id}
                >
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked work</p>
                  <p className="text-sm font-medium">
                    {goal.linkedWorkProgress === null || goal.linkedWorkProgress === undefined
                      ? 'No linked work yet'
                      : `${goal.linkedWorkProgress}% complete`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => syncGoalProgress(goal)}
                  disabled={savingId === goal._id || goal.linkedWorkProgress === null || goal.linkedWorkProgress === undefined}
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync
                </Button>
              </div>
              {goal.linkedWorkProgress !== null && goal.linkedWorkProgress !== undefined && (
                <>
                  <Progress value={goal.linkedWorkProgress} />
                  <p className="text-xs text-muted-foreground">
                    {goal.linkedWorkCompleted || 0} of {goal.linkedWorkTotal || 0} linked items complete
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {(goal.linkedProjects || []).map((project) => (
                <Link key={project._id} to={`/project/${project._id}`} className="rounded-md bg-muted px-2 py-1 text-xs hover:bg-muted/70">
                  {project.name}
                </Link>
              ))}
            </div>

            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked projects</p>
              <div className="flex flex-wrap gap-2">
                {projects.map((project) => {
                  const linked = (goal.linkedProjects || []).some((item) => (item._id || item) === project._id);
                  return (
                    <button
                      key={project._id}
                      type="button"
                      onClick={() => toggleGoalProject(goal, project._id)}
                      disabled={savingId === goal._id}
                      className={`rounded-full border px-3 py-1 text-xs ${linked ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                    >
                      {project.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
