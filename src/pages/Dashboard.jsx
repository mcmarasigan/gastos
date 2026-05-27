import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getSpendingSummaryWithGemini, getMiniTipWithGemini } from '../lib/gemini';
import SavingsGoals from '../components/SavingsGoals';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Trash2, TrendingUp, TrendingDown, Wallet, Sparkles, Lightbulb } from 'lucide-react';

const COLORS = ['#a8d5ba', '#fbc490', '#f4a261', '#e76f51', '#2a9d8f', '#264653', '#e9c46a', '#8ab17d'];

export default function Dashboard() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [budgetSettings, setBudgetSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [miniTip, setMiniTip] = useState('');

  const [timeframe, setTimeframe] = useState('month');
  const [aiSummary, setAiSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    setAiSummary(''); // Reset summary when timeframe changes
  }, [user, timeframe]);

  const fetchDashboardData = async () => {
    try {
      let startOfPeriod, endOfPeriod;

      if (timeframe === 'day') {
        const d = new Date();
        d.setHours(0,0,0,0);
        startOfPeriod = d.toISOString();
        const e = new Date();
        e.setHours(23,59,59,999);
        endOfPeriod = e.toISOString();
      } else if (timeframe === 'week') {
        const d = new Date();
        const first = d.getDate() - d.getDay();
        const start = new Date(d.setDate(first));
        start.setHours(0,0,0,0);
        startOfPeriod = start.toISOString();
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23,59,59,999);
        endOfPeriod = end.toISOString();
      } else if (timeframe === 'month') {
        const d = new Date();
        startOfPeriod = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
        endOfPeriod = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
      } else {
        startOfPeriod = new Date(2000, 0, 1).toISOString();
        endOfPeriod = new Date(2100, 0, 1).toISOString();
      }

      const [expensesRes, budgetRes] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startOfPeriod)
          .lte('date', endOfPeriod)
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

      const fetchedExpenses = expensesRes.data || [];
      setExpenses(fetchedExpenses);
      setBudgetSettings(budgetRes.data || null);

      // Generate Mini Tip
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentExpenses = fetchedExpenses.filter(e => new Date(e.date) >= sevenDaysAgo);
      if (recentExpenses.length > 0) {
        getMiniTipWithGemini(recentExpenses).then(setMiniTip).catch(console.error);
      }
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

  const generateSummary = async () => {
    if (expenses.length === 0) return;
    setSummaryLoading(true);
    try {
      const result = await getSpendingSummaryWithGemini(expenses);
      setAiSummary(result);
    } catch (err) {
      console.error(err);
      setAiSummary("Failed to load summary.");
    } finally {
      setSummaryLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8">Loading dashboard...</div>;

  const totalSpent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  
  let viewIncome = null;
  if (budgetSettings?.monthly_income) {
    const monthlyIncome = Number(budgetSettings.monthly_income);
    if (timeframe === 'month') {
      viewIncome = monthlyIncome;
    } else if (timeframe === 'week') {
      viewIncome = monthlyIncome / 4.333; // Average weeks in a month
    } else if (timeframe === 'day') {
      const daysInCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      viewIncome = monthlyIncome / daysInCurrentMonth;
    }
  }

  const remainingBudget = viewIncome !== null ? viewIncome - totalSpent : null;

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Overview of your spending habits.</p>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {['day', 'week', 'month', 'all'].map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
                timeframe === t 
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t === 'all' ? 'All Time' : `This ${t}`}
            </button>
          ))}
        </div>
      </div>

      {miniTip && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6 flex gap-3 items-center">
          <Lightbulb className="text-blue-500 flex-shrink-0" size={20} />
          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Insight: {miniTip}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card p-6 flex flex-col justify-between border-t-4 border-t-soft-orange">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Spent</p>
            <p className="text-3xl font-bold mt-2">₱{totalSpent.toLocaleString()}</p>
          </div>
          <TrendingDown className="text-soft-orange mt-4" size={24} />
        </div>
        
        {viewIncome !== null ? (
          <div className={`card p-6 flex flex-col justify-between border-t-4 ${remainingBudget < 0 ? 'border-t-red-500' : 'border-t-soft-green'}`}>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {timeframe === 'day' ? "Daily Budget Left" : timeframe === 'week' ? "Weekly Budget Left" : "Monthly Budget Left"}
              </p>
              <p className={`text-3xl font-bold mt-2 ${remainingBudget < 0 ? 'text-red-500' : ''}`}>
                ₱{Math.round(remainingBudget).toLocaleString()}
              </p>
            </div>
            <Wallet className={remainingBudget < 0 ? 'text-red-500 mt-4' : 'text-soft-green mt-4'} size={24} />
          </div>
        ) : (
          <div className="card p-6 flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-800/50">
            <p className="text-sm text-gray-500">
              {timeframe === 'all' 
                ? "Budget tracking is not available for 'All Time' view." 
                : "Set your monthly income in Settings to see remaining budget."}
            </p>
          </div>
        )}
      </div>

      <SavingsGoals />

      {expenses.length > 0 && (
        <div className="card p-6 border-l-4 border-l-soft-orange bg-gradient-to-br from-soft-orange/10 to-transparent">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="text-soft-orange" size={20} /> AI Spending Summary
            </h2>
            {!aiSummary && (
              <button 
                onClick={generateSummary}
                disabled={summaryLoading}
                className="btn-primary text-sm py-1.5 px-4"
              >
                {summaryLoading ? 'Analyzing...' : 'Generate Insight'}
              </button>
            )}
          </div>
          
          {aiSummary ? (
            <p className="text-gray-700 dark:text-gray-300 mt-2 leading-relaxed">
              {aiSummary}
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Click generate to get an AI-powered summary of your spending for this period.
            </p>
          )}
        </div>
      )}

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
