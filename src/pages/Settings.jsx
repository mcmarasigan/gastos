import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Check, AlertCircle, Save, LogOut } from 'lucide-react';

export default function Settings() {
  const { user, signOut } = useAuth();
  const [income, setIncome] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data && data.monthly_income) {
        setIncome(data.monthly_income);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase
        .from('budget_settings')
        .upsert({ user_id: user.id, monthly_income: income }, { onConflict: 'user_id' });
        
      if (error) throw error;
      setMessage({ type: 'success', text: 'Settings saved successfully.' });
    } catch (err) {
      console.error('Error saving settings:', err);
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your profile and budget preferences.</p>
      </div>

      {message.text && (
        <div className={`flex items-center gap-2 rounded-lg p-4 text-sm ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <div className="card p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4 border-b border-[var(--border-color)] pb-2">Profile</h2>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-500">Email Address</label>
            <div className="input bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed">
              {user?.email}
            </div>
            <p className="text-xs text-gray-400">Your email cannot be changed.</p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 border-b border-[var(--border-color)] pb-2">Budget Settings</h2>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="income">Monthly Income (e.g. ₱35000)</label>
            <div className="relative">
              <input
                id="income"
                type="number"
                className="input"
                placeholder="35000"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-400">Used to calculate your remaining budget and provide accurate advice.</p>
          </div>
        </div>

        <div className="pt-4 flex justify-between items-center border-t border-[var(--border-color)]">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            Sign Out
          </button>
          
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={20} />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
