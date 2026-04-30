class ResponsiveMarkdownTables {
  constructor(root) {
    this.root = root;
  }

  enhance() {
    const tables = this.root.querySelectorAll(".sl-markdown-content table");

    for (const table of tables) {
      this.enhanceTable(table);
    }
  }

  enhanceTable(table) {
    const headings = Array.from(table.querySelectorAll("thead th")).map(
      (heading) => heading.textContent?.trim() ?? "",
    );

    if (headings.length === 0) {
      return;
    }

    const rows = table.querySelectorAll("tbody tr");

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("td"));

      for (const [index, cell] of cells.entries()) {
        const heading = headings[index];

        if (heading) {
          cell.dataset.label = heading;
        }
      }
    }
  }
}

new ResponsiveMarkdownTables(document).enhance();
