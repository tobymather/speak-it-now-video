/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HEYGEN_API_KEY: string
  readonly VITE_WORKER_URL: string
  readonly VITE_POSTHOG_KEY: string
  readonly VITE_POSTHOG_HOST: string
  readonly VITE_APP_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
