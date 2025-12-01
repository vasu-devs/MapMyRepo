import { GithubRepo } from '../types';

export const fetchUserRepos = async (username: string): Promise<GithubRepo[]> => {
    try {
        const token = import.meta.env.VITE_GITHUB_TOKEN;
        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json',
        };

        if (token) {
            headers['Authorization'] = `token ${token}`;
        }

        console.log(`Fetching repos for user: ${username}`);
        const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, {
            headers
        });

        if (!response.ok) {
            console.error(`GitHub API Error: ${response.status} ${response.statusText}`);
            if (response.status === 404) {
                throw new Error(`User '${username}' not found on GitHub.`);
            }
            if (response.status === 403) {
                throw new Error('API rate limit exceeded. Please try again later.');
            }
            throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.map((repo: any) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            html_url: repo.html_url,
            description: repo.description,
            language: repo.language,
            stargazers_count: repo.stargazers_count,
            fork: repo.fork,
            updated_at: repo.updated_at,
            owner: {
                login: repo.owner.login,
                avatar_url: repo.owner.avatar_url
            }
        }));
    } catch (error) {
        console.error('Error in fetchUserRepos:', error);
        throw error;
    }
};

export const fetchRepoTree = async (username: string, repoName: string): Promise<any> => {
    const token = import.meta.env.VITE_GITHUB_TOKEN;
    const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
    };
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }

    // 1. Get default branch
    console.log(`Fetching repo details for: ${username}/${repoName}`);
    const repoRes = await fetch(`https://api.github.com/repos/${username}/${repoName}`, { headers });

    if (!repoRes.ok) {
        console.error(`Repo Details Error: ${repoRes.status}`);
        if (repoRes.status === 404) throw new Error(`Repository '${username}/${repoName}' not found.`);
        if (repoRes.status === 403) throw new Error('API rate limit exceeded.');
        throw new Error(`Failed to fetch repo details: ${repoRes.statusText}`);
    }

    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch;
    console.log(`Default branch: ${defaultBranch}`);

    // 2. Get Tree (recursive)
    console.log(`Fetching tree for: ${username}/${repoName} branch: ${defaultBranch}`);
    const treeRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/git/trees/${defaultBranch}?recursive=1`, { headers });

    if (!treeRes.ok) {
        console.error(`Tree Fetch Error: ${treeRes.status}`);
        if (treeRes.status === 404) throw new Error(`Tree not found for branch '${defaultBranch}'.`);
        if (treeRes.status === 403) throw new Error('API rate limit exceeded during tree fetch.');
        if (treeRes.status === 409) throw new Error('Repository is empty or git repository is not initialized.');
        throw new Error(`Failed to fetch repo tree: ${treeRes.statusText}`);
    }
    const treeData = await treeRes.json();

    if (treeData.truncated) {
        console.warn('Tree is truncated!');
        // We might want to warn the user, but for now let's proceed with what we have
    }

    // 3. Convert to FileSystemNode
    // We need to construct the tree from flat paths
    const root: any = {
        name: repoName,
        type: 'FOLDER',
        path: '',
        children: []
    };

    const map = new Map<string, any>();
    map.set('', root);

    treeData.tree.forEach((item: any) => {
        const pathParts = item.path.split('/');
        const fileName = pathParts.pop();
        const dirPath = pathParts.join('/');

        const parent = map.get(dirPath);
        if (parent) {
            const node: any = {
                name: fileName,
                type: item.type === 'blob' ? 'FILE' : 'FOLDER',
                path: item.path,
                size: item.size,
                children: item.type === 'tree' ? [] : undefined
            };
            parent.children.push(node);
            if (item.type === 'tree') {
                map.set(item.path, node);
            }
        }
    });

    return root;
};
