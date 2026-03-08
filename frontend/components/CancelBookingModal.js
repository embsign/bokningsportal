import { createElement } from "../hooks/dom.js";

export const CancelBookingModal = ({ booking, onClose, onConfirm }) => {
  if (!booking) {
    return null;
  }

  return createElement("div", {
    className: "modal-overlay",
    children: [
      createElement("div", {
        className: "modal card",
        children: [
          createElement("div", { className: "modal-title", text: "Avboka bokning" }),
          createElement("div", {
            className: "screen-subtitle",
            text: "Vill du avboka denna tid?",
          }),
          createElement("div", {
            className: "booking-cancel-summary",
            children: [
              createElement("div", { className: "booking-card-title", text: booking.serviceName }),
              createElement("div", {
                className: "booking-card-date",
                children: [
                  createElement("span", { className: "booking-date-day", text: booking.dayLabel }),
                  createElement("strong", { text: booking.dateLabel }),
                ],
              }),
              createElement("div", {
                className: "booking-card-time",
                children: [createElement("strong", { text: booking.timeLabel })],
              }),
            ],
          }),
          createElement("div", {
            className: "modal-footer",
            children: [
              createElement("button", {
                className: "secondary-button",
                text: "Avbryt",
                onClick: onClose,
              }),
              createElement("button", {
                className: "primary-button",
                text: "Avboka",
                onClick: onConfirm,
              }),
            ],
          }),
        ],
      }),
    ],
  });
};
