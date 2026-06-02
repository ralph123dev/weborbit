import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const SYSTEM_PROMPT =
  "Tu es Orbit IA, un assistant intelligent, utile et bienveillant. Réponds toujours en français sauf si l'utilisateur parle une autre langue. Sois concis et clair dans tes réponses.";

let chatSession = null;

export function getChat() {
  if (!chatSession) {
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      systemInstruction: SYSTEM_PROMPT,
    });

    chatSession = model.startChat();
  }
  return chatSession;
}

export function resetChat() {
  chatSession = null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendMessageToGemini(userText, attempt = 1) {
  const chat = getChat();

  try {
    const result = await chat.sendMessage(userText);
    return result.response.text();
  } catch (err) {
    console.error('Gemini API error:', err);

    const isQuotaError =
      err?.status === 429 ||
      err?.code === 429 ||
      /quota/i.test(err?.message);

    if (isQuotaError) {
      const retry =
        err?.retryDelay ||
        err?.retry_after ||
        err?.details?.[0]?.retryInfo?.retryDelay?.seconds ||
        err?.retryInfo?.retryDelay?.seconds ||
        null;

      const retrySeconds = Number(retry) || 0;

      if (attempt < 3 && retrySeconds > 0) {
        console.warn(`Gemini quota 429, attente ${retrySeconds}s + retry #${attempt + 1}`);
        await sleep(retrySeconds * 1000);
        return sendMessageToGemini(userText, attempt + 1);
      }

      const retryMsg = retrySeconds ? ` Réessayez dans ${retrySeconds}s.` : '';
      throw new Error(`Quota Gemini dépassé.${retryMsg}`);
    }

    throw err;
  }
}
