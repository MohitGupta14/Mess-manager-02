// ===== FILE: src/app/api/sheets/route.ts =====
import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs';
import path from 'path';

const DESKTOP_PATH = path.join(os.homedir(), 'Desktop');
const DATA_ROOT = path.join(DESKTOP_PATH, 'mess-data');

function ensureFolder(sheet: string) {
  const folderPath = path.join(DATA_ROOT, sheet);
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
  return folderPath;
}

function getCSVPath(sheet: string) {
  const folderPath = ensureFolder(sheet);
  return path.join(folderPath, 'sheet.csv');
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function serializeValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    return JSON.stringify(value).replace(/"/g, '""');
  }
  return String(value).replace(/"/g, '""');
}

function jsonToCsvRow(obj: Record<string, any>, headers: string[]) {
  return headers.map(h => `"${serializeValue(obj[h])}"`).join(',');
}

function parseValue(value: string): any {
  if (!value) return '';
  if (value.startsWith('[') || value.startsWith('{')) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  }
  if (!isNaN(Number(value)) && value !== '') {
    return Number(value);
  }
  return value;
}

function readCSV(csvPath: string): any[] {
  if (!fs.existsSync(csvPath)) return [];
  
  const content = fs.readFileSync(csvPath, 'utf8').trim();
  if (!content) return [];
  
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => {
      obj[h] = parseValue(values[i] || '');
    });
    return obj;
  });
}

function writeCSV(csvPath: string, data: any[], headers: string[]) {
  const headerLine = headers.join(',');
  const rows = data.map(obj => jsonToCsvRow(obj, headers));
  fs.writeFileSync(csvPath, headerLine + '\n' + rows.join('\n') + '\n', 'utf8');
}

// ===== GET: Read data =====
export async function GET(request: NextRequest) {
  const sheetName = request.nextUrl.searchParams.get('sheet');
  if (!sheetName) return NextResponse.json({ error: 'Sheet name required' }, { status: 400 });

  try {
    const csvPath = getCSVPath(sheetName);
    const data = readCSV(csvPath);
    return NextResponse.json({ data });
  } catch (err) {
    console.error('GET Error:', err);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// ===== POST: Create new record =====
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sheet, data } = body;

    if (!sheet || !data) {
      return NextResponse.json({ error: 'Sheet and data required' }, { status: 400 });
    }

    const csvPath = getCSVPath(sheet);
    const existingData = readCSV(csvPath);

    const newRecord = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      ...data,
    };

    const allKeys = new Set<string>();
    [...existingData, newRecord].forEach(obj => {
      Object.keys(obj).forEach(k => allKeys.add(k));
    });
    const headers = Array.from(allKeys);

    // ✅ STOCK DEDUCTION for Daily Messing
    if (sheet === 'dailyMessingEntries' && data.consumedItems) {
      const stockPath = getCSVPath('stockItems');
      const stockData = readCSV(stockPath);
      
      for (const item of data.consumedItems) {
        const stockItem = stockData.find((s: any) => s.itemName === item.itemName);
        if (!stockItem) {
          return NextResponse.json({ 
            error: `Stock item "${item.itemName}" not found` 
          }, { status: 400 });
        }
        
        if (Number(stockItem.currentQuantity) < Number(item.quantity)) {
          return NextResponse.json({ 
            error: `Not enough ${item.itemName} in stock!` 
          }, { status: 400 });
        }
        
        const costDeducted = Number(item.quantity) * Number(stockItem.lastUnitCost);
        stockItem.currentQuantity = Number(stockItem.currentQuantity) - Number(item.quantity);
        stockItem.totalCost = Number(stockItem.totalCost) - costDeducted;
        stockItem.lastUnitCost = stockItem.currentQuantity > 0 
          ? stockItem.totalCost / stockItem.currentQuantity 
          : 0;
      }
      
      const stockHeaders = Array.from(new Set(stockData.flatMap(obj => Object.keys(obj))));
      writeCSV(stockPath, stockData, stockHeaders);
    }

    // ✅ STOCK DEDUCTION for Bar Counter
    if (sheet === 'barEntries' && data.wineType && data.quantity) {
      const stockPath = getCSVPath('stockItems');
      const stockData = readCSV(stockPath);
      
      const stockItem = stockData.find((s: any) => s.itemName === data.wineType);
      if (!stockItem) {
        return NextResponse.json({ 
          error: `Liquor "${data.wineType}" not found` 
        }, { status: 400 });
      }
      
      if (stockItem.currentQuantity < data.quantity) {
        return NextResponse.json({ 
          error: `Not enough ${data.wineType} in stock!` 
        }, { status: 400 });
      }
      
      const totalCost = data.quantity * stockItem.lastUnitCost;
      const costPerMember = data.sharingMembers?.length > 0 
        ? totalCost / data.sharingMembers.length 
        : 0;
      
      newRecord.totalCost = totalCost;
      newRecord.costPerMember = costPerMember;
      
      const costDeducted = data.quantity * stockItem.lastUnitCost;
      stockItem.currentQuantity -= data.quantity;
      stockItem.totalCost -= costDeducted;
      stockItem.lastUnitCost = stockItem.currentQuantity > 0 
        ? stockItem.totalCost / stockItem.currentQuantity 
        : 0;
      
      const stockHeaders = Array.from(new Set(stockData.flatMap(obj => Object.keys(obj))));
      writeCSV(stockPath, stockData, stockHeaders);
    }

    // ✅ STOCK DEDUCTION for Snacks at Bar
    if (sheet === 'snacksAtBarEntries' && data.itemName && data.quantity) {
      const stockPath = getCSVPath('stockItems');
      const stockData = readCSV(stockPath);
      
      const stockItem = stockData.find((s: any) => s.itemName === data.itemName);
      if (!stockItem) {
        return NextResponse.json({ 
          error: `Item "${data.itemName}" not found` 
        }, { status: 400 });
      }
      
      if (stockItem.currentQuantity < data.quantity) {
        return NextResponse.json({ 
          error: `Not enough ${data.itemName} in stock!` 
        }, { status: 400 });
      }
      
      const totalItemCost = data.quantity * stockItem.lastUnitCost;
      const costPerMember = data.sharingMembers?.length > 0 
        ? totalItemCost / data.sharingMembers.length 
        : 0;
      
      newRecord.totalItemCost = totalItemCost;
      newRecord.costPerMember = costPerMember;
      
      const costDeducted = data.quantity * stockItem.lastUnitCost;
      stockItem.currentQuantity -= data.quantity;
      stockItem.totalCost -= costDeducted;
      stockItem.lastUnitCost = stockItem.currentQuantity > 0 
        ? stockItem.totalCost / stockItem.currentQuantity 
        : 0;
      
      const stockHeaders = Array.from(new Set(stockData.flatMap(obj => Object.keys(obj))));
      writeCSV(stockPath, stockData, stockHeaders);
    }

    // ✅ STOCK ADDITION for Inward Log
    if (sheet === 'inwardLog' && data.itemName && data.quantity) {
      const stockPath = getCSVPath('stockItems');
      const stockData = readCSV(stockPath);
      
      const existingStock = stockData.find((s: any) => s.itemName === data.itemName);
      
      if (existingStock) {
        const newQty = existingStock.currentQuantity + data.quantity;
        const newTotalCost = existingStock.totalCost + (data.quantity * data.unitCost);
        existingStock.currentQuantity = newQty;
        existingStock.totalCost = newTotalCost;
        existingStock.lastUnitCost = newQty > 0 ? newTotalCost / newQty : 0;
        existingStock.lastReceivedDate = data.date;
        existingStock.type = data.type || existingStock.type;
      } else {
        stockData.push({ 
          id: generateId(),
          itemName: data.itemName,
          currentQuantity: data.quantity,
          unitOfMeasurement: data.unitOfMeasurement || 'units',
          lastUnitCost: data.unitCost,
          lastReceivedDate: data.date,
          totalCost: data.quantity * data.unitCost,
          itemType: data.itemType || 'Issue',
          type: data.type || 'grocery',
          timestamp: new Date().toISOString(),
        });
      }
      
      const stockHeaders = Array.from(new Set(stockData.flatMap(obj => Object.keys(obj))));
      writeCSV(stockPath, stockData, stockHeaders);
    }

    existingData.push(newRecord);
    writeCSV(csvPath, existingData, headers);

    return NextResponse.json({ success: true, id: newRecord.id });
  } catch (err) {
    console.error('POST Error:', err);
    return NextResponse.json({ error: 'Failed to add data' }, { status: 500 });
  }
}

// ✅ DELETE: Remove record (added to main route)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sheet = searchParams.get('sheet');
    const id = searchParams.get('id');

    if (!sheet || !id) {
      return NextResponse.json({ error: 'Sheet and id required' }, { status: 400 });
    }

    const csvPath = getCSVPath(sheet);
    const existingData = readCSV(csvPath);
    
    const filteredData = existingData.filter((row: any) => row.id !== id);
    
    if (filteredData.length === existingData.length) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (filteredData.length > 0) {
      const allKeys = new Set<string>();
      filteredData.forEach(obj => Object.keys(obj).forEach(k => allKeys.add(k)));
      const headers = Array.from(allKeys);
      writeCSV(csvPath, filteredData, headers);
    } else {
      const headers = Object.keys(existingData[0]);
      fs.writeFileSync(csvPath, headers.join(',') + '\n', 'utf8');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE Error:', err);
    return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 });
  }
}