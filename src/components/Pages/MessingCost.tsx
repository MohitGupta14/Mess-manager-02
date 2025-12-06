// ===== FILE: src/components/Pages/MessingCost.tsx (Detail View Moved Above Main Table) =====
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

interface MemberSummaryData {
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
  // State to track member whose details are being viewed
  const [drillDownMemberId, setDrillDownMemberId] = useState<string | null>(null); 
  const [searchMember, setSearchMember] = useState<string>('');
  
  // Create maps for name lookup
  const memberNameMap = useMemo(() => {
    return new Map(messMembers.map(m => [String(m.memberId), m.name]));
  }, [messMembers]);


  const summary = useMemo(() => {
    const memberSummary: Record<string, MemberSummaryData> = {};
    
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
        const keyId = String(memberId); // Ensure key is always a string
        if (!memberSummary[keyId]) {
          memberSummary[keyId] = { 
            total: 0, 
            meals: 0,
            mealsByDate: {}
          };
        }

        if (!memberSummary[keyId].mealsByDate[entry.date]) {
          memberSummary[keyId].mealsByDate[entry.date] = {
            breakfast: 0,
            lunch: 0,
            dinner: 0,
            cost: 0,
            consumedItems: []
          };
        }

        memberSummary[keyId].total += costPerPerson;
        memberSummary[keyId].meals += 1;
        
        // Update meal count by type
        const mealType = entry.mealType.toLowerCase() as keyof Omit<DailyMealCounts, 'cost' | 'consumedItems'>;
        if (mealType === 'breakfast' || mealType === 'lunch' || mealType === 'dinner') {
          memberSummary[keyId].mealsByDate[entry.date][mealType] += 1;
          memberSummary[keyId].mealsByDate[entry.date].cost += costPerPerson;
         
          // Add consumed items (entries may store itemName or itemId)
          if (Array.isArray(entry.consumedItems)) {
            // Aggregate consumed quantities per itemName for this member-date
            const agg: Record<string, { itemId?: string; itemName: string; quantity: number }> = {};
            
            entry.consumedItems.forEach((it: any) => {
                const rawName: string | undefined = it.itemName;
                const rawId: string | undefined = it.itemId;
                const qty = Number(it.quantity) || 0;
                const perPersonQty = membersList.length > 0 ? qty / membersList.length : qty;

                // Simple check for valid name/ID to use as key
                const resolvedName = rawName || rawId || 'Unknown';
                const resolvedId = rawId || 'Unknown';
                
                if (!agg[resolvedName]) {
                    agg[resolvedName] = { itemId: resolvedId, itemName: resolvedName, quantity: 0 };
                } 
                agg[resolvedName].quantity += perPersonQty;
            });

            // Push aggregated items to member summary
            Object.values(agg).forEach(a => {
              memberSummary[keyId].mealsByDate[entry.date].consumedItems.push({
                itemId: a.itemId!,
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

  // Combined Summary and Filtering Logic for the main table
  const summarizedMembers = useMemo(() => {
    const term = searchMember.toLowerCase().trim();
    const list = Object.entries(summary).map(([memberId, data]) => ({
        memberId: memberId,
        name: memberNameMap.get(memberId) || `ID: ${memberId}`,
        ...data,
    }));
    
    if (!term) return list;
    
    return list.filter(m => 
      m.name.toLowerCase().includes(term) ||
      m.memberId.toLowerCase().includes(term)
    );

  }, [summary, searchMember, memberNameMap]);


  const { grandTotal, totalMeals, totalMembers } = useMemo(() => {
    const total = summarizedMembers.reduce((sum, data) => sum + data.total, 0);
    const meals = summarizedMembers.reduce((sum, data) => sum + data.meals, 0);
    return { grandTotal: total, totalMeals: meals, totalMembers: summarizedMembers.length };
  }, [summarizedMembers]);
  
  const selectedMemberDetails = drillDownMemberId ? summary[drillDownMemberId] : null;


  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">Messing Costs</h1>
      
      {/* --- Date Filters --- */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2 border rounded-lg shadow-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-2 border rounded-lg shadow-sm"
          />
        </div>
      </div>

      {/* --- Summary Cards --- */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 border border-blue-200">
        <div className="text-center">
          <p className="text-gray-600 text-sm">Members Included</p>
          <p className="text-2xl font-bold text-blue-600">{totalMembers}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600 text-sm">Total Meals</p>
          <p className="text-2xl font-bold text-blue-600">{totalMeals}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600 text-sm">Grand Total</p>
          <p className="text-2xl font-bold text-blue-600">₹{grandTotal.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600 text-sm">Avg Cost/Meal</p>
          <p className="text-2xl font-bold text-blue-600">₹{totalMeals > 0 ? (grandTotal / totalMeals).toFixed(2) : '0.00'}</p>
        </div>
      </div>
      
      {/* --- Detail View (Moved Above Main Table) --- */}
      {selectedMemberDetails && (
        <div className="mt-4 mb-8 p-6 border rounded-lg shadow-xl bg-gray-50">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-xl font-bold text-gray-800">
                Daily Consumption for {memberNameMap.get(drillDownMemberId!)}
            </h3>
            <button
              onClick={() => setDrillDownMemberId(null)}
              className="text-red-500 hover:text-red-700 font-semibold text-sm"
            >
              Close Details ❌
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <div className="max-h-[25rem] overflow-y-auto border rounded-lg">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-200 sticky top-0">
                        <tr>
                            <th className="p-3 text-left text-xs font-semibold">Date</th>
                            <th className="p-3 text-center text-xs font-semibold">Meals (B/L/D)</th>
                            <th className="p-3 text-left text-xs font-semibold">Items Consumed (Qty/Person)</th>
                            <th className="p-3 text-left text-xs font-semibold">Daily Cost (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(selectedMemberDetails.mealsByDate)
                            .sort((a, b) => a[0].localeCompare(b[0]))
                            .map(([date, meals]) => (
                                <tr key={date} className="border-b hover:bg-yellow-50/50">
                                    <td className="p-3 text-sm font-medium">{date}</td>
                                    <td className="p-3 text-center text-xs">
                                        <div className="space-y-1">
                                            {meals.breakfast > 0 && <div>B: {meals.breakfast}</div>}
                                            {meals.lunch > 0 && <div>L: {meals.lunch}</div>}
                                            {meals.dinner > 0 && <div>D: {meals.dinner}</div>}
                                        </div>
                                    </td>
                                    <td className="p-3 text-xs">
                                        <ul className="list-disc list-inside space-y-0.5">
                                            {meals.consumedItems.map((item, idx) => (
                                                <li key={idx} className="truncate">
                                                    <span className="font-medium">{item.itemName}:</span> {item.quantity.toFixed(2)}
                                                </li>
                                            ))}
                                        </ul>
                                    </td>
                                    <td className="p-3 font-mono text-sm font-semibold">₹{meals.cost.toFixed(2)}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
          </div>
        </div>
      )}

      {/* --- Member Summary Table & Search --- */}
      <h2 className="text-xl font-semibold mb-3">Member Summary</h2>
      
      <input
        type="text"
        placeholder="Search member by Name or Service ID..."
        value={searchMember}
        onChange={(e) => setSearchMember(e.target.value)}
        className="mb-4 p-2 border rounded-lg w-full max-w-sm shadow-sm"
      />

      <div className="overflow-x-auto border rounded-lg shadow-md">
        <div className="max-h-[30rem] overflow-y-auto"> {/* Scrollable container for the main table */}
          <table className="min-w-full bg-white">
            <thead className="bg-blue-50 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="p-3 text-left text-sm font-semibold">Member Name / Service ID</th>
                <th className="p-3 text-center text-sm font-semibold">Total Meals</th>
                <th className="p-3 text-left text-sm font-semibold">Total Cost (₹)</th>
                <th className="p-3 text-left text-sm font-semibold">Avg Cost/Meal (₹)</th>
                <th className="p-3 text-left text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {summarizedMembers.map((data) => (
                <tr 
                  key={data.memberId} 
                  className={`border-b hover:bg-gray-50 cursor-pointer ${drillDownMemberId === data.memberId ? 'bg-blue-100/50' : ''}`}
                >
                  <td 
                    className="p-3 font-medium text-blue-600 underline"
                    onClick={() => setDrillDownMemberId(data.memberId)}
                    title="Click to view daily consumption details"
                  >
                    <div className="flex flex-col text-sm leading-tight">
                        <span>{data.name}</span>
                        <span className="text-xs text-gray-500">{data.memberId}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center text-sm font-medium">{data.meals}</td>
                  <td className="p-3 font-mono text-sm">₹{data.total.toFixed(2)}</td>
                  <td className="p-3 font-mono text-sm">₹{data.meals > 0 ? (data.total / data.meals).toFixed(2) : '0.00'}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                        data.meals > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                        {data.meals > 0 ? 'Active' : 'No Meals'}
                    </span>
                  </td>
                </tr>
              ))}
              {summarizedMembers.length === 0 && (
                <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500">
                        No members found matching your filters/search.
                    </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-blue-100 font-bold sticky bottom-0">
              <tr>
                 <td className="p-3">OVERALL TOTAL</td>
                 <td className="p-3 text-center">{totalMeals}</td>
                 <td className="p-3 font-mono">₹{grandTotal.toFixed(2)}</td>
                 <td className="p-3" colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
    </div>
  );
}