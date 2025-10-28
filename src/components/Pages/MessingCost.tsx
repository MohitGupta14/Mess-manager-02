// ===== FILE: src/components/Pages/MessingCost.tsx =====
'use client';

import { useMemo } from 'react';
import { useMessData } from '@/hooks/useMessData';
import { DailyMessingEntry, MessMember } from '@/lib/types';

interface MessingCostProps {
  displayModal: (text: string, type: string) => void;
}

export default function MessingCost({ displayModal }: MessingCostProps) {
  const { data: dailyMessingEntries } = useMessData('dailyMessingEntries');
  const { data: messMembers } = useMessData('messMembers');

  const summary = useMemo(() => {
    const memberSummary: Record<string, { total: number; meals: number }> = {};
    
    dailyMessingEntries.forEach(entry => {
      const costPerPerson = entry.membersPresent?.length > 0 
        ? entry.totalMealCost / entry.membersPresent.length 
        : 0;
      
      // entry.membersPresent?.forEach((memberId: string | number) => {
      //   if (!memberSummary[memberId]) {
      //     memberSummary[memberId] = { total: 0, meals: 0 };
      //   }
      //   memberSummary[memberId].total += costPerPerson;
      //   memberSummary[memberId].meals += 1;
      // });
    });

    return memberSummary;
  }, [dailyMessingEntries]);

  const grandTotal = Object.values(summary).reduce((sum, data) => sum + data.total, 0);
  const totalMeals = Object.values(summary).reduce((sum, data) => sum + data.meals, 0);

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">Messing Costs</h1>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-gray-600 text-sm">Total Entries</p>
          <p className="text-2xl font-bold text-blue-600">{dailyMessingEntries.length}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600 text-sm">Total Meals</p>
          <p className="text-2xl font-bold text-blue-600">{totalMeals}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600 text-sm">Total Cost</p>
          <p className="text-2xl font-bold text-blue-600">₹{grandTotal.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600 text-sm">Avg Cost/Meal</p>
          <p className="text-2xl font-bold text-blue-600">₹{totalMeals > 0 ? (grandTotal / totalMeals).toFixed(2) : '0.00'}</p>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-3">Individual Member Summary</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead className="bg-blue-50">
            <tr>
              <th className="p-3 text-left text-sm font-semibold">Member Name</th>
              <th className="p-3 text-left text-sm font-semibold">Total Meals</th>
              <th className="p-3 text-left text-sm font-semibold">Total Cost (₹)</th>
              <th className="p-3 text-left text-sm font-semibold">Average Cost/Meal (₹)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(summary).map(([memberId, data]) => {
              const member = messMembers.find(m => m.memberId === memberId);
              return (
                <tr key={memberId} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{member?.name || memberId}</td>
                  <td className="p-3">{data.meals}</td>
                  <td className="p-3 font-mono">{data.total.toFixed(2)}</td>
                  <td className="p-3 font-mono">{data.meals > 0 ? (data.total / data.meals).toFixed(2) : '0.00'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-blue-100 font-bold">
            <tr>
              <td className="p-3">TOTAL</td>
              <td className="p-3">{totalMeals}</td>
              <td className="p-3 font-mono">₹{grandTotal.toFixed(2)}</td>
              <td className="p-3">-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
