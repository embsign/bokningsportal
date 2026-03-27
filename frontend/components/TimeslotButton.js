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

  return createElement("button", {
    className,
    attrs: hasPrice ? { "data-has-price": "true" } : {},
    onClick: slot.status === "available" || slot.status === "mine" ? onSelect : null,
    children: [
      createElement("strong", { text: slot.label }),
      price,
    ],
  });
};
