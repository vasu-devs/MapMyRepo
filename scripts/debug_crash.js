import { fetchUserRepos } from '../services/githubService.js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Mock browser fetch if needed, but we are using node-fetch in service? 
// Actually the service uses native fetch which is available in Node 18+
// We need to ensure we are using the compiled service or the TS source with ts-node.
// Since we are in a JS script, let's just copy the logic to be sure we test the logic, 
// or better, use a ts-node runner if available. 
// Given the environment, let's rewrite the logic here to be 100% sure of what we are testing
// and avoid TS compilation issues in this quick script.

const fetchRepos = async (username) => {
    console.log(`Fetching repos for ${username}...`);
    const token = process.env.VITE_GITHUB_TOKEN;
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Debug-Script'
    };

    if (token) {
        console.log('Using GITHUB_TOKEN');
        headers['Authorization'] = `token ${token}`;
    } else {
        console.log('No GITHUB_TOKEN found');
    }

    try {
        const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, {
            headers
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        console.log(`Fetched ${data.length} repos.`);

        // Simulate the mapping logic from githubService.ts
        const mapped = data.map((repo) => {
            try {
                return {
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
                };
            } catch (err) {
                console.error('Error mapping repo:', repo.name, err);
                return null;
            }
        });

        console.log('First mapped repo:', JSON.stringify(mapped[0], null, 2));

        // Check for any nulls
        const failures = mapped.filter(r => r === null);
        if (failures.length > 0) {
            console.error(`Failed to map ${failures.length} repos.`);
        } else {
            console.log('All repos mapped successfully.');
        }

    } catch (error) {
        console.error('Fetch failed:', error);
    }
};

// Test with a known user
fetchRepos('vasu-devs');
