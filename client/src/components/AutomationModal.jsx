import { useEffect, useState } from "react";
import { Zap, Plus, Trash2, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import api from "../api/axios";

// --- Configuration for the builder UI ---
const TRIGGER_OPTIONS = [
  { value: 'status_change', label: 'Status changes to' },
  { value: 'priority_change', label: 'Priority changes to' },
  { value: 'task_overdue', label: 'Task becomes overdue' },
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
  task_overdue: [
    { value: 'any', label: 'Any task' },
  ],
};

const ACTION_OPTIONS = [
  { value: 'change_status', label: 'Change status to' },
  { value: 'change_priority', label: 'Change priority to' },
  { value: 'assign_user', label: 'Assign to project lead' },
  { value: 'send_notification', label: 'Send notification to' },
  { value: 'archive_task', label: 'Archive the task' },
];

const ACTION_VALUES = {
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
  send_notification: [
    { value: 'assignee', label: 'Task assignee' },
    { value: 'project_lead', label: 'Project lead' },
  ],
  assign_user: [
    { value: 'project_lead', label: 'Project lead' },
  ],
  archive_task: [], // no value needed
};

// Human-readable labels for display
function triggerLabel(type, value) {
  const triggerName = TRIGGER_OPTIONS.find(t => t.value === type)?.label || type;
  const valueName = TRIGGER_VALUES[type]?.find(v => v.value === value)?.label || value;
  return { triggerName, valueName };
}

function actionLabel(type, value) {
  const actionName = ACTION_OPTIONS.find(a => a.value === type)?.label || type;
  const valueName = ACTION_VALUES[type]?.find(v => v.value === value)?.label || value;
  return { actionName, valueName };
}

export function AutomationModal({ isOpen, onClose, projectId }) {
  const [automations, setAutomations] = useState([]);
  
  // Form State
  const [triggerType, setTriggerType] = useState('status_change');
  const [triggerValue, setTriggerValue] = useState('done');
  const [actionType, setActionType] = useState('change_status');
  const [actionValue, setActionValue] = useState('review');

  useEffect(() => {
    if (isOpen) fetchAutomations();
  }, [isOpen]);

  // Reset dependent dropdowns when parent changes
  useEffect(() => {
    const firstVal = TRIGGER_VALUES[triggerType]?.[0]?.value || '';
    setTriggerValue(firstVal);
  }, [triggerType]);

  useEffect(() => {
    const firstVal = ACTION_VALUES[actionType]?.[0]?.value || '';
    setActionValue(firstVal);
  }, [actionType]);

  const fetchAutomations = async () => {
    try {
        const { data } = await api.get(`/automations/${projectId}`);
        setAutomations(data);
    } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    try {
        const { data } = await api.post('/automations', {
            projectId,
            triggerType,
            triggerValue,
            actionType,
            actionValue
        });
        setAutomations([...automations, data]);
        toast.success("Automation created!");
    } catch (e) { toast.error("Failed to create rule"); }
  };

  const handleDelete = async (id) => {
      try {
          await api.delete(`/automations/${id}`);
          setAutomations(automations.filter(a => a._id !== id));
          toast.success("Automation removed");
      } catch (e) { toast.error("Failed to delete"); }
  };

  const actionNeedsValue = ACTION_VALUES[actionType]?.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500 fill-yellow-500" /> Automations
          </DialogTitle>
          <DialogDescription>Automate your workflow with "If This, Then That" rules.</DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-4">
            
            {/* BUILDER */}
            <div className="bg-muted/30 p-5 rounded-xl border border-border space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> Create New Rule
                </h4>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                    {/* TRIGGER TYPE */}
                    <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold">WHEN</span>
                    <Select value={triggerType} onValueChange={setTriggerType}>
                        <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {TRIGGER_OPTIONS.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    {/* TRIGGER VALUE */}
                    {TRIGGER_VALUES[triggerType]?.length > 0 && (
                      <Select value={triggerValue} onValueChange={setTriggerValue}>
                          <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                              {TRIGGER_VALUES[triggerType].map(v => (
                                  <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                    )}

                    <ArrowRight className="w-4 h-4 text-muted-foreground mx-1" />

                    {/* ACTION TYPE */}
                    <span className="font-mono text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold">THEN</span>
                    <Select value={actionType} onValueChange={setActionType}>
                        <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {ACTION_OPTIONS.map(a => (
                                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* ACTION VALUE */}
                    {actionNeedsValue && (
                      <Select value={actionValue} onValueChange={setActionValue}>
                          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                              {ACTION_VALUES[actionType].map(v => (
                                  <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                    )}
                </div>

                <Button onClick={handleCreate} size="sm" className="mt-2">
                    <Plus className="w-4 h-4 mr-2"/> Add Rule
                </Button>
            </div>

            {/* ACTIVE RULES LIST */}
            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Active Rules ({automations.length})</h4>
                {automations.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-xl">
                    <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No automations yet</p>
                    <p className="text-xs mt-1">Create your first rule above to get started</p>
                  </div>
                )}
                {automations.map(rule => {
                    const { triggerName, valueName } = triggerLabel(rule.triggerType, rule.triggerValue);
                    const { actionName, valueName: actVal } = actionLabel(rule.actionType, rule.actionValue);
                    return (
                      <div key={rule._id} className="flex justify-between items-center p-3 border border-border rounded-xl bg-card shadow-sm text-sm group hover:shadow-md transition-shadow">
                          <div className="flex gap-2 items-center flex-wrap">
                              <span className="font-mono text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">WHEN</span>
                              <span>{triggerName} <strong className="text-foreground">{valueName}</strong></span>
                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-mono text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">THEN</span>
                              <span>{actionName} {actVal && <strong className="text-foreground">{actVal}</strong>}</span>
                          </div>
                          <button onClick={() => handleDelete(rule._id)} className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                      </div>
                    );
                })}
            </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}