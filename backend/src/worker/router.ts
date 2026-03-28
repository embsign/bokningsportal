import { Env, D1Database } from "./types.js";
import { deleteUserBookings, userHasBookings } from "./utils/users.js";
import { cancelFutureBookings, hasFutureBookings } from "./utils/bookingObjects.js";
import { createAccessGroup, listAccessGroups } from "./utils/accessGroups.js";

const json = (data: unknown, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers || undefined);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "no-store");
  }
  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
};

const errorResponse = (status: number, detail: string) => json({ detail }, { status });

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const parseDate = (value: string) => {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day));
};

const escapeIcsText = (value: string) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const toIcsUtcDateTime = (isoValue: string) => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
};

const toIcsStampNow = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

const buildBookingIcs = (booking: {
  id: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  apartmentId: string;
}) => {
  const dtStart = toIcsUtcDateTime(booking.startTime);
  const dtEnd = toIcsUtcDateTime(booking.endTime);
  if (!dtStart || !dtEnd) {
    return null;
  }
  const uid = `${booking.id}@brf-bokningsportal`;
  const summary = `Bokning: ${booking.serviceName}`;
  const description = `Lägenhet ${booking.apartmentId}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BRF Bokningsportal//SE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsStampNow()}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
};

const isValidClockTime = (value: string | null | undefined) => Boolean(value && /^\d{2}:\d{2}$/.test(value));

const normalizeClockTime = (value: string | null | undefined, fallback = "12:00") =>
  isValidClockTime(value) ? (value as string) : fallback;

const getMinutesFromClockTime = (value: string) => {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return hours * 60 + minutes;
};

const getUtcNowFromEnv = (env: Env) => {
  const forced = env.FORCE_NOW_UTC;
  if (!forced) {
    return new Date();
  }
  const parsed = new Date(forced);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const getWindowBoundaries = (bookingObject: any, nowUtc: Date) => {
  const minDate = new Date(nowUtc);
  minDate.setUTCDate(minDate.getUTCDate() + (bookingObject.window_min_days as number));
  const maxDate = new Date(nowUtc);
  maxDate.setUTCDate(maxDate.getUTCDate() + (bookingObject.window_max_days as number));
  return {
    minMs: minDate.getTime(),
    maxMs: maxDate.getTime(),
  };
};

const getNextAvailableStart = (bookingObject: any, nowUtc: Date) => {
  const windowMinDays = Number(bookingObject.window_min_days || 0);
  const candidateDate = new Date(
    Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate(), 0, 0, 0)
  );
  candidateDate.setUTCDate(candidateDate.getUTCDate() + windowMinDays);

  if (bookingObject.booking_type === "full-day") {
    return buildFullDayRange(candidateDate, bookingObject).start;
  }

  const parsedSlotMinutes = Number(bookingObject.slot_duration_minutes);
  const slotMinutes = Number.isFinite(parsedSlotMinutes) && parsedSlotMinutes > 0 ? parsedSlotMinutes : 60;
  const slotWindow = getTimeSlotWindowConfig(bookingObject);
  for (
    let minuteOffset = slotWindow.startMinutes;
    minuteOffset + slotMinutes <= slotWindow.endMinutes;
    minuteOffset += slotMinutes
  ) {
    const start = new Date(
      Date.UTC(
        candidateDate.getUTCFullYear(),
        candidateDate.getUTCMonth(),
        candidateDate.getUTCDate(),
        0,
        0,
        0
      )
    );
    start.setUTCMinutes(minuteOffset);
    if (start.getTime() >= nowUtc.getTime()) {
      return start;
    }
  }

  const nextDay = new Date(candidateDate);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const nextDayStart = new Date(
    Date.UTC(nextDay.getUTCFullYear(), nextDay.getUTCMonth(), nextDay.getUTCDate(), 0, 0, 0)
  );
  nextDayStart.setUTCMinutes(slotWindow.startMinutes);
  return nextDayStart;
};

const maybeDelayAvailability = async (env: Env) => {
  const raw = env.DEBUG_AVAILABILITY_DELAY_MS;
  const delayMs = Number(raw);
  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 8000)));
};

const getFullDayTimeConfig = (bookingObject: any) => {
  const startTime = normalizeClockTime(bookingObject?.full_day_start_time);
  const endTime = normalizeClockTime(bookingObject?.full_day_end_time);
  return {
    startTime,
    endTime,
    startMinutes: getMinutesFromClockTime(startTime),
    endMinutes: getMinutesFromClockTime(endTime),
  };
};

const getTimeSlotWindowConfig = (bookingObject: any) => {
  const startTime = normalizeClockTime(bookingObject?.time_slot_start_time, "08:00");
  const endTime = normalizeClockTime(bookingObject?.time_slot_end_time, "20:00");
  return {
    startTime,
    endTime,
    startMinutes: getMinutesFromClockTime(startTime),
    endMinutes: getMinutesFromClockTime(endTime),
  };
};

const buildFullDayRange = (date: Date, bookingObject: any) => {
  const config = getFullDayTimeConfig(bookingObject);
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
  start.setUTCMinutes(config.startMinutes);
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
  end.setUTCMinutes(config.endMinutes);
  if (config.endMinutes <= config.startMinutes) {
    end.setUTCDate(end.getUTCDate() + 1);
  }
  return { start, end, ...config };
};

const getJsonBody = async (request: Request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const parseBearerToken = (value: string | null) => {
  if (!value) return null;
  const [type, token] = value.split(" ");
  if (!type || !token) return null;
  if (type.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
};

const base64UrlEncode = (input: string) => {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const base64UrlDecode = (input: string) => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const sha1Hex = async (value: string) => {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const getAppConfig = async (db: D1Database, key: string) =>
  (await db.prepare("SELECT value FROM app_config WHERE key = ?").bind(key).first()) as any;

const verifyTurnstileToken = async (request: Request, env: Env, token: string) => {
  const secret = env.TURNSTILE_SECRET?.trim();
  if (!secret) {
    return { ok: false, error: "missing_turnstile_secret" as const };
  }
  try {
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      undefined;
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    if (ip) {
      form.set("remoteip", ip);
    }
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (!response.ok) {
      return { ok: false, error: "turnstile_unavailable" as const };
    }
    const payload = (await response.json()) as {
      success?: boolean;
      "error-codes"?: string[];
      action?: string;
    };
    if (!payload?.success) {
      return { ok: false, error: "turnstile_invalid" as const, codes: payload?.["error-codes"] || [] };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "turnstile_unavailable" as const };
  }
};

const sendResendEmail = async (env: Env, to: string, subject: string, html: string) => {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
    const missing: string[] = [];
    if (!env.RESEND_API_KEY) missing.push("RESEND_API_KEY");
    if (!env.MAIL_FROM) missing.push("MAIL_FROM");
    return { ok: false, error: "missing_email_config", missing };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [to],
      subject,
      html,
    }),
  });
  if (!response.ok) {
    return { ok: false, error: "resend_failed" };
  }
  return { ok: true };
};

const getAuthContext = async (db: D1Database, token: string) =>
  (await db
    .prepare(
      `SELECT
         at.token AS access_token,
         at.tenant_id AS tenant_id,
         t.name AS tenant_name,
         t.is_setup_complete AS tenant_is_setup_complete,
         u.id AS user_id,
         u.apartment_id AS user_apartment_id,
         u.house AS user_house,
         u.is_admin AS user_is_admin,
         u.is_active AS user_is_active
       FROM access_tokens at
       JOIN tenants t ON t.id = at.tenant_id
       JOIN users u ON u.id = at.user_id
       WHERE at.token = ?`
    )
    .bind(token)
    .first()) as any;

const getUser = async (db: D1Database, userId: string) =>
  (await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first()) as any;

const requireAuth = async (request: Request, env: Env) => {
  const token = parseBearerToken(request.headers.get("authorization"));
  if (!token) {
    return { error: errorResponse(401, "unauthorized") };
  }
  const context = await getAuthContext(env.DB, token);
  if (context) {
    const tenant = {
      id: context.tenant_id,
      name: context.tenant_name,
      is_setup_complete: context.tenant_is_setup_complete,
    };
    const user = {
      id: context.user_id,
      apartment_id: context.user_apartment_id,
      is_admin: context.user_is_admin,
      tenant_id: tenant.id,
      house: context.user_house,
      is_active: context.user_is_active,
    };
    if (!user.is_active) {
      return { error: errorResponse(401, "unauthorized") };
    }
    return { user, tenant };
  }

  const tenant = await env.DB.prepare("SELECT * FROM tenants WHERE account_owner_token = ?")
    .bind(token)
    .first();
  if (!tenant) {
    return { error: errorResponse(401, "unauthorized") };
  }
  return {
    tenant: { id: tenant.id as string, name: tenant.name as string, is_setup_complete: tenant.is_setup_complete },
    user: {
      id: "account-owner",
      apartment_id: "admin",
      is_admin: 1,
      tenant_id: tenant.id as string,
      house: null,
      is_active: 1,
    },
  };
};

const handleBrfRegister = async (request: Request, env: Env) => {
  const body = await getJsonBody(request);
  const associationName = body?.association_name?.trim();
  const email = body?.email?.trim();
  const turnstileToken = body?.turnstile_token?.trim();
  const frontendBaseUrl = body?.frontend_base_url?.trim();
  if (!associationName || !email || !turnstileToken) {
    return errorResponse(400, "invalid_payload");
  }
  const turnstile = await verifyTurnstileToken(request, env, turnstileToken);
  if (!turnstile.ok) {
    const details =
      turnstile.error === "turnstile_invalid" && "codes" in turnstile && turnstile.codes?.length
        ? `turnstile_invalid:${turnstile.codes.join(",")}`
        : turnstile.error;
    if (turnstile.error === "turnstile_invalid") {
      return errorResponse(400, details);
    }
    if (turnstile.error === "missing_turnstile_secret") {
      return errorResponse(500, details);
    }
    return errorResponse(502, details);
  }

  const saltRow = await getAppConfig(env.DB, "setup_link_salt");
  if (!saltRow?.value) {
    return errorResponse(500, "missing_setup_salt");
  }

  const uuid = crypto.randomUUID();
  const hash = await sha1Hex(`${associationName}|${email}|${uuid}|${saltRow.value}`);
  const payload = base64UrlEncode(
    JSON.stringify({
      association_name: associationName,
      email,
      uuid,
      sha1: hash,
    })
  );
  const requestUrl = new URL(request.url);
  const baseUrlCandidate = frontendBaseUrl || env.FRONTEND_BASE_URL || requestUrl.origin;
  let setupBaseUrl: string;
  try {
    const parsed = new URL(baseUrlCandidate);
    setupBaseUrl = parsed.origin;
  } catch {
    setupBaseUrl = requestUrl.origin;
  }
  const setupUrl = `${setupBaseUrl.replace(/\/$/, "")}/setup/${payload}`;

  const mailResult = await sendResendEmail(
    env,
    email,
    "Slutför er bokningssida",
    `<p>Hej!</p><p>Klicka på länken för att slutföra setup:</p><p><a href="${setupUrl}">${setupUrl}</a></p>`
  );
  if (!mailResult.ok) {
    const detail =
      mailResult.error === "missing_email_config" && (mailResult as any).missing
        ? `missing_email_config:${(mailResult as any).missing.join(",")}`
        : mailResult.error || "resend_failed";
    return errorResponse(502, detail);
  }

  return json({ setup_url: setupUrl });
};

const handleBrfSetupVerify = async (request: Request, env: Env) => {
  const body = await getJsonBody(request);
  const payload = body?.payload;
  if (!payload) {
    return errorResponse(400, "invalid_payload");
  }

  let decoded;
  try {
    decoded = JSON.parse(base64UrlDecode(payload));
  } catch {
    return errorResponse(400, "invalid_payload");
  }

  const associationName = decoded?.association_name;
  const email = decoded?.email;
  const uuid = decoded?.uuid;
  const sha1 = decoded?.sha1;
  if (!associationName || !email || !uuid || !sha1) {
    return errorResponse(400, "invalid_payload");
  }

  const saltRow = await getAppConfig(env.DB, "setup_link_salt");
  if (!saltRow?.value) {
    return errorResponse(500, "missing_setup_salt");
  }

  const expected = await sha1Hex(`${associationName}|${email}|${uuid}|${saltRow.value}`);
  if (expected !== sha1) {
    return errorResponse(401, "invalid_signature");
  }

  const existingTenant = await env.DB
    .prepare("SELECT id, is_setup_complete, account_owner_token FROM tenants WHERE account_owner_token = ?")
    .bind(uuid)
    .first();

  if (!existingTenant) {
    const tenantId = uuid;
    await env.DB.prepare(
      `INSERT INTO tenants (id, name, is_active, account_owner_token, admin_email, is_setup_complete)
       VALUES (?, ?, 1, ?, ?, 0)`
    ).bind(tenantId, associationName, uuid, email).run();
  }

  const tenant = existingTenant
    ? existingTenant
    : await env.DB
        .prepare("SELECT id, is_setup_complete, account_owner_token FROM tenants WHERE account_owner_token = ?")
        .bind(uuid)
        .first();

  return json({
    association_name: associationName,
    email,
    uuid,
    account_owner_token: uuid,
    is_setup_complete: (tenant as any)?.is_setup_complete === 1,
  });
};

const handleBrfSetupComplete = async (request: Request, env: Env) => {
  const body = await getJsonBody(request);
  const accountOwnerToken = body?.account_owner_token;
  const email = body?.email;
  if (!accountOwnerToken || !email) {
    return errorResponse(400, "invalid_payload");
  }

  await env.DB.prepare("UPDATE tenants SET is_setup_complete = 1 WHERE account_owner_token = ?")
    .bind(accountOwnerToken)
    .run();

  const requestUrl = new URL(request.url);
  const bodyBaseUrl = body?.frontend_base_url?.trim();
  const baseUrlCandidate = bodyBaseUrl || env.FRONTEND_BASE_URL || requestUrl.origin;
  let adminBaseUrl: string;
  try {
    const parsed = new URL(baseUrlCandidate);
    adminBaseUrl = parsed.origin;
  } catch {
    adminBaseUrl = requestUrl.origin;
  }
  const adminUrl = `${adminBaseUrl.replace(/\/$/, "")}/admin/${accountOwnerToken}`;
  void sendResendEmail(
    env,
    email,
    "Admin‑länk till er bokningsportal",
    `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Admin‑länk till er bokningsportal</h2>
        <p>Här är din admin‑länk:</p>
        <p><a href="${adminUrl}">${adminUrl}</a></p>
        <p><strong>Viktigt:</strong> Länken ger full access till bokningssystemet. Spara den säkert.</p>
      </div>
    `
  );

  return json({ ok: true, admin_url: adminUrl });
};

const requireAdmin = async (request: Request, env: Env) => {
  const auth = await requireAuth(request, env);
  if ("error" in auth) {
    return auth;
  }
  if (auth.user.is_admin !== 1) {
    return { error: errorResponse(403, "forbidden") };
  }
  return auth;
};

const listUserGroups = async (db: D1Database, userId: string) => {
  const rows = await db
    .prepare(
      `SELECT ag.name
       FROM user_access_groups uag
       JOIN access_groups ag ON uag.group_id = ag.id
       WHERE uag.user_id = ?`
    )
    .bind(userId)
    .all();
  return rows.results.map((row: any) => row.name as string);
};

const permissionMatchesUser = (user: any, userGroups: Set<string>, scope: string, value: string) => {
  if (scope === "house") return user.house === value;
  if (scope === "apartment") return user.apartment_id === value;
  if (scope === "group") return userGroups.has(value);
  return false;
};

const canUserAccessWithPermissions = (permissions: any[], user: any, userGroups: string[]) => {
  if (!permissions.length) {
    return true;
  }
  const groupsSet = new Set(userGroups);
  const deny = permissions.filter((p: any) => p.mode === "deny");
  if (deny.some((p: any) => permissionMatchesUser(user, groupsSet, p.scope as string, p.value as string))) {
    return false;
  }
  const allow = permissions.filter((p: any) => p.mode === "allow");
  if (!allow.length) {
    return true;
  }
  return allow.some((p: any) => permissionMatchesUser(user, groupsSet, p.scope as string, p.value as string));
};

const canUserAccessBookingObject = async (db: D1Database, user: any, bookingObjectId: string, userGroups?: string[]) => {
  const permissions = await db
    .prepare("SELECT mode, scope, value FROM booking_object_permissions WHERE booking_object_id = ?")
    .bind(bookingObjectId)
    .all();
  const groups = userGroups || (await listUserGroups(db, user.id));
  return canUserAccessWithPermissions(permissions.results, user, groups);
};

type MaxBookingScope = "object" | "group" | null;

const getEffectiveMaxBookingsConfig = async (
  db: D1Database,
  bookingObject: any
): Promise<{ limit: number | null; scope: MaxBookingScope }> => {
  const overrideLimit = Number(bookingObject?.max_bookings_override);
  if (Number.isFinite(overrideLimit) && overrideLimit > 0) {
    return { limit: overrideLimit, scope: "object" as const };
  }
  if (!bookingObject?.group_id) {
    return { limit: null, scope: null };
  }
  const group = await db
    .prepare("SELECT max_bookings FROM booking_groups WHERE id = ? AND tenant_id = ?")
    .bind(bookingObject.group_id, bookingObject.tenant_id)
    .first();
  const groupLimit = Number(group?.max_bookings);
  if (Number.isFinite(groupLimit) && groupLimit > 0) {
    return { limit: groupLimit, scope: "group" as const };
  }
  return { limit: null, scope: null };
};

const buildMonthAvailability = async (db: D1Database, user: any, bookingObjectId: string, month: string, nowUtc: Date) => {
  const bookingObject = await db.prepare("SELECT * FROM booking_objects WHERE id = ?").bind(bookingObjectId).first();
  if (!bookingObject) return null;

  const [year, monthIndex] = month.split("-").map((part) => Number(part));
  const firstDate = new Date(Date.UTC(year, monthIndex - 1, 1));
  const lastDate = new Date(Date.UTC(year, monthIndex, 0));
  const rangeStart = buildFullDayRange(firstDate, bookingObject).start;
  const rangeEnd = buildFullDayRange(lastDate, bookingObject).end;

  const bookings = await db
    .prepare(
      `SELECT user_id, start_time, end_time
       FROM bookings
       WHERE booking_object_id = ?
         AND cancelled_at IS NULL
         AND NOT (end_time <= ? OR start_time >= ?)`
    )
    .bind(bookingObjectId, rangeStart.toISOString(), rangeEnd.toISOString())
    .all();
  const overlaps = bookings.results.map((row: any) => ({
    userId: row.user_id as string,
    startMs: new Date(row.start_time as string).getTime(),
    endMs: new Date(row.end_time as string).getTime(),
  }));

  const days: { date: string; status: string }[] = [];
  const nowMs = nowUtc.getTime();
  const { minMs, maxMs } = getWindowBoundaries(bookingObject, nowUtc);
  for (let day = 1; day <= new Date(year, monthIndex, 0).getDate(); day += 1) {
    const date = new Date(Date.UTC(year, monthIndex - 1, day));
    const dateString = formatDate(date);
    const candidate = buildFullDayRange(date, bookingObject);
    let status = "available";
    const startMs = candidate.start.getTime();
    const endMs = candidate.end.getTime();
    const outsideWindow = startMs < minMs || endMs > maxMs;
    if (endMs <= nowMs || outsideWindow) {
      status = "disabled";
    }
    const overlap = overlaps.find((booking) => booking.startMs < candidate.end.getTime() && booking.endMs > candidate.start.getTime());
    if (overlap) {
      status = overlap.userId === user.id ? "mine" : "booked";
    }
    days.push({ date: dateString, status });
  }
  return days;
};

const buildWeekAvailability = async (db: D1Database, user: any, bookingObjectId: string, weekStart: string, nowUtc: Date) => {
  const bookingObject = await db.prepare("SELECT * FROM booking_objects WHERE id = ?").bind(bookingObjectId).first();
  if (!bookingObject) return null;
  const startDate = parseDate(weekStart);
  const endDate = addDays(startDate, 7);
  const overlapsResult = await db
    .prepare(
      `SELECT user_id, start_time, end_time FROM bookings
       WHERE booking_object_id = ?
         AND cancelled_at IS NULL
         AND NOT (end_time <= ? OR start_time >= ?)`
    )
    .bind(bookingObjectId, startDate.toISOString(), endDate.toISOString())
    .all();
  const overlaps = overlapsResult.results.map((row: any) => ({
    userId: row.user_id as string,
    startMs: new Date(row.start_time as string).getTime(),
    endMs: new Date(row.end_time as string).getTime(),
  }));
  const parsedSlotMinutes = Number(bookingObject.slot_duration_minutes);
  const slotMinutes = Number.isFinite(parsedSlotMinutes) && parsedSlotMinutes > 0 ? parsedSlotMinutes : 60;
  const slotWindow = getTimeSlotWindowConfig(bookingObject);
  const nowMs = nowUtc.getTime();
  const { minMs, maxMs } = getWindowBoundaries(bookingObject, nowUtc);
  const days = [];
  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    const dateString = formatDate(date);
    const label = date.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "numeric" });
    const slots = [];
    for (
      let minuteOffset = slotWindow.startMinutes;
      minuteOffset + slotMinutes <= slotWindow.endMinutes;
      minuteOffset += slotMinutes
    ) {
      const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
      start.setUTCMinutes(minuteOffset);
      const end = new Date(start);
      end.setUTCMinutes(end.getUTCMinutes() + slotMinutes);
      const startMs = start.getTime();
      const endMs = end.getTime();
      let status: "available" | "booked" | "mine" | "disabled";
      const overlap = overlaps.find((booking) => booking.startMs < endMs && booking.endMs > startMs);
      if (overlap) {
        status = overlap.userId === user.id ? "mine" : "booked";
      } else {
        const outsideWindow = startMs < minMs || endMs > maxMs;
        status = outsideWindow ? "disabled" : "available";
      }
      // Passed slots should always be visually disabled, regardless of booking ownership.
      if (endMs <= nowMs) {
        status = "disabled";
      }
      const isWeekend = [0, 6].includes(start.getUTCDay());
      const price = isWeekend ? (bookingObject.price_weekend_cents as number) : (bookingObject.price_weekday_cents as number);
      slots.push({
        id: `${dateString}-${minuteOffset}`,
        label: `${start.toISOString().slice(11, 16)}-${end.toISOString().slice(11, 16)}`,
        status,
        price_cents: price,
      });
    }
    days.push({ label, date: dateString, slots });
  }
  return days;
};

const handleRfidLogin = async (request: Request, env: Env) => {
  const body = await getJsonBody(request);
  const uid = body?.uid;
  if (!uid) {
    return errorResponse(401, "invalid_rfid");
  }
  const tag = await env.DB.prepare("SELECT * FROM rfid_tags WHERE uid = ? AND is_active = 1").bind(uid).first();
  if (!tag) {
    return errorResponse(401, "invalid_rfid");
  }
  const user = await getUser(env.DB, tag.user_id as string);
  if (!user) {
    return errorResponse(401, "invalid_rfid");
  }

  const existingAccessToken = await env.DB.prepare(
    "SELECT token FROM access_tokens WHERE user_id = ? LIMIT 1"
  ).bind(user.id).first();
  const accessToken =
    (existingAccessToken?.token as string | undefined) || crypto.randomUUID();
  if (!existingAccessToken) {
    await env.DB.prepare(
      `INSERT INTO access_tokens (token, tenant_id, user_id, created_at, source)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'kiosk')`
    ).bind(accessToken, tag.tenant_id, user.id).run();
  } else {
    await env.DB.prepare("UPDATE access_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE token = ?")
      .bind(accessToken)
      .run();
  }

  return json(
    {
      booking_url: `/user/${accessToken}`,
      user: { id: user.id, apartment_id: user.apartment_id, is_admin: user.is_admin === 1 },
    }
  );
};

const handleKioskAccessToken = async (request: Request, env: Env) => {
  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth.error;
  await env.DB.prepare("DELETE FROM access_tokens WHERE user_id = ?").bind(auth.user.id).run();
  const accessToken = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO access_tokens (token, tenant_id, user_id, created_at, source)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'kiosk')`
  ).bind(accessToken, auth.tenant.id, auth.user.id).run();
  return json({ access_token: accessToken, login_url: `/user/${accessToken}` });
};

const handleDemoLinks = async (request: Request, env: Env) => {
  const requestUrl = new URL(request.url);
  const frontendBaseUrlCandidate = env.FRONTEND_BASE_URL || requestUrl.origin;
  let frontendOrigin = requestUrl.origin;
  try {
    frontendOrigin = new URL(frontendBaseUrlCandidate).origin;
  } catch {
    frontendOrigin = requestUrl.origin;
  }

  const demoTenant = (await env.DB.prepare(
    `SELECT id, account_owner_token
     FROM tenants
     WHERE id = 'demo-brf'
     LIMIT 1`
  ).bind().first()) as any;
  if (!demoTenant) {
    return errorResponse(404, "demo_not_found");
  }

  const tokenRows = await env.DB
    .prepare(
      `SELECT
         u.apartment_id,
         u.is_admin,
         at.token
       FROM users u
       JOIN access_tokens at ON at.user_id = u.id
       WHERE u.tenant_id = ?
         AND u.is_active = 1
       ORDER BY u.is_admin DESC, u.apartment_id ASC`
    )
    .bind(demoTenant.id)
    .all();

  const adminToken =
    (tokenRows.results.find((row: any) => Number(row.is_admin) === 1)?.token as string | undefined) ||
    (demoTenant.account_owner_token as string | undefined);
  const userTokens = tokenRows.results
    .filter((row: any) => Number(row.is_admin) !== 1)
    .slice(0, 2)
    .map((row: any) => row.token as string);

  const buildLink = (path: string) => `${frontendOrigin.replace(/\/$/, "")}${path}`;

  return json({
    links: {
      admin: adminToken
        ? {
            path: `/admin/${adminToken}`,
            url: buildLink(`/admin/${adminToken}`),
          }
        : null,
      users: userTokens.map((token) => ({
        path: `/user/${token}`,
        url: buildLink(`/user/${token}`),
      })),
    },
  });
};

const handleSession = async (request: Request, env: Env) => {
  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth.error;
  if (auth.tenant.is_setup_complete === 0) {
    return errorResponse(401, "setup_incomplete");
  }
  return json({
    tenant: { id: auth.tenant.id, name: auth.tenant.name },
    user: { id: auth.user.id, apartment_id: auth.user.apartment_id, is_admin: auth.user.is_admin === 1 },
  });
};

const handleServices = async (request: Request, env: Env) => {
  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth.error;
  const nowUtc = getUtcNowFromEnv(env);
  const bookingObjects = await env.DB
    .prepare("SELECT * FROM booking_objects WHERE tenant_id = ? AND is_active = 1")
    .bind(auth.tenant.id)
    .all();
  let filtered: any[] = bookingObjects.results;
  if (auth.user.is_admin !== 1) {
    const [userGroups, permissionRows] = await Promise.all([
      listUserGroups(env.DB, auth.user.id),
      env.DB
        .prepare(
          `SELECT bop.booking_object_id, bop.mode, bop.scope, bop.value
           FROM booking_object_permissions bop
           JOIN booking_objects bo ON bo.id = bop.booking_object_id
           WHERE bo.tenant_id = ?
             AND bo.is_active = 1`
        )
        .bind(auth.tenant.id)
        .all(),
    ]);
    const permissionsByObject = new Map<string, any[]>();
    for (const permission of permissionRows.results) {
      const objectId = permission.booking_object_id as string;
      if (!permissionsByObject.has(objectId)) {
        permissionsByObject.set(objectId, []);
      }
      permissionsByObject.get(objectId)!.push(permission);
    }
    filtered = bookingObjects.results.filter((obj: any) =>
      canUserAccessWithPermissions(permissionsByObject.get(obj.id as string) || [], auth.user, userGroups)
    );
  }
  const nowIso = new Date().toISOString();
  const services = await Promise.all(
    filtered.map(async (obj: any) => {
      const maxBookings = await getEffectiveMaxBookingsConfig(env.DB, obj);
      let maxBookingsReached = false;
      if (maxBookings.limit !== null) {
        const activeCount =
          maxBookings.scope === "group" && obj.group_id
            ? await env.DB
                .prepare(
                  `SELECT COUNT(1) as count
                   FROM bookings b
                   JOIN booking_objects bo ON bo.id = b.booking_object_id
                   WHERE b.user_id = ?
                     AND bo.group_id = ?
                     AND bo.tenant_id = ?
                     AND b.cancelled_at IS NULL
                     AND b.end_time >= ?`
                )
                .bind(auth.user.id, obj.group_id, auth.tenant.id, nowIso)
                .first()
            : await env.DB
                .prepare(
                  `SELECT COUNT(1) as count
                   FROM bookings
                   WHERE user_id = ?
                     AND booking_object_id = ?
                     AND cancelled_at IS NULL
                     AND end_time >= ?`
                )
                .bind(auth.user.id, obj.id, nowIso)
                .first();
        maxBookingsReached = Number(activeCount?.count || 0) >= maxBookings.limit;
      }
      return {
      id: obj.id,
      name: obj.name,
      description: obj.description || "",
      booking_type: obj.booking_type,
      slot_duration_minutes: obj.slot_duration_minutes,
      full_day_start_time: normalizeClockTime(obj.full_day_start_time),
      full_day_end_time: normalizeClockTime(obj.full_day_end_time),
      time_slot_start_time: normalizeClockTime(obj.time_slot_start_time, "08:00"),
      time_slot_end_time: normalizeClockTime(obj.time_slot_end_time, "20:00"),
      window_min_days: obj.window_min_days,
      window_max_days: obj.window_max_days,
      next_available: formatDate(getNextAvailableStart(obj, nowUtc)),
      price_weekday_cents: obj.price_weekday_cents,
      price_weekend_cents: obj.price_weekend_cents,
      group_id: obj.group_id || null,
      max_bookings_limit: maxBookings.limit,
      max_bookings_scope: maxBookings.scope,
      max_bookings_reached: maxBookingsReached,
      };
    })
  );
  return json({ services });
};

const handleCurrentBookings = async (request: Request, env: Env) => {
  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth.error;
  const rows = await env.DB
    .prepare(
      `SELECT b.id, b.start_time, b.end_time, b.booking_object_id, bo.group_id AS booking_group_id, bo.name AS booking_object_name
       FROM bookings b
       JOIN booking_objects bo ON bo.id = b.booking_object_id
       WHERE b.user_id = ? AND b.cancelled_at IS NULL
         AND datetime(b.end_time) > datetime('now')
       ORDER BY b.start_time ASC`
    )
    .bind(auth.user.id)
    .all();
  const bookings = rows.results.map((row: any) => ({
    id: row.id,
    service_name: row.booking_object_name,
    booking_object_id: row.booking_object_id,
    booking_group_id: row.booking_group_id,
    date: (row.start_time as string).slice(0, 10),
    start_time: row.start_time,
    end_time: row.end_time,
    time_label: row.end_time ? `${row.start_time.slice(11, 16)}-${row.end_time.slice(11, 16)}` : "Heldag",
    status: "mine",
  }));
  return json({ bookings });
};

const handleCreateBooking = async (request: Request, env: Env) => {
  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth.error;
  const body = await getJsonBody(request);
  const bookingObjectId = body?.booking_object_id;
  const startTime = body?.start_time;
  const endTime = body?.end_time;
  if (!bookingObjectId || !startTime || !endTime) {
    return errorResponse(400, "invalid_payload");
  }
  const bookingObject = await env.DB.prepare("SELECT * FROM booking_objects WHERE id = ?").bind(bookingObjectId).first();
  if (!bookingObject) return errorResponse(404, "not_found");
  if (!(await canUserAccessBookingObject(env.DB, auth.user, bookingObjectId))) {
    return errorResponse(403, "forbidden");
  }
  const nowIso = new Date().toISOString();
  const maxBookingsConfig = await getEffectiveMaxBookingsConfig(env.DB, bookingObject);
  const maxBookingsLimit = maxBookingsConfig.limit;
  if (maxBookingsLimit !== null) {
    const activeBookings = maxBookingsConfig.scope === "group" && bookingObject.group_id
      ? await env.DB
          .prepare(
            `SELECT COUNT(1) as count
             FROM bookings b
             JOIN booking_objects bo ON bo.id = b.booking_object_id
             WHERE b.user_id = ?
               AND bo.group_id = ?
               AND bo.tenant_id = ?
               AND b.cancelled_at IS NULL
               AND b.end_time >= ?`
          )
          .bind(auth.user.id, bookingObject.group_id, bookingObject.tenant_id, nowIso)
          .first()
      : await env.DB
          .prepare(
            `SELECT COUNT(1) as count
             FROM bookings
             WHERE user_id = ?
               AND booking_object_id = ?
               AND cancelled_at IS NULL
               AND end_time >= ?`
          )
          .bind(auth.user.id, bookingObjectId, nowIso)
          .first();
    if ((activeBookings?.count as number) >= maxBookingsLimit) {
      return errorResponse(409, "max_bookings_reached");
    }
  }
  const overlap = await env.DB
    .prepare(
      `SELECT COUNT(1) as count
       FROM bookings
       WHERE booking_object_id = ?
         AND cancelled_at IS NULL
         AND NOT (end_time <= ? OR start_time >= ?)`
    )
    .bind(bookingObjectId, startTime, endTime)
    .first();
  if ((overlap?.count as number) > 0) {
    return errorResponse(409, "conflict");
  }
  const start = new Date(startTime);
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + (bookingObject.window_min_days as number));
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + (bookingObject.window_max_days as number));
  if (start < minDate || start > maxDate) {
    return errorResponse(409, "outside_booking_window");
  }
  const isWeekend = [0, 6].includes(start.getUTCDay());
  const priceCents = isWeekend ? (bookingObject.price_weekend_cents as number) : (bookingObject.price_weekday_cents as number);
  const bookingId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO bookings (id, tenant_id, user_id, booking_object_id, start_time, end_time, price_cents, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(bookingId, bookingObject.tenant_id, auth.user.id, bookingObjectId, startTime, endTime, priceCents).run();
  return json({ booking_id: bookingId });
};

const handleCancelBooking = async (request: Request, env: Env, bookingId: string) => {
  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth.error;
  const booking = await env.DB.prepare("SELECT * FROM bookings WHERE id = ?").bind(bookingId).first();
  if (!booking) return errorResponse(404, "not_found");
  if (auth.user.is_admin !== 1 && booking.user_id !== auth.user.id) {
    return errorResponse(403, "forbidden");
  }
  await env.DB.prepare("UPDATE bookings SET cancelled_at = CURRENT_TIMESTAMP WHERE id = ?").bind(bookingId).run();
  return new Response(null, { status: 204 });
};

const handleCalendarDownload = async (request: Request, env: Env, url: URL) => {
  const bookingId = url.searchParams.get("booking_id");
  if (!bookingId) {
    return errorResponse(400, "invalid_payload");
  }
  const booking = (await env.DB
    .prepare(
      `SELECT
         b.id,
         b.start_time,
         b.end_time,
         b.cancelled_at,
         bo.name AS booking_object_name,
         u.apartment_id AS booked_user_apartment_id
       FROM bookings b
       JOIN booking_objects bo ON bo.id = b.booking_object_id
       JOIN users u ON u.id = b.user_id
       WHERE b.id = ?`
    )
    .bind(bookingId)
    .first()) as any;
  if (!booking || booking.cancelled_at) {
    return errorResponse(404, "not_found");
  }
  const ics = buildBookingIcs({
    id: booking.id as string,
    startTime: booking.start_time as string,
    endTime: booking.end_time as string,
    serviceName: booking.booking_object_name as string,
    apartmentId: booking.booked_user_apartment_id as string,
  });
  if (!ics) {
    return errorResponse(500, "calendar_generation_failed");
  }
  const fileName = `bokning-${booking.id}.ics`;
  return new Response(ics, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "no-store",
    },
  });
};

const handleAvailabilityMonth = async (request: Request, env: Env, url: URL) => {
  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth.error;
  const bookingObjectId = url.searchParams.get("booking_object_id");
  const month = url.searchParams.get("month");
  if (!bookingObjectId || !month) return errorResponse(400, "invalid_payload");
  await maybeDelayAvailability(env);
  const nowUtc = getUtcNowFromEnv(env);
  const days = await buildMonthAvailability(env.DB, auth.user, bookingObjectId, month, nowUtc);
  if (!days) return errorResponse(404, "not_found");
  return json({ days });
};

const handleAvailabilityWeek = async (request: Request, env: Env, url: URL) => {
  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth.error;
  const bookingObjectId = url.searchParams.get("booking_object_id");
  const weekStart = url.searchParams.get("week_start");
  if (!bookingObjectId || !weekStart) return errorResponse(400, "invalid_payload");
  await maybeDelayAvailability(env);
  const nowUtc = getUtcNowFromEnv(env);
  const days = await buildWeekAvailability(env.DB, auth.user, bookingObjectId, weekStart, nowUtc);
  if (!days) return errorResponse(404, "not_found");
  return json({ days });
};

const handleAdminUsers = async (request: Request, env: Env) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  const users = await env.DB
    .prepare(
      `SELECT
         u.id,
         u.apartment_id,
         u.house,
         u.is_admin,
         u.is_active,
         GROUP_CONCAT(DISTINCT ag.name) AS group_names,
         GROUP_CONCAT(DISTINCT CASE WHEN rt.is_active = 1 THEN rt.uid END) AS rfid_tags
       FROM users u
       LEFT JOIN user_access_groups uag ON uag.user_id = u.id
       LEFT JOIN access_groups ag ON ag.id = uag.group_id
       LEFT JOIN rfid_tags rt ON rt.user_id = u.id
       WHERE u.tenant_id = ?
       GROUP BY u.id, u.apartment_id, u.house, u.is_admin, u.is_active
       ORDER BY u.apartment_id ASC`
    )
    .bind(auth.tenant.id)
    .all();
  const result = users.results.map((user: any) => ({
    id: user.id,
    identity: user.apartment_id,
    apartment_id: user.apartment_id,
    house: user.house || "",
    groups: user.group_names
      ? String(user.group_names)
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
      : [],
    rfid_tags: user.rfid_tags
      ? String(user.rfid_tags)
          .split(",")
          .map((uid) => uid.trim())
          .filter(Boolean)
      : [],
    rfid: user.rfid_tags ? String(user.rfid_tags).split(",").map((uid) => uid.trim()).filter(Boolean)[0] || "" : "",
    is_admin: user.is_admin === 1,
    is_active: user.is_active === 1,
  }));
  return json({ users: result });
};

const handleAdminUpdateUser = async (request: Request, env: Env, userId: string) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  const body = await getJsonBody(request);
  if (!body) return errorResponse(400, "invalid_payload");
  await env.DB.prepare(
    `UPDATE users SET apartment_id = ?, house = ?, is_admin = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(body.apartment_id, body.house, body.is_admin ? 1 : 0, body.is_active ? 1 : 0, userId).run();

  await env.DB.prepare("DELETE FROM user_access_groups WHERE user_id = ?").bind(userId).run();
  for (const name of body.groups || []) {
    let group = await env.DB.prepare("SELECT id FROM access_groups WHERE tenant_id = ? AND name = ?")
      .bind(auth.tenant.id, name)
      .first();
    if (!group) {
      const groupId = `group-${crypto.randomUUID()}`;
      await env.DB.prepare("INSERT INTO access_groups (id, tenant_id, name) VALUES (?, ?, ?)")
        .bind(groupId, auth.tenant.id, name)
        .run();
      group = { id: groupId };
    }
    await env.DB.prepare("INSERT INTO user_access_groups (user_id, group_id) VALUES (?, ?)")
      .bind(userId, group.id)
      .run();
  }

  await env.DB.prepare("UPDATE rfid_tags SET is_active = 0 WHERE user_id = ?").bind(userId).run();
  const rfidTags: string[] = Array.isArray(body.rfid_tags)
    ? body.rfid_tags.map((uid: unknown) => String(uid || "").trim()).filter(Boolean)
    : body.rfid
      ? [String(body.rfid).trim()]
      : [];
  for (const uid of rfidTags) {
    await env.DB.prepare(
      `INSERT INTO rfid_tags (uid, tenant_id, user_id, is_active)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(uid) DO UPDATE SET tenant_id = excluded.tenant_id, user_id = excluded.user_id, is_active = 1`
    ).bind(uid, auth.tenant.id, userId).run();
  }
  return json({ id: userId });
};

const handleAdminAccessGroups = async (request: Request, env: Env) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  if (request.method === "GET") {
    const groups = await listAccessGroups(env.DB, auth.tenant.id);
    return json({ groups });
  }
  const body = await getJsonBody(request);
  if (!body?.name) return errorResponse(400, "invalid_payload");
  const group = await createAccessGroup(env.DB, auth.tenant.id, body.name);
  return json({ group });
};

const handleAdminCreateUser = async (request: Request, env: Env) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  const body = await getJsonBody(request);
  if (!body?.apartment_id) return errorResponse(400, "invalid_payload");

  const userId = `user-${crypto.randomUUID()}`;
  await env.DB.prepare(
    `INSERT INTO users (id, tenant_id, apartment_id, house, is_active, is_admin)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    userId,
    auth.tenant.id,
    body.apartment_id,
    body.house || null,
    body.is_active === false ? 0 : 1,
    body.is_admin ? 1 : 0
  ).run();

  await env.DB.prepare("DELETE FROM user_access_groups WHERE user_id = ?").bind(userId).run();
  for (const name of body.groups || []) {
    let group = await env.DB.prepare("SELECT id FROM access_groups WHERE tenant_id = ? AND name = ?")
      .bind(auth.tenant.id, name)
      .first();
    if (!group) {
      const groupId = `group-${crypto.randomUUID()}`;
      await env.DB.prepare("INSERT INTO access_groups (id, tenant_id, name) VALUES (?, ?, ?)")
        .bind(groupId, auth.tenant.id, name)
        .run();
      group = { id: groupId };
    }
    await env.DB.prepare("INSERT INTO user_access_groups (user_id, group_id) VALUES (?, ?)")
      .bind(userId, group.id)
      .run();
  }

  const rfidTags: string[] = Array.isArray(body.rfid_tags)
    ? body.rfid_tags.map((uid: unknown) => String(uid || "").trim()).filter(Boolean)
    : body.rfid
      ? [String(body.rfid).trim()]
      : [];
  for (const uid of rfidTags) {
    await env.DB.prepare(
      `INSERT INTO rfid_tags (uid, tenant_id, user_id, is_active)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(uid) DO UPDATE SET tenant_id = excluded.tenant_id, user_id = excluded.user_id, is_active = 1`
    ).bind(uid, auth.tenant.id, userId).run();
  }

  return json({ id: userId });
};

const handleAdminDeleteUser = async (request: Request, env: Env, userId: string, url: URL) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  const deleteBookings = url.searchParams.get("delete_bookings") === "true";
  const hasBookings = await userHasBookings(env.DB, userId);
  if (hasBookings && !deleteBookings) {
    return errorResponse(409, "user_has_bookings");
  }
  if (hasBookings && deleteBookings) {
    await deleteUserBookings(env.DB, userId);
  }
  await env.DB.prepare("DELETE FROM user_access_groups WHERE user_id = ?").bind(userId).run();
  await env.DB.prepare("DELETE FROM rfid_tags WHERE user_id = ?").bind(userId).run();
  await env.DB.prepare("DELETE FROM users WHERE id = ? AND tenant_id = ?")
    .bind(userId, auth.tenant.id)
    .run();
  return json({ id: userId, deleted: true });
};

const handleAdminBookingObjects = async (request: Request, env: Env) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  const rows = await env.DB
    .prepare(
      `SELECT
         bo.*,
         bop.mode AS permission_mode,
         bop.scope AS permission_scope,
         bop.value AS permission_value
       FROM booking_objects bo
       LEFT JOIN booking_object_permissions bop ON bop.booking_object_id = bo.id
       WHERE bo.tenant_id = ?
       ORDER BY bo.name ASC`
    )
    .bind(auth.tenant.id)
    .all();
  const objectsById = new Map<string, any>();
  for (const row of rows.results as any[]) {
    if (!objectsById.has(row.id)) {
      const { permission_mode: _mode, permission_scope: _scope, permission_value: _value, ...bookingObject } = row;
      objectsById.set(row.id, {
        ...bookingObject,
        allowHouses: [],
        allowGroups: [],
        allowApartments: [],
        denyHouses: [],
        denyGroups: [],
        denyApartments: [],
      });
    }
    if (!row.permission_mode || !row.permission_scope) {
      continue;
    }
    const target = objectsById.get(row.id)!;
    const mode = row.permission_mode as string;
    const scope = row.permission_scope as string;
    const value = row.permission_value as string;
    if (mode === "allow" && scope === "house") target.allowHouses.push(value);
    if (mode === "allow" && scope === "group") target.allowGroups.push(value);
    if (mode === "allow" && scope === "apartment") target.allowApartments.push(value);
    if (mode === "deny" && scope === "house") target.denyHouses.push(value);
    if (mode === "deny" && scope === "group") target.denyGroups.push(value);
    if (mode === "deny" && scope === "apartment") target.denyApartments.push(value);
  }
  const objects = Array.from(objectsById.values());
  return json({ booking_objects: objects });
};

const handleAdminDeactivateBookingObject = async (request: Request, env: Env, bookingObjectId: string, url: URL) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  const confirm = url.searchParams.get("confirm") === "true";
  const nowIso = new Date().toISOString();
  const hasFuture = await hasFutureBookings(env.DB, bookingObjectId, nowIso);
  if (hasFuture && !confirm) {
    return errorResponse(409, "booking_object_has_future_bookings");
  }
  if (hasFuture) {
    await cancelFutureBookings(env.DB, bookingObjectId, nowIso);
  }
  await env.DB.prepare(
    "UPDATE booking_objects SET is_active = 0 WHERE id = ? AND tenant_id = ?"
  ).bind(bookingObjectId, auth.tenant.id).run();
  return json({ id: bookingObjectId, deactivated: true, cancelled_future: hasFuture });
};

const handleAdminCreateBookingObject = async (request: Request, env: Env) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  const body = await getJsonBody(request);
  if (!body) return errorResponse(400, "invalid_payload");
  const id = `obj-${crypto.randomUUID()}`;
  await env.DB.prepare(
    `INSERT INTO booking_objects (
      id, tenant_id, name, description, booking_type, slot_duration_minutes, full_day_start_time, full_day_end_time,
      time_slot_start_time, time_slot_end_time,
      window_min_days, window_max_days, price_weekday_cents, price_weekend_cents,
      is_active, group_id, max_bookings_override
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    auth.tenant.id,
    body.name,
    body.description || null,
    body.booking_type,
    body.slot_duration_minutes || null,
    normalizeClockTime(body.full_day_start_time),
    normalizeClockTime(body.full_day_end_time),
    normalizeClockTime(body.time_slot_start_time, "08:00"),
    normalizeClockTime(body.time_slot_end_time, "20:00"),
    body.window_min_days || 0,
    body.window_max_days || 30,
    body.price_weekday_cents || 0,
    body.price_weekend_cents || 0,
    body.is_active ? 1 : 0,
    body.group_id || null,
    body.max_bookings_override || null
  ).run();
  const permissions = body.permissions || [
    ...(body.allowHouses || []).map((value: string) => ({ mode: "allow", scope: "house", value })),
    ...(body.allowGroups || []).map((value: string) => ({ mode: "allow", scope: "group", value })),
    ...(body.allowApartments || []).map((value: string) => ({ mode: "allow", scope: "apartment", value })),
    ...(body.denyHouses || []).map((value: string) => ({ mode: "deny", scope: "house", value })),
    ...(body.denyGroups || []).map((value: string) => ({ mode: "deny", scope: "group", value })),
    ...(body.denyApartments || []).map((value: string) => ({ mode: "deny", scope: "apartment", value })),
  ];
  await env.DB.prepare("DELETE FROM booking_object_permissions WHERE booking_object_id = ?").bind(id).run();
  for (const perm of permissions) {
    await env.DB
      .prepare("INSERT INTO booking_object_permissions (booking_object_id, mode, scope, value) VALUES (?, ?, ?, ?)")
      .bind(id, perm.mode, perm.scope, perm.value)
      .run();
  }
  return json({ id });
};

const handleAdminUpdateBookingObject = async (request: Request, env: Env, objectId: string) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  const body = await getJsonBody(request);
  if (!body) return errorResponse(400, "invalid_payload");
  await env.DB.prepare(
    `UPDATE booking_objects SET
      name = ?, description = ?, booking_type = ?, slot_duration_minutes = ?, full_day_start_time = ?, full_day_end_time = ?,
      time_slot_start_time = ?, time_slot_end_time = ?,
      window_min_days = ?, window_max_days = ?, price_weekday_cents = ?, price_weekend_cents = ?,
      is_active = ?, group_id = ?, max_bookings_override = ?
     WHERE id = ?`
  ).bind(
    body.name,
    body.description || null,
    body.booking_type,
    body.slot_duration_minutes || null,
    normalizeClockTime(body.full_day_start_time),
    normalizeClockTime(body.full_day_end_time),
    normalizeClockTime(body.time_slot_start_time, "08:00"),
    normalizeClockTime(body.time_slot_end_time, "20:00"),
    body.window_min_days || 0,
    body.window_max_days || 30,
    body.price_weekday_cents || 0,
    body.price_weekend_cents || 0,
    body.is_active ? 1 : 0,
    body.group_id || null,
    body.max_bookings_override || null,
    objectId
  ).run();
  const permissions = body.permissions || [
    ...(body.allowHouses || []).map((value: string) => ({ mode: "allow", scope: "house", value })),
    ...(body.allowGroups || []).map((value: string) => ({ mode: "allow", scope: "group", value })),
    ...(body.allowApartments || []).map((value: string) => ({ mode: "allow", scope: "apartment", value })),
    ...(body.denyHouses || []).map((value: string) => ({ mode: "deny", scope: "house", value })),
    ...(body.denyGroups || []).map((value: string) => ({ mode: "deny", scope: "group", value })),
    ...(body.denyApartments || []).map((value: string) => ({ mode: "deny", scope: "apartment", value })),
  ];
  await env.DB.prepare("DELETE FROM booking_object_permissions WHERE booking_object_id = ?").bind(objectId).run();
  for (const perm of permissions) {
    await env.DB
      .prepare("INSERT INTO booking_object_permissions (booking_object_id, mode, scope, value) VALUES (?, ?, ?, ?)")
      .bind(objectId, perm.mode, perm.scope, perm.value)
      .run();
  }
  return json({ id: objectId });
};

const handleAdminBookingGroups = async (request: Request, env: Env) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  const rows = await env.DB.prepare("SELECT * FROM booking_groups WHERE tenant_id = ?").bind(auth.tenant.id).all();
  return json({ booking_groups: rows.results });
};

const handleAdminCreateBookingGroup = async (request: Request, env: Env) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  const body = await getJsonBody(request);
  if (!body?.name) return errorResponse(400, "invalid_payload");
  const id = `group-${crypto.randomUUID()}`;
  await env.DB.prepare("INSERT INTO booking_groups (id, tenant_id, name, max_bookings) VALUES (?, ?, ?, ?)")
    .bind(id, auth.tenant.id, body.max_bookings || 1)
    .run();
  return json({ id });
};

const handleImportRulesGet = async (request: Request, env: Env) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  const rules = await env.DB.prepare("SELECT * FROM user_import_rules WHERE tenant_id = ?").bind(auth.tenant.id).first();
  return json({ rules: rules || null });
};

const handleImportRulesPut = async (request: Request, env: Env) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  const body = await getJsonBody(request);
  if (!body) return errorResponse(400, "invalid_payload");
  const asText = (value: unknown, fallback = "") =>
    value === undefined || value === null ? fallback : String(value);
  const params = [
    auth.tenant?.id ?? "",
    asText(body.identity_field, "OrgGrupp"),
    asText(body.groups_field, ""),
    asText(body.rfid_field, ""),
    asText(body.active_field, ""),
    asText(body.house_field, ""),
    asText(body.apartment_field, ""),
    asText(body.house_regex, ""),
    asText(body.apartment_regex, ""),
    asText(body.group_separator, "|"),
    asText(body.admin_groups, ""),
  ];
  await env.DB.prepare(
    `INSERT INTO user_import_rules (
      tenant_id, identity_field, groups_field, rfid_field, active_field,
      house_field, apartment_field, house_regex, apartment_regex, group_separator, admin_groups
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(tenant_id) DO UPDATE SET
      identity_field = excluded.identity_field,
      groups_field = excluded.groups_field,
      rfid_field = excluded.rfid_field,
      active_field = excluded.active_field,
      house_field = excluded.house_field,
      apartment_field = excluded.apartment_field,
      house_regex = excluded.house_regex,
      apartment_regex = excluded.apartment_regex,
      group_separator = excluded.group_separator,
      admin_groups = excluded.admin_groups,
      updated_at = CURRENT_TIMESTAMP`
  ).bind(...params).run();
  return json({ status: "ok" });
};

const detectCsvDelimiter = (line: string) => {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  for (const delimiter of candidates) {
    const count = line.split(delimiter).length - 1;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
};

const parseCsv = (csvText: string) => {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  const delimiter = detectCsvDelimiter(lines[0] || "");
  const headers = lines[0]?.split(delimiter).map((h) => h.trim()) || [];
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(delimiter).map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cols[index] || "";
    });
    return row;
  });
  return { headers, rows };
};

const applyRegex = (value: string, regexString?: string) => {
  if (!regexString) return "";
  try {
    const regex = new RegExp(regexString);
    const match = regex.exec(value);
    if (!match) return "";
    return match.length > 1 ? match.slice(1).join("-") : match[0];
  } catch {
    return "";
  }
};

const parseActiveValue = (value: string) => {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return true;
  if (["1", "av", "inaktiv", "inactive", "false", "nej", "no"].includes(normalized)) return false;
  if (["0", "på", "pa", "aktiv", "active", "true", "ja", "yes"].includes(normalized)) return true;
  return true;
};

const deriveAdminApartmentId = (identity: string) => {
  const base = (identity || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  let hash = 0;
  for (let i = 0; i < identity.length; i += 1) {
    hash = (hash * 31 + identity.charCodeAt(i)) >>> 0;
  }
  const suffix = hash.toString(16).slice(0, 8);
  return `admin-${base || "user"}-${suffix}`;
};

const buildImportPreview = async (db: D1Database, tenantId: string, csvText: string, rules: any) => {
  const { headers, rows } = parseCsv(csvText);
  const users = await db.prepare("SELECT * FROM users WHERE tenant_id = ?").bind(tenantId).all();
  const usersByApartment = new Map(users.results.map((u: any) => [u.apartment_id, u]));
  const userGroupRows = await db
    .prepare(
      `SELECT uag.user_id, ag.name
       FROM user_access_groups uag
       JOIN access_groups ag ON ag.id = uag.group_id
       WHERE ag.tenant_id = ?`
    )
    .bind(tenantId)
    .all();
  const groupsByUserId = new Map<string, string[]>();
  for (const row of userGroupRows.results as any[]) {
    const list = groupsByUserId.get(row.user_id) || [];
    list.push(String(row.name));
    groupsByUserId.set(String(row.user_id), list);
  }
  const rfidRows = await db
    .prepare("SELECT user_id, uid FROM rfid_tags WHERE tenant_id = ? AND is_active = 1")
    .bind(tenantId)
    .all();
  const rfidByUserId = new Map((rfidRows.results || []).map((row: any) => [row.user_id, row.uid]));
  const adminGroups = (rules.admin_groups || "").split("|").filter(Boolean);
  const groupSeparator = rules.group_separator || "|";

  const previewRows = rows.map((row: Record<string, string>) => {
    const identity = row[rules.identity_field] || "";
    const apartmentSource = rules.apartment_field ? row[rules.apartment_field] || "" : identity;
    const apartmentBase = apartmentSource || identity;
    const apartmentId = rules.apartment_regex
      ? applyRegex(apartmentBase, rules.apartment_regex)
      : apartmentBase;
    const houseSource = rules.house_field ? row[rules.house_field] || "" : "";
    const house = rules.house_regex
      ? applyRegex(houseSource, rules.house_regex)
      : houseSource;
    const groupsRaw = rules.groups_field ? row[rules.groups_field] || "" : "";
    const groups = groupsRaw ? groupsRaw.split(groupSeparator).map((g) => g.trim()).filter(Boolean) : [];
    const rfid = rules.rfid_field ? (row[rules.rfid_field] || "").trim() : "";
    const admin = groups.some((g) => adminGroups.includes(g));
    const activeRaw = rules.active_field ? row[rules.active_field] || "" : "";
    const active = rules.active_field ? parseActiveValue(activeRaw) : true;
    if (!apartmentId && !admin) {
      return {
        identity,
        apartment_id: "",
        house,
        admin: false,
        active,
        groups,
        rfid,
        rfid_status: rfid ? "Ignoreras" : "Oförändrad",
        status: "Ignorerad",
      };
    }
    const resolvedApartmentId = apartmentId || deriveAdminApartmentId(identity);
    const existing = usersByApartment.get(resolvedApartmentId);
    const currentRfid = existing ? String(rfidByUserId.get(existing.id) || "") : "";
    const nextRfid = rfid || "";
    const currentGroups = existing ? (groupsByUserId.get(existing.id) || []).slice().sort() : [];
    const nextGroups = (groups || []).slice().sort();
    const groupsChanged = currentGroups.join("|") !== nextGroups.join("|");
    const rfidStatus = !existing
      ? nextRfid
        ? "Läggs till"
        : "Oförändrad"
      : currentRfid && !nextRfid
        ? "Tas bort"
        : !currentRfid && nextRfid
          ? "Läggs till"
          : currentRfid !== nextRfid
            ? "Byts ut"
            : "Oförändrad";
    const rfidChanged = rfidStatus !== "Oförändrad";
    const status = existing
      ? existing.house === house &&
        Boolean(existing.is_admin) === admin &&
        Boolean(existing.is_active) === active &&
        !groupsChanged &&
        !rfidChanged
        ? "Oförändrad"
        : "Uppdateras"
      : "Ny";
    return {
      identity,
      apartment_id: resolvedApartmentId,
      house,
      admin,
      active,
      groups,
      rfid,
      rfid_status: rfidStatus,
      status,
    };
  });

  const handledRows = previewRows.filter((row) => row.status !== "Ignorerad");
  const seen = new Set(handledRows.map((row) => row.apartment_id).filter(Boolean));
  const removed = users.results.filter((user: any) => !seen.has(user.apartment_id));
  const summary = {
    new: handledRows.filter((row) => row.status === "Ny").length,
    updated: handledRows.filter((row) => row.status === "Uppdateras").length,
    unchanged: handledRows.filter((row) => row.status === "Oförändrad").length,
    ignored: previewRows.filter((row) => row.status === "Ignorerad").length,
    removed: removed.length,
  };

  return { headers, rows: previewRows, summary };
};

const handleImportPreview = async (request: Request, env: Env) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  const body = await getJsonBody(request);
  if (!body?.csv_text || !body?.rules) return errorResponse(400, "invalid_payload");
  const preview = await buildImportPreview(env.DB, auth.tenant.id, body.csv_text, body.rules);
  return json(preview);
};

const handleImportApply = async (request: Request, env: Env) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  const body = await getJsonBody(request);
  if (!body?.csv_text || !body?.rules || !body?.actions) return errorResponse(400, "invalid_payload");
  const data = await buildImportPreview(env.DB, auth.tenant.id, body.csv_text, body.rules);
  const importRows = data.rows.filter((row: any) => row.status !== "Ignorerad" && (row.apartment_id || row.admin));
  const totalRows = importRows.length;
  const offset = Math.max(0, Number(body.offset || 0));
  const limit = Math.max(1, Number(body.limit || 100));
  const batchRows = importRows.slice(offset, offset + limit);
  const processedRows = Math.min(offset + batchRows.length, totalRows);
  const done = processedRows >= totalRows;
  const users = await env.DB.prepare("SELECT * FROM users WHERE tenant_id = ?").bind(auth.tenant.id).all();
  const usersByApartment = new Map(users.results.map((u: any) => [u.apartment_id, u]));
  const userGroupRows = await env.DB
    .prepare(
      `SELECT uag.user_id, ag.name
       FROM user_access_groups uag
       JOIN access_groups ag ON ag.id = uag.group_id
       WHERE ag.tenant_id = ?`
    )
    .bind(auth.tenant.id)
    .all();
  const groupsByUserId = new Map<string, string[]>();
  for (const row of userGroupRows.results as any[]) {
    const list = groupsByUserId.get(String(row.user_id)) || [];
    list.push(String(row.name));
    groupsByUserId.set(String(row.user_id), list);
  }
  const rfidRows = await env.DB
    .prepare("SELECT user_id, uid FROM rfid_tags WHERE tenant_id = ? AND is_active = 1")
    .bind(auth.tenant.id)
    .all();
  const rfidByUserId = new Map<string, string[]>();
  for (const row of rfidRows.results as any[]) {
    const list = rfidByUserId.get(String(row.user_id)) || [];
    list.push(String(row.uid));
    rfidByUserId.set(String(row.user_id), list);
  }
  const groupRows = await env.DB
    .prepare("SELECT id, name FROM access_groups WHERE tenant_id = ?")
    .bind(auth.tenant.id)
    .all();
  const groupIdByName = new Map<string, string>(
    (groupRows.results || []).map((row: any) => [String(row.name), String(row.id)])
  );
  const neededGroupNames = new Set<string>();
  for (const row of batchRows as any[]) {
    for (const groupName of row.groups || []) {
      const name = String(groupName || "").trim();
      if (name) neededGroupNames.add(name);
    }
  }
  const dbAny = env.DB as any;
  const groupCreateStatements: any[] = [];
  for (const name of neededGroupNames) {
    if (!groupIdByName.has(name)) {
      const id = `group-${crypto.randomUUID()}`;
      groupIdByName.set(name, id);
      groupCreateStatements.push(
        env.DB.prepare("INSERT INTO access_groups (id, tenant_id, name) VALUES (?, ?, ?)")
          .bind(id, auth.tenant.id, name)
      );
    }
  }
  if (groupCreateStatements.length) {
    await dbAny.batch(groupCreateStatements);
  }

  const pendingStatements: any[] = [];
  const flushPending = async () => {
    if (!pendingStatements.length) return;
    const chunk = pendingStatements.splice(0, pendingStatements.length);
    await dbAny.batch(chunk);
  };
  const pushStatement = async (statement: any) => {
    pendingStatements.push(statement);
    if (pendingStatements.length >= 200) {
      await flushPending();
    }
  };
  const syncUserGroups = async (userId: string, groupNames: string[]) => {
    await pushStatement(env.DB.prepare("DELETE FROM user_access_groups WHERE user_id = ?").bind(userId));
    for (const name of groupNames || []) {
      const groupId = groupIdByName.get(String(name));
      if (!groupId) continue;
      await pushStatement(
        env.DB.prepare("INSERT INTO user_access_groups (user_id, group_id) VALUES (?, ?)")
          .bind(userId, groupId)
      );
    }
  };
  const syncUserRfid = async (userId: string, rfid: string) => {
    await pushStatement(env.DB.prepare("UPDATE rfid_tags SET is_active = 0 WHERE user_id = ?").bind(userId));
    if (!rfid) {
      return;
    }
    await pushStatement(
      env.DB.prepare(
        `INSERT INTO rfid_tags (uid, tenant_id, user_id, is_active)
         VALUES (?, ?, ?, 1)
         ON CONFLICT(uid) DO UPDATE SET tenant_id = excluded.tenant_id, user_id = excluded.user_id, is_active = 1`
      ).bind(rfid, auth.tenant.id, userId)
    );
  };
  const syncUserRfids = async (userId: string, rfids: string[]) => {
    await pushStatement(env.DB.prepare("UPDATE rfid_tags SET is_active = 0 WHERE user_id = ?").bind(userId));
    for (const uid of rfids || []) {
      if (!uid) continue;
      await pushStatement(
        env.DB.prepare(
          `INSERT INTO rfid_tags (uid, tenant_id, user_id, is_active)
           VALUES (?, ?, ?, 1)
           ON CONFLICT(uid) DO UPDATE SET tenant_id = excluded.tenant_id, user_id = excluded.user_id, is_active = 1`
        ).bind(uid, auth.tenant.id, userId)
      );
    }
  };
  let added = 0;
  let updated = 0;
  let removed = 0;

  const mergedByApartment = new Map<
    string,
    { apartment_id: string; house: string; admin: boolean; active: boolean; groups: string[]; rfids: string[] }
  >();
  for (const row of batchRows as any[]) {
    const key = String(row.apartment_id || "");
    const prev = mergedByApartment.get(key);
    const nextGroups = new Set([...(prev?.groups || []), ...(row.groups || [])].filter(Boolean));
    const nextRfids = new Set([...(prev?.rfids || []), ...(row.rfid ? [row.rfid] : [])].filter(Boolean));
    mergedByApartment.set(key, {
      apartment_id: key,
      house: row.house || prev?.house || "",
      admin: Boolean(row.admin || prev?.admin),
      active: typeof row.active === "boolean" ? row.active : prev?.active ?? true,
      groups: Array.from(nextGroups),
      rfids: Array.from(nextRfids),
    });
  }

  for (const row of mergedByApartment.values()) {
    const existing = usersByApartment.get(row.apartment_id);
    if (!existing && body.actions.add_new) {
      const userId = `user-${crypto.randomUUID()}`;
      await pushStatement(
        env.DB.prepare(
          "INSERT INTO users (id, tenant_id, apartment_id, house, is_active, is_admin) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(userId, auth.tenant.id, row.apartment_id, row.house, row.active ? 1 : 0, row.admin ? 1 : 0)
      );
      await syncUserGroups(userId, row.groups || []);
      await syncUserRfids(userId, row.rfids || []);
      usersByApartment.set(row.apartment_id, {
        id: userId,
        apartment_id: row.apartment_id,
        house: row.house,
        is_active: row.active ? 1 : 0,
        is_admin: row.admin ? 1 : 0,
      });
      added += 1;
    }
    if (existing && body.actions.update_existing) {
      const currentGroups = (groupsByUserId.get(existing.id) || []).slice().sort();
      const nextGroups = (row.groups || []).slice().sort();
      const groupsChanged = currentGroups.join("|") !== nextGroups.join("|");
      const currentRfids = (rfidByUserId.get(existing.id) || []).slice().sort();
      const nextRfids = (row.rfids || []).slice().sort();
      const rfidsChanged = currentRfids.join("|") !== nextRfids.join("|");
      const shouldUpdate =
        existing.house !== row.house ||
        Boolean(existing.is_admin) !== row.admin ||
        Boolean(existing.is_active) !== row.active ||
        groupsChanged ||
        rfidsChanged;
      if (!shouldUpdate) {
        continue;
      }
      await pushStatement(
        env.DB.prepare(
          "UPDATE users SET house = ?, is_admin = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).bind(row.house, row.admin ? 1 : 0, row.active ? 1 : 0, existing.id)
      );
      await syncUserGroups(existing.id, row.groups || []);
      await syncUserRfids(existing.id, row.rfids || []);
      updated += 1;
    }
  }

  if (body.actions.remove_missing && done) {
    const seen = new Set(importRows.map((row: any) => row.apartment_id));
    for (const user of users.results) {
      if (!seen.has((user as any).apartment_id)) {
        await pushStatement(env.DB.prepare("UPDATE users SET is_active = 0 WHERE id = ?").bind(user.id));
        removed += 1;
      }
    }
  }
  await flushPending();

  return json({
    status: "ok",
    applied: body.actions,
    summary: { added, updated, removed },
    progress: { processed: processedRows, total: totalRows, done },
  });
};

const handleReportCsv = async (request: Request, env: Env, url: URL) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  const month = url.searchParams.get("month");
  const bookingObjectId = url.searchParams.get("booking_object_id");
  if (!month || !bookingObjectId) return errorResponse(400, "invalid_payload");
  const rows = await env.DB
    .prepare(
      `SELECT b.id, bo.name as booking_object_name, b.start_time, b.end_time, b.price_cents
       FROM bookings b
       JOIN booking_objects bo ON b.booking_object_id = bo.id
       WHERE b.tenant_id = ?
         AND b.booking_object_id = ?
         AND b.start_time LIKE ?`
    )
    .bind(auth.tenant.id, bookingObjectId, `${month}%`)
    .all();
  const header = "Bokningsobjekt,BokningID,Start,Slut,Pris";
  const body = rows.results
    .map((row: any) => `${row.booking_object_name},${row.id},${row.start_time},${row.end_time},${row.price_cents}`)
    .join("\n");
  return new Response(`${header}\n${body}`, { headers: { "content-type": "text/csv" } });
};

export const router = async (request: Request, env: Env) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");

  if (request.method === "POST" && path === "/api/rfid-login") return handleRfidLogin(request, env);
  if (request.method === "POST" && path === "/api/brf/register") return handleBrfRegister(request, env);
  if (request.method === "POST" && path === "/api/brf/setup/verify") return handleBrfSetupVerify(request, env);
  if (request.method === "POST" && path === "/api/brf/setup/complete") return handleBrfSetupComplete(request, env);
  if (request.method === "POST" && path === "/api/kiosk/access-token") return handleKioskAccessToken(request, env);
  if (request.method === "GET" && path === "/api/demo-links") return handleDemoLinks(request, env);

  if (request.method === "GET" && path === "/api/session") return handleSession(request, env);
  if (request.method === "GET" && path === "/api/services") return handleServices(request, env);
  if (request.method === "GET" && path === "/api/bookings/current") return handleCurrentBookings(request, env);
  if (request.method === "GET" && path === "/api/calendar") return handleCalendarDownload(request, env, url);
  if (request.method === "POST" && path === "/api/bookings") return handleCreateBooking(request, env);
  if (request.method === "DELETE" && path.startsWith("/api/bookings/")) {
    return handleCancelBooking(request, env, path.split("/").pop() || "");
  }

  if (request.method === "GET" && path === "/api/availability/month") return handleAvailabilityMonth(request, env, url);
  if (request.method === "GET" && path === "/api/availability/week") return handleAvailabilityWeek(request, env, url);

  if (request.method === "GET" && path === "/api/admin/users") return handleAdminUsers(request, env);
  if (request.method === "POST" && path === "/api/admin/users") return handleAdminCreateUser(request, env);
  if (request.method === "GET" && path === "/api/admin/users/import/rules") return handleImportRulesGet(request, env);
  if (request.method === "PUT" && path === "/api/admin/users/import/rules") return handleImportRulesPut(request, env);
  if (request.method === "POST" && path === "/api/admin/users/import/preview") return handleImportPreview(request, env);
  if (request.method === "POST" && path === "/api/admin/users/import/apply") return handleImportApply(request, env);
  if (request.method === "DELETE" && path.startsWith("/api/admin/users/")) {
    return handleAdminDeleteUser(request, env, path.split("/").pop() || "", url);
  }
  if (request.method === "PUT" && path.startsWith("/api/admin/users/")) {
    return handleAdminUpdateUser(request, env, path.split("/").pop() || "");
  }
  if (request.method === "GET" && path === "/api/admin/access-groups") return handleAdminAccessGroups(request, env);
  if (request.method === "POST" && path === "/api/admin/access-groups") return handleAdminAccessGroups(request, env);
  if (request.method === "GET" && path === "/api/admin/booking-objects") return handleAdminBookingObjects(request, env);
  if (request.method === "POST" && path === "/api/admin/booking-objects") return handleAdminCreateBookingObject(request, env);
  if (request.method === "POST" && path.startsWith("/api/admin/booking-objects/") && path.endsWith("/deactivate")) {
    const bookingObjectId = path.split("/").slice(-2)[0];
    return handleAdminDeactivateBookingObject(request, env, bookingObjectId, url);
  }
  if (request.method === "PUT" && path.startsWith("/api/admin/booking-objects/")) {
    return handleAdminUpdateBookingObject(request, env, path.split("/").pop() || "");
  }
  if (request.method === "GET" && path === "/api/admin/booking-groups") return handleAdminBookingGroups(request, env);
  if (request.method === "POST" && path === "/api/admin/booking-groups") return handleAdminCreateBookingGroup(request, env);
  if (request.method === "GET" && path === "/api/admin/reports/csv") return handleReportCsv(request, env, url);

  return errorResponse(404, "not_found");
};
