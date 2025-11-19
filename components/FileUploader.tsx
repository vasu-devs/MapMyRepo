import React, { useRef, useState } from 'react';
import { parseFilesToTree, parseFileEntryToTree } from '../services/fileService';
import { FileSystemNode } from '../types';

interface FileUploaderProps {
  onUploadComplete: (rootNode: FileSystemNode) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUploadComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // --- Handlers ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const processFiles = async (files: FileList) => {
    setLoading(true);
    try {
      // Small delay to allow UI to update
      setTimeout(async () => {
          const tree = await parseFilesToTree(files);
          onUploadComplete(tree);
          setLoading(false);
      }, 100);
    } catch (error) {
      console.error("Error parsing files", error);
      setLoading(false);
    }
  };

  // Drag & Drop Logic (Fixed for Recursive Folders)
  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setLoading(true);

      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
           const entry = items[0].webkitGetAsEntry();
           
           if (entry) {
               try {
                   const tree = await parseFileEntryToTree(entry);
                   onUploadComplete(tree);
               } catch (error) {
                   console.error("Error processing dropped entry", error);
               }
               setLoading(false);
               return;
           }
      }
      
      // Fallback for browsers that don't support webkitGetAsEntry (rare now)
      const files = e.dataTransfer.files;
      if (files.length > 0) {
          // If it's a flat list of files
           processFiles(files);
      } else {
          setLoading(false);
      }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[#ffffff] font-sans text-[#1f2328]">
      
      {/* Decorative Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(#e1e4e8_1px,transparent_1px),linear-gradient(90deg,#e1e4e8_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 pointer-events-none" />

      <div className="z-10 max-w-2xl w-full px-6">
        
        {/* Header Section */}
        <div className="mb-8 text-center">
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#f6f8fa] border border-[#d0d7de] mb-4 shadow-sm">
                {/* Repo/Map Icon */}
                <svg className="w-8 h-8 text-[#1f2328]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
             </div>
             <h1 className="text-2xl font-semibold tracking-tight mb-2 text-[#1f2328]">
                 Map your repository
             </h1>
             <p className="text-[#656d76] text-sm">
                 Visualize your local codebase. Drag and drop a folder to generate an interactive map.
             </p>
        </div>

        {/* Upload Box */}
        <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
                relative group cursor-pointer rounded-md border border-dashed transition-all duration-200
                flex flex-col items-center justify-center py-12 px-8
                ${isDragging 
                    ? 'bg-[#f3f9ff] border-[#0969da] ring-2 ring-[#0969da] ring-opacity-20' 
                    : 'bg-[#f6f8fa] border-[#d0d7de] hover:bg-[#f3f4f6] hover:border-[#8c959f]'
                }
            `}
        >
            {loading ? (
                <div className="flex flex-col items-center gap-3">
                     <div className="w-5 h-5 border-2 border-[#656d76] border-t-transparent rounded-full animate-spin"></div>
                     <span className="text-sm font-medium text-[#1f2328]">Processing files...</span>
                </div>
            ) : (
                <>
                    <div className="mb-2 text-[#656d76] group-hover:text-[#1f2328] transition-colors">
                         <svg className="w-8 h-8 mx-auto mb-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                         </svg>
                         <span className="text-sm font-semibold block text-center">
                            Upload a directory
                         </span>
                    </div>
                    <span className="text-xs text-[#656d76]">
                        Drag & drop or <span className="text-[#0969da] hover:underline">browse</span>
                    </span>
                </>
            )}
        </div>

        <div className="mt-6 flex items-start gap-3 text-xs text-[#656d76] bg-white border border-[#d0d7de] rounded-md p-3 shadow-sm">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#656d76]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p>
                Pro tip: Dragging a folder directly onto the box above is the fastest way and avoids browser permission popups.
            </p>
        </div>

      </div>
      
      <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          {...{ webkitdirectory: "", directory: "" } as any} 
        />
    </div>
  );
};