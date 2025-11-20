# MapMyRepo 🗺️

**MapMyRepo** is a powerful, interactive visualization tool that turns your codebase into a navigable node graph. Whether you're onboarding to a new project or analyzing your own repository, MapMyRepo helps you understand file structures, dependencies, and architectural relationships at a glance.

Powered by **Google Gemini AI**, it goes beyond simple visualization by offering intelligent code analysis, folder summarization, and a Q&A chat interface directly within the graph context.


## ✨ Key Features

- **📂 Interactive File System Visualization**:
  - Visualizes folders and files as a force-directed graph using D3.js.
  - Zoom, pan, and drag nodes to explore the structure.
  - Distinguishes between folders, files, and components with unique icons.

- **🤖 AI-Powered Insights (Gemini)**:
  - **Folder Summaries**: Automatically generates architectural summaries for directories.
  - **Code Analysis**: Explains the purpose and exports of individual files.
  - **Contextual Q&A**: Chat with your codebase! Ask questions like "Where is auth handled?" and get answers based on the file context.

- **📥 Flexible Import Options**:
  - **Drag & Drop**: Upload local folders directly from your computer.
  - **GitHub Integration**: Paste a GitHub repository URL to fetch and visualize remote codebases instantly.

- **🎨 Modern & Responsive UI**:
  - **Dark/Light Mode**: Fully themed interface for any lighting condition.
  - **Immersive Backgrounds**: Interactive particle animations and grid effects.
  - **Glassmorphism Design**: Sleek, modern sidebar and controls.

## 🛠️ Tech Stack

- **Frontend Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Visualization**: [D3.js](https://d3js.org/)
- **AI Integration**: [Google GenAI SDK](https://ai.google.dev/) (Gemini 2.5 Flash)
- **Markdown Rendering**: [Marked](https://marked.js.org/)
- **Fonts**: JetBrains Mono

## 🚀 Getting Started

Follow these steps to set up MapMyRepo locally.

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Google Gemini API Key (Get one [here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/vasu-devs/MapMyRepo.git
   cd MapMyRepo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in Browser**
   Navigate to `http://localhost:3000` to see the app in action.

## 📖 Usage Guide

### 1. Visualizing a Repo
- **Local Folder**: Simply drag and drop a folder from your file explorer onto the upload zone.
- **GitHub Repo**: Paste the full URL (e.g., `https://github.com/facebook/react`) into the input field and press Enter.

### 2. Exploring the Graph
- **Navigation**: Scroll to zoom, click and drag to pan.
- **Interaction**: Click on any node (circle) to view its details in the sidebar.
- **Double Click**: Double-click a folder node to focus/zoom into it.

### 3. Using AI Features
- **Sidebar**: When a node is selected, the sidebar opens.
- **Details Tab**: Shows the file size, type, and an AI-generated summary of its architectural role.
- **Chat Tab**: Switch to the "Chat" tab to ask specific questions about the selected file or folder.

## 📂 Project Structure

```
MapMyRepo/
├── components/          # React components
│   ├── FileUploader.tsx # Landing page & upload logic
│   ├── RepoVisualizer.tsx # D3.js graph implementation
│   ├── Sidebar.tsx      # Details & Chat panel
│   └── ...
├── services/            # Business logic & API calls
│   ├── fileService.ts   # File parsing & GitHub fetching
│   └── geminiService.ts # AI integration logic
├── types/               # TypeScript definitions
├── App.tsx              # Main application layout
├── main.tsx             # Entry point
└── ...
```

## 🤝 Contributing

Contributions are welcome! If you'd like to improve MapMyRepo, please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 👤 Author

**Vasu Devs**
## 👤 Author

**Vasu-Devs**

- GitHub: [@vasu-devs](https://github.com/vasu-devs)
- Twitter: [@Vasu_Devs](https://x.com/Vasu_Devs)

---

*Made with ❤️ by Vasu-Devs*
