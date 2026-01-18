import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AIModelType } from "../types";

// NOTE: In a production Electron app, API keys should be handled securely in the main process.
// We assume it's available via process.env for this React implementation.

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is not set.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const streamChatResponse = async function* (
  message: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[]
) {
  const ai = getAIClient();
  if (!ai) return;

  // We construct a new chat each time for statelessness in this demo,
  // or you could persist the Chat object in a React Ref/Context.
  const chat = ai.chats.create({
    model: AIModelType.CHAT,
    history: history,
    config: {
        systemInstruction: "You are the AI Nexus for the UPS Command Core. You provide technical assistance for APC UPS units, power management, and electrical engineering queries. Keep answers concise and technical."
    }
  });

  const resultStream = await chat.sendMessageStream({ message });

  for await (const chunk of resultStream) {
    const c = chunk as GenerateContentResponse;
    if (c.text) {
        yield c.text;
    }
  }
};

export const generateUPSImage = async (
  prompt: string,
  size: '1K' | '2K' | '4K'
): Promise<string | null> => {
  const ai = getAIClient();
  if (!ai) throw new Error("API Key Missing");

  try {
    const response = await ai.models.generateContent({
      model: AIModelType.IMAGE,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          imageSize: size,
          aspectRatio: "16:9",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed", error);
    throw error;
  }
};