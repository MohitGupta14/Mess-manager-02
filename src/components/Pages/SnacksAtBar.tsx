// ===== FILE: src/components/Pages/SnacksAtBar.tsx =====
'use client';

import { useState, useMemo } from 'react';
import { useMessData } from '@/hooks/useMessData';
import { StockItem, MessMember, SnackEntry } from '@/lib/types';

interface SnacksAtBarProps {
  displayModal: (text: string, type: string) => void;
}

export default function SnacksAtBar({ displayModal }: SnacksAtBarProps) {
  const { data: stockItems, updateData: updateStock } = useMessData('stockItems');
  const { data: messMembers } = useMessData('messMembers');
  const { data: snacksAtBarEntries, addData: addSnack } = useMessData('snacksAtBarEntries');
  
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('');
  const [sharing, setSharing] = useState<string[]>([]);
  
  // NEW STATES: For member search filter
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  
  const handleMemberToggle = (memberId: string) => {
    setSharing(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };
  
  // Logic to filter members based on search
  const filteredMembers = useMemo(() => {
    const term = memberSearchTerm.toLowerCase().trim();
    if (!term) return messMembers;
    return messMembers.filter(
      (m: MessMember) =>
        m.name.toLowerCase().includes(term) ||
        // FIX: Convert memberId to string before searching
        String(m.memberId).toLowerCase().includes(term)
    );
  }, [messMembers, memberSearchTerm]);

  // Logic for "Select All" button (affects only filtered members)
  const areAllFilteredSelected = filteredMembers.length > 0 && filteredMembers.every((m: MessMember) => sharing.includes(m.memberId));

  const handleToggleSelectAll = () => {
    if (areAllFilteredSelected) {
        // Deselect all currently visible/filtered members
        const filteredIds = filteredMembers.map((m: MessMember) => m.memberId);
        setSharing(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
        // Select all currently visible/filtered members
        const filteredIds = filteredMembers.map((m: MessMember) => m.memberId);
        // Add unique IDs to the existing selection
        setSharing(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Helper map for displaying names in the history table
  const memberNameMap = useMemo(() => {
    return new Map(messMembers.map((m: MessMember) => [m.memberId, m.name]));
  }, [messMembers]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !qty || sharing.length === 0) {
      displayModal('Please fill all fields and select at least one member', 'error');
      return;
    }

    const quantity = parseFloat(qty);
    const stockItem = stockItems.find(s => s.itemName === item);
    
    if (!stockItem) {
      displayModal(`Item "${item}" not found in stock`, 'error');
      return;
    }

    const currentStock = Number(stockItem.currentQuantity);

    if (currentStock < quantity) {
      displayModal(`Not enough ${item} in stock! Available: ${currentStock}`, 'error');
      return;
    }

    const cost = quantity * Number(stockItem.lastUnitCost);
    const costPerMember = cost / sharing.length;

    // Add snack entry (server will handle stock deduction)
    const result = await addSnack({
      itemName: item,
      quantity,
      sharingMembers: sharing,
      totalItemCost: cost,
      costPerMember,
      date: new Date().toISOString().split('T')[0],
    });

    if (result.success) {
      displayModal('Snack entry added successfully!', 'success');
      setItem('');
      setQty('');
      setSharing([]); // Reset selection
      setMemberSearchTerm(''); // Reset search
    } else {
      displayModal(result.error || 'Failed to add snack entry', 'error');
    }
  };

  const snackItems = stockItems.filter(i => i.type === 'snacks'); // Assuming itemType is 'Snacks' based on previous context

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-8">Snacks at Bar</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-50 p-6 rounded-lg shadow-md flex flex-col h-full">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Snack Item <span className="text-red-500">*</span></label>
            <select 
              value={item} 
              onChange={e => setItem(e.target.value)} 
              className="p-2 border border-gray-300 rounded-lg w-full shadow-sm text-sm" 
              required
            >
              <option value="">Select Snack Item</option>
              {snackItems.map(i => (
                <option key={i.id} value={i.itemName}>{i.itemName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
            <input 
              type="number" 
              value={qty} 
              onChange={e => setQty(e.target.value)} 
              placeholder="e.g., 2" 
              className="p-2 border border-gray-300 rounded-lg w-full shadow-sm text-sm" 
              step="0.01"
              required 
            />
            <div>
              <span className="text-gray-500 text-xs">
                Available: {snackItems.find(i => i.itemName === item)?.currentQuantity || 0}
              </span>
            </div>
          </div>
          
          <hr className="border-gray-200 my-2" />

          {/* === SHARING MEMBERS SECTION (Updated View) === */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                <label className="block text-sm font-bold text-gray-800">
                  Sharing Members <span className="text-blue-600">({sharing.length})</span> <span className="text-red-500">*</span>
                </label>
                
                {/* Select All Button */}
                <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
                        areAllFilteredSelected 
                        ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200" 
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200"
                    }`}
                >
                    {areAllFilteredSelected ? "Deselect Visible" : "Select Visible"}
                </button>
            </div>

            {/* Search Bar */}
            <input
                type="text"
                placeholder="🔍 Search member name or Service No..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="w-full p-2 mb-3 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />

            {/* Scrollable Member Grid (Compact) */}
            <div className="border rounded-lg bg-white overflow-y-auto h-80"> 
                <div className="p-1 grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-4 md:grid-cols-5 gap-1 content-start">
                    {filteredMembers.map((member) => {
                        const isSelected = sharing.includes(member.memberId);
                        return (
                            <div
                                key={member.id}
                                onClick={() => handleMemberToggle(member.memberId)}
                                className={`
                                    p-1 rounded-sm text-center text-xs font-medium cursor-pointer select-none transition-all duration-150 border
                                    flex flex-col justify-center items-center min-h-[3rem] overflow-hidden
                                    ${isSelected 
                                        ? "bg-blue-600 text-white border-blue-700 shadow-sm transform scale-[1.01]" 
                                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                                    }
                                `}
                                title={`${member.name} (${member.memberId})`}
                            >
                                <span className="font-semibold truncate w-full leading-tight">{member.name}</span>
                                <span className="text-[10px] opacity-80 w-full truncate">{member.memberId}</span>
                            </div>
                        );
                    })}
                    {filteredMembers.length === 0 && (
                        <div className="col-span-full text-center text-gray-400 py-8 text-sm">
                            No members found matching "{memberSearchTerm}"
                        </div>
                    )}
                </div>
            </div>
          </div>
          {/* === END SHARING MEMBERS SECTION === */}

          <div className="pt-4">
            <button type="submit" className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-transform transform hover:scale-105">
              Add Snack Entry
            </button>
          </div>
        </form>
        
        {/* === RIGHT COLUMN: Recent Snack Entries === */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">Recent Snack Entries</h2>
          <div className="overflow-y-auto max-h-[70vh] border rounded-lg bg-white shadow-sm">
            <table className="min-w-full">
              <thead className="bg-blue-50 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-3 text-left text-xs font-bold text-gray-600 uppercase border-b">Date/Cost</th>
                  <th className="py-3 px-3 text-left text-xs font-bold text-gray-600 uppercase border-b">Item/Qty</th>
                  <th className="py-3 px-3 text-left text-xs font-bold text-gray-600 uppercase border-b">Members</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {snacksAtBarEntries.slice(0, 20).map(entry => {
                  // Ensure sharingMembers is an array
                  const membersList = Array.isArray(entry.sharingMembers)
                    ? entry.sharingMembers
                    : typeof entry.sharingMembers === 'string'
                      ? JSON.parse(entry.sharingMembers)
                      : [];

                  const presentMemberNames = membersList.map((memberId: string) => 
                    memberNameMap.get(memberId) || memberId
                  ).join(', ');

                  return (
                    <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-3 text-sm text-gray-700">
                        <div className="font-medium">{entry.date}</div>
                        <div className="text-xs text-red-600 font-semibold">
                          ₹{entry.totalItemCost?.toFixed(2) || '0.00'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-700">
                        <div className="font-medium">{entry.itemName}</div>
                        <div className="text-xs text-gray-500">{entry.quantity}</div>
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-600">
                        <div className="max-h-16 overflow-y-auto text-xs leading-relaxed">
                          {presentMemberNames}
                        </div>
                        <div className="text-xs text-blue-600 font-medium mt-1">
                            Count: {membersList.length}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}