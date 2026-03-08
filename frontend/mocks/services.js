export const services = [
  {
    id: "laundry-room",
    name: "Tvättstuga",
    description: "Tvätt & tork med bokningsbara pass.",
    duration: "2 timmar",
    nextAvailable: "Tis 14:30",
    priceText: "Debiteras: 50 kr",
    bookingType: "time-slot",
  },
  {
    id: "guest-apartment",
    name: "Gästlägenhet",
    description: "Heldagsbokning för övernattning.",
    duration: "1 dygn",
    nextAvailable: "Fre 16:00",
    priceText: "Debiteras: 350 kr",
    bookingType: "full-day",
  },
  {
    id: "sauna",
    name: "Bastu",
    description: "Kvällspass i gemensam bastu.",
    duration: "1,5 timmar",
    nextAvailable: "Ons 19:00",
    priceText: "",
    bookingType: "time-slot",
  },
];
