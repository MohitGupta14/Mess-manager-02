// ===== FILE: src/components/PrintExportButtons.tsx =====
'use client';

import { useState } from 'react';
import { Printer, FileDown, FileSpreadsheet } from 'lucide-react';
import { printElement, exportTableAsPDF, exportTableAsCSV } from '@/lib/printUtils';

interface PrintExportButtonsProps {
  tableId: string;
  filename: string;
  title: string;
  showCSV?: boolean;
}

export default function PrintExportButtons({
  tableId,
  filename,
  title,
  showCSV = true,
}: PrintExportButtonsProps) {
  const [exporting, setExporting] = useState(false);

  const handlePrint = () => {
    printElement(tableId, title);
  };

  const handlePDF = async () => {
    setExporting(true);
    try {
      await exportTableAsPDF(tableId, {
        title,
        filename,
        orientation: 'landscape',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleCSV = () => {
    exportTableAsCSV(tableId, filename);
  };

  // 1. Base container for the button
  const buttonBaseClass = 
    "group flex items-center justify-center p-2 rounded-lg transition-all duration-300 ease-in-out shadow-sm hover:shadow-md text-white cursor-pointer";

  // 2. The Text Animation Class
  // - Starts with width 0 and opacity 0
  // - On group hover: expands width, fades in, and adds margin-left for spacing
  const textAnimationClass = 
    "max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 group-hover:ml-2 transition-all duration-300 ease-in-out font-medium text-sm";

  return (
    <div className="flex gap-2 items-center">
      
      {/* PRINT BUTTON */}
      <button
        onClick={handlePrint}
        className={`${buttonBaseClass} bg-blue-600 hover:bg-blue-700`}
        title="Print"
      >
        <Printer className="w-4 h-4" />
        <span className={textAnimationClass}>Print</span>
      </button>

      {/* PDF BUTTON */}
      <button
        onClick={handlePDF}
        disabled={exporting}
        className={`${buttonBaseClass} ${
          exporting
            ? 'bg-gray-400 cursor-not-allowed text-gray-100'
            : 'bg-red-600 hover:bg-red-700'
        }`}
        title="PDF"
      >
        <FileDown className="w-4 h-4" />
        <span className={textAnimationClass}>
          {exporting ? '...' : 'PDF'}
        </span>
      </button>

      {/* CSV BUTTON */}
      {showCSV && (
        <button
          onClick={handleCSV}
          className={`${buttonBaseClass} bg-green-600 hover:bg-green-700`}
          title="CSV"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span className={textAnimationClass}>CSV</span>
        </button>
      )}
    </div>
  );
}