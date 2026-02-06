import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import {
  GanttChartSquare, Loader2, Filter, ChevronDown, Calendar as CalendarIcon
} from 'lucide-react';
import { format, differenceInDays, startOfDay, endOfDay, addDays, subDays } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';

import api from '../api/axios';

// Priority colors matching the app's design system
const PRIORITY_COLORS = {
  urgent: 'hsl(var(--destructive))',
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6'
};

const STATUS_COLORS = {
  'todo': 'hsl(var(--muted-foreground))',
  'in-progress': 'hsl(var(--chart-2))',
  'review': 'hsl(var(--chart-3))',
  'done': 'hsl(var(--chart-4))'
};

export default function GanttChart() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);

  // Filters
  const [selectedProject, setSelectedProject] = useState('all');
  const [statusFilters, setStatusFilters] = useState(['todo', 'in-progress', 'review', 'done']);
  const [priorityFilters, setPriorityFilters] = useState(['low', 'medium', 'high', 'urgent']);

  // Timeline range
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7),
    to: addDays(new Date(), 30)
  });

  // Task Details Modal
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tasksRes, projectsRes] = await Promise.all([
          selectedProject === 'all'
            ? api.get('/tasks/my-tasks')
            : api.get(`/tasks/project/${selectedProject}`),
          api.get('/projects')
        ]);
        setTasks(tasksRes.data);
        setProjects(projectsRes.data);
      } catch {
        console.error("Failed to load Gantt data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedProject]);

  // Process tasks for the Gantt chart
  const chartData = useMemo(() => {
    if (!tasks.length) return [];

    const timelineStart = startOfDay(dateRange.from);
    const timelineEnd = endOfDay(dateRange.to);

    return tasks
      .filter(task => {
        // Filter by status and priority
        if (!statusFilters.includes(task.status)) return false;
        if (!priorityFilters.includes(task.priority)) return false;

        // Filter by date range (task should have a due date within range)
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= timelineStart && dueDate <= timelineEnd;
      })
      .map(task => {
        const taskStart = task.createdAt ? new Date(task.createdAt) : subDays(new Date(task.dueDate), 3);
        const taskEnd = new Date(task.dueDate);

        // Calculate position and width as percentages
        const startOffset = Math.max(0, differenceInDays(taskStart, timelineStart));
        const duration = Math.max(1, differenceInDays(taskEnd, taskStart) + 1);

        return {
          ...task,
          name: task.title,
          startOffset,
          duration,
          projectName: task.project?.name || 'No Project',
          fill: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
        };
      })
      .sort((a, b) => a.startOffset - b.startOffset);
  }, [tasks, statusFilters, priorityFilters, dateRange]);

  // Generate date ticks for X-axis
  const dateTicks = useMemo(() => {
    const ticks = [];
    const start = startOfDay(dateRange.from);
    const end = endOfDay(dateRange.to);
    const totalDays = differenceInDays(end, start);
    const tickInterval = Math.max(1, Math.floor(totalDays / 10));

    for (let i = 0; i <= totalDays; i += tickInterval) {
      ticks.push(i);
    }
    return ticks;
  }, [dateRange]);

  const formatTick = (value) => {
    const date = addDays(dateRange.from, value);
    return format(date, 'MMM d');
  };

  // Custom bar shape for Gantt
  const GanttBarShape = (props) => {
    const { x, y, width, height, payload } = props;

    // Calculate actual bar position based on startOffset
    const barX = x + (payload.startOffset / (differenceInDays(dateRange.to, dateRange.from) || 1)) * width;
    const barWidth = (payload.duration / (differenceInDays(dateRange.to, dateRange.from) || 1)) * width;

    return (
      <g>
        <rect
          x={barX}
          y={y + 4}
          width={Math.max(barWidth, 8)}
          height={height - 8}
          fill={payload.fill}
          rx={4}
          ry={4}
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => {
            setSelectedTask(payload);
            setIsDetailsOpen(true);
          }}
        />
        {/* Task title on bar if wide enough */}
        {barWidth > 60 && (
          <text
            x={barX + 8}
            y={y + height / 2 + 1}
            fill="white"
            fontSize={11}
            fontWeight="500"
            className="pointer-events-none"
          >
            {payload.name.length > 15 ? payload.name.substring(0, 15) + '...' : payload.name}
          </text>
        )}
      </g>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const task = payload[0].payload;

    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg max-w-xs">
        <p className="font-semibold text-sm text-foreground mb-1">{task.name}</p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Project: <span className="text-foreground">{task.projectName}</span></p>
          <p>Due: <span className="text-foreground">{task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No date'}</span></p>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline" className="capitalize text-[10px]">{task.status}</Badge>
            <Badge variant="outline" className={`capitalize text-[10px] ${
              task.priority === 'urgent' || task.priority === 'high' ? 'border-red-300 text-red-600' : ''
            }`}>{task.priority}</Badge>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-[Poppins]">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GanttChartSquare className="w-6 h-6 text-primary" />
            Timeline View
          </h1>
          <p className="text-muted-foreground">Visualize your tasks across time</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Project Selector */}
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All My Tasks</SelectItem>
              {projects.map(project => (
                <SelectItem key={project._id} value={project._id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="bg-card">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range) => range && setDateRange(range)}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-card">
                <Filter className="mr-2 h-4 w-4" />
                Status
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {['todo', 'in-progress', 'review', 'done'].map(status => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilters.includes(status)}
                  onCheckedChange={(checked) => {
                    setStatusFilters(checked
                      ? [...statusFilters, status]
                      : statusFilters.filter(s => s !== status)
                    );
                  }}
                  className="capitalize"
                >
                  {status.replace('-', ' ')}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Priority Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-card">
                <Filter className="mr-2 h-4 w-4" />
                Priority
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {['low', 'medium', 'high', 'urgent'].map(priority => (
                <DropdownMenuCheckboxItem
                  key={priority}
                  checked={priorityFilters.includes(priority)}
                  onCheckedChange={(checked) => {
                    setPriorityFilters(checked
                      ? [...priorityFilters, priority]
                      : priorityFilters.filter(p => p !== priority)
                    );
                  }}
                  className="capitalize"
                >
                  {priority}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Gantt Chart */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-2 border-b border-border/50">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>{chartData.length} tasks in timeline</span>
            <div className="flex gap-3">
              {Object.entries(PRIORITY_COLORS).map(([priority, color]) => (
                <div key={priority} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                  <span className="capitalize">{priority}</span>
                </div>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <GanttChartSquare className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">No tasks with due dates in this range.</p>
              <p className="text-xs mt-1">Try adjusting filters or date range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div style={{ minWidth: '800px', height: Math.max(400, chartData.length * 40 + 60) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 200, bottom: 20 }}
                    barSize={24}
                  >
                    <XAxis
                      type="number"
                      domain={[0, differenceInDays(dateRange.to, dateRange.from)]}
                      ticks={dateTicks}
                      tickFormatter={formatTick}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={190}
                      tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={false} />

                    {/* Today line */}
                    <ReferenceLine
                      x={differenceInDays(new Date(), dateRange.from)}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{ value: 'Today', position: 'top', fontSize: 10, fill: 'hsl(var(--primary))' }}
                    />

                    <Bar
                      dataKey="duration"
                      shape={<GanttBarShape />}
                      background={{ fill: 'hsl(var(--muted)/0.3)', radius: 4 }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Details Modal */}
      <TaskDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        task={selectedTask}
        projectId={selectedTask?.project?._id}
        orgId={selectedTask?.organization}
      />
    </div>
  );
}
