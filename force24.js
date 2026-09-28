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

  function sortItems(items) {
    if (!Array.isArray(items)) return [];
    return items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const aPersonal = a.item.scope === 'student' ? 1 : 0;
        const bPersonal = b.item.scope === 'student' ? 1 : 0;
        return (aPersonal - bPersonal) || (a.index - b.index);
      })
      .map(x => x.item)
      .map((item, index) => {
        items[index] = item;
        return item;
      });
  }

  function normalizeItemOrder() {
    Object.values(db.schedule || {}).flat().forEach(lesson => {
      if (lesson?.items) sortItems(lesson.items);
    });
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

  function updateDailyDayHeader() {
    const button = document.getElementById('todayBtn');
    const label = document.getElementById('dateLabel');
    if (label) label.style.display = 'none';
    if (!button || !current) return;
    button.textContent = days[dayIndex(current)];
    const isToday = current === todayIso();
    button.classList.toggle('primary', isToday);
    button.setAttribute('aria-current', isToday ? 'date' : 'false');
  }

  function getVisibleLesson() {
    if (typeof lessonsForCurrentDay !== 'function') return null;
    const lessons = lessonsForCurrentDay();
    if (!lessons.length) return null;
    const index = manualLessonIndex == null ? 0 : manualLessonIndex;
    return lessons[index] || null;
  }

  function updateAllCheckboxState(allBox, lesson, item) {
    const students = activeStudents().filter(student => item.scope !== 'student' || item.studentId === student.id);
    if (!students.length) {
      allBox.checked = false;
      allBox.indeterminate = false;
      allBox.disabled = true;
      return;
    }
    const record = rec(current, lesson.id);
    const checkedCount = students.filter(student => record.done?.[student.id]?.[item.id]).length;
    allBox.checked = checkedCount === students.length;
    allBox.indeterminate = checkedCount > 0 && checkedCount < students.length;
  }

  function enhanceSelectAll() {
    const host = document.getElementById('todayHost');
    const table = host?.querySelector('table.tbl');
    const lesson = getVisibleLesson();
    if (!table || !lesson || table.dataset.selectAllReady === 'true') return;

    const items = sortItems(lesson.items || []);
    const thead = table.querySelector('thead');
    if (!thead || !items.length) return;

    table.dataset.selectAllReady = 'true';
    const row = document.createElement('tr');
    row.className = 'all-row';
    row.innerHTML = '<th style="background:#eef2ff;font-weight:900">Allir</th>';

    items.forEach(item => {
      const cell = document.createElement('th');
      cell.style.background = item.scope === 'student' ? '#f5f3ff' : '#eef2ff';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.className = 'check';
      box.setAttribute('aria-label', `Velja alla í ${item.name}`);
      box.dataset.allItem = item.id;
      updateAllCheckboxState(box, lesson, item);

      box.onchange = () => {
        const students = activeStudents().filter(student => item.scope !== 'student' || item.studentId === student.id);
        const record = rec(current, lesson.id);
        students.forEach(student => {
          record.done[student.id] ||= {};
          record.done[student.id][item.id] = box.checked;
          const individual = table.querySelector(`[data-done="${lesson.id}|${student.id}|${item.id}"]`);
          if (individual) individual.checked = box.checked;
        });
        box.indeterminate = false;
        save();
      };

      cell.appendChild(box);
      row.appendChild(cell);
    });

    thead.appendChild(row);

    table.querySelectorAll('[data-done]').forEach(input => {
      input.addEventListener('change', () => {
        requestAnimationFrame(() => {
          items.forEach(item => {
            const allBox = table.querySelector(`[data-all-item="${item.id}"]`);
            if (allBox) updateAllCheckboxState(allBox, lesson, item);
          });
        });
      });
    });
  }

  function setupSelectAllObserver() {
    const host = document.getElementById('todayHost');
    if (!host) return;
    new MutationObserver(() => enhanceSelectAll()).observe(host, { childList: true, subtree: true });
    enhanceSelectAll();
  }

  function moveItemWithinScope(lessonId, itemId, direction) {
    const lesson = (db.schedule[selectedDay] || []).find(x => x.id === lessonId);
    if (!lesson?.items) return;
    sortItems(lesson.items);
    const index = lesson.items.findIndex(x => x.id === itemId);
    if (index < 0) return;
    const item = lesson.items[index];
    const target = index + direction;
    if (target < 0 || target >= lesson.items.length) return;
    if (lesson.items[target].scope !== item.scope) return;
    [lesson.items[index], lesson.items[target]] = [lesson.items[target], lesson.items[index]];
    save();
    renderLessons();
  }

  function enhanceItemOrdering() {
    const host = document.getElementById('lessons');
    if (!host) return;

    host.querySelectorAll('.task').forEach(task => {
      if (task.dataset.orderReady === 'true') return;
      const del = task.querySelector('[data-del-item]');
      if (!del) return;
      const [lessonId, itemId] = del.dataset.delItem.split('|');
      const lesson = (db.schedule[selectedDay] || []).find(x => x.id === lessonId);
      const item = lesson?.items?.find(x => x.id === itemId);
      if (!lesson || !item) return;

      sortItems(lesson.items);
      const sameScope = lesson.items.filter(x => x.scope === item.scope);
      const pos = sameScope.findIndex(x => x.id === itemId);

      const controls = document.createElement('span');
      controls.style.display = 'inline-flex';
      controls.style.gap = '4px';

      const up = document.createElement('button');
      up.type = 'button';
      up.className = 'btn';
      up.textContent = '↑';
      up.title = 'Færa upp';
      up.disabled = pos <= 0;
      up.onclick = () => moveItemWithinScope(lessonId, itemId, -1);

      const down = document.createElement('button');
      down.type = 'button';
      down.className = 'btn';
      down.textContent = '↓';
      down.title = 'Færa niður';
      down.disabled = pos < 0 || pos >= sameScope.length - 1;
      down.onclick = () => moveItemWithinScope(lessonId, itemId, 1);

      controls.append(up, down);
      task.insertBefore(controls, del);
      task.dataset.orderReady = 'true';
    });
  }

  function setupOrderingObserver() {
    const host = document.getElementById('lessons');
    if (!host) return;
    new MutationObserver(() => enhanceItemOrdering()).observe(host, { childList: true, subtree: true });
    enhanceItemOrdering();
  }

  function wrapRenderers() {
    normalizeItemOrder();

    if (typeof renderToday === 'function' && !renderToday.__enhancedDailyHeader) {
      const originalRenderToday = renderToday;
      renderToday = function() {
        normalizeItemOrder();
        const result = originalRenderToday.apply(this, arguments);
        updateDailyDayHeader();
        return result;
      };
      renderToday.__enhancedDailyHeader = true;
    }

    if (typeof renderLessons === 'function' && !renderLessons.__sortedItems) {
      const originalRenderLessons = renderLessons;
      renderLessons = function() {
        normalizeItemOrder();
        const result = originalRenderLessons.apply(this, arguments);
        requestAnimationFrame(enhanceItemOrdering);
        return result;
      };
      renderLessons.__sortedItems = true;
    }

    if (typeof addItem === 'function' && !addItem.__sortedItems) {
      const originalAddItem = addItem;
      addItem = function() {
        const result = originalAddItem.apply(this, arguments);
        normalizeItemOrder();
        save();
        renderLessons();
        return result;
      };
      addItem.__sortedItems = true;
    }
  }

  function setup() {
    ids.forEach(convert);
    if (!selectedDays.size) selectedDays = new Set([selectedDay]);
    renderLessonDays();
    updateHelpText();
    installLessonCreation();
  }

  function apply() {
    wrapRenderers();
    setup();
    setupSelectAllObserver();
    setupOrderingObserver();
    updateDailyDayHeader();
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
