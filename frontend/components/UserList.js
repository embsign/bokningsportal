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
                        text: `Lgh ${user.apartmentId} • Hus ${user.house || "-"} • ${
                          user.groups?.join(", ") || "Inga grupper"
                        }`,
                      }),
                    ],
                  }),
                  createElement("div", {
                    className: "user-row-actions",
                    children: [
                      createElement("span", {
                        className: `status-pill ${user.active ? "active" : "inactive"}`,
                        text: user.active ? "Aktiv" : "Inaktiv",
                      }),
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
              })
            )
          : [createElement("div", { className: "empty-state", text: emptyText || "Inga träffar." })],
      }),
    ],
  });
};
