(() => {
  const ids = ['lessonFrom', 'lessonTo'];

  function valid24(value) {
    return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  function formatValue(raw) {
    let digits = String(raw || '').replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) digits = digits.slice(0, 2) + ':' + digits.slice(2);
    return digits;
  }

  function convert(id) {
    const old = document.getElementById(id);
    if (!old || old.dataset.clock24 === 'true') return;

    const input = document.createElement('input');
    input.id = old.id;
    input.className = old.className;
    input.type = 'text';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.maxLength = 5;
    input.placeholder = id === 'lessonFrom' ? '08:30' : '09:10';
    input.setAttribute('aria-label', id === 'lessonFrom' ? 'Frá klukkan, 24 tíma snið' : 'Til klukkan, 24 tíma snið');
    input.dataset.clock24 = 'true';
    input.value = old.value || '';

    input.addEventListener('input', () => {
      const pos = input.selectionStart;
      input.value = formatValue(input.value);
      try { input.setSelectionRange(pos, pos); } catch {}
    });

    input.addEventListener('blur', () => {
      if (!input.value) return;
      if (!valid24(input.value)) {
        input.setCustomValidity('Sláðu inn tíma á 24 tíma sniði, t.d. 08:30 eða 14:45.');
        input.reportValidity();
      } else {
        input.setCustomValidity('');
      }
    });

    old.replaceWith(input);
  }

  function apply() { ids.forEach(convert); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
