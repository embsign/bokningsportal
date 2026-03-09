import { Header } from "./components/Header.js";
import { ServiceSelection } from "./screens/ServiceSelection.js";
import { DateSelection } from "./screens/DateSelection.js";
import { TimeSelection } from "./screens/TimeSelection.js";
import { Confirmation } from "./screens/Confirmation.js";
import { AdminDashboard } from "./screens/AdminDashboard.js";
import { BookingObjectModal } from "./components/BookingObjectModal.js";
import { ImportUsersModal } from "./components/ImportUsersModal.js";
import { UserPickerModal } from "./components/UserPickerModal.js";
import { EditUserModal } from "./components/EditUserModal.js";
import { ReportModal } from "./components/ReportModal.js";
import { createBookingSummary } from "./mocks/bookingSummary.js";
import { bookings } from "./mocks/bookings.js";
import { adminUser, bookingObjects, bookingGroups, users } from "./mocks/admin.js";
import { services } from "./mocks/services.js";
import { user } from "./mocks/user.js";
import { getMonthAvailability, getMonthLabel } from "./mocks/availability.js";
import { getWeekStart, getWeekTimeslots } from "./mocks/timeslots.js";
import { createStore } from "./hooks/useStore.js";
import { createElement, clearElement } from "./hooks/dom.js";

const app = document.getElementById("app");
const path = window.location.pathname;
const hashPath = window.location.hash.replace(/^#/, "");
const routePath = hashPath || path;

if (routePath.startsWith("/admin/")) {
  const buildRegexEffect = (samples, regexSource) => {
    if (!regexSource) {
      return samples.map((original) => ({ original, value: "—" }));
    }
    let regex;
    try {
      regex = new RegExp(regexSource);
    } catch (error) {
      return samples.map((original) => ({ original, value: "Ogiltig regex" }));
    }
    return samples.map((original) => {
      const match = regex.exec(original);
      if (!match) {
        return { original, value: "Ingen träff" };
      }
      if (match.length > 1) {
        return { original, value: match.slice(1).join("-") };
      }
      return { original, value: match[0] };
    });
  };

  const houseSamples = [
    "1-LGH1001 /1001 Kor tag1",
    "1-LGH1012 /1108 iLoq Blå",
    "6-LGH1132/1204 iLoq Grön",
    "6-LGH1133 /1205 tag1",
    "6-LGH1133/1205 iLoq Röd",
  ];

  const apartmentSamples = [
    "1-LGH1001 /1001 Kor tag1",
    "1-LGH1012 /1108 iLoq Blå",
    "6-LGH1132/1204 iLoq Grön",
    "6-LGH1133 /1205 tag1",
    "6-LGH1133/1205 iLoq Röd",
  ];

  const adminStore = createStore({
    bookingObjects,
    bookingGroups,
    users,
    modalOpen: false,
    modalMode: "add",
    selectorOpenKey: null,
    groupModalOpen: false,
    groupNameDraft: "",
    importOpen: false,
    importStep: 1,
    importFileName: "",
    importRowCount: 0,
    importFocus: "houseRegex",
    userPickerOpen: false,
    userQuery: "",
    editUserOpen: false,
    editUserId: null,
    editUserForm: {
      identity: "",
      apartmentId: "",
      house: "",
      groups: [],
      rfid: "",
      active: true,
      admin: false,
    },
    userSelectorOpen: false,
    reportOpen: false,
    reportStep: 1,
    reportMonth: "",
    reportBookingObjectId: "",
    modalForm: {
      name: "",
      type: "Tidspass",
      slotDuration: "",
      windowMin: "",
      windowMax: "",
      maxBookings: "",
      groupId: "",
      priceWeekday: "",
      priceWeekend: "",
      status: "Aktiv",
      allowHouses: [],
      allowGroups: [],
      allowApartments: [],
      denyHouses: [],
      denyGroups: [],
      denyApartments: [],
    },
    editId: null,
  });

  const openModal = (mode, item) => {
    adminStore.setState({
      modalOpen: true,
      modalMode: mode,
      editId: item?.id || null,
      modalForm: item
        ? {
            name: item.name,
            type: item.type,
            slotDuration: item.slotDuration,
            windowMin: item.windowMin,
            windowMax: item.windowMax,
            maxBookings: item.maxBookings,
            groupId: item.groupId || "",
            priceWeekday: item.priceWeekday,
            priceWeekend: item.priceWeekend,
            status: item.status,
            allowHouses: item.allowHouses || [],
            allowGroups: item.allowGroups || [],
            allowApartments: item.allowApartments || [],
            denyHouses: item.denyHouses || [],
            denyGroups: item.denyGroups || [],
            denyApartments: item.denyApartments || [],
          }
        : {
            name: "",
            type: "Tidspass",
            slotDuration: "",
            windowMin: "",
            windowMax: "",
            maxBookings: "",
            groupId: "",
            priceWeekday: "",
            priceWeekend: "",
            status: "Aktiv",
            allowHouses: [],
            allowGroups: [],
            allowApartments: [],
            denyHouses: [],
            denyGroups: [],
            denyApartments: [],
          },
    });
  };

  const renderAdmin = () => {
    const state = adminStore.getState();
    clearElement(app);
    const shell = createElement("div", { className: "app-shell" });

    const modal = BookingObjectModal({
      open: state.modalOpen,
      mode: state.modalMode,
      form: state.modalForm,
      bookingGroups: state.bookingGroups,
      onChange: (field, value) =>
        adminStore.setState((prev) => ({
          modalForm: { ...prev.modalForm, [field]: value },
        })),
      onSelectGroup: (groupId) =>
        adminStore.setState((prev) => {
          if (!groupId) {
            return { modalForm: { ...prev.modalForm, groupId: "" } };
          }
          const group = prev.bookingGroups.find((item) => item.id === groupId);
          return {
            modalForm: {
              ...prev.modalForm,
              groupId,
              maxBookings: group?.maxBookings || prev.modalForm.maxBookings,
            },
          };
        }),
      onUpdateGroupMax: (value) =>
        adminStore.setState((prev) => {
          const groupId = prev.modalForm.groupId;
          if (!groupId) {
            return {};
          }
          return {
            bookingGroups: prev.bookingGroups.map((group) =>
              group.id === groupId ? { ...group, maxBookings: value } : group
            ),
          };
        }),
      groupModalOpen: state.groupModalOpen,
      groupNameDraft: state.groupNameDraft,
      onGroupNameChange: (value) => adminStore.setState({ groupNameDraft: value }),
      onOpenGroupModal: () => adminStore.setState({ groupModalOpen: true, groupNameDraft: "" }),
      onCloseGroupModal: () => adminStore.setState({ groupModalOpen: false }),
      onCreateGroup: () =>
        adminStore.setState((prev) => {
          const name = prev.groupNameDraft?.trim();
          if (!name) {
            return { groupModalOpen: false };
          }
          const id = `group-${Date.now()}`;
          const newGroup = {
            id,
            name,
            maxBookings: prev.modalForm.maxBookings || "1",
          };
          return {
            bookingGroups: [...prev.bookingGroups, newGroup],
            modalForm: { ...prev.modalForm, groupId: id, maxBookings: newGroup.maxBookings },
            groupModalOpen: false,
            groupNameDraft: "",
          };
        }),
      onClose: () => adminStore.setState({ modalOpen: false }),
      selectorOpenKey: state.selectorOpenKey,
      onOpenSelector: (key) => adminStore.setState({ selectorOpenKey: key }),
      onCloseSelector: () => adminStore.setState({ selectorOpenKey: null }),
      onSave: () =>
        adminStore.setState((prev) => {
          const form = prev.modalForm;
          if (prev.modalMode === "edit") {
            return {
              bookingObjects: prev.bookingObjects.map((item) =>
                item.id === prev.editId
                  ? { ...item, ...form }
                  : item
              ),
              modalOpen: false,
            };
          }
          const newItem = {
            id: `obj-${Date.now()}`,
            ...form,
          };
          return {
            bookingObjects: [...prev.bookingObjects, newItem],
            modalOpen: false,
          };
        }),
    });

    const importModal = ImportUsersModal({
      open: state.importOpen,
      step: state.importStep,
      form: {
        fileName: state.importFileName,
        rowCount: state.importRowCount || 17,
        houseRegex: state.houseRegex || "",
        apartmentRegex: state.apartmentRegex || "",
        groupSeparator: state.groupSeparator || "|",
        addNew: state.addNew !== false,
        updateChanged: state.updateChanged !== false,
        removeMissing: state.removeMissing === true,
        progress: state.importProgress || 0,
        houseField: state.houseField || "Placering",
        apartmentField: state.apartmentField || "Lägenhet",
        adminGroups: state.adminGroups || [],
        adminSelectorOpen: state.adminSelectorOpen || false,
        adminGroupOptions: ["Styrelse", "Förvaltare", "Jour"],
        effectHouse: buildRegexEffect(houseSamples, state.houseRegex || ""),
        effectApartment: buildRegexEffect(apartmentSamples, state.apartmentRegex || ""),
        effectGroups: [
          { original: "Boende|Gym Norra gaveln Hus 1", values: ["Boende", "Gym Norra gaveln Hus 1"] },
          { original: "Boende", values: ["Boende"] },
          { original: "Boende H6", values: ["Boende H6"] },
        ],
      },
      mapping: {
        headers: [
          "Namn",
          "Identitetstyp (0=em 1=kod 2=rf 3=mifare)",
          "Identitetsid",
          "Identitetsstatus (0=på 1=av)",
          "PIN",
          "Starttid",
          "Sluttid",
          "Behörighetsgrupp",
          "Email",
          "Person Telefonnr",
          "Person Snabbnr",
          "Person Linje (0=lokal 1=analog 2=extern)",
          "OrgGrupp",
          "Placering",
          "Våning",
          "Lägenhet",
          "Referensid",
          "OrgTelefonnr",
          "OrgSnabbnr",
          "OrgLinje (0=lokal 1=analog 2=extern)",
          "Fritext1",
          "Fritext2",
          "Frinummer",
          "Utökad fritext",
          "Dörrstyrning",
          "Relästyrning",
        ],
        identityField: state.identityField || "OrgGrupp",
        groupsField: state.groupsField || "Behörighetsgrupp",
        rfidField: state.rfidField || "Identitetsid",
        activeField: state.activeField || "Identitetsstatus (0=på 1=av)",
      },
      preview: {
        newCount: 12,
        updatedCount: 5,
        unchangedCount: 94,
        removedCount: 3,
        rows: [
          {
            identity: "1-LGH1001 /1001 Kor tag1",
            apartmentId: "1001",
            house: "1",
            status: "Ny",
            statusClass: "preview-new",
            admin: true,
          },
          {
            identity: "1-LGH1001 /1001 Kor tag3",
            apartmentId: "1001",
            house: "1",
            status: "Oförändrad",
            statusClass: "preview-unchanged",
            admin: false,
          },
          {
            identity: "1-LGH1012 /1108 iLoq Blå",
            apartmentId: "1108",
            house: "1",
            status: "Uppdateras",
            statusClass: "preview-updated",
            admin: true,
          },
          {
            identity: "6-LGH1133 /1205 tag1",
            apartmentId: "1205",
            house: "6",
            status: "Oförändrad",
            statusClass: "preview-unchanged",
            admin: false,
          },
          {
            identity: "6-LGH1133/1205 iLoq Röd",
            apartmentId: "1205",
            house: "6",
            status: "Tas bort",
            statusClass: "preview-removed",
            admin: false,
          },
        ],
      },
      onClose: () => adminStore.setState({ importOpen: false, importStep: 1 }),
      onNext: () =>
        adminStore.setState((prev) => ({ importStep: Math.min(prev.importStep + 1, 5) })),
      onPrev: () =>
        adminStore.setState((prev) => ({ importStep: Math.max(prev.importStep - 1, 1) })),
      onImport: () =>
        adminStore.setState({
          importStep: 6,
          importProgress: 35,
        }),
      onChange: (field, value) =>
        adminStore.setState((prev) => {
          switch (field) {
            case "fileName":
              return { importFileName: value, importRowCount: 17 };
            case "identityField":
            case "groupsField":
            case "rfidField":
            case "activeField":
            case "houseRegex":
            case "apartmentRegex":
            case "houseField":
            case "apartmentField":
            case "groupSeparator":
            case "addNew":
            case "updateChanged":
            case "removeMissing":
            case "adminGroups":
            case "adminSelectorOpen":
            case "importFocus":
              return { [field]: value };
            default:
              return prev;
          }
        }),
    });

    const userPickerModal = UserPickerModal({
      open: state.userPickerOpen,
      users: state.users,
      query: state.userQuery,
      onQueryChange: (value) => adminStore.setState({ userQuery: value }),
      onSelect: (user) =>
        adminStore.setState({
          userPickerOpen: false,
          userQuery: "",
          editUserOpen: true,
          editUserId: user.id,
          editUserForm: {
            identity: user.identity,
            apartmentId: user.apartmentId,
            house: user.house,
            groups: user.groups || [],
            rfid: user.rfid || "",
            active: user.active !== false,
            admin: user.admin === true,
          },
        }),
      onClose: () => adminStore.setState({ userPickerOpen: false, userQuery: "" }),
    });

    const editUserModal = EditUserModal({
      open: state.editUserOpen,
      form: state.editUserForm,
      groupOptions: ["Boende", "Styrelse", "Gym Norra gaveln Hus 1", "Boende H6", "Bastu"],
      selectorOpen: state.userSelectorOpen,
      onOpenSelector: () => adminStore.setState({ userSelectorOpen: true }),
      onCloseSelector: () => adminStore.setState({ userSelectorOpen: false }),
      onChange: (field, value) =>
        adminStore.setState((prev) => ({ editUserForm: { ...prev.editUserForm, [field]: value } })),
      onClose: () => adminStore.setState({ editUserOpen: false, userSelectorOpen: false }),
      onSave: () =>
        adminStore.setState((prev) => ({
          users: prev.users.map((user) =>
            user.id === prev.editUserId ? { ...user, ...prev.editUserForm } : user
          ),
          editUserOpen: false,
          userSelectorOpen: false,
        })),
    });

    const reportModal = ReportModal({
      open: state.reportOpen,
      step: state.reportStep,
      form: {
        month: state.reportMonth,
        bookingObjectId: state.reportBookingObjectId,
      },
      bookingObjects: state.bookingObjects,
      onClose: () =>
        adminStore.setState({ reportOpen: false, reportStep: 1, reportMonth: "", reportBookingObjectId: "" }),
      onNext: () =>
        adminStore.setState((prev) => ({ reportStep: Math.min(prev.reportStep + 1, 3) })),
      onPrev: () =>
        adminStore.setState((prev) => ({ reportStep: Math.max(prev.reportStep - 1, 1) })),
      onDownload: () => {
        const objectName =
          state.bookingObjects.find((item) => item.id === state.reportBookingObjectId)?.name || "Okänt objekt";
        const csv = [
          "Bokningsobjekt,Månad,Antal bokningar,Summa (kr)",
          `${objectName},${state.reportMonth},12,1800`,
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `debiteringsunderlag-${state.reportMonth || "rapport"}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      },
      onChange: (field, value) =>
        adminStore.setState((prev) => {
          switch (field) {
            case "month":
              return { reportMonth: value };
            case "bookingObjectId":
              return { reportBookingObjectId: value };
            default:
              return prev;
          }
        }),
    });

    if (state.importStep === 5 && (state.importProgress || 0) < 100) {
      setTimeout(() => {
        adminStore.setState((prev) => ({
          importProgress: Math.min((prev.importProgress || 0) + 15, 100),
        }));
      }, 400);
    }

    shell.append(
      Header({ apartmentId: adminUser.association }),
      AdminDashboard({
        adminUser,
        bookingObjects: state.bookingObjects,
        onAdd: () => openModal("add"),
        onCopy: (item) => openModal("copy", item),
        onEdit: (item) => openModal("edit", item),
        onImportUsers: () => adminStore.setState({ importOpen: true, importStep: 1 }),
        onEditUsers: () => adminStore.setState({ userPickerOpen: true }),
        onCreateReport: () => adminStore.setState({ reportOpen: true, reportStep: 1 }),
        modal,
        importModal,
        userPickerModal,
        editUserModal,
        reportModal,
      })
    );
    app.append(shell);

    if (state.groupModalOpen) {
      const input = app.querySelector('[data-autofocus="group-name"]');
      if (input) {
        input.focus();
        input.setSelectionRange?.(input.value.length, input.value.length);
      }
    }

    if (state.importOpen && state.importStep === 3 && state.importFocus) {
      const input = app.querySelector(`[data-autofocus="${state.importFocus}"]`);
      if (input) {
        input.focus();
        input.setSelectionRange?.(input.value.length, input.value.length);
      }
    }
  };

  adminStore.subscribe(renderAdmin);
  renderAdmin();
} else if (routePath.startsWith("/user/")) {

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
} else {
  clearElement(app);
  const shell = createElement("div", { className: "app-shell" });
  shell.append(
    Header({ apartmentId: "Välkommen" }),
    createElement("div", {
      className: "card",
      children: [
        createElement("div", { className: "screen-title", text: "BRF Bokningsportal" }),
        createElement("div", {
          className: "screen-subtitle",
          text:
            "Gå till /#/user/{UUID-token} för boende eller /#/admin/{UUID-token} för admin (hash används utan backend).",
        }),
      ],
    })
  );
  app.append(shell);
}
