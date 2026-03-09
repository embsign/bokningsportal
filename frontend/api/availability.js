import { apiRequest } from "./client.js";

const pad = (value) => String(value).padStart(2, "0");
const dayNames = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

export const getMonthLabel = (year, monthIndex) => {
  const monthName = new Date(year, monthIndex).toLocaleDateString("sv-SE", {
    month: "long",
    year: "numeric",
  });
  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
};

export const getWeekStart = (baseDate) => {
  const date = new Date(baseDate);
  const dayIndex = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayIndex);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const getMonthAvailability = async (bookingObjectId, year, monthIndex) => {
  const month = `${year}-${pad(monthIndex + 1)}`;
  const { days } = await apiRequest(
    `/availability/month?booking_object_id=${encodeURIComponent(bookingObjectId)}&month=${month}`
  );
  const byDate = new Map(days.map((day) => [day.date, day.status]));

  const firstDay = new Date(year, monthIndex, 1);
  const startDay = new Date(firstDay);
  const dayOfWeek = (firstDay.getDay() + 6) % 7;
  startDay.setDate(firstDay.getDate() - dayOfWeek);

  const calendarDays = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(startDay);
    date.setDate(startDay.getDate() + i);
    const dateString = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const status =
      date.getMonth() !== monthIndex ? "disabled" : byDate.get(dateString) || "available";
    calendarDays.push({
      id: dateString,
      date,
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      status,
      monthIndex: date.getMonth(),
    });
  }

  return calendarDays;
};

export const getWeekAvailability = async (bookingObjectId, weekStart) => {
  const weekStartStr = `${weekStart.getFullYear()}-${pad(weekStart.getMonth() + 1)}-${pad(weekStart.getDate())}`;
  const { days } = await apiRequest(
    `/availability/week?booking_object_id=${encodeURIComponent(bookingObjectId)}&week_start=${weekStartStr}`
  );

  return days.map((day, index) => {
    const date = new Date(day.date);
    return {
      id: day.date,
      label: `${dayNames[index]} ${date.getDate()}/${date.getMonth() + 1}`,
      date,
      slots: day.slots.map((slot) => ({
        id: slot.id,
        label: slot.label,
        status: slot.status,
        priceText: slot.price_cents ? `${Math.round(slot.price_cents / 100)} kr` : "",
        startTime: `${day.date}T${slot.label.split("-")[0]}:00.000Z`,
        endTime: `${day.date}T${slot.label.split("-")[1]}:00.000Z`,
        date,
      })),
    };
  });
};
