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
    Analyze the following source code file named "${fileName}".
    
    1. Provide a "summary": A 2-3 sentence explanation of the architectural significance of this file. What role does it play in the broader application? (e.g., "Handles user authentication state," "Reusable UI button component," "Utility for date formatting").
    
    2. Identify the main exported functions, classes, or React components.
    Return a list of these items with their name, type, and a very brief (10 words max) description.
    
    Ignore small helper utilities or private variables unless they are critical.
    
    Output Markdown for the summary.
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
            summary: { type: Type.STRING, description: "Architectural significance and functionality summary (Markdown supported)" },
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
                Analyze the following folder structure from a software project.
                Folder Name: ${node.name}
                
                Structure:
                ${treeMap}
                
                Provide a concise (2-3 sentences) architectural summary of this folder. 
                What is its responsibility? Does it contain features, utilities, assets, or core logic?
                
                Format as Markdown.
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
                You are an expert software architect explaining a codebase.
                User is looking at: ${node.path} (${node.type}).
                
                Context:
                ${context}
                
                User Question: "${question}"
                
                Answer concisely (under 150 words). 
                Use Markdown formatting.
                - Use **bold** for key concepts.
                - Use \`code\` for variable/function names.
                - Use lists for steps or multiple points.
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