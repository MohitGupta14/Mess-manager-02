import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_ROOT = path.join(process.cwd(), 'data');

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
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    // Read the current content
    const content = fs.readFileSync(csvPath, 'utf8').trim();
    const [headerLine, ...lines] = content.split('\n');
    const headers = headerLine.split(',');

    // Find the row to update
    const updatedLines = lines.map((line) => {
      const values = line.split(',');
      const row: Record<string, any> = {};
      headers.forEach((h, i) => {
        row[h] = values[i].replace(/^"|"$/g, '');
      });

      if (row.id === id) {
        // Keep the id and update other fields
        return jsonToCsvRow({ ...data, id });
      }
      return line;
    });

    // Write back to file
    fs.writeFileSync(csvPath, [headerLine, ...updatedLines].join('\n') + '\n', 'utf8');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to update data' },
      { status: 500 }
    );
  }
}
