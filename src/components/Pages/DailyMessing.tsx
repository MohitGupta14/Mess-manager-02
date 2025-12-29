// ===== FILE: src/components/Pages/DailyMessing.tsx (Scrollbar Fix) =====
"use client";

import { useState, useMemo } from "react";
import { useMessData } from "@/hooks/useMessData";
import { MessMember } from "@/lib/types";
import PrintExportButtons from "@/components/PrintExportButtons";

interface DailyMessingProps {
  displayModal: (text: string, type: string) => void;
}

export default function DailyMessing({ displayModal }: DailyMessingProps) {
  const { data: stockItems } = useMessData("stockItems");
  const { data: messMembers } = useMessData("messMembers");
  const { data: dailyMessingEntries, addData: addMessing } = useMessData(
    "dailyMessingEntries"
  );

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [meal, setMeal] = useState<"Breakfast" | "Lunch" | "Dinner">(
    "Breakfast"
  );
  const [items, setItems] = useState([{ itemName: "", quantity: "" }]);

  // State for Members Selection and Search
  const [members, setMembers] = useState<string[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");

  const handleItemChange = (i: number, field: string, val: string) => {
    const newItems = [...items];
    newItems[i] = { ...newItems[i], [field]: val };
    setItems(newItems);
  };

  const handleMemberToggle = (memberId: string) => {
    setMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
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

  // Logic for "Select All" button
  const areAllFilteredSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every((m: MessMember) => members.includes(m.memberId));

  const handleToggleSelectAll = () => {
    if (areAllFilteredSelected) {
      // Deselect all currently visible/filtered members
      const filteredIds = filteredMembers.map((m: MessMember) => m.memberId);
      setMembers((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      // Select all currently visible/filtered members
      const filteredIds = filteredMembers.map((m: MessMember) => m.memberId);
      // Add unique IDs to the existing selection
      setMembers((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Helper map for displaying names in the history table
  const memberNameMap = useMemo(() => {
    return new Map(messMembers.map((m: MessMember) => [m.memberId, m.name]));
  }, [messMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const consumedItems = items
      .filter((i) => i.itemName && parseFloat(i.quantity) > 0)
      .map((i) => ({
        itemName: i.itemName,
        quantity: parseFloat(i.quantity),
      }));

    if (consumedItems.length === 0 || members.length === 0) {
      displayModal(
        "Please add at least one item and select at least one member",
        "error"
      );
      return;
    }

    // Calculate total cost (client-side estimation)
    let totalMealCost = 0;

    for (const item of consumedItems) {
      const stockItem = stockItems.find((s) => s.itemName === item.itemName);
      if (!stockItem) {
        displayModal(`Stock item "${item.itemName}" not found`, "error");
        return;
      }

      const quantityNum = Number(item.quantity);
      if (Number(stockItem.currentQuantity) < quantityNum) {
        displayModal(`Not enough ${item.itemName} in stock!`, "error");
        return;
      }

      const itemCost = quantityNum * Number(stockItem.lastUnitCost);
      totalMealCost += itemCost;
    }

    const result = await addMessing({
      date,
      mealType: meal,
      consumedItems,
      totalMealCost,
      membersPresent: members,
    });

    if (result.success) {
      displayModal("Messing entry added successfully!", "success");
      setItems([{ itemName: "", quantity: "" }]);
      setMembers([]); // Reset selection
      setMemberSearchTerm(""); // Reset search
    } else {
      displayModal(result.error || "Failed to add messing entry", "error");
    }
  };

  const nonLiquorItems = stockItems.filter((s) => s.itemType !== "Alcohol");

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-8">
        Daily Messing
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* === LEFT COLUMN: Form === */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-gray-50 p-6 rounded-lg shadow-md flex flex-col h-full"
        >
          {/* Date and Meal */}
          <div className="flex items-center space-x-4">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="p-2 border rounded-lg w-1/2 shadow-sm"
            />
            <select
              value={meal}
              onChange={(e) =>
                setMeal(e.target.value as "Breakfast" | "Lunch" | "Dinner")
              }
              className="p-2 border rounded-lg w-1/2 shadow-sm"
            >
              <option>Breakfast</option>
              <option>Lunch</option>
              <option>Dinner</option>
            </select>
          </div>

          {/* Consumed Items */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Consumed Items
            </label>
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {/* 1. Select: Reduced padding, smaller font, added h-8 for fixed height */}
                <select
                  value={item.itemName}
                  onChange={(e) =>
                    handleItemChange(i, "itemName", e.target.value)
                  }
                  className="flex-1 min-w-0 py-1 px-2 border border-gray-300 rounded text-xs h-8 bg-white truncate"
                >
                  <option value="">Select Item</option>
                  {nonLiquorItems.map((s) => (
                    <option key={s.id} value={s.itemName}>
                      {s.itemName}
                    </option>
                  ))}
                </select>

                {/* 2. Stock: Removed fixed width (w-16) to allow auto-fit, added whitespace-nowrap */}
                <div className="text-[10px] text-gray-500 whitespace-nowrap flex-shrink-0">
                  Stock:{" "}
                  <span className="font-medium text-gray-700">
                    {(() => {
                      const stock = nonLiquorItems.find(
                        (s) => s.itemName === item.itemName
                      );
                      return stock
                        ? `${stock.currentQuantity} ${stock.unitOfMeasurement}`
                        : "0";
                    })()}
                  </span>
                </div>

                {/* 3. Input: Reduced width (w-20 -> w-16), reduced padding */}
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    handleItemChange(i, "quantity", e.target.value)
                  }
                  placeholder="Qty"
                  className="w-16 py-1 px-2 border border-gray-300 rounded text-xs h-8 text-center"
                  step="0.01"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setItems([...items, { itemName: "", quantity: "" }])
              }
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              + Add another item
            </button>
          </div>

          <hr className="border-gray-200 my-2" />

          {/* === MEMBERS SECTION (Scrollbar Fix Applied) === */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
              <label className="block text-sm font-bold text-gray-800">
                Members Present{" "}
                <span className="text-blue-600">({members.length})</span>{" "}
                <span className="text-red-500">*</span>
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

            {/* FIX: Moved border and fixed height/overflow-y-auto to the container holding the grid */}
            <div className="border rounded-lg bg-white overflow-y-auto h-80">
              <div className="p-1 grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-4 md:grid-cols-5 gap-1 content-start">
                {filteredMembers.map((member) => {
                  const isSelected = members.includes(member.memberId);
                  return (
                    <div
                      key={member.id}
                      onClick={() => handleMemberToggle(member.memberId)}
                      className={`
                                    p-1 rounded-sm text-center text-xs font-medium cursor-pointer select-none transition-all duration-150 border
                                    flex flex-col justify-center items-center min-h-[3rem] overflow-hidden
                                    ${
                                      isSelected
                                        ? "bg-blue-600 text-white border-blue-700 shadow-sm transform scale-[1.01]"
                                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                                    }
                                `}
                      title={`${member.name} (${member.memberId})`}
                    >
                      <span className="font-semibold truncate w-full leading-tight">
                        {member.name}
                      </span>
                      <span className="text-[10px] opacity-80 w-full truncate">
                        {member.memberId}
                      </span>
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

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
            >
              Save Entry
            </button>
          </div>
        </form>

        {/* === RIGHT COLUMN: History (Unchanged) === */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-md h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
              Recent Entries
            </h2>
            <PrintExportButtons
              tableId="dailyMessingHistoryTable"
              filename="daily-messing-history"
              title="Daily Messing History"
            />
          </div>
          <div id="dailyMessingHistoryTable" className="flex-1 flex flex-col">
            <div className="overflow-y-auto flex-1 max-h-[70vh] border rounded-lg bg-white shadow-sm">
              <table className="min-w-full">
                <thead className="bg-blue-50 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-3 text-left text-xs font-bold text-gray-600 uppercase border-b">
                      Date/Meal
                    </th>
                    <th className="py-3 px-3 text-left text-xs font-bold text-gray-600 uppercase border-b">
                      Cost
                    </th>
                    <th className="py-3 px-3 text-left text-xs font-bold text-gray-600 uppercase border-b">
                      Members
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dailyMessingEntries.slice(0, 20).map((entry) => {
                    const membersList = Array.isArray(entry.membersPresent)
                      ? entry.membersPresent
                      : typeof entry.membersPresent === "string"
                      ? JSON.parse(entry.membersPresent)
                      : [];

                    const presentMemberNames = membersList
                      .map((id: string) => memberNameMap.get(id) || id)
                      .join(", ");

                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="py-3 px-3 text-sm text-gray-700">
                          <div className="font-medium">{entry.date}</div>
                          <div className="text-xs text-gray-500">
                            {entry.mealType}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-sm font-semibold text-gray-700">
                          ₹{entry.totalMealCost?.toFixed(2) || "0.00"}
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
    </div>
  );
}
