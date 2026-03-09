import { apiRequest } from "./client.js";

const toKr = (value) => (value ? String(Math.round(value / 100)) : "0");
const toCents = (value) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Math.round(parsed * 100);
};

export const getBookingObjects = async () => {
  const { booking_objects } = await apiRequest("/admin/booking-objects");
  return booking_objects.map((obj) => ({
    id: obj.id,
    name: obj.name,
    type: obj.booking_type === "full-day" ? "Heldag" : "Tidspass",
    status: obj.is_active ? "Aktiv" : "Inaktiv",
    slotDuration: obj.slot_duration_minutes ? String(obj.slot_duration_minutes) : "",
    windowMin: String(obj.window_min_days),
    windowMax: String(obj.window_max_days),
    maxBookings: obj.max_bookings_override ? String(obj.max_bookings_override) : "",
    priceWeekday: toKr(obj.price_weekday_cents),
    priceWeekend: toKr(obj.price_weekend_cents),
    groupId: obj.group_id || "",
    allowHouses: obj.allowHouses || [],
    allowGroups: obj.allowGroups || [],
    allowApartments: obj.allowApartments || [],
    denyHouses: obj.denyHouses || [],
    denyGroups: obj.denyGroups || [],
    denyApartments: obj.denyApartments || [],
  }));
};

export const createBookingObject = (payload) =>
  apiRequest("/admin/booking-objects", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      booking_type: payload.type === "Heldag" ? "full-day" : "time-slot",
      slot_duration_minutes: payload.slotDuration ? Number(payload.slotDuration) : null,
      window_min_days: Number(payload.windowMin || 0),
      window_max_days: Number(payload.windowMax || 0),
      price_weekday_cents: toCents(payload.priceWeekday),
      price_weekend_cents: toCents(payload.priceWeekend),
      is_active: payload.status !== "Inaktiv",
      group_id: payload.groupId || null,
      max_bookings_override: payload.maxBookings ? Number(payload.maxBookings) : null,
    }),
  });

export const updateBookingObject = (id, payload) =>
  apiRequest(`/admin/booking-objects/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      ...payload,
      booking_type: payload.type === "Heldag" ? "full-day" : "time-slot",
      slot_duration_minutes: payload.slotDuration ? Number(payload.slotDuration) : null,
      window_min_days: Number(payload.windowMin || 0),
      window_max_days: Number(payload.windowMax || 0),
      price_weekday_cents: toCents(payload.priceWeekday),
      price_weekend_cents: toCents(payload.priceWeekend),
      is_active: payload.status !== "Inaktiv",
      group_id: payload.groupId || null,
      max_bookings_override: payload.maxBookings ? Number(payload.maxBookings) : null,
    }),
  });

export const getBookingGroups = async () => {
  const { booking_groups } = await apiRequest("/admin/booking-groups");
  return booking_groups.map((group) => ({
    id: group.id,
    name: group.name,
    maxBookings: String(group.max_bookings),
  }));
};

export const createBookingGroup = (payload) =>
  apiRequest("/admin/booking-groups", { method: "POST", body: JSON.stringify(payload) });

export const getUsers = async () => {
  const { users } = await apiRequest("/admin/users");
  return users.map((user) => ({
    id: user.id,
    identity: user.identity,
    apartmentId: user.apartment_id,
    house: user.house,
    groups: user.groups || [],
    rfid: user.rfid || "",
    active: Boolean(user.is_active),
    admin: Boolean(user.is_admin),
  }));
};

export const updateUser = (id, payload) =>
  apiRequest(`/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      apartment_id: payload.identity || payload.apartmentId,
      house: payload.house,
      groups: payload.groups,
      rfid: payload.rfid,
      is_admin: payload.admin,
      is_active: payload.active,
    }),
  });

export const getImportRules = () => apiRequest("/admin/users/import/rules");

export const saveImportRules = (rules) =>
  apiRequest("/admin/users/import/rules", {
    method: "PUT",
    body: JSON.stringify(rules),
  });

export const previewImport = (csvText, rules) =>
  apiRequest("/admin/users/import/preview", {
    method: "POST",
    body: JSON.stringify({ csv_text: csvText, rules }),
  });

export const applyImport = (csvText, rules, actions) =>
  apiRequest("/admin/users/import/apply", {
    method: "POST",
    body: JSON.stringify({ csv_text: csvText, rules, actions }),
  });

export const downloadReportCsv = async (month, bookingObjectId) =>
  apiRequest(`/admin/reports/csv?month=${encodeURIComponent(month)}&booking_object_id=${encodeURIComponent(bookingObjectId)}`);
