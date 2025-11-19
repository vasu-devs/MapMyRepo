import React, { useState, useEffect, useRef } from 'react';
import { FileSystemNode, NodeType } from '../types';
import { findRelevantFile } from '../services/geminiService';

interface SearchBarProps {
  rootNode: FileSystemNode;
  onSelectPath: (path: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ rootNode, onSelectPath }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FileSystemNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Flatten the tree for search once on mount
  const [flatFiles, setFlatFiles] = useState<FileSystemNode[]>([]);
  
  useEffect(() => {
    const flatten = (node: FileSystemNode, acc: FileSystemNode[]) => {
        acc.push(node);
        if (node.children) {
            node.children.forEach(c => flatten(c, acc));
        }
        return acc;
    };
    const all = flatten(rootNode, []);
    setFlatFiles(all);
  }, [rootNode]);

  // Filter logic
  useEffect(() => {
    if (!query) {
        setResults([]);
        return;
    }
    const lowerQ = query.toLowerCase();
    const filtered = flatFiles
        .filter(f => f.name.toLowerCase().includes(lowerQ))
        .slice(0, 8); // Limit results
    setResults(filtered);
    setIsOpen(true);
  }, [query, flatFiles]);

  const handleSemanticSearch = async () => {
    if (!query) return;
    setAiLoading(true);
    setIsOpen(false); // Close dropdown while thinking
    
    const allPaths = flatFiles.map(f => f.path);
    const targetPath = await findRelevantFile(query, allPaths);
    
    setAiLoading(false);
    
    if (targetPath) {
        onSelectPath(targetPath);
        setQuery(''); // Clear search
    } else {
        alert(`AI couldn't identify a single specific file for "${query}". Try looking for specific components.`);
    }
  };

  return (
    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-40 w-[500px] max-w-[90vw]">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>
        
        <input
            type="text"
            className="block w-full pl-12 pr-24 py-3.5 text-sm rounded-full glass-panel text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all bg-slate-900/60 backdrop-blur-xl border border-white/10"
            placeholder="Search files or ask context (e.g. 'Where is auth logic?')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    // If there are direct matches, default to the first one,
                    // BUT if the user seems to be asking a question (contains spaces/?), prefer AI?
                    // Simplest: If no exact match, or if user hits enter and query doesn't look like a filename, we could prompt.
                    // Current logic: If results exist, pick first. If not, Auto-AI.
                    if (results.length > 0) {
                        onSelectPath(results[0].path);
                        setQuery('');
                        setIsOpen(false);
                    } else {
                        handleSemanticSearch();
                    }
                }
            }}
        />

        {/* AI Button inside input - always visible as primary action */}
        <div className="absolute inset-y-0 right-2 flex items-center">
            <button 
                onClick={handleSemanticSearch}
                disabled={aiLoading || !query}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                    aiLoading 
                    ? 'bg-cyan-900/50 text-cyan-200 cursor-wait' 
                    : 'bg-white/10 hover:bg-cyan-500 hover:text-white text-slate-300'
                }`}
            >
                {aiLoading ? (
                    <>
                        <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                        THINKING
                    </>
                ) : (
                    <>
                        <span>✨</span> ASK AI
                    </>
                )}
            </button>
        </div>
      </div>

      {/* Dropdown Results */}
      {isOpen && query && (
        <div className="absolute mt-2 w-full glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in fade-in slide-in-from-top-2">
            <ul className="max-h-60 overflow-y-auto py-2">
                {/* Always show AI option at top if query is complex, or bottom? Let's put it prominent. */}
                <li className="border-b border-white/5 mb-1">
                    <button
                        className="w-full text-left px-4 py-3 hover:bg-cyan-500/20 flex items-center gap-3 transition-colors group"
                        onClick={handleSemanticSearch}
                    >
                         <span className="text-lg">✨</span>
                         <div className="flex-1 min-w-0">
                             <div className="text-sm text-cyan-300 font-bold">Ask AI to find "{query}"</div>
                             <div className="text-xs text-slate-400 group-hover:text-cyan-200">Analyze codebase logic to locate relevant files</div>
                         </div>
                    </button>
                </li>

                {results.length > 0 ? (
                     results.map((node) => (
                        <li key={node.path}>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-white/5 flex items-center gap-3 transition-colors"
                                onClick={() => {
                                    onSelectPath(node.path);
                                    setQuery('');
                                    setIsOpen(false);
                                }}
                            >
                                <span className="text-lg opacity-70">
                                    {node.type === NodeType.FOLDER ? '📁' : '📄'}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-slate-200 font-medium truncate">{node.name}</div>
                                    <div className="text-xs text-slate-500 truncate">{node.path}</div>
                                </div>
                            </button>
                        </li>
                    ))
                ) : (
                    <li className="px-4 py-4 text-center text-slate-500 text-sm">
                        No direct file matches. Try "Ask AI".
                    </li>
                )}
            </ul>
        </div>
      )}
    </div>
  );
};