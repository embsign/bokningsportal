import { createElement } from "../hooks/dom.js";
import { Calendar } from "../components/Calendar.js";
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

export const DateSelection = ({
  monthLabel,
  days,
  selectedDateId,
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
      createElement("div"),
    ],
  });

  const hasDays = days.length > 0;

  let content;
  if (state === "loading" && !hasDays) {
    content = createElement("div", {
      className: "card calendar calendar-panel",
      children: [
        createElement("div", { className: "skeleton skeleton-row" }),
        createElement("div", { className: "skeleton skeleton-row", attrs: { style: "height: 240px; margin-top: 16px;" } }),
      ],
    });
  } else if (state === "error" && !hasDays) {
    content = createElement("div", { className: "error-state", text: "Kunde inte ladda datum." });
  } else if (!hasDays) {
    content = createElement("div", { className: "empty-state", text: "Inga lediga datum hittades." });
  } else {
    content = Calendar({
      monthLabel,
      days,
      selectedDateId,
      onSelect,
      onPrev,
      onNext,
      canPrev,
      canNext,
    });
  }

  const statusSlot = createElement("div", {
    className: "screen-status-slot",
    children:
      state === "loading" && hasDays
        ? [createElement("div", { className: "inline-loading", text: "Laddar tillgänglighet…" })]
        : [],
  });

  const cancelModal = cancelModalOpen
    ? CancelBookingModal({
        booking: cancelBooking,
        onClose: onCloseCancel,
        onConfirm: onConfirmCancel,
      })
    : null;

  return createElement("section", {
    className: "screen",
    children: [header, statusSlot, content, legend(), cancelModal].filter(Boolean),
  });
};
