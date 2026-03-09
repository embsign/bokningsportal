import { createElement } from "../hooks/dom.js";
import { TimeslotButton } from "../components/TimeslotButton.js";
import { CancelBookingModal } from "../components/CancelBookingModal.js";

const legend = () =>
  createElement("div", {
    className: "status-legend",
    children: [
      legendItem("dot-available", "Ledig"),
      legendItem("dot-booked", "Upptagen"),
      legendItem("dot-mine", "Bokad"),
      legendItem("dot-disabled", "Passerad"),
    ],
  });

const legendItem = (dotClass, label) =>
  createElement("div", {
    className: "legend-item",
    children: [
      createElement("span", { className: `legend-dot ${dotClass}` }),
      createElement("span", { text: label }),
    ],
  });

export const TimeSelection = ({
  weekLabel,
  weekSlots,
  selectedSlotId,
  onSelect,
  onPrev,
  onNext,
  canPrev,
  canNext,
  state,
  cancelModalOpen,
  cancelBooking,
  onCloseCancel,
  onConfirmCancel,
}) => {
  const header = createElement("div", {
    className: "screen-header",
    children: [
      createElement("div", {
        children: [createElement("div", { className: "week-label", text: weekLabel })],
      }),
      createElement("div", {
        className: "header-actions",
        children: [
          createElement("button", {
            className: "secondary-button",
            text: "‹ Föregående vecka",
            onClick: onPrev,
            attrs: { disabled: !canPrev },
          }),
          createElement("button", {
            className: "secondary-button",
            text: "Nästa vecka ›",
            onClick: onNext,
            attrs: { disabled: !canNext },
          }),
        ],
      }),
    ],
  });

  let content;
  if (state === "loading") {
    content = createElement("div", {
      className: "card calendar",
      children: [
        createElement("div", { className: "skeleton skeleton-row" }),
        createElement("div", { className: "skeleton skeleton-row", attrs: { style: "height: 260px; margin-top: 16px;" } }),
      ],
    });
  } else if (state === "error") {
    content = createElement("div", { className: "error-state", text: "Kunde inte ladda tider." });
  } else if (!weekSlots.length) {
    content = createElement("div", { className: "empty-state", text: "Inga lediga tider hittades." });
  } else {
    const columns = weekSlots.map((day, index) =>
      createElement("div", {
        className: "timeslot-column",
        children: [
          createElement("div", {
            className: `timeslot-header ${index === 6 ? "weekday-sunday" : ""}`.trim(),
            text: day.label,
          }),
          ...day.slots.map((slot) =>
            TimeslotButton({
              slot,
              isSelected: selectedSlotId === slot.id,
              onSelect: () => onSelect(slot),
            })
          ),
        ],
      })
    );

    content = createElement("div", { className: "timeslot-grid", children: columns });
  }

  const cancelModal = cancelModalOpen
    ? CancelBookingModal({
        booking: cancelBooking,
        onClose: onCloseCancel,
        onConfirm: onConfirmCancel,
      })
    : null;

  return createElement("section", {
    className: "screen",
    children: [header, content, legend(), cancelModal].filter(Boolean),
  });
};
