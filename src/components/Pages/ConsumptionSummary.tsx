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

      const totalLiquorCost = memberBarEntries.reduce((total, entry) => 
        total + (entry.costPerMember || 0), 0
      );
      const totalSnacksCost = memberSnackEntries.reduce((total, entry) => 
        total + (entry.costPerMember || 0), 0
      );

      return {
        ...member,
        totalLiquorCost,
        totalSnacksCost,
        liquorEntries: memberBarEntries.length,
        snackEntries: memberSnackEntries.length,
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
              <th className="p-3 text-left text-sm font-semibold">Liquor Entries</th>
              <th className="p-3 text-left text-sm font-semibold">Liquor Cost (₹)</th>
              <th className="p-3 text-left text-sm font-semibold">Snack Entries</th>
              <th className="p-3 text-left text-sm font-semibold">Snacks Cost (₹)</th>
              <th className="p-3 text-left text-sm font-semibold">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {consumptionData.map(member => (
              <tr key={member.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{member.name}</td>
                <td className="p-3 text-center">{member.liquorEntries}</td>
                <td className="p-3 font-mono">{member.totalLiquorCost.toFixed(2)}</td>
                <td className="p-3 text-center">{member.snackEntries}</td>
                <td className="p-3 font-mono">{member.totalSnacksCost.toFixed(2)}</td>
                <td className="p-3 font-mono font-bold">{member.grandTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-blue-100 font-bold">
            <tr>
              <td className="p-3">TOTAL</td>
              <td className="p-3 text-center">{barEntries.length}</td>
              <td className="p-3 font-mono">₹{totals.liquor.toFixed(2)}</td>
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