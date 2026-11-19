// La URL base sale de una variable de entorno (ver .env.example), igual que en la Clase 14.
// Es el UNICO lugar donde aparece: ningun componente arma URLs.
export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
