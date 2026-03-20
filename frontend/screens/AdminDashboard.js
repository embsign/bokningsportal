import { createElement } from "../hooks/dom.js";

const sectionCard = ({ title, description, actions, content }) =>
  createElement("div", {
    className: "admin-section card",
    children: [
      createElement("div", {
        className: "admin-section-header",
        children: [
          createElement("div", {
            children: [
              createElement("div", { className: "admin-section-title", text: title }),
              description
                ? createElement("div", { className: "admin-section-desc", text: description })
                : null,
            ].filter(Boolean),
          }),
          createElement("div", {
            className: "admin-section-actions",
            children: actions,
          }),
        ],
      }),
      content || null,
    ].filter(Boolean),
  });

export const AdminDashboard = ({
  adminUser,
  bookingObjects,
  onAdd,
  onCopy,
  onEdit,
  onImportUsers,
  onEditUsers,
  onCreateReport,
  modal,
  importModal,
  userPickerModal,
  editUserModal,
  reportModal,
}) => {
  const userSection = sectionCard({
    title: "Användare",
    description: "Hantera boende och behörigheter.",
    actions: [
      createElement("button", {
        className: "secondary-button admin-btn-edit",
        text: "Redigera",
        onClick: onEditUsers,
      }),
      createElement("button", {
        className: "secondary-button admin-btn-add",
        text: "Importera",
        onClick: onImportUsers,
      }),
    ],
  });

  const bookingTable = createElement("table", {
    className: "admin-table",
    children: [
      createElement("thead", {
        children: [
          createElement("tr", {
            children: [
              createElement("th", { text: "Namn" }),
              createElement("th", { text: "Typ" }),
              createElement("th", { text: "Slot" }),
              createElement("th", { text: "Bokningsfönster" }),
              createElement("th", { text: "Max" }),
              createElement("th", { text: "Pris (V/H)" }),
              createElement("th", { text: "Status" }),
              createElement("th", { text: "" }),
            ],
          }),
        ],
      }),
      createElement("tbody", {
        children: bookingObjects.map((item) =>
          createElement("tr", {
            children: [
              createElement("td", { text: item.name }),
              createElement("td", { text: item.type }),
              createElement("td", { text: item.slotDisplay || item.slotDuration }),
              createElement("td", { text: `${item.windowMin}–${item.windowMax}` }),
              createElement("td", { text: item.maxBookings }),
              createElement("td", { text: `${item.priceWeekday} / ${item.priceWeekend}` }),
              createElement("td", {
                children: [
                  createElement("span", {
                    className: `status-pill ${item.status === "Aktiv" ? "active" : "inactive"}`,
                    text: item.status,
                  }),
                ],
              }),
              createElement("td", {
                className: "admin-table-actions",
                children: [
                  createElement("div", {
                    className: "admin-action-group",
                    children: [
                      createElement("button", {
                        className: "secondary-button admin-btn-edit",
                        text: "Redigera",
                        onClick: () => onEdit(item),
                      }),
                      createElement("button", {
                        className: "secondary-button admin-btn-add",
                        text: "Kopiera",
                        onClick: () => onCopy(item),
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
        ),
      }),
    ],
  });

  const bookingSection = sectionCard({
    title: "Bokningsobjekt",
    description: "Skapa och hantera resurser som kan bokas.",
    actions: [
      createElement("button", {
        className: "secondary-button admin-btn-add",
        text: "Lägg till",
        onClick: () => onAdd(),
      }),
    ],
    content: bookingTable,
  });

  const reportsSection = sectionCard({
    title: "Debiteringsunderlag / Rapporter",
    description: "Export och sammanställningar för debitering.",
    actions: [
      createElement("button", {
        className: "secondary-button admin-btn-add",
        text: "Skapa rapport",
        onClick: onCreateReport,
      }),
    ],
  });

  return createElement("section", {
    className: "admin-dashboard",
    children: [
      createElement("div", {
        className: "admin-welcome",
        children: [
          createElement("div", { className: "screen-title", text: "Admin Dashboard" }),
          createElement("div", {
            className: "screen-subtitle",
            text: `${adminUser.association} • ${adminUser.name}`,
          }),
        ],
      }),
      createElement("div", {
        className: "admin-grid",
        children: [userSection, bookingSection, reportsSection],
      }),
      modal,
      importModal,
      userPickerModal,
      editUserModal,
      reportModal,
    ],
  });
};
