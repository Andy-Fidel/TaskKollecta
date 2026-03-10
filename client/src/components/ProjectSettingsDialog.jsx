import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Trash2, Save, Check, Loader2,
  LayoutList, Columns3, GanttChart, CalendarDays,
  Globe, Lock, User as UserIcon
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
    }
  }, [project]);

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
        status: isArchived ? 'archived' : 'active',
        isTemplate
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