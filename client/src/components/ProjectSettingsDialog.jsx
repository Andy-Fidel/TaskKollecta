import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Trash2, Save, Check, Loader2,
  LayoutList, Columns3, GanttChart, CalendarDays,
  Globe, Lock, User as UserIcon, Plus
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import api from '../api/axios';
import { toast } from 'sonner';

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6',
  '#f97316', '#06b6d4', '#84cc16', '#a855f7',
];

const VIEWS = [
  { id: 'list', label: 'List', icon: LayoutList },
  { id: 'board', label: 'Board', icon: Columns3 },
  { id: 'timeline', label: 'Timeline', icon: GanttChart },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
];

export function ProjectSettingsDialog({ isOpen, onClose, project, onUpdate, members = [] }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [defaultView, setDefaultView] = useState('board');
  const [privacy, setPrivacy] = useState('public');
  const [lead, setLead] = useState('');
  const [isArchived, setIsArchived] = useState(false);
  const [isTemplate, setIsTemplate] = useState(false);
  const [briefPurpose, setBriefPurpose] = useState('');
  const [briefSuccessCriteria, setBriefSuccessCriteria] = useState('');
  const [statusCadence, setStatusCadence] = useState('weekly');
  const [resources, setResources] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [workflowStatuses, setWorkflowStatuses] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setColor(project.color || '#3b82f6');
      setDefaultView(project.defaultView || 'board');
      setPrivacy(project.privacy || 'public');
      setLead(project.lead?._id || project.lead || '');
      setIsArchived(project.status === 'archived');
      setIsTemplate(project.isTemplate || false);
      setBriefPurpose(project.brief?.purpose || '');
      setBriefSuccessCriteria(project.brief?.successCriteria || '');
      setStatusCadence(project.brief?.statusCadence || 'weekly');
      setResources(project.brief?.resources?.length ? project.brief.resources : []);
      setMilestones(project.brief?.milestones?.length ? project.brief.milestones : []);
      setWorkflowStatuses(project.workflowStatuses?.length ? project.workflowStatuses : [
        { id: 'todo', label: 'To Do', color: '#64748b', order: 0, isDone: false },
        { id: 'in-progress', label: 'In Progress', color: '#3b82f6', order: 1, isDone: false },
        { id: 'review', label: 'Review', color: '#f59e0b', order: 2, isDone: false },
        { id: 'done', label: 'Done', color: '#22c55e', order: 3, isDone: true },
      ]);
      setCustomFields(project.customFields || []);
    }
  }, [project]);

  const slugify = (value, separator = '-') =>
    value.toLowerCase().trim().replace(/[^a-z0-9]+/g, separator).replace(new RegExp(`^\\${separator}|\\${separator}$`, 'g'), '');

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }

    setIsSaving(true);
    try {
      const { data } = await api.put(`/projects/${project._id}`, {
        name: name.trim(),
        description: description.trim(),
        color,
        defaultView,
        privacy,
        lead: lead || undefined,
        brief: {
          purpose: briefPurpose,
          successCriteria: briefSuccessCriteria,
          statusCadence,
          resources,
          milestones,
        },
        status: isArchived ? 'archived' : 'active',
        isTemplate,
        workflowStatuses,
        customFields
      });
      onUpdate(data);
      toast.success('Project updated successfully');
      onClose();
    } catch {
      toast.error('Failed to update project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/projects/${project._id}`);
      toast.success('Project deleted');
      navigate('/projects');
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const updateWorkflowStatus = (index, updates) => {
    setWorkflowStatuses((current) => current.map((status, i) => i === index ? { ...status, ...updates } : status));
  };

  const addWorkflowStatus = () => {
    const label = 'New Status';
    setWorkflowStatuses((current) => [
      ...current,
      { id: `${slugify(label)}-${current.length + 1}`, label, color: '#64748b', order: current.length, isDone: false },
    ]);
  };

  const updateResource = (index, updates) => {
    setResources((current) => current.map((resource, i) => i === index ? { ...resource, ...updates } : resource));
  };

  const updateMilestone = (index, updates) => {
    setMilestones((current) => current.map((milestone, i) => i === index ? { ...milestone, ...updates } : milestone));
  };

  const addCustomField = () => {
    setCustomFields((current) => [
      ...current,
      { key: `field_${current.length + 1}`, name: 'New Field', type: 'text', options: [], required: false, order: current.length },
    ]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden max-h-[90vh]">

        {/* Header */}
        <div className="p-6 pb-4 shrink-0">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm transition-colors"
                style={{ backgroundColor: color }}
              >
                {name.charAt(0) || 'P'}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Project Settings</DialogTitle>
                <DialogDescription className="text-xs">Manage settings for {project?.name}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 max-h-[calc(90vh-160px)]">
          <div className="px-6 pb-6 space-y-6">

            {/* --- Section: General --- */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">General</h3>

              <div className="space-y-2">
                <Label htmlFor="settings-name" className="text-sm font-semibold">Project Name</Label>
                <Input
                  id="settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 bg-card border-border/60 focus-visible:ring-primary/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-desc" className="text-sm font-semibold">Description</Label>
                <Textarea
                  id="settings-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                  className="min-h-[80px] bg-card border-border/60 focus-visible:ring-primary/40 resize-none"
                />
              </div>

              {/* Template Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">Save as Template</p>
                  <p className="text-[11px] text-muted-foreground">Allow others in this workspace to duplicate this project.</p>
                </div>
                <Switch checked={isTemplate} onCheckedChange={setIsTemplate} />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Color</Label>
                <div className="flex flex-wrap gap-2.5">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none",
                        color === c ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110 shadow-lg" : "hover:shadow-md"
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* --- Section: Brief --- */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Brief & Status Cadence</h3>

              <div className="space-y-2">
                <Label htmlFor="settings-purpose" className="text-sm font-semibold">Purpose</Label>
                <Textarea
                  id="settings-purpose"
                  value={briefPurpose}
                  onChange={(e) => setBriefPurpose(e.target.value)}
                  placeholder="Why does this project matter?"
                  className="min-h-[80px] bg-card border-border/60 focus-visible:ring-primary/40 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-success" className="text-sm font-semibold">Success Criteria</Label>
                <Textarea
                  id="settings-success"
                  value={briefSuccessCriteria}
                  onChange={(e) => setBriefSuccessCriteria(e.target.value)}
                  placeholder="What does success look like?"
                  className="min-h-[80px] bg-card border-border/60 focus-visible:ring-primary/40 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Status Cadence</Label>
                <select
                  value={statusCadence}
                  onChange={(event) => setStatusCadence(event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="none">No cadence</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Resources</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setResources((current) => [...current, { label: '', url: '' }])}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {resources.map((resource, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Input value={resource.label || ''} onChange={(e) => updateResource(index, { label: e.target.value })} placeholder="Label" className="h-9" />
                    <Input value={resource.url || ''} onChange={(e) => updateResource(index, { url: e.target.value })} placeholder="https://..." className="h-9" />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => setResources((current) => current.filter((_, i) => i !== index))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Milestones</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setMilestones((current) => [...current, { title: '', dueDate: '' }])}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {milestones.map((milestone, index) => (
                  <div key={index} className="grid grid-cols-[1fr_150px_auto] gap-2">
                    <Input value={milestone.title || ''} onChange={(e) => updateMilestone(index, { title: e.target.value })} placeholder="Milestone" className="h-9" />
                    <Input
                      type="date"
                      value={milestone.dueDate ? String(milestone.dueDate).slice(0, 10) : ''}
                      onChange={(e) => updateMilestone(index, { dueDate: e.target.value })}
                      className="h-9"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => setMilestones((current) => current.filter((_, i) => i !== index))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* --- Section: Layout & Privacy --- */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Layout & Privacy</h3>

              {/* Default View */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Default View</Label>
                <div className="grid grid-cols-4 gap-2">
                  {VIEWS.map((v) => {
                    const Icon = v.icon;
                    const isActive = defaultView === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setDefaultView(v.id)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 focus:outline-none",
                          isActive
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border/40 bg-card hover:border-primary/30 hover:bg-muted/30"
                        )}
                      >
                        <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("text-[11px] font-semibold", isActive ? "text-primary" : "text-muted-foreground")}>{v.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Privacy */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Privacy</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'public', label: 'Public', icon: Globe, desc: 'All org members' },
                    { id: 'private', label: 'Private', icon: Lock, desc: 'Invite only' },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isActive = privacy === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPrivacy(p.id)}
                        className={cn(
                          "flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all duration-200 text-left focus:outline-none",
                          isActive
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border/40 bg-card hover:border-primary/30 hover:bg-muted/30"
                        )}
                      >
                        <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                        <div className="min-w-0">
                          <p className={cn("text-sm font-semibold leading-none", isActive ? "text-primary" : "text-foreground")}>{p.label}</p>
                          <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* --- Section: Workflow --- */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Workflow</h3>
                <Button type="button" variant="outline" size="sm" onClick={addWorkflowStatus}>Add Status</Button>
              </div>
              <div className="space-y-2">
                {workflowStatuses.map((status, index) => (
                  <div key={`${status.id}-${index}`} className="grid grid-cols-[1fr_96px_auto] gap-2 items-center rounded-xl border border-border/40 bg-card p-2">
                    <Input
                      value={status.label}
                      onChange={(e) => updateWorkflowStatus(index, { label: e.target.value, id: slugify(e.target.value) })}
                      className="h-9"
                    />
                    <Input
                      type="color"
                      value={status.color || '#64748b'}
                      onChange={(e) => updateWorkflowStatus(index, { color: e.target.value })}
                      className="h-9 p-1"
                    />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                      <Switch checked={!!status.isDone} onCheckedChange={(checked) => updateWorkflowStatus(index, { isDone: checked })} />
                      Done
                    </label>
                    <button
                      type="button"
                      onClick={() => setWorkflowStatuses((current) => current.filter((_, i) => i !== index).map((item, order) => ({ ...item, order })))}
                      className="col-span-3 text-left text-xs text-destructive hover:underline disabled:opacity-40"
                      disabled={workflowStatuses.length <= 1}
                    >
                      Remove status
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* --- Section: Custom Fields --- */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Custom Fields</h3>
                <Button type="button" variant="outline" size="sm" onClick={addCustomField}>Add Field</Button>
              </div>
              <div className="space-y-2">
                {customFields.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Add fields like client, budget, impact, approval state, or launch date.
                  </div>
                )}
                {customFields.map((field, index) => (
                  <div key={`${field.key}-${index}`} className="rounded-xl border border-border/40 bg-card p-3 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
                      <Input
                        value={field.name}
                        onChange={(e) => setCustomFields((current) => current.map((item, i) => i === index ? { ...item, name: e.target.value, key: slugify(e.target.value, '_') } : item))}
                        placeholder="Field name"
                        className="h-9"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => setCustomFields((current) => current.map((item, i) => i === index ? { ...item, type: e.target.value } : item))}
                        className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="select">Select</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                    </div>
                    {field.type === 'select' && (
                      <Input
                        value={(field.options || []).join(', ')}
                        onChange={(e) => setCustomFields((current) => current.map((item, i) => i === index ? { ...item, options: e.target.value.split(',').map((option) => option.trim()).filter(Boolean) } : item))}
                        placeholder="Options separated by commas"
                        className="h-9"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setCustomFields((current) => current.filter((_, i) => i !== index).map((item, order) => ({ ...item, order })))}
                      className="text-xs text-destructive hover:underline"
                    >
                      Remove field
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* --- Section: Team --- */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Team</h3>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Project Lead</Label>
                <div className="grid grid-cols-1 gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                  {members.map((m) => {
                    const u = m.user;
                    if (!u) return null;
                    const isLead = lead === u._id;
                    return (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => setLead(isLead ? '' : u._id)}
                        className={cn(
                          "flex items-center gap-2.5 p-2 rounded-lg border transition-all text-left focus:outline-none",
                          isLead
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border/30 bg-card hover:border-primary/30 hover:bg-muted/30"
                        )}
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={u.avatar} />
                          <AvatarFallback className="text-[10px]">{u.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground flex-1 truncate">{u.name}</span>
                        {isLead && <Badge variant="secondary" className="text-[10px] h-5 shrink-0">Lead</Badge>}
                      </button>
                    );
                  })}
                  {members.length === 0 && (
                    <div className="text-center py-3 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                      <UserIcon className="w-4 h-4 mx-auto mb-1 opacity-50" />
                      No team members
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* --- Section: Danger Zone --- */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-destructive/80">Danger Zone</h3>

              {/* Archive */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">Archive Project</p>
                  <p className="text-[11px] text-muted-foreground">Hide from the dashboard.</p>
                </div>
                <Switch checked={isArchived} onCheckedChange={setIsArchived} />
              </div>

              {/* Delete */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-destructive/20 bg-destructive/5">
                <div>
                  <p className="text-sm font-semibold text-destructive">Delete Project</p>
                  <p className="text-[11px] text-destructive/70">Permanently delete this project and its tasks.</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="h-8 px-3 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete <strong>{project?.name}</strong> and all tasks associated with it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Project</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border/40 flex items-center justify-end gap-2 shrink-0 bg-background">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5 px-5">
            {isSaving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> Save Changes</>
            )}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
