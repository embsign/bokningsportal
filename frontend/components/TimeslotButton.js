import { createElement } from "../hooks/dom.js";

export const TimeslotButton = ({ slot, isSelected, onSelect }) => {
  const hasPrice = Boolean(slot.priceText && slot.priceText.trim().length > 0);
  const className = [
    "timeslot-button",
    slot.status,
    isSelected ? "selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const price = hasPrice ? createElement("span", { text: slot.priceText }) : null;
  const bookedBy =
    slot.bookedByApartmentId && (slot.status === "booked" || slot.status === "mine")
      ? createElement("span", {
          className: "timeslot-meta",
          text: `Bokad av: ${slot.bookedByApartmentId}`,
        })
      : null;
  const blockedMeta =
    slot.status === "blocked"
      ? createElement("span", {
          className: "timeslot-meta",
          text: "Blockerad",
        })
      : null;

  return createElement("button", {
    className,
    attrs: hasPrice ? { "data-has-price": "true" } : {},
    onClick: slot.status !== "disabled" ? onSelect : null,
    children: [
      createElement("strong", { text: slot.label }),
      bookedBy,
      blockedMeta,
      price,
    ],
  });
};
