const CODE_THEME_STORAGE_KEY = "opennav-code-theme";

const codeThemes = [
  ["one-light", "One Light"],
  ["vscode-dark", "VS Code Dark+"],
  ["night-owl", "Night Owl"],
  ["github-light", "GitHub Light"],
];

let exampleSwitcherCount = 0;

function getStoredCodeTheme() {
  try {
    return window.localStorage.getItem(CODE_THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeCodeTheme(theme) {
  try {
    window.localStorage.setItem(CODE_THEME_STORAGE_KEY, theme);
  } catch {
    return;
  }
}

function getInitialCodeTheme() {
  const storedTheme = getStoredCodeTheme();

  if (codeThemes.some(([theme]) => theme === storedTheme)) {
    return storedTheme;
  }

  return "one-light";
}

function applyCodeTheme(theme) {
  document.documentElement.dataset.codeTheme = theme;
  storeCodeTheme(theme);
}

function createCodeThemePicker() {
  if (document.querySelector(".opennav-code-theme-picker") !== null) {
    return;
  }

  const firstCodeBlock = document.querySelector(".expressive-code");

  if (firstCodeBlock === null) {
    return;
  }

  const insertionTarget =
    firstCodeBlock.closest(".opennav-example-switcher") ?? firstCodeBlock;
  const selectedTheme =
    document.documentElement.dataset.codeTheme ?? getInitialCodeTheme();
  const wrapper = document.createElement("div");
  wrapper.className = "opennav-code-theme-picker not-content";

  const label = document.createElement("label");
  label.htmlFor = "opennav-code-theme";
  label.textContent = "Code theme";

  const select = document.createElement("select");
  select.id = "opennav-code-theme";
  select.name = "opennav-code-theme";

  for (const [value, labelText] of codeThemes) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = labelText;
    option.selected = value === selectedTheme;
    select.append(option);
  }

  select.addEventListener("change", () => {
    applyCodeTheme(select.value);
  });

  wrapper.append(label, select);
  insertionTarget.before(wrapper);
}

function getNextElementByClass(element, className) {
  let nextElement = element.nextElementSibling;

  while (nextElement !== null) {
    if (nextElement.classList.contains(className)) {
      return nextElement;
    }

    if (nextElement.classList.contains("opennav-example-label")) {
      return null;
    }

    nextElement = nextElement.nextElementSibling;
  }

  return null;
}

function createExampleButton(label, panelId, isSelected) {
  const button = document.createElement("button");
  button.type = "button";
  button.role = "tab";
  button.textContent = label;
  button.setAttribute("aria-controls", panelId);
  button.setAttribute("aria-selected", isSelected ? "true" : "false");
  button.dataset.exampleTarget = panelId;
  return button;
}

function activateExamplePanel(container, panelId) {
  const buttons = container.querySelectorAll("[data-example-target]");
  const panels = container.querySelectorAll("[data-example-panel]");

  for (const button of buttons) {
    button.setAttribute(
      "aria-selected",
      button.dataset.exampleTarget === panelId ? "true" : "false",
    );
  }

  for (const panel of panels) {
    panel.hidden = panel.id !== panelId;
  }
}

function createExampleSwitcher(quickLabel, quickCode, fullLabel, fullCode) {
  const switcher = document.createElement("div");
  exampleSwitcherCount += 1;
  const quickPanelId = `opennav-example-${exampleSwitcherCount}-quick`;
  const fullPanelId = `opennav-example-${exampleSwitcherCount}-full`;
  switcher.className = "opennav-example-switcher";

  const tabList = document.createElement("div");
  tabList.className = "opennav-example-tabs";
  tabList.role = "tablist";

  const quickButton = createExampleButton(quickLabel, quickPanelId, true);
  const fullButton = createExampleButton(fullLabel, fullPanelId, false);
  tabList.append(quickButton, fullButton);

  const toolbar = document.createElement("div");
  toolbar.className = "opennav-example-toolbar not-content";
  toolbar.append(tabList);

  const quickPanel = document.createElement("div");
  quickPanel.id = quickPanelId;
  quickPanel.className = "opennav-example-panel";
  quickPanel.dataset.examplePanel = "quick";
  quickPanel.role = "tabpanel";
  quickPanel.append(quickCode);

  const fullPanel = document.createElement("div");
  fullPanel.id = fullPanelId;
  fullPanel.className = "opennav-example-panel";
  fullPanel.dataset.examplePanel = "full";
  fullPanel.role = "tabpanel";
  fullPanel.hidden = true;
  fullPanel.append(fullCode);

  switcher.append(toolbar, quickPanel, fullPanel);
  tabList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-example-target]");

    if (button === null) {
      return;
    }

    activateExamplePanel(switcher, button.dataset.exampleTarget);
  });

  return switcher;
}

function enhanceExampleToggles() {
  const labels = Array.from(
    document.querySelectorAll(".opennav-example-label"),
  );

  for (const quickLabel of labels) {
    if (!quickLabel.isConnected || quickLabel.dataset.exampleRole !== "quick") {
      continue;
    }

    const quickCode = getNextElementByClass(quickLabel, "expressive-code");

    if (quickCode === null) {
      continue;
    }

    const fullLabel = quickCode.nextElementSibling;

    if (
      fullLabel === null ||
      !fullLabel.classList.contains("opennav-example-label") ||
      fullLabel.dataset.exampleRole !== "full"
    ) {
      continue;
    }

    const fullCode = getNextElementByClass(fullLabel, "expressive-code");

    if (fullCode === null) {
      continue;
    }

    const switcher = createExampleSwitcher(
      quickLabel.textContent.trim(),
      quickCode,
      fullLabel.textContent.trim(),
      fullCode,
    );
    quickLabel.before(switcher);
    quickLabel.remove();
    fullLabel.remove();
  }
}

function enhanceCodeExamples() {
  applyCodeTheme(getInitialCodeTheme());
  enhanceExampleToggles();
  createCodeThemePicker();
  const picker = document.querySelector(".opennav-code-theme-picker");
  const toolbar = document.querySelector(".opennav-example-toolbar");

  if (picker !== null && toolbar !== null) {
    toolbar.append(picker);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", enhanceCodeExamples);
} else {
  enhanceCodeExamples();
}
