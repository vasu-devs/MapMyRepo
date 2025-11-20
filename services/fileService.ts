import { FileSystemNode, NodeType } from "../types";

export const parseFilesToTree = async (fileList: FileList): Promise<FileSystemNode> => {
  const root: FileSystemNode = {
    name: "root",
    type: NodeType.FOLDER,
    children: [],
    path: "root",
    value: 0
  };

  const fileMap = new Map<string, FileSystemNode>();
  fileMap.set("root", root);

  // Sort files by path length to ensure folders are created before files
  const sortedFiles = Array.from(fileList).sort((a, b) => a.webkitRelativePath.length - b.webkitRelativePath.length);

  for (const file of sortedFiles) {
    const pathParts = file.webkitRelativePath.split('/');
    
    let currentPath = "root";
    let parent = root;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const isFile = i === pathParts.length - 1;
      
      // Create a unique path key
      const nextPath = currentPath === "root" ? part : `${currentPath}/${part}`;
      
      let node = fileMap.get(nextPath);

      if (!node) {
        node = {
          name: part,
          type: isFile ? NodeType.FILE : NodeType.FOLDER,
          path: nextPath,
          children: isFile ? undefined : [], // Files don't have children initially
          value: isFile ? file.size : 0
        };

        if (isFile) {
             if (file.size < 200000) { 
                 try {
                    node.content = await file.text();
                 } catch (e) {
                     console.warn("Could not read file text", part);
                 }
             }
        }

        if (parent.children) {
            parent.children.push(node);
        }
        fileMap.set(nextPath, node);
      }
      
      currentPath = nextPath;
      parent = node;
    }
  }

  calculateSizeRecursive(root);

  // Optimization: If root has only 1 child (the actual repo folder), return that child
  if (root.children && root.children.length === 1) {
      return root.children[0];
  }

  return root;
};

// --- NEW: Recursive Entry Parser for Drag & Drop ---

export const parseFileEntryToTree = async (entry: any): Promise<FileSystemNode> => {
    const processEntry = async (ent: any, parentPath: string): Promise<FileSystemNode> => {
        const isFile = ent.isFile;
        const node: FileSystemNode = {
            name: ent.name,
            type: isFile ? NodeType.FILE : NodeType.FOLDER,
            path: parentPath ? `${parentPath}/${ent.name}` : ent.name,
            children: isFile ? undefined : [],
            value: 0
        };

        if (isFile) {
            await new Promise<void>((resolve) => {
                ent.file(async (file: File) => {
                    node.value = file.size;
                    if (file.size < 200000) {
                        try {
                            node.content = await file.text();
                        } catch (e) { console.warn("Read error", ent.name); }
                    }
                    resolve();
                }, (err: any) => {
                    console.warn("File access error", err);
                    resolve();
                });
            });
        } else if (ent.isDirectory) {
            const reader = ent.createReader();
            const entries: any[] = [];
            
            // readEntries must be called until empty array is returned
            await new Promise<void>((resolve) => {
                const read = () => {
                    reader.readEntries((results: any[]) => {
                        if (results.length > 0) {
                            entries.push(...results);
                            read();
                        } else {
                            resolve();
                        }
                    }, () => resolve());
                };
                read();
            });

            for (const childEntry of entries) {
                const childNode = await processEntry(childEntry, node.path);
                node.children?.push(childNode);
            }
        }

        return node;
    };

    const rootNode = await processEntry(entry, "");
    calculateSizeRecursive(rootNode);
    return rootNode;
};

// Helper to calculate folder sizes (sum of children)
const calculateSizeRecursive = (node: FileSystemNode): number => {
    if (node.type === NodeType.FILE) {
        return node.value || 1;
    }
    if (node.children) {
        const sum = node.children.reduce((acc, child) => acc + calculateSizeRecursive(child), 0);
        node.value = sum;
        return sum;
    }
    return 0;
};

// --- NEW: Fetch repository from GitHub and build FileSystemNode ---

export const parseGitHubUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.replace(/^\//, '').split('/');
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  } catch (e) {
    return null;
  }
  return null;
};

export const fetchRemoteFileContent = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch content: ${response.statusText}`);
    return await response.text();
};

export const fetchGithubRepo = async (url: string, token?: string): Promise<FileSystemNode> => {
    const coords = parseGitHubUrl(url);
    if (!coords) throw new Error("Invalid GitHub URL. Format: https://github.com/owner/repo");
    const { owner, repo } = coords;

    const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // 1. Fetch Repo Info for default branch
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    
    if (repoResponse.status === 403) {
        throw new Error("GitHub API rate limit exceeded. Please provide a GitHub Token (PAT) to increase limits.");
    }
    if (repoResponse.status === 404) throw new Error("Repository not found. Please check the URL.");
    
    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch;

    // 2. Fetch Tree
    const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, { headers });
    if (!treeResponse.ok) {
        if (treeResponse.status === 403) throw new Error("GitHub API rate limit exceeded. Please provide a GitHub Token.");
        throw new Error("Failed to fetch repository structure.");
    }
    const treeData = await treeResponse.json();

    if (treeData.truncated) {
        console.warn("Repository is too large, some files may be missing.");
    }

    // 3. Build Hierarchy
    const root: FileSystemNode = {
        name: repo,
        type: NodeType.FOLDER,
        children: [],
        path: "root",
        value: 0
    };

    const nodesByPath = new Map<string, FileSystemNode>();
    nodesByPath.set("root", root);
    
    // Helper to calculate size recursively
    const calculateSizeRecursive = (node: FileSystemNode): number => {
        if (node.type === NodeType.FILE) return node.value || 1;
        if (node.children) {
            const sum = node.children.reduce((acc, c) => acc + calculateSizeRecursive(c), 0);
            node.value = sum;
            return sum;
        }
        return 0;
    };

    // Sort items by path length to ensure folders exist before files
    const sortedItems = treeData.tree.sort((a: any, b: any) => a.path.split('/').length - b.path.split('/').length);

    // Process items
    for (const item of sortedItems) {
        const pathParts = item.path.split('/');
        const fileName = pathParts.pop()!;
        const dirPath = pathParts.join('/');
        
        // Find parent
        let parentNode = root;
        if (dirPath) {
            // Construct parent path logic relative to our map
            // Since we are flat from GitHub, we rely on the map
            let walker = root;
            let currentWalk = "";
            const parts = dirPath.split('/');
            for (const p of parts) {
                currentWalk = currentWalk ? `${currentWalk}/${p}` : p;
                let child = nodesByPath.get(currentWalk);
                if (!child) {
                    child = {
                        name: p,
                        type: NodeType.FOLDER,
                        path: currentWalk,
                        children: [],
                        value: 0
                    };
                    nodesByPath.set(currentWalk, child);
                    if (walker.children) walker.children.push(child);
                }
                walker = child;
            }
            parentNode = walker;
        }

        const fullPath = item.path;
        
        if (item.type === 'blob') {
            const fileNode: FileSystemNode = {
                name: fileName,
                type: NodeType.FILE,
                path: fullPath,
                value: item.size || 0,
                downloadUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${fullPath}`
            };
            if (parentNode.children) {
                parentNode.children.push(fileNode);
            }
            nodesByPath.set(fullPath, fileNode);
        } else if (item.type === 'tree') {
            if (!nodesByPath.has(fullPath)) {
                const folderNode: FileSystemNode = {
                    name: fileName,
                    type: NodeType.FOLDER,
                    path: fullPath,
                    children: [],
                    value: 0
                };
                nodesByPath.set(fullPath, folderNode);
                if (parentNode.children) {
                    parentNode.children.push(folderNode);
                }
            }
        }
    }
    
    calculateSizeRecursive(root);
    return root;
};