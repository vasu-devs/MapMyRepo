import React, { useState, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { RepoVisualizer } from './components/RepoVisualizer';
import { Sidebar } from './components/Sidebar';
import { UserUniverse } from './components/UserUniverse';
import { ErrorBoundary } from './components/ErrorBoundary';
import { fetchUserRepos, fetchRepoTree } from './services/githubService';
import { FileSystemNode, GithubRepo, UniverseNode } from './types';
import { Github, Share2 } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<FileSystemNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<FileSystemNode | null>(null);

  // --- Cursor & Canvas State (Global for Home) ---
  const [hasMoved, setHasMoved] = useState(false);
  // Refs for direct DOM manipulation
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const nodeRef = React.useRef<HTMLDivElement>(null);
  // Animation State Refs
  const lastMouseMoveRef = React.useRef(Date.now());
  const mousePosRef = React.useRef({ x: 0, y: 0 });

  // Theme State
  const [theme, setTheme] = useState<'modern' | 'pencil' | 'comic'>('comic');

  // User Universe State
  const [viewMode, setViewMode] = useState<'home' | 'universe' | 'repo'>('home');
  const [universeData, setUniverseData] = useState<GithubRepo[]>([]);
  const [profileUrl, setProfileUrl] = useState('');
  const [isLoadingUniverse, setIsLoadingUniverse] = useState(false);
  const [universeError, setUniverseError] = useState<string | null>(null);
  const [selectedUniverseNode, setSelectedUniverseNode] = useState<UniverseNode | null>(null);
  const [isEmbed, setIsEmbed] = useState(false);

  // Transition State
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionTargetId, setTransitionTargetId] = useState<string | null>(null);

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareMode, setShareMode] = useState<'link' | 'embed' | 'markdown'>('link');
  const [copyFeedback, setCopyFeedback] = useState(false);

  const isPencil = theme === 'pencil';
  const isComic = theme === 'comic';
  const sketchyBorder = (isPencil || isComic) ? { borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' } : {};

  useEffect(() => {
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (link) {
      link.href = '/favicon-light.svg';
    }
  }, []);

  // --- Cursor Animation Effects ---

  // DOM Cursor Movement (Dedicated listener)
  useEffect(() => {
    if (viewMode !== 'home') return; // Only run on home

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
  }, [hasMoved, viewMode]);

  // Canvas Animation Effect (Comet Streak + Floating Dots)
  useEffect(() => {
    if (viewMode !== 'home') return; // Only run on home

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
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mouseX = mousePosRef.current.x;
      const mouseY = mousePosRef.current.y;
      const now = Date.now();
      const isIdle = (now - lastMouseMoveRef.current) > 100; // 100ms idle threshold

      // Update trail
      trail.push({ x: mouseX, y: mouseY });
      if (trail.length > trailLength) trail.shift();

      // Update Cursor Size
      if (isIdle && cursorGlowSize > baseGlowSize) {
        cursorGlowSize *= 0.95;
        if (cursorGlowSize < baseGlowSize) cursorGlowSize = baseGlowSize;
      } else if (cursorGlowSize > baseGlowSize) {
        cursorGlowSize *= 0.995;
      }

      // 1. Draw Floating Dots & Handle Collection
      // Theme Colors
      const isComicTheme = theme === 'comic';
      const isPencilTheme = theme === 'pencil';

      const dotColor = isComicTheme ? 'rgba(255, 204, 0, 0.6)' : (isPencilTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(9, 105, 218, 0.5)');
      const trailColor = isComicTheme ? '255, 204, 0' : (isPencilTheme ? '0, 0, 0' : '255, 255, 255');
      const gridColor = isComicTheme ? '#d4a017' : (isPencilTheme ? '#000000' : '#0969da');
      const gridOpacity = isComicTheme ? 1 : 1.5;

      ctx.fillStyle = dotColor;

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
          ctx.strokeStyle = `rgba(${trailColor}, ${opacity})`;
          ctx.stroke();
        }
      }

      // Head Glow
      if (trail.length > 0) {
        const head = trail[trail.length - 1];
        const gradient = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, cursorGlowSize);
        gradient.addColorStop(0, `rgba(${trailColor}, 0.8)`);
        gradient.addColorStop(0.4, `rgba(${trailColor}, 0.2)`);
        gradient.addColorStop(1, `rgba(${trailColor}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(head.x, head.y, cursorGlowSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Masking - Keep only the parts of the grid that overlap with the light
      ctx.globalCompositeOperation = 'source-in';

      // 4. Draw the Grid
      ctx.beginPath();
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = isPencilTheme ? 0.5 : 1.5;

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

    // Add theme to dependency array to re-render colors
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [viewMode, theme]);

  const extractUsername = (url: string): string | null => {
    try {
      let processedUrl = url.trim();
      if (!processedUrl) return null;

      // Handle simple username input (e.g. "vasu-devs")
      if (!processedUrl.includes('.') && !processedUrl.includes('/')) {
        return processedUrl.replace('@', '');
      }

      // Add protocol if missing
      if (!processedUrl.startsWith('http')) {
        processedUrl = 'https://' + processedUrl;
      }

      const urlObj = new URL(processedUrl);
      // Allow github.com and www.github.com
      if (urlObj.hostname !== 'github.com' && urlObj.hostname !== 'www.github.com') {
        return null;
      }

      // Extract username from path (e.g. /vasu-devs/MapMyRepo -> vasu-devs)
      const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
      return pathParts[0] || null;
    } catch (e) {
      console.error("Error extracting username:", e);
      return null;
    }
  };

  const handleScanUniverse = async (urlOverride?: string) => {
    const urlToProcess = urlOverride || profileUrl;
    if (!urlToProcess.trim()) return;

    const username = extractUsername(urlToProcess);
    console.log('Extracted username:', username);

    if (!username) {
      setUniverseError(`Could not extract username from URL: "${urlToProcess}"`);
      return;
    }

    setIsLoadingUniverse(true);
    setUniverseError(null);
    try {
      const repos = await fetchUserRepos(username);
      if (repos.length === 0) {
        setUniverseError(`No public repositories found for user "${username}".`);
      } else {
        setUniverseData(repos);
        console.log('Universe Data set:', repos);
        setViewMode('universe');
        // Update URL without reloading
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('user', username);
        window.history.pushState({}, '', newUrl);
      }
    } catch (err: any) {
      console.error('Scan Error:', err);
      setUniverseError(`Error: ${err.message}`);
    } finally {
      setIsLoadingUniverse(false);
    }
  };

  useEffect(() => {
    const queryParams = new URL(window.location.href).searchParams;
    const userParam = queryParams.get('user');
    const repoParam = queryParams.get('repo');
    const embedParam = queryParams.get('embed');

    if (embedParam === 'true') {
      setIsEmbed(true);
    }

    if (userParam && repoParam) {
      // Load specific repo directly
      setIsLoadingUniverse(true);
      fetchRepoTree(userParam, repoParam)
        .then(tree => {
          if (tree) {
            setData(tree);
            setViewMode('repo');
          }
        })
        .catch(err => {
          console.error("Failed to load repo from URL:", err);
          alert("Failed to load repository: " + err.message);
          // Fallback to universe or home?
          if (userParam) {
            setProfileUrl(`https://github.com/${userParam}`);
            handleScanUniverse(`https://github.com/${userParam}`);
          }
        })
        .finally(() => {
          setIsLoadingUniverse(false);
        });

    } else if (userParam) {
      setProfileUrl(`https://github.com/${userParam}`);
      handleScanUniverse(`https://github.com/${userParam}`);
    }
  }, []);

  const handleRepoSelect = async (repo: GithubRepo) => {
    console.log('handleRepoSelect called with:', repo);
    try {
      setIsLoadingUniverse(true);

      // 1. Try to get username from the repo object itself (best source)
      let username = repo.owner?.login;

      // 2. If missing, try to get it from the universeData (if we are in universe mode)
      if (!username && universeData.length > 0) {
        username = universeData[0].owner.login;
      }

      // 3. Fallback (should rarely happen if data is correct)
      if (!username) {
        throw new Error("Could not determine owner of the repository.");
      }

      const tree = await fetchRepoTree(username, repo.name);
      if (tree) {
        setData(tree);
        // Update URL to include repo
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('repo', repo.name);
        window.history.pushState({}, '', newUrl);

        // Start Transition
        setTransitionTargetId(`repo-${repo.id}`);
        setIsTransitioning(true);
        setSelectedNode(null);
      }
    } catch (e: any) {
      console.error('Failed to load repo details', e);
      alert(e.message || 'Failed to load repository details.');
    } finally {
      setIsLoadingUniverse(false);
    }
  };

  const handleTransitionComplete = () => {
    if (isTransitioning) {
      setViewMode('repo');
      setIsTransitioning(false);
      setTransitionTargetId(null);
    }
  };

  // Determine font based on theme
  const fontClass = (theme === 'pencil' || theme === 'comic') ? "font-['Patrick_Hand']" : "font-['JetBrains_Mono']";

  // Background for Home Page (Comic & Crayon Theme)
  const homeBackgroundStyle = (isComic) ? {
    backgroundColor: '#f0e6d2',
    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.6\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.15\' fill=\'%238b7355\'/%3E%3C/svg%3E")'
  } : {};

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden relative ${fontClass} transition-colors duration-300 bg-[#ffffff] text-black ${viewMode === 'home' ? 'cursor-none' : ''}`}
      style={viewMode === 'home' ? homeBackgroundStyle : {}}
    >

      {/* Navbar */}
      {/* Navbar */}
      {!isEmbed && (
        <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 md:px-8 py-4 md:py-6 z-50 pointer-events-none">

          {/* Left Side: Title (Home) or Upload New (Map) */}
          <div className="pointer-events-auto flex items-center gap-3">
            {(viewMode !== 'home') && (
              <button
                onClick={() => {
                  if (viewMode === 'repo' && universeData.length > 0) {
                    // Update URL to remove repo param but keep user
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.delete('repo');
                    window.history.pushState({}, '', newUrl);

                    setViewMode('universe');
                    setSelectedNode(null);
                  } else {
                    setData(null);
                    setViewMode('home');
                    setUniverseData([]);
                    setProfileUrl('');
                    setSelectedNode(null);
                    setSelectedUniverseNode(null);

                    // Clear all params
                    window.history.pushState({}, '', window.location.pathname);
                  }
                }}
                className={`flex items-center gap-2 transition-all 
                ${viewMode === 'universe' && (theme === 'pencil' || theme === 'comic')
                    ? `px-4 py-2 rounded-md shadow-md transform -rotate-1 hover:rotate-0 hover:scale-105 border-2 ${theme === 'pencil' ? 'bg-white text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : (theme === 'comic' ? 'bg-[#ffcc00] text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-[#4a90e2] text-white border-[#2c3e50]')}`
                    : 'text-gray-600 hover:text-black'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span className={viewMode === 'universe' && (theme === 'pencil' || theme === 'comic') ? "text-lg font-bold" : "font-semibold"}>
                  {viewMode === 'repo' && universeData.length > 0 ? "Back to Universe" : "Back to Home"}
                </span>
              </button>
            )}

            {/* Share Button (Visible when not in Home) */}
            {(viewMode !== 'home') && (
              <button
                onClick={() => {
                  setIsShareModalOpen(true);
                  navigator.clipboard.writeText(window.location.href);
                  setCopyFeedback(true);
                  setTimeout(() => setCopyFeedback(false), 2000);
                }}
                className={`flex items-center gap-2 p-2 rounded-md transition-all
            ${(theme === 'pencil' || theme === 'comic')
                    ? `border-2 ${theme === 'pencil' ? 'bg-white text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : ((theme === 'comic') ? 'bg-[#ffcc00] text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : '')}`
                    : 'hover:bg-gray-100 text-gray-600 hover:text-black'
                  }`}
                title="Share this map"
              >
                <Share2 className="w-5 h-5" />
                <span className={`hidden md:inline ${(theme === 'pencil' || theme === 'comic') ? "font-bold" : "font-semibold"}`}>Share</span>
              </button>
            )}

            {viewMode === 'home' && (
              <div className="flex items-center gap-2">
                <svg className={`w-8 h-8 text-black`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="3" strokeWidth={2} />
                  <circle cx="5" cy="19" r="3" strokeWidth={2} />
                  <circle cx="19" cy="19" r="3" strokeWidth={2} />
                  <line x1="12" y1="8" x2="5" y2="16" strokeWidth={2} />
                  <line x1="12" y1="8" x2="19" y2="16" strokeWidth={2} />
                </svg>
                <span className={`text-2xl font-semibold tracking-tight text-black`}>
                  MapMyRepo
                </span>
              </div>
            )}
          </div>

          {/* Center: Profile Link (Universe View Only) */}
          {viewMode === 'universe' && universeData.length > 0 && (
            <div className="pointer-events-auto absolute left-1/2 transform -translate-x-1/2 top-6">
              <a
                href={`https://github.com/${universeData[0].owner.login}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xl hover:underline 
                ${(theme === 'pencil' || theme === 'comic') ? 'font-bold' : ''} 
                ${theme === 'pencil' ? 'text-black' : 'text-black'}`}
              >
                @{universeData[0].owner.login}
              </a>
            </div>
          )}

          {/* Right Side: Appearance, GitHub & Theme Toggle */}
          <div className="flex items-center gap-4 pointer-events-auto px-6 py-2">

            {/* Appearance Dropdown */}
            <div className="relative group">
              <button className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all border 
              ${theme === 'pencil' ? 'bg-white border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' :
                  (theme === 'comic' ? 'bg-[#ffcc00] border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' :
                    'bg-white border-[#d0d7de] text-gray-700 hover:text-black')}`}>
                <span className={(theme === 'pencil' || theme === 'comic') ? "font-['Patrick_Hand'] font-bold" : ""}>Appearance</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {/* Dropdown Menu */}
              <div className={`absolute right-0 top-full mt-2 w-48 rounded-md shadow-lg border overflow-hidden transition-all opacity-0 invisible group-hover:opacity-100 group-hover:visible transform origin-top-right z-50 
              ${(theme === 'pencil' || theme === 'comic') ? 'bg-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' :
                  'bg-white border-[#d0d7de]'}`}>
                <div className="p-1 flex flex-col gap-1">
                  <button
                    onClick={() => setTheme('modern')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between group/item ${theme === 'modern' ? 'bg-[#0969da] text-white' : 'hover:bg-[#f6f8fa] text-gray-700'}`}
                  >
                    <span className="font-['JetBrains_Mono']">Modern</span>
                    {theme === 'modern' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <button
                    onClick={() => setTheme('pencil')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between group/item ${theme === 'pencil' ? 'bg-black text-white' : 'hover:bg-[#f6f8fa] text-gray-700'}`}
                  >
                    <span className="font-['Patrick_Hand'] font-bold tracking-wide">Pencil</span>
                    {theme === 'pencil' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <button
                    onClick={() => setTheme('comic')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between group/item ${theme === 'comic' ? 'bg-[#ffcc00] text-black border-2 border-black' : 'hover:bg-[#f6f8fa] text-gray-700'}`}
                  >
                    <span className="font-['Patrick_Hand'] font-bold tracking-wide">Comic</span>
                    {theme === 'comic' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                </div>
              </div>
            </div>

            {/* GitHub Link */}
            <a
              href="https://github.com/vasu-devs/MapMyRepo"
              target="_blank"
              rel="noopener noreferrer"
              className={`p-2 rounded-full transition-all duration-300 ${theme === 'modern'
                ? 'bg-black/5 hover:bg-black/10 backdrop-blur-md border border-black/10 text-black'
                : (theme === 'pencil' || theme === 'comic')
                  ? 'text-black hover:text-gray-700'
                  : 'bg-[#fdfdf6] border-2 border-[#2c3e50] text-[#2c3e50] shadow-[4px_4px_0px_0px_#2c3e50] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#2c3e50]'
                }`}
              title="View on GitHub"
            >
              {(theme === 'pencil' || theme === 'comic') ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                  <path d="M15 15L16 16" strokeWidth="1" strokeLinecap="round"></path>
                  <path d="M9 9L8 8" strokeWidth="1" strokeLinecap="round"></path>
                </svg>
              ) : (
                <Github size={20} />
              )}
            </a>
          </div>
        </nav >
      )}

      <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">

        {/* HOME VIEW */}
        {viewMode === 'home' && (
          <>
            {/* Interactive Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none transition-opacity duration-500 z-0"
              style={{ opacity: hasMoved ? 1 : 0 }}
            />

            {/* Global Cursor Node */}
            <div
              ref={nodeRef}
              className="fixed pointer-events-none transition-opacity duration-500 top-0 left-0 z-[100] flex items-center justify-center"
              style={{
                width: '20px',
                height: '20px',
                opacity: hasMoved ? 1 : 0,
              }}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${isPencil ? 'bg-black' : ((isComic) ? 'bg-black' : 'bg-[#0969da] shadow-[0_0_15px_4px_rgba(9,105,218,0.4)]')}`} />
              {(!isPencil && !isComic) && <div className={`absolute inset-0 rounded-full opacity-50 blur-[2px] bg-[#8dd4fc]`} />}
            </div>

            {/* Background */}
            {(isPencil || isComic) ? (
              <div className="absolute inset-0 pointer-events-none opacity-40 z-0"
                style={{
                  backgroundImage: isPencil
                    ? 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.05\'/%3E%3C/svg%3E")'
                    : 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.6\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.15\' fill=\'%238b7355\'/%3E%3C/svg%3E")' // Beige noise for Comic/Crayon
                }}
              />
            ) : (
              <div className={`absolute inset-0 bg-[linear-gradient(#e1e4e8_1px,transparent_1px),linear-gradient(90deg,#e1e4e8_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.2] pointer-events-none z-0`} />
            )}

            <div className={`z-10 flex flex-col items-center gap-8 w-full max-w-3xl px-4 animate-fade-in-up ${(isPencil || isComic) ? "font-['Patrick_Hand']" : ""}`}>

              {/* Main Action: Upload Local */}
              <div className="w-full">
                <FileUploader
                  onUploadComplete={(rootNode) => {
                    setData(rootNode);
                    setViewMode('repo');
                    setSelectedNode(null);
                  }}
                  theme={theme}
                />
              </div>

              <div className="flex items-center gap-4 w-full">
                <div className={`h-px flex-1 ${(isPencil || isComic) ? 'bg-black/30' : 'bg-gray-300'}`}></div>
                <span className={`text-sm ${(isPencil || isComic) ? 'font-bold' : ''} ${(isComic) ? 'text-black' : 'text-gray-400'}`}>OR EXPLORE UNIVERSE</span>
                <div className={`h-px flex-1 ${(isPencil || isComic) ? 'bg-black/30' : 'bg-gray-300'}`}></div>
              </div>

              {/* Secondary Action: Explore Universe */}
              <div className="w-full flex flex-col gap-2">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Enter GitHub Profile URL (e.g. github.com/vasu-devs)"
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScanUniverse()}
                    style={sketchyBorder}
                    className={`w-full px-4 py-3 border outline-none transition-all 
                  ${(isPencil || isComic)
                        ? ((isComic) ? 'bg-white border-black text-black placeholder-black/50 focus:border-black focus:ring-1 focus:ring-black' : 'bg-white border-black text-black placeholder-gray-500 focus:border-black focus:ring-1 focus:ring-black')
                        : 'bg-white border-[#d0d7de] text-black focus:border-[#0969da] placeholder-gray-400 rounded-lg'
                      }`}
                  />
                  <button
                    onClick={handleScanUniverse}
                    disabled={isLoadingUniverse || !profileUrl.trim()}
                    style={(isPencil || isComic) ? { ...sketchyBorder, borderRadius: '15px 225px 15px 255px / 255px 15px 225px 15px' } : {}}
                    className={`absolute right-2 p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  ${(isPencil || isComic)
                        ? 'text-black hover:bg-black/10'
                        : 'hover:bg-[#f6f8fa] text-[#0969da] rounded-md'
                      }`}
                  >
                    {isLoadingUniverse ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={(isPencil || isComic) ? 2.5 : 2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    )}
                  </button>
                </div>
                {universeError && (
                  <p className={`text-xs text-center ${(isPencil || isComic) ? 'font-bold text-red-600' : 'text-red-500'}`}>{universeError}</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* UNIVERSE VIEW */}
        {viewMode === 'universe' && (
          <div className="absolute inset-0 z-0">
            <ErrorBoundary>
              <UserUniverse
                repos={universeData}
                onRepoSelect={handleRepoSelect}
                onNodeSelect={(node) => {
                  console.log('Universe Node Selected:', node);
                  setSelectedUniverseNode(node);
                }}
                theme={theme}
                focusedNodeId={transitionTargetId}
                onTransitionComplete={handleTransitionComplete}
              />
            </ErrorBoundary>

            {/* Sidebar for Universe */}
            <Sidebar
              node={null}
              universeNode={selectedUniverseNode}
              rootNode={null}
              universeData={universeData}
              theme={theme}
            />
          </div>
        )}

        {/* REPO VIEW */}
        {viewMode === 'repo' && data && (
          <>
            <div className="absolute inset-0 z-0 animate-fade-in">
              <RepoVisualizer
                data={data}
                onNodeSelect={setSelectedNode}
                theme={theme}
              />
            </div>
            <Sidebar
              node={selectedNode}
              rootNode={data}
              theme={theme}
            />
          </>
        )}
      </div>

      {/* Footer */}
      {/* Footer */}
      {
        !isEmbed && (
          <footer className={`relative md:absolute bottom-0 md:bottom-4 w-full text-center text-xs z-50 pointer-events-none py-4 md:py-0 ${(isComic) ? 'text-black' : 'text-gray-400'}`}>
            <span className="pointer-events-auto">
              Made with ❤️ by <a href="https://github.com/vasu-devs/MapMyRepo" target="_blank" rel="noopener noreferrer" className={`hover:underline ${(isComic) ? 'hover:text-black' : 'hover:text-black'}`}>Vasu-Devs</a>
              <span className="mx-2">|</span>
              <a href="https://x.com/Vasu_Devs" target="_blank" rel="noopener noreferrer" className={`hover:underline ${(isComic) ? 'hover:text-black' : 'hover:text-black'}`}>Twitter</a>
            </span>
          </footer>
        )
      }
      {/* Share Modal */}
      {
        isShareModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsShareModalOpen(false)}>
            <div
              className={`relative w-full max-w-md p-6 rounded-xl shadow-2xl transform transition-all scale-100
            ${(isPencil || isComic)
                  ? 'bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white border border-gray-200'}`}
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-black"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => { setShareMode('link'); setCopyFeedback(false); }}
                  className={`flex-1 pb-2 text-sm font-medium transition-colors relative
                  ${shareMode === 'link'
                      ? ((isPencil || isComic) ? 'text-black border-b-4 border-black' : 'text-blue-600 border-b-2 border-blue-600')
                      : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Share Link
                </button>
                <button
                  onClick={() => { setShareMode('embed'); setCopyFeedback(false); }}
                  className={`flex-1 pb-2 text-sm font-medium transition-colors relative
                  ${shareMode === 'embed'
                      ? ((isPencil || isComic) ? 'text-black border-b-4 border-black' : 'text-blue-600 border-b-2 border-blue-600')
                      : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Embed
                </button>
                <button
                  onClick={() => { setShareMode('markdown'); setCopyFeedback(false); }}
                  className={`flex-1 pb-2 text-sm font-medium transition-colors relative
                  ${shareMode === 'markdown'
                      ? ((isPencil || isComic) ? 'text-black border-b-4 border-black' : 'text-blue-600 border-b-2 border-blue-600')
                      : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Readme
                </button>
              </div>

              {/* Content */}
              {shareMode === 'link' && (
                <div className="flex flex-col gap-4 py-2">
                  <p className="text-sm text-gray-600">
                    Link copied to clipboard! You can share this URL with anyone.
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      type="text"
                      value={window.location.href}
                      className={`flex-1 p-3 text-sm rounded-lg outline-none
                    ${(isPencil || isComic)
                          ? 'border-2 border-black bg-gray-50 focus:ring-0'
                          : 'border border-gray-300 bg-gray-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        setCopyFeedback(true);
                        setTimeout(() => setCopyFeedback(false), 2000);
                      }}
                      className={`px-4 py-3 rounded-lg font-medium transition-all
                    ${(isPencil || isComic)
                          ? 'bg-[#ffcc00] border-2 border-black text-black hover:bg-[#ffdb4d] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]'
                          : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                      {copyFeedback ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {shareMode === 'embed' && (
                <div className="flex flex-col gap-4 py-2">
                  <p className="text-sm text-gray-600">
                    Embed this map on your website or documentation.
                  </p>

                  {/* Code Snippet */}
                  <div className="relative">
                    <textarea
                      readOnly
                      rows={3}
                      className={`w-full p-3 text-xs font-mono rounded-lg outline-none resize-none
                      ${(isPencil || isComic)
                          ? 'border-2 border-black bg-gray-50'
                          : 'border border-gray-300 bg-gray-50 text-gray-600'}`}
                      value={`<iframe src="${window.location.href}${window.location.search ? '&' : '?'}embed=true" width="100%" height="600px" frameborder="0" style="border: 1px solid #e1e4e8; border-radius: 8px;"></iframe>`}
                    />
                    <button
                      onClick={() => {
                        const code = `<iframe src="${window.location.href}${window.location.search ? '&' : '?'}embed=true" width="100%" height="600px" frameborder="0" style="border: 1px solid #e1e4e8; border-radius: 8px;"></iframe>`;
                        navigator.clipboard.writeText(code);
                        setCopyFeedback(true);
                        setTimeout(() => setCopyFeedback(false), 2000);
                      }}
                      className={`absolute top-2 right-2 px-3 py-1 text-xs rounded-md font-medium transition-all
                      ${(isPencil || isComic)
                          ? 'bg-[#ffcc00] border border-black text-black hover:bg-[#ffdb4d]'
                          : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                      {copyFeedback ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>

                  {/* Live Preview */}
                  <div className="space-y-2">
                    <label className={`text-xs font-bold uppercase tracking-wider ${(isPencil || isComic) ? 'text-black' : 'text-gray-500'}`}>Preview</label>
                    <div className={`w-full h-48 rounded-lg overflow-hidden border ${(isPencil || isComic) ? 'border-2 border-black' : 'border border-gray-300'}`}>
                      <iframe
                        title="Preview"
                        src={`${window.location.href}${window.location.search ? '&' : '?'}embed=true`}
                        width="100%"
                        height="100%"
                        className="w-full h-full bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {shareMode === 'markdown' && (
                <div className="flex flex-col gap-4 py-2">
                  <p className="text-sm text-gray-600">
                    Add this badge to your README.md to link directly to this visualization.
                  </p>

                  {/* Code Snippet */}
                  <div className="relative">
                    <textarea
                      readOnly
                      rows={3}
                      className={`w-full p-3 text-xs font-mono rounded-lg outline-none resize-none
                      ${(isPencil || isComic)
                          ? 'border-2 border-black bg-gray-50'
                          : 'border border-gray-300 bg-gray-50 text-gray-600'}`}
                      value={`[![Visualize in MapMyRepo](${window.location.origin}/badge.svg)](${window.location.href})`}
                    />
                    <button
                      onClick={() => {
                        const code = `[![Visualize in MapMyRepo](${window.location.origin}/badge.svg)](${window.location.href})`;
                        navigator.clipboard.writeText(code);
                        setCopyFeedback(true);
                        setTimeout(() => setCopyFeedback(false), 2000);
                      }}
                      className={`absolute top-2 right-2 px-3 py-1 text-xs rounded-md font-medium transition-all
                      ${(isPencil || isComic)
                          ? 'bg-[#ffcc00] border border-black text-black hover:bg-[#ffdb4d]'
                          : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                      {copyFeedback ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>

                  {/* Live Preview */}
                  <div className="space-y-2">
                    <label className={`text-xs font-bold uppercase tracking-wider ${(isPencil || isComic) ? 'text-black' : 'text-gray-500'}`}>Preview</label>
                    <div className={`w-full flex items-center justify-center p-8 rounded-lg border ${(isPencil || isComic) ? 'border-2 border-black bg-[#f0e6d2]' : 'border border-gray-300 bg-gray-50'}`}>
                      <img src={`${window.location.origin}/badge.svg`} alt="Visualize in MapMyRepo" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }
    </div >
  );
};

export default App;