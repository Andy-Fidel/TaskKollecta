import { useEffect, useState } from "react";
import { Zap, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import api from "../api/axios";

export function AutomationModal({ isOpen, onClose, projectId }) {
  const [automations, setAutomations] = useState([]);
  
  // Form State
  const [triggerType, setTriggerType] = useState('status_change');
  const [triggerValue, setTriggerValue] = useState('done');
  const [actionType, setActionType] = useState('assign_user');
  const [actionValue, setActionValue] = useState('project_lead');

  useEffect(() => {
    if (isOpen) fetchAutomations();
  }, [isOpen]);

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
        toast.success("Automation active");
    } catch (e) { toast.error("Failed to create rule"); }
  };

  const handleDelete = async (id) => {
      try {
          await api.delete(`/automations/${id}`);
          setAutomations(automations.filter(a => a._id !== id));
      } catch (e) { toast.error("Failed to delete"); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500 fill-yellow-500" /> Automations
          </DialogTitle>
          <DialogDescription>Automate your workflow with "If This, Then That" rules.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
            
            {/* BUILDER */}
            <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-4">
                <h4 className="text-sm font-semibold">Create New Rule</h4>
                <div className="flex items-center gap-3 text-sm">
                    <span>When</span>
                    <Select value={triggerType} onValueChange={setTriggerType}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="status_change">Status is</SelectItem>
                            <SelectItem value="priority_change">Priority is</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <Select value={triggerValue} onValueChange={setTriggerValue}>
                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {triggerType === 'status_change' ? (
                                <>
                                    <SelectItem value="todo">To Do</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
                                </>
                            ) : (
                                <>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                </>
                            )}
                        </SelectContent>
                    </Select>

                    <span>Then</span>

                    <Select value={actionType} onValueChange={setActionType}>
                        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="assign_user">Assign to Lead</SelectItem>
                            <SelectItem value="archive_task">Archive Task</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button onClick={handleCreate} size="sm"><Plus className="w-4 h-4 mr-2"/> Add</Button>
                </div>
            </div>

            {/* LIST */}
            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Active Rules</h4>
                {automations.length === 0 && <p className="text-sm text-muted-foreground italic">No automations active.</p>}
                {automations.map(rule => (
                    <div key={rule._id} className="flex justify-between items-center p-3 border rounded-lg bg-card shadow-sm text-sm">
                        <div className="flex gap-2 items-center">
                            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">IF</span>
                            <span>{rule.triggerType === 'status_change' ? 'Status' : 'Priority'} is <strong>{rule.triggerValue}</strong></span>
                            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">THEN</span>
                            <span>{rule.actionType === 'assign_user' ? 'Assign to Lead' : 'Archive Task'}</span>
                        </div>
                        <button onClick={() => handleDelete(rule._id)} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                    </div>
                ))}
            </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}