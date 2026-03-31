import { apiRequest } from "./client.js";

export const getBookableUsers = async () => {
  const { users } = await apiRequest("/users");
  return Array.isArray(users) ? users : [];
};
