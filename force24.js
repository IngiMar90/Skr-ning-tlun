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
      input.value = formatDigits(input.value);
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

  function ensureMultiDayHost() {
    const form = document.querySelector('.lesson-form');
    if (!form) return null;

    let wrapper = document.getElementById('lessonDayPicker');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'lessonDayPicker';
      wrapper.style.margin = '14px 0 10px';
      wrapper.innerHTML = '<div style="font-size:12px;font-weight:800;color:var(--muted);margin-bottom:7px">Dagar fyrir nýjan tíma</div><div id="lessonDays" class="days" style="margin:0"></div>';
      form.parentNode.insertBefore(wrapper, form);
    }
    return document.getElementById('lessonDays');
  }

  function renderLessonDays() {
    ensureSelectedDays();
    const host = ensureMultiDayHost();
    if (!host) return;

    host.innerHTML = days.map((day, i) =>
      `<button class="day ${selectedDays.has(i) ? 'active' : ''}" data-lesson-day="${i}" type="button" aria-pressed="${selectedDays.has(i)}">${day}</button>`
    ).join('');

    host.querySelectorAll('[data-lesson-day]').forEach(button => {
      button.onclick = () => {
        const i = Number(button.dataset.lessonDay);
        if (selectedDays.has(i)) selectedDays.delete(i);
        else selectedDays.add(i);
        renderLessonDays();
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
      if (!selectedDays.size) {
        alert('Veldu að minnsta kosti einn dag.');
        return;
      }

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
      renderLessonDays();
      if (!document.getElementById('timetable').classList.contains('hidden')) renderTimetable();
    };
  }

  function updateHelpText() {
    const host = document.getElementById('days');
    const card = host?.closest('.card');
    const help = card?.querySelector('p.help');
    if (help) help.innerHTML = 'Efri dagarnir velja hvaða dag þú ert að skoða og breyta. Undir <strong>Dagar fyrir nýjan tíma</strong> geturðu valið einn eða fleiri daga í einu; smelltu aftur á dag til að afvelja hann.';
  }

  function setup() {
    ids.forEach(convert);
    if (!selectedDays.size) selectedDays = new Set([selectedDay]);
    renderLessonDays();
    updateHelpText();
    installLessonCreation();
  }

  function apply() {
    setup();
    const settings = document.getElementById('settings');
    if (settings) {
      new MutationObserver(() => {
        if (!settings.classList.contains('hidden')) setup();
      }).observe(settings, { attributes: true, attributeFilter: ['class'] });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
