// Sesion del vendedor: el JWT que devuelve POST /auth/login se guarda en localStorage
// (alcanza para el TPO, ver Clase 9) y viaja en cada request como "Authorization: Bearer <token>".
const TOKEN_KEY = "token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasSession(): boolean {
  return getToken() !== null;
}

// Quien quiera enterarse de que la API respondio 401 con un token enviado (vencido o invalido) se suscribe aca:
// el AuthContext deja de mostrar al vendedor y el router manda al login. El cliente ya limpio el token antes de avisar.
type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

// Devuelve la funcion para darse de baja (el cleanup de un useEffect).
export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export function notifyUnauthorized(): void {
  unauthorizedListeners.forEach((listener) => listener());
}
