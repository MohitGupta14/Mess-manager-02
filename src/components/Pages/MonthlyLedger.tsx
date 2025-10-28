'use client';

import { useState, useMemo } from 'react';
import { useMessData } from '@/hooks/useMessData';
import {
  InwardLogEntry,
  DailyMessingEntry,
  BarEntry,
  SnackEntry,
  MessMember,
} from '@/lib/types';

interface MonthlyLedgerProps {
  displayModal: (text: string, type: string) => void;
}

export default function MonthlyLedger({ displayModal }: MonthlyLedgerProps) {
  const { data: inwardLog = [] } = useMessData('inwardLog');
  const { data: dailyMessingEntries = [] } = useMessData('dailyMessingEntries');
  const { data: barEntries = [] } = useMessData('barEntries');
  const { data: snacksAtBarEntries = [] } = useMessData('snacksAtBarEntries');
  const { data: messMembers = [] } = useMessData('messMembers');

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

  const consolidatedData = useMemo(() => {
    const { month, year } = selectedDate;

    const memberMap = messMembers.reduce((acc, member) => {
      acc[member.memberId] = member.name;
      return acc;
    }, {} as Record<string, string>);

    const filterByMonth = (entry: { date: string }) => {
      const entryDate = new Date(entry.date);
      return (
        entryDate.getFullYear() === year &&
        entryDate.getMonth() + 1 === month
      );
    };

    const mappedInward = inwardLog.filter(filterByMonth).map((e) => ({
      id: e.id,
      date: e.date,
      type: e.type || 'Inward Log',
      description: `${e.quantity} units of ${e.itemName}`,
      details: `Cost: ₹${e.unitCost || 0}/unit`,
      amount: e.totalCost || 0,
    }));

    const mappedMessing = dailyMessingEntries.filter(filterByMonth).map((e) => ({
      id: e.id,
      date: e.date,
      type: `Messing (${e.mealType})`,
      description: `${e.consumedItems?.length || 0} items consumed`,
      // details: `Members: ${e.membersPresent
      //   ?.map((id: string | number) => memberMap[id] || id)
      //   .join(', ')}`,
      amount: e.totalMealCost || 0,
    }));

    const mappedBar = barEntries.filter(filterByMonth).map((e) => ({
      id: e.id,
      date: e.date,
      type: 'Bar Counter',
      description: `${e.quantity} units of ${e.wineType}`,
      details: `Members: ${e.sharingMembers
        ?.map((id: string | number) => memberMap[id] || id)
        .join(', ')}`,
      amount: e.totalCost || 0,
    }));

    const mappedSnacks = snacksAtBarEntries.filter(filterByMonth).map((e) => ({
      id: e.id,
      date: e.date,
      type: 'Snacks at Bar',
      description: `${e.quantity} units of ${e.itemName}`,
      details: `Members: ${e.sharingMembers
        ?.map((id: string | number) => memberMap[id] || id)
        .join(', ')}`,
      amount: e.totalItemCost || 0,
    }));

    const allEntries = [
      ...mappedInward,
      ...mappedMessing,
      ...mappedBar,
      ...mappedSnacks,
    ];

    allEntries.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Group by date
    return allEntries.reduce((acc, entry) => {
      const day = entry.date;
      if (!acc[day]) acc[day] = [];
      acc[day].push(entry);
      return acc;
    }, {} as Record<string, typeof allEntries>);
  }, [
    selectedDate,
    inwardLog,
    dailyMessingEntries,
    barEntries,
    snacksAtBarEntries,
    messMembers,
  ]);

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
      <div>
        {Object.keys(consolidatedData).length === 0 ? (
          <p className="text-center text-gray-600">
            No entries for the selected month.
          </p>
        ) : (
          Object.entries(consolidatedData).map(([date, entries]) => (
            <div key={date} className="mb-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                {new Date(date).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h2>

              <table className="min-w-full bg-white border">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold">Type</th>
                    <th className="p-3 text-left text-sm font-semibold">Description</th>
                    <th className="p-3 text-left text-sm font-semibold">Details</th>
                    <th className="p-3 text-left text-sm font-semibold">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b">
                      <td className="p-3">{entry.type}</td>
                      <td className="p-3">{entry.description}</td>
                      {/* <td className="p-3">{entry.details}</td> */}
                      <td className="p-3">
                        {entry.amount ? entry.amount : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
