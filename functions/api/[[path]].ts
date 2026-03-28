import worker from "../../backend/src/worker.js";

export const onRequest = async (context: any) => {
  return worker.fetch(context.request, context.env);
};
