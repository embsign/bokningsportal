import { apiRequest } from "./client.js";

export const getPublicConfig = () => apiRequest("/public-config");
