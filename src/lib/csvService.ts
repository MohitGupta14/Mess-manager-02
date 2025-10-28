import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const CSV_DIR = path.join(process.cwd(), 'csvs'); // folder for CSV files

export class CsvService {
  constructor(private csvDir: string = CSV_DIR) {
    if (!fs.existsSync(this.csvDir)) fs.mkdirSync(this.csvDir, { recursive: true });
  }

  private getFilePath(sheetName: string) {
    return path.join(this.csvDir, `${sheetName}.csv`);
  }

  async readSheet(sheetName: string): Promise<any[]> {
    const filePath = this.getFilePath(sheetName);
    if (!fs.existsSync(filePath)) return [];

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const rows = parse(fileContent, { columns: true, skip_empty_lines: true });
    return rows;
  }

  async appendRow(sheetName: string, values: any[]): Promise<boolean> {
    const filePath = this.getFilePath(sheetName);
    let rows = await this.readSheet(sheetName);

    // if no rows yet, create header from values keys
    if (rows.length === 0 && values.length > 0) {
      const headerObj: any = {};
      values.forEach((v, i) => (headerObj[`col${i}`] = v));
      rows.push(headerObj);
    } else {
      const headers = Object.keys(rows[0]);
      const rowObj: any = {};
      headers.forEach((h, i) => (rowObj[h] = values[i] ?? ''));
      rows.push(rowObj);
    }

    const csvString = stringify(rows, { header: true });
    fs.writeFileSync(filePath, csvString);
    return true;
  }

  async updateRow(sheetName: string, rowIndex: number, values: any[]): Promise<boolean> {
    const rows = await this.readSheet(sheetName);
    if (rowIndex < 0 || rowIndex >= rows.length) return false;

    const headers = Object.keys(rows[0]);
    const rowObj: any = {};
    headers.forEach((h, i) => (rowObj[h] = values[i] ?? ''));
    rows[rowIndex] = rowObj;

    const csvString = stringify(rows, { header: true });
    fs.writeFileSync(this.getFilePath(sheetName), csvString);
    return true;
  }

  async deleteRow(sheetName: string, rowIndex: number): Promise<boolean> {
    const rows = await this.readSheet(sheetName);
    if (rowIndex < 0 || rowIndex >= rows.length) return false;

    rows.splice(rowIndex, 1);
    const csvString = stringify(rows, { header: true });
    fs.writeFileSync(this.getFilePath(sheetName), csvString);
    return true;
  }

  async findRowIndex(sheetName: string, id: string): Promise<number> {
    const rows = await this.readSheet(sheetName);
    return rows.findIndex(row => row.id === id);
  }
}

export const sheetsService = new CsvService();
