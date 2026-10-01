(function(){
  function addStyles(){
    if(document.getElementById('dailyToolsStyles'))return;
    var style=document.createElement('style');
    style.id='dailyToolsStyles';
    style.textContent='.home-backup-actions{margin-top:18px;padding:18px 20px}.home-backup-actions h3{margin:0 0 6px}.home-backup-actions p{margin:0 0 12px;color:var(--muted)}.home-backup-buttons{display:flex;gap:10px;flex-wrap:wrap}.all-row th{background:#eef2ff!important;font-weight:900}.day-lesson.attendance .all-row{display:none!important}@media(max-width:620px){.home-backup-buttons{flex-direction:column}.home-backup-buttons .btn{width:100%}}';
    document.head.appendChild(style);
  }

  function downloadFile(name,text,type){
    var blob=new Blob([text],{type:type});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }

  function installHomeBackup(){
    var home=document.getElementById('home');
    if(!home||document.getElementById('homeBackupActions'))return;
    var panel=document.createElement('div');
    panel.id='homeBackupActions';
    panel.className='panel home-backup-actions';
    panel.innerHTML='<h3>Vista eða hlaða inn skráningu</h3><p>Vistaðu allt uppsett kerfið — nemendur, stundatöflu, verkefni, mætingu og skráningar — og hlaðið því hratt inn aftur síðar.</p><div class="home-backup-buttons"><button id="saveRegistrationBtn" class="btn primary" type="button">💾 Vista skráningu</button><button id="uploadRegistrationBtn" class="btn" type="button">📂 Upload skráningu</button><input id="uploadRegistrationFile" type="file" accept="application/json,.json" class="hidden"></div>';
    home.appendChild(panel);

    document.getElementById('saveRegistrationBtn').onclick=function(){
      var stamp=(typeof todayIso==='function'?todayIso():new Date().toISOString().slice(0,10));
      var payload={format:'namskraning-backup',version:1,savedAt:new Date().toISOString(),data:db};
      downloadFile('namskraning_'+stamp+'.json',JSON.stringify(payload,null,2),'application/json');
    };

    var picker=document.getElementById('uploadRegistrationFile');
    document.getElementById('uploadRegistrationBtn').onclick=function(){picker.value='';picker.click();};
    picker.onchange=function(){
      var file=picker.files&&picker.files[0];if(!file)return;
      var reader=new FileReader();
      reader.onload=function(){
        try{
          var parsed=JSON.parse(reader.result);
          var incoming=parsed&&parsed.format==='namskraning-backup'?parsed.data:parsed;
          if(!incoming||!Array.isArray(incoming.students)||!incoming.schedule||!incoming.records)throw new Error('invalid');
          if(!confirm('Hlaða þessari skráningu inn? Núverandi gögn á þessu tæki verða yfirskrifuð.'))return;
          db=incoming;
          if(!db.attendance)db.attendance={};
          if(!db.attendanceConfig)db.attendanceConfig={};
          for(var i=0;i<7;i++)db.attendanceConfig[i]={enabled:true};
          save();
          if(typeof renderSettings==='function')renderSettings();
          if(typeof renderTimetable==='function')renderTimetable();
          alert('Skráningin hefur verið hlaðin inn.');
          if(typeof show==='function')show('home');
        }catch(err){alert('Ekki tókst að lesa skrána. Gakktu úr skugga um að þetta sé vistuð Námskráningarskrá.');}
      };
      reader.readAsText(file);
    };
  }

  function removeWrongAttendanceAll(){
    var attendance=document.querySelector('#todayHost .day-lesson.attendance');
    if(!attendance)return false;
    var rows=attendance.querySelectorAll('tr.all-row');
    for(var i=0;i<rows.length;i++)rows[i].remove();
    return true;
  }

  function updateAllBox(box,inputs){
    if(!inputs.length){box.checked=false;box.indeterminate=false;box.disabled=true;return;}
    var checked=0;
    for(var i=0;i<inputs.length;i++)if(inputs[i].checked)checked++;
    box.disabled=false;
    box.checked=checked===inputs.length;
    box.indeterminate=checked>0&&checked<inputs.length;
  }

  function ensureNormalSelectAll(){
    if(removeWrongAttendanceAll())return;
    var table=document.querySelector('#todayHost table.tbl');
    if(!table)return;
    var tbody=table.querySelector('tbody'),thead=table.querySelector('thead');
    if(!tbody||!thead)return;
    var firstData=tbody.querySelector('input[data-done]');
    if(!firstData)return;

    var existing=thead.querySelector('tr.all-row');
    if(existing)existing.remove();
    var headerRow=thead.querySelector('tr');
    if(!headerRow)return;
    var columnCount=headerRow.children.length;
    var row=document.createElement('tr');row.className='all-row';
    var label=document.createElement('th');label.textContent='Allir';row.appendChild(label);

    for(var col=1;col<columnCount;col++){
      (function(columnIndex){
        var cell=document.createElement('th');
        var inputs=[];
        var bodyRows=tbody.querySelectorAll('tr');
        for(var r=0;r<bodyRows.length;r++){
          var td=bodyRows[r].children[columnIndex];
          if(td){var input=td.querySelector('input[data-done]');if(input)inputs.push(input);}
        }
        if(inputs.length){
          var box=document.createElement('input');box.type='checkbox';box.className='check';box.setAttribute('aria-label','Merkja alla í þessu verkefni');
          updateAllBox(box,inputs);
          box.onchange=function(){
            for(var j=0;j<inputs.length;j++){
              inputs[j].checked=box.checked;
              var ev=document.createEvent('HTMLEvents');ev.initEvent('change',true,false);inputs[j].dispatchEvent(ev);
            }
            box.indeterminate=false;
          };
          for(var k=0;k<inputs.length;k++)inputs[k].addEventListener('change',function(){setTimeout(function(){updateAllBox(box,inputs);},0);});
          cell.appendChild(box);
        }else cell.textContent='—';
        row.appendChild(cell);
      })(col);
    }
    thead.appendChild(row);
  }

  function apply(){
    addStyles();installHomeBackup();
    var host=document.getElementById('todayHost');
    if(host){
      var queued=false;
      new MutationObserver(function(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;ensureNormalSelectAll();});}).observe(host,{childList:true,subtree:true});
      ensureNormalSelectAll();
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();