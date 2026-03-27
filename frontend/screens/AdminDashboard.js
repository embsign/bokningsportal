import { createElement } from "../hooks/dom.js";
import { BookingObjectsTable } from "../components/BookingObjectsTable.js";

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

  const bookingTable = BookingObjectsTable({
    bookingObjects,
    onEdit,
    onCopy,
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
