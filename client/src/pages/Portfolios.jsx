import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import api from '../api/axios';
import { toast } from 'sonner';

export default function Portfolios() {
  const [portfolios, setPortfolios] = useState([]);
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const orgId = localStorage.getItem('activeOrgId');

  const selectedProjectSet = useMemo(() => new Set(selectedProjects), [selectedProjects]);

  const fetchData = async () => {
    if (!orgId) return;
    const [portfolioRes, projectRes] = await Promise.all([
      api.get(`/portfolios?orgId=${orgId}`),
      api.get('/projects'),
    ]);
    setPortfolios(portfolioRes.data);
    setProjects(projectRes.data);
  };

  useEffect(() => {
    fetchData().catch(() => toast.error('Failed to load portfolios'));
  }, [orgId]);

  const createPortfolio = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      const { data } = await api.post('/portfolios', {
        name,
        description,
        orgId,
        projects: selectedProjects,
      });
      setPortfolios((current) => [data, ...current]);
      setName('');
      setDescription('');
      setSelectedProjects([]);
      toast.success('Portfolio created');
    } catch {
      toast.error('Failed to create portfolio');
    }
  };

  const updatePortfolio = async (portfolioId, updates) => {
    setSavingId(portfolioId);
    try {
      const { data } = await api.put(`/portfolios/${portfolioId}`, updates);
      setPortfolios((current) => current.map((portfolio) => portfolio._id === portfolioId ? data : portfolio));
      toast.success('Portfolio updated');
    } catch {
      toast.error('Failed to update portfolio');
    } finally {
      setSavingId(null);
    }
  };

  const deletePortfolio = async (portfolioId) => {
    if (!confirm('Delete this portfolio?')) return;
    try {
      await api.delete(`/portfolios/${portfolioId}`);
      setPortfolios((current) => current.filter((portfolio) => portfolio._id !== portfolioId));
      toast.success('Portfolio deleted');
    } catch {
      toast.error('Failed to delete portfolio');
    }
  };

  const togglePortfolioProject = (portfolio, projectId) => {
    const currentIds = (portfolio.projects || []).map((project) => project._id || project);
    const nextProjects = currentIds.includes(projectId)
      ? currentIds.filter((id) => id !== projectId)
      : [...currentIds, projectId];
    updatePortfolio(portfolio._id, { projects: nextProjects });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolios</h1>
          <p className="text-sm text-muted-foreground">Track groups of projects and their delivery health.</p>
        </div>
      </div>

      <form onSubmit={createPortfolio} className="rounded-lg border border-border bg-card p-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Portfolio name" />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="min-h-10 md:min-h-0" />
        <Button type="submit" className="gap-2"><Plus className="h-4 w-4" />Create</Button>
        <div className="md:col-span-3 flex flex-wrap gap-2">
          {projects.map((project) => (
            <button
              key={project._id}
              type="button"
              onClick={() => setSelectedProjects((current) => selectedProjectSet.has(project._id) ? current.filter((id) => id !== project._id) : [...current, project._id])}
              className={`rounded-full border px-3 py-1 text-xs ${selectedProjectSet.has(project._id) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
            >
              {project.name}
            </button>
          ))}
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {portfolios.map((portfolio) => (
          <div key={portfolio._id} className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold truncate">{portfolio.name}</h2>
                </div>
                {portfolio.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{portfolio.description}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => deletePortfolio(portfolio._id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select
                value={portfolio.status || 'on-track'}
                onChange={(event) => updatePortfolio(portfolio._id, { status: event.target.value })}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm capitalize"
                disabled={savingId === portfolio._id}
              >
                <option value="on-track">On track</option>
                <option value="at-risk">At risk</option>
                <option value="off-track">Off track</option>
                <option value="paused">Paused</option>
              </select>
              <Badge variant="secondary" className="capitalize justify-center">{portfolio.status?.replace('-', ' ')}</Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{portfolio.projects?.length || 0} projects</span>
                <span>{portfolio.progress || 0}% complete</span>
              </div>
              <Progress value={portfolio.progress || 0} />
            </div>
            <div className="flex flex-wrap gap-2">
              {(portfolio.projects || []).slice(0, 6).map((project) => (
                <Link key={project._id} to={`/project/${project._id}`} className="rounded-md bg-muted px-2 py-1 text-xs hover:bg-muted/70">
                  {project.name}
                </Link>
              ))}
            </div>

            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Included projects</p>
              <div className="flex flex-wrap gap-2">
                {projects.map((project) => {
                  const included = (portfolio.projects || []).some((item) => (item._id || item) === project._id);
                  return (
                    <button
                      key={project._id}
                      type="button"
                      onClick={() => togglePortfolioProject(portfolio, project._id)}
                      disabled={savingId === portfolio._id}
                      className={`rounded-full border px-3 py-1 text-xs ${included ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                    >
                      {project.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => updatePortfolio(portfolio._id, {
                name: portfolio.name,
                description: portfolio.description,
                projects: (portfolio.projects || []).map((project) => project._id || project),
                status: portfolio.status,
              })}
              disabled={savingId === portfolio._id}
            >
              <Save className="h-4 w-4" />
              {savingId === portfolio._id ? 'Saving...' : 'Refresh Summary'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
