const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface AISearchResult {
    titles: string[];
    searchParams?: {
        genres?: string[];
        tags?: string[];
        seasonYear?: number;
    };
}

export const fetchAIAnimeTitles = async (description: string, apiKey: string): Promise<AISearchResult> => {
    if (!apiKey) {
        throw new Error("Brak klucza API OpenRouter. Dodaj go w ustawieniach lub w pliku .env (VITE_OPENROUTER_KEY).");
    }

    const payload = {
        model: "google/gemini-3-flash-preview", // Darmowy model z dobrym wsparciem JSON
        response_format: { type: "json_object" },
        messages: [
            {
                role: "system",
                content: `You are an expert anime recommendation engine. The user will give you a description of an anime plot or elements. 
                You must reply ONLY with a JSON object containing two keys:
                1. 'titles': an array of strings. These strings should be the exact official English or Romaji titles of the anime that match the description perfectly. Return up to 5 results.
                2. 'searchParams': an object containing parameters extracted from the user's description. Use this to help find newer anime that you might not know by title. It can contain:
                   - 'genres': array of strings (e.g., ["Action", "Fantasy", "Romance"])
                   - 'tags': array of strings (e.g., ["Magic School", "Demons", "Vampire"])
                   - 'seasonYear': number (e.g., 2024), ONLY if the user explicitly mentions a year or says "newest/this year".
                
                If you cannot extract a parameter, omit it from the 'searchParams' object.
                Do not include any explanations, just the JSON.`
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
        return {
            titles: parsed.titles || [],
            searchParams: parsed.searchParams
        };
    } catch (e) {
        console.error("Failed to parse AI response:", e);
        return { titles: [] };
    }
};

export const translateDescriptionToPolish = async (description: string, apiKey: string): Promise<string | null> => {
    if (!apiKey) {
        console.warn("Brak klucza API OpenRouter do tłumaczenia opisu.");
        return null;
    }

    if (!description || description.trim() === '') {
        return null;
    }

    const payload = {
        model: "google/gemini-3-flash-preview",
        messages: [
            {
                role: "system",
                content: "Jesteś profesjonalnym tłumaczem. Przetłumacz podany angielski opis fabuły anime na perfekcyjny, naturalny język polski. ZACHOWAJ WSZYSTKIE ewentualne tagi HTML (np. <br>, <i>, <b>), jeśli są w oryginale. Zwróć WYŁĄCZNIE przetłumaczony tekst, absolutnie bez żadnych swoich dodatków, powitań ani bloków markdown."
            },
            {
                role: "user",
                content: description
            }
        ]
    };

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`Błąd tłumaczenia AI z OpenRouter:`, data);
            return null;
        }

        const content = data.choices?.[0]?.message?.content;
        if (!content) return null;
        
        return content.trim();
    } catch (e) {
        console.error("Błąd przetwarzania odpowiedzi z API tłumacza:", e);
        return null;
    }
};
