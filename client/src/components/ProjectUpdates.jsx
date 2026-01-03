import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, XCircle, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '../api/axios';

export function ProjectUpdates({ projectId }) {
  const [updates, setUpdates] = useState([]);
  const [status, setStatus] = useState('on-track');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get(`/projects/${projectId}/updates`).then(({ data }) => setUpdates(data));
  }, [projectId]);

  const postUpdate = async () => {
    const { data } = await api.post(`/projects/${projectId}/updates`, { status, message });
    setUpdates([data, ...updates]);
    setMessage('');
  };

  const statusConfig = {
    'on-track': { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'On Track' },
    'at-risk': { color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle, label: 'At Risk' },
    'off-track': { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Off Track' },
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      {/* Composer */}
      <Card className="border border-white/60 shadow-sm rounded-2xl p-4">
         <h3 className="text-sm font-bold text-slate-700 mb-3">Post a Status Update</h3>
         <div className="flex gap-4 mb-4">
            <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="on-track"><span className="flex items-center text-green-600"><CheckCircle2 className="w-4 h-4 mr-2"/> On Track</span></SelectItem>
                    <SelectItem value="at-risk"><span className="flex items-center text-yellow-600"><AlertCircle className="w-4 h-4 mr-2"/> At Risk</span></SelectItem>
                    <SelectItem value="off-track"><span className="flex items-center text-red-600"><XCircle className="w-4 h-4 mr-2"/> Off Track</span></SelectItem>
                </SelectContent>
            </Select>
         </div>
         <Textarea 
            placeholder="How is the project going?" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mb-4 bg-slate-50"
         />
         <div className="flex justify-end">
            <Button onClick={postUpdate} className="bg-slate-900"><Send className="w-4 h-4 mr-2"/> Post Update</Button>
         </div>
      </Card>

      {/* Feed */}
      <div className="space-y-4">
        {updates.map(u => {
           const Config = statusConfig[u.status];
           const Icon = Config.icon;
           return (
             <Card key={u._id} className="border border-white/60 shadow-sm rounded-2xl p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-white shadow-sm">
                            <AvatarImage src={u.author.avatar} />
                            <AvatarFallback>{u.author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h4 className="font-bold text-slate-900">{u.author.name}</h4>
                            <p className="text-xs text-slate-500">{format(new Date(u.createdAt), "PPP 'at' p")}</p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${Config.color}`}>
                        <Icon className="w-4 h-4" /> {Config.label}
                    </div>
                </div>
                <div className="pl-14 text-slate-600 text-sm whitespace-pre-wrap">{u.message}</div>
             </Card>
           )
        })}
      </div>
    </div>
  );
}