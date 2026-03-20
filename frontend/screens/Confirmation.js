import { createElement } from "../hooks/dom.js";
import { BookingSummary } from "../components/BookingSummary.js";

export const Confirmation = ({ summary, state, confirmed, onBack, onConfirm, onAcknowledge, confirmDisabled }) => {
  let content;
  if (state === "loading") {
    content = createElement("div", { className: "skeleton skeleton-card" });
  } else if (state === "error") {
    content = createElement("div", { className: "error-state", text: "Kunde inte skapa bokningen." });
  } else if (!summary) {
    content = createElement("div", { className: "empty-state", text: "Ingen bokning att bekräfta." });
  } else {
    content = BookingSummary({ summary });
  }

  const footer = confirmed
    ? createElement("div", {
        className: "modal-footer",
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
