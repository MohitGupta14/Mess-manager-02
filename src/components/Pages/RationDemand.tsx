// ===== FILE: src/components/Pages/RationDemand.tsx =====
'use client';

import { useState, useMemo } from 'react';
import { useMessData } from '@/hooks/useMessData';
import { StockItem, RationDemand } from '@/lib/types';

interface RationDemandProps {
  displayModal: (text: string, type: string) => void;
}

export default function RationDemandPage({ displayModal }: RationDemandProps) {
  const { data: stockItems } = useMessData('stockItems');
  const { data: rationDemands, addData } = useMessData('rationDemands');
  
  // View filters for demands
  const [viewStartDate, setViewStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewEndDate, setViewEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterItem, setFilterItem] = useState<string>('all');

  const demandSummary = useMemo(() => {
    const filtered = rationDemands.filter((d: RationDemand) => {
      const date = d.date || '';
      if (date < viewStartDate || date > viewEndDate) return false;
      if (filterItem !== 'all' && d.foodItem !== filterItem) return false;
      return true;
    });

    const byItem: Record<string, { totalDemand: number; entries: number }> = {};
    filtered.forEach((d: RationDemand) => {
      const key = d.foodItem || 'Unknown';
      if (!byItem[key]) byItem[key] = { totalDemand: 0, entries: 0 };
      byItem[key].totalDemand += Number(d.totalDemand || 0);
      byItem[key].entries += 1;
    });

    const grandTotal = filtered.reduce((s: number, d: RationDemand) => s + Number(d.totalDemand || 0), 0);

    return { filtered, byItem, grandTotal };
  }, [rationDemands, viewStartDate, viewEndDate, filterItem]);
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

      {/* View Filters & Aggregated Summary */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold mb-3">View Ration Demands</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Start Date</label>
            <input type="date" value={viewStartDate} onChange={e => setViewStartDate(e.target.value)} className="p-2 border rounded-lg" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">End Date</label>
            <input type="date" value={viewEndDate} onChange={e => setViewEndDate(e.target.value)} className="p-2 border rounded-lg" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Filter Item</label>
            <select value={filterItem} onChange={e => setFilterItem(e.target.value)} className="p-2 border rounded-lg">
              <option value="all">All Items</option>
              {availableFoodItems.map(i => (
                <option key={i.id} value={i.itemName}>{i.itemName}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Grand Total Demand</label>
            <div className="p-2 bg-gray-100 rounded-lg">{demandSummary.grandTotal.toFixed(2)}</div>
          </div>
        </div>

        {/* Aggregated per-item table */}
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Aggregated by Item</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-blue-50">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-semibold">Item</th>
                  <th className="py-2 px-3 text-right text-xs font-semibold">Entries</th>
                  <th className="py-2 px-3 text-right text-xs font-semibold">Total Demand</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(demandSummary.byItem).map(([itemName, val]) => (
                  <tr key={itemName} className="border-b">
                    <td className="py-2 px-3 text-sm">{itemName}</td>
                    <td className="py-2 px-3 text-sm text-right">{val.entries}</td>
                    <td className="py-2 px-3 text-sm text-right font-semibold">{val.totalDemand.toFixed(2)}</td>
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