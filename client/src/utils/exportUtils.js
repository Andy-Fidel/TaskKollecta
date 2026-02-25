import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export data to CSV and trigger download.
 * @param {{ headers: string[], rows: string[][], filename: string }} opts
 */
export function exportToCSV({ headers, rows, filename = 'export.csv' }) {
  const escape = (val) => {
    const str = String(val ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const csvContent = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Export data to a styled PDF table and trigger download.
 * @param {{ title: string, headers: string[], rows: string[][], filename: string, subtitle?: string }} opts
 */
export function exportToPDF({ title, headers, rows, filename = 'export.pdf', subtitle }) {
  const doc = new jsPDF({ orientation: rows[0]?.length > 5 ? 'landscape' : 'portrait' });

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(title, 14, 22);

  // Subtitle / metadata
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  const meta = subtitle || `Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  doc.text(meta, 14, 30);

  // Table
  autoTable(doc, {
    startY: 36,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      cellPadding: 4,
      lineColor: [226, 232, 240],
      lineWidth: 0.25,
    },
    margin: { top: 36 },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`TaskKollecta  •  Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
  }

  doc.save(filename);
}

/**
 * Build task export data from raw tasks array.
 */
export function buildTaskExportData(tasks) {
  const headers = ['Title', 'Status', 'Priority', 'Assignee', 'Start Date', 'Due Date', 'Project'];
  const rows = tasks.map(t => [
    t.title || '',
    t.status || '',
    t.priority || '',
    t.assignees?.map(a => a.name || a.email).join(', ') || t.assignee?.name || '',
    t.startDate ? new Date(t.startDate).toLocaleDateString() : '',
    t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '',
    t.project?.name || '',
  ]);
  return { headers, rows };
}

/**
 * Build Gantt-specific export data.
 */
export function buildGanttExportData(tasks) {
  const headers = ['Task', 'Project', 'Status', 'Priority', 'Start Date', 'Due Date', 'Duration (days)'];
  const rows = tasks.map(t => {
    const start = t.startDate ? new Date(t.startDate) : null;
    const end = t.dueDate ? new Date(t.dueDate) : null;
    const duration = start && end ? Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24))) : '';
    return [
      t.title || t.name || '',
      t.project?.name || t.projectName || '',
      t.status || '',
      t.priority || '',
      start ? start.toLocaleDateString() : '',
      end ? end.toLocaleDateString() : '',
      String(duration),
    ];
  });
  return { headers, rows };
}

/**
 * Build sprint report export data from the summary + burndown data.
 */
export function buildSprintReportData(data, projectName) {
  const { summary, burndown } = data;

  // Summary section as rows
  const headers = ['Metric', 'Value'];
  const rows = [
    ['Project', projectName || ''],
    ['Total Tasks', String(summary.totalTasks)],
    ['Completed', String(summary.completedTasks)],
    ['In Progress', String(summary.inProgressTasks)],
    ['Avg Velocity', `${summary.avgVelocity}/wk`],
    ['', ''],
    ['--- Burndown ---', ''],
    ['Date', 'Remaining'],
    ...burndown.map(b => [b.date, String(b.remaining)])
  ];

  return { headers, rows };
}

// --- Helpers ---

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
