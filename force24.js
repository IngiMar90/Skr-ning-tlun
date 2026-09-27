(() => {
  const ids = ['lessonFrom', 'lessonTo'];
  let selectedDays = new Set();

  function valid24(value) {
    return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  function formatDigits(raw) {
    const digits = String(raw || '').replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + ':' + digits.slice(2);
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
    input.value = formatDigits(old.value || '');

    input.addEventListener('input', () => {
      const formatted = formatDigits(input.value);
      input.value = formatted;
      input.setCustomValidity('');
      requestAnimationFrame(() => {
        try { input.setSelectionRange(input.value.length, input.value.length); } catch {}
      });
    });

    input.addEventListener('blur', () => {
      if (!input.value) return;
      input.value = formatDigits(input.value);
      if (!valid24(input.value)) {
        input.setCustomValidity('Tími rangur.');
        input.reportValidity();
      } else {
        input.setCustomValidity('');
      }
    });

    old.replaceWith(input);
  }

  function ensureSelectedDays() {
    if (!selectedDays.size) selectedDays.add(selectedDay);
  }

  function renderMultiDays() {
    const host = document.getElementById('days');
    if (!host) return;
    ensureSelectedDays();

    host.innerHTML = days.map((day, i) =>
      `<button class="day ${selectedDays.has(i) ? 'active' : ''}" data-multiday="${i}" type="button">${day}</button>`
    ).join('');

    host.querySelectorAll('[data-multiday]').forEach(button => {
      button.onclick = () => {
        const i = Number(button.dataset.multiday);
        if (selectedDays.has(i)) {
          if (selectedDays.size === 1) return;
          selectedDays.delete(i);
          if (selectedDay === i) selectedDay = [...selectedDays][0];
        } else {
          selectedDays.add(i);
          selectedDay = i;
        }
        renderMultiDays();
        renderLessons();
      };
    });
  }

  function overlaps(dayIndex, from, to) {
    return (db.schedule[dayIndex] || []).some(lesson => from < lesson.to && to > lesson.from);
  }

  function installLessonCreation() {
    const button = document.getElementById('addLesson');
    if (!button) return;

    button.onclick = () => {
      const name = document.getElementById('lessonName').value.trim();
      const fromInput = document.getElementById('lessonFrom');
      const toInput = document.getElementById('lessonTo');
      const from = formatDigits(fromInput.value.trim());
      const to = formatDigits(toInput.value.trim());
      fromInput.value = from;
      toInput.value = to;

      if (!name) {
        alert('Skráðu heiti tíma.');
        return;
      }
      if (!valid24(from) || !valid24(to) || from >= to) {
        alert('Tími rangur.');
        return;
      }

      ensureSelectedDays();
      const chosenDays = [...selectedDays].sort((a, b) => a - b);
      if (chosenDays.some(dayIndex => overlaps(dayIndex, from, to))) {
        alert('Annar tími skráður á þessum tíma.');
        return;
      }

      chosenDays.forEach(dayIndex => {
        db.schedule[dayIndex] ||= [];
        db.schedule[dayIndex].push({ id: uid(), name, from, to, items: [], open: true });
      });

      document.getElementById('lessonName').value = '';
      fromInput.value = '';
      toInput.value = '';
      save();
      renderLessons();
      if (!document.getElementById('timetable').classList.contains('hidden')) renderTimetable();
    };
  }

  function updateHelpText() {
    const host = document.getElementById('days');
    const card = host?.closest('.card');
    const help = card?.querySelector('p.help');
    if (help) help.innerHTML = 'Veldu <strong>einn eða fleiri daga</strong>, skrifaðu inn upphaf og lok tíma og búðu síðan til tímann. Valdir dagar eru bláir.';
  }

  function apply() {
    ids.forEach(convert);
    selectedDays = new Set([selectedDay]);
    renderDays = renderMultiDays;
    renderMultiDays();
    updateHelpText();
    installLessonCreation();

    const settings = document.getElementById('settings');
    if (settings) {
      new MutationObserver(() => {
        if (!settings.classList.contains('hidden')) {
          selectedDays = new Set([selectedDay]);
          ids.forEach(convert);
          renderMultiDays();
          updateHelpText();
          installLessonCreation();
        }
      }).observe(settings, { attributes: true, attributeFilter: ['class'] });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
