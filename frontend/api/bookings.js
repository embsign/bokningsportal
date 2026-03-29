import { agentDebugLog, apiRequest } from "./client.js";

const formatDayLabel = (date) =>
  date
    .toLocaleDateString("sv-SE", { weekday: "short" })
    .replace(".", "")
    .replace(/^./, (char) => char.toUpperCase());

const formatDateLabel = (date) => `${date.getDate()}/${date.getMonth() + 1}`;

export const getCurrentBookings = async () => {
  const { bookings } = await apiRequest("/bookings/current");
  const mapped = bookings.map((booking) => {
    const date = new Date(booking.date);
    return {
      id: booking.id,
      bookingObjectId: booking.booking_object_id,
      groupId: booking.booking_group_id || "",
      startTime: booking.start_time || "",
      endTime: booking.end_time || "",
      serviceName: booking.service_name,
      dayLabel: formatDayLabel(date),
      dateLabel: formatDateLabel(date),
      timeLabel: booking.time_label,
      status: booking.status,
      startTime: booking.start_time,
      endTime: booking.end_time,
    };
  });
  // #region agent log
  agentDebugLog({
    hypothesisId: "H1",
    location: "frontend/api/bookings.js:getCurrentBookings:exit",
    message: "getCurrentBookings exit",
    data: {
      bookingIds: mapped.map((booking) => booking.id),
      bookingCount: mapped.length,
    },
  });
  // #endregion
  return mapped;
};

export const createBooking = (payload) =>
  apiRequest("/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const cancelBooking = (bookingId) =>
  apiRequest(`/bookings/${bookingId}`, { method: "DELETE" });
