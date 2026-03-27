import { createElement } from "../hooks/dom.js";

const field = ({ label, input }) =>
  createElement("label", {
    className: "form-field form-row-inline",
    children: [
      createElement("div", { className: "form-label form-label-inline", text: label }),
      createElement("div", { className: "form-input-inline", children: [input] }),
    ],
  });

export const EditUserModal = ({
  open,
  mode,
  form,
  groupOptions,
  selectorOpen,
  onOpenSelector,
  onCloseSelector,
  onChange,
  onClose,
  onSave,
  groupNameDraft,
  onGroupNameChange,
  onCreateGroup,
}) => {
  if (!open) {
    return null;
  }

  const renderSelectedList = (value, onUpdate) =>
    value?.length
      ? createElement("div", {
          className: "selected-list",
          children: value.map((option) =>
            createElement("label", {
              className: "selected-item",
              children: [
                createElement("input", {
                  attrs: {
                    type: "checkbox",
                    value: option,
                    checked: "checked",
                  },
                  onChange: () => {
                    const next = value.filter((item) => item !== option);
                    onUpdate(next);
                  },
                }),
                createElement("span", { text: option }),
              ],
            })
          ),
        })
      : createElement("div", { className: "selected-empty", text: "Inget valt" });

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
                  className: "selector-row",
                  children: [
                    renderSelectedList(form.rfidTags || [], (next) => onChange("rfidTags", next)),
                    createElement("input", {
                      className: "input input-sm",
                      attrs: {
                        value: form.rfidDraft || "",
                        placeholder: "Ny RFID-tag",
                        "data-focus-key": "editUserRfidDraft",
                      },
                      onInput: (event) => onChange("rfidDraft", event.target.value),
                    }),
                    createElement("button", {
                      className: "secondary-button",
                      text: "Lägg till",
                      onClick: () => {
                        const nextTag = (form.rfidDraft || "").trim();
                        if (!nextTag) return;
                        if ((form.rfidTags || []).includes(nextTag)) {
                          onChange("rfidDraft", "");
                          return;
                        }
                        onChange("rfidTags", [...(form.rfidTags || []), nextTag]);
                        onChange("rfidDraft", "");
                      },
                    }),
                  ],
                }),
              }),
              field({
                label: "Behörighetsgrupper",
                input: createElement("div", {
                  className: "selector-row",
                  children: [
                    renderSelectedList(form.groups || [], (next) => onChange("groups", next)),
                    createElement("button", {
                      className: "secondary-button admin-btn-select",
                      text: "Välj",
                      onClick: onOpenSelector,
                    }),
                    createElement("div", {
                      className: "inline-create-group",
                      children: [
                        createElement("input", {
                          className: "input input-sm",
                          attrs: { value: groupNameDraft || "", placeholder: "Ny grupp", "data-focus-key": "editUserGroupDraft" },
                          onInput: (event) => onGroupNameChange?.(event.target.value),
                        }),
                        createElement("button", {
                          className: "secondary-button",
                          text: "Lägg till",
                          onClick: onCreateGroup,
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
    ],
  });
};
