import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, List, Lightbulb, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Layout() {
  const { signOut } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/log", icon: PlusCircle, label: "Log Expense" },
    { to: "/transactions", icon: List, label: "Transactions" },
    { to: "/advisor", icon: Lightbulb, label: "Budget Advisor" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Sidebar for desktop */}
      <aside className="hidden w-64 flex-col border-r border-[var(--border-color)] bg-[var(--bg-card)] md:flex">
        <div className="flex h-16 items-center justify-between px-6 border-b border-[var(--border-color)]">
          <span className="text-2xl font-bold text-soft-green flex items-center gap-2">
            <Lightbulb className="text-soft-orange" />
            Gastos
          </span>
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-[var(--hover-bg)]">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        
        <nav className="flex-1 space-y-1 px-4 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-soft-green text-gray-900" 
                    : "text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-[var(--border-color)]">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {/* Mobile Header */}
        <div className="md:hidden flex h-16 items-center justify-between px-4 border-b border-[var(--border-color)] bg-[var(--bg-card)] sticky top-0 z-10">
          <span className="text-xl font-bold text-soft-green">Gastos</span>
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-[var(--hover-bg)]">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Bottom Nav for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-[var(--border-color)] bg-[var(--bg-card)] md:hidden pb-safe">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-1 text-[10px] ${
                isActive ? "text-soft-green" : "text-gray-500 dark:text-gray-400"
              }`
            }
          >
            <item.icon size={24} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
