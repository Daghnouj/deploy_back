const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const modelConfig = {
  model: "gemini-1.5-flash",
  safetySettings: [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" }
  ],
  generationConfig: {
    temperature: 0.9,
    topP: 1,
    topK: 1,
    maxOutputTokens: 2048
  }
};

const model = genAI.getGenerativeModel(modelConfig);

module.exports = async function geminiChat(userMessage) {
  try {
    const prompt = `Tu es un expert en santé mentale adolescente. Réponds avec empathie à : ${userMessage}`;
    const result = await model.generateContent(prompt);
    return result.response.text() || "❌ Réponse indisponible";
  } catch (err) {
    console.error("Erreur Gemini:", err);
    return `❌ Erreur: ${err.message}`;
  }
};