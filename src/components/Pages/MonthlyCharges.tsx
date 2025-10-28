// ===== FILE: src/components/Pages/MonthlyLedger.tsx =====
'use client';

import { useState, useMemo } from 'react';
import { useMessData } from '@/hooks/useMessData';
import { InwardLogEntry, DailyMessingEntry, BarEntry, SnackEntry, MessMember } from '@/lib/types';

interface MonthlyLedgerProps {
  displayModal: (text: string, type: string) => void;
}

export default function MonthlyLedger({ displayModal }: MonthlyLedgerProps) {
  const { data: inwardLog } = useMessData('inwardLog');
  const { data: dailyMessingEntries } = useMessData('dailyMessingEntries');
  const { data: barEntries } = useMessData('barEntries');
  const { data: snacksAtBarEntries } = useMessData('snacksAtBarEntries');
  const { data: messMembers } = useMessData('messMembers');
  
  const [selectedDate, setSelectedDate] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDate(prev => ({ ...prev, [e.target.name]: parseInt(e.target.value) }));
  };

  const consolidatedData = useMemo(() => {
    const { month, year } = selectedDate;
    
    const memberMap = messMembers.reduce((acc, member) => {
      acc[member.memberId] = member.name;
      return acc;
    }, {} as Record<string, string>);

    const filterByMonth = (entry: { date: string }) => {
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === year && entryDate.getMonth() + 1 === month;
    };

    const mappedInward = inwardLog.filter(filterByMonth).map(e => ({
      id: e.id, 
      date: e.date, 
      type: e.type,
      description: `${e.quantity} units of ${e.itemName}`,
      details: `Cost: ₹${e.unitCost}/unit`,
      amount: e.totalCost
    }));

    const mappedMessing = dailyMessingEntries.filter(filterByMonth).map(e => ({
      id: e.id, 
      date: e.date, 
      type: `Messing (${e.mealType})`,
      description: `${e.consumedItems.length} items consumed`,
      // details: `Members: ${e.membersPresent.join(', ')}`,
      amount: e.totalMealCost
    }));

    const mappedBar = barEntries.filter(filterByMonth).map(e => ({
      id: e.id, 
      date: e.date, 
      type: 'Bar Counter',
      description: `${e.quantity} units of ${e.wineType}`,
      details: `Members: ${e.sharingMembers.map((id : any) => memberMap[id] || id).join(', ')}`,
      amount: e.totalCost
    }));

    const mappedSnacks = snacksAtBarEntries.filter(filterByMonth).map(e => ({
      id: e.id, 
      date: e.date, 
      type: 'Snacks at Bar',
      description: `${e.quantity} units of ${e.itemName}`,
      details: `Members: ${e.sharingMembers.map((id: number) => memberMap[id] || id).join(', ')}`,
      amount: e.totalItemCost
    }));

    const allEntries = [...mappedInward, ...mappedMessing, ...mappedBar, ...mappedSnacks];
    allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group by day
    return allEntries.reduce((acc, entry) => {
      const day = entry.date;
      if (!acc[day]) acc[day] = [];
      acc[day].push(entry);
      return acc;
    }, {} as Record<string, typeof allEntries>);

  }, [selectedDate, inwardLog, dailyMessingEntries, barEntries, snacksAtBarEntries, messMembers]);

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => ({ 
    value: i + 1, 
    name: new Date(0, i).toLocaleString('default', { month: 'long' }) 
  }));

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">Monthly Ledger</h1>
      
      <div className="flex justify-center items-center gap-4 mb-8 p-4 bg-gray-100 rounded-lg">
        <select 
          name="month" 
          value={selectedDate.month} 
          onChange={handleDateChange} 
          className="p-2 border rounded-lg"
        >
          {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
        </select>
        <select 
          name="year" 
          value={selectedDate.year} 
          onChange={handleDateChange} 
          className="p-2 border rounded-lg"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="space-y-6">
        {Object.keys(consolidatedData).length === 0 ? (
          <p className="text-center text-gray-500 mt-8">No entries found for the selected month.</p>
        ) : (
          Object.entries(consolidatedData).map(([day, entries]) => (
            <div key={day} className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-blue-700 border-b pb-2 mb-3">
                {new Date(day + 'T00:00:00').toLocaleDateString('en-GB', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="py-2 px-3 text-left text-xs font-semibold">Type</th>
                      <th className="py-2 px-3 text-left text-xs font-semibold">Description</th>
                      <th className="py-2 px-3 text-left text-xs font-semibold">Details</th>
                      <th className="py-2 px-3 text-right text-xs font-semibold">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(entry => (
                      <tr key={entry.id} className="border-b">
                        <td className="py-2 px-3 text-sm font-medium">{entry.type}</td>
                        <td className="py-2 px-3 text-sm">{entry.description}</td>
                        {/* <td className="py-2 px-3 text-sm">{entry.details}</td> */}
                        <td className="py-2 px-3 text-sm text-right font-mono">{entry.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}