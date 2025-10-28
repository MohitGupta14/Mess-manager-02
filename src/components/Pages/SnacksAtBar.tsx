// ===== FILE: src/components/Pages/SnacksAtBar.tsx =====
'use client';

import { useState } from 'react';
import { useMessData } from '@/hooks/useMessData';
import { StockItem, MessMember, SnackEntry } from '@/lib/types';

interface SnacksAtBarProps {
  displayModal: (text: string, type: string) => void;
}

export default function SnacksAtBar({ displayModal }: SnacksAtBarProps) {
  const { data: stockItems, updateData: updateStock } = useMessData('stockItems');
  const { data: messMembers } = useMessData('messMembers');
  const { data: snacksAtBarEntries, addData: addSnack } = useMessData('snacksAtBarEntries');
  
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('');
  const [sharing, setSharing] = useState<string[]>([]);
  
  const handleMemberToggle = (memberId: string) => {
    setSharing(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !qty || sharing.length === 0) {
      displayModal('Please fill all fields and select at least one member', 'error');
      return;
    }

    const quantity = parseFloat(qty);
    const stockItem = stockItems.find(s => s.itemName === item);
    
    if (!stockItem) {
      displayModal(`Item "${item}" not found in stock`, 'error');
      return;
    }

    if (stockItem.currentQuantity < quantity) {
      displayModal(`Not enough ${item} in stock!`, 'error');
      return;
    }

    const cost = quantity * stockItem.lastUnitCost;
    const costPerMember = cost / sharing.length;

    // Deduct stock
    const newQuantity = stockItem.currentQuantity - quantity;
    const newTotalCost = stockItem.totalCost - cost;
    const newAvgCost = newQuantity > 0 ? newTotalCost / newQuantity : 0;

    await updateStock(stockItem.id, {
      currentQuantity: newQuantity,
      totalCost: newTotalCost,
      lastUnitCost: newAvgCost,
    });

    // Add snack entry
    const result = await addSnack({
      itemName: item,
      quantity,
      sharingMembers: sharing,
      totalItemCost: cost,
      costPerMember,
      date: new Date().toISOString().split('T')[0],
    });

    if (result.success) {
      displayModal('Snack entry added successfully!', 'success');
      setItem('');
      setQty('');
      setSharing([]);
    } else {
      displayModal(result.error || 'Failed to add snack entry', 'error');
    }
  };

  const nonLiquorItems = stockItems.filter(i => i.itemType !== 'Liquor');

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-8">Snacks at Bar</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-50 p-6 rounded-lg shadow-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Snack Item <span className="text-red-500">*</span></label>
            <select 
              value={item} 
              onChange={e => setItem(e.target.value)} 
              className="p-2 border border-gray-300 rounded-lg w-full shadow-sm" 
              required
            >
              <option value="">Select Item</option>
              {nonLiquorItems.map(i => (
                <option key={i.id} value={i.itemName}>{i.itemName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
            <input 
              type="number" 
              value={qty} 
              onChange={e => setQty(e.target.value)} 
              placeholder="e.g., 2" 
              className="p-2 border border-gray-300 rounded-lg w-full shadow-sm" 
              step="0.01"
              required 
            />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2 text-gray-700">Sharing Members <span className="text-red-500">*</span></h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 border rounded-lg max-h-60 overflow-y-auto bg-white">
              {messMembers.map(member => (
                <div 
                  key={member.id} 
                  onClick={() => handleMemberToggle(member.memberId)} 
                  className={`p-3 text-center rounded-lg cursor-pointer border-2 transition-all duration-200 ${
                    sharing.includes(member.memberId) 
                      ? 'bg-blue-100 border-blue-500 font-bold text-blue-700' 
                      : 'bg-white border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {member.name}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center pt-4">
            <button type="submit" className="w-full sm:w-auto px-10 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-transform transform hover:scale-105">
              Add Snack Entry
            </button>
          </div>
        </form>
        <div className="bg-gray-50 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">Recent Snack Entries</h2>
          <div className="overflow-y-auto max-h-[70vh]">
            <table className="min-w-full bg-white border">
              <thead className="bg-blue-100">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-semibold">Date</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold">Item</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold">Qty</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold">Members</th>
                </tr>
              </thead>
              <tbody>
                {snacksAtBarEntries.slice(0, 20).map(entry => (
                  <tr key={entry.id} className="border-b">
                    <td className="py-2 px-3 text-sm">{entry.date}</td>
                    <td className="py-2 px-3 text-sm">{entry.itemName}</td>
                    <td className="py-2 px-3 text-sm">{entry.quantity}</td>
                    <td className="py-2 px-3 text-sm">{entry.sharingMembers.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}