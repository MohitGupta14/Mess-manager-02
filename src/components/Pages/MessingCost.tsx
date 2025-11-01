// ===== FILE: src/components/Pages/MessingCost.tsx =====
'use client';

import { useMemo, useState } from 'react';
import { useMessData } from '@/hooks/useMessData';
import { DailyMessingEntry, MessMember, StockItem } from '@/lib/types';

interface MessingCostProps {
  displayModal: (text: string, type: string) => void;
}

interface ConsumedItem {
  itemId: string;
  itemName: string;
  quantity: number;
}

interface DailyMealCounts {
  breakfast: number;
  lunch: number;
  dinner: number;
  cost: number;
  consumedItems: ConsumedItem[];
}

interface MemberSummary {
  total: number;
  meals: number;
  mealsByDate: {
    [date: string]: DailyMealCounts;
  };
}

export default function MessingCost({ displayModal }: MessingCostProps) {
  const { data: dailyMessingEntries } = useMessData('dailyMessingEntries');
  const { data: messMembers } = useMessData('messMembers');
    const { data: stockItems } = useMessData('stockItems');
  
  // Date filters
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');

  const summary = useMemo(() => {
    const memberSummary: Record<string, { 
      total: number; 
      meals: number;
      mealsByDate: Record<string, {
        breakfast: number;
        lunch: number;
        dinner: number;
        cost: number;
         consumedItems: ConsumedItem[];
      }>;
    }> = {};
    
  // Create maps of stock items for quick lookup (guard against undefined)
  const stockItemsMap = new Map((stockItems || []).map((item: StockItem) => [item.id, item]));
  const stockItemsByName = new Map((stockItems || []).map((item: StockItem) => [item.itemName, item]));
   
    const filteredEntries = dailyMessingEntries.filter(entry => {
      const entryDate = entry.date;
      return entryDate >= startDate && entryDate <= endDate;
    });

    filteredEntries.forEach(entry => {
      const membersList = Array.isArray(entry.membersPresent)
        ? entry.membersPresent
        : typeof entry.membersPresent === 'string'
          ? JSON.parse(entry.membersPresent)
          : [];

      const costPerPerson = membersList.length > 0 
        ? entry.totalMealCost / membersList.length 
        : 0;
      
      membersList.forEach((memberId: string) => {
        if (!memberSummary[memberId]) {
          memberSummary[memberId] = { 
            total: 0, 
            meals: 0,
            mealsByDate: {}
          };
        }

        if (!memberSummary[memberId].mealsByDate[entry.date]) {
          memberSummary[memberId].mealsByDate[entry.date] = {
            breakfast: 0,
            lunch: 0,
            dinner: 0,
             cost: 0,
             consumedItems: []
          };
        }

        memberSummary[memberId].total += costPerPerson;
        memberSummary[memberId].meals += 1;
        
        // Update meal count by type
        const mealType = entry.mealType.toLowerCase() as keyof Omit<DailyMealCounts, 'cost'>;
        if (mealType === 'breakfast' || mealType === 'lunch' || mealType === 'dinner') {
          memberSummary[memberId].mealsByDate[entry.date][mealType] += 1;
          memberSummary[memberId].mealsByDate[entry.date].cost += costPerPerson;
         
          // Add consumed items (entries may store itemName or itemId)
          if (Array.isArray(entry.consumedItems)) {
            // We'll aggregate consumed quantities per itemName for this member-date
            const agg: Record<string, { itemId?: string; itemName: string; quantity: number }> = {};
            entry.consumedItems.forEach((it: any) => {
              const rawName: string | undefined = it.itemName;
              const rawId: string | undefined = it.itemId;
              // Try to resolve stock item by id or name
              const byId = rawId ? stockItemsMap.get(rawId) : undefined;
              const byName = rawName ? stockItemsByName.get(rawName) : undefined;
              const resolvedName = byName?.itemName || byId?.itemName || rawName || rawId || 'Unknown';
              const resolvedId = byId?.id || byName?.id || rawId || undefined;
              const qty = Number(it.quantity) || 0;
              const perPersonQty = membersList.length > 0 ? qty / membersList.length : qty;

              if (!agg[resolvedName]) {
                agg[resolvedName] = { itemId: resolvedId, itemName: resolvedName, quantity: perPersonQty };
              } else {
                agg[resolvedName].quantity += perPersonQty;
              }
            });

            // Push aggregated items to member summary
            Object.values(agg).forEach(a => {
              memberSummary[memberId].mealsByDate[entry.date].consumedItems.push({
                itemId: a.itemId || a.itemName,
                itemName: a.itemName,
                quantity: a.quantity,
              });
            });
          }
        }
      });
    });

    return memberSummary;
  }, [dailyMessingEntries, startDate, endDate, stockItems]);

  // Filter displayed data based on selected member
  const filteredSummary = useMemo(() => {
    if (selectedMemberId === 'all') return summary;
    return {
      [selectedMemberId]: summary[selectedMemberId]
    };
  }, [summary, selectedMemberId]);

  const { grandTotal, totalMeals } = useMemo(() => {
    const total = Object.values(filteredSummary).reduce((sum, data) => sum + data.total, 0);
    const meals = Object.values(filteredSummary).reduce((sum, data) => sum + data.meals, 0);
    return { grandTotal: total, totalMeals: meals };
  }, [filteredSummary]);

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">Messing Costs</h1>
      
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2 border rounded-lg"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-2 border rounded-lg"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Member</label>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="p-2 border rounded-lg"
          >
            <option value="all">All Members</option>
            {messMembers.map(member => (
              <option key={member.memberId} value={member.memberId}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
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

      {/* Member Summary Table */}
      <h2 className="text-xl font-semibold mb-3">Messing Summary</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead className="bg-blue-50">
            <tr>
              <th className="p-3 text-left text-sm font-semibold">Member Name</th>
              <th className="p-3 text-left text-sm font-semibold">Date</th>
              <th className="p-3 text-left text-sm font-semibold">Breakfast</th>
              <th className="p-3 text-left text-sm font-semibold">Lunch</th>
              <th className="p-3 text-left text-sm font-semibold">Dinner</th>
               <th className="p-3 text-left text-sm font-semibold">Items Consumed</th>
              <th className="p-3 text-left text-sm font-semibold">Daily Cost (₹)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(filteredSummary).map(([memberId, data]) => {
              const member = messMembers.find(m => m.memberId === memberId);
              return Object.entries(data.mealsByDate)
                .sort((a, b) => a[0].localeCompare(b[0])) // Sort by date
                .map(([date, meals]) => (
                  <tr key={`${memberId}-${date}`} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{member?.name || memberId}</td>
                    <td className="p-3">{date}</td>
                    <td className="p-3 text-center">{meals.breakfast}</td>
                    <td className="p-3 text-center">{meals.lunch}</td>
                    <td className="p-3 text-center">{meals.dinner}</td>
                     <td className="p-3">
                       <ul className="list-disc list-inside text-sm">
                         {meals.consumedItems.map((item, idx) => (
                          console.log(item),
                           <li key={idx}>
                             {item.itemName}: {item.quantity.toFixed(2)}
                           </li>
                         ))}
                       </ul>
                     </td>
                    <td className="p-3 font-mono">₹{meals.cost.toFixed(2)}</td>
                  </tr>
                ));
            })}
          </tbody>
          <tfoot className="bg-blue-100 font-bold">
            <tr>
               <td className="p-3" colSpan={2}>TOTAL</td>
               <td className="p-3 text-center" colSpan={4}>{totalMeals} meals</td>
              <td className="p-3 font-mono">₹{grandTotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
