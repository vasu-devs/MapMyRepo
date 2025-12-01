import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { FileSystemNode, GraphLink, GraphNode, NodeType } from '../types';
import { analyzeCode } from '../services/geminiService';
import { fetchRemoteFileContent } from '../services/fileService';

interface RepoVisualizerProps {
    data: FileSystemNode;
    onNodeSelect: (node: FileSystemNode) => void;
    isDarkMode: boolean;
    theme: 'modern' | 'crayon' | 'pencil';
}

export const RepoVisualizer: React.FC<RepoVisualizerProps> = ({ data, onNodeSelect, isDarkMode, theme }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // Refs for D3
    const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
    const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const zoomGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
    const linkGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
    const nodeGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

    // State
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [links, setLinks] = useState<GraphLink[]>([]);
    const [analyzingNodeId, setAnalyzingNodeId] = useState<string | null>(null);
    const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

    // --- 1. Initialization ---
    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const svg = d3.select(svgRef.current);

        svg.selectAll("*").remove();

        // Define filters for Crayon/Pencil theme
        const defs = svg.append("defs");

        // Sketchy Border Filter
        const filter = defs.append("filter")
            .attr("id", "sketchy-border-repo")
            .attr("height", "150%")
            .attr("width", "150%")
            .attr("x", "-25%")
            .attr("y", "-25%");

        filter.append("feTurbulence")
            .attr("baseFrequency", "0.05")
            .attr("numOctaves", "2")
            .attr("result", "noise")
            .attr("type", "fractalNoise");

        filter.append("feDisplacementMap")
            .attr("in", "SourceGraphic")
            .attr("in2", "noise")
            .attr("scale", "3");

        // --- PATTERNS FOR PENCIL THEME ---
        const strokeColor = isDarkMode ? '#ffffff' : '#000000';

        // 1. Cross-Hatch (for Folders)
        const patternFolder = defs.append("pattern")
            .attr("id", "pattern-folder")
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", 8)
            .attr("height", 8)
            .attr("patternTransform", "rotate(45)");

        patternFolder.append("rect")
            .attr("width", 8)
            .attr("height", 8)
            .attr("fill", isDarkMode ? "#0d1117" : "#ffffff");

        patternFolder.append("path")
            .attr("d", "M0 0L8 8M8 0L0 8")
            .attr("stroke", strokeColor)
            .attr("stroke-width", 0.5);

        // 2. Dots (for Files)
        const patternFile = defs.append("pattern")
            .attr("id", "pattern-file")
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", 6)
            .attr("height", 6);

        patternFile.append("circle")
            .attr("cx", 3)
            .attr("cy", 3)
            .attr("r", 1)
            .attr("fill", strokeColor);

        // 3. Diagonal Lines (for Functions)
        const patternFunction = defs.append("pattern")
            .attr("id", "pattern-function")
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", 6)
            .attr("height", 6)
            .attr("patternTransform", "rotate(45)");

        patternFunction.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", 6)
            .attr("stroke", strokeColor)
            .attr("stroke-width", 1);

        // 4. Double Diagonal (for Classes)
        const patternClass = defs.append("pattern")
            .attr("id", "pattern-class")
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", 8)
            .attr("height", 8)
            .attr("patternTransform", "rotate(45)");

        patternClass.append("path")
            .attr("d", "M0 0L8 8M8 0L0 8")
            .attr("stroke", strokeColor)
            .attr("stroke-width", 1);

        // 5. Dense Dots (for Components)
        const patternComponent = defs.append("pattern")
            .attr("id", "pattern-component")
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", 4)
            .attr("height", 4);

        patternComponent.append("circle")
            .attr("cx", 2)
            .attr("cy", 2)
            .attr("r", 1)
            .attr("fill", strokeColor);


        // Glow Filter for Modern Theme
        const glowFilter = defs.append("filter")
            .attr("id", "glow-repo")
            .attr("x", "-50%")
            .attr("y", "-50%")
            .attr("width", "200%")
            .attr("height", "200%");

        glowFilter.append("feGaussianBlur")
            .attr("stdDeviation", "2.5")
            .attr("result", "coloredBlur");

        const feMerge = glowFilter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");


        const g = svg.append("g");
        zoomGroupRef.current = g;

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 8])
            .on("zoom", (event) => g.attr("transform", event.transform));

        zoomBehaviorRef.current = zoom;

        svg.call(zoom).on("dblclick.zoom", null);
        svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2));

        linkGroupRef.current = g.append("g").attr("class", "links");
        nodeGroupRef.current = g.append("g").attr("class", "nodes");

        simulationRef.current = d3.forceSimulation<GraphNode>()
            .force("link", d3.forceLink<GraphNode, GraphLink>()
                .id(d => d.id)
                .distance(d => {
                    const target = d.target as GraphNode;
                    if (target.type === NodeType.FUNCTION) return 80;
                    if (target.type === NodeType.FILE) return 120;
                    return 180;
                })
                .strength(0.4)
            )
            .force("charge", d3.forceManyBody().strength(-500))
            .force("collide", d3.forceCollide()
                .radius(d => {
                    const size = getNodeSize((d as GraphNode).type);
                    return size + 30;
                })
                .strength(0.9)
                .iterations(3)
            )
            .force("x", d3.forceX().strength(0.05))
            .force("y", d3.forceY().strength(0.05));

        const rootNode: GraphNode = {
            id: data.path,
            name: data.name,
            type: data.type,
            data: data,
            x: 0,
            y: 0,
            fx: 0,
            fy: 0,
            isExpanded: false,
            depth: 0
        };
        setNodes([rootNode]);

        return () => {
            simulationRef.current?.stop();
        };
    }, [data, isDarkMode]); // Re-run if data or dark mode changes (for patterns)

    // --- 3. Data & Theme Update Effect ---
    useEffect(() => {
        const simulation = simulationRef.current;
        const linkGroup = linkGroupRef.current;
        const nodeGroup = nodeGroupRef.current;

        if (!simulation || !linkGroup || !nodeGroup || !svgRef.current) return;

        simulation.nodes(nodes);
        (simulation.force("link") as d3.ForceLink<GraphNode, GraphLink>).links(links);

        // Update Links
        const linkSelection = linkGroup.selectAll("line")
            .data(links, (d: any) => {
                const sId = (d.source as GraphNode).id || d.source;
                const tId = (d.target as GraphNode).id || d.target;
                return `${sId}-${tId}`;
            });

        linkSelection.exit().remove();

        const linkEnter = linkSelection.enter().append("line");

        const newLinks = linkEnter.merge(linkSelection as any)
            .attr("stroke", theme === 'pencil' ? (isDarkMode ? "#ffffff" : "#000000") : (isDarkMode ? "#7d8590" : "#57606a"))
            .attr("stroke-opacity", d => {
                if (theme === 'pencil') return 0.6;
                const target = d.target as GraphNode;
                const depth = target.depth || 1;
                return Math.max(0.2, 0.8 - (depth * 0.12));
            })
            .attr("stroke-width", d => {
                const target = d.target as GraphNode;
                const depth = target.depth || 1;
                // Thicker strokes for Crayon/Pencil theme
                const baseWidth = Math.max(1, 5 - (depth * 0.8));
                return (theme === 'crayon' || theme === 'pencil') ? baseWidth + 1 : baseWidth;
            })
            .attr("stroke-dasharray", "none")
            // Apply sketchy filter to links in Crayon/Pencil mode
            .attr("filter", (theme === 'crayon' || theme === 'pencil') ? "url(#sketchy-border-repo)" : null);

        // Update Nodes
        const nodeSelection = nodeGroup.selectAll("g")
            .data(nodes, (d: any) => d.id);

        nodeSelection.exit()
            .transition().duration(300)
            .attr("opacity", 0)
            .remove();

        const nodeEnter = nodeSelection.enter().append("g")
            .attr("opacity", 0)
            .call(d3.drag<SVGGElement, GraphNode>()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended)
            );

        nodeEnter.transition().duration(500).attr("opacity", 1);

        // Circle
        nodeEnter.append("circle")
            .attr("r", d => getNodeSize(d.type))
            .attr("fill", d => {
                if (theme === 'pencil') {
                    switch (d.type) {
                        case NodeType.FOLDER: return "url(#pattern-folder)";
                        case NodeType.FILE: return "url(#pattern-file)";
                        case NodeType.FUNCTION: return "url(#pattern-function)";
                        case NodeType.CLASS: return "url(#pattern-class)";
                        case NodeType.COMPONENT: return "url(#pattern-component)";
                        default: return "#ffffff";
                    }
                }
                return getNodeColor(d.type);
            })
            .attr("stroke", isDarkMode ? "#ffffff" : "#000000")
            .attr("stroke-width", 2)
            .style("cursor", "pointer");

        // Label
        nodeEnter.append("text")
            .text(d => d.name)
            .attr("x", d => getNodeSize(d.type) + 6)
            .attr("y", 4)
            .style("font-weight", d => d.type === NodeType.FOLDER ? "600" : "400")
            .style("pointer-events", "none")
            .style("paint-order", "stroke")
            .style("stroke-width", "3px")
            .style("stroke-linecap", "butt")
            .style("stroke-linejoin", "miter");

        // Expand Indicator
        nodeEnter.append("circle")
            .attr("class", "indicator")
            .attr("r", 2)
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("fill", isDarkMode ? "#0d1117" : "#ffffff")
            .style("pointer-events", "none")
            .style("opacity", 0);

        const newNodes = nodeEnter.merge(nodeSelection as any);

        // Update visuals based on Theme
        newNodes.select("circle")
            .attr("fill", d => {
                if (theme === 'pencil') {
                    switch (d.type) {
                        case NodeType.FOLDER: return "url(#pattern-folder)";
                        case NodeType.FILE: return "url(#pattern-file)";
                        case NodeType.FUNCTION: return "url(#pattern-function)";
                        case NodeType.CLASS: return "url(#pattern-class)";
                        case NodeType.COMPONENT: return "url(#pattern-component)";
                        default: return "#ffffff";
                    }
                }
                return getNodeColor(d.type);
            })
            .attr("stroke", d => {
                if (theme === 'pencil') return isDarkMode ? "#ffffff" : "#000000";
                return d.isExpanded ? "#0969da" : (isDarkMode ? "#0d1117" : "#ffffff");
            })
            .attr("stroke-width", d => d.isExpanded ? 2 : 1.5)
            .attr("stroke-dasharray", "none")
            .attr("filter", (theme === 'crayon' || theme === 'pencil') ? "url(#sketchy-border-repo)" : (theme === 'modern' ? "url(#glow-repo)" : null))
            .on("mouseenter", function (event, d) {
                d3.select(this)
                    .transition().duration(200)
                    .attr("r", getNodeSize(d.type) * 1.25)
                    .attr("stroke", theme === 'pencil' ? (isDarkMode ? "#ffffff" : "#000000") : "#0969da")
                    .attr("stroke-width", 2);
            })
            .on("mouseleave", function (event, d) {
                d3.select(this)
                    .transition().duration(200)
                    .attr("r", getNodeSize(d.type))
                    .attr("stroke", d => {
                        if (theme === 'pencil') return isDarkMode ? "#ffffff" : "#000000";
                        return d.isExpanded ? "#0969da" : (isDarkMode ? "#0d1117" : "#ffffff");
                    })
                    .attr("stroke-width", d.isExpanded ? 2 : 1.5);
            })
            .on("click", (event, d) => handleNodeClick(event, d));

        newNodes.select("text")
            .style("fill", theme === 'pencil' ? (isDarkMode ? "#ffffff" : "#000000") : (isDarkMode ? "#c9d1d9" : "#24292f"))
            // Improved Readability for Pencil Theme
            .style("paint-order", "stroke")
            .style("stroke", theme === 'pencil' ? (isDarkMode ? "#0d1117" : "#ffffff") : (isDarkMode ? "#0d1117" : "#ffffff"))
            .style("stroke-width", theme === 'pencil' ? "4px" : "3px")
            .style("stroke-linecap", "round")
            .style("stroke-linejoin", "round")
            .style("font-family", (theme === 'crayon' || theme === 'pencil') ? '"Patrick Hand", cursive' : '"JetBrains Mono", monospace')
            .style("font-weight", theme === 'pencil' ? "900" : "normal")
            .style("font-size", d => {
                const baseSize = d.type === NodeType.FOLDER ? 12 : 10;
                return (theme === 'crayon' || theme === 'pencil') ? `${baseSize + 2}px` : `${baseSize}px`;
            });

        newNodes.select(".indicator")
            .attr("r", d => getNodeSize(d.type) + 4)
            .attr("fill", "none")
            .attr("stroke", theme === 'pencil' ? (isDarkMode ? "#ffffff" : "#000000") : "#0969da")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", (theme === 'crayon' || theme === 'pencil') ? "4,2" : "2,2")
            .style("opacity", d => {
                const hasKids = (d.data.children && d.data.children.length > 0);
                const isAnalyzable = (d.type === NodeType.FILE && !d.data.analyzed);
                return (!d.isExpanded && (hasKids || isAnalyzable)) ? 1 : 0;
            });

        simulation.on("tick", () => {
            newLinks
                .attr("x1", (d: any) => d.source.x!)
                .attr("y1", (d: any) => d.source.y!)
                .attr("x2", (d: any) => d.target.x!)
                .attr("y2", (d: any) => d.target.y!);

            newNodes.attr("transform", d => `translate(${d.x},${d.y})`);
        });

        simulation.alpha(1).restart();

        function dragstarted(event: any, d: GraphNode) {
            if (!event.active) simulationRef.current?.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        function dragged(event: any, d: GraphNode) {
            d.fx = event.x;
            d.fy = event.y;
        }
        function dragended(event: any, d: GraphNode) {
            if (!event.active) simulationRef.current?.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

    }, [nodes, links, isDarkMode, theme]); // Added theme dependency

    // --- 4. Auto-Focus Effect ---
    useEffect(() => {
        if (focusNodeId && svgRef.current && zoomBehaviorRef.current) {
            const targetNode = nodes.find(n => n.id === focusNodeId);
            if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined && containerRef.current) {
                const svg = d3.select(svgRef.current);
                const width = containerRef.current.clientWidth;
                const height = containerRef.current.clientHeight;
                const scale = 2;

                const x = -targetNode.x * scale + width / 2;
                const y = -targetNode.y * scale + height / 2;

                svg.transition()
                    .duration(1200)
                    .ease(d3.easeCubicOut)
                    .call(
                        zoomBehaviorRef.current.transform as any,
                        d3.zoomIdentity.translate(x, y).scale(scale)
                    )
                    .on("end", () => setFocusNodeId(null));
            }
        }
    }, [focusNodeId, nodes]);


    // --- 5. Interactions ---
    const handleNodeClick = async (event: any, d: GraphNode) => {
        event.stopPropagation();
        onNodeSelect(d.data);

        if (d.type === NodeType.FOLDER) {
            toggleFolder(d);
        } else if (d.type === NodeType.FILE) {
            if (!d.data.analyzed && (d.data.content || d.data.downloadUrl)) {
                await analyzeFile(d);
            } else if (d.data.children && d.data.children.length > 0) {
                toggleFolder(d);
            }
        } else {
            setFocusNodeId(d.id);
        }
    };

    const toggleFolder = (parentNode: GraphNode) => {
        const isExpanding = !parentNode.isExpanded;
        const getId = (nodeOrId: string | GraphNode) => (typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id);

        if (!isExpanding) {
            // COLLAPSE
            const descendants = new Set<string>();
            const findDescendants = (parentId: string) => {
                links.forEach(l => {
                    const sId = getId(l.source);
                    const tId = getId(l.target);
                    if (sId === parentId) {
                        descendants.add(tId);
                        findDescendants(tId);
                    }
                });
            };
            findDescendants(parentNode.id);

            setNodes(prev => prev.map(n => {
                if (n.id === parentNode.id) return { ...n, isExpanded: false };
                return n;
            }).filter(n => !descendants.has(n.id)));

            setLinks(prev => prev.filter(l => {
                const sId = getId(l.source);
                const tId = getId(l.target);
                return !descendants.has(sId) && !descendants.has(tId);
            }).map(l => ({
                source: getId(l.source),
                target: getId(l.target),
                value: l.value
            } as any)));

            setFocusNodeId(parentNode.id);

        } else {
            // EXPAND
            const childrenData = parentNode.data.children;
            if (!childrenData) return;

            const newNodes: GraphNode[] = childrenData.map(child => ({
                id: child.path,
                name: child.name,
                type: child.type,
                data: child,
                // Increased random jitter to avoid initial stacking/overlap
                x: parentNode.x! + (Math.random() - 0.5) * 60,
                y: parentNode.y! + (Math.random() - 0.5) * 60,
                isExpanded: false,
                depth: (parentNode.depth || 0) + 1
            }));

            const newLinks = newNodes.map(child => ({
                source: parentNode.id,
                target: child.id
            }));

            setNodes(prev => {
                return prev.map(n => {
                    if (n.id === parentNode.id) return { ...n, isExpanded: true };
                    return n;
                }).concat(newNodes);
            });

            setLinks(prev => {
                const cleanPrev = prev.map(l => ({
                    source: getId(l.source),
                    target: getId(l.target),
                    value: l.value
                }));
                return cleanPrev.concat(newLinks as any);
            });

            setFocusNodeId(parentNode.id);
        }
    };

    const analyzeFile = async (node: GraphNode) => {
        setAnalyzingNodeId(node.id);
        setFocusNodeId(node.id);

        try {
            let content = node.data.content;
            if (!content && node.data.downloadUrl) {
                try {
                    content = await fetchRemoteFileContent(node.data.downloadUrl);
                    node.data.content = content; // Cache it
                } catch (e) {
                    console.error("Failed to fetch file content", e);
                    setAnalyzingNodeId(null);
                    return;
                }
            }

            const result = await analyzeCode(node.name, content || "");

            if (result) {
                node.data.analyzed = true;
                node.data.summary = result.summary;
                node.data.children = result.items.map(item => ({
                    name: item.name,
                    type: item.type === 'FUNCTION' ? NodeType.FUNCTION : (item.type === 'CLASS' ? NodeType.CLASS : NodeType.COMPONENT),
                    description: item.description,
                    path: `${node.id}#${item.name}`,
                    value: 1
                }));

                toggleFolder(node);
                onNodeSelect({ ...node.data });
            }
        } catch (e) {
            console.error("Analysis failed", e);
        } finally {
            setAnalyzingNodeId(null);
        }
    };

    const getNodeColor = (type: NodeType) => {
        if (theme === 'pencil') return "#ffffff";
        switch (type) {
            case NodeType.FOLDER: return "#54aeff"; // GitHub Blue
            case NodeType.FILE: return "#8b949e"; // Gray
            case NodeType.FUNCTION: return "#d2a8ff"; // Purple
            case NodeType.CLASS: return "#ffa657"; // Orange
            case NodeType.COMPONENT: return "#7ee787"; // Green
            default: return "#8b949e";
        }
    };

    const getNodeSize = (type: NodeType) => {
        switch (type) {
            case NodeType.FOLDER: return 14;
            case NodeType.FILE: return 10;
            case NodeType.FUNCTION: return 6;
            case NodeType.CLASS: return 8;
            case NodeType.COMPONENT: return 8;
            default: return 5;
        }
    };

    return (
        <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${isDarkMode ? 'bg-[#0d1117]' : 'bg-[#ffffff]'}`}>
            {/* Background */}
            {(theme === 'crayon' || theme === 'pencil') ? (
                <div className="absolute inset-0 pointer-events-none opacity-40"
                    style={{
                        backgroundImage: theme === 'pencil'
                            ? (isDarkMode
                                ? 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.1\' fill=\'%23ffffff\'/%3E%3C/svg%3E")'
                                : 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.05\'/%3E%3C/svg%3E")')
                            : 'radial-gradient(#888 1px, transparent 1px)',
                        backgroundSize: theme === 'pencil' ? 'auto' : '20px 20px',
                        backgroundColor: theme === 'pencil' ? (isDarkMode ? '#0d1117' : '#ffffff') : '#fdfbf7'
                    }}
                ></div>
            ) : (
                <div className={`absolute inset-0 [background-size:20px_20px] pointer-events-none ${isDarkMode ? 'bg-[radial-gradient(#30363d_1px,transparent_1px)]' : 'bg-[radial-gradient(#e1e4e8_1px,transparent_1px)]'}`}></div>
            )}

            {analyzingNodeId && (
                <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
                    <div className={`px-4 py-2 rounded-full border shadow-md flex items-center gap-3 
                    ${theme === 'pencil' ? (isDarkMode ? 'bg-[#161b22] border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.5)]' : 'bg-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]') :
                            (isDarkMode ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-[#d0d7de]')}`}>
                        <div className={`w-2 h-2 rounded-full animate-ping ${theme === 'pencil' ? (isDarkMode ? 'bg-white' : 'bg-black') : 'bg-[#0969da]'}`} />
                        <span className={`text-xs font-semibold 
                        ${(theme === 'crayon' || theme === 'pencil') ? 'font-[\'Patrick_Hand\']' : 'font-sans'} 
                        ${theme === 'pencil' ? (isDarkMode ? 'text-white' : 'text-black') : (isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]')}`}>
                            Analyzing Structure...
                        </span>
                    </div>
                </div>
            )}

            <svg ref={svgRef} className="w-full h-full block cursor-move active:cursor-grabbing" />

            {/* Legend */}
            <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 pointer-events-none z-50">
                <div className={`p-3 rounded-md border shadow-sm flex flex-col gap-2 backdrop-blur-sm 
                ${theme === 'pencil' ? (isDarkMode ? 'bg-[#161b22]/90 border-white border-2 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.5)]' : 'bg-white/90 border-black border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]') :
                        (theme === 'crayon' ? 'bg-[#fdfbf7]/90 border-black border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' :
                            (isDarkMode ? 'bg-[#161b22]/90 border-[#30363d]' : 'bg-white/90 border-[#d0d7de]'))}`}>

                    <div className={`text-[10px] uppercase tracking-wider mb-1 font-bold 
                    ${(theme === 'crayon' || theme === 'pencil') ? 'font-[\'Patrick_Hand\'] text-base' : ''} 
                    ${theme === 'pencil' ? (isDarkMode ? 'text-white' : 'text-black') : (isDarkMode ? 'text-[#8b949e]' : 'text-[#656d76]')}`}>
                        Legend
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full border border-black/20 
                        ${theme === 'pencil' ? (isDarkMode ? 'bg-[#0d1117] border-white' : 'bg-white border-black') : 'bg-[#54aeff]'}`}
                            style={{ backgroundImage: theme === 'pencil' ? 'url(#pattern-folder)' : 'none' }}></span>
                        <span className={`text-xs ${(theme === 'crayon' || theme === 'pencil') ? 'font-[\'Patrick_Hand\']' : ''} ${theme === 'pencil' ? (isDarkMode ? 'text-white' : 'text-black') : (isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]')}`}>Folder</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full border border-black/20 
                        ${theme === 'pencil' ? (isDarkMode ? 'bg-[#0d1117] border-white' : 'bg-white border-black') : 'bg-[#8b949e]'}`}
                            style={{ backgroundImage: theme === 'pencil' ? 'url(#pattern-file)' : 'none' }}></span>
                        <span className={`text-xs ${(theme === 'crayon' || theme === 'pencil') ? 'font-[\'Patrick_Hand\']' : ''} ${theme === 'pencil' ? (isDarkMode ? 'text-white' : 'text-black') : (isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]')}`}>File</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full border border-black/20 
                        ${theme === 'pencil' ? (isDarkMode ? 'bg-[#0d1117] border-white' : 'bg-white border-black') : 'bg-[#d2a8ff]'}`}
                            style={{ backgroundImage: theme === 'pencil' ? 'url(#pattern-function)' : 'none' }}></span>
                        <span className={`text-xs ${(theme === 'crayon' || theme === 'pencil') ? 'font-[\'Patrick_Hand\']' : ''} ${theme === 'pencil' ? (isDarkMode ? 'text-white' : 'text-black') : (isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]')}`}>Function</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full border border-black/20 
                        ${theme === 'pencil' ? (isDarkMode ? 'bg-[#0d1117] border-white' : 'bg-white border-black') : 'bg-[#ffa657]'}`}
                            style={{ backgroundImage: theme === 'pencil' ? 'url(#pattern-class)' : 'none' }}></span>
                        <span className={`text-xs ${(theme === 'crayon' || theme === 'pencil') ? 'font-[\'Patrick_Hand\']' : ''} ${theme === 'pencil' ? (isDarkMode ? 'text-white' : 'text-black') : (isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]')}`}>Class</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full border border-black/20 
                        ${theme === 'pencil' ? (isDarkMode ? 'bg-[#0d1117] border-white' : 'bg-white border-black') : 'bg-[#7ee787]'}`}
                            style={{ backgroundImage: theme === 'pencil' ? 'url(#pattern-component)' : 'none' }}></span>
                        <span className={`text-xs ${(theme === 'crayon' || theme === 'pencil') ? 'font-[\'Patrick_Hand\']' : ''} ${theme === 'pencil' ? (isDarkMode ? 'text-white' : 'text-black') : (isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]')}`}>Component</span>
                    </div>
                </div>
            </div>
        </div>
    );
};