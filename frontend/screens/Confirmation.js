import { createElement } from "../hooks/dom.js";
import { BookingSummary } from "../components/BookingSummary.js";

export const Confirmation = ({ summary, state, confirmed, isMobile, onBack, onConfirm, confirmDisabled }) => {
  let content;
  if (state === "loading") {
    content = createElement("div", { className: "skeleton skeleton-card" });
  } else if (state === "error") {
    content = createElement("div", { className: "error-state", text: "Kunde inte ladda sammanfattning." });
  } else if (!summary) {
    content = createElement("div", { className: "empty-state", text: "Ingen bokning att bekräfta." });
  } else {
    content = BookingSummary({ summary });
  }

  const confirmation = confirmed
    ? createElement("div", {
        className: "booking-summary",
        children: [
          createElement("div", { className: "screen-title", text: "Bokning klar" }),
          createElement("div", {
            className: "screen-subtitle",
            text: "Lägg till bokningen i din kalender.",
          }),
          isMobile
            ? createElement("button", { className: "secondary-button", text: "Ladda ner kalenderfil" })
            : createElement("div", {
                className: "state-panel",
                children: [
                  createElement("div", { text: "QR-kod" }),
                  createElement("span", { text: "Skanna för kalenderlänk" }),
                ],
              }),
        ],
      })
    : null;

  const footer = createElement("div", {
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
      createElement("div", { className: "modal-title", text: "Bekräfta bokning" }),
      content,
      confirmation,
      footer,
    ].filter(Boolean),
  });

  return createElement("section", {
    className: "screen",
    children: [createElement("div", { className: "modal-overlay", children: [modal] })],
  });
};
