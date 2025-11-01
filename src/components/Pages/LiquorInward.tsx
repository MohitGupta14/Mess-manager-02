"use client";

import { useState } from "react";
import { useMessData } from "@/hooks/useMessData";

interface LiquorInwardProps {
  displayModal: (text: string, type: string) => void;
}

export default function LiquorInward({ displayModal }: LiquorInwardProps) {
  const {
    data: stockItems,
    addData: addStock,
    updateData: updateStock,
  } = useMessData("stockItems");
  const { addData: addLog } = useMessData("inwardLog");

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("bottle");
  const [unitPrice, setUnitPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [itemType, setItemType] = useState<"Issue" | "Non Issue">("Issue");

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !quantity || !unit || !unitPrice) {
      displayModal("Please fill all required fields", "error");
      return;
    }

    const qty = parseFloat(quantity);
    const cost = parseFloat(unitPrice);

    const existingItem = stockItems.find((item) => item.itemName === name);

    if (existingItem) {
      const newQuantity = existingItem.currentQuantity + qty;
      const newTotalCost = existingItem.totalCost + qty * cost;
      const newAvgCost = newQuantity > 0 ? newTotalCost / newQuantity : 0;

      const result = await updateStock(existingItem.id, {
        currentQuantity: newQuantity,
        totalCost: newTotalCost,
        lastUnitCost: newAvgCost,
        lastReceivedDate: date,
        unitOfMeasurement: unit,
        itemType,
        type: "Liquor",
      });

      if (!result.success) {
        displayModal(result.error || "Failed to update liquor stock", "error");
        return;
      }
    } else {
      const result = await addStock({
        itemName: name,
        currentQuantity: qty,
        unitOfMeasurement: unit,
        lastUnitCost: cost,
        lastReceivedDate: date,
        totalCost: qty * cost,
        itemType,
        type: "Liquor",
      });

      if (!result.success) {
        displayModal(result.error || "Failed to add liquor stock", "error");
        return;
      }
    }

    await addLog({
      date,
      itemName: name,
      quantity: qty,
      unitCost: cost,
      totalCost: qty * cost,
      type: "Liquor Inward",
    });

    displayModal(`Successfully updated ${name}`, "success");
    setName("");
    setQuantity("");
    setUnit("bottle");
    setUnitPrice("");
  };

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">
        Liquor Inward
      </h1>
      <form
        onSubmit={handleAddItem}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
      >
        <div className="flex flex-col">
          <label htmlFor="liquorName" className="text-sm font-medium mb-1">
            Name: <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="liquorName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-2 border rounded-lg"
            required
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="itemType" className="text-sm font-medium mb-1">
            Item Type: <span className="text-red-500">*</span>
          </label>
          <select
            id="itemType"
            value={itemType}
            onChange={(e) =>
              setItemType(e.target.value as "Issue" | "Non Issue")
            }
            className="p-2 border rounded-lg"
            required
          >
            <option value="Issue">Issue</option>
            <option value="Non Issue">Non Issue</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="liquorQuantity" className="text-sm font-medium mb-1">
            Quantity: <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="liquorQuantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="p-2 border rounded-lg"
            step="0.01"
            min="0"
            required
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="liquorUnit" className="text-sm font-medium mb-1">
            Unit: <span className="text-red-500">*</span>
          </label>
          <select
            id="liquorUnit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="p-2 border rounded-lg"
            required
          >
            <option value="bottle">Bottle</option>
            <option value="pegs">Pegs</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="liquorUnitPrice" className="text-sm font-medium mb-1">
            Unit Price (₹): <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="liquorUnitPrice"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className="p-2 border rounded-lg"
            step="0.01"
            min="0"
            disabled={itemType === "Non Issue"}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="liquorDate" className="text-sm font-medium mb-1">
            Date:
          </label>
          <input
            type="date"
            id="liquorDate"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="p-2 border rounded-lg"
          />
        </div>
        <div className="md:col-span-2 flex justify-center mt-4">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700"
          >
            Add Liquor to Stock
          </button>
        </div>
      </form>
    </div>
  );
}
