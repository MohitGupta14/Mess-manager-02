// ===== FILE: src/components/Pages/MonthlyLedger.tsx =====
'use client';

import { useState, useMemo } from 'react';
import { useMessData } from '@/hooks/useMessData';
import PrintExportButtons from '@/components/PrintExportButtons';

interface MonthlyChargesProps {
  displayModal: (text: string, type: string) => void;
}

interface MemberCharges {
  memberId: string;
  name: string;
  totalCharge: number;
  consumedItems: {
    itemName: string;
    quantity: number;
    cost: number;
    source: 'messing' | 'bar' | 'snacks';
  }[];
}

export default function MonthlyCharges({ displayModal }: MonthlyChargesProps) {
  const { data: dailyMessingEntries = [] } = useMessData('dailyMessingEntries');
  const { data: barEntries = [] } = useMessData('barEntries');
  const { data: snacksAtBarEntries = [] } = useMessData('snacksAtBarEntries');
  const { data: messMembers = [] } = useMessData('messMembers');
  const { data: stockItems = [] } = useMessData('stockItems');
  
  const [selectedDate, setSelectedDate] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const [searchTerm, setSearchTerm] = useState('');

  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDate(prev => ({ ...prev, [e.target.name]: parseInt(e.target.value) }));
  };

  // Calculate per-member charges and consumption
  const memberCharges = useMemo(() => {
    const { month, year } = selectedDate;
    
    const filterByMonth = (entry: { date: string }) => {
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === year && entryDate.getMonth() + 1 === month;
    };

    // Initialize charges map
    const charges: Record<string, MemberCharges> = {};
    messMembers.forEach(member => {
      charges[member.memberId] = {
        memberId: member.memberId,
        name: member.name,
        totalCharge: 0,
        consumedItems: []
      };
    });

    // Process daily messing entries
    dailyMessingEntries.filter(filterByMonth).forEach((entry: any) => {
      const members = Array.isArray(entry.membersPresent) 
        ? entry.membersPresent 
        : JSON.parse(entry.membersPresent || '[]');
      
      if (members.length === 0) return;

      const items = Array.isArray(entry.consumedItems)
        ? entry.consumedItems
        : JSON.parse(entry.consumedItems || '[]');

      items.forEach((item: any) => {
        const stockItem = stockItems.find(s => 
          s.id === item.itemId || s.itemName === item.itemName
        );
        if (!stockItem) return;

        const quantityPerMember = Number(item.quantity) / members.length;
        const costPerMember = (Number(item.quantity) * Number(stockItem.lastUnitCost)) / members.length;

        members.forEach((memberId: string) => {
          if (charges[memberId]) {
            charges[memberId].consumedItems.push({
              itemName: stockItem.itemName,
              quantity: quantityPerMember,
              cost: costPerMember,
              source: 'messing'
            });
            charges[memberId].totalCharge += costPerMember;
          }
        });
      });
    });

    // Process bar entries
    barEntries.filter(filterByMonth).forEach((entry: any) => {
      const members = Array.isArray(entry.sharingMembers)
        ? entry.sharingMembers
        : JSON.parse(entry.sharingMembers || '[]');
      
      if (members.length === 0) return;

      const costPerMember = Number(entry.totalCost || 0) / members.length;
      const quantityPerMember = Number(entry.quantity || 0) / members.length;

      members.forEach((memberId: string) => {
        if (charges[memberId]) {
          charges[memberId].consumedItems.push({
            itemName: entry.wineType,
            quantity: quantityPerMember,
            cost: costPerMember,
            source: 'bar'
          });
          charges[memberId].totalCharge += costPerMember;
        }
      });
    });

    // Process snacks entries
    snacksAtBarEntries.filter(filterByMonth).forEach((entry: any) => {
      const members = Array.isArray(entry.sharingMembers)
        ? entry.sharingMembers
        : JSON.parse(entry.sharingMembers || '[]');
      
      if (members.length === 0) return;

      const costPerMember = Number(entry.totalItemCost || 0) / members.length;
      const quantityPerMember = Number(entry.quantity || 0) / members.length;

      members.forEach((memberId: string) => {
        if (charges[memberId]) {
          charges[memberId].consumedItems.push({
            itemName: entry.itemName,
            quantity: quantityPerMember,
            cost: costPerMember,
            source: 'snacks'
          });
          charges[memberId].totalCharge += costPerMember;
        }
      });
    });

    // Convert to array and sort by total charge
    return Object.values(charges)
      .filter(member => member.totalCharge > 0)
      .sort((a, b) => b.totalCharge - a.totalCharge);
  }, [selectedDate, dailyMessingEntries, barEntries, snacksAtBarEntries, messMembers, stockItems]);

  const filteredMembers = useMemo(() => {
    return memberCharges.filter(member => 
      member.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [memberCharges, searchTerm]);

  const grandTotal = useMemo(() => {
    return memberCharges.reduce((sum, member) => sum + member.totalCharge, 0);
  }, [memberCharges]);

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => ({ 
    value: i + 1, 
    name: new Date(0, i).toLocaleString('default', { month: 'long' }) 
  }));

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Monthly Ledger</h1>
        <PrintExportButtons
          tableId="monthlyChargesTable"
          filename="monthly-charges"
          title={`Monthly Charges - ${months.find(m => m.value === selectedDate.month)?.name} ${selectedDate.year}`}
        />
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 p-4 bg-gray-100 rounded-lg">
        <div className="flex items-center gap-4">
          <select 
            name="month" 
            value={selectedDate.month} 
            onChange={handleDateChange} 
            className="p-2 border rounded-lg"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.name}</option>
            ))}
          </select>
          <select 
            name="year" 
            value={selectedDate.year} 
            onChange={handleDateChange} 
            className="p-2 border rounded-lg"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <input
          type="text"
          placeholder="Search members..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="p-2 border rounded-lg w-full sm:w-64"
        />
      </div>

      {/* Members List */}
      <div id="monthlyChargesTable" className="space-y-6">
        {filteredMembers.length === 0 ? (
          <p className="text-center text-gray-500 mt-8">
            No charges found for the selected month.
          </p>
        ) : (
          <>
            {filteredMembers.map(member => (
              <div key={member.memberId} className="bg-gray-50 p-4 rounded-lg shadow-sm">
                <div className="flex justify-between items-center border-b pb-2 mb-3">
                  <h2 className="text-lg font-semibold text-blue-700">
                    {member.name}
                  </h2>
                  <span className="text-lg font-semibold text-green-700">
                    ₹{member.totalCharge.toFixed(2)}
                  </span>
                </div>

                {/* Itemized List */}
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-2 px-3 text-left text-xs font-semibold">Item</th>
                        <th className="py-2 px-3 text-left text-xs font-semibold">Source</th>
                        <th className="py-2 px-3 text-right text-xs font-semibold">Quantity</th>
                        <th className="py-2 px-3 text-right text-xs font-semibold">Cost (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {member.consumedItems.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 px-3 text-sm">{item.itemName}</td>
                          <td className="py-2 px-3 text-sm capitalize">{item.source}</td>
                          <td className="py-2 px-3 text-sm text-right">
                            {item.quantity.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-sm text-right">
                            ₹{item.cost.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Grand Total */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg shadow-sm">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-blue-800">Grand Total</h2>
                <span className="text-lg font-bold text-blue-800">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}