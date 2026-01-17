import { useState } from 'react';
import { Repeat, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import api from '../api/axios';

const RECURRENCE_PATTERNS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every 2 weeks' },
    { value: 'monthly', label: 'Monthly' },
];

export function RecurrencePicker({ taskId, recurrence, onRecurrenceChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pattern, setPattern] = useState(recurrence?.pattern || 'weekly');
    const [enabled, setEnabled] = useState(recurrence?.enabled || false);

    const handleSave = async () => {
        setLoading(true);
        try {
            if (enabled) {
                const { data } = await api.put(`/tasks/${taskId}/recurrence`, {
                    enabled: true,
                    pattern,
                    interval: 1,
                });
                onRecurrenceChange(data.recurrence);
                toast.success('Recurrence set');
            } else {
                const { data } = await api.delete(`/tasks/${taskId}/recurrence`);
                onRecurrenceChange(data.recurrence);
                toast.success('Recurrence removed');
            }
            setIsOpen(false);
        } catch (error) {
            toast.error('Failed to update recurrence');
        } finally {
            setLoading(false);
        }
    };

    const getRecurrenceLabel = () => {
        if (!recurrence?.enabled) return null;
        const found = RECURRENCE_PATTERNS.find(p => p.value === recurrence.pattern);
        return found?.label || 'Recurring';
    };

    return (
        <div className="flex items-center gap-2">
            {recurrence?.enabled ? (
                <Badge
                    variant="outline"
                    className="text-[10px] font-medium px-2 py-0.5 gap-1 bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950 dark:border-violet-800 dark:text-violet-300"
                >
                    <Repeat className="h-3 w-3" />
                    {getRecurrenceLabel()}
                </Badge>
            ) : (
                <span className="text-xs text-muted-foreground">Not recurring</span>
            )}

            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                        {recurrence?.enabled ? <X className="h-3 w-3" /> : <Repeat className="h-3 w-3" />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4" align="start">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="recurrence-toggle" className="text-sm font-medium">
                                Enable Recurrence
                            </Label>
                            <Switch
                                id="recurrence-toggle"
                                checked={enabled}
                                onCheckedChange={setEnabled}
                            />
                        </div>

                        {enabled && (
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Repeat</Label>
                                <Select value={pattern} onValueChange={setPattern}>
                                    <SelectTrigger className="h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {RECURRENCE_PATTERNS.map(p => (
                                            <SelectItem key={p.value} value={p.value}>
                                                {p.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground">
                                    A new task will be created when this one is completed.
                                </p>
                            </div>
                        )}

                        <Button
                            size="sm"
                            className="w-full h-8"
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
