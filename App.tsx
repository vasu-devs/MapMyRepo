import React, { useState, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { RepoVisualizer } from './components/RepoVisualizer';
import { Sidebar } from './components/Sidebar';
import { UserUniverse } from './components/UserUniverse';
import { ErrorBoundary } from './components/ErrorBoundary';
import { fetchUserRepos, fetchRepoTree } from './services/githubService';
import { FileSystemNode, GithubRepo, UniverseNode } from './types';
import { Sun, Moon, Github } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<FileSystemNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<FileSystemNode | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Theme State - Removed 'blueprint'
  const [theme, setTheme] = useState<'modern' | 'crayon' | 'pencil'>('pencil');

  // User Universe State
  const [viewMode, setViewMode] = useState<'home' | 'universe' | 'repo'>('home');
  const [universeData, setUniverseData] = useState<GithubRepo[]>([]);
  const [profileUrl, setProfileUrl] = useState('');
  const [isLoadingUniverse, setIsLoadingUniverse] = useState(false);
  const [universeError, setUniverseError] = useState<string | null>(null);
  const [selectedUniverseNode, setSelectedUniverseNode] = useState<UniverseNode | null>(null);

  const isPencil = theme === 'pencil';
  const sketchyBorder = isPencil ? { borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' } : {};

  useEffect(() => {
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (link) {
      link.href = isDarkMode ? '/favicon-dark.svg' : '/favicon-light.svg';
    }
  }, [isDarkMode]);

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

  const handleScanUniverse = async () => {
    if (!profileUrl.trim()) return;

    const username = extractUsername(profileUrl);
    console.log('Extracted username:', username);

    if (!username) {
      setUniverseError(`Could not extract username from URL: "${profileUrl}"`);
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
      }
    } catch (err: any) {
      console.error('Scan Error:', err);
      setUniverseError(`Error: ${err.message}`);
    } finally {
      setIsLoadingUniverse(false);
    }
  };

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

      const tree = await fetchRepoTree(username, repo.name, import.meta.env.VITE_GITHUB_TOKEN);
      if (tree) {
        setData(tree);
        setViewMode('repo');
        setSelectedNode(null);
      }
    } catch (e: any) {
      console.error('Failed to load repo details', e);
      alert(e.message || 'Failed to load repository details.');
    } finally {
      setIsLoadingUniverse(false);
    }
  };

  // Determine font based on theme
  const fontClass = (theme === 'crayon' || theme === 'pencil') ? "font-['Patrick_Hand']" : "font-['JetBrains_Mono']";

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden relative ${fontClass} transition-colors duration-300 ${isDarkMode ? 'bg-[#0d1117] text-white' : 'bg-[#ffffff] text-black'}`}>

      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 md:px-8 py-4 md:py-6 z-50 pointer-events-none">

        {/* Left Side: Title (Home) or Upload New (Map) */}
        <div className="pointer-events-auto flex items-center gap-3">
          {(viewMode !== 'home') && (
            <button
              onClick={() => {
                if (viewMode === 'repo' && universeData.length > 0) {
                  setViewMode('universe');
                  setSelectedNode(null);
                } else {
                  setData(null);
                  setViewMode('home');
                  setUniverseData([]);
                  setProfileUrl('');
                  setSelectedNode(null);
                  setSelectedUniverseNode(null);
                }
              }}
              className={`flex items-center gap-2 transition-all 
                ${viewMode === 'universe' && (theme === 'crayon' || theme === 'pencil')
                  ? `px-4 py-2 rounded-md shadow-md transform -rotate-1 hover:rotate-0 hover:scale-105 border-2 ${theme === 'pencil' ? 'bg-white text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-[#4a90e2] text-white border-[#2c3e50]'}`
                  : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black')
                }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              <span className={viewMode === 'universe' && (theme === 'crayon' || theme === 'pencil') ? "text-lg font-bold" : "font-semibold"}>
                {viewMode === 'repo' && universeData.length > 0 ? "Back to Universe" : "Back to Home"}
              </span>
            </button>
          )}

          {viewMode === 'home' && (
            <div className="flex items-center gap-2">
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
                ${(theme === 'crayon' || theme === 'pencil') ? 'font-bold' : ''} 
                ${theme === 'pencil' ? 'text-black' : (theme === 'crayon' ? 'text-[#2c3e50]' : (isDarkMode ? 'text-white' : 'text-black'))}`}
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
                (isDarkMode ? 'bg-[#0d1117] border-[#30363d] text-gray-300 hover:text-white' : 'bg-white border-[#d0d7de] text-gray-700 hover:text-black')}`}>
              <span className={theme === 'pencil' ? "font-['Patrick_Hand'] font-bold" : ""}>Appearance</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {/* Dropdown Menu */}
            <div className={`absolute right-0 top-full mt-2 w-48 rounded-md shadow-lg border overflow-hidden transition-all opacity-0 invisible group-hover:opacity-100 group-hover:visible transform origin-top-right z-50 
              ${theme === 'pencil' ? 'bg-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' :
                (isDarkMode ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-[#d0d7de]')}`}>
              <div className="p-1 flex flex-col gap-1">
                <button
                  onClick={() => setTheme('modern')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between group/item ${theme === 'modern' ? (isDarkMode ? 'bg-[#1f6feb] text-white' : 'bg-[#0969da] text-white') : (isDarkMode ? 'hover:bg-[#30363d] text-gray-300' : 'hover:bg-[#f6f8fa] text-gray-700')}`}
                >
                  <span className="font-['JetBrains_Mono']">Modern</span>
                  {theme === 'modern' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                </button>
                <button
                  onClick={() => setTheme('crayon')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between group/item ${theme === 'crayon' ? (isDarkMode ? 'bg-[#1f6feb] text-white' : 'bg-[#0969da] text-white') : (isDarkMode ? 'hover:bg-[#30363d] text-gray-300' : 'hover:bg-[#f6f8fa] text-gray-700')}`}
                >
                  <span className="font-['Patrick_Hand'] font-bold tracking-wide">Crayon</span>
                  {theme === 'crayon' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                </button>
                <button
                  onClick={() => setTheme('pencil')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between group/item ${theme === 'pencil' ? 'bg-black text-white' : (isDarkMode ? 'hover:bg-[#30363d] text-gray-300' : 'hover:bg-[#f6f8fa] text-gray-700')}`}
                >
                  <span className="font-['Patrick_Hand'] font-bold tracking-wide">Pencil</span>
                  {theme === 'pencil' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                </button>
              </div>
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-full transition-all duration-300 ${theme === 'modern'
              ? (isDarkMode ? 'bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white' : 'bg-black/5 hover:bg-black/10 backdrop-blur-md border border-black/10 text-black')
              : theme === 'pencil'
                ? (isDarkMode ? 'text-white hover:text-gray-300' : 'text-black hover:text-gray-700')
                : 'bg-[#fdfdf6] border-2 border-[#2c3e50] text-[#2c3e50] shadow-[4px_4px_0px_0px_#2c3e50] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#2c3e50]'
              }`}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'pencil' ? (
              // Sketchy Icons for Pencil Theme
              isDarkMode ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  <path d="M19.5 10.5L20.5 11.5" strokeWidth="1.5" strokeLinecap="round"></path>
                  <path d="M17 8.5L17.5 9" strokeWidth="1.5" strokeLinecap="round"></path>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <path d="M12 1v2"></path>
                  <path d="M12 21v2"></path>
                  <path d="M4.22 4.22l1.42 1.42"></path>
                  <path d="M18.36 18.36l1.42 1.42"></path>
                  <path d="M1 12h2"></path>
                  <path d="M21 12h2"></path>
                  <path d="M4.22 19.78l1.42-1.42"></path>
                  <path d="M18.36 5.64l1.42-1.42"></path>
                  <path d="M14 10L13 9" strokeWidth="1" strokeLinecap="round"></path>
                  <path d="M10 14L9 15" strokeWidth="1" strokeLinecap="round"></path>
                </svg>
              )
            ) : (
              // Standard Icons
              isDarkMode ? <Sun size={20} /> : <Moon size={20} />
            )}
          </button>

          {/* GitHub Link */}
          <a
            href="https://github.com/vasu-devs/MapMyRepo"
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2 rounded-full transition-all duration-300 ${theme === 'modern'
              ? (isDarkMode ? 'bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white' : 'bg-black/5 hover:bg-black/10 backdrop-blur-md border border-black/10 text-black')
              : theme === 'pencil'
                ? (isDarkMode ? 'text-white hover:text-gray-300' : 'text-black hover:text-gray-700')
                : 'bg-[#fdfdf6] border-2 border-[#2c3e50] text-[#2c3e50] shadow-[4px_4px_0px_0px_#2c3e50] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#2c3e50]'
              }`}
            title="View on GitHub"
          >
            {theme === 'pencil' ? (
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
      </nav>

      <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">

        {/* HOME VIEW */}
        {viewMode === 'home' && (
          <div className={`z-10 flex flex-col items-center gap-8 w-full max-w-3xl px-4 animate-fade-in-up ${isPencil ? "font-['Patrick_Hand']" : ""}`}>

            {/* Main Action: Upload Local */}
            <div className="w-full">
              <FileUploader
                onUploadComplete={(rootNode) => {
                  setData(rootNode);
                  setViewMode('repo');
                  setSelectedNode(null);
                }}
                isDarkMode={isDarkMode}
                theme={theme}
              />
            </div>

            <div className="flex items-center gap-4 w-full">
              <div className={`h-px flex-1 ${isPencil ? (isDarkMode ? 'bg-white/30' : 'bg-black/30') : (isDarkMode ? 'bg-gray-800' : 'bg-gray-300')}`}></div>
              <span className={`text-sm ${isPencil ? 'font-bold' : ''} ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>OR EXPLORE UNIVERSE</span>
              <div className={`h-px flex-1 ${isPencil ? (isDarkMode ? 'bg-white/30' : 'bg-black/30') : (isDarkMode ? 'bg-gray-800' : 'bg-gray-300')}`}></div>
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
                  ${isPencil
                      ? (isDarkMode ? 'bg-[#0d1117] border-white text-white placeholder-gray-500 focus:border-white focus:ring-1 focus:ring-white' : 'bg-white border-black text-black placeholder-gray-500 focus:border-black focus:ring-1 focus:ring-black')
                      : (isDarkMode ? 'bg-[#0d1117] border-[#30363d] text-white focus:border-[#58a6ff] placeholder-gray-600 rounded-lg' : 'bg-white border-[#d0d7de] text-black focus:border-[#0969da] placeholder-gray-400 rounded-lg')
                    }`}
                />
                <button
                  onClick={handleScanUniverse}
                  disabled={isLoadingUniverse || !profileUrl.trim()}
                  style={isPencil ? { ...sketchyBorder, borderRadius: '15px 225px 15px 255px / 255px 15px 225px 15px' } : {}}
                  className={`absolute right-2 p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  ${isPencil
                      ? (isDarkMode ? 'text-white hover:bg-white/10' : 'text-black hover:bg-black/10')
                      : (isDarkMode ? 'hover:bg-[#30363d] text-[#58a6ff] rounded-md' : 'hover:bg-[#f6f8fa] text-[#0969da] rounded-md')
                    }`}
                >
                  {isLoadingUniverse ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isPencil ? 2.5 : 2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  )}
                </button>
              </div>
              {universeError && (
                <p className={`text-xs text-center ${isPencil ? 'font-bold text-red-600' : 'text-red-500'}`}>{universeError}</p>
              )}
            </div>
          </div>
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
                isDarkMode={isDarkMode}
                theme={theme}
              />
            </ErrorBoundary>

            {/* Sidebar for Universe */}
            <Sidebar
              node={null}
              universeNode={selectedUniverseNode}
              rootNode={null}
              isDarkMode={isDarkMode}
              theme={theme}
            />
          </div>
        )}

        {/* REPO VIEW */}
        {viewMode === 'repo' && data && (
          <>
            <div className="absolute inset-0 z-0">
              <RepoVisualizer
                data={data}
                onNodeSelect={setSelectedNode}
                isDarkMode={isDarkMode}
                theme={theme}
              />
            </div>
            <Sidebar
              node={selectedNode}
              rootNode={data}
              isDarkMode={isDarkMode}
              theme={theme}
            />
          </>
        )}
      </div>

      {/* Footer */}
      <footer className={`relative md:absolute bottom-0 md:bottom-4 w-full text-center text-xs z-50 pointer-events-none py-4 md:py-0 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        <span className="pointer-events-auto">
          Made with ❤️ by <a href="https://github.com/vasu-devs/MapMyRepo" target="_blank" rel="noopener noreferrer" className={`hover:underline ${isDarkMode ? 'hover:text-white' : 'hover:text-black'}`}>Vasu-Devs</a>
          <span className="mx-2">|</span>
          <a href="https://x.com/Vasu_Devs" target="_blank" rel="noopener noreferrer" className={`hover:underline ${isDarkMode ? 'hover:text-white' : 'hover:text-black'}`}>Twitter</a>
        </span>
      </footer>
    </div>
  );
};

export default App;