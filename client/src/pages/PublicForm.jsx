import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '../api/axios';

export default function PublicForm() {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    // Note: This calls the public route
    api.get(`/forms/${formId}`).then(({ data }) => {
        setForm(data);
        setLoading(false);
    }).catch(() => setLoading(false));
  }, [formId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        await api.post(`/forms/${formId}/submit`, formData);
        setSubmitted(true);
    } catch (error) {
        alert("Submission failed.");
    }
  };

  const handleInputChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!form) return <div className="flex h-screen items-center justify-center text-muted-foreground">Form not found or inactive.</div>;

  if (submitted) {
    return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <Card className="w-[400px] text-center p-6">
                <div className="flex justify-center mb-4"><CheckCircle2 className="w-12 h-12 text-green-500" /></div>
                <h2 className="text-xl font-bold mb-2">Submission Received!</h2>
                <p className="text-muted-foreground">Your request has been added to our board.</p>
            </Card>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex justify-center">
        <Card className="w-full max-w-lg h-fit shadow-md">
            <div className="h-2 w-full bg-blue-600 rounded-t-xl"></div>
            <CardHeader>
                <CardTitle className="text-2xl">{form.title}</CardTitle>
                <CardDescription>{form.description}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {form.fields.map((field) => (
                        <div key={field.id} className="space-y-2">
                            <Label>
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </Label>
                            
                            {field.type === 'text' && (
                                <Input 
                                    required={field.required}
                                    onChange={e => handleInputChange(field.id, e.target.value)}
                                />
                            )}
                            {field.type === 'textarea' && (
                                <Textarea 
                                    required={field.required}
                                    onChange={e => handleInputChange(field.id, e.target.value)}
                                />
                            )}
                            {field.type === 'date' && (
                                <Input 
                                    type="date"
                                    required={field.required}
                                    onChange={e => handleInputChange(field.id, e.target.value)}
                                />
                            )}
                            {field.type === 'select' && (
                                <Select onValueChange={val => handleInputChange(field.id, val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an option" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {field.options.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    ))}
                    
                    <Button type="submit" className="w-full bg-slate-900 mt-4">Submit Request</Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}