import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getBudgetAdviceWithGemini } from '../lib/gemini';
import { Lightbulb, Sparkles, AlertCircle } from 'lucide-react';

export default function BudgetAdvisor() {
  const { user } = useAuth();
  const [income, setIncome] = useState('');
  const [specificQuestion, setSpecificQuestion] = useState('');
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [adviceHistory, setAdviceHistory] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  const fetchInitialData = async () => {
    try {
      // Fetch income
      const { data: incomeData, error: incomeError } = await supabase
        .from('budget_settings')
        .select('monthly_income')
        .eq('user_id', user.id)
        .single();
      
      if (incomeError && incomeError.code !== 'PGRST116') throw incomeError;
      if (incomeData && incomeData.monthly_income) {
        setIncome(incomeData.monthly_income);
      }

      // Fetch advice history
      const { data: historyData, error: historyError } = await supabase
        .from('advice_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;
      
      if (historyData) {
        setAdviceHistory(historyData);
        if (historyData.length > 0) {
          // Show the most recent advice by default if we haven't generated a new one
          setAdvice(historyData[0].advice);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setFetching(false);
    }
  };

  const saveIncome = async (newIncome) => {
    try {
      const { error } = await supabase
        .from('budget_settings')
        .upsert({ user_id: user.id, monthly_income: newIncome }, { onConflict: 'user_id' });
        
      if (error) throw error;
    } catch (err) {
      console.error('Error saving income:', err);
    }
  };

  const handleGetAdvice = async () => {
    if (!income || isNaN(income) || income <= 0) {
      setError('Please enter a valid monthly income.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await saveIncome(income);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

      const [expensesRes, prevExpensesRes, goalsRes] = await Promise.all([
        supabase.from('expenses').select('*').eq('user_id', user.id).gte('date', startOfMonth).lte('date', endOfMonth),
        supabase.from('expenses').select('*').eq('user_id', user.id).gte('date', startOfLastMonth).lte('date', endOfLastMonth),
        supabase.from('savings_goals').select('*').eq('user_id', user.id)
      ]);

      if (expensesRes.error) throw expensesRes.error;

      const expenses = expensesRes.data || [];
      const previousExpenses = prevExpensesRes.data || [];
      const activeGoals = goalsRes.error ? [] : (goalsRes.data || []);

      const geminiAdvice = await getBudgetAdviceWithGemini(income, expenses, previousExpenses, activeGoals, specificQuestion);
      setAdvice(geminiAdvice);

      // Save to history table
      const { data: newHistory, error: insertError } = await supabase
        .from('advice_history')
        .insert([{ user_id: user.id, advice: geminiAdvice }])
        .select()
        .single();
        
      if (!insertError && newHistory) {
        setAdviceHistory([newHistory, ...adviceHistory]);
      }

    } catch (err) {
      console.error('Error getting advice:', err);
      setError(err.message || 'Failed to generate budget advice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatAdvice = (text) => {
    return text.split('\n').map((line, index) => {
      if (line.match(/^\d+\./)) {
        return <li key={index} className="font-semibold text-lg mt-4 mb-2">{line}</li>;
      }
      return <p key={index} className="text-gray-600 dark:text-gray-300 ml-4 mb-2">{line}</p>;
    });
  };

  const deleteHistory = async (id) => {
    if (!window.confirm('Delete this past advice?')) return;
    try {
      const { error } = await supabase.from('advice_history').delete().eq('id', id);
      if (error) throw error;
      setAdviceHistory(adviceHistory.filter(h => h.id !== id));
      if (adviceHistory.length > 0 && adviceHistory[0].id === id) {
        setAdvice(adviceHistory.length > 1 ? adviceHistory[1].advice : '');
      }
    } catch (err) {
      console.error('Error deleting advice:', err);
    }
  };

  if (fetching) return <div className="p-8">Loading advisor...</div>;

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Budget Advisor</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Get personalized, actionable advice on your spending habits powered by Gemini.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-100 dark:bg-red-900/30 p-4 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="card p-6 mb-6">
        <label className="mb-2 block font-medium" htmlFor="income">
          What is your estimated monthly income? (e.g. ₱35000)
        </label>
        <div className="mb-4">
          <input
            id="income"
            type="number"
            className="input text-lg w-full"
            placeholder="35000"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
          />
        </div>

        <label className="mb-2 block font-medium" htmlFor="question">
          Any specific goal or context? (Optional, e.g. "My pay is split 15th/30th", "Saving for a trip")
        </label>
        <textarea
          id="question"
          className="input w-full h-24 resize-none mb-4"
          placeholder="e.g., How can I budget for a trip to Japan next year considering my salary is split on the 15th and 30th?"
          value={specificQuestion}
          onChange={(e) => setSpecificQuestion(e.target.value)}
        ></textarea>

        <div className="flex justify-end">
          <button 
            onClick={handleGetAdvice} 
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-6"
          >
            {loading ? <Sparkles size={20} className="animate-spin" /> : <Lightbulb size={20} />}
            {loading ? 'Analyzing...' : 'Get Fresh Advice'}
          </button>
        </div>
      </div>

      {advice && (
        <div className="card p-8 border-l-4 border-l-soft-orange bg-gradient-to-br from-soft-orange/10 to-transparent">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-soft-orange text-white rounded-full">
              <Sparkles size={24} />
            </div>
            <h2 className="text-2xl font-bold">Your Budget Plan</h2>
          </div>
          
          <ul className="list-none prose dark:prose-invert max-w-none">
            {formatAdvice(advice)}
          </ul>
        </div>
      )}

      {adviceHistory.length > 0 && (
        <div className="card overflow-hidden mt-8">
          <div className="p-6 border-b border-[var(--border-color)] bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-lg font-semibold">Past Advice History</h2>
          </div>
          <div className="p-4 space-y-4">
            {adviceHistory.map((item) => (
              <div key={item.id} className="border border-[var(--border-color)] rounded-lg p-4 hover:border-soft-orange transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-500">
                    Generated on {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString()}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setAdvice(item.advice)}
                      className="text-xs px-3 py-1 bg-soft-orange/10 text-soft-orange rounded-full hover:bg-soft-orange/20"
                    >
                      View Full
                    </button>
                    <button 
                      onClick={() => deleteHistory(item.id)}
                      className="text-xs px-3 py-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {item.advice.replace(/[#*]/g, '')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
