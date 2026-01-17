import { useState } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import api from '../api/axios';

// Preset colors for tags
const TAG_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#6366f1', // indigo (default)
];

export function TagPicker({ taskId, tags = [], onTagsChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [selectedColor, setSelectedColor] = useState('#6366f1');

    const handleAddTag = async (e) => {
        e.preventDefault();
        if (!newTagName.trim()) return;

        try {
            const { data } = await api.post(`/tasks/${taskId}/tags`, {
                name: newTagName.trim(),
                color: selectedColor
            });
            onTagsChange(data.tags);
            setNewTagName('');
            setIsOpen(false);
            toast.success('Tag added');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add tag');
        }
    };

    const handleRemoveTag = async (tagId) => {
        try {
            const { data } = await api.delete(`/tasks/${taskId}/tags/${tagId}`);
            onTagsChange(data.tags);
            toast.success('Tag removed');
        } catch (error) {
            toast.error('Failed to remove tag');
        }
    };

    return (
        <div className="space-y-2">
            {/* Tags Display */}
            <div className="flex flex-wrap gap-1.5">
                {tags.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No tags</span>
                ) : (
                    tags.map((tag) => (
                        <Badge
                            key={tag._id}
                            variant="outline"
                            className="text-[10px] font-medium px-2 py-0.5 gap-1 group"
                            style={{
                                borderColor: tag.color,
                                backgroundColor: `${tag.color}15`,
                                color: tag.color
                            }}
                        >
                            {tag.name}
                            <button
                                onClick={() => handleRemoveTag(tag._id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hover:text-red-500"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))
                )}

                {/* Add Tag Button */}
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground">
                            <Plus className="h-3 w-3" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" align="start">
                        <form onSubmit={handleAddTag} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Add Tag</span>
                            </div>

                            <Input
                                placeholder="Tag name..."
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                            />

                            {/* Color Picker */}
                            <div className="flex flex-wrap gap-1.5">
                                {TAG_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setSelectedColor(color)}
                                        className={`w-5 h-5 rounded-full transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-background' : ''
                                            }`}
                                        style={{ backgroundColor: color, ringColor: color }}
                                    />
                                ))}
                            </div>

                            <Button type="submit" size="sm" className="w-full h-7" disabled={!newTagName.trim()}>
                                Add Tag
                            </Button>
                        </form>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
