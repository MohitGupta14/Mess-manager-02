export interface MessMember {
  id: string;
  memberId: string;
  name: string;
  serviceNo: string;
  contactInfo?: string;
  joinDate: string;
}

export interface StockItem {
  id: string;
  itemName: string;
  currentQuantity: number;
  unitOfMeasurement: string;
  lastUnitCost: number;
  lastReceivedDate: string;
  totalCost: number;
  itemType: 'Issue' | 'Non Issue' | 'Liquor';
  timestamp: string;
}

export interface MinStockLevel {
  id: string;
  itemName: string;
  minQuantity: number;
}

export interface DailyMessingEntry {
  id: string;
  date: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner';
  consumedItems: Array<{ itemId: string; quantity: number }>;
  totalMealCost: number;
  membersPresent: string[];
  timestamp: string;
}

export interface BarEntry {
  id: string;
  date: string;
  wineType: string;
  quantity: number;
  sharingMembers: string[];
  totalCost: number;
  costPerMember: number;
  timestamp: string;
}

export interface SnackEntry {
  id: string;
  date: string;
  itemName: string;
  quantity: number;
  sharingMembers: string[];
  totalItemCost: number;
  costPerMember: number;
  timestamp: string;
}

export interface AttendanceEntry {
  id: string;
  date: string;
  attendance: Record<string, boolean>[]; // Array of memberId and their attendance status
  timestamp: string;
}

export type AttendanceStatus = 'Veg' | 'Non-Veg' | 'Egg-Veg' | 'OUT';

export interface RationDemand {
  id: string;
  date: string;
  foodItem: string;
  auth: number;
  noOfP: number;
  totalDemand: number;
  timestamp: string;
}

export interface InwardLogEntry {
  id: string;
  date: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  type: 'Stock Inward' | 'Liquor Inward';
  timestamp: string;
}

export interface MonthlyCharge {
  id: string;
  memberId: string;
  year: number;
  month: number;
  messSubscription: number;
  timestamp: string;
}