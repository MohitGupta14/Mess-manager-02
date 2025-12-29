// ===== FILE: src/components/Pages/LiquorSummary.tsx =====
'use client';

import { useState, useMemo } from 'react';
import { useMessData } from '@/hooks/useMessData';
import PrintExportButtons from '@/components/PrintExportButtons';
import { StockItem, MinStockLevel } from '@/lib/types';
import EditStockItemModal from '@/components/Modals/EditStockItemModal';

interface LiquorSummaryProps {
  displayModal: (text: string, type: string) => void;
}

export default function LiquorSummary({ displayModal }: LiquorSummaryProps) {
  const { data: stockItems, deleteData } = useMessData('stockItems');
  const { data: minStockLevels } = useMessData('minStockLevels');
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  
  // NEW: State for search functionality
  const [searchTerm, setSearchTerm] = useState('');

  const getMinStock = (itemName: string) => {
    const minLevel = minStockLevels.find(m => m.itemName === itemName);
    return minLevel?.minQuantity;
  };

  const handleDelete = async (itemName: string, id: string) => {
    if (confirm(`Are you sure you want to delete ${itemName}?`)) {
      const result = await deleteData(id);
      if (result.success) {
        displayModal(`${itemName} deleted successfully`, 'success');
      } else {
        displayModal(result.error || 'Failed to delete item', 'error');
      }
    }
  };

  // NEW: Filtering and Sorting Logic (uses item.type === 'alcohol' and filters by search term)
  const filteredAndSortedItems = useMemo(() => {
    // Note: Assuming 'alcohol' items are filtered based on the existing logic
     const liquorItems = stockItems.filter(item => item.type === 'alcohol');

    // 1. Filtering
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    const filtered = liquorItems.filter(item => 
      item.itemName.toLowerCase().includes(lowerCaseSearchTerm) 
      // Liquor items usually don't have sub-types worth searching, so we only search by name.
    );
    
    // 2. Sorting
    return filtered.sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [stockItems, searchTerm]);


  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Liquor Stock Summary</h1>
        <PrintExportButtons
          tableId="liquorSummaryTable"
          filename="liquor-summary"
          title="Liquor Stock Summary"
        />
      </div>

      {/* NEW: Search Bar */}
      <input
        type="text"
        placeholder="Search by Liquor Item Name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 p-2 border rounded w-full max-w-md"
      />
      
        {/* NEW: Wrapper for scrollable table body with fixed header */}
        <div className="max-h-[30rem] overflow-y-auto border rounded"> 
          <table id="liquorSummaryTable" className="min-w-full bg-white">
            <thead className="bg-blue-50 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="p-3 text-left text-sm font-semibold">Item</th>
                <th className="p-3 text-left text-sm font-semibold">Current Stock</th>
                <th className="p-3 text-left text-sm font-semibold">Unit Cost (₹)</th>
                <th className="p-3 text-left text-sm font-semibold">Total Value (₹)</th>
                <th className="p-3 text-left text-sm font-semibold">Min Stock</th>
                <th className="p-3 text-left text-sm font-semibold">Alert</th>
                <th className="p-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedItems.map((item) => {
                const minLevel = getMinStock(item.itemName);
                const isLow = typeof minLevel === 'number' && Number(item.currentQuantity) < Number(minLevel);
                
                // Ensure calculations are handled safely with Number() conversions
                const currentQuantity = Number(item.currentQuantity);
                const lastUnitCost = Number(item.lastUnitCost);

                return (
                  <tr key={item.id} className={`border-b ${isLow ? 'bg-red-50' : ''}`}>
                    <td className="p-3 font-medium">{item.itemName}</td>
                    <td className="p-3">{currentQuantity} {item.unitOfMeasurement}</td>
                    <td className="p-3">{!isNaN(lastUnitCost) ? lastUnitCost.toFixed(2) : 'N/A'}</td>
                    <td className="p-3">{!isNaN(currentQuantity * lastUnitCost) ? (currentQuantity * lastUnitCost).toFixed(2) : 'N/A'}</td>
                    <td className="p-3">{minLevel ?? 'Not set'}</td>
                    <td className="p-3">{isLow ? <span className="text-red-600 font-semibold">Low</span> : 'OK'}</td>
                    <td className="p-3 space-x-2 whitespace-nowrap">
                      <button 
                        onClick={() => setEditingItem(item)} 
                        className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(item.itemName, item.id)} 
                        className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredAndSortedItems.length === 0 && (
                 <tr>
                    <td colSpan={7} className="p-4 text-center text-gray-500">
                        No liquor items found matching your search.
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>

      {editingItem && (
        <EditStockItemModal
          item={editingItem}
          minStock={getMinStock(editingItem.itemName)}
          onClose={() => setEditingItem(null)}
          displayModal={displayModal}
        />
      )}
    </div>
  );
}