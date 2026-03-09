import { apiRequest } from "./client.js";

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
  if (service.price_weekday_cents && service.price_weekday_cents > 0) {
    return `Debiteras: ${Math.round(service.price_weekday_cents / 100)} kr`;
  }
  return "";
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
    priceWeekday: service.price_weekday_cents || 0,
    priceWeekend: service.price_weekend_cents || 0,
  }));
};
