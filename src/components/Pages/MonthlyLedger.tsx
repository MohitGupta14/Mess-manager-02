'use client';

import { useState, useMemo } from 'react';
import { useMessData } from '@/hooks/useMessData';
interface MonthlyLedgerProps {
  displayModal: (text: string, type: string) => void;
}

export default function MonthlyLedger({ displayModal }: MonthlyLedgerProps) {
  const { data: dailyMessingEntries = [] } = useMessData('dailyMessingEntries');
  const { data: barEntries = [] } = useMessData('barEntries');
  const { data: snacksAtBarEntries = [] } = useMessData('snacksAtBarEntries');
  const { data: stockItems = [] } = useMessData('stockItems');

  const [selectedDate, setSelectedDate] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDate((prev) => ({
      ...prev,
      [e.target.name]: parseInt(e.target.value),
    }));
  };

  // Aggregate consumed items for the selected month
  const consumptionSummary = useMemo(() => {
    const { month, year } = selectedDate;

    const filterByMonth = (entry: { date: string }) => {
      const entryDate = new Date(entry.date);
      return (
        entryDate.getFullYear() === year &&
        entryDate.getMonth() + 1 === month
      );
    };

    // Build stock lookup by id and name
    const stockById = new Map((stockItems || []).map((s: any) => [s.id, s]));
    const stockByName = new Map((stockItems || []).map((s: any) => [s.itemName, s]));

    const agg: Record<string, { itemName: string; quantity: number; unit?: string; cost: number }> = {};

    // daily messing consumed items
    dailyMessingEntries.filter(filterByMonth).forEach((e: any) => {
      const items = Array.isArray(e.consumedItems) ? e.consumedItems : (typeof e.consumedItems === 'string' ? JSON.parse(e.consumedItems) : []);
      items.forEach((it: any) => {
        const rawName = it.itemName || it.itemId || '';
        const stock = stockById.get(it.itemId) || stockByName.get(it.itemName) || undefined;
        const unit = stock?.unitOfMeasurement || undefined;
        const unitCost = Number(stock?.lastUnitCost || 0);
        const qty = Number(it.quantity || 0);
        const cost = unitCost * qty;
        const key = stock?.itemName || rawName || 'Unknown';
        if (!agg[key]) agg[key] = { itemName: key, quantity: 0, unit, cost: 0 };
        agg[key].quantity += qty;
        agg[key].cost += cost;
      });
    });

    // bar entries (liquor)
    barEntries.filter(filterByMonth).forEach((e: any) => {
      const key = e.wineType || 'Unknown';
      const qty = Number(e.quantity || 0);
      const cost = Number(e.totalCost || e.costPerMember || 0) ;
      const stock = stockByName.get(key);
      const unit = stock?.unitOfMeasurement || undefined;
      if (!agg[key]) agg[key] = { itemName: key, quantity: 0, unit, cost: 0 };
      agg[key].quantity += qty;
      agg[key].cost += cost;
    });

    // snacks at bar
    snacksAtBarEntries.filter(filterByMonth).forEach((e: any) => {
      const key = e.itemName || 'Unknown';
      const qty = Number(e.quantity || 0);
      const cost = Number(e.totalItemCost || e.costPerMember || 0);
      const stock = stockByName.get(key);
      const unit = stock?.unitOfMeasurement || undefined;
      if (!agg[key]) agg[key] = { itemName: key, quantity: 0, unit, cost: 0 };
      agg[key].quantity += qty;
      agg[key].cost += cost;
    });

    const items = Object.values(agg).sort((a, b) => b.cost - a.cost);
    const grandTotal = items.reduce((s, it) => s + it.cost, 0);

    return { items, grandTotal };
  }, [selectedDate, dailyMessingEntries, barEntries, snacksAtBarEntries, stockItems]);

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    name: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }));

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">
        Monthly Ledger
      </h1>

      {/* Date Filters */}
      <div className="flex justify-center items-center gap-4 mb-8 p-4 bg-gray-100 rounded-lg">
        <select
          name="month"
          value={selectedDate.month}
          onChange={handleDateChange}
          className="p-2 border rounded-lg"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          name="year"
          value={selectedDate.year}
          onChange={handleDateChange}
          className="p-2 border rounded-lg"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Ledger Table */}
      {/* Consumption Summary */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Consumption Summary for {months.find(m => m.value === selectedDate.month)?.name} {selectedDate.year}</h2>
        {consumptionSummary.items.length === 0 ? (
          <p className="text-gray-600">No consumption data for this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-blue-50">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold">Item</th>
                  <th className="p-3 text-right text-sm font-semibold">Quantity</th>
                  <th className="p-3 text-right text-sm font-semibold">Cost (₹)</th>
                </tr>
              </thead>
              <tbody>
                {consumptionSummary.items.map((it) => (
                  <tr key={it.itemName} className="border-b">
                    <td className="p-3">{it.itemName}</td>
                    <td className="p-3 text-right">{Number(it.quantity).toFixed(2)}</td>
                    <td className="p-3 text-right">₹{it.cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-blue-100 font-bold">
                <tr>
                  <td className="p-3">Total</td>
                  <td className="p-3"></td>
                  <td className="p-3 text-right">₹{consumptionSummary.grandTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
