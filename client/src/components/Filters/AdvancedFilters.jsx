import { useState, useMemo } from 'react';
import {
    Filter, X, Save, ChevronDown, Calendar as CalendarIcon,
    User, Tag, CheckSquare, AlertTriangle, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import api from '../../api/axios';

// Constants
const STATUSES = [
    { id: 'todo', label: 'To Do', color: '#6b7280' },
    { id: 'in-progress', label: 'In Progress', color: '#3b82f6' },
    { id: 'review', label: 'Review', color: '#a855f7' },
    { id: 'done', label: 'Done', color: '#22c55e' },
];

const PRIORITIES = [
    { id: 'low', label: 'Low', color: '#6b7280' },
    { id: 'medium', label: 'Medium', color: '#eab308' },
    { id: 'high', label: 'High', color: '#f97316' },
    { id: 'urgent', label: 'Urgent', color: '#ef4444' },
];

export function AdvancedFilters({
    projectId,
    filters,
    onFiltersChange,
    members = [],
    availableTags = [],
    presets = [],
    onPresetsChange
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [dateFromOpen, setDateFromOpen] = useState(false);
    const [dateToOpen, setDateToOpen] = useState(false);

    // Calculate active filter count
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.statuses?.length) count += filters.statuses.length;
        if (filters.priorities?.length) count += filters.priorities.length;
        if (filters.assignees?.length) count += filters.assignees.length;
        if (filters.tags?.length) count += filters.tags.length;
        if (filters.dateFrom) count++;
        if (filters.dateTo) count++;
        return count;
    }, [filters]);

    // Toggle handlers
    const toggleStatus = (statusId) => {
        const current = filters.statuses || [];
        const updated = current.includes(statusId)
            ? current.filter(s => s !== statusId)
            : [...current, statusId];
        onFiltersChange({ ...filters, statuses: updated });
    };

    const togglePriority = (priorityId) => {
        const current = filters.priorities || [];
        const updated = current.includes(priorityId)
            ? current.filter(p => p !== priorityId)
            : [...current, priorityId];
        onFiltersChange({ ...filters, priorities: updated });
    };

    const toggleAssignee = (assigneeId) => {
        const current = filters.assignees || [];
        const updated = current.includes(assigneeId)
            ? current.filter(a => a !== assigneeId)
            : [...current, assigneeId];
        onFiltersChange({ ...filters, assignees: updated });
    };

    const toggleTag = (tagName) => {
        const current = filters.tags || [];
        const updated = current.includes(tagName)
            ? current.filter(t => t !== tagName)
            : [...current, tagName];
        onFiltersChange({ ...filters, tags: updated });
    };

    const setDateFrom = (date) => {
        onFiltersChange({ ...filters, dateFrom: date });
        setDateFromOpen(false);
    };

    const setDateTo = (date) => {
        onFiltersChange({ ...filters, dateTo: date });
        setDateToOpen(false);
    };

    const clearAllFilters = () => {
        onFiltersChange({
            statuses: [],
            priorities: [],
            assignees: [],
            tags: [],
            dateFrom: null,
            dateTo: null
        });
    };

    // Preset handlers
    const savePreset = async () => {
        if (!presetName.trim()) return;
        try {
            const { data } = await api.post('/filter-presets', {
                name: presetName.trim(),
                projectId,
                filters
            });
            onPresetsChange([...presets, data]);
            setPresetName('');
            setIsSaveDialogOpen(false);
            toast.success('Filter preset saved');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save preset');
        }
    };

    const loadPreset = (preset) => {
        onFiltersChange({
            statuses: preset.filters.statuses || [],
            priorities: preset.filters.priorities || [],
            assignees: preset.filters.assignees || [],
            tags: preset.filters.tags || [],
            dateFrom: preset.filters.dateFrom ? new Date(preset.filters.dateFrom) : null,
            dateTo: preset.filters.dateTo ? new Date(preset.filters.dateTo) : null
        });
        setIsOpen(false);
        toast.success(`Loaded "${preset.name}"`);
    };

    const deletePreset = async (presetId, e) => {
        e.stopPropagation();
        try {
            await api.delete(`/filter-presets/${presetId}`);
            onPresetsChange(presets.filter(p => p._id !== presetId));
            toast.success('Preset deleted');
        } catch (error) {
            toast.error('Failed to delete preset');
        }
    };

    return (
        <>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 gap-2 ${activeFilterCount > 0 ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        Filters
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs font-medium">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                    <div className="p-4 pb-2">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">Filters</h4>
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => setIsSaveDialogOpen(true)}
                                    disabled={activeFilterCount === 0}
                                >
                                    <Save className="w-3 h-3 mr-1" />
                                    Save
                                </Button>
                                {activeFilterCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs text-muted-foreground"
                                        onClick={clearAllFilters}
                                    >
                                        <X className="w-3 h-3 mr-1" />
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <ScrollArea className="max-h-[400px]">
                        <div className="p-4 pt-0 space-y-4">

                            {/* Saved Presets */}
                            {presets.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                                        Saved Presets
                                    </Label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {presets.map(preset => (
                                            <Badge
                                                key={preset._id}
                                                variant="outline"
                                                className="cursor-pointer hover:bg-accent flex items-center gap-1 group pr-1.5"
                                                onClick={() => loadPreset(preset)}
                                            >
                                                {preset.name}
                                                <button
                                                    onClick={(e) => deletePreset(preset._id, e)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hover:text-destructive"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                    <Separator />
                                </div>
                            )}

                            {/* Status Filter */}
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                    <CheckSquare className="w-3 h-3" />
                                    Status
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {STATUSES.map(status => (
                                        <label
                                            key={status.id}
                                            className="flex items-center gap-2 cursor-pointer p-1.5 rounded-md hover:bg-accent"
                                        >
                                            <Checkbox
                                                checked={filters.statuses?.includes(status.id)}
                                                onCheckedChange={() => toggleStatus(status.id)}
                                            />
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: status.color }}
                                            />
                                            <span className="text-sm">{status.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Priority Filter */}
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                    <AlertTriangle className="w-3 h-3" />
                                    Priority
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {PRIORITIES.map(priority => (
                                        <label
                                            key={priority.id}
                                            className="flex items-center gap-2 cursor-pointer p-1.5 rounded-md hover:bg-accent"
                                        >
                                            <Checkbox
                                                checked={filters.priorities?.includes(priority.id)}
                                                onCheckedChange={() => togglePriority(priority.id)}
                                            />
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: priority.color }}
                                            />
                                            <span className="text-sm">{priority.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Assignee Filter */}
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                    <User className="w-3 h-3" />
                                    Assignee
                                </Label>
                                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                                    {members.map(member => (
                                        <label
                                            key={member.user._id}
                                            className="flex items-center gap-2 cursor-pointer p-1.5 rounded-md hover:bg-accent"
                                        >
                                            <Checkbox
                                                checked={filters.assignees?.includes(member.user._id)}
                                                onCheckedChange={() => toggleAssignee(member.user._id)}
                                            />
                                            <Avatar className="w-5 h-5">
                                                <AvatarImage src={member.user.avatar || `https://ui-avatars.com/api/?name=${member.user.name}&background=random`} />
                                                <AvatarFallback className="text-[8px]">
                                                    {member.user.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm truncate">{member.user.name}</span>
                                        </label>
                                    ))}
                                    {members.length === 0 && (
                                        <span className="text-xs text-muted-foreground col-span-2">No members</span>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Tags Filter */}
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                    <Tag className="w-3 h-3" />
                                    Tags
                                </Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {availableTags.map(tag => (
                                        <Badge
                                            key={tag.name}
                                            variant="outline"
                                            className={`cursor-pointer transition-all ${filters.tags?.includes(tag.name)
                                                    ? 'ring-2 ring-offset-1 ring-offset-background'
                                                    : 'opacity-70 hover:opacity-100'
                                                }`}
                                            style={{
                                                borderColor: tag.color,
                                                backgroundColor: filters.tags?.includes(tag.name) ? `${tag.color}25` : 'transparent',
                                                color: tag.color,
                                                ringColor: tag.color
                                            }}
                                            onClick={() => toggleTag(tag.name)}
                                        >
                                            {tag.name}
                                        </Badge>
                                    ))}
                                    {availableTags.length === 0 && (
                                        <span className="text-xs text-muted-foreground">No tags available</span>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Date Range Filter */}
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                    <CalendarIcon className="w-3 h-3" />
                                    Due Date Range
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="h-8 justify-start text-xs font-normal">
                                                <CalendarIcon className="mr-1.5 h-3 w-3" />
                                                {filters.dateFrom
                                                    ? filters.dateFrom.toLocaleDateString()
                                                    : 'From date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={filters.dateFrom}
                                                onSelect={setDateFrom}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>

                                    <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="h-8 justify-start text-xs font-normal">
                                                <CalendarIcon className="mr-1.5 h-3 w-3" />
                                                {filters.dateTo
                                                    ? filters.dateTo.toLocaleDateString()
                                                    : 'To date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={filters.dateTo}
                                                onSelect={setDateTo}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                {(filters.dateFrom || filters.dateTo) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs text-muted-foreground"
                                        onClick={() => onFiltersChange({ ...filters, dateFrom: null, dateTo: null })}
                                    >
                                        Clear dates
                                    </Button>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                </PopoverContent>
            </Popover>

            {/* Save Preset Dialog */}
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                <DialogContent className="sm:max-w-[350px]">
                    <DialogHeader>
                        <DialogTitle>Save Filter Preset</DialogTitle>
                        <DialogDescription>
                            Save your current filter configuration to quickly apply it later.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="preset-name">Preset Name</Label>
                        <Input
                            id="preset-name"
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            placeholder="e.g., My urgent tasks"
                            className="mt-1.5"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSaveDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={savePreset} disabled={!presetName.trim()}>
                            Save Preset
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

// Helper function to apply filters to tasks
export function applyFilters(tasks, filters) {
    return tasks.filter(task => {
        // Status filter
        if (filters.statuses?.length > 0 && !filters.statuses.includes(task.status)) {
            return false;
        }

        // Priority filter
        if (filters.priorities?.length > 0 && !filters.priorities.includes(task.priority)) {
            return false;
        }

        // Assignee filter
        if (filters.assignees?.length > 0) {
            const taskAssigneeId = task.assignee?._id || task.assignee;
            if (!filters.assignees.includes(taskAssigneeId)) {
                return false;
            }
        }

        // Tags filter
        if (filters.tags?.length > 0) {
            const taskTagNames = task.tags?.map(t => t.name) || [];
            const hasMatchingTag = filters.tags.some(tagName => taskTagNames.includes(tagName));
            if (!hasMatchingTag) {
                return false;
            }
        }

        // Date range filter
        if (filters.dateFrom || filters.dateTo) {
            if (!task.dueDate) return false;
            const dueDate = new Date(task.dueDate);

            if (filters.dateFrom && dueDate < filters.dateFrom) {
                return false;
            }
            if (filters.dateTo) {
                const endOfDay = new Date(filters.dateTo);
                endOfDay.setHours(23, 59, 59, 999);
                if (dueDate > endOfDay) {
                    return false;
                }
            }
        }

        return true;
    });
}
