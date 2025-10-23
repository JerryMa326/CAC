/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROPUBLICA_API_KEY: string;
  readonly VITE_CONGRESS_GOV_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
