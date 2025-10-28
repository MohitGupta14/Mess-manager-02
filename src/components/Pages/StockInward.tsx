'use client';

import { useState, useEffect } from 'react';
import { useMessData } from '@/hooks/useMessData';

interface StockInwardProps {
  displayModal: (text: string, type: string) => void;
}

export default function StockInward({ displayModal }: StockInwardProps) {
  const { data: stockItems, addData: addStock, updateData: updateStock, refresh } = useMessData('stockItems');
  const { addData: addLog } = useMessData('inwardLog');
  
  const [itemName, setItemName] = useState('');
  const [quantityReceived, setQuantityReceived] = useState('');
  const [unitOfMeasurement, setUnitOfMeasurement] = useState('');
  const [unitCost, setUnitCost] = useState('0');
  const [dateReceived, setDateReceived] = useState(new Date().toISOString().split('T')[0]);
  const [itemType, setItemType] = useState<'Issue' | 'Non Issue'>('Issue');

  useEffect(() => {
    if (itemType === 'Issue') {
      setUnitCost('0');
    } else {
      setUnitCost('');
    }
  }, [itemType]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !quantityReceived || !unitOfMeasurement.trim() || unitCost === '') {
      displayModal('Please fill all required fields', 'error');
      return;
    }

    const qty = parseFloat(quantityReceived);
    const cost = parseFloat(unitCost);
    
    // Find existing stock item
    const existingItem = stockItems.find(item => item.itemName === itemName);
    
    if (existingItem) {
      // Update existing item
      const newQuantity = existingItem.currentQuantity + qty;
      const newTotalCost = existingItem.totalCost + (qty * cost);
      const newAvgCost = newQuantity > 0 ? newTotalCost / newQuantity : 0;

      const result = await updateStock(existingItem.id, {
        currentQuantity: newQuantity,
        totalCost: newTotalCost,
        lastUnitCost: newAvgCost,
        lastReceivedDate: dateReceived,
        unitOfMeasurement: unitOfMeasurement.trim(),
        itemType,
      });

      if (!result.success) {
        displayModal(result.error || 'Failed to update stock', 'error');
        return;
      }
    } else {
      // Add new item
      const result = await addStock({
        itemName,
        currentQuantity: qty,
        unitOfMeasurement: unitOfMeasurement.trim(),
        lastUnitCost: cost,
        lastReceivedDate: dateReceived,
        totalCost: qty * cost,
        itemType,
      });

      if (!result.success) {
        displayModal(result.error || 'Failed to add stock', 'error');
        return;
      }
    }

    // Add to inward log
    await addLog({
      date: dateReceived,
      itemName,
      quantity: qty,
      unitCost: cost,
      totalCost: qty * cost,
      type: 'Stock Inward',
    });

    displayModal(`Successfully updated ${itemName}`, 'success');
    setItemName('');
    setQuantityReceived('');
    setUnitOfMeasurement('');
    setItemType('Issue');
  };

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">Stock Inward</h1>
      <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="flex flex-col">
          <label htmlFor="itemName" className="text-sm font-medium mb-1">Item Name: <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            id="itemName" 
            value={itemName} 
            onChange={(e) => setItemName(e.target.value)} 
            className="p-2 border rounded-lg" 
            required 
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="itemType" className="text-sm font-medium mb-1">Type: <span className="text-red-500">*</span></label>
          <select 
            id="itemType" 
            value={itemType} 
            onChange={(e) => setItemType(e.target.value as 'Issue' | 'Non Issue')} 
            className="p-2 border rounded-lg" 
            required
          >
            <option value="Issue">Issue</option>
            <option value="Non Issue">Non Issue</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="quantityReceived" className="text-sm font-medium mb-1">Quantity: <span className="text-red-500">*</span></label>
          <input 
            type="number" 
            id="quantityReceived" 
            value={quantityReceived} 
            onChange={(e) => setQuantityReceived(e.target.value)} 
            className="p-2 border rounded-lg" 
            step="0.01" 
            min="0" 
            required 
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="unitOfMeasurement" className="text-sm font-medium mb-1">Unit: <span className="text-red-500">*</span></label>
          <select 
            id="unitOfMeasurement" 
            value={unitOfMeasurement} 
            onChange={(e) => setUnitOfMeasurement(e.target.value)} 
            className="p-2 border rounded-lg" 
            required
          >
            <option value="">Select a unit</option>
            <option value="kg">Kg</option>
            <option value="grams">Grams</option>
            <option value="litre">Litre</option>
            <option value="bottle">Bottle</option>
            <option value="packet">Packet</option>
            <option value="box">Box</option>
            <option value="number">Number</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="unitCost" className="text-sm font-medium mb-1">Unit Cost (₹): <span className="text-red-500">*</span></label>
          <input 
            type="number" 
            id="unitCost" 
            value={unitCost} 
            onChange={(e) => setUnitCost(e.target.value)} 
            className={`p-2 border rounded-lg ${itemType === 'Issue' ? 'bg-gray-200' : ''}`} 
            step="0.01" 
            min="0" 
            required 
            disabled={itemType === 'Issue'}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="dateReceived" className="text-sm font-medium mb-1">Date:</label>
          <input 
            type="date" 
            id="dateReceived" 
            value={dateReceived} 
            onChange={(e) => setDateReceived(e.target.value)} 
            className="p-2 border rounded-lg" 
          />
        </div>
        <div className="md:col-span-2 flex justify-center mt-4">
          <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
            Add to Stock
          </button>
        </div>
      </form>
    </div>
  );
}