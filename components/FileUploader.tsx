import React, { useRef, useState, useEffect } from 'react';
import { parseFilesToTree, parseFileEntryToTree, fetchGithubRepo } from '../services/fileService';
import { FileSystemNode } from '../types';

interface FileUploaderProps {
    onUploadComplete: (rootNode: FileSystemNode) => void;
    isDarkMode?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUploadComplete, isDarkMode = false }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [repoUrl, setRepoUrl] = useState('');
    const [hasMoved, setHasMoved] = useState(false);

    // Refs for direct DOM manipulation (smoother performance)
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nodeRef = useRef<HTMLDivElement>(null);

    // Animation State Refs
    const lastMouseMoveRef = useRef(Date.now());
    const mousePosRef = useRef({ x: 0, y: 0 });

    // DOM Cursor Movement (Dedicated listener to fix lag/stuck issues)
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const x = e.clientX;
            const y = e.clientY;
            mousePosRef.current = { x, y };
            lastMouseMoveRef.current = Date.now();

            if (!hasMoved) setHasMoved(true);

            if (nodeRef.current) {
                nodeRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [hasMoved]);

    // Canvas Animation Effect (Comet Streak + Floating Dots)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let trail: { x: number; y: number }[] = [];
        const trailLength = 20;
        const gridSize = 32;

        // Floating Dots System
        interface Dot {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
        }
        let dots: Dot[] = [];
        const dotCount = 50;
        let cursorGlowSize = 25; // Base size
        const baseGlowSize = 25;
        const maxGlowSize = 150;

        const initDots = () => {
            dots = [];
            for (let i = 0; i < dotCount; i++) {
                dots.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 2 + 1
                });
            }
        };

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initDots();
        };
        window.addEventListener('resize', resize);
        resize();

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const mouseX = mousePosRef.current.x;
            const mouseY = mousePosRef.current.y;
            const now = Date.now();
            const isIdle = (now - lastMouseMoveRef.current) > 100; // 100ms idle threshold

            // Update trail
            trail.push({ x: mouseX, y: mouseY });
            if (trail.length > trailLength) trail.shift();

            // Update Cursor Size (Decay if idle or just naturally over time)
            if (isIdle && cursorGlowSize > baseGlowSize) {
                cursorGlowSize *= 0.95; // Fast decay when idle
                if (cursorGlowSize < baseGlowSize) cursorGlowSize = baseGlowSize;
            } else if (cursorGlowSize > baseGlowSize) {
                cursorGlowSize *= 0.995; // Slow decay when moving
            }

            // 1. Draw Floating Dots & Handle Collection
            ctx.fillStyle = isDarkMode ? 'rgba(88, 166, 255, 0.5)' : 'rgba(9, 105, 218, 0.5)';

            dots.forEach(dot => {
                // Move
                dot.x += dot.vx;
                dot.y += dot.vy;

                // Bounce
                if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1;
                if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1;

                // Collection Check
                const dx = mouseX - dot.x;
                const dy = mouseY - dot.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // If collected
                if (dist < cursorGlowSize) {
                    // Respawn elsewhere
                    dot.x = Math.random() * canvas.width;
                    dot.y = Math.random() * canvas.height;

                    // Grow cursor
                    if (cursorGlowSize < maxGlowSize) {
                        cursorGlowSize += 2;
                    }
                }

                // Draw Dot
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
                ctx.fill();
            });

            // 2. Draw the Trail (The "Light")
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (trail.length > 1) {
                for (let i = 0; i < trail.length - 1; i++) {
                    const p1 = trail[i];
                    const p2 = trail[i + 1];
                    const progress = i / (trail.length - 1);
                    const opacity = progress;

                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.lineWidth = 4 * (0.4 + 0.6 * progress);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                    ctx.stroke();
                }
            }

            // Head Glow (Dynamic Size)
            if (trail.length > 0) {
                const head = trail[trail.length - 1];
                const gradient = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, cursorGlowSize);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(head.x, head.y, cursorGlowSize, 0, Math.PI * 2);
                ctx.fill();
            }

            // 3. Masking - Keep only the parts of the grid that overlap with the light
            ctx.globalCompositeOperation = 'source-in';

            // 4. Draw the Grid
            ctx.beginPath();
            ctx.strokeStyle = isDarkMode ? '#58a6ff' : '#0969da';
            ctx.lineWidth = 1.5;

            for (let x = 0; x <= canvas.width; x += gridSize) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
            }
            for (let y = 0; y <= canvas.height; y += gridSize) {
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
            }
            ctx.stroke();

            ctx.globalCompositeOperation = 'source-over';
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isDarkMode]);

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
            const tree = await fetchGithubRepo(repoUrl.trim(), import.meta.env.VITE_GITHUB_TOKEN);
            if (tree) {
                onUploadComplete(tree);
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

    return (
        <div className={`flex flex-col items-center justify-center h-full w-full transition-colors duration-300 cursor-none ${isDarkMode ? 'bg-[#0d1117] text-white' : 'bg-[#ffffff] text-black'}`}>

            {/* Decorative Background Grid */}
            {/* Base Grid (Faint) */}
            <div className={`absolute inset-0 bg-[linear-gradient(${isDarkMode ? '#30363d' : '#e1e4e8'}_1px,transparent_1px),linear-gradient(90deg,${isDarkMode ? '#30363d' : '#e1e4e8'}_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.2] pointer-events-none`} />

            {/* Interactive Grid Canvas (Streak Effect) */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                style={{ opacity: hasMoved ? 1 : 0 }}
            />

            {/* Cursor Node (The actual cursor replacement) */}
            <div
                ref={nodeRef}
                className="fixed pointer-events-none transition-opacity duration-500 top-0 left-0 z-50 flex items-center justify-center"
                style={{
                    width: '20px',
                    height: '20px',
                    opacity: hasMoved ? 1 : 0,
                }}
            >
                {/* Inner Core */}
                <div className={`w-2.5 h-2.5 rounded-full ${isDarkMode ? 'bg-white shadow-[0_0_10px_2px_rgba(56,139,253,0.8)]' : 'bg-[#0969da] shadow-[0_0_15px_4px_rgba(9,105,218,0.4)]'}`} />
                {/* Outer Ring Glow */}
                <div className={`absolute inset-0 rounded-full opacity-50 blur-[2px] ${isDarkMode ? 'bg-[#58a6ff]' : 'bg-[#8dd4fc]'}`} />
            </div>

            <div className="z-10 max-w-2xl w-full px-6">

                {/* Header Section */}
                <div className="mb-8 text-center">
                    <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>
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
                        className={`flex-1 border rounded-md py-2 px-3 text-sm focus:outline-none transition-colors ${isDarkMode
                            ? 'bg-[#0d1117] border-[#30363d] text-white placeholder-gray-400 focus:border-[#58a6ff]'
                            : 'bg-white border-[#d0d7de] text-black placeholder-gray-500 focus:border-[#0969da]'
                            }`}
                    />
                    <button
                        onClick={handleLoadFromGitHub}
                        disabled={loading || !repoUrl.trim()}
                        className={`px-3 py-2 text-white rounded-md disabled:opacity-50 text-sm transition-colors ${isDarkMode ? 'bg-[#238636] hover:bg-[#2ea043]' : 'bg-[#0969da] hover:bg-[#0860ca]'
                            }`}
                    >
                        {loading ? 'Loading...' : 'Load'}
                    </button>
                </div>

                {/* Separator */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className={`w-full border-t ${isDarkMode ? 'border-[#30363d]' : 'border-[#d0d7de]'}`}></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className={`px-2 ${isDarkMode ? 'bg-[#0d1117] text-[#8b949e]' : 'bg-[#ffffff] text-[#656d76]'}`}>
                            OR
                        </span>
                    </div>
                </div>

                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`
                relative group cursor-pointer rounded-md border border-dashed transition-all duration-200
                flex flex-col items-center justify-center py-12 px-8
                ${isDragging
                            ? (isDarkMode ? 'bg-[#161b22] border-[#58a6ff] ring-2 ring-[#58a6ff] ring-opacity-20' : 'bg-[#f3f9ff] border-[#0969da] ring-2 ring-[#0969da] ring-opacity-20')
                            : (isDarkMode ? 'bg-[#161b22] border-[#30363d] hover:bg-[#21262d] hover:border-[#8b949e]' : 'bg-[#f6f8fa] border-[#d0d7de] hover:bg-[#f3f4f6] hover:border-[#8c959f]')
                        }
            `}
                >
                    {loading ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${isDarkMode ? 'border-[#8b949e]' : 'border-[#656d76]'}`}></div>
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>Processing files...</span>
                        </div>
                    ) : (
                        <>
                            <div className={`mb-2 transition-colors ${isDarkMode ? 'text-[#8b949e] group-hover:text-[#c9d1d9]' : 'text-[#656d76] group-hover:text-[#1f2328]'}`}>
                                <svg className="w-8 h-8 mx-auto mb-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <span className="text-sm font-semibold block text-center">
                                    Upload a directory
                                </span>
                            </div>
                            <span className={`text-xs ${isDarkMode ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>
                                Drag & drop or <span className={`${isDarkMode ? 'text-[#58a6ff]' : 'text-[#0969da]'} hover:underline`}>browse</span>
                            </span>
                        </>
                    )}
                </div>

                <div className={`mt-6 flex items-center justify-center gap-2 text-xs border rounded-md p-3 shadow-sm ${isDarkMode ? 'bg-[#161b22] border-[#30363d] text-[#8b949e]' : 'bg-white border-[#d0d7de] text-[#656d76]'
                    }`}>
                    <svg className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? 'text-[#8b949e]' : 'text-[#656d76]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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