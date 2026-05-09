/**
 * Excel Parser Utility
 * Extracts roll numbers from Excel files for bulk attendance marking
 */

import * as XLSX from 'xlsx';

export interface ParsedAttendanceData {
  rollNumbers: string[];
  rawData: any[];
  sheetName: string;
  rowCount: number;
}

/**
 * Parse Excel file and extract roll numbers
 * Expects Excel to have a column named "Roll Number" or "roll_number" or similar
 * @param base64Content - Base64 encoded Excel file content
 * @param fileName - File name for error context
 * @returns Parsed attendance data with roll numbers
 */
export function parseExcelForAttendance(
  base64Content: string,
  fileName: string
): ParsedAttendanceData {
  try {
    // Convert base64 to binary string
    const binaryStr = atob(base64Content);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Read Excel workbook
    const workbook = XLSX.read(bytes, { type: 'array' });
    
    if (!workbook.SheetNames.length) {
      throw new Error('Excel file has no sheets');
    }

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (!jsonData.length) {
      throw new Error('Excel sheet is empty');
    }

    // Find roll number column (try common variations)
    const rollNumberColumnNames = [
      'Roll Number',
      'roll_number',
      'Roll',
      'roll',
      'RollNumber',
      'rollNumber',
      'Student Roll',
      'Roll No',
      'rollNo',
      'Roll_No',
      'Registration No',
      'registration_no',
      'Reg No',
      'Student ID',
      'student_id',
    ];

    let rollNumberColumn: string | null = null;
    const firstRow = jsonData[0];
    const headers = Object.keys(firstRow);

    for (const columnName of rollNumberColumnNames) {
      const found = headers.find(
        (h) => h.toLowerCase() === columnName.toLowerCase()
      );
      if (found) {
        rollNumberColumn = found;
        break;
      }
    }

    if (!rollNumberColumn) {
      throw new Error(
        `Could not find roll number column. Available columns: ${headers.join(
          ', '
        )}`
      );
    }

    // Extract roll numbers and clean them
    const rollNumbers: string[] = [];
    for (const row of jsonData) {
      const rollValue = row[rollNumberColumn];
      if (rollValue !== null && rollValue !== undefined && rollValue !== '') {
        // Convert to string and trim
        const rollStr = String(rollValue).trim();
        if (rollStr.length > 0) {
          rollNumbers.push(rollStr);
        }
      }
    }

    if (!rollNumbers.length) {
      throw new Error('No valid roll numbers found in Excel sheet');
    }

    return {
      rollNumbers,
      rawData: jsonData,
      sheetName,
      rowCount: jsonData.length,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse Excel file (${fileName}): ${error.message}`);
    }
    throw new Error(`Failed to parse Excel file (${fileName})`);
  }
}

/**
 * Match roll numbers from Excel with student records
 * @param excelRollNumbers - Roll numbers from Excel
 * @param students - Student records with roll numbers
 * @returns Map of student IDs to match with roll numbers
 */
export function matchRollNumbersWithStudents(
  excelRollNumbers: string[],
  students: Array<{ id: number; roll_number?: string; name: string }>
): Array<{ studentId: number; rollNumber: string; studentName: string }> {
  const matches: Array<{ studentId: number; rollNumber: string; studentName: string }> = [];

  for (const excelRoll of excelRollNumbers) {
    const student = students.find(
      (s) => s.roll_number?.toLowerCase() === excelRoll.toLowerCase()
    );

    if (student) {
      matches.push({
        studentId: student.id,
        rollNumber: excelRoll,
        studentName: student.name,
      });
    }
  }

  return matches;
}
