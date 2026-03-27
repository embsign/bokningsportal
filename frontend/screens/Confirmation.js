import { createElement } from "../hooks/dom.js";
import { BookingSummary } from "../components/BookingSummary.js";

const calendarAction = ({ isKioskMode, calendarQrImageUrl, calendarDownloadUrl }) => {
  if (!calendarDownloadUrl) {
    return null;
  }

  if (isKioskMode && calendarQrImageUrl) {
    return createElement("div", {
      className: "booking-complete-content confirmation-calendar-action",
      children: [
        createElement("div", {
          className: "screen-subtitle",
          text: "Skanna QR-koden för att lägga till bokningen i din mobilkalender.",
        }),
        createElement("img", {
          className: "confirmation-qr-image",
          attrs: {
            src: calendarQrImageUrl,
            alt: "QR-kod för kalenderfil",
          },
        }),
      ],
    });
  }

  return createElement("div", {
    className: "booking-complete-content confirmation-calendar-action",
    children: [
      createElement("div", {
        className: "calendar-download-actions",
        children: [
          createElement("a", {
            className: "calendar-inline-link",
            text: "📆",
            attrs: {
              href: calendarDownloadUrl,
              title: "Ladda ner kalenderfil",
              "aria-label": "Ladda ner kalenderfil",
              target: "_blank",
              rel: "noopener noreferrer",
            },
          }),
        ],
      }),
    ],
  });
};

export const Confirmation = ({
  summary,
  state,
  errorDetail,
  confirmed,
  isKioskMode,
  calendarQrImageUrl,
  calendarDownloadUrl,
  onBack,
  onConfirm,
  onAcknowledge,
  confirmDisabled,
}) => {
  let content;
  if (state === "loading") {
    content = createElement("div", { className: "skeleton skeleton-card" });
  } else if (state === "error") {
    const errorText =
      errorDetail === "max_bookings_reached"
        ? "Du har nått max antal aktiva bokningar för den här bokningsgruppen. Avboka en aktiv bokning först."
        : errorDetail === "outside_booking_window"
          ? "Vald tid ligger utanför tillåtet bokningsfönster."
          : errorDetail === "forbidden"
            ? "Du saknar behörighet att boka den här tiden."
            : "Kunde inte skapa bokningen. Försök igen.";
    content = createElement("div", { className: "error-state", text: errorText });
  } else if (!summary) {
    content = createElement("div", { className: "empty-state", text: "Ingen bokning att bekräfta." });
  } else if (confirmed) {
    content = calendarAction({
      isKioskMode,
      calendarQrImageUrl,
      calendarDownloadUrl,
    });
  } else {
    content = BookingSummary({ summary });
  }

  const footer = confirmed
    ? createElement("div", {
        className: "modal-footer modal-footer-align-end",
        children: [
          createElement("button", {
            className: "primary-button",
            text: "OK",
            onClick: onAcknowledge,
          }),
        ],
      })
    : createElement("div", {
        className: "modal-footer",
        children: [
          createElement("button", {
            className: "secondary-button",
            text: "Tillbaka",
            onClick: onBack,
          }),
          createElement("button", {
            className: "primary-button",
            text: "Boka",
            onClick: onConfirm,
            attrs: { disabled: confirmDisabled },
          }),
        ],
      });

  const modal = createElement("div", {
    className: "modal card",
    children: [
      createElement("div", { className: "modal-title", text: confirmed ? "Bokning klar" : "Bekräfta bokning" }),
      confirmed
        ? createElement("div", {
            className: "screen-subtitle",
            text: "Tiden är nu bokad och markerad i schemat.",
          })
        : null,
      content,
      footer,
    ].filter(Boolean),
  });

  return createElement("section", {
    className: "screen",
    children: [createElement("div", { className: "modal-overlay", children: [modal] })],
  });
};
