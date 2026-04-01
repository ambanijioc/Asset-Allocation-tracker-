import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

async function run() {
  const tools = [{
    functionDeclarations: [{
      name: "get_weather",
      description: "Get the weather",
      parameters: {
        type: "OBJECT",
        properties: { location: { type: "STRING" } },
        required: ["location"]
      }
    }]
  }];

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: "What is the weather in Paris?",
    config: { tools }
  });

  console.log(JSON.stringify(response.candidates[0].content.parts, null, 2));
}

run().catch(console.error);
