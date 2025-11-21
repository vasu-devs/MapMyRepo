import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
    console.log("Starting Gemini API Test (Fetch)...");

    let apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        try {
            const envPath = path.resolve(__dirname, '../.env.local');
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf-8');
                const match = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);
                if (match) apiKey = match[1].trim();
            }
        } catch (e) { }
    }

    if (!apiKey) {
        console.error("❌ No API Key");
        process.exit(1);
    }

    const models = ["gemini-1.5-flash", "gemini-pro", "gemini-1.5-pro-latest"];

    for (const model of models) {
        console.log(`Testing model: ${model}...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Hello" }] }]
                })
            });

            if (!response.ok) {
                console.error(`❌ ${model} Failed: ${response.status} ${response.statusText}`);
                try {
                    const errText = await response.text();
                    console.error("Error Body:", errText);
                } catch (e) { }
            } else {
                const data = await response.json();
                console.log(`✅ ${model} Success!`);
                console.log("Response:", JSON.stringify(data, null, 2));
                return; // Exit on first success
            }

        } catch (error) {
            console.error(`❌ ${model} Fetch Error:`, error);
        }
    }
})();
