(function(){
  if(typeof db==='undefined') return;

  function normalizeName(value){
    return String(value||'').trim().toLocaleLowerCase('is');
  }

  function allLessons(){
    var out=[];
    Object.keys(db.schedule||{}).forEach(function(dayKey){
      (db.schedule[dayKey]||[]).forEach(function(lesson){
        out.push({day:Number(dayKey),lesson:lesson});
      });
    });
    return out;
  }

  function lessonsWithName(name){
    var key=normalizeName(name);
    return allLessons().filter(function(entry){return normalizeName(entry.lesson.name)===key;});
  }

  function setGroupSync(name,enabled){
    lessonsWithName(name).forEach(function(entry){entry.lesson.syncSameName=!!enabled;});
    if(typeof save==='function') save();
  }

  function groupIsSynced(name){
    var matches=lessonsWithName(name);
    return matches.length>1 && matches.some(function(entry){return entry.lesson.syncSameName===true;});
  }

  function addSyncControls(){
    var host=document.getElementById('lessons');
    if(!host) return;
    var cards=host.querySelectorAll('.lesson');
    for(var i=0;i<cards.length;i++){
      var card=cards[i];
      if(card.querySelector('[data-sync-same-name]')) continue;
      var deleteBtn=card.querySelector('[data-del]');
      if(!deleteBtn) continue;
      var lessonId=deleteBtn.dataset.del;
      var lesson=(db.schedule[selectedDay]||[]).find(function(x){return x.id===lessonId;});
      if(!lesson) continue;
      var matches=lessonsWithName(lesson.name);
      var title=card.querySelector('.lesson-name');
      if(!title) continue;

      var wrap=document.createElement('label');
      wrap.setAttribute('data-sync-same-name',lesson.id);
      wrap.style.display='inline-flex';
      wrap.style.alignItems='center';
      wrap.style.gap='7px';
      wrap.style.marginTop='7px';
      wrap.style.fontSize='13px';
      wrap.style.fontWeight='800';
      wrap.style.color='var(--muted)';

      var box=document.createElement('input');
      box.type='checkbox';
      box.checked=groupIsSynced(lesson.name);
      box.disabled=matches.length<2;
      box.style.width='20px';
      box.style.height='20px';
      box.style.accentColor='var(--accent)';
      box.onchange=(function(name){return function(e){
        setGroupSync(name,e.target.checked);
        if(typeof renderLessons==='function') renderLessons();
      };})(lesson.name);

      var text=document.createElement('span');
      text.textContent=matches.length<2?'Enginn annar tími með sama heiti':'Samstilla alla „'+lesson.name+'“ tíma ('+matches.length+')';
      wrap.appendChild(box);
      wrap.appendChild(text);
      title.parentNode.appendChild(wrap);
    }
  }

  function copyNewItemToMatchingLessons(sourceLesson,newItem){
    if(!sourceLesson||sourceLesson.syncSameName!==true||!newItem) return;
    lessonsWithName(sourceLesson.name).forEach(function(entry){
      var target=entry.lesson;
      if(target.id===sourceLesson.id) return;
      if(!target.items) target.items=[];
      var duplicate=target.items.some(function(item){
        return normalizeName(item.name)===normalizeName(newItem.name) && item.scope===newItem.scope && (item.studentId||null)===(newItem.studentId||null);
      });
      if(!duplicate){
        target.items.push({
          id:typeof uid==='function'?uid():(Math.random().toString(36).slice(2)+Date.now().toString(36)),
          name:newItem.name,
          scope:newItem.scope,
          studentId:newItem.studentId||null
        });
      }
      target.syncSameName=true;
    });
    if(typeof save==='function') save();
  }

  function installAddItemSync(){
    if(typeof addItem!=='function'||addItem.__sameNameSync) return;
    var original=addItem;
    addItem=function(lid){
      var source=(db.schedule[selectedDay]||[]).find(function(x){return x.id===lid;});
      var beforeIds=source&&source.items?source.items.map(function(x){return x.id;}):[];
      var result=original.apply(this,arguments);
      source=(db.schedule[selectedDay]||[]).find(function(x){return x.id===lid;});
      if(source&&source.syncSameName===true){
        var newItem=(source.items||[]).find(function(item){return beforeIds.indexOf(item.id)===-1;});
        if(newItem) copyNewItemToMatchingLessons(source,newItem);
      }
      if(typeof renderLessons==='function') renderLessons();
      return result;
    };
    addItem.__sameNameSync=true;
  }

  function wrapRenderLessons(){
    if(typeof renderLessons!=='function'||renderLessons.__sameNameSyncControls) return;
    var original=renderLessons;
    renderLessons=function(){
      var result=original.apply(this,arguments);
      setTimeout(addSyncControls,0);
      return result;
    };
    renderLessons.__sameNameSyncControls=true;
  }

  function apply(){
    installAddItemSync();
    wrapRenderLessons();
    addSyncControls();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply); else apply();
})();
