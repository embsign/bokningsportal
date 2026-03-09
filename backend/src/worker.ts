import { initDb } from "./worker/db/init.js";
import { router } from "./worker/router.js";
import { Env } from "./worker/types.js";

export default {
  fetch: async (request: Request, env: Env) => {
    await initDb(env.DB);
    return router(request, env);
  },
};
