/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string;
    readonly VITE_GITHUB_TOKEN?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// Support for process.env replacement in Vite
declare const process: {
    env: {
        [key: string]: string | undefined;
    };
};
