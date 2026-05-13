import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';

const MessageDialog = ({ isOpen, type, message, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 text-center transform transition-all animate-in zoom-in-95">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-4 ${type === 'error' ? 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400' : 'bg-soft-green/20 text-soft-green dark:bg-soft-green/10'}`}>
          {type === 'error' ? <AlertCircle size={32} /> : <CheckCircle size={32} />}
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {type === 'error' ? 'Error' : 'Success!'}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <button onClick={onClose} className={type === 'error' ? 'btn-secondary w-full' : 'btn-primary w-full'}>
          {type === 'error' ? 'Try Again' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'info', message: '' });
  
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const showDialog = (type, message) => {
    setDialogConfig({ isOpen: true, type, message });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      showDialog('error', 'Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      showDialog('error', 'Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(password);
      if (error) throw error;
      showDialog('success', 'Your password has been successfully updated! You will be redirected to the dashboard.');
    } catch (err) {
      showDialog('error', err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = () => {
    setDialogConfig({ ...dialogConfig, isOpen: false });
    if (dialogConfig.type === 'success') {
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[var(--bg-primary)]">
      <MessageDialog 
        isOpen={dialogConfig.isOpen} 
        type={dialogConfig.type} 
        message={dialogConfig.message} 
        onClose={handleDialogClose} 
      />

      <div className="card w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-32 w-32 items-center justify-center mb-4 transition-all">
            <img src="/logo.png" alt="Gastos Logo" className="w-full h-full object-contain rounded-3xl shadow-2xl shadow-soft-green/20" />
          </div>
          <h1 className="text-2xl font-bold">Update Password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
            Enter your new secure password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="password">
              New Password
            </label>
            <input
              id="password"
              type="password"
              required
              disabled={loading}
              className="input w-full disabled:opacity-50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="confirmPassword">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              disabled={loading}
              className="input w-full disabled:opacity-50"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-6 py-3 text-lg font-semibold shadow-md rounded-lg"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
