import { createElement } from "../hooks/dom.js";

export const UserPickerModal = ({ open, users, query, onQueryChange, onSelect, onClose }) => {
  if (!open) {
    return null;
  }

  const filtered = users.filter((user) => {
    const needle = query?.trim().toLowerCase();
    if (!needle) {
      return true;
    }
    return (
      user.identity?.toLowerCase().includes(needle) ||
      user.apartmentId?.toLowerCase().includes(needle) ||
      user.house?.toLowerCase().includes(needle) ||
      user.groups?.join(" ").toLowerCase().includes(needle)
    );
  });

  return createElement("div", {
    className: "modal-overlay",
    children: [
      createElement("div", {
        className: "modal card user-picker-modal",
        children: [
          createElement("div", { className: "modal-title", text: "Välj användare" }),
          createElement("div", {
            className: "user-search",
            children: [
              createElement("input", {
                className: "input",
                attrs: { value: query || "", placeholder: "Sök på identitet, lägenhet eller grupp" },
                onInput: (event) => onQueryChange(event.target.value),
              }),
            ],
          }),
          createElement("div", {
            className: "user-list",
            children: filtered.length
              ? filtered.map((user) =>
                  createElement("div", {
                    className: "user-row",
                    children: [
                      createElement("div", {
                        className: "user-row-main",
                        children: [
                          createElement("div", { className: "user-row-title", text: user.identity }),
                          createElement("div", {
                            className: "user-row-meta",
                            text: `Lgh ${user.apartmentId} • Hus ${user.house} • ${user.groups.join(", ") || "Inga grupper"}`,
                          }),
                        ],
                      }),
                      createElement("div", {
                        className: "user-row-actions",
                        children: [
                          createElement("button", {
                            className: "secondary-button admin-btn-edit",
                            text: "Välj",
                            onClick: () => onSelect(user),
                          }),
                        ],
                      }),
                    ],
                  })
                )
              : [createElement("div", { className: "empty-state", text: "Inga träffar." })],
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
