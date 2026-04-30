class ResponsiveMarkdownTables {
  constructor(root) {
    this.root = root;
  }

  enhance() {
    const tables = this.root.querySelectorAll(".sl-markdown-content table");

    if (tables.length === 0) {
      return;
    }

    for (const [tableIndex, table] of tables.entries()) {
      this.enhanceTable(table, tableIndex);
    }
  }

  enhanceTable(table, tableIndex) {
    const headings = Array.from(table.querySelectorAll("thead th")).map(
      (heading) => heading.textContent?.trim() ?? "",
    );

    if (headings.length === 0) {
      return;
    }

    const rows = Array.from(table.querySelectorAll("tbody tr"));

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("td"));

      for (const [index, cell] of cells.entries()) {
        const heading = headings[index];

        if (heading) {
          cell.dataset.label = heading;
        }
      }
    }

    table.classList.add("opennav-table-enhanced");
    table.dataset.columnCount = String(headings.length);
    this.createMobileAccordion(table, headings, rows, tableIndex);
  }

  createMobileAccordion(table, headings, rows, tableIndex) {
    if (
      table.nextElementSibling?.classList.contains("opennav-table-accordion")
    ) {
      return;
    }

    const accordion = document.createElement("div");
    accordion.className = "opennav-table-accordion not-content";

    for (const [rowIndex, row] of rows.entries()) {
      const cells = Array.from(row.querySelectorAll("td"));

      if (cells.length === 0) {
        continue;
      }

      accordion.append(
        this.createAccordionItem(cells, headings, tableIndex, rowIndex),
      );
    }

    if (accordion.childElementCount === 0) {
      return;
    }

    accordion.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const trigger = event.target.closest(".opennav-table-accordion-trigger");

      if (trigger === null) {
        return;
      }

      this.toggleAccordionItem(accordion, trigger);
    });

    table.after(accordion);
  }

  createAccordionItem(cells, headings, tableIndex, rowIndex) {
    const isOpen = rowIndex === 0;
    const item = document.createElement("section");
    const triggerId = `opennav-table-${tableIndex}-row-${rowIndex}-trigger`;
    const panelId = `opennav-table-${tableIndex}-row-${rowIndex}-panel`;

    item.className = "opennav-table-accordion-item";
    item.classList.toggle("is-open", isOpen);

    item.append(
      this.createAccordionTrigger(
        cells[0],
        headings[0] ?? "Row",
        triggerId,
        panelId,
        isOpen,
      ),
      this.createAccordionPanel(cells, headings, triggerId, panelId, isOpen),
    );

    return item;
  }

  createAccordionTrigger(titleCell, heading, triggerId, panelId, isOpen) {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.id = triggerId;
    trigger.className = "opennav-table-accordion-trigger";
    trigger.setAttribute("aria-controls", panelId);
    trigger.setAttribute("aria-expanded", String(isOpen));

    const text = document.createElement("span");
    text.className = "opennav-table-accordion-trigger-text";

    const label = document.createElement("span");
    label.className = "opennav-table-accordion-trigger-label";
    label.textContent = heading;

    const value = document.createElement("span");
    value.className = "opennav-table-accordion-trigger-value";
    this.appendCellContent(value, titleCell);

    const icon = document.createElement("span");
    icon.className = "opennav-table-accordion-icon";
    icon.setAttribute("aria-hidden", "true");

    text.append(label, value);
    trigger.append(text, icon);

    return trigger;
  }

  createAccordionPanel(cells, headings, triggerId, panelId, isOpen) {
    const panel = document.createElement("div");
    panel.id = panelId;
    panel.className = "opennav-table-accordion-panel";
    panel.setAttribute("aria-labelledby", triggerId);
    panel.hidden = !isOpen;

    for (const [index, cell] of cells.entries()) {
      if (index === 0) {
        continue;
      }

      panel.append(
        this.createAccordionField(
          headings[index] ?? `Column ${index + 1}`,
          cell,
        ),
      );
    }

    return panel;
  }

  createAccordionField(heading, cell) {
    const field = document.createElement("div");
    field.className = "opennav-table-accordion-field";

    const label = document.createElement("span");
    label.className = "opennav-table-accordion-field-label";
    label.textContent = heading;

    const value = document.createElement("div");
    value.className = "opennav-table-accordion-field-value";
    this.appendCellContent(value, cell);

    field.append(label, value);

    return field;
  }

  appendCellContent(target, cell) {
    for (const node of cell.childNodes) {
      target.append(node.cloneNode(true));
    }
  }

  toggleAccordionItem(accordion, trigger) {
    const item = trigger.closest(".opennav-table-accordion-item");
    const panelId = trigger.getAttribute("aria-controls");
    const panel = panelId ? this.root.getElementById(panelId) : null;
    const isOpen = trigger.getAttribute("aria-expanded") === "true";

    if (item === null || panel === null) {
      return;
    }

    if (!isOpen) {
      this.closeAccordionItems(accordion);
    }

    trigger.setAttribute("aria-expanded", String(!isOpen));
    panel.hidden = isOpen;
    item.classList.toggle("is-open", !isOpen);
  }

  closeAccordionItems(accordion) {
    const triggers = accordion.querySelectorAll(
      ".opennav-table-accordion-trigger",
    );

    for (const trigger of triggers) {
      const panelId = trigger.getAttribute("aria-controls");
      const panel = panelId ? this.root.getElementById(panelId) : null;
      const item = trigger.closest(".opennav-table-accordion-item");

      trigger.setAttribute("aria-expanded", "false");

      if (panel !== null) {
        panel.hidden = true;
      }

      if (item !== null) {
        item.classList.remove("is-open");
      }
    }
  }
}

new ResponsiveMarkdownTables(document).enhance();
