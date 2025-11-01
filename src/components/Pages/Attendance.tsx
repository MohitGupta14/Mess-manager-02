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
  // New UI states for scalable views
  const [viewMode, setViewMode] = useState<'summary' | 'member'>('summary');
  const [rangeStart, setRangeStart] = useState<string>(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [rangeEnd, setRangeEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  useEffect(() => {
    const existingEntry = attendanceEntries.find(entry => entry.date === selectedDate);
    const initialAttendance: Record<string, AttendanceStatus> = {};
    
    messMembers.forEach(member => {
      const key = (member as any).memberId ?? (member as any).id;
      if (existingEntry && existingEntry.attendance) {
        const parsedAttendance = typeof existingEntry.attendance === 'string'
          ? JSON.parse(existingEntry.attendance)
          : existingEntry.attendance;
        // If stored value is array, pick last entry as default; otherwise use stored string or default Veg
        const stored = parsedAttendance[key];
        if (Array.isArray(stored)) {
          initialAttendance[key] = (stored[stored.length - 1] as AttendanceStatus) || 'Veg';
        } else {
          initialAttendance[key] = (stored as AttendanceStatus) || 'Veg';
        }
      } else {
        initialAttendance[key] = 'Veg';
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
    // Merge logic: if existing entry stores arrays for a member, preserve/append instead of overwriting
    if (existingEntry && existingEntry.attendance) {
      const parsedAttendance = typeof existingEntry.attendance === 'string' ? JSON.parse(existingEntry.attendance) : existingEntry.attendance;
      const merged: Record<string, any> = { ...parsedAttendance };
      Object.entries(attendance).forEach(([memberKey, status]) => {
        const existingVal = parsedAttendance[memberKey];
        if (Array.isArray(existingVal)) {
          // append if not present
          if (!existingVal.includes(status)) merged[memberKey] = [...existingVal, status];
          else merged[memberKey] = existingVal;
        } else if (existingVal && existingVal !== status) {
          // convert to array to preserve history
          merged[memberKey] = [existingVal, status];
        } else {
          merged[memberKey] = status;
        }
      });

      const result = await updateData(existingEntry.id, { attendance: JSON.stringify(merged) });
      if (result.success) {
        displayModal(`Attendance for ${selectedDate} saved successfully!`, 'success');
      } else {
        displayModal(result.error || 'Failed to save attendance', 'error');
      }
      return;
    }

    const result = await addData({ date: selectedDate, attendance: JSON.stringify(attendance) });

    if (result.success) {
      displayModal(`Attendance for ${selectedDate} saved successfully!`, 'success');
    } else {
      displayModal(result.error || 'Failed to save attendance', 'error');
    }
  };

  // Compute summaries over a selectable date range for better scalability
  const { rangeSummary, totals } = useMemo(() => {
    const start = rangeStart;
    const end = rangeEnd;

    const summary: Record<string, { memberId: string; name: string; Veg: number; 'Non-Veg': number; 'Egg-Veg': number; OUT: number }> = {};
    messMembers.forEach(member => {
      const key = (member as any).memberId ?? (member as any).id;
      summary[key] = { memberId: key, name: member.name, 'Veg': 0, 'Non-Veg': 0, 'Egg-Veg': 0, 'OUT': 0 };
    });

    const filteredEntries = attendanceEntries.filter(entry => entry.date >= start && entry.date <= end);

    // memberDateStatus: memberId -> [{date, status}]
    const memberDateStatus: Record<string, Array<{ date: string; status: AttendanceStatus }>> = {};

    filteredEntries.forEach(entry => {
      const parsedAttendance = typeof entry.attendance === 'string' ? JSON.parse(entry.attendance) : entry.attendance;
      Object.entries(parsedAttendance).forEach(([memberId, status]) => {
        if (!summary[memberId]) return; // skip unknown members
        // status can be string or array (history). Normalize to array to count all occurrences
        const statuses = Array.isArray(status) ? status : [status];
        statuses.forEach(s => {
          if (s) {
            summary[memberId][s as AttendanceStatus] = (summary[memberId][s as AttendanceStatus] || 0) + 1;
            if (!memberDateStatus[memberId]) memberDateStatus[memberId] = [];
            memberDateStatus[memberId].push({ date: entry.date, status: s as AttendanceStatus });
          }
        });
      });
    });

    const summaryArray = Object.values(summary).map(s => ({ ...s, dates: memberDateStatus[s.memberId] || [] }));

    const totals = { 'Veg': 0, 'Non-Veg': 0, 'Egg-Veg': 0, 'OUT': 0 } as Record<string, number>;
    summaryArray.forEach(memberSummary => {
      totals['Veg'] += memberSummary['Veg'];
      totals['Non-Veg'] += memberSummary['Non-Veg'];
      totals['Egg-Veg'] += memberSummary['Egg-Veg'];
      totals['OUT'] += memberSummary['OUT'];
    });

    return { rangeSummary: summaryArray, totals };
  }, [rangeStart, rangeEnd, attendanceEntries, messMembers]);

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

        {/* Summary / Member View Panel */}
        <div className="bg-gray-50 p-4 rounded-lg shadow-md">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('summary')}
                className={`px-3 py-1 rounded ${viewMode === 'summary' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                Summary
              </button>
              <button
                onClick={() => setViewMode('member')}
                className={`px-3 py-1 rounded ${viewMode === 'member' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                Member View
              </button>
            
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm">From</label>
              <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} className="p-2 border rounded-md w-36 max-w-full" />
              <label className="text-sm">To</label>
              <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} className="p-2 border rounded-md w-36 max-w-full" />
            </div>
          </div>

          <div className="mb-4 flex items-center gap-3">
            <input
              placeholder="Search member"
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              className="p-2 border rounded w-full md:w-1/2"
            />
            <div className="text-sm text-gray-600">Showing {rangeSummary.length} members</div>
          </div>

          {viewMode === 'summary' ? (
            <div className="overflow-x-auto">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Summary for {new Date(rangeStart).toLocaleDateString()} — {new Date(rangeEnd).toLocaleDateString()}</h3>
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
                  {rangeSummary
                    .filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()))
                    .map(summary => (
                      <tr key={summary.memberId} className="hover:bg-gray-50">
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
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Member View</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                {rangeSummary
                  .filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()))
                  .map(member => (
                    <div key={member.memberId} className="p-3 bg-white rounded shadow-sm border">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{member.name}</div>
                          <div className="text-sm text-gray-600">Veg: {member['Veg']} • Non-Veg: {member['Non-Veg']} • Egg-Veg: {member['Egg-Veg']} • OUT: {member['OUT']}</div>
                        </div>
                        <div>
                          <button onClick={() => setExpandedMemberId(expandedMemberId === member.memberId ? null : member.memberId)} className="px-3 py-1 bg-blue-600 text-white rounded">{expandedMemberId === member.memberId ? 'Hide' : 'Details'}</button>
                        </div>
                      </div>
                      {expandedMemberId === member.memberId && (
                        <div className="mt-3 text-sm text-gray-700">
                          <div className="font-medium mb-1">Dates</div>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {(member.dates || []).sort((a,b)=>a.date.localeCompare(b.date)).map(d => (
                              <div key={d.date} className="flex justify-between">
                                <div>{d.date}</div>
                                <div className={`px-2 rounded ${d.status === 'OUT' ? 'bg-red-100 text-red-700' : 'bg-green-50 text-green-700'}`}>{d.status}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Fullscreen overlay
      {fullScreenOpen && (
        <div className="fixed inset-0 z-50 bg-white bg-opacity-95 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Full Screen Attendance</h2>
              <div className="text-sm text-gray-600">Range: {new Date(rangeStart).toLocaleDateString()} — {new Date(rangeEnd).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <select value={fullScreenMemberId || ''} onChange={e => setFullScreenMemberId(e.target.value)} className="p-2 border rounded-md">
                <option value="">Select member</option>
                {messMembers.map(m => {
                  const key = (m as any).memberId ?? (m as any).id;
                  return <option key={key} value={key}>{m.name}</option>;
                })}
              </select>
              <button onClick={() => setFullScreenOpen(false)} className="px-3 py-1 bg-red-600 text-white rounded-md">Close</button>
            </div>
          </div>

          <div>
            {fullScreenMemberId ? (
              (() => {
                const memberRow = rangeSummary.find(r => r.memberId === fullScreenMemberId);
                const statusMap: Record<string, string> = {};
                (memberRow?.dates || []).forEach(d => { statusMap[d.date] = d.status; });
                return (
                  <div>
                    <div className="grid grid-cols-7 gap-2">
                      {datesInRange.map(date => {
                        const st = statusMap[date] || '—';
                        const color = st === 'OUT' ? 'bg-red-100 text-red-700' : st === 'Veg' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700';
                        return (
                          <div key={date} className="p-3 border rounded text-center text-sm">
                            <div className="font-medium">{new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                            <div className={`mt-1 inline-block px-2 py-1 rounded ${st === '—' ? 'bg-gray-100 text-gray-600' : color}`}>{st}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-sm text-gray-600">Select a member to view detailed attendance.</div>
            )}
          </div>
        </div>
      )} */}
    </div>
  );
}