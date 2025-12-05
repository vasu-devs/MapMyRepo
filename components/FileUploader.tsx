import React, { useRef, useState, useEffect } from 'react';
import { parseFilesToTree, parseFileEntryToTree, fetchGithubRepo } from '../services/fileService';
import { FileSystemNode } from '../types';

interface FileUploaderProps {
    onUploadComplete: (rootNode: FileSystemNode) => void;
    theme?: 'modern' | 'pencil' | 'comic';
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUploadComplete, theme = 'modern' }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [repoUrl, setRepoUrl] = useState('');



    // DOM Cursor Movement (Handled in Canvas Loop now for sync)
    // We remove the separate useEffect to avoid fighting with the idle animation

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

    const handleLoadFromGitHub = async () => {
        if (!repoUrl.trim()) return;
        setLoading(true);
        try {
            // Extract owner and repo from URL
            // Format: github.com/owner/repo or https://github.com/owner/repo
            let url = repoUrl.trim();
            if (url.startsWith('https://')) url = url.replace('https://', '');
            if (url.startsWith('http://')) url = url.replace('http://', '');
            if (url.startsWith('www.')) url = url.replace('www.', '');

            const parts = url.split('/');
            // Filter out empty strings from split
            const cleanParts = parts.filter(p => p.length > 0);

            // Expected parts: ["github.com", "owner", "repo"] or just ["owner", "repo"] if standard didn't match exactly
            // Let's assume standardized github.com/owner/repo

            let owner = '';
            let repoName = '';

            if (cleanParts[0] === 'github.com' && cleanParts.length >= 3) {
                owner = cleanParts[1];
                repoName = cleanParts[2];
            } else if (cleanParts.length === 2 && !cleanParts[0].includes('.')) {
                // assume "owner/repo" input
                owner = cleanParts[0];
                repoName = cleanParts[1];
            }

            const tree = await fetchGithubRepo(repoUrl.trim(), import.meta.env.VITE_GITHUB_TOKEN);
            if (tree) {
                onUploadComplete(tree);
                // Update URL if we successfully parsed owner/repo
                if (owner && repoName) {
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.set('user', owner);
                    newUrl.searchParams.set('repo', repoName);
                    window.history.pushState({}, '', newUrl);
                }
            }
        } catch (e: any) {
            console.error('GitHub load failed', e);
            alert(e.message || 'Failed to load repository. See console for details.');
        } finally {
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

    // --- Theme Helpers ---
    const isPencil = theme === 'pencil';
    const isComic = theme === 'comic';

    // Sketchy Border Radius for Pencil/Comic/Crayon Theme
    const sketchyBorder = (isPencil || isComic) ? { borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' } : {};

    return (
        <div className={`flex flex-col items-center justify-center h-full w-full transition-colors duration-300 relative overflow-hidden
            bg-transparent text-black
            ${(isPencil || isComic) ? "font-['Patrick_Hand']" : ""}
        `}>

            <div className="z-10 max-w-2xl w-full px-6">

                {/* Header Section */}
                <div className="mb-8 text-center">
                    <p className={`text-sm text-black ${(isPencil || isComic) ? 'text-lg font-bold tracking-wider' : ''}`}>
                        Visualize your local codebase or GitHub repository.
                    </p>
                </div>

                {/* Upload Box */}
                {/* GitHub URL Input */}
                <div className="mb-4 flex gap-2 items-center">
                    <input
                        type="text"
                        placeholder="Paste GitHub repo URL (e.g. github.com/owner/repo)"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !loading && repoUrl.trim()) {
                                handleLoadFromGitHub();
                            }
                        }}
                        style={sketchyBorder}
                        className={`flex-1 border py-2 px-3 text-sm focus:outline-none transition-all 
                        ${(isPencil || isComic)
                                ? ((isComic) ? 'bg-white border-black text-black placeholder-black/50 focus:border-black focus:ring-1 focus:ring-black' : 'bg-white border-black text-black placeholder-gray-500 focus:border-black focus:ring-1 focus:ring-black')
                                : 'bg-white border-[#d0d7de] text-black placeholder-gray-500 focus:border-[#0969da] rounded-md'
                            }`}
                    />
                    <button
                        onClick={handleLoadFromGitHub}
                        disabled={loading || !repoUrl.trim()}
                        style={sketchyBorder}
                        className={`px-4 py-2 text-white disabled:opacity-50 text-sm transition-all transform active:scale-95
                        ${(isPencil || isComic)
                                ? ((isComic) ? 'bg-[#ffcc00] text-black border-2 border-black hover:bg-[#ffdb4d] font-bold disabled:text-black/50' : 'bg-black text-white border-2 border-transparent hover:border-black hover:bg-white hover:text-black font-bold')
                                : 'bg-[#0969da] hover:bg-[#0860ca] rounded-md'
                            }`}
                    >
                        {loading ? 'Loading...' : 'Load'}
                    </button>
                </div>

                {/* Separator */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className={`w-full border-t ${(isPencil || isComic) ? 'border-black/30' : 'border-[#d0d7de]'}`}></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className={`px-2 ${(isPencil || isComic) ? 'font-bold' : ''} bg-[#ffffff] text-[#656d76]`}>
                            OR
                        </span>
                    </div>
                </div>

                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    style={(isPencil || isComic) ? {
                        borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px',
                        borderWidth: '2px'
                    } : {}}
                    className={`
                relative group cursor-pointer border-dashed transition-all duration-200
                flex flex-col items-center justify-center py-8 md:py-12 px-4 md:px-8
                ${(isPencil || isComic)
                            ? (isDragging
                                ? 'bg-gray-50 border-black text-black scale-[1.02]'
                                : 'bg-transparent border-black/50 hover:border-black hover:bg-gray-50')
                            : (isDragging
                                ? 'bg-[#f3f9ff] border-[#0969da] ring-2 ring-[#0969da] ring-opacity-20 rounded-md'
                                : 'bg-[#f6f8fa] border-[#d0d7de] hover:bg-[#f3f4f6] hover:border-[#8c959f] rounded-md')
                        }
            `}
                >
                    {loading ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin border-[#656d76]`}></div>
                            <span className={`text-sm font-medium text-[#1f2328]`}>Processing files...</span>
                        </div>
                    ) : (
                        <>
                            <div className={`mb-2 transition-colors text-[#656d76] group-hover:text-[#1f2328]`}>
                                <svg className="w-8 h-8 mx-auto mb-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={(isPencil || isComic) ? 2.5 : 1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <span className={`text-sm block text-center ${(isPencil || isComic) ? 'font-bold text-lg' : 'font-semibold'}`}>
                                    Upload a directory
                                </span>
                            </div>
                            <span className={`text-xs text-[#656d76]`}>
                                Drag & drop or <span className={`${(isPencil || isComic) ? 'text-black underline' : 'text-[#0969da]'} hover:underline`}>browse</span>
                            </span>
                        </>
                    )}
                </div>

                <div className={`mt-6 flex items-center justify-center gap-2 text-xs border p-3 shadow-sm 
                    ${(isPencil || isComic)
                        ? 'bg-white border-black text-black'
                        : 'bg-white border-[#d0d7de] text-[#656d76] rounded-md'
                    }`}
                    style={sketchyBorder}
                >
                    <svg className={`w-4 h-4 flex-shrink-0 text-[#656d76]`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p>
                        <span className="font-semibold">Pro tip:</span> Dragging a folder directly onto the box above is the fastest way.
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