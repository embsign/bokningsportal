const pad = (value) => String(value).padStart(2, "0");

const dayNames = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

const buildSlot = (date, startHour, durationHours, status, priceText) => {
  const start = `${pad(startHour)}:00`;
  const end = `${pad(startHour + durationHours)}:00`;
  return {
    id: `${date.toISOString()}-${startHour}`,
    label: `${start}-${end}`,
    status,
    priceText,
    date,
  };
};

export const getWeekStart = (baseDate) => {
  const date = new Date(baseDate);
  const dayIndex = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayIndex);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const getWeekTimeslots = (weekStart, bookingType) => {
  const today = new Date();
  const slots = [];

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dayLabel = `${dayNames[i]} ${date.getDate()}/${date.getMonth() + 1}`;

    const daySlots = [];
    if (bookingType === "full-day") {
      const status = date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
        ? "disabled"
        : i % 5 === 0
          ? "booked"
          : i % 4 === 0
            ? "mine"
            : "available";
      daySlots.push(buildSlot(date, 0, 24, status, "Heldag"));
    } else {
      const slotHours = [8, 12, 16, 19];
      slotHours.forEach((hour, index) => {
        const status =
          date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
            ? "disabled"
            : (i + index) % 6 === 0
              ? "booked"
              : (i + index) % 5 === 0
                ? "mine"
                : "available";
        const priceText = (i + index) % 4 === 0 ? "" : "50 kr";
        daySlots.push(buildSlot(date, hour, 2, status, priceText));
      });
    }

    slots.push({
      id: date.toISOString(),
      label: dayLabel,
      date,
      slots: daySlots,
    });
  }

  return slots;
};
