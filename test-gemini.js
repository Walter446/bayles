const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyAfmI5Z3ZZepnKMZy4EGZ7eD1BudA8PsJo');

async function listModels() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent("Hola");
    console.log("gemini-1.5-flash WORKS!");
  } catch (e) {
    console.error("gemini-1.5-flash FAILED:", e.message);
  }

  try {
    const model2 = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const result2 = await model2.generateContent("Hola");
    console.log("gemini-1.5-flash-latest WORKS!");
  } catch (e) {
    console.error("gemini-1.5-flash-latest FAILED:", e.message);
  }

  try {
    const model3 = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result3 = await model3.generateContent("Hola");
    console.log("gemini-pro WORKS!");
  } catch (e) {
    console.error("gemini-pro FAILED:", e.message);
  }
}

listModels();
