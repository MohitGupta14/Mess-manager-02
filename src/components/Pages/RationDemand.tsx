// ===== FILE: src/components/Pages/RationDemand.tsx =====
'use client';

import { useState } from 'react';
import { useMessData } from '@/hooks/useMessData';
import { StockItem, RationDemand } from '@/lib/types';

interface RationDemandProps {
  displayModal: (text: string, type: string) => void;
}

export default function RationDemandPage({ displayModal }: RationDemandProps) {
  const { data: stockItems } = useMessData('stockItems');
  const { data: rationDemands, addData } = useMessData('rationDemands');
  
  const [foodItem, setFoodItem] = useState('');
  const [auth, setAuth] = useState('');
  const [noOfP, setNoOfP] = useState('');

  const availableFoodItems = stockItems.filter(s => s.itemType !== 'Liquor').sort((a, b) => a.itemName.localeCompare(b.itemName));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodItem || !auth || !noOfP) {
      displayModal('Please fill out all fields', 'error');
      return;
    }

    const totalDemand = (parseFloat(auth) || 0) * (parseInt(noOfP, 10) || 0);

    const demandData = {
      foodItem,
      auth: parseFloat(auth),
      noOfP: parseInt(noOfP, 10),
      totalDemand: totalDemand,
      date: new Date().toISOString().split('T')[0]
    };

    const result = await addData(demandData);
    if (result.success) {
      displayModal(`Ration demand for ${foodItem} submitted!`, 'success');
      setFoodItem('');
      setAuth('');
      setNoOfP('');
    } else {
      displayModal(result.error || 'Failed to submit demand', 'error');
    }
  };

  const totalDemand = (parseFloat(auth) || 0) * (parseInt(noOfP, 10) || 0);

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">Ration Demand</h1>

      <form onSubmit={handleSubmit} className="space-y-6 mb-8 bg-blue-50 p-4 rounded-lg shadow-inner">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col">
            <label htmlFor="foodItem" className="text-gray-700 text-sm font-medium mb-1">Food Item <span className="text-red-500">*</span></label>
            <select
              id="foodItem"
              value={foodItem}
              onChange={(e) => setFoodItem(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Select an item</option>
              {availableFoodItems.map(item => (
                <option key={item.id} value={item.itemName}>{item.itemName}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="auth" className="text-gray-700 text-sm font-medium mb-1">Auth (Qty) <span className="text-red-500">*</span></label>
            <input
              type="number"
              id="auth"
              value={auth}
              onChange={(e) => setAuth(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg"
              placeholder="e.g., 0.5"
              step="0.01"
              min="0"
              required
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="noOfP" className="text-gray-700 text-sm font-medium mb-1">No of P (Persons) <span className="text-red-500">*</span></label>
            <input
              type="number"
              id="noOfP"
              value={noOfP}
              onChange={(e) => setNoOfP(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg"
              placeholder="e.g., 50"
              step="1"
              min="0"
              required
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="totalDemand" className="text-gray-700 text-sm font-medium mb-1">Total Demand</label>
            <input
              type="text"
              id="totalDemand"
              value={totalDemand.toFixed(2)}
              className="p-2 border border-gray-300 rounded-lg bg-gray-200"
              readOnly
            />
          </div>
        </div>
        <div className="flex justify-center mt-6">
          <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
            Submit Demand
          </button>
        </div>
      </form>

      {rationDemands.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 rounded-xl shadow-inner">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">Recent Ration Demands</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-blue-50">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-semibold">Date</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold">Food Item</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold">Auth Qty</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold">No of Persons</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold">Total Demand</th>
                </tr>
              </thead>
              <tbody>
                {rationDemands.map(demand => (
                  <tr key={demand.id} className="border-b">
                    <td className="py-2 px-3 text-sm">{demand.date}</td>
                    <td className="py-2 px-3 text-sm">{demand.foodItem}</td>
                    <td className="py-2 px-3 text-sm">{demand.auth}</td>
                    <td className="py-2 px-3 text-sm">{demand.noOfP}</td>
                    <td className="py-2 px-3 text-sm font-semibold">{demand.totalDemand?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}