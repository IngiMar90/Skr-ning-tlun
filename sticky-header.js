(()=>{
  let overlay=null;
  let innerTable=null;
  let activeTable=null;
  let activeWrap=null;

  function cleanup(){
    if(overlay){overlay.remove();overlay=null;innerTable=null;}
    activeTable=null;activeWrap=null;
  }

  function ensureOverlay(table,wrap){
    if(overlay && activeTable===table) return;
    cleanup();
    activeTable=table;activeWrap=wrap;

    overlay=document.createElement('div');
    overlay.id='floatingTaskHeader';
    Object.assign(overlay.style,{
      position:'fixed',
      top:'0',
      left:'0',
      display:'none',
      overflow:'hidden',
      zIndex:'9999',
      background:'#f8fafc',
      borderBottom:'1px solid var(--line,#e4e7ec)',
      boxShadow:'0 4px 12px rgba(16,24,40,.12)',
      pointerEvents:'none'
    });

    innerTable=document.createElement('table');
    innerTable.className='tbl floating-task-table';
    innerTable.style.margin='0';
    innerTable.style.borderCollapse='collapse';
    innerTable.style.tableLayout='fixed';
    overlay.appendChild(innerTable);
    document.body.appendChild(overlay);
  }

  function rebuild(){
    const table=document.querySelector('#todayHost table.tbl');
    const wrap=table ? table.closest('.table-wrap') : null;
    const headRow=table ? table.querySelector('thead tr:first-child') : null;
    if(!table||!wrap||!headRow){cleanup();return;}

    ensureOverlay(table,wrap);
    const cloned=headRow.cloneNode(true);
    cloned.querySelectorAll('input,button').forEach(el=>el.remove());
    innerTable.innerHTML='';
    const thead=document.createElement('thead');
    thead.appendChild(cloned);
    innerTable.appendChild(thead);

    const originals=[...headRow.children];
    const clones=[...cloned.children];
    originals.forEach((cell,i)=>{
      const w=cell.getBoundingClientRect().width;
      if(clones[i]){
        clones[i].style.width=w+'px';
        clones[i].style.minWidth=w+'px';
        clones[i].style.maxWidth=w+'px';
        clones[i].style.boxSizing='border-box';
        clones[i].style.background=getComputedStyle(cell).backgroundColor||'#f8fafc';
      }
    });
    sync();
  }

  function sync(){
    if(!activeTable||!activeWrap||!overlay||!innerTable) return;
    const tableRect=activeTable.getBoundingClientRect();
    const wrapRect=activeWrap.getBoundingClientRect();
    const head=activeTable.querySelector('thead tr:first-child');
    if(!head) return;
    const headRect=head.getBoundingClientRect();

    const shouldShow=headRect.top<0 && tableRect.bottom>headRect.height+4 && !(document.getElementById('today') && document.getElementById('today').classList.contains('hidden'));
    if(!shouldShow){overlay.style.display='none';return;}

    overlay.style.display='block';
    overlay.style.left=wrapRect.left+'px';
    overlay.style.width=Math.max(0,wrapRect.width)+'px';
    overlay.style.height=headRect.height+'px';
    innerTable.style.width=activeTable.scrollWidth+'px';
    innerTable.style.transform=`translateX(${-activeWrap.scrollLeft}px)`;

    const first=innerTable.querySelector('th:first-child');
    if(first){
      first.style.position='relative';
      first.style.zIndex='2';
      first.style.transform=`translateX(${activeWrap.scrollLeft}px)`;
      first.style.boxShadow='4px 0 8px rgba(16,24,40,.08)';
    }
  }

  function attach(){
    const table=document.querySelector('#todayHost table.tbl');
    const wrap=table ? table.closest('.table-wrap') : null;
    if(!table||!wrap){cleanup();return;}
    if(activeWrap!==wrap){
      activeWrap && activeWrap.removeEventListener('scroll',sync);
      wrap.addEventListener('scroll',sync,{passive:true});
    }
    rebuild();
  }

  window.addEventListener('scroll',sync,{passive:true});
  window.addEventListener('resize',()=>{rebuild();sync();},{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(rebuild,150));

  const host=document.getElementById('todayHost');
  if(host){
    new MutationObserver(()=>requestAnimationFrame(attach)).observe(host,{childList:true,subtree:true});
  }
  requestAnimationFrame(attach);
})();
