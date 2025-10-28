// / ===== FILE: src/components/Pages/DailyMessing.tsx =====
'use client';

import { useState } from 'react';
import { useMessData } from '@/hooks/useMessData';
import { StockItem, MessMember, DailyMessingEntry } from '@/lib/types';

interface DailyMessingProps {
  displayModal: (text: string, type: string) => void;
}

export default function DailyMessing({ displayModal }: DailyMessingProps) {
  const { data: stockItems, updateData: updateStock } = useMessData('stockItems');
  const { data: messMembers } = useMessData('messMembers');
  const { data: dailyMessingEntries, addData: addMessing } = useMessData('dailyMessingEntries');
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [meal, setMeal] = useState<'Breakfast' | 'Lunch' | 'Dinner'>('Breakfast');
  const [items, setItems] = useState([{ itemName: '', quantity: '' }]);
  const [members, setMembers] = useState<string[]>([]);

  const handleItemChange = (i: number, field: string, val: string) => {
    const newItems = [...items];
    newItems[i] = { ...newItems[i], [field]: val };
    setItems(newItems);
  };
  
  const handleMemberToggle = (memberId: string) => {
    setMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const consumedItems = items.filter(i => i.itemName && parseFloat(i.quantity) > 0).map(i => ({
      itemName: i.itemName,
      quantity: parseFloat(i.quantity)
    }));

    if (consumedItems.length === 0 || members.length === 0) {
      displayModal('Please add at least one item and select at least one member', 'error');
      return;
    }

    // Calculate total cost and deduct stock
    let totalMealCost = 0;
    const stockUpdates = [];

    for (const item of consumedItems) {
      const stockItem = stockItems.find(s => s.itemName === item.itemName);
      if (!stockItem) {
        displayModal(`Stock item "${item.itemName}" not found`, 'error');
        return;
      }

      if (stockItem.currentQuantity < item.quantity) {
        displayModal(`Not enough ${item.itemName} in stock!`, 'error');
        return;
      }

      const itemCost = item.quantity * stockItem.lastUnitCost;
      totalMealCost += itemCost;

      const newQuantity = stockItem.currentQuantity - item.quantity;
      const newTotalCost = stockItem.totalCost - itemCost;
      const newAvgCost = newQuantity > 0 ? newTotalCost / newQuantity : 0;

      stockUpdates.push({
        id: stockItem.id,
        currentQuantity: newQuantity,
        totalCost: newTotalCost,
        lastUnitCost: newAvgCost,
      });
    }

    // Update all stock items
    for (const update of stockUpdates) {
      const { id, ...data } = update;
      await updateStock(id, data);
    }

    // Add messing entry
    const result = await addMessing({
      date,
      mealType: meal,
      consumedItems,
      totalMealCost,
      membersPresent: members,
    });

    if (result.success) {
      displayModal('Messing entry added successfully!', 'success');
      setItems([{ itemName: '', quantity: '' }]);
      setMembers([]);
    } else {
      displayModal(result.error || 'Failed to add messing entry', 'error');
    }
  };

  const nonLiquorItems = stockItems.filter(s => s.itemType !== 'Liquor');

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-8">Daily Messing</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-50 p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-4">
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="p-2 border rounded-lg w-1/2" 
            />
            <select 
              value={meal} 
              onChange={e => setMeal(e.target.value as 'Breakfast' | 'Lunch' | 'Dinner')} 
              className="p-2 border rounded-lg w-1/2"
            >
              <option>Breakfast</option>
              <option>Lunch</option>
              <option>Dinner</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Consumed Items</label>
            {items.map((item, i) => (
              <div key={i} className="flex items-center space-x-2">
                <select 
                  value={item.itemName} 
                  onChange={e => handleItemChange(i, 'itemName', e.target.value)} 
                  className="p-2 border rounded-lg flex-1"
                >
                  <option value="">Select Item</option>
                  {nonLiquorItems.map(s => (
                    <option key={s.id} value={s.itemName}>{s.itemName}</option>
                  ))}
                </select>
                <input 
                  type="number" 
                  value={item.quantity} 
                  onChange={e => handleItemChange(i, 'quantity', e.target.value)} 
                  placeholder="Qty" 
                  className="p-2 border rounded-lg w-24" 
                  step="0.01"
                />
              </div>
            ))}
            <button 
              type="button" 
              onClick={() => setItems([...items, { itemName: '', quantity: '' }])} 
              className="text-sm text-blue-600 hover:underline"
            >
              + Add another item
            </button>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2 text-gray-700">Members Present <span className="text-red-500">*</span></h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 border rounded-lg max-h-60 overflow-y-auto bg-white">
              {messMembers.map(member => (
                <div 
                  key={member.id} 
                  onClick={() => handleMemberToggle(member.memberId)} 
                  className={`p-3 text-center rounded-lg cursor-pointer border-2 transition-all duration-200 ${
                    members.includes(member.memberId) 
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
            <button 
              type="submit" 
              className="w-full sm:w-auto px-10 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-transform transform hover:scale-105"
            >
              Save Messing Entry
            </button>
          </div>
        </form>

        <div className="bg-gray-50 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">Recent Messing Entries</h2>
          <div className="overflow-y-auto max-h-[70vh]">
            <table className="min-w-full bg-white border">
              <thead className="bg-blue-100">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-semibold">Date</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold">Meal</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold">Cost (₹)</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold">Members</th>
                </tr>
              </thead>
              <tbody>
                {dailyMessingEntries.slice(0, 20).map(entry => (
                  <tr key={entry.id} className="border-b">
                    <td className="py-2 px-3 text-sm">{entry.date}</td>
                    <td className="py-2 px-3 text-sm">{entry.mealType}</td>
                    <td className="py-2 px-3 text-sm">{entry.membersPresent.length}</td>
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