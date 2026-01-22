import { useState, useEffect } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import { Plus, Check, Clock, Calendar as CalendarIcon, Tag, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import api from '../api/axios';
import { toast } from 'sonner';

export function ReminderWidget() {
    const [reminders, setReminders] = useState([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form State
    const [title, setTitle] = useState('');
    const [tag, setTag] = useState('');
    const [priority, setPriority] = useState('medium');
    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState('09:00');

    useEffect(() => {
        fetchReminders();
    }, []);

    const fetchReminders = async () => {
        try {
            const { data } = await api.get('/reminders');
            setReminders(data);
        } catch (e) { console.error("Failed to load reminders"); }
        finally { setLoading(false); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            // Combine date & time
            const dueDate = new Date(date);
            const [hours, mins] = time.split(':').map(Number);
            dueDate.setHours(hours, mins);

            const { data } = await api.post('/reminders', {
                title, tag, priority, dueDate
            });
            setReminders(prev => [...prev, data].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
            setIsCreateOpen(false);
            resetForm();
            toast.success("Reminder set!");
        } catch (e) { toast.error("Failed to create reminder"); }
    };

    const handleComplete = async (id) => {
        try {
            await api.put(`/reminders/${id}`, { completed: true });
            setReminders(prev => prev.filter(r => r._id !== id));
            toast.success("Reminder completed");
        } catch (e) { toast.error("Sync failed"); }
    };

    const resetForm = () => {
        setTitle('');
        setTag('');
        setPriority('medium');
        setDate(new Date());
        setTime('09:00');
    };

    const formatTimeDisplay = (dateString) => {
        const d = new Date(dateString);
        let prefix = format(d, 'MMM d');
        if (isToday(d)) prefix = 'Today';
        if (isTomorrow(d)) prefix = 'Tomorrow';
        return `${prefix}, ${format(d, 'HH:mm')}`;
    };

    const getPriorityColor = (p) => {
        switch (p) {
            case 'high': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'medium': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
        }
    };

    const getPriorityDot = (p) => {
        switch (p) {
            case 'high': return 'bg-red-500';
            case 'medium': return 'bg-orange-500';
            case 'low': return 'bg-blue-500';
            default: return 'bg-slate-500';
        }
    };

    return (
        <Card className="border-border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-300 rounded-xl h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold">Reminder</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Set Reminder
                </Button>
            </CardHeader>
            <CardContent className="flex-1 p-4 pt-2">
                {loading ? <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div> : (
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                        {reminders.length === 0 ? (
                            <div className="flex-1 text-center py-10 bg-muted/20 rounded-xl border border-dashed border-border/60">
                                <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                                <p className="text-sm text-muted-foreground">No upcoming reminders</p>
                            </div>
                        ) : (
                            reminders.map(rem => (
                                <div key={rem._id} className="min-w-[220px] max-w-[220px] p-4 bg-background border border-border hover:border-primary/30 rounded-xl shadow-sm flex flex-col gap-3 snap-start transition-colors group">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${getPriorityDot(rem.priority)}`} />
                                            <span className="text-sm font-semibold capitalize text-foreground">{rem.priority}</span>
                                        </div>
                                        <button onClick={() => handleComplete(rem._id)} className="text-muted-foreground hover:text-green-500 transition-colors">
                                            <Check className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">{formatTimeDisplay(rem.dueDate)}</p>
                                        <p className="text-sm text-foreground font-medium line-clamp-3 leading-snug">
                                            {rem.title}
                                        </p>
                                    </div>

                                    <div className="mt-auto pt-2">
                                        {rem.tag && <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-muted text-muted-foreground border-border">{rem.tag}</Badge>}
                                    </div>
                                </div>
                            ))
                        )}
                        {/* "See more" placeholder if needed, functionality not critical for MVP */}
                    </div>
                )}
                {reminders.length > 3 && (
                    <div className="text-right mt-2">
                        <button className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-end gap-1 w-full">
                            Show other {reminders.length - 3} reminders <span className="text-lg leading-none">→</span>
                        </button>
                    </div>
                )}
            </CardContent>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set New Reminder</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>What is it?</Label>
                            <Textarea
                                placeholder="e.g. Respond to customer support emails"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tag / Category</Label>
                                <Input placeholder="e.g. Work" value={tag} onChange={e => setTag(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <Select value={priority} onValueChange={setPriority}>
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
                                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Time</Label>
                                <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit">Set Reminder</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
