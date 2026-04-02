import { createElement } from "../hooks/dom.js";

export const UserList = ({
  users,
  query,
  onQueryChange,
  onPrimaryAction,
  primaryLabel,
  onDelete,
  emptyText,
}) => {
  const filtered = users.filter((user) => {
    const needle = query?.trim().toLowerCase();
    if (!needle) {
      return true;
    }
    return (
      user.apartmentId?.toLowerCase().includes(needle) ||
      user.house?.toLowerCase().includes(needle) ||
      user.groups?.join(" ").toLowerCase().includes(needle)
    );
  });

  return createElement("div", {
    className: "user-list-wrapper",
    children: [
      createElement("div", {
        className: "user-search",
        children: [
          createElement("input", {
            className: "input",
            attrs: { value: query || "", placeholder: "Sök på lägenhet, hus eller grupp" },
            onInput: (event) => onQueryChange(event.target.value),
          }),
        ],
      }),
      filtered.length
        ? createElement("div", {
            className: "admin-table-scroll",
            children: [
              createElement("table", {
                className: "admin-table",
                children: [
                  createElement("thead", {
                    children: [
                      createElement("tr", {
                        children: [
                          createElement("th", { text: "Lägenhet" }),
                          createElement("th", { text: "Hus / Trapphus" }),
                          createElement("th", { text: "RFID-taggar" }),
                          createElement("th", { text: "Behörighetsgrupper" }),
                          createElement("th", { text: "Status" }),
                          createElement("th", { text: "" }),
                        ],
                      }),
                    ],
                  }),
                  createElement("tbody", {
                    children: filtered.map((user) =>
                      createElement("tr", {
                        children: [
                          createElement("td", { text: user.apartmentId || "-" }),
                          createElement("td", { text: user.house || "-" }),
                          createElement("td", { text: String((user.rfidTags || []).length) }),
                          createElement("td", { text: user.groups?.join(", ") || "Inga grupper" }),
                          createElement("td", {
                            children: [
                              createElement("span", {
                                className: `status-pill ${user.active ? "active" : "inactive"}`,
                                text: user.active ? "Aktiv" : "Inaktiv",
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
                                    text: primaryLabel || "Redigera",
                                    onClick: () => onPrimaryAction(user),
                                  }),
                                  onDelete
                                    ? createElement("button", {
                                        className: "secondary-button admin-btn-delete",
                                        text: "Ta bort",
                                        onClick: () => onDelete(user),
                                      })
                                    : null,
                                ].filter(Boolean),
                              }),
                            ],
                          }),
                        ],
                      })
                    ),
                  }),
                ],
              }),
            ],
          })
        : createElement("div", { className: "empty-state", text: emptyText || "Inga träffar." }),
    ],
  });
};
