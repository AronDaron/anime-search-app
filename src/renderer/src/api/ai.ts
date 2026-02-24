const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const fetchAIAnimeTitles = async (description: string, apiKey: string): Promise<string[]> => {
    if (!apiKey) {
        throw new Error("Brak klucza API OpenRouter. Dodaj go w ustawieniach lub w pliku .env (VITE_OPENROUTER_KEY).");
    }

    const payload = {
        model: "google/gemini-2.5-flash-free", // Darmowy model z dobrym wsparciem JSON
        response_format: { type: "json_object" },
        messages: [
            {
                role: "system",
                content: "You are an expert anime recommendation engine. The user will give you a description of an anime plot or elements. You must reply ONLY with a JSON object containing an array of strings under the key 'titles'. These strings should be the exact official English or Romaji titles of the anime that match the description perfectly. Return up to 5 results. Do not include any explanations, just the JSON."
            },
            {
                role: "user",
                content: description
            }
        ]
    };

    const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`OpenRouter API Error: ${response.statusText}`);
    }

    const data = await response.json();
    try {
        const content = data.choices[0].message.content;
        const parsed = JSON.parse(content);
        return parsed.titles || [];
    } catch (e) {
        console.error("Failed to parse AI response:", e);
        return [];
    }
};
