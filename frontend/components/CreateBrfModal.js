import { createElement } from "../hooks/dom.js";

const stepHeader = (current, total) =>
  createElement("div", {
    className: "modal-step",
    text: `Steg ${current} av ${total}`,
  });

const footer = ({ onBack, onNext, nextLabel, canNext, backLabel }) =>
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
        attrs: { disabled: canNext ? null : "disabled" },
        onClick: onNext,
      }),
    ],
  });

export const CreateBrfModal = ({ open, step, form, onClose, onNext, onPrev, onSubmit, onFinish, onChange }) => {
  if (!open) {
    return null;
  }

  const totalSteps = 8;
  const safeStep = Math.min(Math.max(step, 1), totalSteps);
  const canNext =
    (safeStep === 1 && Boolean(form.name?.trim())) ||
    (safeStep === 2 && Boolean(form.email?.trim())) ||
    safeStep > 2;
  const nextLabel = safeStep === 2 ? "Registrera" : safeStep === totalSteps ? "Öppna admin" : "Nästa";
  const backLabel = safeStep === 1 ? "Avbryt" : "Tillbaka";
  const onNextAction =
    safeStep === 2 ? onSubmit : safeStep === totalSteps ? onFinish : onNext;

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
    ],
  });

  const step4 = createElement("div", {
    className: "create-brf-step",
    children: [
      stepHeader(4, totalSteps),
      createElement("div", { className: "modal-title", text: "Slutför setup – steg 1" }),
      createElement("div", {
        className: "screen-subtitle",
        text:
          "Skapa bokningsobjekt. Förenklad modal med möjlighet att expandera till avancerat läge.",
      }),
      createElement("div", {
        className: "state-panel",
        text: "UI för bokningsobjekt kopplas in här i nästa iteration.",
      }),
    ],
  });

  const step5 = createElement("div", {
    className: "create-brf-step",
    children: [
      stepHeader(5, totalSteps),
      createElement("div", { className: "modal-title", text: "Slutför setup – steg 2" }),
      createElement("div", {
        className: "screen-subtitle",
        text: "Lägg till eller importera användare via CSV.",
      }),
      createElement("div", {
        className: "state-panel",
        text: "Import‑modal från admin kan återanvändas här i nästa iteration.",
      }),
    ],
  });

  const step6 = createElement("div", {
    className: "create-brf-step",
    children: [
      stepHeader(6, totalSteps),
      createElement("div", { className: "modal-title", text: "Slutför setup – steg 3" }),
      createElement("div", {
        className: "screen-subtitle",
        text: "Beställ bokningstavla (skickas till info@embsign.se).",
      }),
      createElement("div", {
        className: "state-panel",
        text: "Beställningsflöde och mail kopplas in i nästa iteration.",
      }),
    ],
  });

  const step7 = createElement("div", {
    className: "create-brf-step",
    children: [
      stepHeader(7, totalSteps),
      createElement("div", { className: "modal-title", text: "Slutför setup – steg 4" }),
      createElement("div", {
        className: "screen-subtitle",
        text: "Information om QR‑koder och möjlighet att ladda ned PDF.",
      }),
      createElement("div", {
        className: "state-panel",
        text: "PDF‑export för QR‑koder kopplas in senare.",
      }),
    ],
  });

  const step8 = createElement("div", {
    className: "create-brf-step",
    children: [
      stepHeader(8, totalSteps),
      createElement("div", { className: "modal-title", text: "Klart" }),
      createElement("div", {
        className: "state-panel",
        text: "Setup är klar. Klicka Öppna admin för att gå vidare.",
      }),
    ],
  });

  const steps = [step1, step2, step3, step4, step5, step6, step7, step8];
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
            canNext,
            backLabel,
          }),
        ],
      }),
    ],
  });
};
