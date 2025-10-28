'use client';

import { useState, useEffect } from 'react';

export function useMessData(sheetName: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sheets?sheet=${sheetName}`);
      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data || []);
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [sheetName]);

  const addData = async (newData: Record<string, any>) => {
    console.log('Adding data to', sheetName, newData);
    try {
      const response = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet: sheetName, data: newData }),
      });
      
      if (response.ok) {
        await fetchData();
        return { success: true };
      }
      return { success: false, error: 'Failed to add data' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const updateData = async (id: string, updatedData: Record<string, any>) => {
    // console.log('Updating data in', sheetName, id, updatedData);
    try {
      const response = await fetch('/api/sheets/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet: sheetName, id, data: updatedData }),
      });
      console.log('Update response:', response);
      
      if (response.ok) {
        await fetchData();
        return { success: true };
      }
      return { success: false, error: 'Failed to update data' };
    } catch (error) {
      console.error(error);
      return { success: false, error: 'Network error' };
    }
  };

  const deleteData = async (id: string) => {
    try {
      const response = await fetch(`/api/sheets?sheet=${sheetName}&id=${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchData();
        return { success: true };
      }
      return { success: false, error: 'Failed to delete data' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  return { data, loading, error, addData, updateData, deleteData, refresh: fetchData };
}