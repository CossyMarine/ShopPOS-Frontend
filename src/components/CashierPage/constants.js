export const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
export const REGISTER_ID = 'reg-1'; // one cashier login = one physical register; make this configurable if a branch runs multiple
