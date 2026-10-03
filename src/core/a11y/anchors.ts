export function installAnchorIds() {
  let sequence = 0;
  const assign = () => {
    document
      .querySelectorAll<HTMLElement>(
        'button,input,select,textarea,article,aside,section,header,footer',
      )
      .forEach((element) => {
        if (element.dataset.anchorId) return;
        const parent =
          element.parentElement?.closest<HTMLElement>('[data-anchor-id]')?.dataset.anchorId ??
          'app';
        const label =
          element.id ||
          element.getAttribute('aria-label') ||
          element.textContent?.trim().slice(0, 40) ||
          `control-${sequence++}`;
        element.dataset.anchorId = `${parent}-${label.replace(/[^a-zA-Z0-9]/g, '-')}`;
      });
  };
  const observer = new MutationObserver(assign);
  observer.observe(document.body, { subtree: true, childList: true });
  assign();
  return () => observer.disconnect();
}
