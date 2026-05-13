import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lightbulb, AlertCircle, CheckCircle } from 'lucide-react';

const MessageDialog = ({ isOpen, type, message, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 text-center transform transition-all animate-in zoom-in-95">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-4 ${type === 'error' ? 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400' : 'bg-soft-green/20 text-soft-green dark:bg-soft-green/10'}`}>
          {type === 'error' ? <AlertCircle size={32} /> : <CheckCircle size={32} />}
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {type === 'error' ? 'Authentication Failed' : 'Success!'}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <button onClick={onClose} className={type === 'error' ? 'btn-secondary w-full' : 'btn-primary w-full'}>
          {type === 'error' ? 'Try Again' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'info', message: '' });
  
  // Anti-spam / Brute-force protection state (Persisted in localStorage)
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return parseInt(localStorage.getItem('gastos_failed_attempts') || '0', 10);
  });
  const [lockoutUntil, setLockoutUntil] = useState(() => {
    const stored = localStorage.getItem('gastos_lockout_until');
    return stored ? parseInt(stored, 10) : null;
  });
  const [countdown, setCountdown] = useState(0);
  
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Helper functions to update state and localStorage together
  const updateFailedAttempts = (attempts) => {
    setFailedAttempts(attempts);
    localStorage.setItem('gastos_failed_attempts', attempts.toString());
  };

  const updateLockoutUntil = (timestamp) => {
    setLockoutUntil(timestamp);
    if (timestamp) {
      localStorage.setItem('gastos_lockout_until', timestamp.toString());
    } else {
      localStorage.removeItem('gastos_lockout_until');
    }
  };

  React.useEffect(() => {
    let timer;
    if (lockoutUntil && lockoutUntil > Date.now()) {
      // Set initial countdown
      setCountdown(Math.ceil((lockoutUntil - Date.now()) / 1000));
      
      timer = setInterval(() => {
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          updateLockoutUntil(null);
          setCountdown(0);
          updateFailedAttempts(0); // Forgive them after waiting
          clearInterval(timer);
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    } else if (lockoutUntil && lockoutUntil <= Date.now()) {
      // Time already passed while away
      updateLockoutUntil(null);
      updateFailedAttempts(0);
    }
    return () => clearInterval(timer);
  }, [lockoutUntil]);

  const showDialog = (type, message) => {
    setDialogConfig({ isOpen: true, type, message });
  };

  const validateForm = () => {
    if (lockoutUntil && lockoutUntil > Date.now() && !isResetPassword) {
      showDialog('error', `Too many attempts. Please wait ${countdown} seconds before trying again.`);
      return false;
    }
    if (!email.includes('@') || !email.includes('.')) {
      showDialog('error', 'Please enter a valid email address.');
      return false;
    }
    
    if (isResetPassword) return true; // Skip password validation for reset

    if (password.length < 6) {
      showDialog('error', 'Password must be at least 6 characters long.');
      return false;
    }
    if (!isLogin && password !== confirmPassword) {
      showDialog('error', 'Passwords do not match. Please try again.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isResetPassword) {
        const { error } = await resetPassword(email);
        if (error) throw error;
        showDialog('success', 'A password reset link has been sent to your email! Please check your inbox.');
        return;
      }

      if (isLogin) {
        const { error } = await signIn({ email, password });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Incorrect email or password.');
          }
          throw error;
        }
        // Success
        updateFailedAttempts(0);
        navigate('/');
      } else {
        const { error } = await signUp({ email, password });
        if (error) {
          if (error.message.includes('already registered')) {
            throw new Error('An account with this email already exists.');
          }
          throw error;
        }
        showDialog('success', 'Your account has been successfully created! You can now use Gastos.');
      }
    } catch (err) {
      if (isLogin) {
        const newAttempts = failedAttempts + 1;
        updateFailedAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          updateLockoutUntil(Date.now() + 30000); // Lock out for 30 seconds
          updateFailedAttempts(0);
          showDialog('error', 'Too many failed attempts. For your security, you have been temporarily locked out. Please wait 30 seconds.');
        } else {
          showDialog('error', `${err.message || 'An error occurred'} (${3 - newAttempts} attempts remaining)`);
        }
      } else {
        showDialog('error', err.message || 'An error occurred during authentication');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = () => {
    setDialogConfig({ ...dialogConfig, isOpen: false });
    if (dialogConfig.type === 'success') {
      if (isResetPassword) {
        setIsResetPassword(false);
        setIsLogin(true);
      } else {
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
        navigate('/');
      }
    }
  };

  const isLocked = !isResetPassword && lockoutUntil && lockoutUntil > Date.now();

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
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-xl shadow-soft-green/10 mb-4 overflow-hidden border border-[var(--border-color)]">
            <img src="/logo.png" alt="Gastos Logo" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-2xl font-bold">{isResetPassword ? 'Reset Password' : 'Gastos'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
            {isResetPassword ? "Enter your email and we'll send you a reset link." : "Your AI-powered personal expense tracker"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              disabled={isLocked || loading}
              className="input w-full disabled:opacity-50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@example.com"
            />
          </div>
          
          {!isResetPassword && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  disabled={isLocked || loading}
                  className="input w-full disabled:opacity-50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {isLogin && (
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetPassword(true);
                      setDialogConfig({ isOpen: false, type: 'info', message: '' });
                    }}
                    className="text-xs font-semibold text-soft-green hover:underline focus:outline-none"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {!isLogin && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required={!isLogin}
                    disabled={isLocked || loading}
                    className="input w-full disabled:opacity-50"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              )}
            </>
          )}
          
          <button
            type="submit"
            disabled={loading || isLocked}
            className={`w-full mt-6 py-3 text-lg font-semibold shadow-md rounded-lg transition-colors ${
              isLocked ? 'bg-red-500 text-white cursor-not-allowed' : 'btn-primary'
            }`}
          >
            {isLocked && !isResetPassword
              ? `Locked (${countdown}s)` 
              : loading 
                ? 'Processing...' 
                : isResetPassword
                  ? 'Send Reset Link'
                  : isLogin 
                    ? 'Sign In' 
                    : 'Create Account'
            }
          </button>
        </form>

        <div className="mt-8 text-center text-sm border-t border-[var(--border-color)] pt-6">
          {isResetPassword ? (
            <button
              type="button"
              onClick={() => setIsResetPassword(false)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-semibold focus:outline-none transition-colors"
            >
              Back to Sign In
            </button>
          ) : (
            <>
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                {isLogin ? "New to Gastos?" : "Already tracking your expenses?"}
              </p>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => {
                  setIsLogin(!isLogin);
                  setPassword('');
                  setConfirmPassword('');
                  updateFailedAttempts(0);
                }}
                className="text-soft-green font-semibold hover:underline focus:outline-none transition-colors disabled:opacity-50"
              >
                {isLogin ? "Create a free account" : "Sign in to your account"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
