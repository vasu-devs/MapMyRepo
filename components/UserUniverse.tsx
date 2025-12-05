import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { GithubRepo, UniverseNode, UniverseLink } from '../types';

interface UserUniverseProps {
    repos: GithubRepo[];
    onRepoSelect: (repo: GithubRepo) => void;
    onNodeSelect?: (node: UniverseNode) => void;
    theme: 'modern' | 'crayon' | 'pencil' | 'comic';
    focusedNodeId?: string | null;
    onTransitionComplete?: () => void;
}

// Watercolor Palette for Comic Theme
const watercolorColors: Record<string, string> = {
    "TypeScript": "#89CFF0", // Baby Blue
    "JavaScript": "#FFFACD", // Lemon Chiffon
    "Python": "#98FB98", // Pale Green
    "Java": "#DEB887", // Burlywood
    "HTML": "#FFA07A", // Light Salmon
    "CSS": "#E6E6FA", // Lavender
    "C++": "#FFB6C1", // Light Pink
    "C#": "#90EE90", // Light Green
    "Go": "#E0FFFF", // Light Cyan
    "Rust": "#FFDAB9", // Peach Puff
    "PHP": "#B0C4DE", // Light Steel Blue
    "Ruby": "#CD5C5C", // Indian Red (lighter)
    "Swift": "#FA8072", // Salmon
    "Kotlin": "#DDA0DD", // Plum
    "Dart": "#AFEEEE", // Pale Turquoise
    "Shell": "#F0E68C", // Khaki
    "C": "#D3D3D3", // Light Gray
    "Vue": "#98FB98", // Pale Green
    "React": "#E0FFFF", // Light Cyan
    "Svelte": "#FFA07A", // Light Salmon
    "Dockerfile": "#B0C4DE", // Light Steel Blue
    "Jupyter Notebook": "#FFDAB9", // Peach Puff
    "Lua": "#ADD8E6", // Light Blue
    "R": "#87CEFA", // Light Sky Blue
    "Vim Script": "#90EE90", // Light Green
    "Perl": "#87CEEB", // Sky Blue
    "Scala": "#F08080", // Light Coral
    "Haskell": "#D8BFD8", // Thistle
    "Elixir": "#DDA0DD", // Plum
    "Clojure": "#F08080", // Light Coral
    "Makefile": "#8FBC8F", // Dark Sea Green (lighter)
    "Assembly": "#DEB887", // Burlywood
    "Objective-C": "#87CEFA", // Light Sky Blue
    "Other": "#D3D3D3"  // Light Gray
};

// Standard GitHub Language Colors (Fallback/Modern)
const githubColors: Record<string, string> = {
    "TypeScript": "#3178c6",
    "JavaScript": "#f1e05a",
    "Python": "#3572A5",
    "Java": "#b07219",
    "HTML": "#e34c26",
    "CSS": "#563d7c",
    "C++": "#f34b7d",
    "C#": "#178600",
    "Go": "#00ADD8",
    "Rust": "#dea584",
    "PHP": "#4F5D95",
    "Ruby": "#701516",
    "Swift": "#F05138",
    "Kotlin": "#A97BFF",
    "Dart": "#00B4AB",
    "Shell": "#89e051",
    "C": "#555555",
    "Vue": "#41b883",
    "React": "#61dafb",
    "Svelte": "#ff3e00",
    "Dockerfile": "#384d54",
    "Jupyter Notebook": "#DA5B0B",
    "Lua": "#000080",
    "R": "#198CE7",
    "Vim Script": "#199f4b",
    "Perl": "#0298c3",
    "Scala": "#c22d40",
    "Haskell": "#5e5086",
    "Elixir": "#6e4a7e",
    "Clojure": "#db5855",
    "Makefile": "#427819",
    "Assembly": "#6E4C13",
    "Objective-C": "#438eff",
    "Other": "#8b949e"
};

export const UserUniverse: React.FC<UserUniverseProps> = ({ repos, onRepoSelect, onNodeSelect, theme, focusedNodeId: propFocusedNodeId, onTransitionComplete }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // State for expanded languages
    const [expandedLanguages, setExpandedLanguages] = useState<Set<string>>(new Set());
    const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

    // Refs for D3 zoom
    const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

    // Process data into hierarchical structure
    const { nodes, links } = useMemo(() => {
        if (repos.length === 0) return { nodes: [], links: [] };

        const nodes: UniverseNode[] = [];
        const links: UniverseLink[] = [];

        // 1. Central User Node (The Sun)
        const userNode: UniverseNode = {
            id: 'user-sun',
            name: repos[0]?.owner.login || 'User',
            type: 'USER',
            r: (theme === 'crayon' || theme === 'pencil' || theme === 'comic') ? 70 : 60,
            color: theme === 'pencil' ? '#ffffff' : (theme === 'comic' || theme === 'crayon' ? '#F4A460' : '#FFD700'), // Comic/Crayon: Sandy Brown for User
            fx: 0,
            fy: 0
        };
        nodes.push(userNode);

        // 2. Group by Language (Planets)
        const languageGroups = new Map<string, GithubRepo[]>();
        repos.forEach(repo => {
            const lang = repo.language || 'Other';
            if (!languageGroups.has(lang)) {
                languageGroups.set(lang, []);
            }
            languageGroups.get(lang)?.push(repo);
        });

        languageGroups.forEach((groupRepos, language) => {
            // Crayon now uses GitHub colors, Comic uses watercolor
            const langColor = theme === 'pencil' ? '#ffffff' : (theme === 'comic' ? (watercolorColors[language] || watercolorColors['Other']) : (githubColors[language] || githubColors['Other']));
            const isExpanded = expandedLanguages.has(language);

            // Language Node
            const langNodeId = `lang-${language}`;
            const langNode: UniverseNode = {
                id: langNodeId,
                name: language,
                type: 'LANGUAGE',
                r: 30 + Math.sqrt(groupRepos.length) * 3,
                color: langColor,
                language: language
            };
            nodes.push(langNode);

            // Link User -> Language
            links.push({
                source: userNode.id,
                target: langNode.id,
                value: 3
            });

            // 3. Repositories (Satellites) - ONLY IF EXPANDED
            if (isExpanded) {
                groupRepos.forEach(repo => {
                    const repoNode: UniverseNode = {
                        id: `repo-${repo.id}`,
                        name: repo.name,
                        full_name: repo.full_name,
                        type: 'REPO',
                        language: language,
                        stargazers_count: repo.stargazers_count,
                        r: Math.max(5, Math.min(12, Math.sqrt(repo.stargazers_count))),
                        color: langColor,
                        data: repo
                    };
                    nodes.push(repoNode);

                    // Link Language -> Repo
                    links.push({
                        source: langNode.id,
                        target: repoNode.id,
                        value: 1.5
                    });
                });
            }
        });

        return { nodes, links };
    }, [repos, theme, expandedLanguages]);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous

        // Define Filters & Patterns
        const defs = svg.append("defs");

        if (theme === 'crayon' || theme === 'pencil' || theme === 'comic') {
            // Sketchy Border Filter (for outlines)
            const borderFilter = defs.append("filter")
                .attr("id", "sketchy-border")
                .attr("height", "150%")
                .attr("width", "150%")
                .attr("x", "-25%")
                .attr("y", "-25%");

            borderFilter.append("feTurbulence")
                .attr("type", "fractalNoise")
                .attr("baseFrequency", "0.05")
                .attr("numOctaves", "2")
                .attr("result", "noise");

            borderFilter.append("feDisplacementMap")
                .attr("in", "SourceGraphic")
                .attr("in2", "noise")
                .attr("scale", (theme === 'comic' || theme === 'crayon') ? "2" : "3");

            // Grainy Texture Filter (for fills) - NEW for Comic & Crayon
            if (theme === 'comic' || theme === 'crayon') {
                const grainFilter = defs.append("filter")
                    .attr("id", "grainy-texture")
                    .attr("x", "0%")
                    .attr("y", "0%")
                    .attr("width", "100%")
                    .attr("height", "100%");

                grainFilter.append("feTurbulence")
                    .attr("type", "fractalNoise")
                    .attr("baseFrequency", "0.8")
                    .attr("numOctaves", "3")
                    .attr("stitchTiles", "stitch")
                    .attr("result", "noise");

                grainFilter.append("feColorMatrix")
                    .attr("type", "matrix")
                    .attr("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.3 0") // Adjust opacity of noise
                    .attr("in", "noise")
                    .attr("result", "coloredNoise");

                grainFilter.append("feComposite")
                    .attr("operator", "in")
                    .attr("in", "coloredNoise")
                    .attr("in2", "SourceGraphic")
                    .attr("result", "compositeNoise");

                const feMerge = grainFilter.append("feMerge");
                feMerge.append("feMergeNode").attr("in", "SourceGraphic");
                feMerge.append("feMergeNode").attr("in", "compositeNoise");
            }

            // --- PATTERNS FOR PENCIL THEME ---
            const strokeColor = '#000000';

            // 1. Diagonal Lines (for Languages)
            const patternLines = defs.append("pattern")
                .attr("id", "pattern-lines")
                .attr("patternUnits", "userSpaceOnUse")
                .attr("width", 10)
                .attr("height", 10)
                .attr("patternTransform", "rotate(45)");

            patternLines.append("line")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", 0)
                .attr("y2", 10)
                .attr("stroke", strokeColor)
                .attr("stroke-width", 1);

            // 2. Cross-Hatch (for Repos)
            const patternCross = defs.append("pattern")
                .attr("id", "pattern-cross")
                .attr("patternUnits", "userSpaceOnUse")
                .attr("width", 8)
                .attr("height", 8)
                .attr("patternTransform", "rotate(45)");

            patternCross.append("rect")
                .attr("width", 8)
                .attr("height", 8)
                .attr("fill", "#ffffff"); // Background for pattern

            patternCross.append("path")
                .attr("d", "M0 0L8 8M8 0L0 8")
                .attr("stroke", strokeColor)
                .attr("stroke-width", 0.5);

            // 3. Dots (for User)
            const patternDots = defs.append("pattern")
                .attr("id", "pattern-dots")
                .attr("patternUnits", "userSpaceOnUse")
                .attr("width", 10)
                .attr("height", 10);

            patternDots.append("circle")
                .attr("cx", 5)
                .attr("cy", 5)
                .attr("r", 1.5)
                .attr("fill", strokeColor);

        } else if (theme === 'modern') {
            const filter = defs.append("filter")
                .attr("id", "glow")
                .attr("x", "-50%")
                .attr("y", "-50%")
                .attr("width", "200%")
                .attr("height", "200%");
            filter.append("feGaussianBlur")
                .attr("stdDeviation", "2.5")
                .attr("result", "coloredBlur");
            const feMerge = filter.append("feMerge");
            feMerge.append("feMergeNode").attr("in", "coloredBlur");
            feMerge.append("feMergeNode").attr("in", "SourceGraphic");

            const sunGradient = defs.append("radialGradient")
                .attr("id", "sun-gradient")
                .attr("cx", "50%")
                .attr("cy", "50%")
                .attr("r", "50%");
            sunGradient.append("stop").attr("offset", "0%").attr("stop-color", "#FFF700");
            sunGradient.append("stop").attr("offset", "50%").attr("stop-color", "#FFD700");
            sunGradient.append("stop").attr("offset", "100%").attr("stop-color", "#FF8C00");
        }

        // Zoom behavior
        const g = svg.append("g");
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        zoomBehaviorRef.current = zoom;
        svg.call(zoom);

        // Initial transform to center (only if not focusing)
        if (!focusNodeId) {
            svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2));
        }

        // Create a copy of links to avoid mutation issues with React strict mode / re-renders
        const simulationLinks = links.map(d => ({ ...d }));

        // Simulation
        const simulation = d3.forceSimulation<UniverseNode>(nodes)
            .force("link", d3.forceLink<UniverseNode, UniverseLink>(simulationLinks)
                .id(d => d.id)
                .distance(d => {
                    if (d.source.type === 'USER' || d.target.type === 'USER') return 250;
                    return 100;
                })
                .strength(0.4)
            )
            .force("charge", d3.forceManyBody().strength(d => {
                if (d.type === 'USER') return -2000;
                if (d.type === 'LANGUAGE') return -800;
                return -300;
            }))
            .force("collide", d3.forceCollide().radius(d => (d.r || 5) + 30).iterations(4))
            .force("center", d3.forceCenter(0, 0).strength(0.05));

        // Links
        const link = g.append("g")
            .attr("stroke", theme === 'pencil' ? "#000000" : ((theme === 'comic' || theme === 'crayon') ? "#2F4F4F" : "#999")) // Dark Slate Gray for Comic/Crayon Links
            .attr("stroke-width", (theme === 'comic' || theme === 'crayon') ? 4 : (theme === 'pencil' ? 2 : 1)) // Thicker for Comic/Crayon
            .attr("stroke-opacity", (theme === 'comic' || theme === 'crayon') ? 0.8 : (theme === 'pencil' ? 0.6 : 0.2))
            .attr("stroke-linecap", "round")
            .attr("stroke-dasharray", "none")
            .attr("filter", (theme === 'crayon' || theme === 'pencil' || theme === 'comic') ? "url(#sketchy-border)" : null)
            .selectAll("line")
            .data(simulationLinks)
            .join("line");

        // Nodes Group
        const node = g.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("cursor", "pointer")
            .call(d3.drag<SVGGElement, UniverseNode>()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended)
            )
            .on("click", (event, d) => handleNodeClick(event, d));

        // Draw Circles
        node.append("circle")
            .attr("r", d => d.r || 5)
            .attr("fill", d => {
                if (theme === 'pencil') {
                    if (d.type === 'USER') return "url(#pattern-dots)";
                    if (d.type === 'LANGUAGE') return "url(#pattern-lines)";
                    if (d.type === 'REPO') return "url(#pattern-cross)";
                    return "#ffffff";
                }
                if (theme === 'modern' && d.type === 'USER') return 'url(#sun-gradient)';
                return d.color || '#ccc';
            })
            .attr("stroke", d => {
                if (theme === 'pencil') return "#000000";
                if (theme === 'comic' || theme === 'crayon') return "#000000"; // Black outline for Comic/Crayon
                return "#000";
            })
            .attr("stroke-width", d => {
                if (theme === 'comic' || theme === 'crayon') return 3; // Thinner outline for Comic/Crayon
                if (theme === 'pencil') return d.type === 'USER' ? 3 : 2;
                return d.type === 'REPO' ? 1 : 0;
            })
            .attr("stroke-dasharray", "none")
            .attr("filter", d => {
                if (theme === 'comic' || theme === 'crayon') return "url(#grainy-texture) url(#sketchy-border)"; // Apply both grain and sketch
                if (theme === 'pencil') return "url(#sketchy-border)";
                if (theme === 'modern' && (d.type === 'USER' || d.type === 'LANGUAGE')) return "url(#glow)";
                return null;
            })
            .attr("opacity", theme === 'modern' ? 0.9 : 1);

        // Expand Indicator for Language Nodes
        node.filter(d => d.type === 'LANGUAGE')
            .append("circle")
            .attr("r", d => (d.r || 30) + 5)
            .attr("fill", "none")
            .attr("stroke", theme === 'pencil' ? "#000000" : ((theme === 'comic' || theme === 'crayon') ? "#000000" : "#000"))
            .attr("stroke-width", (theme === 'comic' || theme === 'crayon') ? 2 : 1)
            .attr("stroke-dasharray", (theme === 'comic' || theme === 'crayon') ? "none" : "2,2") // Solid line for Comic/Crayon
            .attr("opacity", d => expandedLanguages.has(d.language || '') ? 0 : 0.5); // Hide when expanded

        // Labels
        node.append("text")
            .text(d => d.name)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", (theme === 'crayon' || theme === 'pencil' || theme === 'comic') ? "middle" : "auto")
            .attr("dy", d => {
                if (theme === 'crayon' || theme === 'pencil' || theme === 'comic') return d.type === 'REPO' ? -((d.r || 5) + 10) : 0;
                return 4;
            })
            .attr("x", d => {
                if (theme === 'crayon' || theme === 'pencil' || theme === 'comic') return 0;
                return (d.r || 0) + 5;
            })
            .style("font-family", (theme === 'crayon' || theme === 'pencil' || theme === 'comic') ? "'Patrick Hand', cursive" : "inherit")
            .style("font-size", d => {
                if (theme === 'crayon' || theme === 'pencil' || theme === 'comic') {
                    if (d.type === 'USER') return "24px";
                    if (d.type === 'LANGUAGE') return "16px";
                    return "14px";
                }
                return d.type === 'USER' ? "16px" : d.type === 'LANGUAGE' ? "14px" : "10px";
            })
            .style("font-weight", (theme === 'pencil' || theme === 'comic') ? "900" : "bold")
            .style("fill", d => {
                if (theme === 'pencil') return "#000000";
                if (theme === 'comic' || theme === 'crayon') return "#000000"; // Black text for Comic/Crayon
                return "#333";
            })
            // Improved Readability
            .style("paint-order", "stroke")
            .style("stroke", d => {
                if (theme === 'pencil') return "#ffffff";
                if (theme === 'comic' || theme === 'crayon') return "#ffffff"; // White stroke for Comic/Crayon text
                return "none";
            })
            .style("stroke-width", (theme === 'pencil' || theme === 'comic' || theme === 'crayon') ? "4px" : "0px")
            .style("stroke-linecap", "round")
            .style("stroke-linejoin", "round")
            .style("text-shadow", d => {
                if (theme === 'modern') return "0 1px 4px rgba(0,0,0,0.8)";
                return "none";
            })
            .style("pointer-events", "none")
            .style("opacity", 1);

        // Hover Effects
        node.on("mouseover", (event, d) => {
            d3.select(event.currentTarget).select("circle")
                .transition().duration(200)
                .attr("r", (d.r || 5) * 1.15);

            d3.select(event.currentTarget).select("text")
                .transition().duration(200)
                .style("opacity", 1)
                .style("font-size", () => {
                    if (theme === 'crayon' || theme === 'pencil' || theme === 'comic') return d.type === 'REPO' ? "14px" : (d.type === 'USER' ? "28px" : "18px");
                    return "14px";
                })
                .style("fill", theme === 'pencil' ? "#000000" : ((theme === 'comic' || theme === 'crayon') ? "#000000" : "#333"))
                .style("text-shadow", "none")
                .attr("dy", () => {
                    if (theme === 'crayon' || theme === 'pencil' || theme === 'comic') return d.type === 'REPO' ? -((d.r || 5) + 15) : 0;
                    return 4;
                })
                .style("z-index", 100);

            d3.select(event.currentTarget).raise();
        })
            .on("mouseout", (event, d) => {
                d3.select(event.currentTarget).select("circle")
                    .transition().duration(200)
                    .attr("r", d.r || 5);

                d3.select(event.currentTarget).select("text")
                    .transition().duration(200)
                    .style("opacity", 1)
                    .style("font-size", () => {
                        if (theme === 'crayon' || theme === 'pencil' || theme === 'comic') return d.type === 'USER' ? "24px" : d.type === 'LANGUAGE' ? "16px" : "14px";
                        return d.type === 'USER' ? "16px" : d.type === 'LANGUAGE' ? "14px" : "10px";
                    })
                    .style("fill", d => {
                        if (theme === 'pencil') return "#000000";
                        if (theme === 'comic' || theme === 'crayon') return "#000000";
                        return "#333";
                    })
                    .style("text-shadow", d => {
                        if (theme === 'modern') return "0 1px 4px rgba(0,0,0,0.8)";
                        return "none";
                    })
                    .attr("dy", () => {
                        if (theme === 'crayon' || theme === 'pencil' || theme === 'comic') return d.type === 'REPO' ? -((d.r || 5) + 10) : 0;
                        return 4;
                    });
            });

        simulation.on("tick", () => {
            link
                .attr("x1", d => (d.source as UniverseNode).x || 0)
                .attr("y1", d => (d.source as UniverseNode).y || 0)
                .attr("x2", d => (d.target as UniverseNode).x || 0)
                .attr("y2", d => (d.target as UniverseNode).y || 0);

            node
                .attr("transform", d => `translate(${d.x || 0},${d.y || 0})`);
        });

        function dragstarted(event: any, d: UniverseNode) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event: any, d: UniverseNode) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event: any, d: UniverseNode) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        function handleNodeClick(event: any, d: UniverseNode) {
            event.stopPropagation();
            if (d.type === 'LANGUAGE') {
                const newExpanded = new Set(expandedLanguages);
                if (newExpanded.has(d.language || '')) {
                    newExpanded.delete(d.language || '');
                } else {
                    newExpanded.add(d.language || '');
                }
                setExpandedLanguages(newExpanded);
            } else if (d.type === 'REPO') {
                if (onRepoSelect && d.data) {
                    onRepoSelect(d.data);
                }
            }
            if (onNodeSelect) {
                onNodeSelect(d);
            }
        }

        return () => {
            simulation.stop();
        };

    }, [repos, theme, expandedLanguages]);

    // --- Auto-Focus / Transition Effect ---
    useEffect(() => {
        const targetId = propFocusedNodeId || focusNodeId;

        if (targetId && svgRef.current && zoomBehaviorRef.current) {
            const targetNode = nodes.find(n => n.id === targetId);
            if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined && containerRef.current) {
                const svg = d3.select(svgRef.current);
                const width = containerRef.current.clientWidth;
                const height = containerRef.current.clientHeight;
                const scale = 4; // Zoom in closer

                const x = -targetNode.x * scale + width / 2;
                const y = -targetNode.y * scale + height / 2;

                svg.transition()
                    .duration(700) // Faster zoom
                    .ease(d3.easeCubicInOut)
                    .call(
                        zoomBehaviorRef.current.transform as any,
                        d3.zoomIdentity.translate(x, y).scale(scale)
                    )
                    .on("end", () => {
                        setFocusNodeId(null);
                        if (onTransitionComplete) onTransitionComplete();
                    });
            }
        }
    }, [focusNodeId, propFocusedNodeId, nodes]);

    // Background Styles
    const backgroundStyle = (theme === 'crayon' || theme === 'pencil' || theme === 'comic') ? {
        backgroundColor: theme === 'pencil' ? '#ffffff' : (theme === 'comic' ? '#f0e6d2' : '#fdfdf6'), // Comic: Beige
        backgroundImage: theme === 'pencil'
            ? 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.05\'/%3E%3C/svg%3E")'
            : ((theme === 'comic' || theme === 'crayon')
                ? 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.6\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.15\' fill=\'%238b7355\'/%3E%3C/svg%3E")' // Beige noise
                : 'radial-gradient(#d0d0d0 1px, transparent 1px)'),
        backgroundSize: (theme === 'pencil' || theme === 'comic' || theme === 'crayon') ? 'auto' : '20px 20px'
    } : {
        backgroundColor: '#ffffff',
        backgroundImage: 'none'
    };

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden"
            style={backgroundStyle}
        >
            <svg ref={svgRef} className="w-full h-full relative z-10" />

            {/* Legend */}
            {
                (theme === 'crayon' || theme === 'pencil' || theme === 'comic') ? (
                    <div className={`absolute bottom-4 left-4 z-20 p-4 rounded-lg border-2 
                        ${theme === 'pencil' ? 'border-black bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' :
                            ((theme === 'comic' || theme === 'crayon') ? 'border-black bg-[#f0e6d2] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'border-[#2c3e50] bg-[#fdfdf6] text-[#2c3e50] shadow-lg')} 
                        font-['Patrick_Hand'] transform rotate-1`}>
                        <h3 className={`text-lg font-bold mb-2 border-b ${theme === 'pencil' ? 'border-black' : ((theme === 'comic' || theme === 'crayon') ? 'border-black' : 'border-[#2c3e50]')} pb-1`}>LEGEND</h3>
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-4 h-4 rounded-full border-2 
                                ${theme === 'pencil' ? 'border-black bg-white' :
                                    ((theme === 'comic' || theme === 'crayon') ? 'border-black bg-[#F4A460]' : 'border-[#2c3e50] bg-white')}`}
                                style={{ backgroundImage: theme === 'pencil' ? 'url(#pattern-dots)' : 'none' }}></div>
                            <span>User</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-4 h-4 rounded-full border-2 
                                ${theme === 'pencil' ? 'border-black bg-white' :
                                    ((theme === 'comic' || theme === 'crayon') ? 'border-black bg-[#89CFF0]' : 'border-[#2c3e50] bg-[#3178c6]')}`}
                                style={{ backgroundImage: theme === 'pencil' ? 'url(#pattern-lines)' : 'none' }}></div>
                            <span>Language (Click to Expand)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full border 
                                ${theme === 'pencil' ? 'border-black bg-white' :
                                    ((theme === 'comic' || theme === 'crayon') ? 'border-black bg-[#89CFF0]' : 'border-[#2c3e50] bg-[#3178c6]')}`}
                                style={{ backgroundImage: theme === 'pencil' ? 'url(#pattern-cross)' : 'none' }}></div>
                            <span>Repo</span>
                        </div>
                    </div>
                ) : (
                    <div className="absolute bottom-4 right-4 z-20 text-xs text-gray-500 pointer-events-none">
                        Click a Language to expand. Click a Repo to visualize.
                    </div>
                )
            }
        </div >
    );
};
