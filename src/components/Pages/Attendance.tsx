"use client";

import { useState, useEffect, useMemo } from "react";
import { useMessData } from "@/hooks/useMessData";
import { Search, Users, Calendar, Save } from "lucide-react";

type AttendanceStatus = "None" | "Veg" | "Non-Veg" | "Egg-Veg" | "OUT";

interface MessMember {
  id: string;
  memberId: string;
  name: string;
  [key: string]: any;
}

interface AttendanceProps {
  displayModal: (text: string, type: string) => void;
}

export default function Attendance({ displayModal }: AttendanceProps) {
  const { data: messMembers } = useMessData("messMembers");
  const {
    data: attendanceEntries,
    addData,
    updateData,
  } = useMessData("attendanceEntries");

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});

  // Track if the form has been modified by the user
  const [isDirty, setIsDirty] = useState(false);

  const [viewMode, setViewMode] = useState<"summary" | "member">("summary");
  const [rangeStart, setRangeStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [rangeEnd, setRangeEnd] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const [dailySearchTerm, setDailySearchTerm] = useState("");
  // Default Quick Mark to 'Veg' as it's the most common action, but None is default state
  const [quickMarkStatus, setQuickMarkStatus] =
    useState<AttendanceStatus>("Veg");

  // Reset dirty flag when date changes
  useEffect(() => {
    setIsDirty(false);
    // Optional: Clear attendance visually immediately to prevent stale data flicker
    setAttendance({});
  }, [selectedDate]);

  // Load Data Effect
  useEffect(() => {
    // If the user has started editing (isDirty), DO NOT overwrite their work with background data re-fetches.
    if (isDirty) return;

    const existingEntry = attendanceEntries.find(
      (entry) => entry.date === selectedDate
    );
    const initialAttendance: Record<string, AttendanceStatus> = {};

    messMembers.forEach((member) => {
      const key = String(member.memberId ?? member.id);
      let defaultStatus: AttendanceStatus = "None";

      if (existingEntry && existingEntry.attendance) {
        const parsedAttendance =
          typeof existingEntry.attendance === "string"
            ? JSON.parse(existingEntry.attendance)
            : existingEntry.attendance;

        const stored = parsedAttendance[key];

        if (stored) {
          defaultStatus = Array.isArray(stored)
            ? (stored[stored.length - 1] as AttendanceStatus) || "None"
            : (stored as AttendanceStatus);
        }
      }

      initialAttendance[key] = defaultStatus;
    });

    setAttendance(initialAttendance);
  }, [selectedDate, attendanceEntries, messMembers, isDirty]);

  const attendanceTypes: AttendanceStatus[] = [
    "None",
    "Veg",
    "Non-Veg",
    "Egg-Veg",
    "OUT",
  ];

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleStatusChange = (memberId: string, status: AttendanceStatus) => {
    markDirty();
    setAttendance((prev) => ({ ...prev, [memberId]: status }));
  };

  const handleToggleAllFiltered = () => {
    markDirty();
    const isAllFilteredSetToQuickMark = filteredDailyMembers.every(
      (m) => attendance[String(m.memberId)] === quickMarkStatus
    );
    const newAttendance = { ...attendance };

    filteredDailyMembers.forEach((member) => {
      const id = String(member.memberId);
      if (isAllFilteredSetToQuickMark) {
        newAttendance[id] = "None"; // Toggle off to neutral
      } else {
        newAttendance[id] = quickMarkStatus;
      }
    });
    setAttendance(newAttendance);
  };

  const handleSelectAll = () => {
    markDirty();
    const allMembers = messMembers.map((m) => String(m.memberId));
    const allSetToQuickMark = allMembers.every(
      (id) => attendance[id] === quickMarkStatus
    );

    const newAttendance = { ...attendance };
    allMembers.forEach((id) => {
      newAttendance[id] = allSetToQuickMark ? "None" : quickMarkStatus;
    });
    setAttendance(newAttendance);
  };

  const handleSave = async () => {
    const existingEntry = attendanceEntries.find(
      (entry) => entry.date === selectedDate
    );

    const currentAttendanceForSave: Record<string, AttendanceStatus> = {};
    messMembers.forEach((member) => {
      const key = String(member.memberId ?? member.id);
      currentAttendanceForSave[key] = attendance[key] || "None";
    });

    if (existingEntry) {
      const parsedAttendance =
        typeof existingEntry.attendance === "string"
          ? JSON.parse(existingEntry.attendance)
          : existingEntry.attendance;
      const merged: Record<string, any> = { ...parsedAttendance };

      Object.entries(currentAttendanceForSave).forEach(
        ([memberKey, status]) => {
          const existingVal = parsedAttendance[memberKey];
          if (Array.isArray(existingVal)) {
            if (!existingVal.includes(status))
              merged[memberKey] = [...existingVal, status];
          } else if (existingVal && existingVal !== status) {
            merged[memberKey] = [existingVal, status];
          } else {
            merged[memberKey] = status;
          }
        }
      );

      const result = await updateData(existingEntry.id, {
        attendance: JSON.stringify(merged),
      });
      if (result.success) {
        displayModal(`Attendance updated successfully!`, "success");
        setIsDirty(false); // Reset dirty flag on successful save
      } else {
        displayModal(result.error || "Failed to update attendance", "error");
      }
      return;
    }

    const result = await addData({
      date: selectedDate,
      attendance: JSON.stringify(currentAttendanceForSave),
    });

    if (result.success) {
      displayModal(`Attendance saved successfully!`, "success");
      setIsDirty(false); // Reset dirty flag on successful save
    } else {
      displayModal(result.error || "Failed to save attendance", "error");
    }
  };

  // --- Summary Calculation ---
  const { rangeSummary, totals } = useMemo(() => {
    const start = rangeStart;
    const end = rangeEnd;

    const summary: Record<
      string,
      {
        memberId: string;
        name: string;
        None: number;
        Veg: number;
        "Non-Veg": number;
        "Egg-Veg": number;
        OUT: number;
        dates?: Array<{ date: string; status: AttendanceStatus }>;
      }
    > = {};

    messMembers.forEach((member) => {
      const key = String(member.memberId ?? member.id);
      summary[key] = {
        memberId: key,
        name: member.name,
        None: 0,
        Veg: 0,
        "Non-Veg": 0,
        "Egg-Veg": 0,
        OUT: 0,
      };
    });

    const filteredEntries = attendanceEntries.filter(
      (entry) => entry.date >= start && entry.date <= end
    );

    const memberDateStatus: Record<
      string,
      Array<{ date: string; status: AttendanceStatus }>
    > = {};

    filteredEntries.forEach((entry) => {
      const parsedAttendance =
        typeof entry.attendance === "string"
          ? JSON.parse(entry.attendance)
          : entry.attendance;

      Object.entries(parsedAttendance).forEach(([memberId, status]) => {
        if (!summary[memberId]) return;

        const statuses = Array.isArray(status) ? status : [status];
        statuses.forEach((s) => {
          if (s) {
            const statusKey = s as AttendanceStatus;
            summary[memberId][statusKey] =
              (summary[memberId][statusKey] || 0) + 1;

            if (!memberDateStatus[memberId]) memberDateStatus[memberId] = [];
            memberDateStatus[memberId].push({
              date: entry.date,
              status: statusKey,
            });
          }
        });
      });
    });

    const summaryArray = Object.values(summary).map((s) => ({
      ...s,
      dates: memberDateStatus[s.memberId] || [],
    }));

    const totals = {
      None: 0,
      Veg: 0,
      "Non-Veg": 0,
      "Egg-Veg": 0,
      OUT: 0,
    } as Record<string, number>;
    summaryArray.forEach((memberSummary) => {
      totals["None"] += memberSummary["None"];
      totals["Veg"] += memberSummary["Veg"];
      totals["Non-Veg"] += memberSummary["Non-Veg"];
      totals["Egg-Veg"] += memberSummary["Egg-Veg"];
      totals["OUT"] += memberSummary["OUT"];
    });

    return { rangeSummary: summaryArray, totals };
  }, [rangeStart, rangeEnd, attendanceEntries, messMembers]);

  const filteredDailyMembers = useMemo(() => {
    const term = dailySearchTerm.toLowerCase().trim();
    if (!term) return messMembers;
    return messMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        String(m.memberId ?? m.id)
          .toLowerCase()
          .includes(term)
    );
  }, [messMembers, dailySearchTerm]);

  // Styles
  const getStatusClasses = (status: AttendanceStatus) => {
    const base =
      "flex items-center justify-between p-2 rounded-lg font-medium transition-all duration-150 border cursor-pointer";

    // None (Default) is now Neutral/Grey
    if (status === "None")
      return `${base} bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:border-gray-300`;

    // Active states
    if (status === "Veg")
      return `${base} bg-green-100 text-green-800 border-green-300 shadow-sm`;
    if (status === "OUT")
      return `${base} bg-red-100 text-red-800 border-red-300 shadow-sm`;
    if (status === "Non-Veg")
      return `${base} bg-orange-100 text-orange-800 border-orange-300 shadow-sm`;
    if (status === "Egg-Veg")
      return `${base} bg-yellow-100 text-yellow-800 border-yellow-300 shadow-sm`;

    return base;
  };

  const getQuickMarkButtonClasses = (type: AttendanceStatus) => {
    const isSelected = quickMarkStatus === type;
    const base =
      "px-3 py-1.5 text-xs sm:text-sm rounded-lg font-semibold transition-all duration-150 border";

    if (isSelected) {
      if (type === "None")
        return `${base} bg-gray-600 text-white border-gray-700`;
      if (type === "Veg")
        return `${base} bg-green-600 text-white border-green-700`;
      if (type === "OUT") return `${base} bg-red-600 text-white border-red-700`;
      if (type === "Non-Veg")
        return `${base} bg-orange-600 text-white border-orange-700`;
      if (type === "Egg-Veg")
        return `${base} bg-yellow-500 text-white border-yellow-600`;
    }
    return `${base} bg-white text-gray-600 border-gray-200 hover:bg-gray-50`;
  };

  const filteredRangeSummary = rangeSummary.filter((m) =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-8">
        Member Attendance
      </h1>

      {/* Container for Layout with Fixed Height */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[80vh] min-h-[600px]">
        {/* === LEFT COLUMN: Daily Attendance Form === */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-md flex flex-col h-full border border-gray-100 overflow-hidden">
          <div className="space-y-4 flex flex-col h-full overflow-hidden">
            {/* Date Picker */}
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
              <Calendar className="w-5 h-5 text-blue-600" />
              <label
                htmlFor="attendanceDate"
                className="text-sm font-medium text-gray-700 whitespace-nowrap"
              >
                Date:
              </label>
              <input
                type="date"
                id="attendanceDate"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="p-1.5 border border-gray-300 rounded text-sm flex-1 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Quick Mark Header */}
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 space-y-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                  Quick Mark
                </h3>
                <div className="flex items-center gap-1 text-xs">
                  <Users className="w-3 h-3 text-gray-400" />
                  <span className="font-medium text-gray-700">
                    {filteredDailyMembers.length} Members
                  </span>
                </div>
              </div>

              {/* Status Toggle Buttons */}
              <div className="flex flex-wrap gap-2">
                {attendanceTypes
                  .filter((t) => t !== "None")
                  .map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setQuickMarkStatus(type)}
                      className={`flex-1 ${getQuickMarkButtonClasses(type)}`}
                    >
                      {type}
                    </button>
                  ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  placeholder="Filter members..."
                  value={dailySearchTerm}
                  onChange={(e) => setDailySearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500 bg-gray-50"
                />
              </div>

              {/* Mark Visible Button */}
              <button
                type="button"
                onClick={handleToggleAllFiltered}
                className="w-full py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors flex justify-center items-center gap-2"
              >
                Mark All Filtered as{" "}
                <span className="underline">{quickMarkStatus}</span>
              </button>
            </div>

            {/* Member List Grid (Scrollable Area) */}
            <div className="flex-1 overflow-y-auto border rounded-lg bg-white shadow-inner p-2 min-h-0">
              <div className="grid grid-cols-2 gap-2">
                {filteredDailyMembers.map((member) => {
                  const memberId = String(member.memberId ?? member.id);
                  const currentStatus = attendance[memberId] || "None";

                  return (
                    <div
                      key={member.id}
                      onClick={() =>
                        handleStatusChange(memberId, quickMarkStatus)
                      }
                      className={getStatusClasses(currentStatus)}
                      title={`Click to mark ${quickMarkStatus}`}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate text-gray-800">
                          {member.name}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {member.memberId}
                        </div>
                      </div>
                      {currentStatus !== "None" && (
                        <div className="text-[10px] font-bold opacity-80 uppercase tracking-wide">
                          {currentStatus}
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredDailyMembers.length === 0 && (
                  <div className="col-span-2 text-center text-gray-400 py-10">
                    <p className="text-sm">No members found</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty}
                className={`w-full py-3 rounded-lg shadow-md font-bold text-white flex items-center justify-center gap-2 transition-all ${
                  isDirty
                    ? "bg-blue-600 hover:bg-blue-700 transform hover:-translate-y-0.5"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                <Save className="w-4 h-4" />
                {isDirty ? "Save Changes" : "Saved"}
              </button>
            </div>
          </div>
        </div>

        {/* === RIGHT COLUMN: Summary / Member View Panel === */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-md flex flex-col h-full border border-gray-100 overflow-hidden">
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header Controls */}
            <div className="flex flex-col gap-3 mb-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                  <button
                    onClick={() => setViewMode("summary")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      viewMode === "summary"
                        ? "bg-blue-100 text-blue-700 shadow-sm"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Summary
                  </button>
                  <button
                    onClick={() => setViewMode("member")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      viewMode === "member"
                        ? "bg-blue-100 text-blue-700 shadow-sm"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Details
                  </button>
                </div>

                {/* Search Small */}
                <div className="relative w-40">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <input
                    placeholder="Search..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 border rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Date Range Inputs */}
              <div className="flex gap-2 items-center bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-xs font-bold text-gray-500 uppercase">
                  Range:
                </span>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="p-1 border rounded text-xs text-gray-700"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="p-1 border rounded text-xs text-gray-700"
                />
              </div>
            </div>

            {/* SCROLLABLE CONTENT AREA (Right Side) */}
            <div className="flex-1 overflow-y-auto min-h-0 border rounded-lg bg-white shadow-inner">
              {viewMode === "summary" ? (
                <div className="min-w-full inline-block align-middle">
                  <div className="overflow-x-auto">
                    <table className="min-w-max w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th
                            scope="col"
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50"
                          >
                            Member
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50"
                          >
                            None
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3 text-center text-xs font-medium text-green-600 uppercase tracking-wider bg-gray-50"
                          >
                            Veg
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3 text-center text-xs font-medium text-orange-600 uppercase tracking-wider bg-gray-50"
                          >
                            Non-V
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3 text-center text-xs font-medium text-yellow-600 uppercase tracking-wider bg-gray-50"
                          >
                            Egg
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3 text-center text-xs font-medium text-red-600 uppercase tracking-wider bg-gray-50"
                          >
                            OUT
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRangeSummary.map((summary) => (
                          <tr
                            key={summary.memberId}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                              {summary.name}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-400 text-center">
                              {summary["None"]}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 text-center font-medium">
                              {summary["Veg"]}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 text-center font-medium">
                              {summary["Non-Veg"]}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 text-center font-medium">
                              {summary["Egg-Veg"]}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 text-center font-medium">
                              {summary["OUT"]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-100 sticky bottom-0 font-bold text-gray-700">
                        <tr>
                          <td className="px-3 py-2 text-xs uppercase">Total</td>
                          <td className="px-3 py-2 text-center text-xs">
                            {totals["None"]}
                          </td>
                          <td className="px-3 py-2 text-center text-xs">
                            {totals["Veg"]}
                          </td>
                          <td className="px-3 py-2 text-center text-xs">
                            {totals["Non-Veg"]}
                          </td>
                          <td className="px-3 py-2 text-center text-xs">
                            {totals["Egg-Veg"]}
                          </td>
                          <td className="px-3 py-2 text-center text-xs">
                            {totals["OUT"]}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-3 space-y-3">
                  {filteredRangeSummary.map((member) => (
                    <div
                      key={member.memberId}
                      className="p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-800 text-sm">
                            {member.name}
                          </div>
                          <div className="flex gap-2 mt-1 text-xs">
                            <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                              V: {member["Veg"]}
                            </span>
                            <span className="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                              NV: {member["Non-Veg"]}
                            </span>
                            <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                              OUT: {member["OUT"]}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setExpandedMemberId(
                              expandedMemberId === member.memberId
                                ? null
                                : member.memberId
                            )
                          }
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          {expandedMemberId === member.memberId
                            ? "Hide"
                            : "View"}
                        </button>
                      </div>

                      {expandedMemberId === member.memberId && (
                        <div className="mt-3 pt-2 border-t border-dashed border-gray-200">
                          <div className="space-y-1">
                            {(member.dates || [])
                              .sort((a, b) => b.date.localeCompare(a.date))
                              .map((d, idx) => (
                                <div
                                  key={`${d.date}-${idx}`}
                                  className="flex justify-between text-xs py-1"
                                >
                                  <span className="text-gray-500">
                                    {d.date}
                                  </span>
                                  <span
                                    className={`font-semibold ${
                                      d.status === "Veg"
                                        ? "text-green-600"
                                        : d.status === "OUT"
                                        ? "text-red-600"
                                        : d.status === "Non-Veg"
                                        ? "text-orange-600"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {d.status}
                                  </span>
                                </div>
                              ))}
                            {(member.dates || []).length === 0 && (
                              <div className="text-xs text-gray-400 italic text-center py-1">
                                No history found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}