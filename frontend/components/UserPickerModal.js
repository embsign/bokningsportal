import { createElement } from "../hooks/dom.js";
import { UserList } from "./UserList.js";

export const UserPickerModal = ({ open, users, query, onQueryChange, onSelect, onClose }) => {
  if (!open) {
    return null;
  }

  return createElement("div", {
    className: "modal-overlay",
    children: [
      createElement("div", {
        className: "modal card user-picker-modal",
        children: [
          createElement("div", { className: "modal-title", text: "Välj användare" }),
          UserList({
            users,
            query,
            onQueryChange,
            onPrimaryAction: onSelect,
            primaryLabel: "Välj",
            emptyText: "Inga träffar.",
          }),
          createElement("div", {
            className: "modal-footer",
            children: [
              createElement("button", {
                className: "secondary-button",
                text: "Stäng",
                onClick: onClose,
              }),
            ],
          }),
        ],
      }),
    ],
  });
};
