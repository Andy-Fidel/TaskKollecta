import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Users, Loader2, UserX, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import api from '../api/axios';

const STATUS_COLORS = {
  todo: '#6366f1',
  'in-progress': '#f59e0b',
  review: '#8b5cf6',
  done: '#22c55e'
};

const STATUS_LABELS = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'Review',
  done: 'Done'
};

function getCapacityColor(total) {
  if (total <= 5) return { bg: 'bg-green-500/10', text: 'text-green-600', label: 'Light' };
  if (total <= 10) return { bg: 'bg-amber-500/10', text: 'text-amber-600', label: 'Moderate' };
  return { bg: 'bg-red-500/10', text: 'text-red-600', label: 'Heavy' };
}

export default function WorkloadView() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load projects
  useEffect(() => {
    const orgId = localStorage.getItem('activeOrgId');
    if (orgId) {
      api.get(`/projects/org/${orgId}`).then(({ data }) => {
        setProjects(data);
        if (data.length > 0) setSelectedProject(data[0]._id);
      });
    }
  }, []);

  // Fetch workload data
  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    api.get(`/analytics/workload/${selectedProject}`)
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedProject]);

  // Build chart data
  const chartData = data?.members?.map(m => ({
    name: m.member.name?.split(' ')[0] || 'Unknown',
    'To Do': m.todo,
    'In Progress': m['in-progress'],
    'Review': m.review,
    'Done': m.done
  })) || [];

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm px-6 md:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Workload View
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Task distribution across team members</p>
          </div>

          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px] h-9 text-sm">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Select a project to view workload distribution</p>
          </div>
        ) : data.members.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <UserX className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No assigned tasks found</p>
            <p className="text-sm mt-1">Tasks need to be assigned to team members to show workload</p>
          </div>
        ) : (
          <>
            {/* Stacked Bar Chart */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-bold text-foreground mb-4">Task Distribution</h3>
              <div style={{ height: Math.max(250, data.members.length * 50 + 60) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={80}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }}
                    />
                    <Legend />
                    <Bar dataKey="To Do" stackId="a" fill={STATUS_COLORS.todo} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="In Progress" stackId="a" fill={STATUS_COLORS['in-progress']} />
                    <Bar dataKey="Review" stackId="a" fill={STATUS_COLORS.review} />
                    <Bar dataKey="Done" stackId="a" fill={STATUS_COLORS.done} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Member Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.members.map((m) => {
                const cap = getCapacityColor(m.total);
                return (
                  <div key={m.member._id} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={m.member.avatar} />
                        <AvatarFallback>{m.member.name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{m.member.name}</p>
                        <p className="text-xs text-muted-foreground">{m.total} tasks assigned</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${cap.bg} ${cap.text}`}>
                        {cap.label}
                      </span>
                    </div>

                    {/* Mini status bar */}
                    <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                      {m.total > 0 && ['todo', 'in-progress', 'review', 'done'].map(status => {
                        const pct = (m[status] / m.total) * 100;
                        if (pct === 0) return null;
                        return (
                          <div
                            key={status}
                            style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[status] }}
                            title={`${STATUS_LABELS[status]}: ${m[status]}`}
                          />
                        );
                      })}
                    </div>

                    {/* Status breakdown */}
                    <div className="flex justify-between mt-2 text-[11px] text-muted-foreground">
                      <span>{m.todo} todo</span>
                      <span>{m['in-progress']} active</span>
                      <span>{m.review} review</span>
                      <span>{m.done} done</span>
                    </div>
                  </div>
                );
              })}

              {/* Unassigned card */}
              {data.unassigned.total > 0 && (
                <div className="bg-card border border-dashed border-amber-400/50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Unassigned</p>
                      <p className="text-xs text-muted-foreground">{data.unassigned.total} tasks need an owner</p>
                    </div>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                    {['todo', 'in-progress', 'review', 'done'].map(status => {
                      const pct = (data.unassigned[status] / data.unassigned.total) * 100;
                      if (pct === 0) return null;
                      return (
                        <div
                          key={status}
                          style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[status] }}
                          title={`${STATUS_LABELS[status]}: ${data.unassigned[status]}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-[11px] text-muted-foreground">
                    <span>{data.unassigned.todo} todo</span>
                    <span>{data.unassigned['in-progress']} active</span>
                    <span>{data.unassigned.review} review</span>
                    <span>{data.unassigned.done} done</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
