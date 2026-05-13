import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getBudgetAdviceWithGemini } from '../lib/gemini';
import { Lightbulb, Sparkles, AlertCircle } from 'lucide-react';

export default function BudgetAdvisor() {
  const { user } = useAuth();
  const [income, setIncome] = useState('');
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchIncome();
  }, [user]);

  const fetchIncome = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_settings')
        .select('monthly_income')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data && data.monthly_income) {
        setIncome(data.monthly_income);
      }
    } catch (err) {
      console.error('Error fetching income:', err);
    } finally {
      setFetching(false);
    }
  };

  const saveIncome = async (newIncome) => {
    try {
      // Upsert budget settings
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
    setAdvice('');

    try {
      // 1. Save income
      await saveIncome(income);

      // 2. Fetch current month expenses
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (expensesError) throw expensesError;

      // 3. Get advice from Gemini
      const geminiAdvice = await getBudgetAdviceWithGemini(income, expenses || []);
      setAdvice(geminiAdvice);

    } catch (err) {
      console.error('Error getting advice:', err);
      setError('Failed to generate budget advice. Please try again.');
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
          What is your estimated monthly income?
        </label>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₱</span>
            <input
              id="income"
              type="number"
              className="input pl-10 text-lg"
              placeholder="e.g. 35000"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
            />
          </div>
          <button 
            onClick={handleGetAdvice} 
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-6"
          >
            {loading ? <Sparkles size={20} className="animate-spin" /> : <Lightbulb size={20} />}
            {loading ? 'Analyzing...' : 'Get Advice'}
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
    </div>
  );
}
