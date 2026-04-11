import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, format, isToday, isTomorrow } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Check,
  Clock,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import api from '../api/axios';
import { toast } from 'sonner';
import { trackProductEvent } from '../utils/productAnalytics';

const EMPTY_FORM = {
  title: '',
  tag: '',
  priority: 'medium',
  date: new Date(),
  time: '09:00',
};

function buildDueDate(date, time) {
  const dueDate = new Date(date);
  const [hours, mins] = time.split(':').map(Number);
  dueDate.setHours(hours, mins, 0, 0);
  return dueDate;
}

function parseReminderToForm(reminder) {
  const dueDate = reminder?.dueDate ? new Date(reminder.dueDate) : new Date();
  return {
    title: reminder?.title || '',
    tag: reminder?.tag || '',
    priority: reminder?.priority || 'medium',
    date: dueDate,
    time: format(dueDate, 'HH:mm'),
  };
}

function formatTimeDisplay(dateString) {
  const dueDate = new Date(dateString);
  let prefix = format(dueDate, 'MMM d');
  if (isToday(dueDate)) prefix = 'Today';
  if (isTomorrow(dueDate)) prefix = 'Tomorrow';
  return `${prefix}, ${format(dueDate, 'HH:mm')}`;
}

function getPriorityDot(priority) {
  switch (priority) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-orange-500';
    case 'low':
      return 'bg-blue-500';
    default:
      return 'bg-slate-500';
  }
}

function ReminderForm({
  form,
  loading,
  onChange,
  onSubmit,
  submitLabel,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>What is it?</Label>
        <Textarea
          placeholder="e.g. Respond to customer support emails"
          value={form.title}
          onChange={(event) => onChange('title', event.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tag / Category</Label>
          <Input
            placeholder="e.g. Work"
            value={form.tag}
            onChange={(event) => onChange('tag', event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={(value) => onChange('priority', value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.date ? format(form.date, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={form.date} onSelect={(date) => onChange('date', date || new Date())} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Time</Label>
          <Input type="time" value={form.time} onChange={(event) => onChange('time', event.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ReminderRow({ reminder, onComplete, onDelete, onEdit, onSnooze }) {
  return (
    <div className={`rounded-2xl border p-4 ${reminder.completed ? 'border-border/50 bg-muted/10 opacity-80' : 'border-border bg-background'}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onComplete(reminder)}
          className={`mt-0.5 rounded-full border p-1 transition ${reminder.completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border text-muted-foreground hover:border-emerald-500 hover:text-emerald-600'}`}
          aria-label={reminder.completed ? `Reopen ${reminder.title}` : `Complete ${reminder.title}`}
        >
          <Check className="h-3.5 w-3.5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className={`text-sm font-semibold ${reminder.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {reminder.title}
                </p>
                <Badge variant="outline" className="capitalize">{reminder.priority}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTimeDisplay(reminder.dueDate)}
                </span>
                {reminder.tag && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                    {reminder.tag}
                  </Badge>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Reminder options for ${reminder.title}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {!reminder.completed && (
                  <>
                    <DropdownMenuItem onClick={() => onSnooze(reminder, 1)}>Snooze 1 day</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSnooze(reminder, 7)}>Snooze 1 week</DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => onEdit(reminder)}>Edit reminder</DropdownMenuItem>
                {reminder.completed && (
                  <DropdownMenuItem onClick={() => onComplete(reminder)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Mark active
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(reminder)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReminderWidget() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [filter, setFilter] = useState('open');
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchReminders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/reminders?scope=all&limit=50');
      setReminders(Array.isArray(data) ? data : []);
    } catch {
      console.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const previewReminders = useMemo(
    () => reminders.filter((reminder) => !reminder.completed).slice(0, 3),
    [reminders],
  );

  const filteredReminders = useMemo(() => {
    switch (filter) {
      case 'completed':
        return reminders.filter((reminder) => reminder.completed);
      case 'all':
        return reminders;
      case 'open':
      default:
        return reminders.filter((reminder) => !reminder.completed);
    }
  }, [filter, reminders]);

  const resetForm = () => {
    setEditingReminder(null);
    setForm(EMPTY_FORM);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditDialog = (reminder) => {
    setEditingReminder(reminder);
    setForm(parseReminderToForm(reminder));
    setIsFormOpen(true);
  };

  const syncReminder = (nextReminder) => {
    setReminders((current) => {
      const exists = current.some((reminder) => reminder._id === nextReminder._id);
      const next = exists
        ? current.map((reminder) => (reminder._id === nextReminder._id ? nextReminder : reminder))
        : [...current, nextReminder];

      return next.sort((a, b) => {
        if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    });
  };

  const handleCreateOrUpdate = async (event) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      title: form.title,
      tag: form.tag,
      priority: form.priority,
      dueDate: buildDueDate(form.date, form.time).toISOString(),
    };

    try {
      if (editingReminder) {
        const { data } = await api.put(`/reminders/${editingReminder._id}`, payload);
        syncReminder(data);
        trackProductEvent('reminder_updated', {
          organizationId: localStorage.getItem('activeOrgId'),
          metadata: { priority: payload.priority, tag: payload.tag || 'General' },
        });
        toast.success('Reminder updated');
      } else {
        const { data } = await api.post('/reminders', payload);
        syncReminder(data);
        trackProductEvent('reminder_created', {
          organizationId: localStorage.getItem('activeOrgId'),
          metadata: { priority: payload.priority, tag: payload.tag || 'General' },
        });
        toast.success('Reminder set');
      }
      setIsFormOpen(false);
      resetForm();
    } catch {
      toast.error('Failed to save reminder');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteToggle = async (reminder) => {
    const nextCompleted = !reminder.completed;
    try {
      const { data } = await api.put(`/reminders/${reminder._id}`, { completed: nextCompleted });
      syncReminder(data);
      trackProductEvent(nextCompleted ? 'reminder_completed' : 'reminder_reopened', {
        organizationId: localStorage.getItem('activeOrgId'),
        metadata: { priority: reminder.priority },
      });
      toast.success(nextCompleted ? 'Reminder completed' : 'Reminder restored');
    } catch {
      toast.error('Reminder update failed');
    }
  };

  const handleDelete = async (reminder) => {
    try {
      await api.delete(`/reminders/${reminder._id}`);
      setReminders((current) => current.filter((item) => item._id !== reminder._id));
      toast.success('Reminder deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleSnooze = async (reminder, days) => {
    const nextDueDate = addDays(new Date(reminder.dueDate), days);
    try {
      const { data } = await api.put(`/reminders/${reminder._id}`, { dueDate: nextDueDate.toISOString() });
      syncReminder(data);
      trackProductEvent('reminder_snoozed', {
        organizationId: localStorage.getItem('activeOrgId'),
        metadata: { days, priority: reminder.priority },
      });
      toast.success(days === 1 ? 'Snoozed until tomorrow' : 'Snoozed for one week');
    } catch {
      toast.error('Snooze failed');
    }
  };

  return (
    <>
      <Card className="border-border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-300 rounded-xl h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Reminders</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsSheetOpen(true)}>
              View All
            </Button>
            <Button variant="outline" size="sm" onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Set Reminder
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-4 pt-2">
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
          ) : previewReminders.length === 0 ? (
            <div className="flex-1 text-center py-10 bg-muted/20 rounded-xl border border-dashed border-border/60">
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No upcoming reminders</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
              {previewReminders.map((reminder) => (
                <div key={reminder._id} className="min-w-[220px] max-w-[220px] p-4 bg-background border border-border hover:border-primary/30 rounded-xl shadow-sm flex flex-col gap-3 snap-start transition-colors group">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getPriorityDot(reminder.priority)}`} />
                      <span className="text-sm font-semibold capitalize text-foreground">{reminder.priority}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={`Reminder options for ${reminder.title}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleSnooze(reminder, 1)}>Snooze 1 day</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSnooze(reminder, 7)}>Snooze 1 week</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditDialog(reminder)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCompleteToggle(reminder)}>Complete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{formatTimeDisplay(reminder.dueDate)}</p>
                    <p className="text-sm text-foreground font-medium line-clamp-3 leading-snug">
                      {reminder.title}
                    </p>
                  </div>

                  <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                    {reminder.tag && (
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-muted text-muted-foreground border-border">
                        {reminder.tag}
                      </Badge>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 rounded-full px-2 text-[11px]" onClick={() => handleCompleteToggle(reminder)}>
                      <Check className="h-3.5 w-3.5" />
                      Done
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReminder ? 'Edit Reminder' : 'Set New Reminder'}</DialogTitle>
            <DialogDescription>
              Capture a follow-up or commitment and keep it visible on the dashboard.
            </DialogDescription>
          </DialogHeader>
          <ReminderForm
            form={form}
            loading={saving}
            onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
            onSubmit={handleCreateOrUpdate}
            submitLabel={editingReminder ? 'Save Changes' : 'Set Reminder'}
          />
        </DialogContent>
      </Dialog>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Reminder Inbox</SheetTitle>
            <SheetDescription>
              Manage all reminders, snooze follow-ups, and clear completed items.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex items-center gap-2">
            <Button variant={filter === 'open' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('open')}>
              Open
            </Button>
            <Button variant={filter === 'completed' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('completed')}>
              Completed
            </Button>
            <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
              All
            </Button>
          </div>

          <ScrollArea className="mt-4 h-[calc(100vh-13rem)] pr-4">
            <div className="space-y-3 pb-6">
              {filteredReminders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
                  No reminders in this view.
                </div>
              ) : (
                filteredReminders.map((reminder) => (
                  <ReminderRow
                    key={reminder._id}
                    reminder={reminder}
                    onComplete={handleCompleteToggle}
                    onDelete={handleDelete}
                    onEdit={openEditDialog}
                    onSnooze={handleSnooze}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
