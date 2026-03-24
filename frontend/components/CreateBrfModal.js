import { createElement } from "../hooks/dom.js";

const stepHeader = (current, total) =>
  createElement("div", {
    className: "modal-step",
    text: `Steg ${current} av ${total}`,
  });

const footer = ({ onBack, onNext, nextLabel, backLabel }) =>
  createElement("div", {
    className: "modal-footer",
    children: [
      createElement("button", {
        className: "secondary-button",
        text: backLabel,
        onClick: onBack,
      }),
      createElement("button", {
        className: "primary-button",
        text: nextLabel,
        onClick: onNext,
      }),
    ],
  });

export const CreateBrfModal = ({ open, step, form, onClose, onNext, onPrev, onSubmit, onFinish, onChange }) => {
  if (!open) {
    return null;
  }

  const totalSteps = 3;
  const safeStep = Math.min(Math.max(step, 1), totalSteps);
  const nextLabel = safeStep === 2 ? "Registrera" : safeStep === totalSteps ? "Stäng" : "Nästa";
  const backLabel = safeStep === 1 ? "Avbryt" : "Tillbaka";
  const onNextAction = safeStep === 2 ? onSubmit : safeStep === totalSteps ? onFinish : onNext;

  const step1 = createElement("div", {
    className: "create-brf-step",
    children: [
      stepHeader(1, totalSteps),
      createElement("div", { className: "modal-title", text: "Registrering – steg 1" }),
      createElement("div", {
        className: "form-field",
        children: [
          createElement("div", { className: "form-label", text: "Föreningens namn" }),
          createElement("input", {
            className: "input",
            attrs: { value: form.name || "", placeholder: "BRF Exempel" },
            onInput: (event) => onChange("name", event.target.value),
          }),
          form.errors?.name
            ? createElement("div", { className: "form-error", text: form.errors.name })
            : null,
        ],
      }),
      createElement("div", {
        className: "state-panel",
        text: "Turnstile placeras här i nästa iteration.",
      }),
    ],
  });

  const step2 = createElement("div", {
    className: "create-brf-step",
    children: [
      stepHeader(2, totalSteps),
      createElement("div", { className: "modal-title", text: "Registrering – steg 2" }),
      createElement("div", {
        className: "form-field",
        children: [
          createElement("div", { className: "form-label", text: "E‑post till föreningen" }),
          createElement("input", {
            className: "input",
            attrs: { value: form.email || "", placeholder: "styrelsen@brf.se", type: "email" },
            onInput: (event) => onChange("email", event.target.value),
          }),
          form.errors?.email
            ? createElement("div", { className: "form-error", text: form.errors.email })
            : null,
        ],
      }),
      createElement("div", {
        className: "screen-subtitle",
        text: "När du klickar på Registrera skickas ett mejl med en länk för att slutföra setup.",
      }),
    ],
  });

  const step3 = createElement("div", {
    className: "create-brf-step",
    children: [
      stepHeader(3, totalSteps),
      createElement("div", { className: "modal-title", text: "Bekräftelse och mail" }),
      createElement("div", {
        className: "state-panel",
        text:
          "Ett mail skickas till angiven adress med en länk för att slutföra setup. " +
          "E‑postskick integreras i nästa iteration.",
      }),
      createElement("div", {
        className: "screen-subtitle",
        text: "När du klickar på länken i mailet öppnas en ny sida för resten av flödet.",
      }),
    ],
  });
  const steps = [step1, step2, step3];
  const content = steps[safeStep - 1] || step1;

  return createElement("div", {
    className: "modal-overlay",
    children: [
      createElement("div", {
        className: "modal card create-brf-modal",
        children: [
          content,
          footer({
            onBack: safeStep === 1 ? onClose : onPrev,
            onNext: onNextAction,
            nextLabel,
            backLabel,
          }),
        ],
      }),
    ],
  });
};
