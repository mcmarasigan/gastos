import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Trash2, Edit2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export default function Transactions() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination and filtering
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const itemsPerPage = 10;
  const categories = ['All', 'Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Savings', 'Others'];

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses(expenses.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const filteredExpenses = categoryFilter === 'All' 
    ? expenses 
    : expenses.filter(e => e.category === categoryFilter);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage) || 1;
  const paginatedExpenses = filteredExpenses.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (loading) return <div className="p-8">Loading transactions...</div>;

  return (
    <div className="space-y-6">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Transactions</h1>
          <p className="text-gray-500 dark:text-gray-400">All your logged expenses.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <select 
            className="input w-auto py-1"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1); // reset to first page on filter change
            }}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No transactions found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedExpenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-[var(--border-color)] hover:bg-[var(--hover-bg)]">
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(expense.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-medium">{expense.description}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-soft-orange/20 text-soft-orange dark:text-soft-orange rounded-full text-xs font-semibold">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold">₱{Number(expense.amount).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => deleteExpense(expense.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex items-center justify-between p-4 border-t border-[var(--border-color)] bg-gray-50 dark:bg-gray-800/50">
              <span className="text-sm text-gray-500">
                Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length} entries
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
