export const createElement = (tag, options = {}, children = []) => {
  const element = document.createElement(tag);
  const { className, text, attrs, onClick, children: optionChildren } = options;

  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        element.setAttribute(key, value);
      }
    });
  }
  if (onClick) {
    element.addEventListener("click", onClick);
  }

  const mergedChildren = [...(optionChildren || []), ...children];
  mergedChildren.forEach((child) => {
    if (child) {
      element.append(child);
    }
  });

  return element;
};

export const clearElement = (element) => {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
};
