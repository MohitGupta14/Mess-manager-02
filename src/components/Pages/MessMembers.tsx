// ===== FILE: src/components/Pages/MessMembers.tsx =====
"use client";

import { useState, useMemo } from "react";
import { useMessData } from "@/hooks/useMessData";
import { MessMember } from "@/lib/types";
import "react-phone-number-input/style.css";
import PhoneInput from "react-phone-number-input";
import PrintExportButtons from "@/components/PrintExportButtons";
// --- Constants for Pagination ---
const MEMBERS_PER_PAGE = 10;

interface MessMembersProps {
  displayModal: (text: string, type: string) => void;
}

export default function MessMembers({ displayModal }: MessMembersProps) {
  const {
    data: messMembers,
    addData,
    updateData,
    deleteData,
  } = useMessData("messMembers");

  const [form, setForm] = useState({
    name: "",
    contactInfo: "" as string | undefined,
    joinDate: new Date().toISOString().split("T")[0],
    serviceNo: "",
  });

  const [editing, setEditing] = useState<MessMember | null>(null);
  
  // --- New State for Search, Pagination, and Date Filter ---
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  // NEW: State for Date Range Filter
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  // ------------------------------------------

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.serviceNo) {
      displayModal("Name and Service No. are required", "error");
      return;
    }

    const serviceNoToCheck = form.serviceNo.trim(); // Trim for robust uniqueness check

    if (!editing) {
      const isDuplicate = messMembers.some(
        (member) => member.memberId === serviceNoToCheck
      );

      if (isDuplicate) {
        displayModal(
          `Service No. ${serviceNoToCheck} already exists. It must be unique.`,
          "error"
        );
        return;
      }
    }

    const data = {
      ...form,
      memberId: serviceNoToCheck,
      contactInfo: (form.contactInfo || "").replace(/\s+/g, ""),
    };

    const result = editing
      ? await updateData(editing.id, data)
      : await addData(data);

    if (result.success) {
      displayModal(
        `Member ${editing ? "updated" : "added"} successfully!`,
        "success"
      );

      setForm({
        name: "",
        serviceNo: "",
        contactInfo: "",
        joinDate: new Date().toISOString().split("T")[0],
      });

      setEditing(null);
      // Reset to first page after adding/editing, in case user was on a later page
      setCurrentPage(1); 
    } else {
      displayModal(result.error || "Failed to save member", "error");
    }
  };

  const handleEdit = (member: MessMember) => {
    setEditing(member);
    setForm({
      name: member.name,
      serviceNo: member.memberId,
      // Ensure contactInfo is explicitly a string when loading for edit
      contactInfo: member.contactInfo && typeof member.contactInfo === 'string' ? member.contactInfo : '',
      joinDate: member.joinDate,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this member?")) {
      const result = await deleteData(id);
      if (result.success) {
        displayModal("Member deleted successfully!", "success");
      } else {
        displayModal(result.error || "Failed to delete member", "error");
      }
    }
  };

  // --- Filtering and Pagination Logic ---
  const filteredMembers = useMemo(() => {
    let members = messMembers;
    
    // 1. Text Search Filter (Name or Service No.)
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      members = members.filter(
        (member) =>
          member.name.toLowerCase().includes(lowerCaseSearchTerm) ||
          String(member.memberId).toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
    
    // 2. Date Range Filter (Joining Date)
    if (startDateFilter || endDateFilter) {
        const start = startDateFilter ? new Date(startDateFilter).getTime() : 0;
        // End date should include the whole day, so we check against the start of the next day
        const end = endDateFilter ? new Date(endDateFilter) : new Date(8640000000000000); // Max possible date
        
        // Add one day to the end date filter to include members joining on that specific date
        if (endDateFilter) {
            end.setDate(end.getDate() + 1);
        }
        const endTimestamp = end.getTime();
        
        members = members.filter((member) => {
            const memberJoinTime = new Date(member.joinDate).getTime();
            return memberJoinTime >= start && memberJoinTime < endTimestamp;
        });
    }

    return members;

  }, [messMembers, searchTerm, startDateFilter, endDateFilter]);

  const totalPages = Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE);
  
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * MEMBERS_PER_PAGE;
    const endIndex = startIndex + MEMBERS_PER_PAGE;
    return filteredMembers.slice(startIndex, endIndex);
  }, [filteredMembers, currentPage]);
  // ------------------------------------

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to the first page on new search
  };
  
  const handleDateFilterChange = () => {
    // Reset to the first page whenever the date filters change
    setCurrentPage(1); 
  };

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">
        {editing ? "Edit Member" : "Add Member"}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
      >
        <input
          name="name"
          value={form.name.charAt(0).toUpperCase() + form.name.slice(1)}
          onChange={handleChange}
          placeholder="Name *"
          className="p-2 border rounded"
          required
        />

        <input
          name="serviceNo"
          value={form.serviceNo}
          onChange={handleChange}
          placeholder="Service No. *"
          className="p-2 border rounded"
          required
          disabled={!!editing}
        />

        <PhoneInput
          placeholder="Enter phone number"
          value={form.contactInfo?.toString()}
          onChange={(value) => setForm({ ...form, contactInfo: value })}
          className="p-2 border rounded w-full"
          defaultCountry="IN"
          international
        />

        <input
          name="joinDate"
          type="date"
          value={form.joinDate}
          onChange={handleChange}
          className="p-2 border rounded"
        />

        <div className="md:col-span-2 flex justify-center space-x-4">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {editing ? "Update" : "Add"}
          </button>

          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm({
                  name: "",
                  serviceNo: "",
                  contactInfo: "",
                  joinDate: new Date().toISOString().split("T")[0],
                });
              }}
              className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* --- Search and Table Section --- */}
      <div className="mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-xl font-semibold mb-4">Current Members ({filteredMembers.length})</h2>
          <PrintExportButtons 
            tableId="memberTable"
            filename="current-member-summary"
            title="Member Summary"
          />
        </div>
        {/* Search and Date Filter Container */}
        <div className="flex flex-col sm:flex-row sm:space-x-4 mb-4">
            {/* Search Bar */}
            <input
              type="text"
              placeholder="Search Name or Service No..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="p-2 border rounded w-full sm:w-1/3 mb-2 sm:mb-0"
            />
            
            {/* Start Date Filter */}
            <div className="w-full sm:w-1/3 flex space-x-2 items-center">
                <span className="text-sm text-gray-600 whitespace-nowrap">Joined From:</span>
                <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => { setStartDateFilter(e.target.value); handleDateFilterChange(); }}
                    className="p-2 border rounded w-full"
                />
            </div>

            {/* End Date Filter */}
            <div className="w-full sm:w-1/3 flex space-x-2 items-center mt-2 sm:mt-0">
                <span className="text-sm text-gray-600 whitespace-nowrap">Joined To:</span>
                <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => { setEndDateFilter(e.target.value); handleDateFilterChange(); }}
                    className="p-2 border rounded w-full"
                />
            </div>
        </div>
        
        {/* Table Container with Scrollability */}
        <div id="memberTable" className="min-w-full inline-block align-middle">
          <div className="overflow-x-auto">
            <div className="max-h-[30rem] overflow-y-auto border rounded"> {/* Max height for 10 rows + padding to enable scrollability */}
              <table className="min-w-full bg-white">
                <thead className="bg-blue-50 sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="p-3 text-left text-sm">Name</th>
                    <th className="p-3 text-left text-sm">Service No.</th>
                    <th className="p-3 text-left text-sm">Contact</th>
                    <th className="p-3 text-left text-sm">Join Date</th>
                    <th className="p-3 text-left text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.map((member) => (
                    <tr key={member.id} className="border-b">
                      <td className="p-3">{member.name}</td>
                      <td className="p-3">{member.memberId}</td>
                      <td className="p-3">{member.contactInfo || "-"}</td>
                      <td className="p-3">{member.joinDate}</td>
                      <td className="p-3 space-x-2">
                        <button
                          onClick={() => handleEdit(member)}
                          className="text-blue-500 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedMembers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-gray-500">
                        No members found matching the criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm">
              Page **{currentPage}** of **{totalPages}**
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
