import { createElement } from "../hooks/dom.js";

export const Header = ({ apartmentId, showBack = false, onBack, onHelp, onLogout }) => {
  const title = showBack
    ? createElement("button", {
        className: "header-back",
        text: "⟵ Tillbaka",
        onClick: onBack,
      })
    : createElement("div", {
        className: "header-title",
        children: [
          createElement("div", { className: "logo-badge", text: "BRF" }),
          createElement("span", { text: "Bokningsportal" }),
        ],
      });

  const meta = createElement("div", {
    className: "header-meta",
    children: [
      createElement("span", { className: "meta-pill", text: `Lägenhet ${apartmentId}` }),
    ],
  });

  const actions = createElement("div", {
    className: "header-actions",
    children: [
      createElement("button", { className: "ghost-button", text: "Hjälp", onClick: onHelp }),
      createElement("button", { className: "ghost-button", text: "Logga ut", onClick: onLogout }),
    ],
  });

  return createElement("header", {
    className: "header card",
    children: [
      createElement("div", { className: "header-left", children: [title] }),
      createElement("div", { className: "header-center", children: [meta] }),
      createElement("div", { className: "header-right", children: [actions] }),
    ],
  });
};
