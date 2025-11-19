import React, { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { RepoVisualizer } from './components/RepoVisualizer';
import { Sidebar } from './components/Sidebar';
import { FileSystemNode } from './types';

const App: React.FC = () => {
  const [data, setData] = useState<FileSystemNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<FileSystemNode | null>(null);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#ffffff] text-[#1f2328] relative font-sans">
      {!data ? (
        <FileUploader onUploadComplete={(rootNode) => {
            setData(rootNode);
            setSelectedNode(null);
        }} />
      ) : (
        <>
            <div className="absolute inset-0 z-0">
                <RepoVisualizer 
                    data={data} 
                    onNodeSelect={setSelectedNode}
                />
            </div>
            
            {/* Top Left Control */}
            <div className="absolute top-6 left-6 z-10">
                 <button 
                    onClick={() => setData(null)}
                    className="bg-white border border-[#d0d7de] text-[#1f2328] hover:bg-[#f6f8fa] px-4 py-2 rounded-md shadow-sm text-xs font-semibold transition-all flex items-center gap-2"
                 >
                    <svg className="w-4 h-4 text-[#656d76]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Upload New Repo
                 </button>
            </div>

            <Sidebar node={selectedNode} />
        </>
      )}
    </div>
  );
};

export default App;