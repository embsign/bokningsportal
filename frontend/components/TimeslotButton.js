import { createElement } from "../hooks/dom.js";

export const TimeslotButton = ({ slot, isSelected, onSelect }) => {
  const className = [
    "timeslot-button",
    slot.status,
    isSelected ? "selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const price =
    slot.priceText && slot.priceText.trim().length > 0
      ? createElement("span", { text: slot.priceText })
      : null;

  return createElement("button", {
    className,
    onClick: slot.status === "available" || slot.status === "mine" ? onSelect : null,
    children: [
      createElement("strong", { text: slot.label }),
      price,
    ],
  });
};
