import { createElement } from "../hooks/dom.js";

const field = ({ label, input }) =>
  createElement("label", {
    className: "form-field form-row-inline",
    children: [
      createElement("div", { className: "form-label form-label-inline", text: label }),
      createElement("div", { className: "form-input-inline", children: [input] }),
    ],
  });

const removableItemsTable = ({ values = [], emptyText, onRemove }) =>
  values.length
    ? createElement("div", {
        className: "selected-list-table-wrap",
        children: [
          createElement("table", {
            className: "admin-table selected-list-table",
            children: [
              createElement("thead", {
                children: [
                  createElement("tr", {
                    children: [
                      createElement("th", { text: "Värde" }),
                      createElement("th", { className: "admin-table-actions", text: "Åtgärd" }),
                    ],
                  }),
                ],
              }),
              createElement("tbody", {
                children: values.map((value) =>
                  createElement("tr", {
                    children: [
                      createElement("td", { text: value }),
                      createElement("td", {
                        className: "admin-table-actions",
                        children: [
                          createElement("button", {
                            className: "secondary-button admin-btn-delete admin-btn-compact",
                            text: "Ta bort",
                            onClick: () => onRemove(value),
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
    : createElement("div", { className: "selected-empty", text: emptyText || "Inget valt" });

export const EditUserModal = ({
  open,
  mode,
  form,
  groupOptions,
  selectorOpen,
  addRfidOpen,
  onOpenAddRfid,
  onCloseAddRfid,
  onSubmitAddRfid,
  rfidDraft,
  onRfidDraftChange,
  onOpenSelector,
  onCloseSelector,
  onChange,
  onClose,
  onSave,
  groupNameDraft,
  groupModalOpen,
  onOpenGroupModal,
  onCloseGroupModal,
  onGroupNameChange,
  onCreateGroup,
}) => {
  if (!open) {
    return null;
  }

  const renderSelectorModal = () => {
    if (!selectorOpen) {
      return null;
    }

    return createElement("div", {
      className: "modal-overlay",
      children: [
        createElement("div", {
          className: "modal card",
          children: [
            createElement("div", { className: "modal-title", text: "Välj behörighetsgrupper" }),
            createElement("div", {
              className: "selector-list",
              children: groupOptions.map((option) =>
                createElement("label", {
                  className: "selector-option",
                  children: [
                    createElement("input", {
                      attrs: {
                        type: "checkbox",
                        value: option,
                        checked: form.groups?.includes(option) ? "checked" : null,
                      },
                      onChange: () => {
                        const hasValue = form.groups?.includes(option);
                        const next = hasValue
                          ? form.groups.filter((item) => item !== option)
                          : [...(form.groups || []), option];
                        onChange("groups", next);
                      },
                    }),
                    createElement("span", { text: option }),
                  ],
                })
              ),
            }),
            createElement("div", {
              className: "modal-footer",
              children: [
                createElement("button", {
                  className: "primary-button",
                  text: "Klar",
                  onClick: onCloseSelector,
                }),
              ],
            }),
          ],
        }),
      ],
    });
  };

  const addRfidModal = addRfidOpen
    ? createElement("div", {
        className: "modal-overlay",
        children: [
          createElement("div", {
            className: "modal card",
            children: [
              createElement("div", { className: "modal-title", text: "Lägg till RFID-tag" }),
              createElement("div", {
                className: "form-field",
                children: [
                  createElement("div", { className: "form-label", text: "RFID UID" }),
                  createElement("input", {
                    className: "input",
                    attrs: {
                      value: rfidDraft || "",
                      placeholder: "Ny RFID-tag",
                      "data-autofocus": "edit-user-rfid",
                    },
                    onInput: (event) => onRfidDraftChange?.(event.target.value),
                  }),
                ],
              }),
              createElement("div", {
                className: "modal-footer",
                children: [
                  createElement("button", {
                    className: "secondary-button",
                    text: "Avbryt",
                    onClick: onCloseAddRfid,
                  }),
                  createElement("button", {
                    className: "primary-button",
                    text: "Lägg till",
                    onClick: onSubmitAddRfid,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    : null;

  const groupModal = groupModalOpen
    ? createElement("div", {
        className: "modal-overlay",
        children: [
          createElement("div", {
            className: "modal card",
            children: [
              createElement("div", { className: "modal-title", text: "Lägg till behörighetsgrupp" }),
              createElement("div", {
                className: "form-field",
                children: [
                  createElement("div", { className: "form-label", text: "Namn" }),
                  createElement("input", {
                    className: "input",
                    attrs: {
                      value: groupNameDraft || "",
                      placeholder: "Ny grupp",
                      "data-autofocus": "edit-user-group",
                    },
                    onInput: (event) => onGroupNameChange?.(event.target.value),
                  }),
                ],
              }),
              createElement("div", {
                className: "modal-footer",
                children: [
                  createElement("button", {
                    className: "secondary-button",
                    text: "Avbryt",
                    onClick: onCloseGroupModal,
                  }),
                  createElement("button", {
                    className: "primary-button",
                    text: "Lägg till",
                    onClick: onCreateGroup,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    : null;

  return createElement("div", {
    className: "modal-overlay",
    children: [
      createElement("div", {
        className: "modal card edit-user-modal",
        children: [
          createElement("div", {
            className: "modal-title",
            text: mode === "create" ? "Lägg till användare" : "Redigera användare",
          }),
          createElement("div", {
            className: "admin-form-grid",
            children: [
              field({
                label: "Identitet",
                input: createElement("input", {
                  className: "input",
                  attrs: { value: form.identity || "", "data-focus-key": "editUserIdentity" },
                  onInput: (event) => onChange("identity", event.target.value),
                }),
              }),
              field({
                label: "Lägenhets ID",
                input: createElement("input", {
                  className: "input",
                  attrs: { value: form.apartmentId || "", "data-focus-key": "editUserApartmentId" },
                  onInput: (event) => onChange("apartmentId", event.target.value),
                }),
              }),
              field({
                label: "Hus/Trapphus",
                input: createElement("input", {
                  className: "input",
                  attrs: { value: form.house || "", "data-focus-key": "editUserHouse" },
                  onInput: (event) => onChange("house", event.target.value),
                }),
              }),
              field({
                label: "RFID-taggar",
                input: createElement("div", {
                  className: "selector-row selector-row-table",
                  children: [
                    removableItemsTable({
                      values: form.rfidTags || [],
                      emptyText: "Inga RFID-taggar",
                      onRemove: (value) => {
                        if (!window.confirm(`Ta bort taggen "${value}"?`)) return;
                        onChange(
                          "rfidTags",
                          (form.rfidTags || []).filter((item) => item !== value)
                        );
                      },
                    }),
                    createElement("button", {
                      className: "secondary-button",
                      text: "Lägg till",
                      onClick: onOpenAddRfid,
                    }),
                  ],
                }),
              }),
              field({
                label: "Behörighetsgrupper",
                input: createElement("div", {
                  className: "selector-row selector-row-table",
                  children: [
                    removableItemsTable({
                      values: form.groups || [],
                      emptyText: "Inga behörighetsgrupper",
                      onRemove: (value) => {
                        if (!window.confirm(`Ta bort gruppen "${value}"?`)) return;
                        onChange(
                          "groups",
                          (form.groups || []).filter((item) => item !== value)
                        );
                      },
                    }),
                    createElement("div", {
                      className: "modal-action-stack",
                      children: [
                        createElement("button", {
                          className: "secondary-button admin-btn-select",
                          text: "Välj",
                          onClick: onOpenSelector,
                        }),
                        createElement("button", {
                          className: "secondary-button",
                          text: "Lägg till behörighetsgrupp",
                          onClick: onOpenGroupModal,
                        }),
                      ],
                    }),
                  ],
                }),
              }),
              field({
                label: "Admin",
                input: createElement("label", {
                  className: "checkbox-row",
                  children: [
                    createElement("input", {
                      attrs: { type: "checkbox", checked: form.admin ? "checked" : null },
                      onChange: () => onChange("admin", !form.admin),
                    }),
                    createElement("span", { text: "Kan administrera bokningar åt andra" }),
                  ],
                }),
              }),
              field({
                label: "Status",
                input: createElement("div", {
                  className: "radio-group",
                  children: [
                    createElement("label", {
                      className: "radio-item",
                      children: [
                        createElement("input", {
                          attrs: {
                            type: "radio",
                            name: "user-status",
                            value: "Aktiv",
                            checked: form.active ? "checked" : null,
                          },
                          onChange: () => onChange("active", true),
                        }),
                        createElement("span", { text: "Aktiv" }),
                      ],
                    }),
                    createElement("label", {
                      className: "radio-item",
                      children: [
                        createElement("input", {
                          attrs: {
                            type: "radio",
                            name: "user-status",
                            value: "Inaktiv",
                            checked: form.active ? null : "checked",
                          },
                          onChange: () => onChange("active", false),
                        }),
                        createElement("span", { text: "Inaktiv" }),
                      ],
                    }),
                  ],
                }),
              }),
            ],
          }),
          createElement("div", {
            className: "modal-footer",
            children: [
              createElement("button", {
                className: "secondary-button",
                text: "Avbryt",
                onClick: onClose,
              }),
              createElement("button", {
                className: "primary-button",
                text: "Spara",
                onClick: onSave,
              }),
            ],
          }),
        ],
      }),
      renderSelectorModal(),
      addRfidModal,
      groupModal,
    ].filter(Boolean),
  });
};
