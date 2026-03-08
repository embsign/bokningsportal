const statusCycle = ["available", "available", "booked", "mine", "available", "disabled"];

const pad = (value) => String(value).padStart(2, "0");

export const getMonthAvailability = (year, monthIndex) => {
  const today = new Date();
  const firstDay = new Date(year, monthIndex, 1);
  const startDay = new Date(firstDay);
  const dayOfWeek = (firstDay.getDay() + 6) % 7;
  startDay.setDate(firstDay.getDate() - dayOfWeek);

  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(startDay);
    date.setDate(startDay.getDate() + i);
    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const status =
      isPast || date.getMonth() !== monthIndex
        ? "disabled"
        : statusCycle[i % statusCycle.length];

    days.push({
      id: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      date,
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      status,
      monthIndex: date.getMonth(),
    });
  }

  return days;
};

export const getMonthLabel = (year, monthIndex) => {
  const monthName = new Date(year, monthIndex).toLocaleDateString("sv-SE", {
    month: "long",
    year: "numeric",
  });
  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
};
