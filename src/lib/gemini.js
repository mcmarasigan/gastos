export const parseExpenseWithGemini = async (input) => {
  const prompt = `You are a Filipino expense parser. Extract the amount (in Philippine pesos), category, and a short description from the user's input. Categories are: Food, Transport, Bills, Shopping, Health, Entertainment, Savings, Others. Respond only in JSON format with no markdown or backticks: { "amount": number, "category": string, "description": string }

User input: "${input}"`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    const data = await response.json();
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
    throw new Error('Failed to parse expense');
  }
};

export const getBudgetAdviceWithGemini = async (income, expensesList) => {
  const prompt = `You are a Filipino personal finance advisor. The user earns ₱${income} per month. Here are their expenses this month: 
  ${expensesList.map(e => `- ₱${e.amount} for ${e.description} (${e.category})`).join('\n')}
  
  Give 3 to 5 specific, actionable suggestions to help them save money. Be direct and practical. Reference their actual spending categories and amounts. Use a friendly but honest tone. Format your response as a numbered list.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini Advice Error:', error);
    throw new Error('Failed to get budget advice');
  }
};
