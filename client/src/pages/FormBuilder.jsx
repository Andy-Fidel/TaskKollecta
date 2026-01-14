import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, Type, Calendar, List, AlignLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '../api/axios';
import { toast } from 'sonner';

export default function FormBuilder() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('New Request Form');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState([
    { id: 'f1', type: 'text', label: 'Request Title', required: true }
  ]);

  const addField = (type) => {
    setFields([...fields, {
      id: `f${Date.now()}`,
      type,
      label: 'New Field',
      required: false,
      options: []
    }]);
  };

  const updateField = (id, key, value) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const removeField = (id) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleSave = async () => {
    try {
      await api.post('/forms', {
        title,
        description,
        projectId,
        fields
      });
      toast.success("Form created successfully");
      navigate(`/project/${projectId}`); // Go back to project
    } catch (error) {
      toast.error("Failed to save form");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold">Form Builder</h1>
           <p className="text-muted-foreground">Design an intake form for this project.</p>
        </div>
        <Button onClick={handleSave} className="bg-slate-900"><Save className="w-4 h-4 mr-2" /> Save Form</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left: Canvas */}
        <div className="md:col-span-2 space-y-6">
           <Card className="border-t-4 border-t-blue-600 shadow-sm">
              <CardHeader>
                 <Input 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className="text-2xl font-bold border-none px-0 focus-visible:ring-0" 
                    placeholder="Form Title"
                 />
                 <Input 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    className="text-muted-foreground border-none px-0 focus-visible:ring-0" 
                    placeholder="Form Description (optional)"
                 />
              </CardHeader>
              <CardContent className="space-y-4">
                 {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-xl bg-slate-50/50 group relative hover:border-blue-300 transition-colors">
                        <div className="flex justify-between mb-2">
                             <Input 
                                value={field.label} 
                                onChange={(e) => updateField(field.id, 'label', e.target.value)}
                                className="font-semibold bg-transparent border-none h-auto p-0 focus-visible:ring-0 w-2/3"
                             />
                             <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground uppercase font-bold">{field.type}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={() => removeField(field.id)}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                             </div>
                        </div>
                        
                        {/* Preview of Input */}
                        {field.type === 'text' && <Input disabled placeholder="Short answer text" />}
                        {field.type === 'textarea' && <div className="h-20 border rounded-md bg-white disabled"></div>}
                        {field.type === 'date' && <div className="h-10 border rounded-md bg-white flex items-center px-3 text-muted-foreground"><Calendar className="w-4 h-4 mr-2"/> Date</div>}
                        {field.type === 'select' && (
                             <div className="space-y-2">
                                <Input disabled placeholder="Dropdown options" />
                                <Input 
                                    placeholder="Add options separated by comma (e.g. Bug, Feature, Support)" 
                                    className="text-xs"
                                    onChange={(e) => updateField(field.id, 'options', e.target.value.split(',').map(s => s.trim()))}
                                />
                             </div>
                        )}

                        <div className="mt-3 flex items-center gap-2">
                            <Switch 
                                checked={field.required} 
                                onCheckedChange={(c) => updateField(field.id, 'required', c)}
                            />
                            <Label className="text-xs text-muted-foreground">Required field</Label>
                        </div>
                    </div>
                 ))}
                 
                 {fields.length === 0 && <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">Add fields from the right panel</div>}
              </CardContent>
           </Card>
        </div>

        {/* Right: Tools */}
        <div className="space-y-4">
            <Card>
                <CardHeader><CardTitle className="text-sm">Add Fields</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 gap-2">
                    <Button variant="outline" className="justify-start" onClick={() => addField('text')}>
                        <Type className="w-4 h-4 mr-2 text-slate-500" /> Short Text
                    </Button>
                    <Button variant="outline" className="justify-start" onClick={() => addField('textarea')}>
                        <AlignLeft className="w-4 h-4 mr-2 text-slate-500" /> Long Text
                    </Button>
                    <Button variant="outline" className="justify-start" onClick={() => addField('select')}>
                        <List className="w-4 h-4 mr-2 text-slate-500" /> Dropdown
                    </Button>
                    <Button variant="outline" className="justify-start" onClick={() => addField('date')}>
                        <Calendar className="w-4 h-4 mr-2 text-slate-500" /> Date
                    </Button>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}