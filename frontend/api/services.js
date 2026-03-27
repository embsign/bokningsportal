import { apiRequest } from "./client.js";

const normalizeClockTime = (value) => (/^\d{2}:\d{2}$/.test(value || "") ? value : "12:00");

const formatDuration = (service) => {
  if (service.booking_type === "full-day") {
    return "1 dygn";
  }
  if (service.slot_duration_minutes) {
    const hours = service.slot_duration_minutes / 60;
    return hours % 1 === 0 ? `${hours} timmar` : `${hours.toString().replace(".", ",")} timmar`;
  }
  return "";
};

const formatPriceText = (service) => {
  const weekdayCents = Number(service.price_weekday_cents || 0);
  const weekendCents = Number(service.price_weekend_cents || 0);
  const hasAnyPrice = weekdayCents > 0 || weekendCents > 0;
  if (!hasAnyPrice) {
    return "";
  }

  const weekday = Math.round(weekdayCents / 100);
  const weekend = Math.round(weekendCents / 100);
  if (weekday === weekend) {
    return `Debiteras: ${weekday} kr`;
  }

  const low = Math.min(weekday, weekend);
  const high = Math.max(weekday, weekend);
  return `Debiteras: ${low}-${high} kr`;
};

export const getServices = async () => {
  const { services } = await apiRequest("/services");
  return services.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description || "",
    duration: formatDuration(service),
    nextAvailable: service.next_available || "",
    priceText: formatPriceText(service),
    bookingType: service.booking_type,
    slotDuration: service.slot_duration_minutes || "",
    fullDayStartTime: normalizeClockTime(service.full_day_start_time),
    fullDayEndTime: normalizeClockTime(service.full_day_end_time),
    priceWeekday: service.price_weekday_cents || 0,
    priceWeekend: service.price_weekend_cents || 0,
  }));
};
