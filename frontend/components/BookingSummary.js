import { createElement } from "../hooks/dom.js";

export const BookingSummary = ({ summary }) => {
  if (!summary) {
    return createElement("div", { className: "empty-state", text: "Ingen bokning vald ännu." });
  }

  const rows = [
    ["Plats/Resurs", summary.resource],
    ["Datum", summary.date],
    ["Tid", summary.time],
    ["Varaktighet", summary.duration],
    ["Debitering", summary.price],
  ];

  return createElement("div", {
    className: "booking-summary card",
    children: rows.map(([label, value]) =>
      createElement("div", {
        className: "summary-row",
        children: [
          createElement("span", { className: "summary-label", text: label }),
          createElement("span", { text: value }),
        ],
      })
    ),
  });
};
