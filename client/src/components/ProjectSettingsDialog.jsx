import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Save, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import api from '../api/axios';
import { toast } from 'sonner';

const COLORS = [
  '#0f172a', // Slate (Default)
  '#dc2626', // Red
  '#ea580c', // Orange
  '#d97706', // Amber
  '#16a34a', // Green
  '#0284c7', // Sky
  '#4f46e5', // Indigo
  '#9333ea', // Purple
  '#db2777', // Pink
];

export function ProjectSettingsDialog({ isOpen, onClose, project, onUpdate }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#0f172a');
  const [isArchived, setIsArchived] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setColor(project.color || '#0f172a');
      setIsArchived(project.status === 'archived');
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
        status: isArchived ? 'archived' : 'active'
      });
      onUpdate(data);
      toast.success('Project updated successfully');
      onClose();
    } catch (error) {
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
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>Manage settings for {project?.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the project..."
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-3">
            <Label>Project Color</Label>
            <div className="flex gap-3 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ring-offset-background ${color === c
                      ? 'ring-2 ring-offset-2 ring-primary scale-110'
                      : 'hover:scale-105'
                    }`}
                  style={{ backgroundColor: c }}
                  title={c}
                >
                  {color === c && <Check className="w-4 h-4 text-white mx-auto" />}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Preview: <span className="inline-block w-3 h-3 rounded-full align-middle mr-1" style={{ backgroundColor: color }} /> {name || 'Project Name'}
            </p>
          </div>

          <Separator />

          {/* Archive */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Archive Project</Label>
              <p className="text-xs text-muted-foreground">Hide this project from the dashboard.</p>
            </div>
            <Switch checked={isArchived} onCheckedChange={setIsArchived} />
          </div>

          <Separator />

          {/* Danger Zone */}
          <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg flex items-center justify-between">
            <div className="text-destructive">
              <h4 className="font-bold text-sm">Delete Project</h4>
              <p className="text-xs opacity-80">Permanently delete this project and its tasks.</p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4" />
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}