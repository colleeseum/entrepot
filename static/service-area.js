// Native HTML handles opening, keyboard activation, Escape and outside clicks.
// This independent enhancement positions the information card beside its trigger.
const trigger = document.getElementById('service-area-label');
const popover = document.getElementById('service-area-popover');
if (trigger && popover && 'showPopover' in popover) {
  const positionPopover = () => {
    if (!popover.matches(':popover-open')) return;
    const anchor = trigger.getBoundingClientRect();
    const card = popover.getBoundingClientRect();
    const gutter = 16;
    let top = anchor.bottom + 8;
    if (top + card.height > window.innerHeight - gutter) top = anchor.top - card.height - 8;
    top = Math.max(gutter, Math.min(top, window.innerHeight - card.height - gutter));
    const left = Math.max(gutter, Math.min(anchor.left, window.innerWidth - card.width - gutter));
    Object.assign(popover.style, { inset: 'auto', margin: '0', top: `${top}px`, left: `${left}px` });
  };
  popover.addEventListener('toggle', positionPopover);
  window.addEventListener('resize', positionPopover, { passive: true });
  window.addEventListener('scroll', positionPopover, { passive: true, capture: true });
}
