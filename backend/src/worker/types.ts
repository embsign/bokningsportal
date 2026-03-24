export type D1Database = {
  prepare: (sql: string) => {
    bind: (...args: unknown[]) => {
      first: () => Promise<any>;
      all: () => Promise<{ results: any[] }>;
      run: () => Promise<any>;
    };
  };
  exec: (sql: string) => Promise<any>;
};

export interface Env {
  DB: D1Database;
  FORCE_NOW_UTC?: string;
  DEBUG_AVAILABILITY_DELAY_MS?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  FRONTEND_BASE_URL?: string;
}
