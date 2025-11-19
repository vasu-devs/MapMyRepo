import * as d3 from 'd3';

export enum NodeType {
  FOLDER = 'FOLDER',
  FILE = 'FILE',
  FUNCTION = 'FUNCTION',
  CLASS = 'CLASS',
  COMPONENT = 'COMPONENT'
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface FileSystemNode {
  name: string;
  type: NodeType;
  children?: FileSystemNode[];
  content?: string; // For files, the actual code
  description?: string; // AI generated description for specific item
  summary?: string; // AI generated overall significance of the file
  path: string; // Relative path
  size?: number; // File size or arbitrary size for visualization
  analyzed?: boolean; // If true, children (functions) have been populated by AI
  value?: number; // For d3 packing
  chatHistory?: ChatMessage[]; // Store chat history specific to this node
}

export interface AIAnalysisResult {
  summary: string; // High level purpose of the file
  items: {
    name: string;
    type: 'FUNCTION' | 'CLASS' | 'COMPONENT';
    description: string;
  }[];
}

// D3 Force Graph Types
export interface GraphNode extends d3.SimulationNodeDatum {
  id: string; // Unique path
  name: string;
  type: NodeType;
  data: FileSystemNode; // Reference to original data
  r?: number; // Radius
  color?: string;
  isExpanded?: boolean; // Visual state for Folders/Files
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  value?: number; // Strength/Distance modifier
}