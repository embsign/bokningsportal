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
      user.identity?.toLowerCase().includes(needle) ||
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
            attrs: { value: query || "", placeholder: "Sök på identitet, lägenhet eller grupp" },
            onInput: (event) => onQueryChange(event.target.value),
          }),
        ],
      }),
      filtered.length
        ? createElement("div", {
            className: "user-list user-list-table",
            children: [
              createElement("table", {
                className: "admin-table",
                children: [
                  createElement("thead", {
                    children: [
                      createElement("tr", {
                        children: [
                          createElement("th", { text: "Användare" }),
                          createElement("th", { text: "Lägenhet" }),
                          createElement("th", { text: "Hus / Trapphus" }),
                          createElement("th", { text: "Behörighetsgrupper" }),
                          createElement("th", { text: "Status" }),
                          createElement("th", {
                            className: "admin-table-actions",
                            text: "Åtgärder",
                          }),
                        ],
                      }),
                    ],
                  }),
                  createElement("tbody", {
                    children: filtered.map((user) =>
                      createElement("tr", {
                        children: [
                          createElement("td", { text: user.identity || "-" }),
                          createElement("td", { text: user.apartmentId || "-" }),
                          createElement("td", { text: user.house || "-" }),
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
                              createElement("button", {
                                className: "secondary-button admin-btn-edit admin-btn-compact",
                                text: primaryLabel || "Redigera",
                                onClick: () => onPrimaryAction(user),
                              }),
                              onDelete
                                ? createElement("button", {
                                    className: "secondary-button admin-btn-delete admin-btn-compact",
                                    text: "Ta bort",
                                    onClick: () => onDelete(user),
                                  })
                                : null,
                            ].filter(Boolean),
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
