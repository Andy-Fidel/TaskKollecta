import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

/**
 * Reusable Export dropdown button.
 * @param {{ onExportCSV: () => void, onExportPDF: () => void, variant?: string, size?: string }} props
 */
export function ExportMenu({ onExportCSV, onExportPDF, variant = 'outline', size = 'sm' }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="rounded-xl gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onExportCSV} className="cursor-pointer gap-2.5 py-2.5">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export as CSV</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onExportPDF} className="cursor-pointer gap-2.5 py-2.5">
          <FileText className="w-4 h-4 text-red-500" />
          <span>Export as PDF</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
