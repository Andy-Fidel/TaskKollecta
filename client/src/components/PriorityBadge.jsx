import { Badge } from '@/components/ui/badge';

const STYLES = {
  urgent: "bg-red-100 text-red-700 hover:bg-red-100 border-red-200",
  high: "bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200",
  medium: "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200",
  low: "bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200"
};

export function PriorityBadge({ priority, className }) {
  // Fallback to 'medium' if priority is undefined or invalid
  const p = priority?.toLowerCase() || 'medium';
  
  return (
    <Badge 
      variant="outline" 
      className={`uppercase text-[10px] tracking-wider font-bold border ${STYLES[p]} ${className}`}
    >
      {p}
    </Badge>
  );
}