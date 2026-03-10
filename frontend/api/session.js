import { apiRequest } from "./client.js";

export const getSession = () => apiRequest("/session");


export const loginWithRfid = (uid) =>
  apiRequest("/rfid-login", {
    method: "POST",
    body: JSON.stringify({ uid }),
  });
