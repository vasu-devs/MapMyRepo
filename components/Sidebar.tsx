import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, FileSystemNode, NodeType } from '../types';
import { askQuestion, analyzeFolder } from '../services/geminiService';
import { marked } from 'marked';

interface SidebarProps {
  node: FileSystemNode | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ node }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'CHAT'>('DETAILS');
  
  // Chat State
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Analysis State
  const [isAnalyzingFolder, setIsAnalyzingFolder] = useState(false);

  // Force re-render helper
  const [, setForceUpdate] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (node) {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }

        // Automatic Folder Analysis
        if (node.type === NodeType.FOLDER && !node.summary && !isAnalyzingFolder) {
            performFolderAnalysis(node);
        }
    }
  }, [node, activeTab]);

  const performFolderAnalysis = async (targetNode: FileSystemNode) => {
      setIsAnalyzingFolder(true);
      const summary = await analyzeFolder(targetNode);
      if (summary) {
          targetNode.summary = summary;
          setForceUpdate(prev => prev + 1);
      }
      setIsAnalyzingFolder(false);
  };

  const handleSendMessage = async () => {
      if (!input.trim() || !node) return;
      
      const userMsg: ChatMessage = {
          role: 'user',
          text: input,
          timestamp: Date.now()
      };

      if (!node.chatHistory) node.chatHistory = [];
      node.chatHistory.push(userMsg);
      
      setInput('');
      setIsTyping(true);
      setForceUpdate(prev => prev + 1);

      setTimeout(() => {
        if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }, 10);

      const answer = await askQuestion(node, userMsg.text);
      
      const aiMsg: ChatMessage = {
          role: 'ai',
          text: answer,
          timestamp: Date.now()
      };
      
      node.chatHistory.push(aiMsg);
      setIsTyping(false);
      setForceUpdate(prev => prev + 1);
      
      setTimeout(() => {
        if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }, 10);
  };

  const getIcon = (type: NodeType) => {
    switch (type) {
      case NodeType.FOLDER: return '📂';
      case NodeType.FILE: return '📄';
      case NodeType.FUNCTION: return 'ƒ';
      case NodeType.CLASS: return 'C';
      case NodeType.COMPONENT: return '⚛';
      default: return '?';
    }
  };

  const renderMarkdown = (text: string) => {
      const rawMarkup = marked.parse(text) as string;
      return { __html: rawMarkup };
  };

  const panelClasses = `fixed right-0 top-0 bottom-0 w-[400px] bg-white border-l border-[#d0d7de] flex flex-col shadow-lg z-20 transition-transform duration-300 ease-in-out`;
  const translateClass = isCollapsed || !node ? 'translate-x-full' : 'translate-x-0';

  return (
    <div className={`${panelClasses} ${translateClass}`}>
      
      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 p-2 bg-white border border-r-0 border-[#d0d7de] rounded-l-md text-[#656d76] hover:text-[#0969da] transition-colors shadow-sm"
      >
        {isCollapsed ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        )}
      </button>

      {node ? (
        <>
            {/* Header */}
            <div className="p-5 border-b border-[#d0d7de] bg-[#f6f8fa]">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-white border border-[#d0d7de] text-xl">
                        {getIcon(node.type)}
                    </div>
                    <div className="overflow-hidden flex-1">
                        <div className="flex items-center gap-2">
                             <h2 className="text-lg font-semibold text-[#1f2328] truncate">{node.name}</h2>
                             <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#eff1f3] text-[#656d76] font-medium border border-[#d0d7de]">{node.type}</span>
                        </div>
                        <div className="text-xs text-[#656d76] font-mono truncate mt-1" title={node.path}>{node.path}</div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex gap-1 mt-4 bg-[#eff1f3] p-1 rounded-md">
                    <button 
                        onClick={() => setActiveTab('DETAILS')}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-all ${activeTab === 'DETAILS' ? 'bg-white text-[#1f2328] shadow-sm' : 'text-[#656d76] hover:text-[#1f2328]'}`}
                    >
                        Details
                    </button>
                    <button 
                        onClick={() => setActiveTab('CHAT')}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-all ${activeTab === 'CHAT' ? 'bg-white text-[#1f2328] shadow-sm' : 'text-[#656d76] hover:text-[#1f2328]'}`}
                    >
                        Discussion
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative flex flex-col bg-white">
                
                {/* --- DETAILS TAB --- */}
                {activeTab === 'DETAILS' && (
                    <div className="h-full overflow-y-auto p-5 space-y-6 custom-scrollbar">
                        
                        {/* Summary */}
                        {node.summary ? (
                            <div>
                                <h3 className="text-xs font-semibold text-[#1f2328] mb-2 flex items-center gap-2">
                                    Purpose & Architecture
                                </h3>
                                <div className="text-sm text-[#1f2328] leading-relaxed prose">
                                    <div dangerouslySetInnerHTML={renderMarkdown(node.summary)} />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                {isAnalyzingFolder ? (
                                    <div className="flex flex-col items-center gap-2 text-[#656d76]">
                                        <div className="w-4 h-4 border-2 border-[#656d76] border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-xs">Analyzing contents...</p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-[#656d76]">No description available.</p>
                                )}
                            </div>
                        )}

                        <hr className="border-t border-[#d0d7de]" />

                        {/* Code Preview */}
                        {node.type === NodeType.FILE && node.content && (
                            <div>
                                <h3 className="text-xs font-semibold text-[#1f2328] mb-2">Code Preview</h3>
                                <div className="rounded-md border border-[#d0d7de] bg-[#f6f8fa] overflow-hidden">
                                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-3">
                                        <pre className="text-xs font-mono text-[#1f2328] whitespace-pre-wrap break-words leading-relaxed bg-transparent p-0 border-none m-0">
                                            {node.content.slice(0, 2000)}{node.content.length > 2000 && <span className="opacity-50 italic">... (truncated)</span>}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Children List */}
                        {node.children && node.children.length > 0 && (
                            <div>
                                <h3 className="text-xs font-semibold text-[#1f2328] mb-2">
                                    {node.type === NodeType.FOLDER ? 'Contents' : 'Defined Symbols'}
                                </h3>
                                <div className="border border-[#d0d7de] rounded-md divide-y divide-[#d0d7de]">
                                    {node.children.map((child, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-2 px-3 hover:bg-[#f6f8fa] bg-white transition-colors">
                                            <span className="text-xs opacity-70">{getIcon(child.type)}</span>
                                            <span className="text-xs font-medium text-[#1f2328] truncate">{child.name}</span>
                                            <span className="ml-auto text-[10px] text-[#656d76] bg-[#eff1f3] px-1.5 rounded-full">{child.type}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- CHAT TAB --- */}
                {activeTab === 'CHAT' && (
                    <div className="h-full flex flex-col">
                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#ffffff]">
                            {(!node.chatHistory || node.chatHistory.length === 0) && (
                                <div className="text-center mt-8 space-y-2">
                                    <p className="text-[#656d76] text-sm">Ask questions about this context.</p>
                                </div>
                            )}
                            {node.chatHistory?.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[90%] rounded-lg p-3 text-sm leading-relaxed border ${
                                        msg.role === 'user' 
                                        ? 'bg-[#f6f8fa] text-[#1f2328] border-[#d0d7de]' 
                                        : 'bg-white text-[#1f2328] border-[#d0d7de] shadow-sm'
                                    }`}>
                                        {msg.role === 'user' ? (
                                            <span className="font-medium">{msg.text}</span>
                                        ) : (
                                            <div className="prose" dangerouslySetInnerHTML={renderMarkdown(msg.text)} />
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white rounded-lg p-3 border border-[#d0d7de] flex gap-1 shadow-sm">
                                        <div className="w-1.5 h-1.5 bg-[#656d76] rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-[#656d76] rounded-full animate-bounce delay-75"></div>
                                        <div className="w-1.5 h-1.5 bg-[#656d76] rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-[#d0d7de] bg-[#f6f8fa]">
                            <div className="relative flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 bg-white border border-[#d0d7de] rounded-md py-2 px-3 text-sm text-[#1f2328] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent placeholder-[#656d76]"
                                    placeholder="Type your question..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button 
                                    onClick={handleSendMessage}
                                    disabled={!input.trim() || isTyping}
                                    className="px-3 bg-[#0969da] text-white rounded-md hover:bg-[#0860ca] disabled:opacity-50 transition-colors font-medium text-sm"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[#656d76] p-10 text-center bg-[#f6f8fa]">
            <div>
                <div className="text-4xl mb-2 opacity-20">←</div>
                <p className="text-sm">Select a file or folder to view details</p>
            </div>
        </div>
      )}
    </div>
  );
};