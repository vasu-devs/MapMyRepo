import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
    console.log("Starting Gemini API Test...");

    // 1. Read API Key
    let apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        try {
            const envPath = path.resolve(__dirname, '../.env.local');
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf-8');
                const match = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);
                if (match) {
                    apiKey = match[1].trim();
                    console.log("Found API Key in .env.local");
                }
            }
        } catch (e) {
            console.error("Error reading .env.local:", e);
        }
    }

    if (!apiKey) {
        console.error("❌ Could not find API Key.");
        process.exit(1);
    }

    console.log(`Using API Key: ${apiKey.slice(0, 5)}...${apiKey.slice(-4)}`);

    // 2. Initialize SDK
    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        // Try gemini-1.5-flash first
        console.log("Attempting with model: gemini-1.5-flash");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent("Hello");
            const response = await result.response;
            console.log("✅ gemini-1.5-flash worked!", response.text());
            return;
        } catch (e) {
            console.error("❌ gemini-1.5-flash failed:", e.message);
        }

        // Try gemini-pro as fallback
        console.log("Attempting with model: gemini-pro");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent("Hello");
            const response = await result.response;
            console.log("✅ gemini-pro worked!", response.text());
            return;
        } catch (e) {
            console.error("❌ gemini-pro failed:", e.message);
        }

    } catch (error) {
        console.error("❌ Critical Failure", error);
    }
})();
