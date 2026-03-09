export const createBookingSummary = ({ service, date, timeslot }) => {
  if (!service || !date) {
    return null;
  }

  const dateLabel = date.toLocaleDateString("sv-SE", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return {
    service: service.name,
    date: dateLabel,
    time: timeslot?.label || (service.bookingType === "full-day" ? "Heldag" : "Välj tid"),
    duration: service.duration,
    price: service.priceText || "Ingen debitering",
    resource: service.name,
  };
};
