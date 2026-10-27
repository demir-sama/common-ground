import { handleSearch } from '../src/server/handlers.js';
export const config = { maxDuration: 60 };
export default function handler(req, res) { return handleSearch(req, res); }
