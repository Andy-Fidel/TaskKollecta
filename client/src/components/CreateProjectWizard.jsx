import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Plus, ArrowRight, ArrowLeft, Check, Sparkles,
  LayoutList, Columns3, GanttChart, CalendarDays,
  Globe, Lock, User as UserIcon, Calendar as CalendarIcon,
  Users, Loader2, X, Wand2, Pencil
} from 'lucide-react';

// UI Components
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

import api from '../api/axios';

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6',
  '#f97316', '#06b6d4', '#84cc16', '#a855f7',
];

const VIEWS = [
  { id: 'list', label: 'List', icon: LayoutList, description: 'Track tasks in a structured list' },
  { id: 'board', label: 'Board', icon: Columns3, description: 'Visualize work in kanban columns' },
  { id: 'timeline', label: 'Timeline', icon: GanttChart, description: 'Plan work on a timeline' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, description: 'Schedule tasks on a calendar' },
];

const STEPS = [
  { label: 'Basics', number: 1 },
  { label: 'Layout', number: 2 },
  { label: 'Team', number: 3 },
  { label: 'AI Tasks', number: 4 },
];

export default function CreateProjectWizard({ open, onOpenChange, members = [], templates = [], onProjectCreated }) {
  // Step
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Step 2
  const [defaultView, setDefaultView] = useState('board');
  const [privacy, setPrivacy] = useState('public');

  // Step 3
  const [lead, setLead] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [dueDate, setDueDate] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);

  // Step 4 — AI Tasks
  const [aiTasks, setAiTasks] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  const resetForm = useCallback(() => {
    setStep(1);
    setName('');
    setDescription('');
    setColor(COLORS[0]);
    setSelectedTemplate(null);
    setDefaultView('board');
    setPrivacy('public');
    setLead('');
    setStartDate(null);
    setDueDate(null);
    setSelectedMembers([]);
    setAiTasks([]);
    setIsGenerating(false);
    setAiGenerated(false);
    setIsSubmitting(false);
  }, []);

  const goNext = () => {
    if (step < 4) {
      setStep(s => s + 1);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(s => s - 1);
    }
  };

  const toggleMember = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // --- AI Task Generation ---
  const handleGenerateTasks = async () => {
    if (!name.trim()) return;
    setIsGenerating(true);
    try {
      const { data } = await api.post('/ai/breakdown', {
        name: name.trim(),
        description: description.trim(),
      });
      setAiTasks((data.tasks || []).map((t, i) => ({ ...t, id: i, accepted: true, editing: false })));
      setAiGenerated(true);
    } catch {
      setAiTasks([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleAiTask = (id) => {
    setAiTasks(prev => prev.map(t => t.id === id ? { ...t, accepted: !t.accepted } : t));
  };
  const removeAiTask = (id) => {
    setAiTasks(prev => prev.filter(t => t.id !== id));
  };
  const updateAiTaskTitle = (id, title) => {
    setAiTasks(prev => prev.map(t => t.id === id ? { ...t, title } : t));
  };

  const handleCreate = async () => {
    const targetOrgId = localStorage.getItem('activeOrgId');
    if (!targetOrgId) return alert("You must create or join an Organization first!");
    
    // If a template is selected, we use the duplicate endpoint
    if (selectedTemplate) {
      setIsSubmitting(true);
      try {
        const { data } = await api.post(`/projects/${selectedTemplate}/duplicate`, {
          name: name.trim() || undefined,
          isTemplate: false // Duplicated projects shouldn't be templates by default
        });
        onProjectCreated?.(data);
        onOpenChange(false);
        resetForm();
      } catch {
        alert('Failed to create project from template');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Blank Project Creation
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const { data } = await api.post('/projects', {
        name: name.trim(),
        description: description.trim(),
        orgId: targetOrgId,
        lead: lead || undefined,
        dueDate,
        color,
        defaultView,
        privacy,
      });

      // Batch-create accepted AI tasks
      const accepted = aiTasks.filter(t => t.accepted);
      if (accepted.length > 0) {
        await Promise.all(accepted.map(t =>
          api.post('/tasks', {
            title: t.title,
            description: t.description || '',
            priority: t.priority || 'medium',
            projectId: data._id,
            orgId: targetOrgId,
            status: 'todo',
          })
        ));
      }

      onProjectCreated?.(data);
      onOpenChange(false);
      resetForm();
    } catch {
      alert('Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (val) => {
    if (!val) resetForm();
    onOpenChange(val);
  };

  const isStep1Valid = !!selectedTemplate || name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden bg-background border-border gap-0">

        {/* Header with step indicator */}
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-1">
            <DialogTitle className="text-xl font-bold text-foreground tracking-tight">
              Create Project
            </DialogTitle>
            {selectedTemplate ? (
               <Badge variant="outline" className="text-xs font-mono tabular-nums">Template</Badge>
            ) : (
               <Badge variant="outline" className="text-xs font-mono tabular-nums">{step}/3</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {step === 1 && 'Give your project a name and identity.'}
            {step === 2 && 'Choose how your team will view work.'}
            {step === 3 && 'Set up your team and timeline.'}
            {step === 4 && 'Let AI suggest tasks for your project.'}
          </p>

          {/* Step progress bar */}
          <div className="flex items-center gap-2 mt-5">
            {STEPS.map((s) => (
              <div key={s.number} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={cn(
                  "h-1.5 w-full rounded-full transition-all duration-500 ease-out",
                  step >= s.number ? "bg-primary" : "bg-muted"
                )} />
                <span className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider transition-colors",
                  step >= s.number ? "text-primary" : "text-muted-foreground/50"
                )}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step content with slide animation */}
        <div className="relative overflow-hidden min-h-[320px]">
          <div
            className="transition-all duration-300 ease-out"
            style={{
              transform: `translateX(-${(step - 1) * 100}%)`,
            }}
          >
            <div className="flex">
              {/* ---- STEP 1: Basics ---- */}
              <div className="w-full flex-shrink-0 p-6 space-y-5">
                
                {templates && templates.length > 0 && (
                  <div className="space-y-2 border-b border-border/40 pb-5">
                    <Label className="text-sm font-semibold">Start from a Template (Optional)</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-1">
                      <button
                        type="button"
                        onClick={() => setSelectedTemplate(null)}
                        className={cn(
                          "p-2.5 text-left rounded-xl text-sm transition-colors border-2 focus:outline-none",
                          !selectedTemplate ? "border-primary bg-primary/5 font-medium" : "border-transparent bg-muted/40 hover:bg-muted/70 text-muted-foreground"
                        )}
                      >
                        Start from Scratch
                      </button>
                      {templates.map(t => (
                        <button
                          key={t._id}
                          type="button"
                          onClick={() => setSelectedTemplate(t._id)}
                          className={cn(
                            "p-2.5 text-left rounded-xl text-sm transition-colors border-2 truncate focus:outline-none",
                            selectedTemplate === t._id ? "border-primary bg-primary/5 font-medium" : "border-transparent bg-muted/40 hover:bg-muted/70 text-muted-foreground"
                          )}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="project-name" className="text-sm font-semibold">
                    Project Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="project-name"
                    placeholder="e.g. Website Redesign, Q2 Marketing"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && isStep1Valid) goNext(); }}
                    className="h-12 text-base bg-card border-border/60 focus-visible:ring-primary/40"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-desc" className="text-sm font-semibold">Description</Label>
                  <Textarea
                    id="project-desc"
                    placeholder="What is this project about?"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="min-h-[80px] bg-card border-border/60 focus-visible:ring-primary/40 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Color</Label>
                  <div className="flex flex-wrap gap-2.5">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none",
                          color === c ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110 shadow-lg" : "hover:shadow-md"
                        )}
                        style={{ backgroundColor: c }}
                      >
                        {color === c && <Check className="w-4 h-4 text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ---- STEP 2: View & Privacy ---- */}
              <div className="w-full flex-shrink-0 p-6 space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Default View</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {VIEWS.map((v) => {
                      const Icon = v.icon;
                      const isActive = defaultView === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setDefaultView(v.id)}
                          className={cn(
                            "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-center group focus:outline-none",
                            isActive
                              ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                              : "border-border/50 bg-card hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm"
                          )}
                        >
                          {isActive && (
                            <div className="absolute top-2 right-2">
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-3 h-3 text-primary-foreground" />
                              </div>
                            </div>
                          )}
                          <div className={cn(
                            "p-2.5 rounded-xl transition-colors",
                            isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:text-foreground"
                          )}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <p className={cn(
                              "text-sm font-semibold",
                              isActive ? "text-primary" : "text-foreground"
                            )}>{v.label}</p>
                            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{v.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Privacy</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'public', label: 'Public', icon: Globe, desc: 'Visible to all org members' },
                      { id: 'private', label: 'Private', icon: Lock, desc: 'Invite-only access' },
                    ].map((p) => {
                      const Icon = p.icon;
                      const isActive = privacy === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPrivacy(p.id)}
                          className={cn(
                            "flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left focus:outline-none",
                            isActive
                              ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                              : "border-border/50 bg-card hover:border-primary/40 hover:bg-muted/30"
                          )}
                        >
                          <div className={cn(
                            "p-2 rounded-lg shrink-0 transition-colors",
                            isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-foreground")}>{p.label}</p>
                            <p className="text-[11px] text-muted-foreground leading-tight">{p.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ---- STEP 3: Team & Timeline ---- */}
              <div className="w-full flex-shrink-0 p-6 space-y-5">
                {/* Project Lead */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Project Lead</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-[120px] overflow-y-auto pr-1">
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
                            "flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left focus:outline-none",
                            isLead
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border/40 bg-card hover:border-primary/30 hover:bg-muted/30"
                          )}
                        >
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={u.avatar} />
                            <AvatarFallback className="text-[10px]">{u.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground flex-1 truncate">{u.name}</span>
                          {isLead && (
                            <Badge variant="secondary" className="text-[10px] h-5 shrink-0">Lead</Badge>
                          )}
                        </button>
                      );
                    })}
                    {members.length === 0 && (
                      <div className="text-center py-4 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                        <UserIcon className="w-5 h-5 mx-auto mb-1 opacity-50" />
                        No members found
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !startDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
                          {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !dueDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
                          {dueDate ? format(dueDate, "MMM d, yyyy") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dueDate} disabled={(d) => startDate && d < startDate} onSelect={setDueDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Invite Members */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> Invite Members
                  </Label>
                  <div className="grid grid-cols-1 gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                    {members.map((m) => {
                      const u = m.user;
                      if (!u) return null;
                      const isSelected = selectedMembers.includes(u._id);
                      return (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => toggleMember(u._id)}
                          className={cn(
                            "flex items-center gap-2.5 p-2 rounded-lg border transition-all text-left focus:outline-none",
                            isSelected
                              ? "border-primary/50 bg-primary/5"
                              : "border-transparent hover:bg-muted/40"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0",
                            isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                          )}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={u.avatar} />
                            <AvatarFallback className="text-[9px]">{u.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground truncate">{u.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ---- STEP 4: AI Tasks ---- */}
              <div className="w-full flex-shrink-0 p-6 space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-primary" /> AI-Suggested Tasks
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateTasks}
                      disabled={isGenerating || !name.trim()}
                      className="gap-1.5 text-xs h-8"
                    >
                      {isGenerating ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                      ) : aiGenerated ? (
                        <><Sparkles className="w-3 h-3" /> Regenerate</>
                      ) : (
                        <><Sparkles className="w-3 h-3" /> Generate Tasks</>
                      )}
                    </Button>
                  </div>

                  {!aiGenerated && !isGenerating && (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/10">
                      <Wand2 className="w-8 h-8 text-muted-foreground/40 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">Let AI break down your project</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Click "Generate Tasks" to get started</p>
                    </div>
                  )}

                  {isGenerating && (
                    <div className="flex flex-col items-center justify-center py-10 px-4">
                      <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">Analyzing your project...</p>
                    </div>
                  )}

                  {aiGenerated && !isGenerating && (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {aiTasks.map((task) => (
                        <div
                          key={task.id}
                          className={cn(
                            "flex items-start gap-2.5 p-3 rounded-xl border transition-all group",
                            task.accepted
                              ? "border-primary/30 bg-primary/5"
                              : "border-border/40 bg-muted/20 opacity-60"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleAiTask(task.id)}
                            className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
                              task.accepted ? "bg-primary border-primary" : "border-muted-foreground/30"
                            )}
                          >
                            {task.accepted && <Check className="w-3 h-3 text-primary-foreground" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <input
                              value={task.title}
                              onChange={(e) => updateAiTaskTitle(task.id, e.target.value)}
                              className="w-full text-sm font-medium bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                            />
                            {task.description && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                            )}
                          </div>
                          <Badge
                            variant="secondary"
                            className={cn("text-[10px] h-5 shrink-0 capitalize", {
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400': task.priority === 'urgent',
                              'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400': task.priority === 'high',
                              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400': task.priority === 'medium',
                              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400': task.priority === 'low',
                            })}
                          >
                            {task.priority}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => removeAiTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {aiTasks.length > 0 && (
                        <p className="text-[11px] text-muted-foreground text-center pt-1">
                          {aiTasks.filter(t => t.accepted).length} of {aiTasks.length} tasks selected
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with navigation */}
        <div className="p-6 pt-0 flex items-center justify-between border-t border-border/40 mt-0 pt-4">
          <div>
            {step > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={goBack} className="gap-1.5 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(false)} className="text-muted-foreground">
              Cancel
            </Button>
            {step < 4 ? (
              <Button
                type="button"
                size="sm"
                onClick={goNext}
                disabled={step === 1 && !isStep1Valid}
                className="gap-1.5 bg-primary text-primary-foreground shadow-sm px-5"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleCreate}
                disabled={isSubmitting || !isStep1Valid}
                className="gap-1.5 bg-primary text-primary-foreground shadow-sm px-5"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" /> Create Project</>
                )}
              </Button>
            )}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
