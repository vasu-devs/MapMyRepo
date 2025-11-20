import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, FileSystemNode, NodeType } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("Error: API_KEY is missing from environment variables.");
    console.error("If deploying to Vercel, please add 'API_KEY' in your Project Settings > Environment Variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to create a string representation of the tree for the AI
export const generateTreeString = (node: FileSystemNode, depth: number = 0): string => {
    const indent = '  '.repeat(depth);
    let result = `${indent}- ${node.name} (${node.type})\n`;
    
    if (node.children) {
        // Limit depth to avoid huge tokens for very deep trees, or limit child count
        if (depth < 4) {
            node.children.forEach(child => {
                result += generateTreeString(child, depth + 1);
            });
        } else {
            result += `${indent}  ... (more nested items)\n`;
        }
    }
    return result;
};

export const analyzeCode = async (fileName: string, fileContent: string): Promise<AIAnalysisResult | null> => {
  const ai = getAI();
  if (!ai) return null;

  // Truncate content if it's too massive to prevent token limits
  const truncatedContent = fileContent.slice(0, 40000);

  const prompt = `
    Analyze "${fileName}".
    1. Summary: 2 sentences on its architectural role.
    2. Exports: List main functions/classes/components (max 10 words desc).
    Output JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        ${prompt}
        ---
        CODE:
        ${truncatedContent}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['FUNCTION', 'CLASS', 'COMPONENT'] },
                  description: { type: Type.STRING }
                },
                required: ['name', 'type', 'description']
              }
            }
          },
          required: ['summary', 'items']
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as AIAnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return null;
  }
};

export const analyzeFolder = async (node: FileSystemNode): Promise<string | null> => {
    const ai = getAI();
    if (!ai) return null;

    const treeMap = generateTreeString(node);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
                Analyze folder: ${node.name}
                Structure:
                ${treeMap}
                
                Summarize responsibility in 2 sentences.
            `
        });
        
        return response.text || "Contains project structure.";
    } catch (e) {
        console.error("Folder analysis failed", e);
        return null;
    }
};

// --- NEW: Q&A Capability ---

export const askQuestion = async (node: FileSystemNode, question: string): Promise<string> => {
    const ai = getAI();
    if (!ai) return "AI Service Unavailable. Please check your API_KEY configuration in Vercel/Environment settings.";

    let context = "";
    if (node.type === NodeType.FOLDER) {
        context = `Folder Structure Map (Recursive):\n${generateTreeString(node)}`;
    } else {
        context = node.content 
        ? `Code Content:\n${node.content.slice(0, 30000)}` 
        : `File: ${node.name} (Content unavailable)`;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
                Expert dev explaining code.
                Target: ${node.path} (${node.type}).
                
                Context:
                ${context}
                
                Question: "${question}"
                
                Answer <100 words. Use Markdown.
            `
        });
        return response.text || "No answer generated.";
    } catch (e) {
        console.error("Q&A failed", e);
        return "Sorry, I encountered an error analyzing the question.";
    }
};

// --- NEW: Semantic Search ---

export const findRelevantFile = async (query: string, allFilePaths: string[]): Promise<string | null> => {
    const ai = getAI();
    if (!ai) {
        console.error("AI Semantic Search Unavailable: Missing API Key");
        return null;
    }

    // We can't send 10000 paths. Slice to reasonable limit or just use top level structure if huge.
    const pathList = allFilePaths.slice(0, 1000).join('\n');

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
                I have a list of file paths from a software repository.
                The user is asking: "${query}"
                
                Based on the file names, folder structure, and common software conventions, identify the SINGLE file path that is MOST LIKELY to contain the logic or definition the user is looking for.
                
                Example:
                Query: "Where is the RAG?" -> Look for 'geminiService', 'aiService', 'vectorStore', 'retrieval'.
                Query: "How is auth handled?" -> Look for 'authContext', 'Login', 'userController'.
                
                Return ONLY the full path string. 
                If nothing is relevant, return "null".
                
                File Paths:
                ${pathList}
            `
        });
        
        const result = response.text?.trim();
        if (!result || result === "null" || result.includes(" ")) return null;
        
        // Clean up potential quotes or markdown
        return result.replace(/`/g, '').replace(/'/g, '').replace(/"/g, '');
    } catch (e) {
        console.error("Semantic search failed", e);
        return null;
    }
};