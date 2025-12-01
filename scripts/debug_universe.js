
const extractUsername = (url) => {
    console.log(`Extracting from: "${url}"`);
    try {
        let processedUrl = url.trim();

        // Handle simple username input
        if (!processedUrl.includes('.') && !processedUrl.includes('/')) {
            const result = processedUrl.replace('@', '');
            console.log(`Simple username detected: ${result}`);
            return result;
        }

        // Add protocol if missing
        if (!processedUrl.startsWith('http')) {
            processedUrl = 'https://' + processedUrl;
        }

        const urlObj = new URL(processedUrl);
        console.log(`Hostname: ${urlObj.hostname}, Pathname: ${urlObj.pathname}`);

        if (urlObj.hostname !== 'github.com' && urlObj.hostname !== 'www.github.com') {
            console.log('Invalid hostname');
            return null;
        }

        const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
        const result = pathParts[0] || null;
        console.log(`Extracted username: ${result}`);
        return result;
    } catch (e) {
        console.log('Error parsing URL:', e.message);
        return null;
    }
};

const fetchUserRepos = async (username) => {
    console.log(`\n--- Fetching repos for: ${username} ---`);
    try {
        const url = `https://api.github.com/users/${username}/repos?per_page=5&sort=updated`;
        console.log(`Request URL: ${url}`);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Node.js Script'
            }
        });

        console.log(`Response Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            console.log(`Error Body:`, await response.text());
            return;
        }

        const data = await response.json();
        console.log(`Found ${data.length} repos.`);
        if (data.length > 0) {
            console.log('First repo:', data[0].name);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
};

// Test Cases
const runTests = async () => {
    const inputs = [
        'https://github.com/vasu-devs',
        'github.com/vasu-devs',
        'vasu-devs'
    ];

    for (const input of inputs) {
        console.log(`\nTesting Input: "${input}"`);
        const username = extractUsername(input);
        if (username) {
            await fetchUserRepos(username);
        } else {
            console.log('Failed to extract username');
        }
    }
};

runTests();
