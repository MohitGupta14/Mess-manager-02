'use client';

import { useMemo } from 'react';
import { useMessData } from '@/hooks/useMessData';

interface ConsumptionSummaryProps {
  displayModal: (text: string, type: string) => void;
}

export default function ConsumptionSummary({ displayModal }: ConsumptionSummaryProps) {
  const { data: messMembers } = useMessData('messMembers');
  const { data: barEntries } = useMessData('barEntries');
  const { data: snacksAtBarEntries } = useMessData('snacksAtBarEntries');

  const consumptionData = useMemo(() => {
    return messMembers.map(member => {
      const memberBarEntries = barEntries.filter(entry => 
        entry.sharingMembers.includes(member.memberId)
      );
      const memberSnackEntries = snacksAtBarEntries.filter(entry => 
        entry.sharingMembers.includes(member.memberId)
      );
      // Aggregate liquor items by wineType (name)
      const liquorAgg: Record<string, { name: string; quantity: number; cost: number }> = {};
      memberBarEntries.forEach(entry => {
        const shares = Array.isArray(entry.sharingMembers) ? entry.sharingMembers.length : (entry.sharingMembers ? JSON.parse(entry.sharingMembers).length : 1);
        const perMemberQty = shares > 0 ? Number(entry.quantity) / shares : Number(entry.quantity || 0);
        const perMemberCost = Number(entry.costPerMember ?? (entry.totalCost ? (Number(entry.totalCost) / Math.max(1, shares)) : 0));
        const key = entry.wineType || 'Unknown';
        if (!liquorAgg[key]) liquorAgg[key] = { name: key, quantity: 0, cost: 0 };
        liquorAgg[key].quantity += perMemberQty;
        liquorAgg[key].cost += perMemberCost;
      });

      // Aggregate snack items by itemName
      const snackAgg: Record<string, { name: string; quantity: number; cost: number }> = {};
      memberSnackEntries.forEach(entry => {
        const shares = Array.isArray(entry.sharingMembers) ? entry.sharingMembers.length : (entry.sharingMembers ? JSON.parse(entry.sharingMembers).length : 1);
        const perMemberQty = shares > 0 ? Number(entry.quantity) / shares : Number(entry.quantity || 0);
        const perMemberCost = Number(entry.costPerMember ?? (entry.totalItemCost ? (Number(entry.totalItemCost) / Math.max(1, shares)) : 0));
        const key = entry.itemName || 'Unknown';
        if (!snackAgg[key]) snackAgg[key] = { name: key, quantity: 0, cost: 0 };
        snackAgg[key].quantity += perMemberQty;
        snackAgg[key].cost += perMemberCost;
      });

      const liquorItems = Object.values(liquorAgg);
      const snackItems = Object.values(snackAgg);

      const totalLiquorCost = liquorItems.reduce((s, it) => s + it.cost, 0);
      const totalSnacksCost = snackItems.reduce((s, it) => s + it.cost, 0);

      return {
        ...member,
        totalLiquorCost,
        totalSnacksCost,
        liquorEntries: memberBarEntries.length,
        snackEntries: memberSnackEntries.length,
        liquorItems,
        snackItems,
        grandTotal: totalLiquorCost + totalSnacksCost,
      };
    });
  }, [messMembers, barEntries, snacksAtBarEntries]);

  const totals = useMemo(() => {
    return consumptionData.reduce((acc, member) => ({
      liquor: acc.liquor + member.totalLiquorCost,
      snacks: acc.snacks + member.totalSnacksCost,
      grand: acc.grand + member.grandTotal,
    }), { liquor: 0, snacks: 0, grand: 0 });
  }, [consumptionData]);

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">Liquor & Snacks Consumption</h1>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-gray-600 text-sm">Total Liquor Cost</p>
          <p className="text-2xl font-bold text-blue-600">₹{totals.liquor.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600 text-sm">Total Snacks Cost</p>
          <p className="text-2xl font-bold text-blue-600">₹{totals.snacks.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600 text-sm">Grand Total</p>
          <p className="text-2xl font-bold text-green-600">₹{totals.grand.toFixed(2)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead className="bg-blue-50">
            <tr>
              <th className="p-3 text-left text-sm font-semibold">Member Name</th>
              <th className="p-3 text-left text-sm font-semibold">Liquor Consumed</th>
              <th className="p-3 text-left text-sm font-semibold">Liquor Entries</th>
              <th className="p-3 text-left text-sm font-semibold">Liquor Cost (₹)</th>
              <th className="p-3 text-left text-sm font-semibold">Snacks Consumed</th>
              <th className="p-3 text-left text-sm font-semibold">Snack Entries</th>
              <th className="p-3 text-left text-sm font-semibold">Snacks Cost (₹)</th>
              <th className="p-3 text-left text-sm font-semibold">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {consumptionData.map(member => (
              <tr key={member.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{member.name}</td>
                <td className="p-3">
                  <ul className="list-disc list-inside text-sm">
                    {(member.liquorItems || []).map((it: any, i: number) => (
                      <li key={i}>{it.name}: {Number(it.quantity).toFixed(2)} ({Number(it.cost).toFixed(2)})</li>
                    ))}
                  </ul>
                </td>
                <td className="p-3 text-center">{member.liquorEntries}</td>
                <td className="p-3 font-mono">{member.totalLiquorCost.toFixed(2)}</td>
                <td className="p-3">
                  <ul className="list-disc list-inside text-sm">
                    {(member.snackItems || []).map((it: any, i: number) => (
                      <li key={i}>{it.name}: {Number(it.quantity).toFixed(2)} ({Number(it.cost).toFixed(2)})</li>
                    ))}
                  </ul>
                </td>
                <td className="p-3 text-center">{member.snackEntries}</td>
                <td className="p-3 font-mono">{member.totalSnacksCost.toFixed(2)}</td>
                <td className="p-3 font-mono font-bold">{member.grandTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-blue-100 font-bold">
            <tr>
              <td className="p-3">TOTAL</td>
              <td className="p-3"></td>
              <td className="p-3 text-center">{barEntries.length}</td>
              <td className="p-3 font-mono">₹{totals.liquor.toFixed(2)}</td>
              <td className="p-3"></td>
              <td className="p-3 text-center">{snacksAtBarEntries.length}</td>
              <td className="p-3 font-mono">₹{totals.snacks.toFixed(2)}</td>
              <td className="p-3 font-mono">₹{totals.grand.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}