import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import api from '../api/axios';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function ProjectAnalytics({ projectId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/projects/analytics/${projectId}`).then(({ data }) => setData(data));
  }, [projectId]);

  if (!data) return <div className="p-8 text-center text-muted-foreground">Loading Stats...</div>;

  // Format Data for Recharts
  const statusData = data.statusDistribution.map(item => ({
    name: item._id.toUpperCase(),
    value: item.count
  }));

  const priorityData = data.priorityDistribution.map(item => ({
    name: item._id,
    count: item.count
  }));

  return (
    <div className="p-6 bg-background h-full overflow-y-auto">
      {/* Top Cards */}
      <div className="grid grid-cols-3 gap-8 mb-8">
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <h3 className="text-muted-foreground text-sm font-bold uppercase">Total Tasks</h3>
          <p className="text-4xl font-bold text-foreground mt-2">{data.totalTasks}</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <h3 className="text-muted-foreground text-sm font-bold uppercase">Completion Rate</h3>
          <p className="text-4xl font-bold text-green-600 mt-2">{data.completionRate}%</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <h3 className="text-muted-foreground text-sm font-bold uppercase">Pending</h3>
          <p className="text-4xl font-bold text-blue-600 mt-2">
            {data.totalTasks - (data.statusDistribution.find(s => s._id === 'done')?.count || 0)}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Pie Chart: Status */}
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border flex flex-col" style={{ minHeight: '350px' }}>
          <h3 className="font-bold text-lg mb-4 text-foreground">Task Status</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Priority */}
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border flex flex-col" style={{ minHeight: '350px' }}>
          <h3 className="font-bold text-lg mb-4 text-foreground">Tasks by Priority</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#8884d8" barSize={50} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
