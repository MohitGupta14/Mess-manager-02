// ===== FILE: src/lib/printUtils.ts =====
// Utility functions for printing and PDF export

export interface PrintOptions {
  title: string;
  filename: string;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Prepare HTML for printing by cloning and styling
 */
export function getPrintableHTML(
  elementId: string,
  options: PrintOptions
): HTMLElement | null {
  const element = document.getElementById(elementId);
  if (!element) return null;

  const clone = element.cloneNode(true) as HTMLElement;
  
  // Add print styles
  const style = document.createElement('style');
  style.textContent = `
    @media print {
      * {
        margin: 0 !important;
        padding: 0 !important;
        border-collapse: collapse !important;
      }
      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        color: #333;
      }
      .no-print {
        display: none !important;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      thead {
        background-color: #f3f4f6 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      th, td {
        padding: 10px;
        text-align: left;
        border: 1px solid #ddd;
      }
      th {
        background-color: #3b82f6 !important;
        color: white !important;
        font-weight: bold;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      tr:nth-child(even) {
        background-color: #f9fafb !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      tfoot {
        background-color: #e5e7eb !important;
        font-weight: bold;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      h1, h2 {
        margin-top: 20px;
        margin-bottom: 10px;
        page-break-after: avoid;
      }
      .print-header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid #3b82f6;
        padding-bottom: 15px;
      }
      .print-header h1 {
        margin: 0;
        font-size: 24px;
        color: #1f2937;
      }
      .print-header p {
        margin: 5px 0 0 0;
        font-size: 12px;
        color: #6b7280;
      }
    }
  `;
  clone.appendChild(style);

  return clone;
}

/**
 * Trigger browser print dialog
 */
export function printElement(elementId: string, title: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  const printWindow = window.open('', '', 'height=600,width=800');
  if (!printWindow) {
    alert('Please allow pop-ups for printing');
    return;
  }

  const printContent = element.innerHTML;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 13px;
          color: #333;
          padding: 20px;
          background: white;
        }
        .print-header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 15px;
        }
        .print-header h1 {
          font-size: 28px;
          color: #1f2937;
          margin-bottom: 5px;
        }
        .print-header p {
          font-size: 12px;
          color: #6b7280;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        thead {
          background-color: #3b82f6;
          color: white;
        }
        th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #ddd;
        }
        td {
          padding: 10px 12px;
          border: 1px solid #ddd;
        }
        tbody tr:nth-child(even) {
          background-color: #f9fafb;
        }
        tbody tr:hover {
          background-color: #f3f4f6;
        }
        tfoot {
          background-color: #e5e7eb;
          font-weight: bold;
        }
        tfoot td {
          padding: 12px;
        }
        .text-center {
          text-align: center;
        }
        .text-right {
          text-align: right;
        }
        .font-bold {
          font-weight: bold;
        }
        .bg-blue-50 {
          background-color: #eff6ff;
        }
        .text-sm {
          font-size: 12px;
        }
        .text-xs {
          font-size: 11px;
        }
        .text-gray-500 {
          color: #6b7280;
        }
        .text-gray-600 {
          color: #4b5563;
        }
        .text-gray-800 {
          color: #1f2937;
        }
        .text-green-600 {
          color: #16a34a;
        }
        .text-orange-600 {
          color: #ea580c;
        }
        .text-red-600 {
          color: #dc2626;
        }
        .mt-6 {
          margin-top: 20px;
        }
        .print-footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          text-align: right;
          font-size: 11px;
          color: #6b7280;
        }
        @media print {
          body {
            padding: 10px;
          }
          table {
            page-break-inside: avoid;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <h1>${title}</h1>
        <p>Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
      ${printContent}
      <div class="print-footer">
        <p>Generated by Mess Management System</p>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

/**
 * Export table as PDF using html2pdf library
 */
export async function exportTableAsPDF(
  elementId: string,
  options: PrintOptions
) {
  try {
    // Dynamically load html2pdf if not already loaded
    if (!(window as any).html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.async = true;
      script.onload = () => {
        performPDFExport(elementId, options);
      };
      document.head.appendChild(script);
    } else {
      performPDFExport(elementId, options);
    }
  } catch (err) {
    console.error('Error exporting PDF:', err);
    alert('Failed to export PDF. Please try again.');
  }
}

function performPDFExport(elementId: string, options: PrintOptions) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  const html2pdf = (window as any).html2pdf;
  const opt = {
    margin: 10,
    filename: `${options.filename}_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: {
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: 'a4',
    },
  };

  // Create a wrapper with header
  const wrapper = document.createElement('div');
  wrapper.style.padding = '10px';
  
  const header = document.createElement('div');
  header.style.textAlign = 'center';
  header.style.marginBottom = '20px';
  header.style.borderBottom = '2px solid #3b82f6';
  header.style.paddingBottom = '15px';
  
  const title = document.createElement('h1');
  title.textContent = options.title;
  title.style.fontSize = '24px';
  title.style.color = '#1f2937';
  title.style.margin = '0 0 5px 0';
  
  const timestamp = document.createElement('p');
  timestamp.textContent = `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
  timestamp.style.fontSize = '12px';
  timestamp.style.color = '#6b7280';
  timestamp.style.margin = '0';
  
  header.appendChild(title);
  header.appendChild(timestamp);
  wrapper.appendChild(header);
  wrapper.appendChild(element.cloneNode(true));

  html2pdf().set(opt).from(wrapper).save();
}

/**
 * Export table as CSV
 */
export function exportTableAsCSV(
  elementId: string,
  filename: string
) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  const table = element.querySelector('table');
  if (!table) {
    console.error('No table found in element');
    return;
  }

  let csv = '';
  const rows = table.querySelectorAll('tr');
  
  rows.forEach((row) => {
    const cols = row.querySelectorAll('td, th');
    const rowData = Array.from(cols)
      .map((col) => {
        const text = (col as HTMLElement).innerText.trim();
        // Escape quotes and wrap in quotes if contains comma
        return text.includes(',') ? `"${text.replace(/"/g, '""')}"` : text;
      })
      .join(',');
    csv += rowData + '\n';
  });

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
