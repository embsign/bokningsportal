import { Env, D1Database } from "./types.js";

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

const getAuthContext = async (db: D1Database, token: string) =>
  (await db
    .prepare(
      `SELECT
         at.token AS access_token,
         at.tenant_id AS tenant_id,
         t.name AS tenant_name,
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
    tenant: { id: tenant.id as string, name: tenant.name as string },
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

const buildMonthAvailability = async (db: D1Database, user: any, bookingObjectId: string, month: string) => {
  const bookingObject = await db.prepare("SELECT * FROM booking_objects WHERE id = ?").bind(bookingObjectId).first();
  if (!bookingObject) return null;

  const [year, monthIndex] = month.split("-").map((part) => Number(part));
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 1));

  const bookings = await db
    .prepare(
      `SELECT user_id, start_time
       FROM bookings
       WHERE booking_object_id = ?
         AND cancelled_at IS NULL
         AND start_time >= ?
         AND start_time < ?`
    )
    .bind(bookingObjectId, start.toISOString(), end.toISOString())
    .all();
  const bookingByDate = new Map<string, any>();
  for (const row of bookings.results) {
    const day = (row.start_time as string).slice(0, 10);
    if (!bookingByDate.has(day)) {
      bookingByDate.set(day, row);
    }
  }

  const days: { date: string; status: string }[] = [];
  const today = new Date();
  for (let day = 1; day <= new Date(year, monthIndex, 0).getDate(); day += 1) {
    const date = new Date(Date.UTC(year, monthIndex - 1, day));
    const dateString = formatDate(date);
    let status = "available";
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + (bookingObject.window_min_days as number));
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + (bookingObject.window_max_days as number));
    if (date < today || date < minDate || date > maxDate) {
      status = "disabled";
    }
    const booking = bookingByDate.get(dateString);
    if (booking) {
      status = booking.user_id === user.id ? "mine" : "booked";
    }
    days.push({ date: dateString, status });
  }
  return days;
};

const buildWeekAvailability = async (db: D1Database, user: any, bookingObjectId: string, weekStart: string) => {
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
  const slotMinutes = (bookingObject.slot_duration_minutes as number) || 60;
  const nowMs = Date.now();
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + (bookingObject.window_min_days as number));
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + (bookingObject.window_max_days as number));
  const days = [];
  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    const dateString = formatDate(date);
    const label = date.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "numeric" });
    const slots = [];
    const dayDisabled = date < minDate || date > maxDate;
    for (let hour = 8; hour < 20; hour += slotMinutes / 60) {
      const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, 0, 0));
      const end = new Date(start);
      end.setUTCMinutes(end.getUTCMinutes() + slotMinutes);
      const startMs = start.getTime();
      const endMs = end.getTime();
      let status: "available" | "booked" | "mine" | "disabled" = "available";
      if (startMs < nowMs || dayDisabled) {
        status = "disabled";
      }
      const overlap = overlaps.find((booking) => booking.startMs < endMs && booking.endMs > startMs);
      if (overlap) {
        status = overlap.userId === user.id ? "mine" : "booked";
      }
      const isWeekend = [0, 6].includes(start.getUTCDay());
      const price = isWeekend ? (bookingObject.price_weekend_cents as number) : (bookingObject.price_weekday_cents as number);
      slots.push({
        id: `${dateString}-${hour}`,
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

const handleSession = async (request: Request, env: Env) => {
  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth.error;
  return json({
    tenant: { id: auth.tenant.id, name: auth.tenant.name },
    user: { id: auth.user.id, apartment_id: auth.user.apartment_id, is_admin: auth.user.is_admin === 1 },
  });
};

const handleServices = async (request: Request, env: Env) => {
  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth.error;
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
  const services = filtered
    .map((obj: any) => ({
      id: obj.id,
      name: obj.name,
      description: obj.description || "",
      booking_type: obj.booking_type,
      slot_duration_minutes: obj.slot_duration_minutes,
      next_available: formatDate(new Date()),
      price_weekday_cents: obj.price_weekday_cents,
      price_weekend_cents: obj.price_weekend_cents,
    }));
  return json({ services });
};

const handleCurrentBookings = async (request: Request, env: Env) => {
  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth.error;
  const rows = await env.DB
    .prepare("SELECT * FROM bookings WHERE user_id = ? AND cancelled_at IS NULL ORDER BY start_time ASC")
    .bind(auth.user.id)
    .all();
  const bookings = rows.results.map((row: any) => ({
    id: row.id,
    service_name: row.booking_object_id,
    date: (row.start_time as string).slice(0, 10),
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

const handleAvailabilityMonth = async (request: Request, env: Env, url: URL) => {
  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth.error;
  const bookingObjectId = url.searchParams.get("booking_object_id");
  const month = url.searchParams.get("month");
  if (!bookingObjectId || !month) return errorResponse(400, "invalid_payload");
  const days = await buildMonthAvailability(env.DB, auth.user, bookingObjectId, month);
  if (!days) return errorResponse(404, "not_found");
  return json({ days });
};

const handleAvailabilityWeek = async (request: Request, env: Env, url: URL) => {
  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth.error;
  const bookingObjectId = url.searchParams.get("booking_object_id");
  const weekStart = url.searchParams.get("week_start");
  if (!bookingObjectId || !weekStart) return errorResponse(400, "invalid_payload");
  const days = await buildWeekAvailability(env.DB, auth.user, bookingObjectId, weekStart);
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
         COALESCE(MAX(CASE WHEN rt.is_active = 1 THEN rt.uid END), '') AS rfid
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
    rfid: user.rfid || "",
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

  if (body.rfid) {
    await env.DB.prepare(
      `INSERT INTO rfid_tags (uid, tenant_id, user_id, is_active)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(uid) DO UPDATE SET tenant_id = excluded.tenant_id, user_id = excluded.user_id, is_active = 1`
    ).bind(body.rfid, auth.tenant.id, userId).run();
  } else {
    await env.DB.prepare("DELETE FROM rfid_tags WHERE user_id = ?").bind(userId).run();
  }
  return json({ id: userId });
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

const handleAdminCreateBookingObject = async (request: Request, env: Env) => {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;
  const body = await getJsonBody(request);
  if (!body) return errorResponse(400, "invalid_payload");
  const id = `obj-${crypto.randomUUID()}`;
  await env.DB.prepare(
    `INSERT INTO booking_objects (
      id, tenant_id, name, description, booking_type, slot_duration_minutes,
      window_min_days, window_max_days, price_weekday_cents, price_weekend_cents,
      is_active, group_id, max_bookings_override
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    auth.tenant.id,
    body.name,
    body.description || null,
    body.booking_type,
    body.slot_duration_minutes || null,
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
      name = ?, description = ?, booking_type = ?, slot_duration_minutes = ?,
      window_min_days = ?, window_max_days = ?, price_weekday_cents = ?, price_weekend_cents = ?,
      is_active = ?, group_id = ?, max_bookings_override = ?
     WHERE id = ?`
  ).bind(
    body.name,
    body.description || null,
    body.booking_type,
    body.slot_duration_minutes || null,
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
  ).bind(
    auth.tenant.id,
    body.identity_field,
    body.groups_field,
    body.rfid_field,
    body.active_field,
    body.house_field,
    body.apartment_field,
    body.house_regex,
    body.apartment_regex,
    body.group_separator,
    body.admin_groups
  ).run();
  return json({ status: "ok" });
};

const parseCsv = (csvText: string) => {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  const headers = lines[0]?.split(",").map((h) => h.trim()) || [];
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
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

const buildImportPreview = async (db: D1Database, tenantId: string, csvText: string, rules: any) => {
  const { headers, rows } = parseCsv(csvText);
  const users = await db.prepare("SELECT * FROM users WHERE tenant_id = ?").bind(tenantId).all();
  const usersByApartment = new Map(users.results.map((u: any) => [u.apartment_id, u]));
  const adminGroups = (rules.admin_groups || "").split("|").filter(Boolean);
  const groupSeparator = rules.group_separator || "|";

  const previewRows = rows.map((row: Record<string, string>) => {
    const identity = row[rules.identity_field] || "";
    const apartmentId = applyRegex(identity, rules.apartment_regex) || identity;
    const house = applyRegex(identity, rules.house_regex) || "";
    const groupsRaw = rules.groups_field ? row[rules.groups_field] || "" : "";
    const groups = groupsRaw ? groupsRaw.split(groupSeparator).map((g) => g.trim()).filter(Boolean) : [];
    const admin = groups.some((g) => adminGroups.includes(g));
    const existing = usersByApartment.get(apartmentId);
    const status = existing ? (existing.house === house ? "Oförändrad" : "Uppdateras") : "Ny";
    return { identity, apartment_id: apartmentId, house, admin, status };
  });

  const seen = new Set(previewRows.map((row) => row.apartment_id));
  const removed = users.results.filter((user: any) => !seen.has(user.apartment_id));
  const summary = {
    new: previewRows.filter((row) => row.status === "Ny").length,
    updated: previewRows.filter((row) => row.status === "Uppdateras").length,
    unchanged: previewRows.filter((row) => row.status === "Oförändrad").length,
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
  const users = await env.DB.prepare("SELECT * FROM users WHERE tenant_id = ?").bind(auth.tenant.id).all();
  const usersByApartment = new Map(users.results.map((u: any) => [u.apartment_id, u]));
  let added = 0;
  let updated = 0;
  let removed = 0;

  for (const row of data.rows as any[]) {
    const existing = usersByApartment.get(row.apartment_id);
    if (!existing && body.actions.add_new) {
      const userId = `user-${crypto.randomUUID()}`;
      await env.DB.prepare(
        "INSERT INTO users (id, tenant_id, apartment_id, house, is_active, is_admin) VALUES (?, ?, ?, ?, 1, ?)"
      ).bind(userId, auth.tenant.id, row.apartment_id, row.house, row.admin ? 1 : 0).run();
      added += 1;
    }
    if (existing && row.status === "Uppdateras" && body.actions.update_existing) {
      await env.DB.prepare(
        "UPDATE users SET house = ?, is_admin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(row.house, row.admin ? 1 : 0, existing.id).run();
      updated += 1;
    }
  }

  if (body.actions.remove_missing) {
    const seen = new Set(data.rows.map((row) => row.apartment_id));
    for (const user of users.results) {
      if (!seen.has((user as any).apartment_id)) {
        await env.DB.prepare("UPDATE users SET is_active = 0 WHERE id = ?").bind(user.id).run();
        removed += 1;
      }
    }
  }

  return json({ status: "ok", applied: body.actions, summary: { added, updated, removed } });
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
  if (request.method === "POST" && path === "/api/kiosk/access-token") return handleKioskAccessToken(request, env);

  if (request.method === "GET" && path === "/api/session") return handleSession(request, env);
  if (request.method === "GET" && path === "/api/services") return handleServices(request, env);
  if (request.method === "GET" && path === "/api/bookings/current") return handleCurrentBookings(request, env);
  if (request.method === "POST" && path === "/api/bookings") return handleCreateBooking(request, env);
  if (request.method === "DELETE" && path.startsWith("/api/bookings/")) {
    return handleCancelBooking(request, env, path.split("/").pop() || "");
  }

  if (request.method === "GET" && path === "/api/availability/month") return handleAvailabilityMonth(request, env, url);
  if (request.method === "GET" && path === "/api/availability/week") return handleAvailabilityWeek(request, env, url);

  if (request.method === "GET" && path === "/api/admin/users") return handleAdminUsers(request, env);
  if (request.method === "PUT" && path.startsWith("/api/admin/users/")) {
    return handleAdminUpdateUser(request, env, path.split("/").pop() || "");
  }
  if (request.method === "GET" && path === "/api/admin/booking-objects") return handleAdminBookingObjects(request, env);
  if (request.method === "POST" && path === "/api/admin/booking-objects") return handleAdminCreateBookingObject(request, env);
  if (request.method === "PUT" && path.startsWith("/api/admin/booking-objects/")) {
    return handleAdminUpdateBookingObject(request, env, path.split("/").pop() || "");
  }
  if (request.method === "GET" && path === "/api/admin/booking-groups") return handleAdminBookingGroups(request, env);
  if (request.method === "POST" && path === "/api/admin/booking-groups") return handleAdminCreateBookingGroup(request, env);
  if (request.method === "GET" && path === "/api/admin/users/import/rules") return handleImportRulesGet(request, env);
  if (request.method === "PUT" && path === "/api/admin/users/import/rules") return handleImportRulesPut(request, env);
  if (request.method === "POST" && path === "/api/admin/users/import/preview") return handleImportPreview(request, env);
  if (request.method === "POST" && path === "/api/admin/users/import/apply") return handleImportApply(request, env);
  if (request.method === "GET" && path === "/api/admin/reports/csv") return handleReportCsv(request, env, url);

  return errorResponse(404, "not_found");
};
