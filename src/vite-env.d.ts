/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_ENDPOINT: string
	readonly VITE_DEV_API_ENDPOINT: string
	readonly VITE_FAUCET_API_URL: string
	readonly VITE_API_KEY: string
	readonly GEMINI_API_KEY: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}