import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs';
import path from 'path';

const DESKTOP_PATH = path.join(os.homedir(), 'Desktop');

// Create a folder named "mess-data" (or anything you prefer)
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

// Convert JSON object to CSV row
function jsonToCsvRow(obj: Record<string, any>) {
  return Object.values(obj)
    .map((v) => `"${v?.toString().replace(/"/g, '""') || ''}"`)
    .join(',');
}

// Convert keys to CSV header row
function jsonToCsvHeader(obj: Record<string, any>) {
  return Object.keys(obj).join(',');
}

export async function POST(request: NextRequest) {
  try {
    const { sheet, data } = await request.json();
    if (!sheet || !data) return NextResponse.json({ error: 'Sheet and data required' }, { status: 400 });

    const csvPath = getCSVPath(sheet);

    // ✅ If file doesn’t exist, create with headers first
    if (!fs.existsSync(csvPath)) {
      const header = jsonToCsvHeader(data);
      fs.writeFileSync(csvPath, header + '\n', 'utf8');
    }

    // Append new row
    const row = jsonToCsvRow(data);
    fs.appendFileSync(csvPath, row + '\n', 'utf8');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to add data' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const sheetName = request.nextUrl.searchParams.get('sheet');
  if (!sheetName) return NextResponse.json({ error: 'Sheet name required' }, { status: 400 });

  try {
    const csvPath = getCSVPath(sheetName);
    if (!fs.existsSync(csvPath)) return NextResponse.json({ data: [] });

    const content = fs.readFileSync(csvPath, 'utf8').trim();
    const [headerLine, ...lines] = content.split('\n');
    const headers = headerLine.split(',');

    const data = lines.map((line) => {
      const values = line.split(',');
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => {
        obj[h] = values[i].replace(/^"|"$/g, ''); // remove quotes
      });
      return obj;
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
