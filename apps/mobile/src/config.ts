const API_IP = process.env.EXPO_PUBLIC_API_IP || '10.0.2.2'; // 10.0.2.2 is the emulator bridge
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '8000';

export const API_BASE = `http://${API_IP}:${API_PORT}`;
