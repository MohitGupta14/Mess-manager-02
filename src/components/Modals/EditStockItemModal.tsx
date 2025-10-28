'use client';

import { useState } from 'react';
import { useMessData } from '@/hooks/useMessData';
import { StockItem } from '@/lib/types';

interface EditStockItemModalProps {
  item: StockItem;
  minStock?: number;
  onClose: () => void;
  displayModal: (text: string, type: string) => void;
}

export default function EditStockItemModal({ item, minStock, onClose, displayModal }: EditStockItemModalProps) {
  const { updateData: updateStock } = useMessData('stockItems');
  const { data: minStockLevels, addData: addMinStock, updateData: updateMinStock } = useMessData('minStockLevels');
  
  const [formData, setFormData] = useState({
    currentQuantity: item.currentQuantity,
    lastUnitCost: item.lastUnitCost,
    unitOfMeasurement: item.unitOfMeasurement,
    itemType: item.itemType,
    minQuantity: minStock || 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newQuantity = parseFloat(formData.currentQuantity.toString());
    const newUnitCost = parseFloat(formData.lastUnitCost.toString());
    const newTotalCost = newQuantity * newUnitCost;

    // Update stock item
    const stockResult = await updateStock(item.id, {
      currentQuantity: newQuantity,
      lastUnitCost: newUnitCost,
      totalCost: newTotalCost,
      unitOfMeasurement: formData.unitOfMeasurement,
      itemType: formData.itemType,
    });

    if (!stockResult.success) {
      displayModal(stockResult.error || 'Failed to update stock', 'error');
      return;
    }

    // Update or add min stock level
    const existingMinStock = minStockLevels.find(m => m.itemName === item.itemName);
    if (existingMinStock) {
      await updateMinStock(existingMinStock.id, {
        minQuantity: parseFloat(formData.minQuantity.toString()),
      });
    } else {
      await addMinStock({
        itemName: item.itemName,
        minQuantity: parseFloat(formData.minQuantity.toString()),
      });
    }

    displayModal(`Successfully updated ${item.itemName}`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white text-black p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Edit: {item.itemName}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Current Quantity</label>
            <input 
              type="number" 
              name="currentQuantity" 
              value={formData.currentQuantity} 
              onChange={handleChange} 
              className="w-full p-2 border rounded" 
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Unit Cost (₹)</label>
            <input 
              type="number" 
              name="lastUnitCost" 
              value={formData.lastUnitCost} 
              onChange={handleChange} 
              className="w-full p-2 border rounded" 
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Unit of Measurement</label>
            <input 
              type="text" 
              name="unitOfMeasurement" 
              value={formData.unitOfMeasurement} 
              onChange={handleChange} 
              className="w-full p-2 border rounded" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Min Stock Level</label>
            <input 
              type="number" 
              name="minQuantity" 
              value={formData.minQuantity} 
              onChange={handleChange} 
              className="w-full p-2 border rounded" 
              step="0.01"
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}