const fetch = require('node-fetch'); // Assuming node environment for test

const extractUsername = (url) => {
    try {
        if (!url.includes('github.com')) {
            return url.replace('@', '').trim();
        }
        // Add protocol if missing for URL constructor
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
        return pathParts[0] || null;
    } catch (e) {
        console.log('Error parsing URL:', e.message);
        return null;
    }
};

const testUrls = [
    'https://github.com/vasu-devs',
    'http://github.com/vasu-devs',
    'github.com/vasu-devs',
    'www.github.com/vasu-devs',
    'vasu-devs',
    '@vasu-devs'
];

console.log('--- Testing URL Extraction ---');
testUrls.forEach(url => {
    console.log(`Input: "${url}" -> Extracted: "${extractUsername(url)}"`);
});

const fetchUserRepos = async (username) => {
    console.log(`\n--- Fetching repos for: ${username} ---`);
    try {
        const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=5&sort=updated`);
        if (!response.ok) {
            console.log(`Error: ${response.status} ${response.statusText}`);
            return;
        }
        const data = await response.json();
        console.log(`Found ${data.length} repos (showing first 2):`);
        data.slice(0, 2).forEach(repo => {
            console.log(`- ${repo.name} (${repo.language}) [${repo.stargazers_count} stars]`);
        });
    } catch (error) {
        console.error('Fetch error:', error);
    }
};

// Run fetch test
fetchUserRepos('vasu-devs');
