/// <reference types="vite/client" />

// Tipa las variables de entorno que usa el front (las que empiezan con VITE_).
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
