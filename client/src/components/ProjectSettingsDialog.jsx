import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Archive, Save, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [color, setColor] = useState('#0f172a');
  const [isArchived, setIsArchived] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setColor(project.color || '#0f172a');
      setIsArchived(project.status === 'archived');
    }
  }, [project]);

  const handleSave = async () => {
    try {
      const { data } = await api.put(`/projects/${project._id}`, {
        name,
        color,
        status: isArchived ? 'archived' : 'active'
      });
      onUpdate(data);
      toast.success('Project updated');
      onClose();
    } catch (error) {
      toast.error('Failed to update project');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/projects/${project._id}`);
      toast.success('Project deleted');
      navigate('/dashboard'); // Go home
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
            <Label>Project Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Color Picker */}
          <div className="space-y-3">
            <Label>Project Color</Label>
            <div className="flex gap-3 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Archive */}
          <div className="flex items-center justify-between">
             <div className="space-y-0.5">
                <Label className="text-base">Archive Project</Label>
                <p className="text-xs text-slate-500">Hide this project from the dashboard.</p>
             </div>
             <Switch checked={isArchived} onCheckedChange={setIsArchived} />
          </div>

          <Separator />

          {/* Danger Zone */}
          <div className="p-4 border border-red-100 bg-red-50 rounded-lg flex items-center justify-between">
             <div className="text-red-700">
                <h4 className="font-bold text-sm">Delete Project</h4>
                <p className="text-xs">Permanently delete this project and its tasks.</p>
             </div>
             
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete <strong>{project?.name}</strong> and all {project?.taskCount || ''} tasks associated with it.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600">Delete Project</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
             </AlertDialog>
          </div>

        </div>

        <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} className="bg-slate-900"><Save className="w-4 h-4 mr-2" /> Save Changes</Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}