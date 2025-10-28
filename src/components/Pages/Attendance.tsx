// ===== FILE: src/components/Pages/Attendance.tsx =====
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useMessData } from '@/hooks/useMessData';
import { AttendanceStatus } from '@/lib/types';

interface AttendanceProps {
  displayModal: (text: string, type: string) => void;
}

export default function Attendance({ displayModal }: AttendanceProps) {
  const { data: messMembers } = useMessData('messMembers');
  const { data: attendanceEntries, addData, updateData } = useMessData('attendanceEntries');
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});

  useEffect(() => {
    const existingEntry = attendanceEntries.find(entry => entry.date === selectedDate);
    const initialAttendance: Record<string, AttendanceStatus> = {};
    
    messMembers.forEach(member => {
      if (existingEntry && existingEntry.attendance) {
        const parsedAttendance = typeof existingEntry.attendance === 'string' 
          ? JSON.parse(existingEntry.attendance) 
          : existingEntry.attendance;
        initialAttendance[member.memberId] = parsedAttendance[member.memberId] || 'Veg';
      } else {
        initialAttendance[member.memberId] = 'Veg';
      }
    });
    
    setAttendance(initialAttendance);
  }, [selectedDate, attendanceEntries, messMembers]);

  const handleStatusChange = (memberId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [memberId]: status }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const existingEntry = attendanceEntries.find(entry => entry.date === selectedDate);
    
    const result = existingEntry
      ? await updateData(existingEntry.id, { attendance: JSON.stringify(attendance) })
      : await addData({ date: selectedDate, attendance: JSON.stringify(attendance) });

    if (result.success) {
      displayModal(`Attendance for ${selectedDate} saved successfully!`, 'success');
    } else {
      displayModal(result.error || 'Failed to save attendance', 'error');
    }
  };

  const { monthlySummary, totals } = useMemo(() => {
    const [year, month] = selectedDate.split('-').map(Number);
    
    const summary: Record<string, { name: string; Veg: number; 'Non-Veg': number; 'Egg-Veg': number; OUT: number }> = {};
    messMembers.forEach(member => {
      summary[member.memberId] = { name: member.name, 'Veg': 0, 'Non-Veg': 0, 'Egg-Veg': 0, 'OUT': 0 };
    });

    const monthlyEntries = attendanceEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === year && entryDate.getMonth() + 1 === month;
    });

    monthlyEntries.forEach(entry => {
      const parsedAttendance = typeof entry.attendance === 'string' 
        ? JSON.parse(entry.attendance) 
        : entry.attendance;
        
      Object.entries(parsedAttendance).forEach(([memberId, status]) => {
        if (summary[memberId] && status) {
          summary[memberId][status as AttendanceStatus] = (summary[memberId][status as AttendanceStatus] || 0) + 1;
        }
      });
    });
    
    const summaryArray = Object.values(summary);
    const totals = { 'Veg': 0, 'Non-Veg': 0, 'Egg-Veg': 0, 'OUT': 0 };
    summaryArray.forEach(memberSummary => {
      totals['Veg'] += memberSummary['Veg'];
      totals['Non-Veg'] += memberSummary['Non-Veg'];
      totals['Egg-Veg'] += memberSummary['Egg-Veg'];
      totals['OUT'] += memberSummary['OUT'];
    });

    return { monthlySummary: summaryArray, totals };
  }, [selectedDate, attendanceEntries, messMembers]);

  const attendanceTypes: AttendanceStatus[] = ['Veg', 'Non-Veg', 'Egg-Veg', 'OUT'];

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-8">Member Attendance</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Attendance Form */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-md">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center space-x-4">
              <label htmlFor="attendanceDate" className="text-lg font-medium text-gray-700">Date:</label>
              <input 
                type="date" 
                id="attendanceDate" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
                className="p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                required 
              />
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {messMembers.map(member => (
                <div key={member.id} className="bg-white p-3 rounded-lg shadow-sm border flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-semibold text-gray-800 mb-2 sm:mb-0 sm:w-1/3">{member.name}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {attendanceTypes.map(type => (
                      <label 
                        key={type} 
                        className={`relative flex items-center justify-center text-sm cursor-pointer p-2 rounded-md border-2 transition-all duration-200 ${
                          attendance[member.memberId] === type 
                            ? 'bg-blue-100 border-blue-500 font-bold text-blue-700' 
                            : 'bg-white border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name={`status-${member.memberId}`} 
                          value={type} 
                          checked={attendance[member.memberId] === type} 
                          onChange={() => handleStatusChange(member.memberId, type)} 
                          className="absolute opacity-0 w-full h-full"
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center pt-4">
              <button type="submit" className="w-full sm:w-auto px-10 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-transform transform hover:scale-105">
                Save Attendance
              </button>
            </div>
          </form>
        </div>

        {/* Monthly Summary Table */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-md">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 text-center">
            Monthly Summary for {new Date(selectedDate).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
              <thead className="bg-blue-100">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Member Name</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Veg</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Non-Veg</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Egg-Veg</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">OUT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {monthlySummary.map(summary => (
                  <tr key={summary.name} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{summary.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-center">{summary['Veg']}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-center">{summary['Non-Veg']}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-center">{summary['Egg-Veg']}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-center">{summary['OUT']}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-blue-200">
                <tr className="font-bold text-gray-800">
                  <td className="py-3 px-4 text-sm">Total</td>
                  <td className="py-3 px-4 text-sm text-center">{totals['Veg']}</td>
                  <td className="py-3 px-4 text-sm text-center">{totals['Non-Veg']}</td>
                  <td className="py-3 px-4 text-sm text-center">{totals['Egg-Veg']}</td>
                  <td className="py-3 px-4 text-sm text-center">{totals['OUT']}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}