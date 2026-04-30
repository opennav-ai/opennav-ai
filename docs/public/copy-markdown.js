function getMarkdownUrl() {
  const alternateLink = document.querySelector(
    'link[rel="alternate"][type="text/markdown"]',
  );

  if (alternateLink instanceof HTMLLinkElement) {
    const markdownUrl = new URL(alternateLink.href);
    return new URL(markdownUrl.pathname, window.location.origin).href;
  }

  const path = window.location.pathname.endsWith("/")
    ? `${window.location.pathname}index.md`
    : `${window.location.pathname}.md`;

  return new URL(path, window.location.origin).href;
}

async function copyText(text) {
  if (navigator.clipboard !== undefined) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto 0";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function createCopyMarkdownButton() {
  const main = document.querySelector("main");

  if (main === null) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "opennav-copy-markdown-action not-content";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "opennav-copy-markdown-button";
  button.textContent = "Copy Markdown";
  button.setAttribute("aria-label", "Copy this page as Markdown");

  button.addEventListener("click", async () => {
    const originalLabel = "Copy Markdown";

    button.disabled = true;
    button.textContent = "Copying...";

    try {
      const response = await fetch(getMarkdownUrl());

      if (!response.ok) {
        throw new Error(`Markdown request failed with ${response.status}`);
      }

      await copyText(await response.text());
      button.textContent = "Copied";

      window.setTimeout(() => {
        button.textContent = originalLabel;
        button.disabled = false;
      }, 1600);
    } catch {
      button.textContent = "Unavailable";

      window.setTimeout(() => {
        button.textContent = originalLabel;
        button.disabled = false;
      }, 2200);
    }
  });

  wrapper.append(button);
  main.before(wrapper);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", createCopyMarkdownButton);
} else {
  createCopyMarkdownButton();
}
