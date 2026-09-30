(() => {
  // iPad/iOS fallback: turn a clean tap into a normal click when Safari/PWA
  // fails to synthesize one. Ignore forms and scrolling gestures.
  let startX = 0, startY = 0, startTime = 0, target = null;
  const selector = 'button, label.btn, [data-open], [data-home], .day, .home-card';

  document.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { target = null; return; }
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY; startTime = Date.now();
    target = e.target.closest?.(selector) || null;
  }, {passive:true, capture:true});

  document.addEventListener('touchend', e => {
    if (!target || e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    const moved = Math.hypot(t.clientX - startX, t.clientY - startY);
    const elapsed = Date.now() - startTime;
    const el = target;
    target = null;
    if (moved > 12 || elapsed > 700 || el.disabled) return;

    // Safari normally emits click after touchend. Give it a moment; if no click
    // arrives, synthesize one. This avoids double activation.
    let clicked = false;
    const mark = () => { clicked = true; };
    el.addEventListener('click', mark, {once:true, capture:true});
    setTimeout(() => {
      if (!clicked && document.contains(el)) el.click();
    }, 80);
  }, {passive:true, capture:true});

  // Improve touch hit testing in standalone iPad PWAs.
  const style = document.createElement('style');
  style.textContent = `button,.btn,.home-card,.day,.back,label.btn{touch-action:manipulation;-webkit-tap-highlight-color:rgba(0,0,0,0);position:relative;z-index:1}`;
  document.head.appendChild(style);
})();
