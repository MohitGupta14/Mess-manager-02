import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export class GoogleSheetsService {
  private sheets;
  private spreadsheetId: string;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: SCOPES,
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID || '';
  }

  async readSheet(sheetName: string): Promise<any[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:ZZ`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) return [];

      const headers = rows[0];
      return rows.slice(1).map(row => {
        const obj: any = { id: row[0] || '' };
        headers.forEach((header, index) => {
          if (index > 0) {
            obj[header] = row[index] || '';
          }
        });
        return obj;
      });
    } catch (error) {
      console.error(`Error reading sheet ${sheetName}:`, error);
      return [];
    }
  }

  async appendRow(sheetName: string, values: any[]): Promise<boolean> {
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:A`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values],
        },
      });
      return true;
    } catch (error) {
      console.error(`Error appending to sheet ${sheetName}:`, error);
      return false;
    }
  }

  async updateRow(sheetName: string, rowIndex: number, values: any[]): Promise<boolean> {
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A${rowIndex}:ZZ${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values],
        },
      });
      return true;
    } catch (error) {
      console.error(`Error updating sheet ${sheetName}:`, error);
      return false;
    }
  }

  async deleteRow(sheetName: string, rowIndex: number): Promise<boolean> {
    try {
      const sheetId = await this.getSheetId(sheetName);
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1,
                  endIndex: rowIndex,
                },
              },
            },
          ],
        },
      });
      return true;
    } catch (error) {
      console.error(`Error deleting row from sheet ${sheetName}:`, error);
      return false;
    }
  }

  private async getSheetId(sheetName: string): Promise<number> {
    const response = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });

    const sheet = response.data.sheets?.find(
      s => s.properties?.title === sheetName
    );

    return sheet?.properties?.sheetId || 0;
  }

  async findRowIndex(sheetName: string, id: string): Promise<number> {
    const rows = await this.readSheet(sheetName);
    return rows.findIndex(row => row.id === id) + 2; // +2 because of header and 0-indexing
  }
}

export const sheetsService = new GoogleSheetsService();