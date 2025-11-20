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
    <div className={`flex h-screen w-screen overflow-hidden relative font-sans transition-colors duration-300 ${isDarkMode ? 'bg-[#0d1117] text-[#c9d1d9]' : 'bg-[#ffffff] text-[#1f2328]'}`}>
      {!data ? (
        <FileUploader
          onUploadComplete={(rootNode) => {
            setData(rootNode);
            setSelectedNode(null);
          }}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
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

          {/* Top Left Control */}
          <div className="absolute top-6 left-6 z-10 flex gap-3">
            <button
              onClick={() => setData(null)}
              className={`border px-4 py-2 rounded-md shadow-sm text-xs font-semibold transition-all flex items-center gap-2 ${isDarkMode
                  ? 'bg-[#21262d] border-[#30363d] text-[#c9d1d9] hover:bg-[#30363d]'
                  : 'bg-white border-[#d0d7de] text-[#1f2328] hover:bg-[#f6f8fa]'
                }`}
            >
              <svg className={`w-4 h-4 ${isDarkMode ? 'text-[#8b949e]' : 'text-[#656d76]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Upload New Repo
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`border px-3 py-2 rounded-md shadow-sm text-xs font-semibold transition-all ${isDarkMode
                  ? 'bg-[#21262d] border-[#30363d] text-[#c9d1d9] hover:bg-[#30363d]'
                  : 'bg-white border-[#d0d7de] text-[#1f2328] hover:bg-[#f6f8fa]'
                }`}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>

          <Sidebar node={selectedNode} isDarkMode={isDarkMode} />
        </>
      )}
    </div>
  );
};

export default App;