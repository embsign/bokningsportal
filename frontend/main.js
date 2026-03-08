import { Header } from "./components/Header.js";
import { ServiceSelection } from "./screens/ServiceSelection.js";
import { DateSelection } from "./screens/DateSelection.js";
import { TimeSelection } from "./screens/TimeSelection.js";
import { Confirmation } from "./screens/Confirmation.js";
import { createBookingSummary } from "./mocks/bookingSummary.js";
import { bookings } from "./mocks/bookings.js";
import { services } from "./mocks/services.js";
import { user } from "./mocks/user.js";
import { getMonthAvailability, getMonthLabel } from "./mocks/availability.js";
import { getWeekStart, getWeekTimeslots } from "./mocks/timeslots.js";
import { createStore } from "./hooks/useStore.js";
import { createElement, clearElement } from "./hooks/dom.js";

const app = document.getElementById("app");

const today = new Date();
const initialMonth = { year: today.getFullYear(), monthIndex: today.getMonth() };

const store = createStore({
  step: 1,
  selectedService: null,
  selectedDate: null,
  selectedSlot: null,
  monthCursor: initialMonth,
  weekCursor: getWeekStart(today),
  confirmed: false,
  bookings,
  cancelModalOpen: false,
  cancelBooking: null,
  cancelledDayIds: [],
  cancelledSlotIds: [],
  qrWarningOpen: false,
  qrGenerated: false,
  qrModalOpen: false,
  uiStates: {
    service: "normal",
    date: "normal",
    time: "normal",
    confirmation: "normal",
  },
});

const canMoveMonth = (year, monthIndex) => {
  const current = new Date();
  const target = new Date(year, monthIndex, 1);
  const max = new Date(current.getFullYear(), current.getMonth() + 2, 1);
  return target >= new Date(current.getFullYear(), current.getMonth(), 1) && target <= max;
};

const canMoveWeek = (weekDate) => {
  const currentWeek = getWeekStart(new Date());
  const max = new Date(currentWeek);
  max.setDate(max.getDate() + 21);
  return weekDate >= currentWeek && weekDate <= max;
};

const getWeekLabel = (weekStart) => `Vecka ${getWeekNumber(weekStart)}`;

const formatDayLabel = (date) =>
  date
    .toLocaleDateString("sv-SE", { weekday: "short" })
    .replace(".", "")
    .replace(/^./, (char) => char.toUpperCase());

const formatDateLabel = (date) => `${date.getDate()}/${date.getMonth() + 1}`;

const buildCancelBooking = ({ date, timeLabel, serviceName, sourceId }) => ({
  id: sourceId,
  serviceName,
  dayLabel: formatDayLabel(date),
  dateLabel: formatDateLabel(date),
  timeLabel,
  status: "mine",
});

const bookingMatches = (booking, target) => {
  if (!target) {
    return false;
  }
  return (
    booking.serviceName === target.serviceName &&
    booking.dateLabel === target.dateLabel &&
    booking.timeLabel === target.timeLabel
  );
};

const getWeekNumber = (date) => {
  const temp = new Date(date.getTime());
  temp.setHours(0, 0, 0, 0);
  temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7));
  const week1 = new Date(temp.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((temp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
};

const render = () => {
  const state = store.getState();

  if (state.step === 1 && services.length === 1 && !state.selectedService) {
    store.setState({ selectedService: services[0], step: 2 });
    return;
  }

  const isMobile = window.innerWidth <= 600;
  clearElement(app);
  const shell = createElement("div", { className: "app-shell" });

  const headerBack =
    state.step === 1
      ? null
      : state.step === 2
        ? () => store.setState({ step: 1 })
        : () => store.setState({ step: 2 });

  shell.append(
    Header({
      apartmentId: user.apartmentId,
      showBack: Boolean(headerBack),
      onBack: headerBack || undefined,
    })
  );

  let screen;
  let footer;

  if (state.step === 1) {
    screen = ServiceSelection({
      services,
      selectedService: state.selectedService,
      onSelect: (service) =>
        store.setState({
          selectedService: service,
          selectedDate: null,
          selectedSlot: null,
          step: 2,
          confirmed: false,
        }),
      bookings: state.bookings,
      cancelModalOpen: state.cancelModalOpen,
      cancelBooking: state.cancelBooking,
      onOpenCancel: (booking) =>
        store.setState({ cancelModalOpen: true, cancelBooking: booking }),
      onCloseCancel: () => store.setState({ cancelModalOpen: false, cancelBooking: null }),
      onConfirmCancel: () =>
        store.setState((prev) => ({
          bookings: prev.bookings.filter((item) => !bookingMatches(item, prev.cancelBooking)),
          cancelModalOpen: false,
          cancelBooking: null,
        })),
      qrWarningOpen: state.qrWarningOpen,
      qrGenerated: state.qrGenerated,
      qrModalOpen: state.qrModalOpen,
      onOpenQrWarning: () => store.setState({ qrWarningOpen: true }),
      onCloseQrWarning: () => store.setState({ qrWarningOpen: false }),
      onConfirmQr: () =>
        store.setState({
          qrWarningOpen: false,
          qrGenerated: true,
          qrModalOpen: true,
        }),
      onCloseQrModal: () => store.setState({ qrModalOpen: false }),
      isMobile,
      state: state.uiStates.service,
    });

    footer = null;
  }

  if (state.step === 2 && state.selectedService?.bookingType === "full-day") {
    const { year, monthIndex } = state.monthCursor;
    const days = getMonthAvailability(year, monthIndex).map((day) => {
      if (state.cancelledDayIds.includes(day.id)) {
        return { ...day, status: "available" };
      }
      const matchesBooking = state.bookings.some(
        (booking) =>
          booking.serviceName === state.selectedService?.name &&
          booking.timeLabel === "Heldag" &&
          booking.dateLabel === formatDateLabel(day.date)
      );
      if (day.status === "disabled") {
        return day;
      }
      if (matchesBooking) {
        return { ...day, status: "mine" };
      }
      return { ...day, status: "available" };
    });
    const visibleDays = isMobile ? days.filter((day) => day.status !== "disabled") : days;

    screen = DateSelection({
      monthLabel: getMonthLabel(year, monthIndex),
      days: visibleDays,
      selectedDateId: state.selectedDate?.id,
      onSelect: (day) => {
        if (day.status === "mine") {
          store.setState({
            cancelModalOpen: true,
            cancelBooking: buildCancelBooking({
              date: day.date,
              timeLabel: "Heldag",
              serviceName: state.selectedService?.name,
              sourceId: day.id,
            }),
          });
          return;
        }
        if (day.status !== "available") {
          return;
        }
        store.setState({
          selectedDate: day,
          selectedSlot: null,
          step: 3,
          confirmed: false,
        });
      },
      onPrev: () => {
        const nextMonth = new Date(year, monthIndex - 1, 1);
        if (canMoveMonth(nextMonth.getFullYear(), nextMonth.getMonth())) {
          store.setState({ monthCursor: { year: nextMonth.getFullYear(), monthIndex: nextMonth.getMonth() } });
        }
      },
      onNext: () => {
        const nextMonth = new Date(year, monthIndex + 1, 1);
        if (canMoveMonth(nextMonth.getFullYear(), nextMonth.getMonth())) {
          store.setState({ monthCursor: { year: nextMonth.getFullYear(), monthIndex: nextMonth.getMonth() } });
        }
      },
      canPrev: canMoveMonth(year, monthIndex - 1),
      canNext: canMoveMonth(year, monthIndex + 1),
      state: state.uiStates.date,
      cancelModalOpen: state.cancelModalOpen,
      cancelBooking: state.cancelBooking,
      onCloseCancel: () => store.setState({ cancelModalOpen: false, cancelBooking: null }),
      onConfirmCancel: () =>
        store.setState((prev) => ({
          cancelledDayIds: [...prev.cancelledDayIds, prev.cancelBooking?.id].filter(Boolean),
          bookings: prev.bookings.filter((item) => !bookingMatches(item, prev.cancelBooking)),
          cancelModalOpen: false,
          cancelBooking: null,
        })),
    });

    footer = null;
  }

  if (state.step === 2 && state.selectedService?.bookingType !== "full-day") {
    const weekSlots = getWeekTimeslots(state.weekCursor, state.selectedService?.bookingType).map((day) => ({
      ...day,
      slots: day.slots.map((slot) =>
        state.cancelledSlotIds.includes(slot.id) ? { ...slot, status: "available" } : slot
      ),
    }));
    const visibleSlots = isMobile
      ? weekSlots.filter((day) => day.slots.some((slot) => slot.status !== "disabled"))
      : weekSlots;
    screen = TimeSelection({
      weekLabel: getWeekLabel(state.weekCursor),
      weekSlots: visibleSlots,
      selectedSlotId: state.selectedSlot?.id,
      onSelect: (slot) => {
        if (slot.status === "mine") {
          store.setState({
            cancelModalOpen: true,
            cancelBooking: buildCancelBooking({
              date: slot.date,
              timeLabel: slot.label,
              serviceName: state.selectedService?.name,
              sourceId: slot.id,
            }),
          });
          return;
        }
        if (slot.status !== "available") {
          return;
        }
        store.setState({
          selectedSlot: slot,
          selectedDate: { id: slot.id, date: slot.date },
          step: 3,
        });
      },
      onPrev: () => {
        const prevWeek = new Date(state.weekCursor);
        prevWeek.setDate(prevWeek.getDate() - 7);
        if (canMoveWeek(prevWeek)) {
          store.setState({ weekCursor: prevWeek });
        }
      },
      onNext: () => {
        const nextWeek = new Date(state.weekCursor);
        nextWeek.setDate(nextWeek.getDate() + 7);
        if (canMoveWeek(nextWeek)) {
          store.setState({ weekCursor: nextWeek });
        }
      },
      canPrev: canMoveWeek(new Date(state.weekCursor.getFullYear(), state.weekCursor.getMonth(), state.weekCursor.getDate() - 7)),
      canNext: canMoveWeek(new Date(state.weekCursor.getFullYear(), state.weekCursor.getMonth(), state.weekCursor.getDate() + 7)),
      state: state.uiStates.time,
      cancelModalOpen: state.cancelModalOpen,
      cancelBooking: state.cancelBooking,
      onCloseCancel: () => store.setState({ cancelModalOpen: false, cancelBooking: null }),
      onConfirmCancel: () =>
        store.setState((prev) => ({
          cancelledSlotIds: [...prev.cancelledSlotIds, prev.cancelBooking?.id].filter(Boolean),
          bookings: prev.bookings.filter((item) => !bookingMatches(item, prev.cancelBooking)),
          cancelModalOpen: false,
          cancelBooking: null,
        })),
    });

    footer = null;
  }

  if (state.step === 3) {
    const summary = createBookingSummary({
      service: state.selectedService,
      date: state.selectedDate?.date,
      timeslot: state.selectedSlot,
    });

    screen = Confirmation({
      summary,
      state: state.uiStates.confirmation,
      confirmed: state.confirmed,
      isMobile,
      onBack: () => store.setState({ step: 2 }),
      onConfirm: () => store.setState({ confirmed: true }),
      confirmDisabled: !summary,
    });

    footer = null;
  }

  if (screen) {
    shell.append(screen);
  }
  if (footer) {
    shell.append(footer);
  }
  app.append(shell);
};

store.subscribe(render);
render();
