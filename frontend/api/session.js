import { apiRequest } from "./client.js";

export const getSession = () => apiRequest("/session");

export const loginWithAccessToken = (accessToken) =>
  apiRequest("/access-token-login", {
    method: "POST",
    body: JSON.stringify({ access_token: accessToken }),
  });

export const loginWithRfid = (uid) =>
  apiRequest("/rfid-login", {
    method: "POST",
    body: JSON.stringify({ uid }),
  });
