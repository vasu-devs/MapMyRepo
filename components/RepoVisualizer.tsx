import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { FileSystemNode, GraphLink, GraphNode, NodeType } from '../types';
import { analyzeCode } from '../services/geminiService';
import { fetchRemoteFileContent } from '../services/fileService';

interface RepoVisualizerProps {
  data: FileSystemNode;
  onNodeSelect: (node: FileSystemNode) => void;
  isDarkMode: boolean;
}

export const RepoVisualizer: React.FC<RepoVisualizerProps> = ({ data, onNodeSelect, isDarkMode }) => {
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
                // Increased distances for better separation
                if (target.type === NodeType.FUNCTION) return 80;
                if (target.type === NodeType.FILE) return 120;
                return 180; 
            })
            .strength(0.4) 
        )
        .force("charge", d3.forceManyBody().strength(-500)) // Stronger repulsion
        .force("collide", d3.forceCollide()
            .radius(d => {
                // Add buffer for text labels to reduce overlap
                const size = getNodeSize((d as GraphNode).type);
                return size + 30; 
            })
            .strength(0.9)
            .iterations(3) // More iterations for better stability
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
  }, [data]); 

  // --- 3. Data Update Effect ---
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
        .attr("stroke", isDarkMode ? "#7d8590" : "#57606a")
        .attr("stroke-opacity", d => {
            const target = d.target as GraphNode;
            const depth = target.depth || 1;
            // Fade out deeper levels
            return Math.max(0.2, 0.8 - (depth * 0.12));
        })
        .attr("stroke-width", d => {
            const target = d.target as GraphNode;
            const depth = target.depth || 1;
            // Thicker near root, thinner deeper down
            return Math.max(1, 5 - (depth * 0.8));
        });

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
        .attr("fill", d => getNodeColor(d.type))
        .attr("stroke", isDarkMode ? "#0d1117" : "#ffffff")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .attr("filter", "drop-shadow(0px 1px 2px rgba(0,0,0,0.1))");

    // Label
    nodeEnter.append("text")
        .text(d => d.name)
        .attr("x", d => getNodeSize(d.type) + 6)
        .attr("y", 4)
        .style("font-family", "ui-monospace, SFMono-Regular, Menlo, monospace")
        .style("font-size", d => d.type === NodeType.FOLDER ? "12px" : "10px")
        .style("font-weight", d => d.type === NodeType.FOLDER ? "600" : "400")
        .style("fill", isDarkMode ? "#c9d1d9" : "#24292f") 
        .style("pointer-events", "none")
        .style("paint-order", "stroke")
        .style("stroke", isDarkMode ? "#0d1117" : "#ffffff")
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

    // Update visuals
    newNodes.select("circle")
        .attr("fill", d => getNodeColor(d.type))
        .attr("stroke", d => d.isExpanded ? "#0969da" : (isDarkMode ? "#0d1117" : "#ffffff"))
        .attr("stroke-width", d => d.isExpanded ? 2 : 1.5)
        .on("mouseenter", function(event, d) {
            d3.select(this)
                .transition().duration(200)
                .attr("r", getNodeSize(d.type) * 1.25)
                .attr("stroke", "#0969da")
                .attr("stroke-width", 2);
        })
        .on("mouseleave", function(event, d) {
            d3.select(this)
                .transition().duration(200)
                .attr("r", getNodeSize(d.type))
                .attr("stroke", d.isExpanded ? "#0969da" : (isDarkMode ? "#0d1117" : "#ffffff"))
                .attr("stroke-width", d.isExpanded ? 2 : 1.5);
        })
        .on("click", (event, d) => handleNodeClick(event, d));

    newNodes.select("text")
        .style("fill", isDarkMode ? "#c9d1d9" : "#24292f")
        .style("stroke", isDarkMode ? "#0d1117" : "#ffffff");

    newNodes.select(".indicator")
        .attr("r", d => getNodeSize(d.type) + 4)
        .attr("fill", "none")
        .attr("stroke", "#0969da")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "2,2")
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

  }, [nodes, links, isDarkMode]);

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
            onNodeSelect({...node.data});
        }
      } catch (e) {
          console.error("Analysis failed", e);
      } finally {
          setAnalyzingNodeId(null);
      }
  };

  const getNodeColor = (type: NodeType) => {
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
        {/* Dot Grid Background */}
        <div className={`absolute inset-0 [background-size:20px_20px] pointer-events-none ${isDarkMode ? 'bg-[radial-gradient(#30363d_1px,transparent_1px)]' : 'bg-[radial-gradient(#e1e4e8_1px,transparent_1px)]'}`}></div>
        
        {analyzingNodeId && (
            <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
                <div className={`px-4 py-2 rounded-full border shadow-md flex items-center gap-3 ${isDarkMode ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-[#d0d7de]'}`}>
                    <div className="w-2 h-2 bg-[#0969da] rounded-full animate-ping" />
                    <span className={`text-xs font-semibold font-sans ${isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>Analyzing Structure...</span>
                </div>
            </div>
        )}

        <svg ref={svgRef} className="w-full h-full block cursor-move active:cursor-grabbing" />
        
        {/* Legend */}
        <div className="absolute bottom-6 left-6 pointer-events-none z-50">
             <div className={`p-3 rounded-md border shadow-sm flex flex-col gap-2 backdrop-blur-sm ${isDarkMode ? 'bg-[#161b22]/90 border-[#30363d]' : 'bg-white/90 border-[#d0d7de]'}`}>
                 <div className={`text-[10px] uppercase tracking-wider mb-1 font-bold ${isDarkMode ? 'text-[#8b949e]' : 'text-[#656d76]'}`}>Legend</div>
                 <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#54aeff]"></span><span className={`text-xs ${isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>Folder</span></div>
                 <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#8b949e]"></span><span className={`text-xs ${isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>File</span></div>
                 <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#d2a8ff]"></span><span className={`text-xs ${isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>Function</span></div>
                 <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#ffa657]"></span><span className={`text-xs ${isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>Class</span></div>
                 <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#7ee787]"></span><span className={`text-xs ${isDarkMode ? 'text-[#c9d1d9]' : 'text-[#1f2328]'}`}>Component</span></div>
             </div>
        </div>
    </div>
  );
};