(function(){
  if(typeof db==='undefined'||typeof days==='undefined') return;

  if(!db.attendanceConfig) db.attendanceConfig={};
  days.forEach((_,i)=>{if(!db.attendanceConfig[i]) db.attendanceConfig[i]={enabled:false};});
  if(!db.attendance) db.attendance={};

  const style=document.createElement('style');
  style.textContent=`
    .attendance-setting{display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:12px;padding:12px;margin:10px 0 14px;background:#f8fafc}
    .attendance-setting input{width:22px;height:22px;accent-color:var(--accent)}
    .day-lesson.attendance{border-color:var(--ok)}
    .attendance .day-lesson-head{background:var(--oksoft)}
    .att-check{width:25px;height:25px}.att-present{accent-color:var(--ok)}.att-leave{accent-color:var(--danger)}
    .badge.leave{background:#fff1f0;color:var(--danger)}
    .slot.attendance-slot{border-color:var(--ok);background:var(--oksoft)}
  `;
  document.head.appendChild(style);

  function attendanceFor(date){if(!db.attendance[date])db.attendance[date]={};return db.attendance[date];}
  function attendanceEnabled(date){const cfg=db.attendanceConfig[dayIndex(date)];return !!(cfg&&cfg.enabled);}
  function hasLeave(date,studentId){return attendanceEnabled(date)&&attendanceFor(date)[studentId]==='leave';}
  function studentsForLessons(date){return activeStudents().filter(s=>!hasLeave(date,s.id));}
  function firstLessonStep(){return attendanceEnabled(current)?1:0;}
  function totalSteps(lessons){return lessons.length+firstLessonStep();}

  function ensureAttendanceSetting(){
    if(document.getElementById('attendanceSetting')) return;
    const daysEl=document.getElementById('days');
    if(!daysEl) return;
    const box=document.createElement('div');
    box.id='attendanceSetting';
    daysEl.insertAdjacentElement('afterend',box);
  }
  function renderAttendanceSetting(){
    ensureAttendanceSetting();
    const host=document.getElementById('attendanceSetting');
    if(!host) return;
    const cfg=db.attendanceConfig[selectedDay]||{enabled:false};
    host.innerHTML=`<label class="attendance-setting"><input id="attendanceEnabled" type="checkbox" ${cfg.enabled?'checked':''}><span><strong>Mætingarskráning</strong><br><span class="help">Birtist á undan fyrsta tíma. Nemandi merktur „Leyfi“ hverfur úr skráningu það sem eftir er dags.</span></span></label>`;
    document.getElementById('attendanceEnabled').onchange=e=>{
      db.attendanceConfig[selectedDay]={enabled:e.target.checked};
      save();
      renderAttendanceSetting();
    };
  }

  const originalRenderSettings=renderSettings;
  renderSettings=function(){originalRenderSettings();ensureAttendanceSetting();renderAttendanceSetting();};

  const originalRenderDays=renderDays;
  renderDays=function(){
    originalRenderDays();
    renderAttendanceSetting();
    document.querySelectorAll('[data-day]').forEach(b=>{
      b.onclick=()=>{selectedDay=+b.dataset.day;renderDays();renderLessons();};
    });
  };

  function defaultStep(lessons){
    if(attendanceEnabled(current)){
      const a=attendanceFor(current),all=activeStudents();
      if(all.some(s=>!a[s.id])) return 0;
    }
    if(!lessons.length) return 0;
    if(current===todayIso()){
      const i=lessons.findIndex(l=>isCurrentLesson(l,current));
      if(i>=0) return i+firstLessonStep();
      const now=currentTime(),next=lessons.findIndex(l=>l.from>now);
      if(next>=0) return next+firstLessonStep();
      return lessons.length-1+firstLessonStep();
    }
    return firstLessonStep();
  }

  function navHtml(title,sub,step,total,cur){
    return `<div class="lesson-nav"><button id="prevLesson" class="btn arrow" ${step===0?'disabled':''}>←</button><div class="lesson-nav-center"><div class="lesson-name">${title}</div>${sub?`<div class="lesson-time">${sub}</div>`:''}${cur?'<span class="badge">Núverandi tími</span>':''}<div class="help">Skráning ${step+1} af ${total}</div></div><button id="nextLesson" class="btn arrow" ${step===total-1?'disabled':''}>→</button></div>`;
  }

  function renderAttendanceStep(lessons){
    const studs=activeStudents().slice().sort((a,b)=>a.name.localeCompare(b.name,'is',{sensitivity:'base'}));
    const a=attendanceFor(current),total=totalSteps(lessons);
    let h=navHtml('Mæting','Á undan fyrsta tíma',manualLessonIndex,total,false);
    h+=`<div class="day-lesson attendance"><div class="day-lesson-head"><div><strong>Mæting</strong><div class="lesson-time">Veldu annað hvort Mættur eða Leyfi</div></div></div><div class="table-wrap"><table class="tbl"><thead><tr><th>Nemandi</th><th>Mættur</th><th>Leyfi</th></tr></thead><tbody>`;
    studs.forEach(s=>{
      h+=`<tr><td><strong>${esc(s.name)}</strong>${a[s.id]==='leave'?' <span class="badge leave">Leyfi í dag</span>':''}</td><td><input class="att-check att-present" type="checkbox" data-att="${s.id}|present" ${a[s.id]==='present'?'checked':''}></td><td><input class="att-check att-leave" type="checkbox" data-att="${s.id}|leave" ${a[s.id]==='leave'?'checked':''}></td></tr>`;
    });
    h+='</tbody></table></div></div>';
    todayHost.innerHTML=h;
    bindLessonNav(total);
    todayHost.querySelectorAll('[data-att]').forEach(x=>x.onchange=()=>{
      const [sid,status]=x.dataset.att.split('|'),aa=attendanceFor(current);
      if(x.checked) aa[sid]=status; else if(aa[sid]===status) delete aa[sid];
      save();renderAttendanceStep(lessons);
    });
  }

  renderToday=function(){
    date.value=current;dateLabel.textContent=pretty(current);
    const lessons=lessonsForCurrentDay(),total=totalSteps(lessons);
    if(!total){todayHost.innerHTML='<div class="empty"><strong>Engin skráning á þessum degi.</strong><br>Það eru engir tímar skráðir og slökkt er á mætingarskráningu.</div>';return;}
    if(manualLessonIndex===null||manualLessonIndex<0||manualLessonIndex>=total) manualLessonIndex=defaultStep(lessons);
    if(attendanceEnabled(current)&&manualLessonIndex===0){renderAttendanceStep(lessons);return;}
    const lessonIndex=manualLessonIndex-firstLessonStep(),l=lessons[lessonIndex];
    if(!l){manualLessonIndex=0;renderToday();return;}
    const studs=studentsForLessons(current).slice().sort((a,b)=>a.name.localeCompare(b.name,'is',{sensitivity:'base'})),items=l.items||[],r=rec(current,l.id),cur=isCurrentLesson(l,current);
    let h=navHtml(esc(l.name),`${l.from}–${l.to}`,manualLessonIndex,total,cur);
    if(attendanceEnabled(current)){
      const leaveCount=activeStudents().length-studs.length;
      if(leaveCount) h+=`<div class="help" style="margin:-4px 0 12px">${leaveCount} ${leaveCount===1?'nemandi er':'nemendur eru'} með leyfi og ${leaveCount===1?'birtist':'birtast'} því ekki í þessum tíma.</div>`;
    }
    if(!items.length){todayHost.innerHTML=h+'<div class="day-lesson"><div class="empty">Engin verkefni skráð í þennan tíma.</div></div>';bindLessonNav(total);return;}
    h+=`<div class="day-lesson"><div class="day-lesson-head"><div><strong>${esc(l.name)}</strong><div class="lesson-time">${l.from}–${l.to}</div></div></div><div class="table-wrap"><table class="tbl"><thead><tr><th>Nemandi</th>`;
    items.forEach(it=>h+=`<th class="${it.scope==='student'?'personal-head':''}">${esc(it.name)}<br><span class="badge ${it.scope==='student'?'personal':''}">${it.scope==='student'?((db.students.find(s=>s.id===it.studentId)||{}).name||'Sér'):'Sameiginlegt'}</span></th>`);
    h+='</tr></thead><tbody>';
    studs.forEach(s=>{h+=`<tr><td><strong>${esc(s.name)}</strong></td>`;items.forEach(it=>{const ok=it.scope!=='student'||it.studentId===s.id;h+=ok?`<td><input class="check" type="checkbox" data-done="${l.id}|${s.id}|${it.id}" ${(r.done[s.id]&&r.done[s.id][it.id])?'checked':''}></td>`:'<td class="na">—</td>';});h+='</tr>';});
    h+='</tbody></table></div></div>';
    todayHost.innerHTML=h;bindLessonNav(total);
    todayHost.querySelectorAll('[data-done]').forEach(x=>x.onchange=()=>{const [lid,sid,iid]=x.dataset.done.split('|'),rr=rec(current,lid);if(!rr.done[sid])rr.done[sid]={};rr.done[sid][iid]=x.checked;save();});
  };

  renderTimetable=function(){
    const nowDay=(new Date().getDay()+6)%7,now=currentTime();let h='<div class="week-grid">';
    days.forEach((day,i)=>{const arr=(db.schedule[i]||[]).slice().sort((a,b)=>a.from.localeCompare(b.from));h+=`<div class="day-col ${i===nowDay?'today-col':''}"><div class="day-head">${day}</div><div class="day-body">`;
      if(db.attendanceConfig[i]&&db.attendanceConfig[i].enabled)h+='<div class="slot attendance-slot"><div class="slot-name">✓ Mæting</div><div class="slot-time">Fyrir fyrsta tíma</div><div class="slot-items">Mættur / Leyfi</div></div>';
      if(!arr.length&&!(db.attendanceConfig[i]&&db.attendanceConfig[i].enabled))h+='<div class="empty">Engir tímar</div>';
      arr.forEach(l=>{let status='future';if(i<nowDay)status='past';else if(i>nowDay)status='future';else if(now>=l.to)status='past';else if(now>=l.from&&now<l.to)status='current';const itemCount=(l.items||[]).length;h+=`<div class="slot ${status}"><div class="slot-name">${esc(l.name)}</div><div class="slot-time">${l.from}–${l.to}</div><div class="slot-items">${itemCount} verkefni</div></div>`;});h+='</div></div>';});h+='</div>';timetableHost.innerHTML=h;
  };

  renderOverview=function(){
    const from=ovFrom.value,to=ovTo.value,who=ovStudent.value,studs=who==='all'?db.students:db.students.filter(s=>s.id===who);let possible=0,done=0;
    Object.entries(db.records).filter(([d])=>d>=from&&d<=to).forEach(([recordDate,lessonRecs])=>Object.entries(lessonRecs).forEach(([lid,r])=>{const lesson=Object.values(db.schedule).flat().find(l=>l.id===lid);if(!lesson)return;studs.filter(st=>!hasLeave(recordDate,st.id)).forEach(st=>(lesson.items||[]).filter(it=>it.scope!=='student'||it.studentId===st.id).forEach(it=>{possible++;if(r.done&&r.done[st.id]&&r.done[st.id][it.id])done++;}));}));
    const pct=possible?Math.round(done/possible*100):0;ovHost.innerHTML=`<div class="summary"><div class="stat"><b>${pct}%</b><span>Lokið</span></div><div class="stat"><b>${done}</b><span>Lokið verkefni</span></div><div class="stat"><b>${possible}</b><span>Möguleg verkefni</span></div></div>`;
  };

  csv.onclick=()=>{
    const rows=[['Dagsetning','Tími','Frá','Til','Nemandi','Verkefni','Tegund','Lokið']];
    Object.entries(db.records).filter(([d])=>d>=exFrom.value&&d<=exTo.value).forEach(([recordDate,lessonRecs])=>Object.entries(lessonRecs).forEach(([lid,r])=>{const l=Object.values(db.schedule).flat().find(x=>x.id===lid);if(!l)return;db.students.filter(st=>!hasLeave(recordDate,st.id)).forEach(st=>(l.items||[]).filter(it=>it.scope!=='student'||it.studentId===st.id).forEach(it=>rows.push([recordDate,l.name,l.from,l.to,st.name,it.name,it.scope==='student'?'Einstaklings':'Sameiginlegt',(r.done&&r.done[st.id]&&r.done[st.id][it.id])?'Já':'Nei'])));}));
    dl('namskraning.csv','\ufeff'+rows.map(r=>r.map(cell).join(';')).join('\n'),'text/csv;charset=utf-8');
  };

  save();
})();
