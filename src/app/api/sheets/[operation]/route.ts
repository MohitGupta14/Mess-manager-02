// ===== FILE: src/app/api/sheets/[operation]/route.ts =====
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

// ✅ FIXED: Proper value serialization
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

// ✅ FIXED: Proper CSV parsing
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

// ===== PUT: Update existing record =====
export async function PUT(
  request: NextRequest,
  { params }: { params: { operation: string } }
) {
  console.log('PUT request for operation:', params.operation);
  
  if (params.operation !== 'update') {
    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
  }

  try {
    const { sheet, id, data } = await request.json();
    
    if (!sheet || !id || !data) {
      return NextResponse.json(
        { error: 'Sheet, id, and data required' },
        { status: 400 }
      );
    }

    const csvPath = getCSVPath(sheet);
    const existingData = readCSV(csvPath);
    
    if (existingData.length === 0) {
      return NextResponse.json({ error: 'Sheet not found or empty' }, { status: 404 });
    }

    // Find the record to update
    const index = existingData.findIndex((row: any) => row.id === id);
    
    if (index === -1) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // ✅ Merge existing data with new data, preserve ID
    existingData[index] = { 
      ...existingData[index], 
      ...data, 
      id // Ensure ID doesn't change
    };

    // Get all unique headers
    const allKeys = new Set<string>();
    existingData.forEach(obj => Object.keys(obj).forEach(k => allKeys.add(k)));
    const headers = Array.from(allKeys);

    // Write back to CSV
    writeCSV(csvPath, existingData, headers);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT Error:', err);
    return NextResponse.json(
      { error: 'Failed to update data' },
      { status: 500 }
    );
  }
}

// ===== DELETE: Remove record =====
export async function DELETE(
  request: NextRequest,
  { params }: { params: { operation: string } }
) {
  console.log('DELETE request for operation:', params.operation);
  
  if (params.operation !== 'delete') {
    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const sheet = searchParams.get('sheet');
    const id = searchParams.get('id');

    if (!sheet || !id) {
      return NextResponse.json(
        { error: 'Sheet and id required' },
        { status: 400 }
      );
    }

    const csvPath = getCSVPath(sheet);
    const existingData = readCSV(csvPath);
    
    if (existingData.length === 0) {
      return NextResponse.json({ error: 'Sheet not found or empty' }, { status: 404 });
    }

    // Filter out the record to delete
    const filteredData = existingData.filter((row: any) => row.id !== id);
    
    if (filteredData.length === existingData.length) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // Get headers from remaining data
    if (filteredData.length > 0) {
      const allKeys = new Set<string>();
      filteredData.forEach(obj => Object.keys(obj).forEach(k => allKeys.add(k)));
      const headers = Array.from(allKeys);
      writeCSV(csvPath, filteredData, headers);
    } else {
      // If no data left, keep only the header
      const headers = Object.keys(existingData[0]);
      fs.writeFileSync(csvPath, headers.join(',') + '\n', 'utf8');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE Error:', err);
    return NextResponse.json(
      { error: 'Failed to delete data' },
      { status: 500 }
    );
  }
}

// ===== Optional: Handle other operations =====
export async function POST(
  request: NextRequest,
  { params }: { params: { operation: string } }
) {
  return NextResponse.json(
    { error: 'POST not supported on this endpoint. Use /api/sheets instead.' },
    { status: 405 }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { operation: string } }
) {
  return NextResponse.json(
    { error: 'GET not supported on this endpoint. Use /api/sheets instead.' },
    { status: 405 }
  );
}