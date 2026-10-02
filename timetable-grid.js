(function(){
  if(typeof db==='undefined'||typeof days==='undefined')return;

  function mins(t){var p=String(t||'00:00').split(':');return Number(p[0]||0)*60+Number(p[1]||0);}
  function fmt(m){m=Math.max(0,Math.min(1439,m));var h=Math.floor(m/60),mm=m%60;return String(h).padStart(2,'0')+':'+String(mm).padStart(2,'0');}
  function roundDown(m,step){return Math.floor(m/step)*step;}
  function roundUp(m,step){return Math.ceil(m/step)*step;}
  function esc2(s){return typeof esc==='function'?esc(s):String(s||'');}

  function injectStyles(){
    if(document.getElementById('classicTimetableStyles'))return;
    var st=document.createElement('style');
    st.id='classicTimetableStyles';
    st.textContent='\
      .schedule-wrap{overflow:hidden!important}\
      .classic-tt-scroll{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;padding-bottom:8px}\
      .classic-tt{--timew:74px;--dayw:185px;display:grid;grid-template-columns:var(--timew) repeat(7,var(--dayw));grid-template-rows:auto auto minmax(320px,calc(100dvh - 285px));min-width:calc(var(--timew) + 7 * var(--dayw));border:1px solid var(--line);border-radius:14px;background:#fff;overflow:hidden}\
      .classic-tt-corner,.classic-tt-timehead{position:sticky;left:0;z-index:8;background:#f8fafc;border-right:1px solid var(--line)}\
      .classic-tt-dayhead{padding:10px 8px;text-align:center;font-weight:900;background:#f8fafc;border-right:1px solid var(--line);border-bottom:1px solid var(--line);white-space:nowrap}\
      .classic-tt-dayhead.today{background:var(--soft);color:var(--accent)}\
      .classic-tt-attlabel{position:sticky;left:0;z-index:7;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:var(--muted);background:#f8fafc;border-right:1px solid var(--line);border-bottom:1px solid var(--line);padding:8px}\
      .classic-tt-att{padding:7px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);background:#fff}\
      .classic-tt-attbox{height:100%;min-height:42px;border:1px solid var(--ok);background:var(--oksoft);border-radius:9px;padding:6px 8px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:900}\
      .classic-tt-timeaxis{position:sticky;left:0;z-index:6;background:#fff;border-right:1px solid var(--line);height:100%;min-height:0}\
      .classic-tt-time-label{position:absolute;right:8px;transform:translateY(-50%);font-size:11px;font-weight:850;color:var(--muted);white-space:nowrap}\
      .classic-tt-daycol{position:relative;height:100%;min-height:0;border-right:1px solid var(--line);background:repeating-linear-gradient(to bottom,#fff 0,#fff calc(var(--slot) - 1px),var(--line) calc(var(--slot) - 1px),var(--line) var(--slot))}\
      .classic-tt-daycol.today{background:repeating-linear-gradient(to bottom,var(--soft) 0,var(--soft) calc(var(--slot) - 1px),var(--line) calc(var(--slot) - 1px),var(--line) var(--slot))}\
      .classic-lesson{position:absolute;left:6px;right:6px;border:1px solid var(--line);border-radius:9px;padding:5px 7px;background:#fff;overflow:hidden;box-shadow:0 1px 2px rgba(16,24,40,.06)}\
      .classic-lesson.current{border:2px solid var(--accent);background:var(--soft)}\
      .classic-lesson.past{opacity:.62;background:var(--pastsoft)}\
      .classic-lesson.future{background:var(--futuresoft)}\
      .classic-lesson-name{font-size:12px;font-weight:900;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
      .classic-lesson-time,.classic-lesson-items{font-size:10px;color:var(--muted);font-weight:800;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
      .classic-now-line{position:absolute;left:0;right:0;height:2px;background:var(--danger);z-index:5;pointer-events:none}\
      .classic-now-dot{position:absolute;left:-4px;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--danger)}\
      @media(max-width:900px){.classic-tt{--dayw:165px;--timew:66px;grid-template-rows:auto auto minmax(300px,calc(100dvh - 250px))}}\
      @media(max-height:700px){.classic-tt{grid-template-rows:auto auto minmax(250px,calc(100dvh - 215px))}.classic-tt-dayhead{padding:7px 6px}.classic-tt-att{padding:5px}.classic-tt-attbox{min-height:34px}}\
    ';
    document.head.appendChild(st);
  }

  function allLessons(){
    var out=[];
    for(var i=0;i<days.length;i++){
      var arr=db.schedule[i]||[];
      for(var j=0;j<arr.length;j++)out.push(arr[j]);
    }
    return out;
  }

  function statusFor(dayIndex,lesson){
    var nowDay=(new Date().getDay()+6)%7,now=typeof currentTime==='function'?currentTime():fmt(new Date().getHours()*60+new Date().getMinutes());
    if(dayIndex<nowDay)return 'past';
    if(dayIndex>nowDay)return 'future';
    if(now>=lesson.to)return 'past';
    if(now>=lesson.from&&now<lesson.to)return 'current';
    return 'future';
  }

  function renderClassicTimetable(){
    injectStyles();
    var host=document.getElementById('timetableHost');if(!host)return;
    var lessons=allLessons();
    var starts=lessons.map(function(l){return mins(l.from);});
    var ends=lessons.map(function(l){return mins(l.to);});
    var start=starts.length?roundDown(Math.min.apply(null,starts),30):480;
    var end=ends.length?roundUp(Math.max.apply(null,ends),30):960;
    if(end<=start)end=start+60;
    var span=end-start,slots=Math.max(1,span/30);
    var nowDay=(new Date().getDay()+6)%7;

    var h='<div class="classic-tt-scroll"><div class="classic-tt" style="--slot:calc(100% / '+slots+')">';
    h+='<div class="classic-tt-corner"></div>';
    days.forEach(function(day,i){h+='<div class="classic-tt-dayhead '+(i===nowDay?'today':'')+'">'+esc2(day)+'</div>';});
    h+='<div class="classic-tt-attlabel">Mæting</div>';
    days.forEach(function(_,i){h+='<div class="classic-tt-att"><div class="classic-tt-attbox">✓ Mæting</div></div>';});

    h+='<div class="classic-tt-timeaxis">';
    for(var t=start;t<=end;t+=30){var top=((t-start)/span)*100;h+='<div class="classic-tt-time-label" style="top:'+top+'%">'+fmt(t)+'</div>';}
    h+='</div>';

    days.forEach(function(_,dayIdx){
      h+='<div class="classic-tt-daycol '+(dayIdx===nowDay?'today':'')+'">';
      var arr=(db.schedule[dayIdx]||[]).slice().sort(function(a,b){return a.from.localeCompare(b.from);});
      arr.forEach(function(l){
        var top=((mins(l.from)-start)/span)*100;
        var height=Math.max(3,((mins(l.to)-mins(l.from))/span)*100);
        var itemCount=(l.items||[]).length;
        h+='<div class="classic-lesson '+statusFor(dayIdx,l)+'" style="top:'+top+'%;height:'+height+'%" title="'+esc2(l.name)+' '+esc2(l.from)+'–'+esc2(l.to)+'"><div class="classic-lesson-name">'+esc2(l.name)+'</div><div class="classic-lesson-time">'+esc2(l.from)+'–'+esc2(l.to)+'</div><div class="classic-lesson-items">'+itemCount+' '+(itemCount===1?'verkefni':'verkefni')+'</div></div>';
      });
      if(dayIdx===nowDay){
        var d=new Date(),nowM=d.getHours()*60+d.getMinutes();
        if(nowM>=start&&nowM<=end){var nt=((nowM-start)/span)*100;h+='<div class="classic-now-line" style="top:'+nt+'%"><span class="classic-now-dot"></span></div>';}
      }
      h+='</div>';
    });
    h+='</div></div>';
    host.innerHTML=h;
  }

  window.renderTimetable=renderClassicTimetable;
  if(!document.getElementById('timetable').classList.contains('hidden'))renderClassicTimetable();

  setInterval(function(){
    var view=document.getElementById('timetable');
    if(view&&!view.classList.contains('hidden'))renderClassicTimetable();
  },60000);
})();