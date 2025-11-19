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