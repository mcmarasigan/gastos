<div align="center">
  <img src="public/logo.png" alt="Gastos Logo" width="120" />
  <h1>Gastos 💸</h1>
  <p>An AI-powered personal expense tracker and budget advisor designed for Filipinos, built with React, Supabase, and the Google Gemini API.</p>
</div>

## Features ✨

- **🤖 AI Expense Logging**: Don't waste time filling out forms. Just type what you spent on casually (e.g., "spent 150 on merienda"), and the AI will automatically extract the amount, category, and description. Supports English, Tagalog, and Taglish!
- **⚡ Bulk Expense Uploads**: Copy and paste a whole list of expenses at once, and the AI will perfectly organize and log all of them in one go.
- **📊 Dynamic Dashboard**: View your spending at a glance. Includes interactive pie charts for category breakdowns, daily spending line charts, and timeframe filters (Day, Week, Month, All Time).
- **💡 AI Budget Advisor**: Enter your monthly income and get personalized, practical, and actionable advice from our Gemini-powered financial advisor based on your recent spending habits. Includes a history log of all past advice.
- **📈 AI Spending Summary**: Generate a smart 2-3 sentence insight into your spending behavior based on any specific timeframe directly from your dashboard.
- **🔒 Secure Authentication**: Safe and reliable user authentication powered by Supabase.

## Tech Stack 🛠️

- **Frontend**: React (Vite), Tailwind CSS, Recharts, Lucide React
- **Backend/Database**: Supabase (PostgreSQL, Auth)
- **AI Integration**: Google Gemini API (`gemini-flash-latest`)

## Getting Started 🚀

### Prerequisites
- Node.js (v18+)
- A Supabase account
- A Google Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/gastos.git
   cd gastos
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. Database Setup (Supabase):
   Run the following SQL commands in your Supabase SQL Editor:
   ```sql
   -- 1. Create Expenses table
   create table expenses (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references auth.users not null,
     raw_input text,
     amount numeric not null,
     category text not null,
     description text,
     date date default CURRENT_DATE,
     created_at timestamptz default now()
   );

   -- 2. Create Budget Settings table
   create table budget_settings (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references auth.users unique not null,
     monthly_income numeric,
     category_limits jsonb,
     created_at timestamptz default now()
   );

   -- 3. Create Advice History table
   create table advice_history (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references auth.users not null,
     advice text not null,
     created_at timestamptz default now()
   );

   -- 4. Enable Row Level Security (RLS)
   alter table expenses enable row level security;
   alter table budget_settings enable row level security;
   alter table advice_history enable row level security;

   -- 5. Add Security Policies
   create policy "Users can view own expenses" on expenses for select using (auth.uid() = user_id);
   create policy "Users can insert own expenses" on expenses for insert with check (auth.uid() = user_id);
   create policy "Users can update own expenses" on expenses for update using (auth.uid() = user_id);
   create policy "Users can delete own expenses" on expenses for delete using (auth.uid() = user_id);

   create policy "Users can view own budget" on budget_settings for select using (auth.uid() = user_id);
   create policy "Users can insert own budget" on budget_settings for insert with check (auth.uid() = user_id);
   create policy "Users can update own budget" on budget_settings for update using (auth.uid() = user_id);

   create policy "Users can view own advice" on advice_history for select using (auth.uid() = user_id);
   create policy "Users can insert own advice" on advice_history for insert with check (auth.uid() = user_id);
   create policy "Users can delete own advice" on advice_history for delete using (auth.uid() = user_id);
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## License 📄
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
