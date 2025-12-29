// ===== FILE: src/components/Pages/ConsumptionSummary.tsx (Daily Details Added) =====
'use client';

import { useMemo, useState } from 'react';
import { useMessData } from '@/hooks/useMessData';
import { MessMember } from '@/lib/types';
import PrintExportButtons from '@/components/PrintExportButtons'; 

// Type definition for aggregated item display
interface AggregatedItem {
    name: string;
    quantity: number;
    cost: number;
}

// Type for a single dated entry in the drill-down view
interface DailyDetailEntry {
    date: string;
    items: {
        liquor: AggregatedItem[];
        snacks: AggregatedItem[];
    };
    dailyTotalCost: number;
}

// Type definition for the combined summary data
interface MemberConsumption {
    id: string;
    memberId: string;
    name: string;
    totalLiquorCost: number;
    totalSnacksCost: number;
    liquorEntries: number;
    snackEntries: number;
    grandTotal: number;
    // NEW: Detailed entries for drill-down
    dailyDetails: DailyDetailEntry[];
}


interface ConsumptionSummaryProps {
  displayModal: (text: string, type: string) => void;
}

export default function ConsumptionSummary({ displayModal }: ConsumptionSummaryProps) {
  const { data: messMembers } = useMessData('messMembers');
  const { data: barEntries } = useMessData('barEntries');
  const { data: snacksAtBarEntries } = useMessData('snacksAtBarEntries');

  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  
  const [searchTerm, setSearchTerm] = useState('');
  const [drillDownMemberId, setDrillDownMemberId] = useState<string | null>(null);

  const consumptionData: MemberConsumption[] = useMemo(() => {
    const isEntryInDateRange = (entry: any) => {
        const entryDate = entry.date;
        return entryDate >= startDate && entryDate <= endDate;
    };

    return messMembers.map(member => {
      const memberIdString = String(member.memberId);
      
      const memberBarEntries = barEntries.filter(entry => 
        String(entry.sharingMembers).includes(memberIdString) && isEntryInDateRange(entry)
      );
      const memberSnackEntries = snacksAtBarEntries.filter(entry => 
        String(entry.sharingMembers).includes(memberIdString) && isEntryInDateRange(entry)
      );
      
      const dailyDetailsMap: Record<string, { liquor: AggregatedItem[], snacks: AggregatedItem[], dailyTotal: number }> = {};
      
      const processEntry = (entry: any, type: 'liquor' | 'snacks') => {
        const shares = Array.isArray(entry.sharingMembers) ? entry.sharingMembers.length : (entry.sharingMembers ? JSON.parse(entry.sharingMembers).length : 1);
        const sharesCount = Math.max(1, shares);
        const quantity = Number(entry.quantity || 0);
        const perMemberQty = quantity / sharesCount;
        
        let perMemberCost;
        let itemName;

        if (type === 'liquor') {
            perMemberCost = Number(entry.costPerMember ?? (entry.totalCost ? (Number(entry.totalCost) / sharesCount) : 0));
            itemName = entry.wineType || 'Unknown Liquor';
        } else {
            perMemberCost = Number(entry.costPerMember ?? (entry.totalItemCost ? (Number(entry.totalItemCost) / sharesCount) : 0));
            itemName = entry.itemName || 'Unknown Snack';
        }

        const dateKey = entry.date;
        if (!dailyDetailsMap[dateKey]) {
            dailyDetailsMap[dateKey] = { liquor: [], snacks: [], dailyTotal: 0 };
        }

        // Aggregate daily total cost
        dailyDetailsMap[dateKey].dailyTotal += perMemberCost;

        // Add item details
        const itemArray = dailyDetailsMap[dateKey][type];
        const existingItem = itemArray.find(item => item.name === itemName);

        if (existingItem) {
            existingItem.quantity += perMemberQty;
            existingItem.cost += perMemberCost;
        } else {
            itemArray.push({ name: itemName, quantity: perMemberQty, cost: perMemberCost });
        }
      };

      memberBarEntries.forEach(entry => processEntry(entry, 'liquor'));
      memberSnackEntries.forEach(entry => processEntry(entry, 'snacks'));
      
      const dailyDetails: DailyDetailEntry[] = Object.entries(dailyDetailsMap).map(([date, data]) => ({
          date,
          items: {
              liquor: data.liquor,
              snacks: data.snacks,
          },
          dailyTotalCost: data.dailyTotal,
      })).sort((a, b) => a.date.localeCompare(b.date));


      // Recalculate final totals from daily details for accuracy
      const finalLiquorCost = dailyDetails.reduce((sum, day) => sum + day.items.liquor.reduce((s, item) => s + item.cost, 0), 0);
      const finalSnacksCost = dailyDetails.reduce((sum, day) => sum + day.items.snacks.reduce((s, item) => s + item.cost, 0), 0);
      const grandTotal = finalLiquorCost + finalSnacksCost;


      return {
        ...member,
        totalLiquorCost: finalLiquorCost,
        totalSnacksCost: finalSnacksCost,
        liquorEntries: memberBarEntries.length,
        snackEntries: memberSnackEntries.length,
        grandTotal,
        dailyDetails,
        liquorItems: dailyDetails.flatMap(d => d.items.liquor), // Keep for reference if needed
        snackItems: dailyDetails.flatMap(d => d.items.snacks), // Keep for reference if needed
      } as MemberConsumption;
    });
  }, [messMembers, barEntries, snacksAtBarEntries, startDate, endDate]); 

  // Filtering Logic
  const filteredConsumptionData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    
    let filteredList = consumptionData;

    if (term) {
        filteredList = filteredList.filter(member => 
            member.name.toLowerCase().includes(term) ||
            String(member.memberId).toLowerCase().includes(term)
        );
    }
    
    // Sort by total cost descending (always applied)
    return filteredList.sort((a, b) => b.grandTotal - a.grandTotal);
  }, [consumptionData, searchTerm]);

  const totals = useMemo(() => {
    return filteredConsumptionData.reduce((acc, member) => ({
      liquor: acc.liquor + member.totalLiquorCost,
      snacks: acc.snacks + member.totalSnacksCost,
      grand: acc.grand + member.grandTotal,
    }), { liquor: 0, snacks: 0, grand: 0 });
  }, [filteredConsumptionData]);

  // Find the details for the drilled down member
  const selectedMemberDetails = drillDownMemberId 
    ? filteredConsumptionData.find(m => m.memberId === drillDownMemberId)
    : null;

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">Bar & Snacks Consumption Summary</h1>
      
      {/* --- Date Filters --- */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1 text-gray-700">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setDrillDownMemberId(null); 
            }}
            className="p-2 border rounded-lg shadow-sm focus:ring-blue-300 focus:border-blue-300"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1 text-gray-700">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setDrillDownMemberId(null); 
            }}
            className="p-2 border rounded-lg shadow-sm focus:ring-blue-300 focus:border-blue-300"
          />
        </div>
      </div>
      
      {/* --- Total Summary Cards --- */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 border border-gray-200">
        <div className="text-center">
          <p className="text-gray-600 text-sm">Members Listed</p>
          <p className="text-2xl font-bold text-gray-700">{filteredConsumptionData.length}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600 text-sm">Total Liquor Cost</p>
          <p className="text-2xl font-bold text-orange-500/80">₹{totals.liquor.toFixed(2)}</p> 
        </div>
        <div className="text-center">
          <p className="text-gray-600 text-sm">Total Snacks Cost</p>
          <p className="text-2xl font-bold text-yellow-600/90">₹{totals.snacks.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600 text-sm">Overall Total</p>
          <p className="text-2xl font-bold text-green-600/90">₹{totals.grand.toFixed(2)}</p>
        </div>
      </div>
      
      {/* --- Detail View (Drill Down) --- */}
      {selectedMemberDetails && (
        <div className="mt-4 mb-8 p-6 border rounded-lg shadow-lg bg-white">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-xl font-bold text-gray-800">
                Daily Consumption Timeline for **{selectedMemberDetails.name}**
            </h3>
            <button
              onClick={() => setDrillDownMemberId(null)}
              className="text-gray-500 hover:text-gray-700 font-semibold text-sm"
            >
              Close Details ✕
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <div className="max-h-[30rem] overflow-y-auto border rounded-lg shadow-inner">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-200 sticky top-0">
                        <tr>
                            <th className="p-3 text-left text-xs font-semibold text-gray-700 w-1/6">Date</th>
                            <th className="p-3 text-left text-xs font-semibold text-gray-700 w-2/5">Liquor Consumed (Qty/Cost)</th>
                            <th className="p-3 text-left text-xs font-semibold text-gray-700 w-2/5">Snacks Consumed (Qty/Cost)</th>
                            <th className="p-3 text-left text-xs font-semibold text-gray-700 w-1/6">Daily Total (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedMemberDetails.dailyDetails.map((day) => (
                            <tr key={day.date} className="border-b hover:bg-gray-50">
                                <td className="p-3 text-sm font-bold text-gray-800">{day.date}</td>
                                
                                {/* Liquor Items */}
                                <td className="p-3 text-xs text-red-700/90">
                                    <ul className="list-disc list-inside space-y-0.5">
                                        {day.items.liquor.length > 0 ? (
                                            day.items.liquor.map((item, i) => (
                                                <li key={i} className="truncate">
                                                    <span className="font-medium">{item.name}:</span> {item.quantity.toFixed(2)} (₹{item.cost.toFixed(2)})
                                                </li>
                                            ))
                                        ) : (
                                            <li className="text-gray-500 list-none">— None —</li>
                                        )}
                                    </ul>
                                </td>
                                
                                {/* Snack Items */}
                                <td className="p-3 text-xs text-yellow-700/90">
                                    <ul className="list-disc list-inside space-y-0.5">
                                        {day.items.snacks.length > 0 ? (
                                            day.items.snacks.map((item, i) => (
                                                <li key={i} className="truncate">
                                                    <span className="font-medium">{item.name}:</span> {item.quantity.toFixed(2)} (₹{item.cost.toFixed(2)})
                                                </li>
                                            ))
                                        ) : (
                                            <li className="text-gray-500 list-none">— None —</li>
                                        )}
                                    </ul>
                                </td>
                                <td className="p-3 font-mono text-sm font-bold text-green-700">₹{day.dailyTotalCost.toFixed(2)}</td>
                            </tr>
                        ))}
                        {selectedMemberDetails.dailyDetails.length === 0 && (
                             <tr>
                                <td colSpan={4} className="p-5 text-center text-gray-500">
                                    No consumption recorded for this member in the selected date range.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
          </div>
        </div>
      )}

      {/* --- Main Summary Table & Search --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
      <h2 className="text-xl font-semibold mb-3">Member Details</h2>
        <PrintExportButtons
          tableId="consumptionSummaryTable"
          filename="consumption-summary"
          title={`Consumption Summary (${startDate} to ${endDate})`}
        />
      </div>
      <input
        type="text"
        placeholder="Search member by Name or Service ID..."
        value={searchTerm}
        onChange={(e) => {
            setSearchTerm(e.target.value);
            setDrillDownMemberId(null); 
        }}
        className="mb-4 p-2 border rounded-lg w-full max-w-sm shadow-sm"
      />

      <div id="consumptionSummaryTable" className="overflow-x-auto border rounded-lg shadow-md">
          <div className="max-h-[40rem] overflow-y-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-200 sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">Member Name / ID</th>
                  <th className="p-3 text-center text-sm font-semibold text-gray-700">Total Entries</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">Liquor Cost (₹)</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">Snacks Cost (₹)</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">Total Cost (₹)</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsumptionData.map((member) => (
                  <tr 
                    key={member.id} 
                    className={`border-b hover:bg-gray-50 cursor-pointer ${drillDownMemberId === member.memberId ? 'bg-blue-50' : ''}`}
                  >
                    <td 
                      className="p-3 font-medium text-blue-600 underline"
                      onClick={() => setDrillDownMemberId(member.memberId)}
                      title="Click to view itemized consumption"
                    >
                      <div className="flex flex-col text-sm leading-tight">
                          <span>{member.name}</span>
                          <span className="text-xs text-gray-500">{member.memberId}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center text-sm font-medium text-gray-700">
                      {member.liquorEntries + member.snackEntries}
                    </td>
                    <td className="p-3 font-mono text-sm text-orange-600/80">₹{member.totalLiquorCost.toFixed(2)}</td>
                    <td className="p-3 font-mono text-sm text-yellow-600/90">₹{member.totalSnacksCost.toFixed(2)}</td>
                    <td className="p-3 font-mono text-sm font-bold text-green-600/90">₹{member.grandTotal.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                          member.grandTotal > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                          {member.grandTotal > 0 ? 'Active' : 'No Spend'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredConsumptionData.length === 0 && (
                  <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-500">
                          No members found matching your filters/search.
                      </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-200 font-bold sticky bottom-0">
                <tr>
                  <td className="p-3 text-gray-800">OVERALL TOTAL</td>
                  <td className="p-3 text-center text-gray-700">{barEntries.length + snacksAtBarEntries.length}</td>
                  <td className="p-3 font-mono text-red-700">₹{totals.liquor.toFixed(2)}</td>
                  <td className="p-3 font-mono text-yellow-700">₹{totals.snacks.toFixed(2)}</td>
                  <td className="p-3 font-mono text-green-700">₹{totals.grand.toFixed(2)}</td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
    </div>
  );
}