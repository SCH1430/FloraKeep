const growthChronicle = (() => {
  const calendars=new Map();
  function format(at,kind){
    const locale=floraLocale.get();
    if(!calendars.has(locale)){
      calendars.set(locale,{
        day:new Intl.DateTimeFormat(locale,{day:'numeric',month:'long',year:'numeric'}),
        shortDay:new Intl.DateTimeFormat(locale,{day:'numeric',month:'short'}),
        clock:new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit'}),
      });
    }
    return calendars.get(locale)[kind].format(at);
  }
  const t=(key,values)=>floraLocale.t(key,values);
  const thumbnailCount = 4;
  const dateTime = at => `${format(at,'day')}, ${format(at,'clock')}`;
  const stamp = at => new Date(at).toISOString();

  function prepare(plant, rows, journal=[]) {
    // Stored observations are already validated, deduplicated and ordered by the save loader.
    const frames=[];
    for(const [index,row] of rows.entries()){
      const previous=rows[index-1];
      if(previous&&visualJournal.hasObservationGap(previous.at,row.at)){
        frames.push({kind:'gap',from:previous.at,to:row.at});
      }
      frames.push({kind:'sample',row,number:index+1});
    }
    const careByDay=new Map();
    for(const event of visualJournal.careEventsForPlant(journal,plant.id)){
      const date=format(event.at,'day');
      if(!careByDay.has(date))careByDay.set(date,[]);
      careByDay.get(date).push(event);
    }
    return {plant,frames,careByDay,total:rows.length};
  }

  function describe(frame,model){
    if(frame.kind==='gap')return t('chronicleGapRange',{start:dateTime(frame.from),end:dateTime(frame.to)});
    return t('chronicleFrameSpoken',{number:frame.number,total:model.total,date:dateTime(frame.row.at)});
  }

  function picture(model,frame,slot,plantArt) {
    if(frame.kind==='gap')return '<span class="chronicle-missing" aria-hidden="true">···</span>';
    const {plant}=model, {row}=frame;
    return plantArt(plant.speciesId,{
      id:`chronicle-${slot}-${plant.id}-${row.at}`, variant:plant.lineageId||plant.id,
      growth:featureModule.artworkGrowth(row,row.bloomPhase??null), moisture:row.moisture,
      pot:'cream',shape:'classic',light:'day',
    });
  }

  function caption(model,frame) {
    if(frame.kind==='gap'){
      return `<p class="chronicle-counter">${t('chronicleMissing')}</p><h4>${t('chronicleNoFrames')}</h4>
        <p class="chronicle-interval"><time datetime="${stamp(frame.from)}">${dateTime(frame.from)}</time><span> — </span><time datetime="${stamp(frame.to)}">${dateTime(frame.to)}</time></p>`;
    }
    const {row,number}=frame;
    const phase={bloom:'chronicleBloom',bud:'chronicleBuds',rest:'chronicleRest'}[row.bloomPhase];
    const events=model.careByDay.get(format(row.at,'day'))||[];
    const care=events.length?`<details class="chronicle-care"><summary>${t('chronicleDailyCare',{count:events.length})}</summary>
      <ul>${events.map(event=>`<li><time datetime="${stamp(event.at)}">${format(event.at,'clock')}</time> ${t(event.type==='water'?'chronicleWatered':'chronicleFed')}</li>`).join('')}</ul></details>`:'';
    return `<p class="chronicle-counter">${t('chronicleFrame',{number,total:model.total})}</p><h4><time datetime="${stamp(row.at)}">${format(row.at,'day')} <small>${format(row.at,'clock')}</small></time></h4>
      <dl class="chronicle-readings"><div><dt>${t('growth')}</dt><dd>${Math.round(row.growth*100)}%</dd></div><div><dt>${t('moisture')}</dt><dd>${Math.round(row.moisture)}%</dd></div>
      ${Number.isFinite(row.health)?`<div><dt>${t('health')}</dt><dd>${Math.round(row.health)}%</dd></div>`:''}</dl>${phase?`<p>${t(phase)}</p>`:''}${care}`;
  }

  function stripPage(index,length){
    return Math.min(Math.floor(index/thumbnailCount)*thumbnailCount,Math.max(0,length-thumbnailCount));
  }

  function strip(model,index,plantArt){
    const offset=stripPage(index,model.frames.length);
    return model.frames.slice(offset,offset+thumbnailCount).map((frame,local)=>{
      const at=offset+local, gap=frame.kind==='gap';
      const label=gap?t('chronicleGap'):`${format(frame.row.at,'shortDay')} · ${format(frame.row.at,'clock')}`;
      return `<button type="button" class="chronicle-slide" data-chronicle-index="${at}" aria-label="${describe(frame,model)}"${at===index?' aria-current="true"':''}>
        <span class="chronicle-mini${gap?' is-gap':''}" aria-hidden="true">${picture(model,frame,'strip',plantArt)}</span><span>${label}</span></button>`;
    }).join('');
  }

  function markup(model,escapedName,plantArt) {
    const index=model.frames.length-1, frame=model.frames[index];
    if(!frame)return `<section class="growth-chronicle chronicle-empty"><h3>${escapedName}</h3><p>${t('chronicleEmpty')}</p></section>`;
    const single=model.frames.length===1;
    return `<section class="growth-chronicle" aria-label="${t('plantChronicle')}">
      <h3 class="chronicle-name">${escapedName}</h3>
      <div class="chronicle-spread">
        <div class="chronicle-photo" data-chronicle-photo ${single?'':'tabindex="0"'} role="group" aria-label="${t(single?'chronicleView':'chronicleViewKeys')}">
          <div class="chronicle-exposure" data-chronicle-image aria-hidden="true">${picture(model,frame,'main',plantArt)}</div>
        </div>
        <div class="chronicle-caption" data-chronicle-caption>${caption(model,frame)}</div>
      </div>
      <div class="chronicle-controls">
        <button type="button" class="button secondary" data-chronicle-step="-1"${single?' disabled':''}>${t('chronicleEarlier')}</button>
        <label class="chronicle-scrubber"><span>${t('chronicleFilm')}</span><input type="range" min="0" max="${index}" step="1" value="${index}" aria-valuetext="${describe(frame,model)}" data-chronicle-range${single?' disabled':''}></label>
        <button type="button" class="button secondary" data-chronicle-step="1" disabled>${t('chronicleLater')}</button>
      </div>
      <div class="chronicle-strip" data-chronicle-strip role="group" aria-label="${t('chronicleThumbnails')}">${strip(model,index,plantArt)}</div>
      <p class="form-help chronicle-explanation">${single?t('chronicleSingle')+' ':''}${t('chronicleSource')}</p>
      <p class="sr-only" data-chronicle-status role="status" aria-live="polite"></p>
    </section>`;
  }

  function connect(root,model,plantArt,animate,signal){
    if(model.frames.length<2)return;
    let current=model.frames.length-1,gesture=null;
    const photo=root.querySelector('[data-chronicle-photo]');
    const range=root.querySelector('[data-chronicle-range]');
    const exposure=root.querySelector('[data-chronicle-image]');
    const thumbs=root.querySelector('[data-chronicle-strip]');
    const info=root.querySelector('[data-chronicle-caption]');
    const status=root.querySelector('[data-chronicle-status]');
    const steps=root.querySelectorAll('[data-chronicle-step]');
    function select(index){
      if(!Number.isInteger(index)||index<0||index>=model.frames.length||index===current)return;
      const previous=current, frame=model.frames[index], active=root.ownerDocument.activeElement;
      current=index;
      const oldImage=exposure.firstElementChild;
      exposure.innerHTML=picture(model,frame,'main',plantArt);
      const gap=frame.kind==='gap';
      photo.classList.toggle('is-gap',gap);
      if(!gap&&model.frames[previous].kind==='sample'&&oldImage){
        const fade=animate(oldImage,[{opacity:1},{opacity:0}],{duration:220,easing:'ease-out'});
        if(fade){
          oldImage.classList.add('chronicle-outgoing');
          exposure.append(oldImage);
          fade.finished.then(()=>oldImage.remove(),()=>oldImage.remove());
        }
      }
      info.innerHTML=caption(model,frame);
      range.value=String(index);
      const description=describe(frame,model);
      range.setAttribute('aria-valuetext',description);
      if(active!==range)status.textContent=description;
      for(const button of steps){
        const outOfRange=index+Number(button.dataset.chronicleStep);
        button.disabled=outOfRange<0||outOfRange>=model.frames.length;
        if(button.disabled&&active===button)photo.focus({preventScroll:true});
      }
      if(stripPage(previous,model.frames.length)!==stripPage(index,model.frames.length)){
        const restoreThumb=thumbs.contains(active);
        thumbs.innerHTML=strip(model,index,plantArt);
        if(restoreThumb)thumbs.querySelector('[aria-current]')?.focus({preventScroll:true});
      }else{
        thumbs.querySelector('[aria-current]')?.removeAttribute('aria-current');
        thumbs.querySelector(`[data-chronicle-index="${index}"]`)?.setAttribute('aria-current','true');
      }
    }
    root.addEventListener('click',event=>{
      const target=event.target.closest('[data-chronicle-step],[data-chronicle-index]');
      if(!target||target.disabled)return;
      select(target.hasAttribute('data-chronicle-step')?current+Number(target.dataset.chronicleStep):Number(target.dataset.chronicleIndex));
    },{signal});
    range.addEventListener('input',()=>select(Number(range.value)),{signal});
    photo.addEventListener('keydown',event=>{
      const keys={ArrowLeft:current-1,ArrowRight:current+1,Home:0,End:model.frames.length-1};
      if(!Object.hasOwn(keys,event.key))return;
      event.preventDefault();
      select(keys[event.key]);
    },{signal});
    photo.addEventListener('pointerdown',event=>{
      if(!event.isPrimary||event.button!==0)return;
      gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
      photo.setPointerCapture?.(event.pointerId);
    },{signal});
    photo.addEventListener('pointerup',event=>{
      if(!gesture||gesture.id!==event.pointerId)return;
      const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
      gesture=null;
      if(Math.abs(dx)>=40&&Math.abs(dx)>1.5*Math.abs(dy))select(current+(dx<0?1:-1));
    },{signal});
    photo.addEventListener('lostpointercapture',()=>{gesture=null;},{signal});
    photo.addEventListener('pointercancel',()=>{gesture=null;},{signal});
  }

  return Object.freeze({prepare,markup,connect});
})();
