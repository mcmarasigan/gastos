import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Target, Plus, Trash2 } from 'lucide-react';

export default function SavingsGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState({ name: '', target_amount: '', current_amount: '0' });

  useEffect(() => {
    fetchGoals();
  }, [user]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      // If table doesn't exist yet, it throws an error. Just set goals to empty.
      if (!error && data) {
        setGoals(data);
      }
    } catch (err) {
      console.error("Error fetching goals", err);
    } finally {
      setLoading(false);
    }
  };

  const addGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.target_amount) return;

    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .insert([{ 
          user_id: user.id, 
          name: newGoal.name, 
          target_amount: parseFloat(newGoal.target_amount),
          current_amount: parseFloat(newGoal.current_amount || 0)
        }])
        .select()
        .single();

      if (error) throw error;
      setGoals([data, ...goals]);
      setNewGoal({ name: '', target_amount: '', current_amount: '0' });
    } catch (err) {
      console.error("Error adding goal", err);
      alert("Failed to add goal. Please make sure the table exists.");
    }
  };

  const deleteGoal = async (id) => {
    if (!window.confirm("Delete this goal?")) return;
    try {
      await supabase.from('savings_goals').delete().eq('id', id);
      setGoals(goals.filter(g => g.id !== id));
    } catch (err) {
      console.error("Error deleting goal", err);
    }
  };

  if (loading) return <div>Loading goals...</div>;

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-500 text-white rounded-full">
          <Target size={24} />
        </div>
        <h2 className="text-2xl font-bold">Savings Goals</h2>
      </div>

      <form onSubmit={addGoal} className="flex gap-4 mb-6 flex-wrap">
        <input 
          type="text" 
          placeholder="Goal Name (e.g. Trip)" 
          className="input flex-1 min-w-[200px]"
          value={newGoal.name}
          onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
          required
        />
        <input 
          type="number" 
          placeholder="Target Amount" 
          className="input w-32"
          value={newGoal.target_amount}
          onChange={(e) => setNewGoal({...newGoal, target_amount: e.target.value})}
          required
        />
        <input 
          type="number" 
          placeholder="Current Saved" 
          className="input w-32"
          value={newGoal.current_amount}
          onChange={(e) => setNewGoal({...newGoal, current_amount: e.target.value})}
        />
        <button type="submit" className="btn-primary flex items-center gap-2">
          <Plus size={20} /> Add
        </button>
      </form>

      <div className="space-y-4">
        {goals.map(goal => {
          const progress = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
          return (
            <div key={goal.id} className="border border-[var(--border-color)] rounded-lg p-4 relative">
              <button 
                onClick={() => deleteGoal(goal.id)}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
              <h3 className="font-semibold text-lg mb-2">{goal.name}</h3>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>₱{goal.current_amount.toLocaleString()} saved</span>
                <span>Target: ₱{goal.target_amount.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="text-right text-xs mt-1 font-medium">{progress}%</div>
            </div>
          );
        })}
        {goals.length === 0 && (
          <p className="text-gray-500 italic text-center py-4">No active savings goals. Add one above!</p>
        )}
      </div>
    </div>
  );
}
