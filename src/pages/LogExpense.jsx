import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { parseExpenseWithGemini } from '../lib/gemini';
import { Bot, Check, AlertCircle } from 'lucide-react';

export default function LogExpense() {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [success, setSuccess] = useState(false);

  const categories = ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Savings', 'Others'];

  const handleParse = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await parseExpenseWithGemini(input);
      const parsedArray = Array.isArray(result) ? result : [result];
      setParsedData(parsedArray);
    } catch (err) {
      setError(err.message || 'Could not understand the expense. Please try again or be more specific.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const insertData = parsedData.map(item => ({
        user_id: user.id,
        raw_input: input,
        amount: parseFloat(item.amount),
        category: item.category,
        description: item.description,
        date: new Date().toISOString().split('T')[0]
      }));

      const { error: dbError } = await supabase
        .from('expenses')
        .insert(insertData);

      if (dbError) throw dbError;

      setSuccess(true);
      setInput('');
      setParsedData(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Log Expense</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Tell Gastos what you spent on, and our AI will organize it for you.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-100 dark:bg-red-900/30 p-4 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-100 dark:bg-green-900/30 p-4 text-sm text-green-700 dark:text-green-400">
          <Check size={20} />
          Expense saved successfully!
        </div>
      )}

      <form onSubmit={handleParse} className="card p-6">
        <label className="mb-2 block text-sm font-medium" htmlFor="expense">
          What did you spend on?
        </label>
        <div className="relative">
          <textarea
            id="expense"
            className="input min-h-[120px] resize-none pr-12 text-lg"
            placeholder="e.g., spent 150 on merienda&#10;nagbayad ng 1200 for groceries&#10;uber 85 pesos papuntang work"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || parsedData !== null}
          />
        </div>

        {!parsedData && (
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn-primary flex items-center gap-2"
            >
              <Bot size={20} />
              {loading ? 'Analyzing...' : 'Log Expense'}
            </button>
          </div>
        )}
      </form>

      {parsedData && (
        <div className="card p-6 border-soft-green space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Check className="text-soft-green" /> Confirm Expenses ({parsedData.length})
          </h2>

          <div className="space-y-6">
            {parsedData.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-[var(--border-color)] last:border-0 last:pb-0">
                <div>
                  <label className="mb-1 block text-sm text-gray-500">Amount (₱)</label>
                  <input
                    type="number"
                    className="input text-xl font-bold"
                    value={item.amount || ''}
                    onChange={(e) => {
                      const newData = [...parsedData];
                      newData[index].amount = e.target.value;
                      setParsedData(newData);
                    }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-500">Category</label>
                  <select
                    className="input"
                    value={item.category || 'Others'}
                    onChange={(e) => {
                      const newData = [...parsedData];
                      newData[index].category = e.target.value;
                      setParsedData(newData);
                    }}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-gray-500">Description</label>
                  <input
                    type="text"
                    className="input"
                    value={item.description || ''}
                    onChange={(e) => {
                      const newData = [...parsedData];
                      newData[index].description = e.target.value;
                      setParsedData(newData);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--border-color)]">
            <button
              onClick={() => setParsedData(null)}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : `Save ${parsedData.length} ${parsedData.length === 1 ? 'Expense' : 'Expenses'}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
