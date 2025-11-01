// ===== FILE: src/components/Pages/MessMembers.tsx =====
'use client';

import { useState } from 'react';
import { useMessData } from '@/hooks/useMessData';
import { MessMember } from '@/lib/types';

interface MessMembersProps {
  displayModal: (text: string, type: string) => void;
}

export default function MessMembers({ displayModal }: MessMembersProps) {
  const { data: messMembers, addData, updateData, deleteData } = useMessData('messMembers');
  console.log('MessMembers data:', messMembers);
  const [form, setForm] = useState({ 
    name: '', 
    contactInfo: '', 
    joinDate: new Date().toISOString().split('T')[0] ,
    serviceNo: ''
  });
  const [editing, setEditing] = useState<MessMember | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => 
    setForm({ ...form, [e.target.name]: e.target.value });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.serviceNo) {
      displayModal('Name and Service No. are required', 'error');
      return;
    }

    const data = { 
      ...form, 
      memberId: form.serviceNo 
    };

    const result = editing 
      ? await updateData(editing.id, data)
      : await addData(data);

    if (result.success) {
      displayModal(`Member ${editing ? 'updated' : 'added'} successfully!`, 'success');
      setForm({ name: '', serviceNo: '', contactInfo: '', joinDate: new Date().toISOString().split('T')[0] });
      setEditing(null);
    } else {
      displayModal(result.error || 'Failed to save member', 'error');
    }
  };

  const handleEdit = (member: MessMember) => {
    setEditing(member);
    setForm({ 
      name: member.name, 
      serviceNo: member.memberId, 
      contactInfo: member.contactInfo || '', 
      joinDate: member.joinDate 
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this member?')) {
      const result = await deleteData(id);
      if (result.success) {
        displayModal('Member deleted successfully!', 'success');
      } else {
        displayModal(result.error || 'Failed to delete member', 'error');
      }
    }
  };

  return (
    <div className="p-6 sm:p-8 rounded-xl w-full bg-white shadow-lg">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">
        {editing ? 'Edit Member' : 'Add Member'}
      </h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <input 
          name="name" 
          value={form.name} 
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
        <input 
          name="contactInfo" 
          value={form.contactInfo} 
          onChange={handleChange} 
          placeholder="Contact Info" 
          className="p-2 border rounded" 
        />
        <input 
          name="joinDate" 
          type="date" 
          value={form.joinDate} 
          onChange={handleChange} 
          className="p-2 border rounded" 
        />
        <div className="md:col-span-2 flex justify-center space-x-4">
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {editing ? 'Update' : 'Add'}
          </button>
          {editing && (
            <button 
              type="button" 
              onClick={() => { 
                setEditing(null); 
                setForm({ name: '', serviceNo: '', contactInfo: '', joinDate: new Date().toISOString().split('T')[0] }); 
              }} 
              className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      
      <div className="mt-8 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">Current Members</h2>
        <table className="min-w-full bg-white border">
          <thead className="bg-blue-50">
            <tr>
              <th className="p-3 text-left text-sm">Name</th>
              <th className="p-3 text-left text-sm">Service No.</th>
              <th className="p-3 text-left text-sm">Contact</th>
              <th className="p-3 text-left text-sm">Join Date</th>
              <th className="p-3 text-left text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {messMembers.map((member) => (
              <tr key={member.id} className="border-b">
                <td className="p-3">{member.name}</td>
                <td className="p-3">{member.memberId}</td>
                <td className="p-3">{member.contactInfo || '-'}</td>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
