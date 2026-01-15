import { useEffect, useState } from 'react';
import { Archive, RefreshCcw, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import api from '../api/axios';
import { toast } from 'sonner';

export function ArchivedTasksModal({ isOpen, onClose, projectId, onRestore }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchArchived();
  }, [isOpen]);

  const fetchArchived = async () => {
    setLoading(true);
    try {
        // Fetch ONLY archived tasks
        const { data } = await api.get(`/tasks/project/${projectId}?archived=true`);
        setTasks(data);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const handleRestore = async (taskId) => {
      try {
          await api.put(`/tasks/${taskId}/archive`);
          setTasks(prev => prev.filter(t => t._id !== taskId));
          toast.success("Task restored to board");
          onRestore(); // Trigger parent refresh
      } catch (e) { toast.error("Failed to restore"); }
  };

  const handleDelete = async (taskId) => {
      if(!confirm("Permanently delete?")) return;
      try {
          await api.delete(`/tasks/${taskId}`);
          setTasks(prev => prev.filter(t => t._id !== taskId));
          toast.success("Task deleted permanently");
      } catch (e) { toast.error("Failed to delete"); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-muted-foreground" /> Archived Tasks
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px] mt-4 pr-4">
            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                    <p className="text-sm text-muted-foreground">No archived tasks found.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {tasks.map(task => (
                        <div key={task._id} className="flex items-center justify-between p-3 bg-card border rounded-lg group hover:border-primary/50 transition-colors">
                            <div className="flex flex-col gap-1">
                                <span className="font-medium text-sm text-foreground line-through decoration-muted-foreground/50">{task.title}</span>
                                <div className="flex gap-2">
                                    <Badge variant="outline" className="text-[10px] h-5">{task.status}</Badge>
                                    <span className="text-[10px] text-muted-foreground pt-0.5">Updated {new Date(task.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="sm" variant="outline" onClick={() => handleRestore(task._id)} title="Restore">
                                    <RefreshCcw className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleDelete(task._id)} title="Delete Forever">
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}