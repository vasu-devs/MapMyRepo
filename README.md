<div align="center">

# 🗺️ MapMyRepo

### Transform Your Codebase into an Interactive Knowledge Graph

[![React](https://img.shields.io/badge/React-19.2-61dafb?style=flat&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![D3.js](https://img.shields.io/badge/D3.js-7.9-f9a03c?style=flat&logo=d3.js&logoColor=white)](https://d3js.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285f4?style=flat&logo=google&logoColor=white)](https://ai.google.dev/)

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
</p>

**MapMyRepo** is a powerful AI-powered visualization tool that transforms any GitHub repository or local codebase into an interactive, navigable node graph. Perfect for understanding complex architectures, onboarding new developers, or exploring unfamiliar codebases.

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Usage](#-usage) • [Tech Stack](#-tech-stack)

</div>

---

## ✨ Features

### 🎨 **Interactive Graph Visualization**
- **Force-Directed Layout**: Files and folders represented as interconnected nodes using D3.js
- **Smooth Navigation**: Zoom, pan, and drag nodes to explore your codebase intuitively
- **Visual Hierarchy**: Distinct icons and colors for folders, files, and different file types
- **Node Expansion**: Double-click folders to expand/collapse their contents dynamically

### 🤖 **AI-Powered Intelligence (Google Gemini)**
- **Smart Summaries**: Automatically generates architectural overviews for folders and files
- **Code Analysis**: Explains the purpose, exports, and key functionality of individual files
- **Contextual Q&A**: Ask questions about your codebase and get intelligent, context-aware answers
- **Real-time Insights**: Chat interface integrated directly into the node selection panel

### 📥 **Flexible Import Options**
- **Local Upload**: Drag and drop folders directly from your file system
- **GitHub Integration**: Paste any public GitHub repository URL to visualize instantly
- **Smart Parsing**: Automatically filters out `node_modules`, `.git`, and other build artifacts

### 🌗 **Modern UI/UX**
- **Dark/Light Mode**: Fully themed interface that adapts to your preference
- **Glassmorphism Design**: Sleek, modern sidebar with backdrop blur effects
- **Responsive Layout**: Works seamlessly on desktop and tablet devices
- **Animated Backgrounds**: Dynamic particle effects and grid animations

---

## 🎬 Demo

<div align="center">
  <a href="https://youtu.be/EmTDrPzAo40?si=cf8X3JWwcOFvI7oD">
    <img src="https://img.youtube.com/vi/EmTDrPzAo40/maxresdefault.jpg" alt="Watch the MapMyRepo Demo" width="600" />
  </a>
</div>

Try visualizing any public repository:
```
https://github.com/facebook/react
https://github.com/microsoft/vscode
https://github.com/vercel/next.js
```

---

## 🚀 Installation

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Git** - [Download here](https://git-scm.com/)
- **Google Gemini API Key** - [Get one free](https://aistudio.google.com/app/apikey)

### Step 1: Clone the Repository

```bash
git clone https://github.com/vasu-devs/MapMyRepo.git
cd MapMyRepo
```

### Step 2: Install Dependencies

Using npm:
```bash
npm install
```

Or using yarn:
```bash
yarn install
```

### Step 3: Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# For Windows
copy .env.example .env.local

# For macOS/Linux
cp .env.example .env.local
```

Then add your API keys to `.env.local`:

```env
# Google Gemini AI API Key (Required)
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# GitHub Personal Access Token (Optional - for private repos and higher rate limits)
VITE_GITHUB_TOKEN=your_github_token_here
```

> **🔑 Getting Your API Keys:**
> - **Gemini API Key**: Visit [Google AI Studio](https://aistudio.google.com/app/apikey), sign in, and click "Create API Key"
> - **GitHub Token** (Optional): Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens) and generate a new token with `repo` scope

### Step 4: Run the Development Server

```bash
npm run dev
```

The application will start at `http://localhost:5173` (Vite's default port).

### Step 5: Build for Production (Optional)

```bash
npm run build
```

The optimized build will be created in the `dist` folder.

To preview the production build locally:
```bash
npm run preview
```

---

## 📖 Usage Guide

### 1️⃣ Visualize a Repository

#### Option A: Upload a Local Folder
1. Click the upload zone or drag and drop a folder from your file system
2. MapMyRepo will parse the directory structure (excludes `node_modules`, `.git`, etc.)
3. The graph will render automatically

#### Option B: Load from GitHub
1. Paste a full GitHub repository URL into the input field:
   ```
   https://github.com/username/repository
   ```
2. Press **Enter** or click the arrow button
3. The repository will be fetched and visualized

### 2️⃣ Navigate the Graph

| Action | Effect |
|--------|--------|
| **Scroll** | Zoom in/out |
| **Click + Drag** | Pan across the canvas |
| **Click Node** | Select node and open sidebar |
| **Double-Click Folder** | Expand/collapse folder contents |
| **Hover Node** | Highlight connected nodes |

### 3️⃣ Explore with AI

Once you select a node:

- **Details Tab**: View file/folder metadata and AI-generated architectural summary
- **Discussion Tab**: Ask questions like:
  - *"What does this file do?"*
  - *"Where is authentication handled?"*
  - *"Explain the routing structure"*
  - *"What are the main exports of this module?"*

### 4️⃣ Switch Themes

Click the theme toggle button (☀️/🌙) in the top-right corner to switch between light and dark modes.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| [React 19](https://react.dev/) | UI framework with modern hooks |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript |
| [Vite](https://vitejs.dev/) | Lightning-fast build tool |
| [D3.js](https://d3js.org/) | Force-directed graph visualization |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first styling |
| [Google Gemini AI](https://ai.google.dev/) | Code analysis and Q&A |
| [Marked](https://marked.js.org/) | Markdown rendering for AI responses |
| [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | Developer-friendly monospace font |

---

## 📂 Project Structure

```
MapMyRepo/
├── components/
│   ├── FileUploader.tsx       # Landing page & upload logic
│   ├── RepoVisualizer.tsx     # D3.js graph visualization
│   ├── Sidebar.tsx            # Node details & AI chat panel
│   └── SearchBar.tsx          # (Future) Search functionality
├── services/
│   ├── fileService.ts         # File parsing & GitHub API integration
│   └── geminiService.ts       # Google Gemini AI integration
├── public/
│   ├── favicon.svg            # App favicon
│   └── ...
├── App.tsx                    # Main application layout
├── index.tsx                  # React entry point
├── types.ts                   # TypeScript type definitions
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Project dependencies
```

---

## 🔧 Configuration

### Vite Configuration

The project uses Vite with React plugin. Key configurations in `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
})
```

### GitHub API Configuration

For private repositories or to avoid rate limits, configure a GitHub Personal Access Token:

1. Generate a token at [github.com/settings/tokens](https://github.com/settings/tokens)
2. Select `repo` scope for private repositories
3. Add to `.env.local`: `VITE_GITHUB_TOKEN=your_token_here`

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### How to Contribute

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/MapMyRepo.git
   ```
3. **Create a branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
4. **Make your changes** and commit:
   ```bash
   git commit -m "Add amazing feature"
   ```
5. **Push** to your fork:
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style (TypeScript, React Hooks)
- Add TypeScript types for all new code
- Test your changes thoroughly
- Update documentation as needed

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini AI** for powerful code analysis capabilities
- **D3.js** community for excellent graph visualization tools
- **React** and **Vite** teams for modern web development tools

---

## 👤 Author

**Vasudev Siddharth**

- GitHub: [@vasu-devs](https://github.com/vasu-devs)
- Twitter/X: [@Vasu_Devs](https://x.com/Vasu_Devs)
- Portfolio: [Coming Soon]

---

## 🐛 Troubleshooting

<details>
<summary><b>Graph doesn't render</b></summary>

- Ensure your repository has valid file structure
- Check browser console for errors
- Try clearing browser cache and reloading
</details>

<details>
<summary><b>AI features not working</b></summary>

- Verify `VITE_GEMINI_API_KEY` is correctly set in `.env.local`
- Check that the API key is valid at [Google AI Studio](https://aistudio.google.com/)
- Ensure you have an active internet connection
</details>

<details>
<summary><b>GitHub repository fetch fails</b></summary>

- Ensure the repository URL is correct and public
- For private repos, add `VITE_GITHUB_TOKEN` to `.env.local`
- Check if you've hit GitHub API rate limits (60 requests/hour without token)
</details>

<details>
<summary><b>Application won't start</b></summary>

- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Ensure you're using Node.js v18 or higher: `node --version`
- Check for port conflicts on 5173
</details>

---

## 📊 Roadmap

- [ ] Add search functionality to find specific files/folders
- [ ] Export graph as image (PNG/SVG)
- [ ] Support for private GitHub repositories
- [ ] Dependency graph visualization for imports/exports
- [ ] Code metrics and statistics dashboard
- [ ] Multi-repository comparison view
- [ ] VSCode extension integration

---

## 💖 Support

If you find MapMyRepo useful, please consider:

- ⭐ **Starring** this repository
- 🐦 **Sharing** on Twitter/X
- 🐛 **Reporting** bugs and issues
- 💡 **Suggesting** new features

---

<div align="center">

**[⬆ Back to Top](#-mapmyrepo)**

Made with ❤️ and ☕ by [Vasu-Devs](https://github.com/vasu-devs)

</div>
