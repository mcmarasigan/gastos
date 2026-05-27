const fetchWithRetry = async (url, options, maxRetries = 3) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        throw new Error('RATE_LIMIT');
      }
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error.message === 'RATE_LIMIT') {
        retries++;
        if (retries === maxRetries) {
          throw new Error('Too many requests. Please wait a moment before trying again.');
        }
        // Wait 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        throw error;
      }
    }
  }
};

export const parseExpenseWithGemini = async (input) => {
  const prompt = `You are a Filipino expense parser. Extract the amount (in Philippine pesos), category, and a short description for ALL expenses mentioned in the user's input. Categories are: Food, Transport, Bills, Shopping, Health, Entertainment, Savings, Others. Respond only in JSON format as an array of objects with no markdown or backticks: [{ "amount": number, "category": string, "description": string }]

User input: "${input}"`;

  try {
    const data = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('Invalid response from Gemini');
    }
    
    const result = data.candidates[0].content.parts[0].text;
    
    // Parse the JSON. The prompt explicitly says no markdown, but sometimes it still returns markdown.
    let jsonStr = result.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.substring(7, jsonStr.length - 3);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.substring(3, jsonStr.length - 3);
    }
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Gemini Parsing Error:', error);
    // Pass the specific rate limit message to the frontend if it's a 429
    throw new Error(error.message || 'Failed to parse expense');
  }
};

export const getBudgetAdviceWithGemini = async (income, expensesList, previousExpensesList = [], activeGoals = [], specificQuestion = '') => {
  const currentTotal = expensesList.reduce((sum, e) => sum + e.amount, 0);
  const previousTotal = previousExpensesList.reduce((sum, e) => sum + e.amount, 0);
  
  let prompt = `You are a Filipino personal finance advisor integrated into the user's money management app called "Gastos". Do NOT recommend other budgeting apps.
  The user earns ₱${income} per month.
  
  This month's expenses (Total: ₱${currentTotal}):
  ${expensesList.length > 0 ? expensesList.map(e => `- ₱${e.amount} for ${e.description} (${e.category})`).join('\n') : 'No expenses logged yet.'}
  
  Previous month's expenses (Total: ₱${previousTotal}):
  ${previousExpensesList.length > 0 ? previousExpensesList.map(e => `- ₱${e.amount} for ${e.description} (${e.category})`).join('\n') : 'No data.'}
  
  Active Savings Goals:
  ${activeGoals.length > 0 ? activeGoals.map(g => `- ${g.name}: ₱${g.current_amount} / ₱${g.target_amount}`).join('\n') : 'No active goals.'}
  
  Instructions:
  1. Analyze their spending using the 50/30/20 rule. Assume Bills are Fixed Needs; Food, Transport, Health are Variable Needs; Shopping, Entertainment, Others are Variable Wants.
  2. Provide a brief month-over-month comparison if previous data exists.
  3. Reference their active savings goals and how they can reach them faster.
  `;

  if (specificQuestion) {
    prompt += `\n\nSpecific Context/Goal from user: "${specificQuestion}"\nPlease provide actionable advice tailored directly to this context while factoring in the instructions above.`;
  } else {
    prompt += `\n\nGive 3 to 5 specific, actionable suggestions to help them save money. Be direct and practical.`;
  }

  prompt += ` Use a friendly but honest tone (Taglish is okay). Format your response as a numbered list with bold headings.`;

  try {
    const data = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('Invalid response from Gemini');
    }
    
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini Advice Error:', error);
    throw new Error(error.message || 'Failed to get budget advice');
  }
};

export const getSpendingSummaryWithGemini = async (expensesList) => {
  if (!expensesList || expensesList.length === 0) return "No expenses to summarize.";

  const prompt = `You are a Filipino AI expense assistant. The user has logged the following expenses for a specific timeframe:
  ${expensesList.map(e => `- ₱${e.amount} for ${e.description} (${e.category})`).join('\n')}
  
  Write a short, engaging 2-to-3 sentence summary of how they spent their money during this period. Point out their biggest spending category or an interesting habit. Keep it natural and casual (you can use Taglish). Do not give strict budget advice, just summarize the data you see.`;

  try {
    const data = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('Invalid response from Gemini');
    }
    
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini Summary Error:', error);
    throw new Error(error.message || 'Failed to generate spending summary');
  }
};

export const getMiniTipWithGemini = async (recentExpenses) => {
  if (!recentExpenses || recentExpenses.length === 0) return "Log more expenses to get personalized tips!";

  const prompt = `You are a Filipino AI expense assistant inside the "Gastos" app. Here are the user's expenses from the last 7 days:
  ${recentExpenses.map(e => `- ₱${e.amount} for ${e.description} (${e.category})`).join('\n')}
  
  Write a single, punchy 1-sentence tip or observation about their recent spending. (e.g. "You spent a lot on Food this week, try cooking at home!") Keep it casual and helpful. No markdown, no numbers.`;

  try {
    const data = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    
    if (!data.candidates || !data.candidates[0]) throw new Error('Invalid response');
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini Mini Tip Error:', error);
    return "Keep tracking your expenses to stay on top of your budget!";
  }
};
