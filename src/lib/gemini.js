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

export const getBudgetAdviceWithGemini = async (income, expensesList) => {
  const prompt = `You are a Filipino personal finance advisor. The user earns ₱${income} per month. Here are their expenses this month: 
  ${expensesList.map(e => `- ₱${e.amount} for ${e.description} (${e.category})`).join('\n')}
  
  Give 3 to 5 specific, actionable suggestions to help them save money. Be direct and practical. Reference their actual spending categories and amounts. Use a friendly but honest tone. Format your response as a numbered list.`;

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
