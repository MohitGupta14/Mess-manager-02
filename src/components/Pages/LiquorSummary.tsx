'use client';

import { useState } from 'react';
import { useMessData } from '@/hooks/useMessData';
import { StockItem, MinStockLevel } from '@/lib/types';
import EditStockItemModal from '@/components/Modals/EditStockItemModal';

interface LiquorSummaryProps {
  displayModal: (text: string, type: string) => void;
}

export default function LiquorSummary({ displayModal }: LiquorSummaryProps) {
  const { data: stockItems, deleteData } = useMessData('stockItems');
  const { data: minStockLevels } = useMessData('minStockLevels');
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);

  const liquorItems = stockItems.filter(item => item.type === 'Liquor Inward');
  const sortedItems = [...liquorItems].sort((a, b) => a.itemName.localeCompare(b.itemName));

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

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">Liquor Stock Summary</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead className="bg-blue-50">
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
            {sortedItems.map((item) => {
              const minLevel = getMinStock(item.itemName);
              const isLow = typeof minLevel === 'number' && item.currentQuantity < minLevel;
              return (
                <tr key={item.id} className={`border-b ${isLow ? 'bg-red-50' : ''}`}>
                  <td className="p-3 font-medium">{item.itemName}</td>
                  <td className="p-3">{item.currentQuantity} {item.unitOfMeasurement}</td>
                  <td className="p-3">{item.lastUnitCost}</td>
                  <td className="p-3">{(item.currentQuantity * item.lastUnitCost).toFixed(2)}</td>
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