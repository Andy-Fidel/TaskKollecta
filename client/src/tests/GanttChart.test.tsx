import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { DataRefreshProvider } from '../context/DataRefreshContext';
import GanttChart from '../pages/GanttChart';
import api from '../api/axios';
import { buildGanttExportData, exportToCSV } from '../utils/exportUtils';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../components/TaskDetailsModal', () => ({
  TaskDetailsModal: () => null,
}));

vi.mock('../components/ExportMenu', () => ({
  ExportMenu: ({ onExportCSV, onExportPDF }) => (
    <div>
      <button type="button" onClick={onExportCSV}>Export CSV</button>
      <button type="button" onClick={onExportPDF}>Export PDF</button>
    </div>
  ),
}));

vi.mock('../utils/exportUtils', async () => {
  const actual = await vi.importActual<typeof import('../utils/exportUtils')>('../utils/exportUtils');
  return {
    ...actual,
    exportToCSV: vi.fn(),
    exportToPDF: vi.fn(),
    buildGanttExportData: vi.fn(actual.buildGanttExportData),
  };
});

const mockedApi = api as Mocked<typeof api>;
const mockedBuildGanttExportData = vi.mocked(buildGanttExportData);
const mockedExportToCSV = vi.mocked(exportToCSV);

const tasks = [
  {
    _id: 'task-1',
    title: 'Discovery',
    status: 'todo',
    priority: 'high',
    startDate: '2026-06-02T00:00:00.000Z',
    dueDate: '2026-06-04T23:59:59.999Z',
    plannedStartDate: '2026-06-01T00:00:00.000Z',
    plannedDueDate: '2026-06-03T23:59:59.999Z',
    project: { _id: 'project-1', name: 'Launch' },
    assignee: { _id: 'user-1', name: 'Andy' },
    dependencies: [],
  },
  {
    _id: 'task-2',
    title: 'Build',
    status: 'in-progress',
    priority: 'medium',
    startDate: '2026-06-03T00:00:00.000Z',
    dueDate: '2026-06-07T23:59:59.999Z',
    project: { _id: 'project-1', name: 'Launch' },
    assignee: { _id: 'user-2', name: 'Sam' },
    dependencies: [
      {
        _id: 'task-1',
        title: 'Discovery',
        status: 'todo',
        startDate: '2026-06-02T00:00:00.000Z',
        dueDate: '2026-06-04T23:59:59.999Z',
      },
    ],
  },
  {
    _id: 'task-3',
    title: 'Filtered done task',
    status: 'done',
    priority: 'low',
    startDate: '2026-08-01T00:00:00.000Z',
    dueDate: '2026-08-03T23:59:59.999Z',
    project: { _id: 'project-2', name: 'Ops' },
    dependencies: [],
  },
];

function renderGantt() {
  mockedApi.get.mockImplementation(async (url) => {
    if (url === '/tasks/my-tasks') return { data: tasks };
    if (url === '/projects') return { data: [{ _id: 'project-1', name: 'Launch' }] };
    return { data: [] };
  });

  return render(
    <DataRefreshProvider>
      <GanttChart />
    </DataRefreshProvider>,
  );
}

describe('GanttChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports only visible filtered timeline tasks', async () => {
    renderGantt();

    expect(await screen.findByRole('button', { name: 'Schedule Discovery' })).toBeInTheDocument();
    expect(screen.queryByText('Filtered done task')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(mockedBuildGanttExportData).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ _id: 'task-1' }),
      expect.objectContaining({ _id: 'task-2' }),
    ]));
    expect(mockedBuildGanttExportData.mock.calls[0][0]).toHaveLength(2);
    expect(mockedExportToCSV).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'gantt-chart.csv',
    }));
  });

  it('persists drag scheduling updates optimistically', async () => {
    mockedApi.put.mockResolvedValue({
      data: {
        ...tasks[0],
        startDate: '2026-06-03T00:00:00.000Z',
        dueDate: '2026-06-05T23:59:59.999Z',
      },
    });

    renderGantt();
    const scheduleButton = await screen.findByRole('button', { name: 'Schedule Discovery' });

    fireEvent.pointerDown(scheduleButton, { clientX: 100 });
    fireEvent.pointerMove(window, { clientX: 136 });
    fireEvent.pointerUp(window, { clientX: 136 });

    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith('/tasks/task-1', expect.objectContaining({
        startDate: '2026-06-03T00:00:00.000Z',
        dueDate: '2026-06-05T23:59:59.999Z',
      }));
    });
  });

  it('creates dependencies from chart connector handles', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        ...tasks[0],
        dependencies: [{ _id: 'task-2', title: 'Build', status: 'in-progress' }],
      },
    });

    renderGantt();

    await userEvent.click(await screen.findByRole('button', { name: 'Start dependency from Build' }));
    await userEvent.click(screen.getByRole('button', { name: 'Make Discovery blocked by selected task' }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/tasks/task-1/dependencies', {
        dependencyId: 'task-2',
      });
    });
  });

  it('captures baselines for visible tasks', async () => {
    mockedApi.put.mockResolvedValue({ data: {} });

    renderGantt();
    await userEvent.click(await screen.findByRole('button', { name: /set baseline/i }));

    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith('/tasks/task-1', expect.objectContaining({
        plannedStartDate: '2026-06-02T00:00:00.000Z',
        plannedDueDate: '2026-06-04T23:59:59.999Z',
      }));
      expect(mockedApi.put).toHaveBeenCalledWith('/tasks/task-2', expect.objectContaining({
        plannedStartDate: '2026-06-03T00:00:00.000Z',
        plannedDueDate: '2026-06-07T23:59:59.999Z',
      }));
    });
    expect(mockedApi.put).not.toHaveBeenCalledWith('/tasks/task-3', expect.anything());
  });
});
