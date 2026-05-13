import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const COLORS = ['#a8d5ba', '#fbc490', '#f4a261', '#e76f51', '#2a9d8f', '#264653', '#e9c46a', '#8ab17d'];

export default function Dashboard() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [budgetSettings, setBudgetSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const [expensesRes, budgetRes] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startOfMonth)
          .lte('date', endOfMonth)
          .order('date', { ascending: false }),
        supabase
          .from('budget_settings')
          .select('*')
          .eq('user_id', user.id)
          .single()
      ]);

      if (expensesRes.error) throw expensesRes.error;
      // Budget setting might be missing if not set yet, so we ignore single() error if it's "PGRST116"
      if (budgetRes.error && budgetRes.error.code !== 'PGRST116') {
        throw budgetRes.error;
      }

      setExpenses(expensesRes.data || []);
      setBudgetSettings(budgetRes.data || null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  if (loading) return <div className="flex justify-center p-8">Loading dashboard...</div>;

  const totalSpent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const income = budgetSettings?.monthly_income ? Number(budgetSettings.monthly_income) : null;
  const remainingBudget = income !== null ? income - totalSpent : null;

  // Chart data preparation
  const categoryData = expenses.reduce((acc, exp) => {
    const existing = acc.find(item => item.name === exp.category);
    if (existing) {
      existing.value += Number(exp.amount);
    } else {
      acc.push({ name: exp.category, value: Number(exp.amount) });
    }
    return acc;
  }, []);

  const dailyDataMap = expenses.reduce((acc, exp) => {
    const date = new Date(exp.date).getDate();
    acc[date] = (acc[date] || 0) + Number(exp.amount);
    return acc;
  }, {});

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const lineData = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    amount: dailyDataMap[i + 1] || 0
  }));

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Overview of your spending this month.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 flex flex-col justify-between border-t-4 border-t-soft-orange">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Spent</p>
            <p className="text-3xl font-bold mt-2">₱{totalSpent.toLocaleString()}</p>
          </div>
          <TrendingDown className="text-soft-orange mt-4" size={24} />
        </div>
        
        {income !== null ? (
          <div className={`card p-6 flex flex-col justify-between border-t-4 ${remainingBudget < 0 ? 'border-t-red-500' : 'border-t-soft-green'}`}>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Remaining Budget</p>
              <p className={`text-3xl font-bold mt-2 ${remainingBudget < 0 ? 'text-red-500' : ''}`}>
                ₱{remainingBudget.toLocaleString()}
              </p>
            </div>
            <Wallet className={remainingBudget < 0 ? 'text-red-500 mt-4' : 'text-soft-green mt-4'} size={24} />
          </div>
        ) : (
          <div className="card p-6 flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-800/50">
            <p className="text-sm text-gray-500">Set your monthly income in Settings to see remaining budget.</p>
          </div>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          <p>No expenses logged this month yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Expenses by Category</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 justify-center mt-4 text-sm">
              {categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span>{entry.name} (₱{entry.value.toLocaleString()})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Daily Spending</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₱${value}`} />
                  <Tooltip 
                    formatter={(value) => [`₱${value}`, 'Spent']}
                    labelFormatter={(label) => `Day ${label}`}
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                  />
                  <Line type="monotone" dataKey="amount" stroke="var(--accent-orange)" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {expenses.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-6 border-b border-[var(--border-color)]">
            <h2 className="text-lg font-semibold">Recent Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 10).map((expense) => (
                  <tr key={expense.id} className="border-b border-[var(--border-color)] hover:bg-[var(--hover-bg)]">
                    <td className="px-6 py-4">{new Date(expense.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium">{expense.description}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-soft-green/20 text-soft-green dark:text-soft-green rounded-full text-xs font-semibold">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold">₱{Number(expense.amount).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => deleteExpense(expense.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
