import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, FileSystemNode, NodeType, UniverseNode } from '../types';
import { askQuestion, analyzeFolder } from '../services/geminiService';
import { marked } from 'marked';

interface SidebarProps {
    node: FileSystemNode | null;
    universeNode?: UniverseNode | null;
    rootNode: FileSystemNode | null;
    theme?: 'modern' | 'crayon' | 'pencil' | 'comic';
}

export const Sidebar: React.FC<SidebarProps> = ({ node, universeNode, rootNode, theme = 'modern' }) => {
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

    const activeNode = node || universeNode;

    useEffect(() => {
        if (activeNode) {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }

            // Automatic Folder Analysis (Only for FileSystemNode)
            if (node && node.type === NodeType.FOLDER && !node.summary && !isAnalyzingFolder) {
                performFolderAnalysis(node);
            }
        }
    }, [activeNode, activeTab]);

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
        if (!input.trim() || !activeNode) return;

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

        let answer = "I can't answer that right now.";

        if (node) {
            answer = await askQuestion(node, rootNode, userMsg.text);
        } else if (universeNode) {
            // Simple mock response for Universe nodes for now, or use Gemini if we had a service for it
            if (universeNode.type === 'REPO') {
                answer = `I see you're interested in **${universeNode.name}**. It's a ${universeNode.language} repository with ${universeNode.stargazers_count} stars. I can help you understand its structure if you visualize it!`;
            } else if (universeNode.type === 'LANGUAGE') {
                answer = `**${universeNode.name}** is a popular programming language. You have several repositories using it.`;
            } else if (universeNode.type === 'USER') {
                answer = `This is the universe of **${universeNode.name}**. It contains all their public repositories grouped by language.`;
            }
        }

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

    const getIcon = (type: string) => {
        switch (type) {
            case NodeType.FOLDER: return '📂';
            case NodeType.FILE: return '📄';
            case NodeType.FUNCTION: return 'ƒ';
            case NodeType.CLASS: return 'C';
            case NodeType.COMPONENT: return '⚛';
            case 'USER': return '👤';
            case 'LANGUAGE': return '🌐';
            case 'REPO': return '📦';
            default: return '?';
        }
    };

    const renderMarkdown = (text: string) => {
        const rawMarkup = marked.parse(text) as string;
        return { __html: rawMarkup };
    };

    // Styles based on Theme
    const isPencil = theme === 'pencil';
    const isCrayon = theme === 'crayon';
    const isComic = theme === 'comic';

    const panelClasses = `fixed right-2 md:right-4 top-20 md:top-24 bottom-2 md:bottom-4 flex flex-col z-[60] md:z-20 transition-all duration-500 ease-out 
        ${isPencil
            ? 'bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg'
            : (isComic
                ? 'bg-[#f0e6d2] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg' // Comic Style
                : 'bg-white/85 md:bg-white/60 border border-white/60 shadow-[0_0_50px_-12px_rgba(0,0,0,0.2)] backdrop-blur-3xl rounded-2xl md:rounded-3xl'
            )
        }`;

    // Width transition: w-[calc(100vw-1rem)] when expanded, w-16 when collapsed
    const widthClass = isCollapsed || !activeNode ? 'w-0 md:w-16 translate-x-full md:translate-x-0' : 'w-[calc(100vw-1rem)] md:w-[400px] translate-x-0';

    return (
        <div className={`${panelClasses} ${widthClass} ${isPencil || isCrayon || isComic ? "font-['Patrick_Hand']" : ""}`}>

            {/* Collapsed Dock Content */}
            <div className={`flex flex-col items-center py-6 h-full transition-opacity duration-300 ${!isCollapsed && activeNode ? 'hidden' : 'flex'}`}>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`p-3 rounded-2xl transition-all duration-300 group text-[#656d76] hover:text-black hover:bg-black/5`}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse"}
                >
                    {isCollapsed ? (
                        <svg className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    )}
                </button>

                {/* Vertical Text or Icons could go here */}
                <div className={`mt-auto mb-6 flex flex-col gap-4 text-[#656d76]`}>
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
                        className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 text-[#656d76] hover:text-black hover:bg-black/5`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>

                {activeNode ? (
                    <>
                        {/* Header */}
                        <div className={`p-6 pl-16 border-b ${isComic ? 'border-black bg-[#f0e6d2]' : 'border-black/5 bg-white/40'}`}>
                            <div className="flex items-start gap-4">
                                <div className={`p-2.5 rounded-xl border text-2xl shadow-sm backdrop-blur-md 
                                    ${isComic ? 'bg-[#fff] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' :
                                        'bg-white/50 border-white/50'}`}>
                                    {getIcon(activeNode.type)}
                                </div>
                                <div className="overflow-hidden flex-1 pt-0.5">
                                    <div className="flex items-center gap-2">
                                        <h2 className={`text-lg font-bold truncate tracking-tight ${isComic ? 'text-black' : 'text-[#1f2328]'}`}>{activeNode.name}</h2>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider border 
                                            ${isComic ? 'bg-[#fff] text-black border-black' :
                                                'bg-black/5 text-[#656d76] border-black/5'
                                            }`}>{activeNode.type}</span>
                                        {/* Show path for FileSystemNode, or extra info for UniverseNode */}
                                        {node && <div className={`text-xs font-mono truncate opacity-60 ${isComic ? 'text-black' : 'text-[#656d76]'}`} title={node.path}>{node.path}</div>}
                                        {universeNode && universeNode.type === 'REPO' && <div className={`text-xs font-mono truncate opacity-60 ${isComic ? 'text-black' : 'text-[#656d76]'}`}>⭐ {universeNode.stargazers_count}</div>}
                                    </div>
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className={`flex gap-1 mt-6 p-1.5 rounded-xl ${isComic ? 'bg-black/10' : 'bg-black/5'}`}>
                                <button
                                    onClick={() => setActiveTab('DETAILS')}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${activeTab === 'DETAILS'
                                        ? (isComic ? 'bg-[#fff] text-black border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-[#1f2328] shadow-lg shadow-black/5')
                                        : (isComic ? 'text-black hover:bg-white/50' : 'text-[#656d76] hover:text-[#1f2328]')
                                        }`}
                                >
                                    Details
                                </button>
                                <button
                                    onClick={() => setActiveTab('CHAT')}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${activeTab === 'CHAT'
                                        ? (isComic ? 'bg-[#fff] text-black border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-[#1f2328] shadow-lg shadow-black/5')
                                        : (isComic ? 'text-black hover:bg-white/50' : 'text-[#656d76] hover:text-[#1f2328]')
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

                                    {/* FileSystemNode Summary */}
                                    {node && node.summary ? (
                                        <div className="animate-fadeIn">
                                            <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 opacity-70 ${isComic ? 'text-black' : 'text-[#1f2328]'}`}>
                                                Purpose & Architecture
                                            </h3>
                                            <div className={`text-sm leading-relaxed prose ${isComic ? 'text-black' : 'text-[#1f2328]'}`}>
                                                <div dangerouslySetInnerHTML={renderMarkdown(node.summary)} />
                                            </div>
                                        </div>
                                    ) : (
                                        node && (
                                            <div className="text-center py-12">
                                                {isAnalyzingFolder ? (
                                                    <div className={`flex flex-col items-center gap-3 ${isComic ? 'text-black' : 'text-[#656d76]'}`}>
                                                        <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${isComic ? 'border-black' : 'border-[#656d76]'}`}></div>
                                                        <p className="text-xs font-medium">Analyzing contents...</p>
                                                    </div>
                                                ) : (
                                                    <p className={`text-xs ${isComic ? 'text-black' : 'text-[#656d76]'}`}>No description available.</p>
                                                )}
                                            </div>
                                        )
                                    )}

                                    {/* UniverseNode Details */}
                                    {universeNode && (
                                        <div className="animate-fadeIn">
                                            {universeNode.type === 'REPO' && universeNode.data && (
                                                <div className="space-y-4">
                                                    <div>
                                                        <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 opacity-70 ${isComic ? 'text-black' : 'text-[#1f2328]'}`}>Description</h3>
                                                        <p className={`text-sm ${isComic ? 'text-black' : 'text-[#1f2328]'}`}>{universeNode.data.description || "No description provided."}</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className={`p-3 rounded-lg border ${isComic ? 'border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'border-black/5 bg-black/5'}`}>
                                                            <div className="text-xs opacity-70">Stars</div>
                                                            <div className="text-lg font-bold">{universeNode.data.stargazers_count}</div>
                                                        </div>
                                                        <div className={`p-3 rounded-lg border ${isComic ? 'border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'border-black/5 bg-black/5'}`}>
                                                            <div className="text-xs opacity-70">Forks</div>
                                                            <div className="text-lg font-bold">{universeNode.data.forks_count}</div>
                                                        </div>
                                                        <div className={`p-3 rounded-lg border ${isComic ? 'border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'border-black/5 bg-black/5'}`}>
                                                            <div className="text-xs opacity-70">Language</div>
                                                            <div className="text-lg font-bold">{universeNode.data.language || "N/A"}</div>
                                                        </div>
                                                        <div className={`p-3 rounded-lg border ${isComic ? 'border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'border-black/5 bg-black/5'}`}>
                                                            <div className="text-xs opacity-70">Issues</div>
                                                            <div className="text-lg font-bold">{universeNode.data.open_issues_count}</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        className={`w-full py-2 rounded-lg font-bold text-sm transition-all ${isComic ? 'bg-[#2da44e] text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#2c974b]' : 'bg-[#2da44e] text-white hover:bg-[#2c974b]'}`}
                                                        onClick={() => window.open(universeNode.data?.html_url, '_blank')}
                                                    >
                                                        View on GitHub
                                                    </button>
                                                </div>
                                            )}
                                            {universeNode.type === 'LANGUAGE' && (
                                                <div className="text-center py-8">
                                                    <div className="text-4xl mb-4">🌐</div>
                                                    <p className={`text-sm ${isComic ? 'text-black' : 'text-[#1f2328]'}`}>
                                                        This cluster represents all your repositories written in <strong>{universeNode.name}</strong>.
                                                        <br /><br />
                                                        Click on the planet to expand/collapse the repositories.
                                                    </p>
                                                </div>
                                            )}
                                            {universeNode.type === 'USER' && (
                                                <div className="text-center py-8">
                                                    <div className="text-4xl mb-4">👤</div>
                                                    <p className={`text-sm ${isComic ? 'text-black' : 'text-[#1f2328]'}`}>
                                                        This is your GitHub Universe.
                                                        <br /><br />
                                                        Planets represent languages, and satellites are your repositories.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <hr className={`border-t ${isComic ? 'border-black' : 'border-black/5'}`} />

                                    {/* Code Preview (FileSystemNode only) */}
                                    {node && node.type === NodeType.FILE && node.content && (
                                        <div className="animate-fadeIn delay-100">
                                            <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 opacity-70 ${isComic ? 'text-black' : 'text-[#1f2328]'}`}>Code Preview</h3>
                                            <div className={`rounded-xl border overflow-hidden shadow-inner ${isComic ? 'border-black bg-white' : 'border-black/5 bg-[#f6f8fa]/50'}`}>
                                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-4">
                                                    <pre className={`text-xs font-mono whitespace-pre-wrap break-words leading-relaxed bg-transparent p-0 border-none m-0 ${isComic ? 'text-black' : 'text-[#1f2328]'}`}>
                                                        {node.content.slice(0, 2000)}{node.content.length > 2000 && <span className="opacity-50 italic">... (truncated)</span>}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Children List (FileSystemNode only) */}
                                    {node && node.children && node.children.length > 0 && (
                                        <div className="animate-fadeIn delay-200">
                                            <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 opacity-70 ${isComic ? 'text-black' : 'text-[#1f2328]'}`}>
                                                {node.type === NodeType.FOLDER ? 'Contents' : 'Defined Symbols'}
                                            </h3>
                                            <div className={`border rounded-xl divide-y overflow-hidden ${isComic ? 'border-black divide-black bg-white' : 'border-black/5 divide-black/5'}`}>
                                                {node.children.map((child, idx) => (
                                                    <div key={idx} className={`flex items-center gap-3 p-3 px-4 transition-colors ${isComic ? 'hover:bg-black/5 bg-transparent' : 'hover:bg-black/5 bg-transparent'
                                                        }`}>
                                                        <span className="text-xs opacity-70">{getIcon(child.type)}</span>
                                                        <span className={`text-xs font-medium truncate ${isComic ? 'text-black' : 'text-[#1f2328]'}`}>{child.name}</span>
                                                        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${isComic ? 'text-black bg-[#f0e6d2] border border-black' : 'text-[#656d76] bg-[#eff1f3]'
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
                                                <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${isComic ? 'bg-white border border-black' : 'bg-black/5'}`}>
                                                    <span className="text-2xl">💬</span>
                                                </div>
                                                <p className={`text-sm font-medium ${isComic ? 'text-black' : 'text-[#656d76]'}`}>Start a conversation about this context.</p>
                                            </div>
                                        )}
                                        {chatHistory.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideIn`}>
                                                <div className={`max-w-[90%] rounded-2xl p-4 text-sm leading-relaxed border shadow-sm backdrop-blur-md ${msg.role === 'user'
                                                    ? (isComic ? 'bg-[#89CFF0] text-black border-black border-2 rounded-br-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-[#0969da]/10 text-[#1f2328] border-[#0969da]/20 rounded-br-sm')
                                                    : (isComic ? 'bg-white text-black border-black border-2 rounded-bl-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white/80 text-[#1f2328] border-white/40 rounded-bl-sm')
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
                                                <div className={`rounded-2xl rounded-bl-sm p-4 border flex gap-1.5 shadow-sm ${isComic ? 'bg-white border-black border-2' : 'bg-white/60 border-black/5'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isComic ? 'bg-black' : 'bg-[#656d76]'}`}></div>
                                                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce delay-75 ${isComic ? 'bg-black' : 'bg-[#656d76]'}`}></div>
                                                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce delay-150 ${isComic ? 'bg-black' : 'bg-[#656d76]'}`}></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className={`p-4 border-t ${isComic ? 'border-black bg-[#f0e6d2]' : 'border-black/5 bg-white/40'}`}>
                                        <div className="relative flex gap-2">
                                            <input
                                                type="text"
                                                className={`flex-1 border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-transparent transition-all ${isComic
                                                    ? 'border-black text-black placeholder-black/50 focus:ring-black bg-white'
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
                                                className={`px-4 rounded-xl disabled:opacity-50 transition-all font-semibold text-sm shadow-lg hover:shadow-xl active:scale-95 ${isComic ? 'bg-[#0969da] text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#0860ca]' : 'bg-[#0969da] text-white hover:bg-[#0860ca]'
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
                    <div className={`flex-1 flex items-center justify-center p-10 text-center ${isComic ? 'text-black' : 'text-[#656d76]'}`}>
                        <div className="animate-pulse">
                            <div className="text-5xl mb-4 opacity-20">←</div>
                            <p className="text-sm font-medium">Select a node to view details</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
