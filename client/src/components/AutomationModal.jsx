import { useMemo, useState } from "react";
import { Zap, Plus, Trash2, ArrowRight, Pause, Play, Pencil, X, History, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import api from "../api/axios";

const TRIGGER_OPTIONS = [
  { value: 'status_change', label: 'Status changes to' },
  { value: 'priority_change', label: 'Priority changes to' },
  { value: 'task_overdue', label: 'Task becomes overdue' },
  { value: 'task_created', label: 'Task is created' },
  { value: 'due_date_set', label: 'Due date is set' },
  { value: 'due_date_changed', label: 'Due date changes' },
  { value: 'custom_field_change', label: 'Custom field changes' },
];

const TRIGGER_VALUES = {
  status_change: [
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' },
  ],
  priority_change: [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ],
  task_overdue: [{ value: 'any', label: 'Any task' }],
  task_created: [{ value: 'any', label: 'Any task' }],
  due_date_set: [{ value: 'set', label: 'Any due date' }],
  due_date_changed: [
    { value: 'set', label: 'Set' },
    { value: 'cleared', label: 'Cleared' },
  ],
  custom_field_change: [{ value: 'any', label: 'Any value' }],
};

const CONDITION_FIELDS = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'isMilestone', label: 'Milestone' },
  { value: 'customField', label: 'Custom field' },
];

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'is' },
  { value: 'not_equals', label: 'is not' },
  { value: 'exists', label: 'is set' },
  { value: 'not_exists', label: 'is empty' },
];

const ACTION_OPTIONS = [
  { value: 'change_status', label: 'Change status to' },
  { value: 'change_priority', label: 'Change priority to' },
  { value: 'assign_user', label: 'Assign to' },
  { value: 'set_due_date', label: 'Set due date' },
  { value: 'send_notification', label: 'Send notification to' },
  { value: 'add_comment', label: 'Add comment' },
  { value: 'create_subtask', label: 'Create subtask' },
  { value: 'set_custom_field', label: 'Set custom field' },
  { value: 'archive_task', label: 'Archive task' },
];

const STATIC_ACTION_VALUES = {
  change_status: [
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' },
  ],
  change_priority: [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ],
  assign_user: [
    { value: 'project_lead', label: 'Project lead' },
    { value: 'reporter', label: 'Task creator' },
  ],
  send_notification: [
    { value: 'assignee', label: 'Task assignee' },
    { value: 'project_lead', label: 'Project lead' },
    { value: 'reporter', label: 'Task creator' },
  ],
};

const DEFAULT_TRIGGER = { type: 'status_change', value: 'done', fieldKey: '' };
const DEFAULT_CONDITION = { field: 'priority', operator: 'equals', value: 'urgent', fieldKey: '' };
const DEFAULT_ACTION = { type: 'send_notification', value: 'project_lead', fieldKey: '' };

const TEMPLATE_RULES = [
  {
    name: 'Escalate overdue urgent work',
    description: 'Mark overdue tasks urgent and notify the project lead.',
    triggers: [{ type: 'task_overdue', value: 'any' }],
    conditions: [],
    actions: [
      { type: 'change_priority', value: 'urgent' },
      { type: 'send_notification', value: 'project_lead' },
    ],
  },
  {
    name: 'Create review follow-up',
    description: 'When work is completed, create a review subtask.',
    triggers: [{ type: 'status_change', value: 'done' }],
    conditions: [],
    actions: [
      { type: 'create_subtask', value: { title: 'Review {{task_name}}' } },
      { type: 'change_status', value: 'review' },
    ],
  },
  {
    name: 'Comment when priority is urgent',
    description: 'Add a standard note when a task becomes urgent.',
    triggers: [{ type: 'priority_change', value: 'urgent' }],
    conditions: [],
    actions: [
      { type: 'add_comment', value: { message: 'Automation flagged {{task_name}} as urgent.' } },
    ],
  },
];

const optionLabel = (options, value) => options.find((option) => option.value === value)?.label || value || 'Any';
const triggerOptionsFor = (type) => TRIGGER_VALUES[type] || [{ value: 'any', label: 'Any value' }];
const actionName = (type) => optionLabel(ACTION_OPTIONS, type);
const triggerName = (type) => optionLabel(TRIGGER_OPTIONS, type);
const conditionName = (field) => optionLabel(CONDITION_FIELDS, field);
const operatorName = (operator) => optionLabel(CONDITION_OPERATORS, operator);

const normalizeRule = (rule = {}) => ({
  name: rule.name || '',
  description: rule.description || '',
  triggers: rule.triggers?.length ? rule.triggers : [{ type: rule.triggerType || 'status_change', value: rule.triggerValue || 'done', fieldKey: rule.fieldKey || '' }],
  conditions: rule.conditions || [],
  actions: rule.actions?.length ? rule.actions : [{ type: rule.actionType || 'change_status', value: rule.actionValue || 'review', fieldKey: rule.fieldKey || '' }],
  isActive: rule.isActive !== false,
});

const emptyForm = () => ({
  name: '',
  description: '',
  triggers: [{ ...DEFAULT_TRIGGER }],
  conditions: [],
  actions: [{ ...DEFAULT_ACTION }],
  isActive: true,
});

export function AutomationModal({ isOpen, onClose, projectId }) {
  const [automations, setAutomations] = useState([]);
  const [project, setProject] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const workflowOptions = useMemo(() => (
    project?.workflowStatuses?.length
      ? project.workflowStatuses.map((status) => ({ value: status.id, label: status.label }))
      : STATIC_ACTION_VALUES.change_status
  ), [project]);

  const customFieldOptions = project?.customFields?.map((field) => ({ value: field.key, label: field.name, type: field.type, options: field.options || [] })) || [];
  const memberOptions = [
    ...STATIC_ACTION_VALUES.assign_user,
    ...(project?.members || []).map((member) => ({
      value: member.user?._id || member.user,
      label: member.user?.name || member.user?.email || 'Project member',
    })),
  ];

  const fetchAutomations = async () => {
    try {
      const [{ data: rules }, { data: projectData }] = await Promise.all([
        api.get(`/automations/${projectId}`),
        api.get(`/projects/single/${projectId}`),
      ]);
      setAutomations(rules);
      setProject(projectData);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load automations');
    }
  };

  const handleOpenChange = (open) => {
    onClose(open);
    if (open) {
      void fetchAutomations();
    } else {
      resetForm();
    }
  };

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const patchFormArray = (key, index, patch) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };

  const removeFormItem = (key, index) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const applyTemplate = (template) => {
    setForm({
      ...template,
      triggers: template.triggers.map((trigger) => ({ ...trigger })),
      conditions: template.conditions.map((condition) => ({ ...condition })),
      actions: template.actions.map((action) => ({ ...action })),
      isActive: true,
    });
    setEditingId(null);
  };

  const startEdit = (rule) => {
    setEditingId(rule._id);
    setForm(normalizeRule(rule));
  };

  const payload = () => ({
    projectId,
    ...form,
    name: form.name.trim() || 'Untitled automation',
    triggers: form.triggers.map((trigger) => ({ ...trigger, value: trigger.value || 'any' })),
    actions: form.actions.map((action) => ({ ...action })),
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      const request = editingId
        ? api.put(`/automations/${editingId}`, payload())
        : api.post('/automations', payload());
      const { data } = await request;
      setAutomations((current) => editingId
        ? current.map((rule) => rule._id === editingId ? data : rule)
        : [data, ...current]);
      toast.success(editingId ? 'Automation updated' : 'Automation created');
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule) => {
    try {
      const { data } = await api.patch(`/automations/${rule._id}`, { isActive: !rule.isActive });
      setAutomations((current) => current.map((item) => item._id === rule._id ? data : item));
      toast.success(data.isActive ? 'Automation resumed' : 'Automation paused');
    } catch {
      toast.error('Failed to update automation');
    }
  };

  const duplicateRule = (rule) => {
    const normalized = normalizeRule(rule);
    setForm({ ...normalized, name: `${normalized.name} copy` });
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/automations/${id}`);
      setAutomations(automations.filter(a => a._id !== id));
      if (editingId === id) resetForm();
      toast.success("Automation removed");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const renderTriggerValue = (trigger, index) => (
    <Select value={trigger.value || 'any'} onValueChange={(value) => patchFormArray('triggers', index, { value })}>
      <SelectTrigger className="h-9 min-w-[130px] flex-1"><SelectValue /></SelectTrigger>
      <SelectContent>
        {(trigger.type === 'status_change' ? workflowOptions : triggerOptionsFor(trigger.type)).map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderConditionValue = (condition, index) => {
    if (condition.operator === 'exists' || condition.operator === 'not_exists') return null;

    if (condition.field === 'status') {
      return (
        <Select value={condition.value || 'todo'} onValueChange={(value) => patchFormArray('conditions', index, { value })}>
          <SelectTrigger className="h-9 min-w-[130px] flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>{workflowOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
      );
    }

    if (condition.field === 'priority') {
      return (
        <Select value={condition.value || 'medium'} onValueChange={(value) => patchFormArray('conditions', index, { value })}>
          <SelectTrigger className="h-9 min-w-[130px] flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>{STATIC_ACTION_VALUES.change_priority.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
      );
    }

    if (condition.field === 'isMilestone') {
      return (
        <Select value={String(condition.value ?? true)} onValueChange={(value) => patchFormArray('conditions', index, { value: value === 'true' })}>
          <SelectTrigger className="h-9 min-w-[130px] flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        value={condition.value || ''}
        onChange={(event) => patchFormArray('conditions', index, { value: event.target.value })}
        className="h-9 min-w-[150px] flex-1"
        placeholder="Value"
      />
    );
  };

  const renderActionValue = (action, index) => {
    if (action.type === 'archive_task') return null;

    if (action.type === 'change_status') {
      return (
        <Select value={action.value || 'todo'} onValueChange={(value) => patchFormArray('actions', index, { value })}>
          <SelectTrigger className="h-9 min-w-[130px] flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>{workflowOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
      );
    }

    if (action.type === 'change_priority') {
      return (
        <Select value={action.value || 'medium'} onValueChange={(value) => patchFormArray('actions', index, { value })}>
          <SelectTrigger className="h-9 min-w-[130px] flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>{STATIC_ACTION_VALUES.change_priority.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
      );
    }

    if (action.type === 'assign_user' || action.type === 'send_notification') {
      const options = action.type === 'assign_user' ? memberOptions : [...STATIC_ACTION_VALUES.send_notification, ...memberOptions.slice(2)];
      return (
        <Select value={action.value || 'project_lead'} onValueChange={(value) => patchFormArray('actions', index, { value })}>
          <SelectTrigger className="h-9 min-w-[160px] flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
      );
    }

    if (action.type === 'set_due_date') {
      const value = typeof action.value === 'object' ? action.value : { mode: 'relative', amount: 2, unit: 'days' };
      return (
        <div className="flex min-w-[240px] flex-1 gap-2">
          <Input
            type="number"
            min="0"
            value={value.amount}
            onChange={(event) => patchFormArray('actions', index, { value: { ...value, amount: event.target.value } })}
            className="h-9 w-20"
          />
          <Select value={value.unit} onValueChange={(unit) => patchFormArray('actions', index, { value: { ...value, unit } })}>
            <SelectTrigger className="h-9 flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">Minutes from now</SelectItem>
              <SelectItem value="hours">Hours from now</SelectItem>
              <SelectItem value="days">Days from now</SelectItem>
              <SelectItem value="weeks">Weeks from now</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (action.type === 'set_custom_field') {
      return (
        <>
          <Select value={action.fieldKey || customFieldOptions[0]?.value || ''} onValueChange={(fieldKey) => patchFormArray('actions', index, { fieldKey })}>
            <SelectTrigger className="h-9 min-w-[150px] flex-1"><SelectValue placeholder="Field" /></SelectTrigger>
            <SelectContent>{customFieldOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
          <Input
            value={typeof action.value === 'string' ? action.value : ''}
            onChange={(event) => patchFormArray('actions', index, { value: event.target.value })}
            className="h-9 min-w-[140px] flex-1"
            placeholder="Value"
          />
        </>
      );
    }

    const key = action.type === 'create_subtask' ? 'title' : 'message';
    return (
      <Input
        value={typeof action.value === 'object' ? action.value?.[key] || '' : action.value || ''}
        onChange={(event) => patchFormArray('actions', index, { value: { [key]: event.target.value } })}
        className="h-9 min-w-[240px] flex-1"
        placeholder={action.type === 'create_subtask' ? 'Review {{task_name}}' : 'Message with {{task_name}}'}
      />
    );
  };

  const describeTrigger = (trigger) => `${triggerName(trigger.type)} ${optionLabel(trigger.type === 'status_change' ? workflowOptions : triggerOptionsFor(trigger.type), trigger.value)}`;
  const describeCondition = (condition) => `${conditionName(condition.field)} ${operatorName(condition.operator)} ${condition.operator === 'exists' || condition.operator === 'not_exists' ? '' : condition.value}`;
  const describeAction = (action) => `${actionName(action.type)} ${typeof action.value === 'object' ? action.value?.title || action.value?.message || '' : action.value || ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500 fill-yellow-500" /> Automations
          </DialogTitle>
          <DialogDescription>Build Asana-style rules with triggers, optional checks, and multiple actions.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-4 rounded-xl border border-border bg-muted/30 p-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> {editingId ? 'Edit Rule' : 'Create Rule'}
              </h4>
              {editingId && (
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Rule name</Label>
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Notify lead when task is urgent" />
              </div>
              <div className="flex items-end gap-2 rounded-lg border border-border bg-background px-3 py-2">
                <Switch checked={form.isActive} onCheckedChange={(isActive) => setForm({ ...form, isActive })} />
                <div>
                  <p className="text-sm font-medium">{form.isActive ? 'Active' : 'Paused'}</p>
                  <p className="text-xs text-muted-foreground">Controls whether this rule can run.</p>
                </div>
              </div>
            </div>
            <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Optional description" className="min-h-[70px]" />

            <RuleSection
              label="WHEN"
              tone="primary"
              onAdd={() => setForm({ ...form, triggers: [...form.triggers, { ...DEFAULT_TRIGGER }] })}
            >
              {form.triggers.map((trigger, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-2">
                  <Select value={trigger.type} onValueChange={(type) => patchFormArray('triggers', index, { type, value: triggerOptionsFor(type)[0]?.value || 'any', fieldKey: '' })}>
                    <SelectTrigger className="h-9 min-w-[180px] flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{TRIGGER_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {trigger.type === 'custom_field_change' && (
                    <Select value={trigger.fieldKey || customFieldOptions[0]?.value || ''} onValueChange={(fieldKey) => patchFormArray('triggers', index, { fieldKey })}>
                      <SelectTrigger className="h-9 min-w-[150px] flex-1"><SelectValue placeholder="Field" /></SelectTrigger>
                      <SelectContent>{customFieldOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {renderTriggerValue(trigger, index)}
                  {form.triggers.length > 1 && <IconButton onClick={() => removeFormItem('triggers', index)} />}
                </div>
              ))}
            </RuleSection>

            <RuleSection
              label="CHECK IF"
              tone="amber"
              onAdd={() => setForm({ ...form, conditions: [...form.conditions, { ...DEFAULT_CONDITION }] })}
            >
              {form.conditions.length === 0 && <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">No conditions. The rule runs whenever a trigger matches.</p>}
              {form.conditions.map((condition, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-2">
                  <Select value={condition.field} onValueChange={(field) => patchFormArray('conditions', index, { field, fieldKey: '', value: field === 'isMilestone' ? true : '' })}>
                    <SelectTrigger className="h-9 min-w-[140px] flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{CONDITION_FIELDS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {condition.field === 'customField' && (
                    <Select value={condition.fieldKey || customFieldOptions[0]?.value || ''} onValueChange={(fieldKey) => patchFormArray('conditions', index, { fieldKey })}>
                      <SelectTrigger className="h-9 min-w-[150px] flex-1"><SelectValue placeholder="Field" /></SelectTrigger>
                      <SelectContent>{customFieldOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  <Select value={condition.operator} onValueChange={(operator) => patchFormArray('conditions', index, { operator })}>
                    <SelectTrigger className="h-9 min-w-[120px] flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{CONDITION_OPERATORS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {renderConditionValue(condition, index)}
                  <IconButton onClick={() => removeFormItem('conditions', index)} />
                </div>
              ))}
            </RuleSection>

            <RuleSection
              label="DO THIS"
              tone="emerald"
              onAdd={() => setForm({ ...form, actions: [...form.actions, { ...DEFAULT_ACTION }] })}
            >
              {form.actions.map((action, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-2">
                  <Select value={action.type} onValueChange={(type) => patchFormArray('actions', index, { type, value: defaultActionValue(type), fieldKey: '' })}>
                    <SelectTrigger className="h-9 min-w-[180px] flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{ACTION_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {renderActionValue(action, index)}
                  {form.actions.length > 1 && <IconButton onClick={() => removeFormItem('actions', index)} />}
                </div>
              ))}
            </RuleSection>

            <div className="flex flex-wrap justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_RULES.map((template) => (
                  <Button key={template.name} variant="outline" size="sm" onClick={() => applyTemplate(template)}>
                    {template.name}
                  </Button>
                ))}
              </div>
              <Button onClick={handleSave} disabled={saving || form.triggers.length === 0 || form.actions.length === 0} size="sm">
                <Plus className="w-4 h-4 mr-2" /> {editingId ? 'Save Rule' : 'Add Rule'}
              </Button>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground">Rules ({automations.length})</h4>
              <Badge variant="outline">{automations.filter((rule) => rule.isActive !== false).length} active</Badge>
            </div>
            {automations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No automations yet</p>
                <p className="text-xs mt-1">Create your first rule or start from a template.</p>
              </div>
            )}
            {automations.map((rule) => {
              const normalized = normalizeRule(rule);
              const latest = rule.executionLog?.[0];
              return (
                <div key={rule._id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="truncate text-sm font-semibold text-foreground">{normalized.name || 'Untitled automation'}</h5>
                        <Badge variant={rule.isActive === false ? 'outline' : 'secondary'}>{rule.isActive === false ? 'Paused' : 'Active'}</Badge>
                      </div>
                      {normalized.description && <p className="mt-1 text-xs text-muted-foreground">{normalized.description}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleRule(rule)} title={rule.isActive === false ? 'Resume' : 'Pause'}>
                        {rule.isActive === false ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(rule)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateRule(rule)} title="Duplicate">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(rule._id)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <SummaryRow label="WHEN" items={normalized.triggers.map(describeTrigger)} tone="primary" />
                    {normalized.conditions.length > 0 && <SummaryRow label="CHECK IF" items={normalized.conditions.map(describeCondition)} tone="amber" />}
                    <SummaryRow label="DO THIS" items={normalized.actions.map(describeAction)} tone="emerald" />
                  </div>

                  <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <History className="h-3.5 w-3.5" />
                    {latest ? (
                      <>
                        {latest.status === 'failed' ? <AlertCircle className="h-3.5 w-3.5 text-red-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                        <span>{latest.status}: {latest.message}</span>
                      </>
                    ) : <span>No runs yet</span>}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function defaultActionValue(type) {
  if (type === 'change_status') return 'todo';
  if (type === 'change_priority') return 'medium';
  if (type === 'assign_user' || type === 'send_notification') return 'project_lead';
  if (type === 'set_due_date') return { mode: 'relative', amount: 2, unit: 'days' };
  if (type === 'add_comment') return { message: 'Automation ran on {{task_name}}.' };
  if (type === 'create_subtask') return { title: 'Follow up on {{task_name}}' };
  return '';
}

function RuleSection({ label, tone, onAdd, children }) {
  const toneClass = tone === 'emerald'
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : tone === 'amber'
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      : 'bg-primary/10 text-primary';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`font-mono text-xs px-2 py-0.5 rounded-md font-bold ${toneClass}`}>{label}</span>
        <Button variant="ghost" size="sm" onClick={onAdd} className="h-7 px-2 text-xs">
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ label, items, tone }) {
  const toneClass = tone === 'emerald'
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : tone === 'amber'
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      : 'bg-primary/10 text-primary';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${toneClass}`}>{label}</span>
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="inline-flex items-center gap-2">
          <span>{item}</span>
          {index < items.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
        </span>
      ))}
    </div>
  );
}

function IconButton({ onClick }) {
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={onClick}>
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
