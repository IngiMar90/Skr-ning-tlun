(function(){
  if(typeof db==='undefined'||typeof days==='undefined') return;
  if(!db.attendanceConfig) db.attendanceConfig={};
  days.forEach(function(_,i){if(!db.attendanceConfig[i]) db.attendanceConfig[i]={enabled:false};});
  if(!db.attendance) db.attendance={};

  var style=document.createElement('style');
  style.textContent='\n    .attendance-setting{display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:12px;padding:12px;margin:10px 0 14px;background:#f8fafc}\n    .attendance-setting input{width:22px;height:22px;accent-color:var(--accent)}\n    .day-lesson.attendance{border-color:var(--ok)}\n    .attendance .day-lesson-head{background:var(--oksoft)}\n    .att-check{width:25px;height:25px}.att-present{accent-color:var(--ok)}.att-leave{accent-color:var(--danger)}\n    .badge.leave{background:#fff1f0;color:var(--danger)}\n    .slot.attendance-slot{border-color:var(--ok);background:var(--oksoft)}\n  ';
  document.head.appendChild(style);

  function attendanceFor(date){if(!db.attendance[date])db.attendance[date]={};return db.attendance[date];}
  function attendanceEnabled(date){var cfg=db.attendanceConfig[dayIndex(date)];return !!(cfg&&cfg.enabled);}
  function hasLeave(date,studentId){return attendanceEnabled(date)&&attendanceFor(date)[studentId]==='leave';}
  function studentsForLessons(date){return activeStudents().filter(function(s){return !hasLeave(date,s.id);});}
  function firstLessonStep(){return attendanceEnabled(current)?1:0;}
  function totalSteps(lessons){return lessons.length+firstLessonStep();}

  function updateDayButton(){
    var button=document.getElementById('todayBtn');
    if(button&&current){
      button.textContent=days[dayIndex(current)];
      if(current===todayIso()) button.classList.add('primary'); else button.classList.remove('primary');
    }
    var label=document.getElementById('dateLabel');
    if(label) label.textContent=pretty(current);
  }

  function ensureAttendanceSetting(){
    if(document.getElementById('attendanceSetting')) return;
    var daysEl=document.getElementById('days'); if(!daysEl) return;
    var box=document.createElement('div'); box.id='attendanceSetting'; daysEl.insertAdjacentElement('afterend',box);
  }
  function renderAttendanceSetting(){
    ensureAttendanceSetting();
    var host=document.getElementById('attendanceSetting'); if(!host) return;
    var cfg=db.attendanceConfig[selectedDay]||{enabled:false};
    host.innerHTML='<label class="attendance-setting"><input id="attendanceEnabled" type="checkbox" '+(cfg.enabled?'checked':'')+'><span><strong>Mætingarskráning</strong><br><span class="help">Birtist á undan fyrsta tíma. Nemandi merktur „Leyfi“ hverfur úr skráningu það sem eftir er dags.</span></span></label>';
    document.getElementById('attendanceEnabled').onchange=function(e){db.attendanceConfig[selectedDay]={enabled:e.target.checked};save();renderAttendanceSetting();};
  }

  var originalRenderSettings=renderSettings;
  renderSettings=function(){originalRenderSettings();ensureAttendanceSetting();renderAttendanceSetting();};
  var originalRenderDays=renderDays;
  renderDays=function(){originalRenderDays();renderAttendanceSetting();var buttons=document.querySelectorAll('[data-day]');Array.prototype.forEach.call(buttons,function(b){b.onclick=function(){selectedDay=+b.dataset.day;renderDays();renderLessons();};});};

  function defaultStep(lessons){
    if(attendanceEnabled(current)){var a=attendanceFor(current),all=activeStudents();if(all.some(function(s){return !a[s.id];})) return 0;}
    if(!lessons.length) return 0;
    if(current===todayIso()){
      var i=lessons.findIndex(function(l){return isCurrentLesson(l,current);}); if(i>=0) return i+firstLessonStep();
      var now=currentTime(),next=lessons.findIndex(function(l){return l.from>now;}); if(next>=0) return next+firstLessonStep();
      return lessons.length-1+firstLessonStep();
    }
    return firstLessonStep();
  }

  function navHtml(title,sub,step,total,cur){return '<div class="lesson-nav"><button id="prevLesson" class="btn arrow" '+(step===0?'disabled':'')+'>← <span style="font-size:14px">Síðasti tími</span></button><div class="lesson-nav-center"><div class="lesson-name">'+title+'</div>'+(sub?'<div class="lesson-time">'+sub+'</div>':'')+(cur?'<span class="badge">Núverandi tími</span>':'')+'<div class="help">Skráning '+(step+1)+' af '+total+'</div></div><button id="nextLesson" class="btn arrow" '+(step===total-1?'disabled':'')+'><span style="font-size:14px">Næsti tími</span> →</button></div>';}

  function renderAttendanceStep(lessons){
    var studs=activeStudents().slice().sort(function(a,b){return a.name.localeCompare(b.name,'is',{sensitivity:'base'});});
    var a=attendanceFor(current),total=totalSteps(lessons);
    var h=navHtml('Mæting','Á undan fyrsta tíma',manualLessonIndex,total,false);
    h+='<div class="day-lesson attendance"><div class="day-lesson-head"><div><strong>Mæting</strong><div class="lesson-time">Veldu annað hvort Mættur eða Leyfi</div></div></div><div class="table-wrap"><table class="tbl"><thead><tr><th>Nemandi</th><th>Mættur</th><th>Leyfi</th></tr></thead><tbody>';
    studs.forEach(function(s){h+='<tr><td><strong>'+esc(s.name)+'</strong>'+(a[s.id]==='leave'?' <span class="badge leave">Leyfi í dag</span>':'')+'</td><td><input class="att-check att-present" type="checkbox" data-att="'+s.id+'|present" '+(a[s.id]==='present'?'checked':'')+'></td><td><input class="att-check att-leave" type="checkbox" data-att="'+s.id+'|leave" '+(a[s.id]==='leave'?'checked':'')+'></td></tr>';});
    h+='</tbody></table></div></div>'; todayHost.innerHTML=h; bindLessonNav(total);
    var inputs=todayHost.querySelectorAll('[data-att]');
    Array.prototype.forEach.call(inputs,function(x){x.onchange=function(){var parts=x.dataset.att.split('|'),sid=parts[0],status=parts[1],aa=attendanceFor(current);if(x.checked) aa[sid]=status; else if(aa[sid]===status) delete aa[sid];save();renderAttendanceStep(lessons);};});
  }

  renderToday=function(){
    date.value=current; updateDayButton();
    var lessons=lessonsForCurrentDay(),total=totalSteps(lessons);
    if(!total){todayHost.innerHTML='<div class="empty"><strong>Engin skráning á þessum degi.</strong><br>Það eru engir tímar skráðir og slökkt er á mætingarskráningu.</div>';return;}
    if(manualLessonIndex===null||manualLessonIndex<0||manualLessonIndex>=total) manualLessonIndex=defaultStep(lessons);
    if(attendanceEnabled(current)&&manualLessonIndex===0){renderAttendanceStep(lessons);return;}
    var lessonIndex=manualLessonIndex-firstLessonStep(),l=lessons[lessonIndex]; if(!l){manualLessonIndex=0;renderToday();return;}
    var studs=studentsForLessons(current).slice().sort(function(a,b){return a.name.localeCompare(b.name,'is',{sensitivity:'base'});}),items=l.items||[],r=rec(current,l.id),cur=isCurrentLesson(l,current);
    var h=navHtml(esc(l.name),l.from+'–'+l.to,manualLessonIndex,total,cur);
    if(attendanceEnabled(current)){var leaveCount=activeStudents().length-studs.length;if(leaveCount) h+='<div class="help" style="margin:-4px 0 12px">'+leaveCount+' '+(leaveCount===1?'nemandi er':'nemendur eru')+' með leyfi og '+(leaveCount===1?'birtist':'birtast')+' því ekki í þessum tíma.</div>';}
    if(!items.length){todayHost.innerHTML=h+'<div class="day-lesson"><div class="empty">Engin verkefni skráð í þennan tíma.</div></div>';bindLessonNav(total);return;}
    h+='<div class="day-lesson"><div class="day-lesson-head"><div><strong>'+esc(l.name)+'</strong><div class="lesson-time">'+l.from+'–'+l.to+'</div></div></div><div class="table-wrap"><table class="tbl"><thead><tr><th>Nemandi</th>';
    items.forEach(function(it){h+='<th class="'+(it.scope==='student'?'personal-head':'')+'">'+esc(it.name)+'<br><span class="badge '+(it.scope==='student'?'personal':'')+'">'+(it.scope==='student'?((db.students.find(function(s){return s.id===it.studentId;})||{}).name||'Sér'):'Sameiginlegt')+'</span></th>';});
    h+='</tr></thead><tbody>';
    studs.forEach(function(s){h+='<tr><td><strong>'+esc(s.name)+'</strong></td>';items.forEach(function(it){var ok=it.scope!=='student'||it.studentId===s.id;h+=ok?'<td><input class="check" type="checkbox" data-done="'+l.id+'|'+s.id+'|'+it.id+'" '+((r.done[s.id]&&r.done[s.id][it.id])?'checked':'')+'></td>':'<td class="na">—</td>';});h+='</tr>';});
    h+='</tbody></table></div></div>'; todayHost.innerHTML=h; bindLessonNav(total);
    var doneInputs=todayHost.querySelectorAll('[data-done]');Array.prototype.forEach.call(doneInputs,function(x){x.onchange=function(){var parts=x.dataset.done.split('|'),lid=parts[0],sid=parts[1],iid=parts[2],rr=rec(current,lid);if(!rr.done[sid])rr.done[sid]={};rr.done[sid][iid]=x.checked;save();};});
  };

  var originalTimetable=renderTimetable;
  renderTimetable=function(){originalTimetable();var cols=timetableHost.querySelectorAll('.day-col');Array.prototype.forEach.call(cols,function(col,i){if(db.attendanceConfig[i]&&db.attendanceConfig[i].enabled){var body=col.querySelector('.day-body');if(body&&!body.querySelector('.attendance-slot')){var slot=document.createElement('div');slot.className='slot attendance-slot';slot.innerHTML='<div class="slot-name">✓ Mæting</div><div class="slot-time">Fyrir fyrsta tíma</div><div class="slot-items">Mættur / Leyfi</div>';body.insertBefore(slot,body.firstChild);}}});};

  renderOverview=function(){
    var from=ovFrom.value,to=ovTo.value,who=ovStudent.value,studs=who==='all'?db.students:db.students.filter(function(s){return s.id===who;}),possible=0,done=0;
    Object.entries(db.records).filter(function(pair){return pair[0]>=from&&pair[0]<=to;}).forEach(function(pair){var recordDate=pair[0],lessonRecs=pair[1];Object.entries(lessonRecs).forEach(function(lr){var lid=lr[0],r=lr[1],lesson=Object.values(db.schedule).reduce(function(all,x){return all.concat(x);},[]).find(function(l){return l.id===lid;});if(!lesson)return;studs.filter(function(st){return !hasLeave(recordDate,st.id);}).forEach(function(st){(lesson.items||[]).filter(function(it){return it.scope!=='student'||it.studentId===st.id;}).forEach(function(it){possible++;if(r.done&&r.done[st.id]&&r.done[st.id][it.id])done++;});});});});
    var pct=possible?Math.round(done/possible*100):0;ovHost.innerHTML='<div class="summary"><div class="stat"><b>'+pct+'%</b><span>Lokið</span></div><div class="stat"><b>'+done+'</b><span>Lokið verkefni</span></div><div class="stat"><b>'+possible+'</b><span>Möguleg verkefni</span></div></div>';
  };

  csv.onclick=function(){
    var rows=[['Dagsetning','Tími','Frá','Til','Nemandi','Verkefni','Tegund','Lokið']];
    Object.entries(db.records).filter(function(pair){return pair[0]>=exFrom.value&&pair[0]<=exTo.value;}).forEach(function(pair){var recordDate=pair[0],lessonRecs=pair[1];Object.entries(lessonRecs).forEach(function(lr){var lid=lr[0],r=lr[1],l=Object.values(db.schedule).reduce(function(all,x){return all.concat(x);},[]).find(function(x){return x.id===lid;});if(!l)return;db.students.filter(function(st){return !hasLeave(recordDate,st.id);}).forEach(function(st){(l.items||[]).filter(function(it){return it.scope!=='student'||it.studentId===st.id;}).forEach(function(it){rows.push([recordDate,l.name,l.from,l.to,st.name,it.name,it.scope==='student'?'Einstaklings':'Sameiginlegt',(r.done&&r.done[st.id]&&r.done[st.id][it.id])?'Já':'Nei']);});});});});
    dl('namskraning.csv','\ufeff'+rows.map(function(r){return r.map(cell).join(';');}).join('\n'),'text/csv;charset=utf-8');
  };

  save();

  if(!document.querySelector('script[data-daily-tools-loader]')){
    var tools=document.createElement('script');
    tools.src='./daily-tools.js?v=2';
    tools.defer=true;
    tools.setAttribute('data-daily-tools-loader','1');
    document.head.appendChild(tools);
  }
})();