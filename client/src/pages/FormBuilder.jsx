import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, Trash2, Save, Type, Calendar, List, AlignLeft, 
  Settings, Eye, Edit3, GripVertical, CheckSquare, Settings2, GripHorizontal, ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { toast } from 'sonner';

// --- SORTABLE FIELD COMPONENT ---
function SortableField({ field, isActive, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div 
        className={`
          flex gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer
          ${isDragging ? 'opacity-90 shadow-2xl scale-[1.02] ring-2 ring-primary/20 rotate-1 border-primary/30 bg-card' : 'bg-card shadow-sm hover:shadow-md hover:border-border'}
          ${isActive && !isDragging ? 'ring-1 ring-primary border-primary bg-primary/5' : 'border-border'}
        `}
        onClick={() => onSelect(field.id)}
      >
        {/* Drag Handle */}
        <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground transition-colors">
          <GripVertical className="w-5 h-5" />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              {field.label}
              {field.required && <span className="text-red-500 text-xs">*</span>}
            </h3>
            <BadgeType type={field.type} />
          </div>

          {/* Builder Canvas Preview of Field */}
          <div className="opacity-70 pointer-events-none">
            {field.type === 'text' && <Input className="h-9 bg-muted/50" placeholder="Short answer text" />}
            {field.type === 'textarea' && <div className="h-20 border rounded-md bg-muted/50 w-full" />}
            {field.type === 'date' && <div className="h-9 border rounded-md bg-muted/50 flex items-center px-3 text-sm"><Calendar className="w-4 h-4 mr-2"/> mm/dd/yyyy</div>}
            {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
               <div className="space-y-1.5 pl-1">
                 {field.options?.length > 0 ? (
                   field.options.map((opt, i) => (
                     <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                       <div className={`w-3 h-3 border border-muted-foreground/50 ${field.type === 'radio' ? 'rounded-full' : 'rounded-sm'}`} />
                       {opt}
                     </div>
                   ))
                 ) : (
                   <span className="text-xs text-muted-foreground italic">No options configured</span>
                 )}
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const BadgeType = ({ type }) => {
  const types = {
    text: { icon: Type, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50' },
    textarea: { icon: AlignLeft, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50' },
    select: { icon: List, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' },
    date: { icon: Calendar, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' },
    radio: { icon: CheckSquare, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50' },
    checkbox: { icon: CheckSquare, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/50' }
  };
  const config = types[type] || types.text;
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
      <Icon className="w-3 h-3" /> {type}
    </div>
  );
};


// --- MAIN FORM BUILDER ---
export default function FormBuilder() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('New Request Form');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState([{ id: 'f1', type: 'text', label: 'Request Title', required: true }]);
  const [mode, setMode] = useState('build'); // 'build' | 'preview'
  const [activeFieldId, setActiveFieldId] = useState('f1');

  // DnD Setup
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addField = (type) => {
    const newId = `f${Date.now()}`;
    setFields([...fields, {
      id: newId,
      type,
      label: 'New Question',
      required: false,
      options: ['Option 1', 'Option 2'] // Default for option-based fields
    }]);
    setActiveFieldId(newId);
  };

  const updateField = (id, key, value) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const removeField = (id) => {
    setFields(fields.filter(f => f.id !== id));
    if (activeFieldId === id) setActiveFieldId(null);
  };

  const handleSave = async () => {
    try {
      await api.post('/forms', { title, description, projectId, fields });
      toast.success("Form published successfully");
      navigate(`/project/${projectId}`);
    } catch {
      toast.error("Failed to save form");
    }
  };

  const activeField = fields.find(f => f.id === activeFieldId);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={() => navigate(`/project/${projectId}`)} className="h-10 w-10 shrink-0 rounded-full bg-muted/50 hover:bg-muted" title="Back to Project">
             <ArrowLeft className="h-5 w-5" />
           </Button>
           <div>
             <h1 className="text-2xl font-extrabold tracking-tight">Form Builder</h1>
             <p className="text-muted-foreground text-sm">Design intake forms to collect structured data for this project.</p>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Tabs value={mode} onValueChange={setMode} className="w-[200px]">
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger value="build"><Edit3 className="w-4 h-4 mr-2" /> Build</TabsTrigger>
              <TabsTrigger value="preview"><Eye className="w-4 h-4 mr-2" /> Preview</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={handleSave} className="h-10 px-6 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all">
            <Save className="w-4 h-4 mr-2" /> Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- LEFT / CENTER CANVAS --- */}
        <div className={`space-y-6 ${mode === 'build' ? 'lg:col-span-8' : 'lg:col-span-12 max-w-3xl mx-auto w-full'}`}>
           
           <Card className="border-t-[6px] border-t-primary shadow-lg overflow-hidden glass">
              <CardHeader className="bg-muted/30 pb-6 border-b border-border/50">
                 {mode === 'build' ? (
                   <>
                     <Input 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        className="text-3xl font-extrabold border-none px-0 h-auto focus-visible:ring-0 bg-transparent" 
                        placeholder="Form Title"
                     />
                     <Input 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        className="text-muted-foreground border-none px-0 focus-visible:ring-0 bg-transparent mt-2" 
                        placeholder="Add a description (optional)"
                     />
                   </>
                 ) : (
                   <div className="space-y-2">
                     <h1 className="text-3xl font-extrabold">{title || 'Untitled Form'}</h1>
                     {description && <p className="text-muted-foreground">{description}</p>}
                   </div>
                 )}
              </CardHeader>

              <CardContent className="p-6 md:p-8 space-y-6 bg-card">
                 {fields.length === 0 ? (
                   <div className="text-center py-12 px-4 border-2 border-dashed rounded-2xl border-border bg-muted/10">
                     <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                       <Plus className="w-8 h-8 text-muted-foreground" />
                     </div>
                     <h3 className="text-lg font-semibold mb-1">No fields yet</h3>
                     <p className="text-muted-foreground text-sm">Add fields from the right panel to build your form.</p>
                   </div>
                 ) : mode === 'build' ? (
                   <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                     <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                       <div className="space-y-4">
                         {fields.map((field) => (
                           <SortableField 
                             key={field.id} 
                             field={field} 
                             isActive={activeFieldId === field.id}
                             onSelect={setActiveFieldId}
                             onUpdate={updateField}
                             onRemove={removeField}
                           />
                         ))}
                       </div>
                     </SortableContext>
                   </DndContext>
                 ) : (
                   /* PREVIEW MODE RENDER */
                   <div className="space-y-8">
                     {fields.map((field) => (
                       <div key={field.id} className="space-y-3">
                         <Label className="text-base font-semibold flex items-center gap-1">
                           {field.label} {field.required && <span className="text-red-500">*</span>}
                         </Label>
                         
                         {field.type === 'text' && <Input placeholder="Your answer" className="bg-muted/20" />}
                         {field.type === 'textarea' && <textarea className="flex min-h-[100px] w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Your long answer" />}
                         {field.type === 'date' && <Input type="date" className="bg-muted/20 w-auto" />}
                         
                         {field.type === 'select' && (
                           <div className="border border-input rounded-md px-3 py-2.5 bg-muted/20 text-muted-foreground flex justify-between items-center w-full md:max-w-xs cursor-not-allowed">
                             <span>Choose an option</span>
                             <List className="w-4 h-4 opacity-50" />
                           </div>
                         )}
                         
                         {(field.type === 'radio' || field.type === 'checkbox') && (
                           <div className="space-y-3 pt-1">
                             {field.options?.map((opt, i) => (
                               <div key={i} className="flex items-center space-x-3">
                                 <div className={`w-4 h-4 border border-primary/50 flex-shrink-0 ${field.type === 'radio' ? 'rounded-full' : 'rounded-sm'}`} />
                                 <Label className="font-normal text-sm cursor-pointer hover:text-foreground/80">{opt}</Label>
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                     ))}
                     
                     <div className="pt-6 border-t border-border/50">
                       <Button className="px-8 rounded-xl" disabled>Submit Form</Button>
                     </div>
                   </div>
                 )}
              </CardContent>
           </Card>
        </div>

        {/* --- RIGHT SIDEBAR (Build Mode Only) --- */}
        {mode === 'build' && (
          <div className="lg:col-span-4 space-y-6">
              
              {/* Properties Panel (Requires active field) */}
              <AnimatePresence mode="wait">
                {activeField ? (
                  <motion.div
                    key="properties"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="shadow-md border-border sticky top-8">
                        <CardHeader className="bg-muted/30 border-b border-border/50 pb-4 flex flex-row items-center justify-between space-y-0">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4" /> Field Settings</CardTitle>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50" onClick={() => removeField(activeField.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </CardHeader>
                        <CardContent className="p-5 space-y-6">
                            
                            <div className="space-y-3">
                                <Label>Question Title</Label>
                                <Input 
                                  value={activeField.label} 
                                  onChange={(e) => updateField(activeField.id, 'label', e.target.value)}
                                  className="font-medium"
                                  autoFocus
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-semibold">Required</Label>
                                    <p className="text-[10px] text-muted-foreground">User must complete this field</p>
                                </div>
                                <Switch 
                                    checked={activeField.required} 
                                    onCheckedChange={(c) => updateField(activeField.id, 'required', c)}
                                />
                            </div>

                            {/* Options Editor for Select/Radio/Checkbox */}
                            {['select', 'radio', 'checkbox'].includes(activeField.type) && (
                              <div className="space-y-3 pt-2 border-t border-border/50">
                                <Label className="text-sm flex items-center justify-between">
                                  Choice Options
                                  <BadgeType type={activeField.type} />
                                </Label>
                                <div className="space-y-2">
                                  {activeField.options?.map((opt, idx) => (
                                    <div key={idx} className="flex items-center gap-2 group">
                                      <div className="cursor-ns-resize text-muted-foreground/30 group-hover:text-muted-foreground"><GripHorizontal className="w-4 h-4" /></div>
                                      <Input 
                                        className="h-8 text-sm"
                                        value={opt}
                                        onChange={(e) => {
                                          const newOpts = [...activeField.options];
                                          newOpts[idx] = e.target.value;
                                          updateField(activeField.id, 'options', newOpts);
                                        }}
                                      />
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => {
                                          const newOpts = activeField.options.filter((_, i) => i !== idx);
                                          updateField(activeField.id, 'options', newOpts);
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full mt-2 border-dashed h-8 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => updateField(activeField.id, 'options', [...(activeField.options || []), `Option ${(activeField.options?.length || 0) + 1}`])}
                                  >
                                    <Plus className="w-3 h-3 mr-1"/> Add Option
                                  </Button>
                                </div>
                              </div>
                            )}
                        </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    key="add-fields"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Add Fields Panel (Shows when nothing is selected) */}
                    <Card className="shadow-sm border-border">
                        <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                          <CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" /> Add Field</CardTitle>
                          <CardDescription className="text-xs">Click to add a new question</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 grid grid-cols-2 gap-2">
                            <Button variant="outline" className="justify-start h-auto py-3 px-3 shadow-none hover:bg-muted/50 transition-colors" onClick={() => addField('text')}>
                                <Type className="w-4 h-4 mr-2 text-blue-500" /> <span className="text-xs">Short Text</span>
                            </Button>
                            <Button variant="outline" className="justify-start h-auto py-3 px-3 shadow-none hover:bg-muted/50 transition-colors" onClick={() => addField('textarea')}>
                                <AlignLeft className="w-4 h-4 mr-2 text-indigo-500" /> <span className="text-xs">Long Text</span>
                            </Button>
                            <Button variant="outline" className="justify-start h-auto py-3 px-3 shadow-none hover:bg-muted/50 transition-colors" onClick={() => addField('select')}>
                                <List className="w-4 h-4 mr-2 text-emerald-500" /> <span className="text-xs">Dropdown</span>
                            </Button>
                            <Button variant="outline" className="justify-start h-auto py-3 px-3 shadow-none hover:bg-muted/50 transition-colors" onClick={() => addField('radio')}>
                                <CheckSquare className="w-4 h-4 mr-2 text-purple-500" /> <span className="text-xs">Radio List</span>
                            </Button>
                            <Button variant="outline" className="justify-start h-auto py-3 px-3 shadow-none hover:bg-muted/50 transition-colors" onClick={() => addField('checkbox')}>
                                <CheckSquare className="w-4 h-4 mr-2 text-rose-500" /> <span className="text-xs">Checkboxes</span>
                            </Button>
                            <Button variant="outline" className="justify-start h-auto py-3 px-3 shadow-none hover:bg-muted/50 transition-colors" onClick={() => addField('date')}>
                                <Calendar className="w-4 h-4 mr-2 text-amber-500" /> <span className="text-xs">Date</span>
                            </Button>
                        </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick tip when field is active */}
              {activeField && (
                <div className="text-center">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setActiveFieldId(null)}>
                    Done editing
                  </Button>
                </div>
              )}
          </div>
        )}

      </div>
      
      {/* Inline styles for glass/animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .glass { background: linear-gradient(145deg, hsl(var(--card)/0.9), hsl(var(--card)/0.4)); backdrop-filter: blur(12px); }
      `}</style>
    </div>
  );
}