(function(){
  if(typeof lessonsForCurrentDay!=='function'||typeof todayIso!=='function')return;

  var followClock=true;
  var lastAutoStep=null;

  function attendanceEnabledFor(date){
    if(!db||!db.attendanceConfig||typeof dayIndex!=='function')return false;
    var cfg=db.attendanceConfig[dayIndex(date)];
    return !!(cfg&&cfg.enabled);
  }

  function attendanceComplete(date){
    if(!attendanceEnabledFor(date))return true;
    var students=typeof activeStudents==='function'?activeStudents():[];
    var attendance=(db.attendance&&db.attendance[date])||{};
    for(var i=0;i<students.length;i++){
      if(attendance[students[i].id]!=='present'&&attendance[students[i].id]!=='leave')return false;
    }
    return true;
  }

  function targetStep(){
    if(current!==todayIso())return null;
    var lessons=lessonsForCurrentDay();
    var offset=attendanceEnabledFor(current)?1:0;

    if(offset&&!attendanceComplete(current))return 0;
    if(!lessons.length)return offset?0:null;

    var running=-1;
    for(var i=0;i<lessons.length;i++){
      if(typeof isCurrentLesson==='function'&&isCurrentLesson(lessons[i],current)){
        running=i;
        break;
      }
    }

    if(running>=0)return running+offset;

    var now=typeof currentTime==='function'?currentTime():null;
    if(now){
      for(var j=0;j<lessons.length;j++){
        if(lessons[j].from>now)return j+offset;
      }
      return lessons.length-1+offset;
    }
    return offset;
  }

  function syncToClock(force){
    if(!followClock&&!force)return;
    if(!document.getElementById('today')||document.getElementById('today').classList.contains('hidden'))return;
    var step=targetStep();
    if(step===null)return;
    if(force||manualLessonIndex!==step||lastAutoStep!==step){
      manualLessonIndex=step;
      lastAutoStep=step;
      if(typeof renderToday==='function')renderToday();
    }
  }

  document.addEventListener('click',function(e){
    var target=e.target;
    if(!target)return;
    var nav=target.closest?target.closest('#prevLesson,#nextLesson'):null;
    if(nav){
      followClock=false;
      return;
    }
    var currentBtn=target.closest?target.closest('#currentTimeBtn'):null;
    if(currentBtn){
      followClock=true;
      setTimeout(function(){syncToClock(true);},0);
      return;
    }
    var todayOpen=target.closest?target.closest('[data-open="today"]'):null;
    if(todayOpen){
      followClock=true;
      lastAutoStep=null;
      setTimeout(function(){syncToClock(true);},0);
    }
  },true);

  var dateInput=document.getElementById('date');
  if(dateInput){
    dateInput.addEventListener('change',function(){
      followClock=current===todayIso();
      lastAutoStep=null;
    });
  }

  setInterval(function(){syncToClock(false);},15000);
  setTimeout(function(){syncToClock(false);},1000);
})();
