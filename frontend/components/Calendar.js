import { createElement } from "../hooks/dom.js";

const weekDays = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

export const Calendar = ({ monthLabel, days, selectedDateId, onPrev, onNext, canPrev, canNext, onSelect }) => {
  const header = createElement("div", {
    className: "calendar-header",
    children: [
      createElement("button", {
        className: "secondary-button",
        text: "‹ Föregående",
        onClick: onPrev,
        attrs: { disabled: !canPrev },
      }),
      createElement("div", { className: "calendar-title", text: monthLabel }),
      createElement("button", {
        className: "secondary-button",
        text: "Nästa ›",
        onClick: onNext,
        attrs: { disabled: !canNext },
      }),
    ],
  });

  const weekdayRow = weekDays.map((day, index) =>
    createElement("div", {
      className: `calendar-weekday ${index === 6 ? "weekday-sunday" : ""}`.trim(),
      text: day,
    })
  );

  const dayCards = days.map((day) => {
    const isSelected = selectedDateId === day.id;
    const className = [
      "day-card",
      day.status,
      isSelected ? "selected" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const weekday = day.date.toLocaleDateString("sv-SE", { weekday: "short" });
    return createElement("div", {
      className,
      onClick: day.status === "disabled" ? null : () => onSelect(day),
      children: [
        createElement("span", { className: "day-weekday", text: weekday }),
        createElement("strong", { text: day.label }),
      ],
    });
  });

  return createElement("div", {
    className: "calendar card",
    children: [
      header,
      createElement("div", { className: "calendar-weekdays", children: weekdayRow }),
      createElement("div", { className: "calendar-grid", children: dayCards }),
    ],
  });
};

