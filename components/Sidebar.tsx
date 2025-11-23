import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, FileSystemNode, NodeType } from '../types';
import { askQuestion, analyzeFolder } from '../services/geminiService';
import { marked } from 'marked';

interface SidebarProps {
    node: FileSystemNode | null;
    rootNode: FileSystemNode | null;
    isDarkMode?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ node, rootNode, isDarkMode = false }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState<'DETAILS' | 'CHAT'>('DETAILS');

    // Chat State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
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

        setChatHistory(prev => [...prev, userMsg]);

        setInput('');
        setIsTyping(true);

        setTimeout(() => {
            if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }, 10);

        const answer = await askQuestion(node, rootNode, userMsg.text);

        const aiMsg: ChatMessage = {
            role: 'ai',
            text: answer,
            timestamp: Date.now()
        };

        setChatHistory(prev => [...prev, aiMsg]);
        setIsTyping(false);

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

    // Floating Glassmorphism Styles
    const panelClasses = `fixed right-2 md:right-4 top-20 md:top-24 bottom-2 md:bottom-4 flex flex-col shadow-2xl z-[60] md:z-20 transition-all duration-500 ease-out backdrop-blur-3xl rounded-2xl md:rounded-3xl border md:border ${isDarkMode
        ? 'bg-[#0d1117]/85 md:bg-[#0d1117]/60 border-white/20 shadow-[0_0_50px_-12px_rgba(0,0,0,0.7)]'
        : 'bg-white/85 md:bg-white/60 border-white/60 shadow-[0_0_50px_-12px_rgba(0,0,0,0.2)]'
        }`;

    // Width transition: w-[calc(100vw-1rem)] when expanded, w-16 when collapsed
    const widthClass = isCollapsed || !node ? 'w-0 md:w-16 translate-x-full md:translate-x-0' : 'w-[calc(100vw-1rem)] md:w-[400px] translate-x-0';

    return (
        <div className={`${panelClasses} ${widthClass}`}>

            {/* Collapsed Dock Content */}
            <div className={`flex flex-col items-center py-6 h-full transition-opacity duration-300 ${!isCollapsed && node ? 'hidden' : 'flex'}`}>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`p-3 rounded-2xl transition-all duration-300 group ${isDarkMode
                        ? 'text-[#8b949e] hover:text-white hover:bg-white/10'
                        : 'text-[#656d76] hover:text-black hover:bg-black/5'
                        }`}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse"}
                >
                    {isCollapsed ? (
                        <svg className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    )}
                </button>

                {/* Vertical Text or Icons could go here */}
                <div className={`mt-auto mb-6 flex flex-col gap-4 ${isDarkMode ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                    <div className="w-1 h-1 rounded-full bg-current opacity-50"></div>
                    <div className="w-1 h-1 rounded-full bg-current opacity-50"></div>
                    <div className="w-1 h-1 rounded-full bg-current opacity-50"></div>
                </div>
            </div >

            {/* Expanded Content */}
            <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-500 ${isCollapsed ? 'opacity-0 translate-x-10 pointer-events-none absolute inset-0' : 'opacity-100 translate-x-0'}`}>

                {/* Internal Toggle (only visible when expanded) */}
                <div className="absolute left-4 top-5 z-30" >
                    <button
                        onClick={() => setIsCollapsed(true)}
                        className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 ${isDarkMode
                            ? 'text-[#8b949e] hover:text-white hover:bg-white/10'
                            : 'text-[#656d76] hover:text-black hover:bg-black/5'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>

                {node ? (
                    <>
                        {/* Header */}
                        <div className={`p-6 pl-16 border-b ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-black/5 bg-white/40'}`}>
                            <div className="flex items-start gap-4">
                                <div className={`p-2.5 rounded-xl border text-2xl shadow-sm backdrop-blur-md ${isDarkMode ? 'bg-[#0d1117]/50 border-white/10' : 'bg-white/50 border-white/50'}`}>
                                    {getIcon(node.type)}
                                </div>
                                <div className="overflow-hidden flex-1 pt-0.5">
                                    <div className="flex items-center gap-2">
                                        <h2 className={`text-lg font-bold truncate tracking-tight ${isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>{node.name}</h2>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider border ${isDarkMode ? 'bg-[#21262d] text-[#8b949e] border-white/5' : 'bg-black/5 text-[#656d76] border-black/5'
                                            }`}>{node.type}</span>
                                        <div className={`text-xs font-mono truncate opacity-60 ${isDarkMode ? 'text-[#8b949e]' : 'text-[#656d76]'}`} title={node.path}>{node.path}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className={`flex gap-1 mt-6 p-1.5 rounded-xl ${isDarkMode ? 'bg-black/20' : 'bg-black/5'}`}>
                                <button
                                    onClick={() => setActiveTab('DETAILS')}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${activeTab === 'DETAILS'
                                        ? (isDarkMode ? 'bg-[#21262d] text-[#c9d1d9] shadow-lg shadow-black/20' : 'bg-white text-[#1f2328] shadow-lg shadow-black/5')
                                        : (isDarkMode ? 'text-[#8b949e] hover:text-[#c9d1d9]' : 'text-[#656d76] hover:text-[#1f2328]')
                                        }`}
                                >
                                    Details
                                </button>
                                <button
                                    onClick={() => setActiveTab('CHAT')}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${activeTab === 'CHAT'
                                        ? (isDarkMode ? 'bg-[#21262d] text-[#c9d1d9] shadow-lg shadow-black/20' : 'bg-white text-[#1f2328] shadow-lg shadow-black/5')
                                        : (isDarkMode ? 'text-[#8b949e] hover:text-[#c9d1d9]' : 'text-[#656d76] hover:text-[#1f2328]')
                                        }`}
                                >
                                    Discussion
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden relative flex flex-col">

                            {/* --- DETAILS TAB --- */}
                            {activeTab === 'DETAILS' && (
                                <div className="h-full overflow-y-auto p-6 space-y-8 custom-scrollbar">

                                    {/* Summary */}
                                    {node.summary ? (
                                        <div className="animate-fadeIn">
                                            <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 opacity-70 ${isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>
                                                Purpose & Architecture
                                            </h3>
                                            <div className={`text-sm leading-relaxed prose ${isDarkMode ? 'text-[#c9d1d9] prose-invert' : 'text-[#1f2328]'}`}>
                                                <div dangerouslySetInnerHTML={renderMarkdown(node.summary)} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            {isAnalyzingFolder ? (
                                                <div className={`flex flex-col items-center gap-3 ${isDarkMode ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                                    <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${isDarkMode ? 'border-[#8b949e]' : 'border-[#656d76]'}`}></div>
                                                    <p className="text-xs font-medium">Analyzing contents...</p>
                                                </div>
                                            ) : (
                                                <p className={`text-xs ${isDarkMode ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>No description available.</p>
                                            )}
                                        </div>
                                    )}

                                    <hr className={`border-t ${isDarkMode ? 'border-white/5' : 'border-black/5'}`} />

                                    {/* Code Preview */}
                                    {node.type === NodeType.FILE && node.content && (
                                        <div className="animate-fadeIn delay-100">
                                            <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 opacity-70 ${isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>Code Preview</h3>
                                            <div className={`rounded-xl border overflow-hidden shadow-inner ${isDarkMode ? 'border-white/5 bg-[#0d1117]/30' : 'border-black/5 bg-[#f6f8fa]/50'}`}>
                                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-4">
                                                    <pre className={`text-xs font-mono whitespace-pre-wrap break-words leading-relaxed bg-transparent p-0 border-none m-0 ${isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>
                                                        {node.content.slice(0, 2000)}{node.content.length > 2000 && <span className="opacity-50 italic">... (truncated)</span>}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Children List */}
                                    {node.children && node.children.length > 0 && (
                                        <div className="animate-fadeIn delay-200">
                                            <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 opacity-70 ${isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>
                                                {node.type === NodeType.FOLDER ? 'Contents' : 'Defined Symbols'}
                                            </h3>
                                            <div className={`border rounded-xl divide-y overflow-hidden ${isDarkMode ? 'border-white/5 divide-white/5' : 'border-black/5 divide-black/5'}`}>
                                                {node.children.map((child, idx) => (
                                                    <div key={idx} className={`flex items-center gap-3 p-3 px-4 transition-colors ${isDarkMode ? 'hover:bg-white/5 bg-transparent' : 'hover:bg-black/5 bg-transparent'
                                                        }`}>
                                                        <span className="text-xs opacity-70">{getIcon(child.type)}</span>
                                                        <span className={`text-xs font-medium truncate ${isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>{child.name}</span>
                                                        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${isDarkMode ? 'text-[#8b949e] bg-[#21262d]' : 'text-[#656d76] bg-[#eff1f3]'
                                                            }`}>{child.type}</span>
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
                                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                        {(chatHistory.length === 0) && (
                                            <div className="text-center mt-12 space-y-3">
                                                <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                                                    <span className="text-2xl">💬</span>
                                                </div>
                                                <p className={`text-sm font-medium ${isDarkMode ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>Start a conversation about this context.</p>
                                            </div>
                                        )}
                                        {chatHistory.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideIn`}>
                                                <div className={`max-w-[90%] rounded-2xl p-4 text-sm leading-relaxed border shadow-sm backdrop-blur-md ${msg.role === 'user'
                                                    ? (isDarkMode ? 'bg-[#1f6feb]/20 text-[#c9d1d9] border-[#1f6feb]/30 rounded-br-sm' : 'bg-[#0969da]/10 text-[#1f2328] border-[#0969da]/20 rounded-br-sm')
                                                    : (isDarkMode ? 'bg-[#161b22]/80 text-[#c9d1d9] border-white/10 rounded-bl-sm' : 'bg-white/80 text-[#1f2328] border-white/40 rounded-bl-sm')
                                                    }`}>
                                                    {msg.role === 'user' ? (
                                                        <span className="font-medium">{msg.text}</span>
                                                    ) : (
                                                        <div className={`prose ${isDarkMode ? 'prose-invert' : ''}`} dangerouslySetInnerHTML={renderMarkdown(msg.text)} />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {isTyping && (
                                            <div className="flex justify-start">
                                                <div className={`rounded-2xl rounded-bl-sm p-4 border flex gap-1.5 shadow-sm ${isDarkMode ? 'bg-[#0d1117]/60 border-white/10' : 'bg-white/60 border-black/5'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDarkMode ? 'bg-[#8b949e]' : 'bg-[#656d76]'}`}></div>
                                                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce delay-75 ${isDarkMode ? 'bg-[#8b949e]' : 'bg-[#656d76]'}`}></div>
                                                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce delay-150 ${isDarkMode ? 'bg-[#8b949e]' : 'bg-[#656d76]'}`}></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className={`p-4 border-t ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-black/5 bg-white/40'}`}>
                                        <div className="relative flex gap-2">
                                            <input
                                                type="text"
                                                className={`flex-1 border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-transparent transition-all ${isDarkMode
                                                    ? 'border-white/10 text-[#c9d1d9] placeholder-[#484f58] focus:ring-[#58a6ff] hover:border-white/20'
                                                    : 'border-black/10 text-[#1f2328] placeholder-[#656d76] focus:ring-[#0969da] hover:border-black/20'
                                                    }`}
                                                placeholder="Type your question..."
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            />
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={!input.trim() || isTyping}
                                                className={`px-4 rounded-xl disabled:opacity-50 transition-all font-semibold text-sm shadow-lg hover:shadow-xl active:scale-95 ${isDarkMode ? 'bg-[#238636] text-white hover:bg-[#2ea043]' : 'bg-[#0969da] text-white hover:bg-[#0860ca]'
                                                    }`}
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
                    <div className={`flex-1 flex items-center justify-center p-10 text-center ${isDarkMode ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                        <div className="animate-pulse">
                            <div className="text-5xl mb-4 opacity-20">←</div>
                            <p className="text-sm font-medium">Select a file or folder to view details</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};