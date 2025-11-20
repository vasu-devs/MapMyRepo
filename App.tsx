import React, { useState, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { RepoVisualizer } from './components/RepoVisualizer';
import { Sidebar } from './components/Sidebar';
import { FileSystemNode } from './types';

const App: React.FC = () => {
  const [data, setData] = useState<FileSystemNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<FileSystemNode | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (link) {
      link.href = isDarkMode ? '/favicon-dark.svg' : '/favicon-light.svg';
    }
  }, [isDarkMode]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden relative font-['JetBrains_Mono'] transition-colors duration-300 ${isDarkMode ? 'bg-[#0d1117] text-white' : 'bg-[#ffffff] text-black'}`}>
      
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-6 z-50 pointer-events-none">
        
        {/* Left Side: Title (Home) or Upload New (Map) */}
        <div className="pointer-events-auto flex items-center gap-3">
          {!data && (
            <>
              <svg className={`w-8 h-8 ${isDarkMode ? 'text-white' : 'text-black'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="3" strokeWidth={2} />
                <circle cx="5" cy="19" r="3" strokeWidth={2} />
                <circle cx="19" cy="19" r="3" strokeWidth={2} />
                <line x1="12" y1="8" x2="5" y2="16" strokeWidth={2} />
                <line x1="12" y1="8" x2="19" y2="16" strokeWidth={2} />
              </svg>
              <span className={`text-2xl font-semibold tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>
                MapMyRepo
              </span>
            </>
          )}
          {data && (
            <button
              onClick={() => setData(null)}
              className={`px-4 py-2 rounded-md border text-sm font-medium tracking-wide transition-all flex items-center gap-2 ${isDarkMode
                ? 'border-[#30363d] text-white hover:border-[#58a6ff] hover:text-[#58a6ff] bg-[#0d1117]/50 backdrop-blur-md'
                : 'border-[#d0d7de] text-black hover:border-[#0969da] hover:text-[#0969da] bg-white/50 backdrop-blur-md'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Upload New
            </button>
          )}
        </div>

        {/* Right Side: GitHub & Theme Toggle */}
        <div className="flex items-center gap-6 pointer-events-auto px-6 py-2">
          <a
            href="https://github.com/vasu-devs/MapMyRepo"
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2 transition-all hover:scale-110 ${isDarkMode 
              ? 'text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' 
              : 'text-black hover:drop-shadow-[0_0_8px_rgba(0,0,0,0.3)]'}`}
          >
            <svg height="24" viewBox="0 0 16 16" version="1.1" width="24" aria-hidden="true" fill="currentColor">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
            </svg>
          </a>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 transition-all hover:scale-110 ${isDarkMode
              ? 'text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'
              : 'text-black hover:drop-shadow-[0_0_8px_rgba(0,0,0,0.3)]'
              }`}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      <div className="flex-1 relative overflow-hidden">
        {!data ? (
          <FileUploader
            onUploadComplete={(rootNode) => {
              setData(rootNode);
              setSelectedNode(null);
            }}
            isDarkMode={isDarkMode}
          />
        ) : (
          <>
            <div className="absolute inset-0 z-0">
              <RepoVisualizer
                data={data}
                onNodeSelect={setSelectedNode}
                isDarkMode={isDarkMode}
              />
            </div>
            <Sidebar node={selectedNode} isDarkMode={isDarkMode} />
          </>
        )}
      </div>

      {/* Footer */}
      <footer className={`absolute bottom-4 w-full text-center text-xs z-50 pointer-events-none ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        <span className="pointer-events-auto">
          Made with ❤️ by <a href="https://github.com/vasu-devs" target="_blank" rel="noopener noreferrer" className={`hover:underline ${isDarkMode ? 'hover:text-white' : 'hover:text-black'}`}>Vasu-Devs</a>
          <span className="mx-2">|</span>
          <a href="https://x.com/Vasu_Devs" target="_blank" rel="noopener noreferrer" className={`hover:underline ${isDarkMode ? 'hover:text-white' : 'hover:text-black'}`}>Twitter</a>
        </span>
      </footer>
    </div>
  );
};

export default App;