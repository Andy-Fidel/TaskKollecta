import { describe, expect, it } from 'vitest';
import { applyFilters } from '../components/Filters/AdvancedFilters';
import { buildTaskExportData } from '../utils/exportUtils';

const fields = [
  { key: 'client', name: 'Client', type: 'text', order: 0 },
  { key: 'approved', name: 'Approved', type: 'checkbox', order: 1 },
  { key: 'budget', name: 'Budget', type: 'number', order: 2 },
];

const tasks = [
  {
    _id: 'task-1',
    title: 'Launch campaign',
    status: 'approved',
    priority: 'high',
    project: { name: 'Marketing' },
    customFieldValues: [
      { key: 'client', value: 'Acme' },
      { key: 'approved', value: true },
      { key: 'budget', value: 5000 },
    ],
  },
  {
    _id: 'task-2',
    title: 'Draft brief',
    status: 'queued',
    priority: 'medium',
    project: { name: 'Marketing' },
    customFieldValues: [
      { key: 'client', value: 'Globex' },
      { key: 'approved', value: false },
      { key: 'budget', value: 1500 },
    ],
  },
];

describe('custom field filtering and export', () => {
  it('filters tasks by text, checkbox, and number custom fields', () => {
    expect(applyFilters(tasks, { customFields: { client: 'acm' } }).map((task) => task.title)).toEqual(['Launch campaign']);
    expect(applyFilters(tasks, { customFields: { approved: false } }).map((task) => task.title)).toEqual(['Draft brief']);
    expect(applyFilters(tasks, { customFields: { budget: 5000 } }).map((task) => task.title)).toEqual(['Launch campaign']);
  });

  it('includes custom field headers and values in task exports', () => {
    const { headers, rows } = buildTaskExportData(tasks, fields, [
      { id: 'queued', label: 'Queued' },
      { id: 'approved', label: 'Approved' },
    ]);

    expect(headers).toEqual(['Title', 'Status', 'Priority', 'Assignee', 'Start Date', 'Due Date', 'Project', 'Client', 'Approved', 'Budget']);
    expect(rows[0]).toEqual(['Launch campaign', 'Approved', 'high', '', '', '', 'Marketing', 'Acme', 'Yes', '5000']);
  });
});
