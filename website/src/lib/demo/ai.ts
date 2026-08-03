export type AiProvider = "gemini" | "groq";

const GEMINI_MODEL = "gemini-1.5-flash";
const GROQ_MODEL = "llama-3.1-8b-instant";

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

export async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    signal: timeoutSignal(45000),
  });
  if (!res.ok) {
    throw new Error(`Gemini API error (${res.status})`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned no output");
  return text.trim();
}

export async function callGroq(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
    signal: timeoutSignal(45000),
  });
  if (!res.ok) {
    throw new Error(`Groq API error (${res.status})`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Groq returned no output");
  return text.trim();
}

export async function callProvider(
  provider: AiProvider,
  prompt: string,
  apiKey: string
): Promise<string> {
  return provider === "gemini" ? callGemini(prompt, apiKey) : callGroq(prompt, apiKey);
}

export type DemoAiResponse = {
  text?: string;
  remaining?: number;
  notConfigured?: boolean;
  error?: string;
};

export async function callDemoAi(prompt: string): Promise<DemoAiResponse> {
  const res = await fetch("/api/demo-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = (await res.json().catch(() => ({}))) as DemoAiResponse;
  return data;
}
