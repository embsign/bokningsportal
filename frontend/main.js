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
import { createBookingSummary } from "./utils/bookingSummary.js";
import {
  buildCalendarDownloadPageUrl,
  buildCalendarQrImageUrl,
  downloadCalendarEvent,
  parseCalendarEventFromUrl,
} from "./utils/calendarExport.js";
import { getSession } from "./api/session.js";
import { setAccessToken } from "./api/client.js";
import { getServices } from "./api/services.js";
import { getCurrentBookings, createBooking, cancelBooking } from "./api/bookings.js";
import { getMonthAvailability, getMonthLabel, getWeekAvailability, getWeekStart } from "./api/availability.js";
import {
  getBookingGroups,
  getBookingObjects,
  getUsers,
  updateUser,
  createBookingGroup,
  createBookingObject,
  updateBookingObject,
  getImportRules,
  saveImportRules,
  previewImport,
  applyImport,
  downloadReportCsv,
} from "./api/admin.js";
import { createStore } from "./hooks/useStore.js";
import { createElement, clearElement } from "./hooks/dom.js";

const app = document.getElementById("app");
const path = window.location.pathname;
const hashPath = window.location.hash.replace(/^#/, "");
const routePath = hashPath || path;
const openHelp = () => {
  window.alert(
    "Hjälp\n\nBoka genom att välja objekt, vecka/datum och tid.\nVid problem med behörighet eller bokning, kontakta styrelsen/förvaltaren."
  );
};
const logout = () => {
  setAccessToken(null);
  window.location.assign("/");
};

const renderCalendarDownloadScreen = () => {
  clearElement(app);
  const shell = createElement("div", { className: "app-shell" });
  const url = new URL(window.location.href);
  const eventData = parseCalendarEventFromUrl(url);
  const autoDownloaded = eventData ? downloadCalendarEvent(eventData) : false;
  shell.append(
    createElement("div", {
      className: "card calendar-download-card",
      children: eventData
        ? [
            createElement("div", { className: "modal-title", text: "Kalenderfil klar" }),
            createElement("div", {
              className: "screen-subtitle",
              text: autoDownloaded
                ? "Nedladdning av kalenderfilen startades automatiskt."
                : "Kunde inte starta automatisk nedladdning.",
            }),
            createElement("button", {
              className: "primary-button",
              text: "Ladda ner igen",
              onClick: () => downloadCalendarEvent(eventData),
            }),
          ]
        : [
            createElement("div", { className: "modal-title", text: "Ogiltig kalenderlänk" }),
            createElement("div", {
              className: "screen-subtitle",
              text: "Länken saknar bokningsinformation.",
            }),
          ],
    })
  );
  app.append(shell);
};

if (routePath.startsWith("/calendar/add")) {
  renderCalendarDownloadScreen();
} else if (routePath.startsWith("/admin/")) {
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
    adminUser: { name: "", association: "" },
    bookingObjects: [],
    bookingGroups: [],
    users: [],
    importRules: null,
    importPreview: null,
    importHeaders: [],
    importCsvText: "",
    importLoading: false,
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
      fullDayStartTime: "12:00",
      fullDayEndTime: "12:00",
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
            fullDayStartTime: item.fullDayStartTime || "12:00",
            fullDayEndTime: item.fullDayEndTime || "12:00",
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
            fullDayStartTime: "12:00",
            fullDayEndTime: "12:00",
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

  let adminInitialized = false;
  const buildImportRules = (state) => ({
    identity_field: state.identityField || state.importRules?.identity_field || "OrgGrupp",
    groups_field: state.groupsField || state.importRules?.groups_field || "Behörighetsgrupp",
    rfid_field: state.rfidField || state.importRules?.rfid_field || "Identitetsid",
    active_field: state.activeField || state.importRules?.active_field || "Identitetsstatus (0=på 1=av)",
    house_field: state.houseField || state.importRules?.house_field || "Placering",
    apartment_field: state.apartmentField || state.importRules?.apartment_field || "Lägenhet",
    house_regex: state.houseRegex || state.importRules?.house_regex || "",
    apartment_regex: state.apartmentRegex || state.importRules?.apartment_regex || "",
    group_separator: state.groupSeparator || state.importRules?.group_separator || "|",
    admin_groups: (state.adminGroups?.length ? state.adminGroups : state.importRules?.admin_groups?.split("|") || []).join("|"),
  });

  const loadAdminData = async () => {
    try {
      const [bookingObjectsData, bookingGroupsData, usersData, rulesData] = await Promise.all([
        getBookingObjects(),
        getBookingGroups(),
        getUsers(),
        getImportRules(),
      ]);
      const rules = rulesData?.rules || null;
      adminStore.setState({
        bookingObjects: bookingObjectsData,
        bookingGroups: bookingGroupsData,
        users: usersData,
        importRules: rules,
        identityField: rules?.identity_field,
        groupsField: rules?.groups_field,
        rfidField: rules?.rfid_field,
        activeField: rules?.active_field,
        houseField: rules?.house_field,
        apartmentField: rules?.apartment_field,
        houseRegex: rules?.house_regex,
        apartmentRegex: rules?.apartment_regex,
        groupSeparator: rules?.group_separator,
        adminGroups: rules?.admin_groups ? rules.admin_groups.split("|").filter(Boolean) : [],
      });
    } catch (error) {
      if (error.status === 403) {
        alert("Behörighet saknas.");
      }
    }
  };

  const initAdmin = async () => {
    if (adminInitialized) {
      return;
    }
    adminInitialized = true;
    const token = routePath.split("/")[2];
    if (token) {
      setAccessToken(token);
    }
    try {
      const session = await getSession();
      adminStore.setState({
        adminUser: {
          name: session.user.apartment_id,
          association: session.tenant.name,
        },
      });
      await loadAdminData();
    } catch (error) {
      if (error.status === 401) {
        alert("Sessionen är ogiltig eller har gått ut.");
      }
    }
  };

  const renderAdmin = () => {
    const state = adminStore.getState();
    const activeElement = state.modalOpen ? document.activeElement : null;
    const modalFocusSnapshot =
      activeElement && activeElement.getAttribute?.("data-focus-key")
        ? {
            key: activeElement.getAttribute("data-focus-key"),
            start:
              typeof activeElement.selectionStart === "number"
                ? activeElement.selectionStart
                : null,
            end:
              typeof activeElement.selectionEnd === "number"
                ? activeElement.selectionEnd
                : null,
          }
        : null;
    clearElement(app);
    const shell = createElement("div", { className: "app-shell" });
    initAdmin();

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
      onCreateGroup: async () => {
        const name = adminStore.getState().groupNameDraft?.trim();
        if (!name) {
          adminStore.setState({ groupModalOpen: false });
          return;
        }
        await createBookingGroup({ name, max_bookings: Number(adminStore.getState().modalForm.maxBookings || 1) });
        await loadAdminData();
        adminStore.setState({ groupModalOpen: false, groupNameDraft: "" });
      },
      onClose: () => adminStore.setState({ modalOpen: false }),
      selectorOpenKey: state.selectorOpenKey,
      onOpenSelector: (key) => adminStore.setState({ selectorOpenKey: key }),
      onCloseSelector: () => adminStore.setState({ selectorOpenKey: null }),
      onSave: async () => {
        const form = adminStore.getState().modalForm;
        if (adminStore.getState().modalMode === "edit") {
          await updateBookingObject(adminStore.getState().editId, form);
        } else {
          await createBookingObject(form);
        }
        await loadAdminData();
        adminStore.setState({ modalOpen: false });
      },
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
        adminGroupOptions: state.importRules?.admin_groups
          ? state.importRules.admin_groups.split("|").filter(Boolean)
          : ["Styrelse", "Förvaltare", "Jour"],
        effectHouse: buildRegexEffect(houseSamples, state.houseRegex || ""),
        effectApartment: buildRegexEffect(apartmentSamples, state.apartmentRegex || ""),
        effectGroups: [
          { original: "Boende|Gym Norra gaveln Hus 1", values: ["Boende", "Gym Norra gaveln Hus 1"] },
          { original: "Boende", values: ["Boende"] },
          { original: "Boende H6", values: ["Boende H6"] },
        ],
      },
      mapping: {
        headers: state.importHeaders?.length ? state.importHeaders : ["OrgGrupp", "Placering", "Lägenhet"],
        identityField: state.identityField || state.importRules?.identity_field || "OrgGrupp",
        groupsField: state.groupsField || state.importRules?.groups_field || "Behörighetsgrupp",
        rfidField: state.rfidField || state.importRules?.rfid_field || "Identitetsid",
        activeField: state.activeField || state.importRules?.active_field || "Identitetsstatus (0=på 1=av)",
      },
      preview: state.importPreview || {
        newCount: 0,
        updatedCount: 0,
        unchangedCount: 0,
        removedCount: 0,
        rows: [],
      },
      onClose: () => adminStore.setState({ importOpen: false, importStep: 1 }),
      onNext: async () => {
        const nextStep = Math.min(state.importStep + 1, 5);
        adminStore.setState({ importStep: nextStep });
        if (nextStep === 5 && state.importCsvText) {
          const rules = buildImportRules(adminStore.getState());
          const preview = await previewImport(state.importCsvText, rules);
          adminStore.setState({
            importPreview: {
              newCount: preview.summary.new,
              updatedCount: preview.summary.updated,
              unchangedCount: preview.summary.unchanged,
              removedCount: preview.summary.removed,
              rows: preview.rows.map((row) => ({
                identity: row.identity,
                apartmentId: row.apartment_id,
                house: row.house,
                status: row.status,
                statusClass:
                  row.status === "Ny"
                    ? "preview-new"
                    : row.status === "Uppdateras"
                      ? "preview-updated"
                      : row.status === "Tas bort"
                        ? "preview-removed"
                        : "preview-unchanged",
                admin: row.admin,
              })),
            },
            importHeaders: preview.headers,
          });
        }
      },
      onPrev: () =>
        adminStore.setState((prev) => ({ importStep: Math.max(prev.importStep - 1, 1) })),
      onImport: async () => {
        adminStore.setState({ importStep: 6, importProgress: 35 });
        const rules = buildImportRules(adminStore.getState());
        await saveImportRules(rules);
        await applyImport(state.importCsvText, rules, {
          add_new: state.addNew !== false,
          update_existing: state.updateChanged !== false,
          remove_missing: state.removeMissing === true,
        });
        adminStore.setState({ importProgress: 100 });
        await loadAdminData();
      },
      onChange: (field, value) =>
        adminStore.setState((prev) => {
          switch (field) {
            case "fileName":
              return { importFileName: value };
            case "file":
              if (value) {
                value.text().then((text) => {
                  adminStore.setState({ importCsvText: text, importRowCount: text.split("\n").length });
                  const rules = buildImportRules(adminStore.getState());
                  previewImport(text, rules).then((preview) =>
                    adminStore.setState({
                      importHeaders: preview.headers,
                      importPreview: {
                        newCount: preview.summary.new,
                        updatedCount: preview.summary.updated,
                        unchangedCount: preview.summary.unchanged,
                        removedCount: preview.summary.removed,
                        rows: preview.rows.map((row) => ({
                          identity: row.identity,
                          apartmentId: row.apartment_id,
                          house: row.house,
                          status: row.status,
                          statusClass:
                            row.status === "Ny"
                              ? "preview-new"
                              : row.status === "Uppdateras"
                                ? "preview-updated"
                                : row.status === "Tas bort"
                                  ? "preview-removed"
                                  : "preview-unchanged",
                          admin: row.admin,
                        })),
                      },
                    })
                  );
                });
              }
              return {};
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
      onSave: async () => {
        await updateUser(state.editUserId, state.editUserForm);
        await loadAdminData();
        adminStore.setState({ editUserOpen: false, userSelectorOpen: false });
      },
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
      onDownload: async () => {
        const csv = await downloadReportCsv(state.reportMonth, state.reportBookingObjectId);
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
      Header({
        apartmentId: state.adminUser?.association || "—",
        onHelp: openHelp,
        onLogout: logout,
      }),
      AdminDashboard({
        adminUser: state.adminUser,
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

    if (modalFocusSnapshot && !state.groupModalOpen) {
      const target = app.querySelector(`[data-focus-key="${modalFocusSnapshot.key}"]`);
      if (target) {
        target.focus();
        if (
          typeof modalFocusSnapshot.start === "number" &&
          typeof modalFocusSnapshot.end === "number" &&
          typeof target.setSelectionRange === "function"
        ) {
          target.setSelectionRange(modalFocusSnapshot.start, modalFocusSnapshot.end);
        }
      }
    }

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
  services: [],
  bookings: [],
  sessionUser: null,
  sessionTenant: null,
  sessionError: null,
  sessionLoading: true,
  availabilityMonthKey: null,
  availabilityMonth: [],
  availabilityWeekKey: null,
  availabilityWeek: [],
  availabilityLoading: false,
  dataLoading: false,
  cancelModalOpen: false,
  cancelBooking: null,
  cancelledDayIds: [],
  cancelledSlotIds: [],
  qrWarningOpen: false,
  qrGenerated: false,
  qrModalOpen: false,
  confirmationCalendarEvent: null,
  uiStates: {
    service: "loading",
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

const canMoveWeek = (weekDate, service = null) => {
  const currentWeek = getWeekStart(new Date());
  const min = new Date(currentWeek);
  const maxWeeksAhead = Number.isFinite(Number(service?.windowMax))
    ? Math.max(0, Number(service.windowMax))
    : 21;
  const max = new Date(currentWeek);
  max.setDate(max.getDate() + maxWeeksAhead * 7);
  return weekDate >= min && weekDate <= max;
};

const getWeekLabel = (weekStart) => `Vecka ${getWeekNumber(weekStart)}`;

const formatDayLabel = (date) =>
  date
    .toLocaleDateString("sv-SE", { weekday: "short" })
    .replace(".", "")
    .replace(/^./, (char) => char.toUpperCase());

const formatDateLabel = (date) => `${date.getDate()}/${date.getMonth() + 1}`;

const normalizeClockTime = (value) => (/^\d{2}:\d{2}$/.test(value || "") ? value : "12:00");

const getFullDayTimeLabel = (service) =>
  `${normalizeClockTime(service?.fullDayStartTime)}-${normalizeClockTime(service?.fullDayEndTime)}`;

const buildFullDayDateRange = (date, service) => {
  const startTime = normalizeClockTime(service?.fullDayStartTime);
  const endTime = normalizeClockTime(service?.fullDayEndTime);
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const start = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMinute, 0, 0));
  const end = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), endHour, endMinute, 0, 0));
  if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
    end.setUTCDate(end.getUTCDate() + 1);
  }
  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
};

const buildCancelBooking = ({ date, timeLabel, serviceName, sourceId }) => ({
  id: sourceId,
  serviceName,
  dayLabel: formatDayLabel(date),
  dateLabel: formatDateLabel(date),
  timeLabel,
  status: "mine",
});

const buildBookingRangeForState = (state) => {
  if (state.selectedSlot?.startTime && state.selectedSlot?.endTime) {
    return {
      startTime: state.selectedSlot.startTime,
      endTime: state.selectedSlot.endTime,
      timeLabel: state.selectedSlot.label,
    };
  }
  if (state.selectedDate?.date) {
    const range = buildFullDayDateRange(state.selectedDate.date, state.selectedService);
    return {
      startTime: range.startTime,
      endTime: range.endTime,
      timeLabel: getFullDayTimeLabel(state.selectedService),
    };
  }
  return null;
};

const buildConfirmationCalendarEvent = (state, range) => {
  if (!state.selectedService || !state.selectedDate?.date || !range?.startTime || !range?.endTime) {
    return null;
  }
  return {
    title: `Bokning: ${state.selectedService.name}`,
    startTime: range.startTime,
    endTime: range.endTime,
    description: `${formatDayLabel(state.selectedDate.date)} ${formatDateLabel(state.selectedDate.date)} ${range.timeLabel}`,
  };
};

const markMonthDayAsMine = (days, selectedDayId) =>
  (days || []).map((day) => (day.id === selectedDayId ? { ...day, status: "mine" } : day));

const markWeekSlotAsMine = (weekDays, selectedSlotId) =>
  (weekDays || []).map((day) => ({
    ...day,
    slots: day.slots.map((slot) => (slot.id === selectedSlotId ? { ...slot, status: "mine" } : slot)),
  }));

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

const findBookingId = (bookingsList, target) =>
  bookingsList.find((booking) => bookingMatches(booking, target))?.id;

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

const loadUserData = async () => {
  store.setState((prev) => ({ dataLoading: true, uiStates: { ...prev.uiStates, service: "loading" } }));
  try {
    const [servicesData, bookingsData] = await Promise.all([getServices(), getCurrentBookings()]);
    store.setState({
      services: servicesData,
      bookings: bookingsData,
      dataLoading: false,
      uiStates: {
        ...store.getState().uiStates,
        service: servicesData.length ? "normal" : "empty",
      },
    });
  } catch (error) {
    store.setState((prev) => ({
      dataLoading: false,
      uiStates: { ...prev.uiStates, service: "error" },
    }));
  }
};

let userInitialized = false;
const initUser = async () => {
  if (userInitialized) {
    return;
  }
  userInitialized = true;
  const token = routePath.split("/")[2];
  if (token) {
    setAccessToken(token);
  }
  try {
    const session = await getSession();
    store.setState({
      sessionUser: session.user,
      sessionTenant: session.tenant,
      sessionLoading: false,
    });
    await loadUserData();
  } catch (error) {
    store.setState({
      sessionError: "unauthorized",
      sessionLoading: false,
      uiStates: { ...store.getState().uiStates, service: "error" },
    });
  }
};

const loadMonthAvailability = async (service, year, monthIndex) => {
  const key = `${service.id}-${year}-${monthIndex}`;
  store.setState({ availabilityLoading: true, uiStates: { ...store.getState().uiStates, date: "loading" } });
  try {
    const days = await getMonthAvailability(service.id, year, monthIndex);
    store.setState({
      availabilityMonthKey: key,
      availabilityMonth: days,
      availabilityLoading: false,
      uiStates: { ...store.getState().uiStates, date: days.length ? "normal" : "empty" },
    });
  } catch (error) {
    store.setState({ availabilityLoading: false, uiStates: { ...store.getState().uiStates, date: "error" } });
  }
};

const loadWeekAvailability = async (service, weekStart) => {
  const key = `${service.id}-${weekStart.toISOString().slice(0, 10)}`;
  store.setState({ availabilityLoading: true, uiStates: { ...store.getState().uiStates, time: "loading" } });
  try {
    const days = await getWeekAvailability(service.id, weekStart);
    store.setState({
      availabilityWeekKey: key,
      availabilityWeek: days,
      availabilityLoading: false,
      uiStates: { ...store.getState().uiStates, time: days.length ? "normal" : "empty" },
    });
  } catch (error) {
    store.setState({ availabilityLoading: false, uiStates: { ...store.getState().uiStates, time: "error" } });
  }
};

  const render = () => {
  const state = store.getState();
  initUser();

  if (state.step === 1 && state.services.length === 1 && !state.selectedService) {
    store.setState({
      selectedService: state.services[0],
      availabilityMonthKey: null,
      availabilityWeekKey: null,
      availabilityMonth: [],
      availabilityWeek: [],
      step: 2,
    });
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
        apartmentId: state.sessionUser?.apartment_id || "—",
        showBack: Boolean(headerBack),
        onBack: headerBack || undefined,
        onHelp: openHelp,
        onLogout: logout,
      })
    );

  let screen;
  let footer;

  if (state.step === 1) {
    screen = ServiceSelection({
      services: state.services,
      selectedService: state.selectedService,
      onSelect: (service) =>
        store.setState({
          selectedService: service,
          selectedDate: null,
          selectedSlot: null,
          availabilityMonthKey: null,
          availabilityWeekKey: null,
          availabilityMonth: [],
          availabilityWeek: [],
          step: 2,
          confirmed: false,
          confirmationCalendarEvent: null,
        }),
      bookings: state.bookings,
      cancelModalOpen: state.cancelModalOpen,
      cancelBooking: state.cancelBooking,
      onOpenCancel: (booking) =>
        store.setState({ cancelModalOpen: true, cancelBooking: booking }),
      onCloseCancel: () => store.setState({ cancelModalOpen: false, cancelBooking: null }),
      onConfirmCancel: async () => {
        const target = store.getState().cancelBooking;
        if (target?.id) {
          await cancelBooking(target.id);
        }
        const bookingsData = await getCurrentBookings();
        store.setState({
          bookings: bookingsData,
          cancelModalOpen: false,
          cancelBooking: null,
        });
      },
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
    const monthKey = `${state.selectedService.id}-${year}-${monthIndex}`;
    if (state.availabilityMonthKey !== monthKey && !state.availabilityLoading) {
      loadMonthAvailability(state.selectedService, year, monthIndex);
    }
    const days = (state.availabilityMonth || []).map((day) =>
      state.cancelledDayIds.includes(day.id) ? { ...day, status: "available" } : day
    );
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
              timeLabel: getFullDayTimeLabel(state.selectedService),
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
          confirmationCalendarEvent: null,
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
      onConfirmCancel: async () => {
        const target = store.getState().cancelBooking;
        const bookingId = findBookingId(store.getState().bookings, target);
        if (bookingId) {
          await cancelBooking(bookingId);
        }
        const bookingsData = await getCurrentBookings();
        store.setState({
          cancelledDayIds: [...store.getState().cancelledDayIds, store.getState().cancelBooking?.id].filter(Boolean),
          bookings: bookingsData,
          cancelModalOpen: false,
          cancelBooking: null,
        });
        loadMonthAvailability(state.selectedService, year, monthIndex);
      },
    });

    footer = null;
  }

  if (state.step === 2 && state.selectedService?.bookingType !== "full-day") {
    const weekKey = `${state.selectedService.id}-${state.weekCursor.toISOString().slice(0, 10)}`;
    if (state.availabilityWeekKey !== weekKey && !state.availabilityLoading) {
      loadWeekAvailability(state.selectedService, state.weekCursor);
    }
    const weekSlots = (state.availabilityWeek || []).map((day) => ({
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
          confirmed: false,
          confirmationCalendarEvent: null,
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
      onConfirmCancel: async () => {
        const target = store.getState().cancelBooking;
        const bookingId = findBookingId(store.getState().bookings, target);
        if (bookingId) {
          await cancelBooking(bookingId);
        }
        const bookingsData = await getCurrentBookings();
        store.setState({
          cancelledSlotIds: [...store.getState().cancelledSlotIds, store.getState().cancelBooking?.id].filter(Boolean),
          bookings: bookingsData,
          cancelModalOpen: false,
          cancelBooking: null,
        });
        loadWeekAvailability(state.selectedService, state.weekCursor);
      },
    });

    footer = null;
  }

  if (state.step === 3) {
    const summary = createBookingSummary({
      service: state.selectedService,
      date: state.selectedDate?.date,
      timeslot: state.selectedSlot,
    });

    const calendarEvent = state.confirmationCalendarEvent;
    const calendarPageUrl = buildCalendarDownloadPageUrl(calendarEvent);
    const calendarQrImageUrl = buildCalendarQrImageUrl(calendarPageUrl);

    screen = Confirmation({
      summary,
      state: state.uiStates.confirmation,
      confirmed: state.confirmed,
      isKioskMode: !isMobile,
      calendarQrImageUrl,
      calendarDownloadUrl: calendarPageUrl,
      onDownloadCalendar: () => {
        if (!calendarEvent) {
          return;
        }
        downloadCalendarEvent(calendarEvent);
      },
      onBack: () => store.setState({ step: 2 }),
      onAcknowledge: () =>
        store.setState({
          step: 2,
          confirmed: false,
          selectedDate: null,
          selectedSlot: null,
          confirmationCalendarEvent: null,
          uiStates: { ...store.getState().uiStates, confirmation: "normal" },
        }),
      onConfirm: async () => {
        if (!summary) {
          return;
        }
        store.setState((prev) => ({ uiStates: { ...prev.uiStates, confirmation: "loading" } }));
        try {
          const currentState = store.getState();
          const bookingRange = buildBookingRangeForState(currentState);
          if (!bookingRange) {
            store.setState((prev) => ({
              confirmed: false,
              uiStates: { ...prev.uiStates, confirmation: "error" },
            }));
            return;
          }
          await createBooking({
            booking_object_id: currentState.selectedService.id,
            start_time: bookingRange.startTime,
            end_time: bookingRange.endTime,
          });
          const calendarEventData = buildConfirmationCalendarEvent(currentState, bookingRange);
          store.setState((prev) => ({
            confirmed: true,
            confirmationCalendarEvent: calendarEventData,
            availabilityMonth:
              prev.selectedService?.bookingType === "full-day"
                ? markMonthDayAsMine(prev.availabilityMonth, prev.selectedDate?.id)
                : prev.availabilityMonth,
            availabilityWeek:
              prev.selectedService?.bookingType === "full-day"
                ? prev.availabilityWeek
                : markWeekSlotAsMine(prev.availabilityWeek, prev.selectedSlot?.id),
            uiStates: { ...prev.uiStates, confirmation: "normal" },
          }));
          try {
            const bookingsData = await getCurrentBookings();
            store.setState({
              bookings: bookingsData,
            });
          } catch (refreshError) {
            console.error("Kunde inte uppdatera aktuella bokningar efter bokning.", refreshError);
          }
        } catch (error) {
          if (error.status === 409) {
            alert("Tiden är redan bokad.");
          }
          if (error.status === 403) {
            alert("Du saknar behörighet att boka.");
          }
          store.setState((prev) => ({
            confirmed: false,
            confirmationCalendarEvent: null,
            uiStates: { ...prev.uiStates, confirmation: "error" },
          }));
        }
      },
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
    Header({ apartmentId: "Välkommen", onHelp: openHelp, onLogout: logout }),
    createElement("div", {
      className: "card",
      children: [
        createElement("div", { className: "screen-title", text: "BRF Bokningsportal" }),
        createElement("div", {
          className: "screen-subtitle",
          text:
            "Gå till /#/user/{UUID-token} för boende eller /#/admin/{UUID-token} för admin (hash används utan backend).",
        }),
        createElement("div", { className: "section-title", text: "Testa demon" }),
        createElement("div", {
          className: "footer-actions",
          children: [
            createElement("a", { className: "primary-button", attrs: { href: "/admin/admin-demo-token" }, text: "Admin-demo" }),
            createElement("a", { className: "secondary-button", attrs: { href: "/user/user-demo-token-anna" }, text: "Anna Andersson" }),
            createElement("a", { className: "secondary-button", attrs: { href: "/user/user-demo-token-erik" }, text: "Erik Eriksson" }),
          ],
        }),
      ],
    })
  );
  app.append(shell);
}
