import { apiRequest } from "./client.js";

export const registerBrf = (associationName, email) =>
  apiRequest("/brf/register", {
    method: "POST",
    body: JSON.stringify({ association_name: associationName, email }),
  });

export const verifyBrfSetup = (payload) =>
  apiRequest("/brf/setup/verify", {
    method: "POST",
    body: JSON.stringify({ payload }),
  });
