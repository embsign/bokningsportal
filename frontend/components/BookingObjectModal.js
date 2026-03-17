import { createElement } from "../hooks/dom.js";

const helpButton = (help) =>
  createElement("button", {
    className: "form-help",
    text: "?",
    attrs: {
      type: "button",
      title: help,
      "aria-label": help,
    },
    onClick: () => window.alert(help),
  });

const field = ({ label, help, input }) =>
  createElement("label", {
    className: "form-field form-row-inline",
    children: [
      createElement("div", {
        className: "form-label form-label-inline",
        children: [
          createElement("span", { text: label }),
          help ? helpButton(help) : null,
        ].filter(Boolean),
      }),
      createElement("div", { className: "form-input-inline", children: [input] }),
    ],
  });

const fieldGroup = ({ label, help, children }) =>
  createElement("div", {
    className: "form-field form-row-inline",
    children: [
      createElement("div", {
        className: "form-label form-label-inline",
        children: [
          createElement("span", { text: label }),
          help ? helpButton(help) : null,
        ].filter(Boolean),
      }),
      createElement("div", { className: "form-input-inline", children }),
    ],
  });

export const BookingObjectModal = ({
  open,
  mode,
  form,
  onChange,
  onClose,
  onSave,
  selectorOpenKey,
  onOpenSelector,
  onCloseSelector,
  bookingGroups,
  onSelectGroup,
  onUpdateGroupMax,
  groupModalOpen,
  groupNameDraft,
  onGroupNameChange,
  onOpenGroupModal,
  onCloseGroupModal,
  onCreateGroup,
}) => {
  if (!open) {
    return null;
  }

  const title =
    mode === "edit"
      ? "Redigera bokningsobjekt"
      : mode === "copy"
        ? "Kopiera bokningsobjekt"
        : "Nytt bokningsobjekt";

  const selectorOptions = {
    allowHouses: { label: "Hus / Trappuppgång", options: ["A", "B", "C"] },
    allowGroups: { label: "Behörighetsgrupp", options: ["Styrelse", "Gym", "Bastu"] },
    allowApartments: { label: "Enskilda lägenheter", options: ["1001", "1002", "1003"] },
    denyHouses: { label: "Hus / Trappuppgång", options: ["A", "B", "C"] },
    denyGroups: { label: "Behörighetsgrupp", options: ["Styrelse", "Gym", "Bastu"] },
    denyApartments: { label: "Enskilda lägenheter", options: ["1001", "1002", "1003"] },
  };

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

  const renderSelectorButton = (key, value, onUpdate) =>
    createElement("div", {
      className: "selector-row",
      children: [
        renderSelectedList(value, onUpdate),
        createElement("button", {
          className: "secondary-button admin-btn-select",
          text: "Välj",
          onClick: () => onOpenSelector(key),
        }),
      ],
    });

  const renderSelectorModal = () => {
    if (!selectorOpenKey) {
      return null;
    }
    const config = selectorOptions[selectorOpenKey];
    const currentValue = form[selectorOpenKey] || [];
    const updateValue = (next) => onChange(selectorOpenKey, next);

    return createElement("div", {
      className: "modal-overlay",
      children: [
        createElement("div", {
          className: "modal card",
          children: [
            createElement("div", { className: "modal-title", text: `Välj ${config.label}` }),
            createElement("div", {
              className: "selector-list",
              children: config.options.map((option) =>
                createElement("label", {
                  className: "selector-option",
                  children: [
                    createElement("input", {
                      attrs: {
                        type: "checkbox",
                        value: option,
                        checked: currentValue.includes(option) ? "checked" : null,
                      },
                      onChange: () => {
                        const hasValue = currentValue.includes(option);
                        const next = hasValue
                          ? currentValue.filter((item) => item !== option)
                          : [...currentValue, option];
                        updateValue(next);
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

  const modal = createElement("div", {
    className: "modal-overlay modal-overlay-scrollable",
    children: [
      createElement("div", {
        className: "modal card booking-object-modal",
        children: [
          createElement("div", { className: "modal-title", text: title }),
          createElement("div", {
            className: "admin-form-grid",
            children: [
              field({
                label: "Namn",
                help: "Visningsnamn för bokningsobjektet.",
                input: createElement("input", {
                  className: "input",
                  attrs: { value: form.name || "" },
                  onInput: (event) => onChange("name", event.target.value),
                }),
              }),
              field({
                label: "Typ",
                help: "Välj om objektet bokas som tidspass eller heldag.",
                input: createElement("div", {
                  className: "radio-group",
                  children: [
                    createElement("label", {
                      className: "radio-item",
                      children: [
                        createElement("input", {
                          attrs: {
                            type: "radio",
                            name: "booking-type",
                            value: "Tidspass",
                            checked: form.type === "Tidspass" ? "checked" : null,
                          },
                          onChange: () => onChange("type", "Tidspass"),
                        }),
                        createElement("span", { text: "Tidspass" }),
                      ],
                    }),
                    createElement("label", {
                      className: "radio-item",
                      children: [
                        createElement("input", {
                          attrs: {
                            type: "radio",
                            name: "booking-type",
                            value: "Heldag",
                            checked: form.type === "Heldag" ? "checked" : null,
                          },
                          onChange: () => onChange("type", "Heldag"),
                        }),
                        createElement("span", { text: "Heldag" }),
                      ],
                    }),
                  ],
                }),
              }),
              field({
                label: "Bokningslängd (minuter)",
                help: "Ange längd utan enhet.",
                input: createElement("input", {
                  className: "input",
                  attrs: {
                    value: form.slotDuration || "",
                    disabled: form.type === "Heldag" ? "disabled" : null,
                  },
                  onInput: (event) => onChange("slotDuration", event.target.value),
                }),
              }),
              fieldGroup({
                label: "Bokningsfönster",
                help: "Min/max dagar framåt (utan enhet).",
                children: [
                  createElement("div", {
                    className: "form-stack form-group",
                    children: [
                      createElement("label", {
                        className: "form-subfield",
                        children: [
                          createElement("span", { text: "Minsta tid innan bokning (dagar)" }),
                          createElement("input", {
                            className: "input",
                            attrs: { value: form.windowMin || "" },
                            onInput: (event) => onChange("windowMin", event.target.value),
                          }),
                        ],
                      }),
                      createElement("label", {
                        className: "form-subfield",
                        children: [
                          createElement("span", { text: "Maximal framförhållning (dagar)" }),
                          createElement("input", {
                            className: "input",
                            attrs: { value: form.windowMax || "" },
                            onInput: (event) => onChange("windowMax", event.target.value),
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              field({
                label: "Max bokningar",
                help: "Max antal aktiva bokningar per lägenhet.",
                input: createElement("div", {
                  className: "max-bookings-row",
                  children: [
                    createElement("input", {
                      className: "input input-sm",
                      attrs: { value: form.maxBookings || "" },
                      onInput: (event) => {
                        const value = event.target.value;
                        onChange("maxBookings", value);
                        onUpdateGroupMax?.(value);
                      },
                    }),
                    createElement("select", {
                      className: "input",
                      onChange: (event) => {
                        const value = event.target.value;
                        if (value === "create") {
                          onOpenGroupModal?.();
                          return;
                        }
                        onSelectGroup?.(value);
                      },
                      children: [
                        createElement("option", {
                          text: "Ingen",
                          attrs: { value: "", selected: form.groupId ? null : "selected" },
                        }),
                        ...(bookingGroups || []).map((group) =>
                          createElement("option", {
                            text: group.name,
                            attrs: { value: group.id, selected: form.groupId === group.id ? "selected" : null },
                          })
                        ),
                        createElement("option", { text: "Skapa bokningsgrupp...", attrs: { value: "create" } }),
                      ],
                    }),
                  ],
                }),
              }),
              fieldGroup({
                label: "Pris",
                help: "Olika pris för vardag/helg (utan enhet).",
                children: [
                  createElement("div", {
                    className: "form-stack form-group",
                    children: [
                      createElement("label", {
                        className: "form-subfield",
                        children: [
                          createElement("span", { text: "Pris per bokning på vardag (kr)" }),
                          createElement("input", {
                            className: "input",
                            attrs: { value: form.priceWeekday || "" },
                            onInput: (event) => onChange("priceWeekday", event.target.value),
                          }),
                        ],
                      }),
                      createElement("label", {
                        className: "form-subfield",
                        children: [
                          createElement("span", { text: "Pris per bokning på helg (kr)" }),
                          createElement("input", {
                            className: "input",
                            attrs: { value: form.priceWeekend || "" },
                            onInput: (event) => onChange("priceWeekend", event.target.value),
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              fieldGroup({
                label: "Behörigheter",
                help: "Standard är att alla har tillgång. Allow begränsar, Deny maskar bort.",
                children: [
                  createElement("div", {
                    className: "permissions-stack",
                    children: [
                      createElement("div", {
                        className: "form-stack form-group",
                        children: [
                          createElement("div", { className: "form-group-title", text: "Allow" }),
                          createElement("label", {
                            className: "form-subfield",
                            children: [
                              createElement("span", { text: "Hus / Trappuppgång" }),
                              renderSelectorButton("allowHouses", form.allowHouses || [], (values) =>
                                onChange("allowHouses", values)
                              ),
                            ],
                          }),
                          createElement("label", {
                            className: "form-subfield",
                            children: [
                              createElement("span", { text: "Behörighetsgrupp" }),
                              renderSelectorButton("allowGroups", form.allowGroups || [], (values) =>
                                onChange("allowGroups", values)
                              ),
                            ],
                          }),
                          createElement("label", {
                            className: "form-subfield",
                            children: [
                              createElement("span", { text: "Enskilda lägenheter" }),
                              renderSelectorButton("allowApartments", form.allowApartments || [], (values) =>
                                onChange("allowApartments", values)
                              ),
                            ],
                          }),
                        ],
                      }),
                      createElement("div", {
                        className: "form-stack form-group",
                        children: [
                          createElement("div", { className: "form-group-title", text: "Deny" }),
                          createElement("label", {
                            className: "form-subfield",
                            children: [
                              createElement("span", { text: "Hus / Trappuppgång" }),
                              renderSelectorButton("denyHouses", form.denyHouses || [], (values) =>
                                onChange("denyHouses", values)
                              ),
                            ],
                          }),
                          createElement("label", {
                            className: "form-subfield",
                            children: [
                              createElement("span", { text: "Behörighetsgrupp" }),
                              renderSelectorButton("denyGroups", form.denyGroups || [], (values) =>
                                onChange("denyGroups", values)
                              ),
                            ],
                          }),
                          createElement("label", {
                            className: "form-subfield",
                            children: [
                              createElement("span", { text: "Enskilda lägenheter" }),
                              renderSelectorButton("denyApartments", form.denyApartments || [], (values) =>
                                onChange("denyApartments", values)
                              ),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              field({
                label: "Status",
                help: "Aktiv eller inaktiv.",
                input: createElement("div", {
                  className: "radio-group",
                  children: [
                    createElement("label", {
                      className: "radio-item",
                      children: [
                        createElement("input", {
                          attrs: {
                            type: "radio",
                            name: "booking-status",
                            value: "Aktiv",
                            checked: form.status === "Aktiv" ? "checked" : null,
                          },
                          onChange: () => onChange("status", "Aktiv"),
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
                            name: "booking-status",
                            value: "Inaktiv",
                            checked: form.status === "Inaktiv" ? "checked" : null,
                          },
                          onChange: () => onChange("status", "Inaktiv"),
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
    ],
  });

  const selectorModal = renderSelectorModal();

  const groupModal = groupModalOpen
    ? createElement("div", {
        className: "modal-overlay",
        children: [
          createElement("div", {
            className: "modal card",
            children: [
              createElement("div", { className: "modal-title", text: "Ny bokningsgrupp" }),
              createElement("div", {
                className: "form-field",
                children: [
                  createElement("div", { className: "form-label", text: "Namn" }),
                  createElement("input", {
                    className: "input",
                    attrs: { value: groupNameDraft || "", "data-autofocus": "group-name" },
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
                    text: "Skapa",
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
    children: [modal, selectorModal, groupModal].filter(Boolean),
  });
};
