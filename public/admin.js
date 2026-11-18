(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const API='/.netlify/functions/owner';
  let state=null, editId=null, extraQuestions=[], stepOrder=[], nextExtraId=0, availableDays=[], availabilityBusy=false;
  const enabledSteps=new Set();
  const stepLabels={outing:'Activity',detail:'Activity follow-up',area:'Meeting area',schedule:'Calendar'};
  const timeDefaults=['Morning','Afternoon','Evening','Flexible time'];
  const defaults={
    screens:{
      ask:['{name}, would you like to go out with {sender}?','That’s the whole big, very important question. What do you think?','Ehhh... Alex has a question for ya. He sent a rabbit. Bold choice, huh?'],
      outing:['What would you like to do?','Pick an idea that actually sounds fun to you.','Here is the fun part. Coffee, wandering, food or sweets? I did not even put carrot farming on the list.'],
      area:['Where would be convenient?','No need to pick a specific place yet.','Somewhere comfortable for you, of course. My hop-mobile has a very limited range.'],
      schedule:['Which day works for you?','Pick a day from the calendar and a time of day, or decide together later.','Aha! The calendar! Pick a day that works for you. This rabbit does not do surprise alarms.'],
      success:['Bunny is doing happy little jumps!','You said yes to going out with Alex. I think this deserves a tiny celebration.','Well, would ya look at that! Mission accomplished! I knew this bow tie had magical powers!'],
      decline:['No worries at all','','Hey, no worries! Thanks for being straight with me. Here’s a little flower, on the house.']
    },
    outings:{coffee:'Coffee or tea',walk:'A walk and exploring',food:'A bite to eat',sweet:'Something sweet',surprise:'A little surprise'},
    details:{
      coffee:['What kind of coffee stop?',['A cosy café and a good chat','Takeaway coffee and a stroll','Tea or a different drink','You two can choose']],
      walk:['Where should we wander?',['A park and some nature','Exploring the city','Somewhere by the water','You two can choose']],
      food:['What food sounds good?',['Italian','Asian food','Street food or casual bites','You two can choose']],
      sweet:['Which sweet treat?',['Bakery or pastries','Ice cream or gelato','Waffles or pancakes','You two can choose']],
      surprise:['What should the surprise feel like?',['Calm and cosy','Playful and fun','Outside and exploring','Alex can come up with something']]
    },
    areas:['Somewhere near me','Somewhere near Alex','Meet halfway','Choose a place together']
  };
  function elt(tag,text,className){
    const v=document.createElement(tag);if(text!==undefined&&text!==null)v.textContent=String(text);if(className)v.className=className;return v;
  }
  function labelInput(label,value,placeholder,kind='input',max=180) {
    const outer=elt('div',null,'field'), title=elt('label',label);
    const input=elt(kind);
    if(kind==='input')input.type='text';
    input.value=value||'';input.placeholder=placeholder||'';input.maxLength=max;
    title.append(input);outer.append(title);
    return {outer,input};
  }
  async function api(action,method='GET',body){
    const hdr={'Accept':'application/json'};
    if(method!=='GET'){hdr['Content-Type']='application/json';if(state?.csrf)hdr['X-Bunny-CSRF']=state.csrf;}
    const res=await fetch(API+'?action='+encodeURIComponent(action),{
      method,credentials:'same-origin',cache:'no-store',headers:hdr,
      ...(method!=='GET'?{body:JSON.stringify(body||{})}:{})
    });
    const data=await res.json().catch(()=>({error:'Invalid server response'}));
    if(!res.ok)throw new Error(data.error||'Request failed');
    return data;
  }
  function notice(message,error=false) {
    const node=$('status');node.textContent=message;node.hidden=false;
    node.style.background=error?'#a33355':'#2d2937';
  }
  function resetPasswordVisibility(){
    $('password').type='password';
    $('toggle-owner-password').textContent='Show';
    $('toggle-owner-password').setAttribute('aria-label','Show password');
    $('toggle-owner-password').setAttribute('aria-pressed','false');
  }
  $('toggle-owner-password').addEventListener('click',()=>{
    const input=$('password'),button=$('toggle-owner-password');
    const show=input.type==='password';
    input.type=show?'text':'password';
    button.textContent=show?'Hide':'Show';
    button.setAttribute('aria-label',show?'Hide password':'Show password');
    button.setAttribute('aria-pressed',String(show));
  });
  function loggedOut(){
    state=null;$('invites').replaceChildren();$('invite-editor').hidden=true;$('invite-password').value='';
    $('dashboard').hidden=true;$('login').hidden=false;$('logout').hidden=true;
    $('password').value='';resetPasswordVisibility();
  }
  async function refresh(){
    try{
      state=await api('state');$('dashboard').hidden=false;$('login').hidden=true;$('logout').hidden=false;
      extraQuestions=Array.isArray(state.settings.extraQuestions)?state.settings.extraQuestions.map(x=>({...x,options:[...x.options]})):[];
      const allSteps=[...Object.keys(stepLabels),...extraQuestions.map(q=>q.id)];
      const configured=state.settings.workflow||allSteps;
      stepOrder=[...new Set([...configured,...allSteps])];
      enabledSteps.clear();
      configured.forEach(key=>enabledSteps.add(key));
      nextExtraId=extraQuestions.length;
      $('password').value='';resetPasswordVisibility();
      renderInvites();renderSettings();
      return true;
    }catch{loggedOut();return false;}
  }
  $('login-form').addEventListener('submit',async e=>{
    e.preventDefault();const button=e.submitter;button.disabled=true;$('login-error').textContent='';
    try{
      await api('login','POST',{email:$('email').value,password:$('password').value});
      if(!await refresh())throw new Error('Signed in, but Bunny Studio could not load your settings. Try reloading.');
      notice('Welcome back! Your Bunny Studio is ready.');
    }catch(error){$('login-error').textContent=error.message;}finally{button.disabled=false;$('password').value='';resetPasswordVisibility();}
  });
  $('logout').addEventListener('click',async()=>{
    try{await api('logout','POST');}catch{/* still lock local UI */}loggedOut();notice('Signed out.');
  });
  function renderInvites(){
    const region=$('invites');region.replaceChildren();
    if(!state.invites.length)region.append(elt('p','No active invitations. Create one to start.'));
    state.invites.forEach(inv=>{
      const row=elt('div',null,'invite');
      const left=elt('div');
      left.append(elt('h3',inv.name));
      left.append(elt('div',inv.id+' · '+(inv.enabled?'Active':'Paused'),'muted'));
      const edit=elt('button','Edit','btn');edit.type='button';edit.addEventListener('click',()=>openInvite(inv));
      const remove=elt('button','Delete','btn danger');remove.type='button';
      remove.addEventListener('click',async()=>{
        if(!confirm('Delete invitation for '+inv.name+'? This invalidates its password.'))return;
        try{const data=await api('delete','POST',{id:inv.id});state.invites=data.invites;renderInvites();notice('Invitation deleted.');}
        catch(error){notice(error.message,true);}
      });
      const tools=elt('div',null,'row');tools.append(edit,remove);
      const top=elt('div',null,'row between');top.append(left,tools);row.append(top);region.append(row);
    });
  }
  function openInvite(inv=null){
    editId=inv?.id||null;$('invite-editor').hidden=false;
    $('invite-editor-title').textContent=inv?'Edit invitation':'New invitation';
    $('invite-name').value=inv?.name||'';$('invite-id').value=inv?.id||'';
    $('invite-id').readOnly=Boolean(inv);$('invite-enabled').checked=inv?.enabled!==false;
    $('invite-password').value='';$('invite-name').focus();
    $('invite-editor').scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  $('new-invite').addEventListener('click',()=>openInvite());
  $('cancel-invite').addEventListener('click',()=>{$('invite-editor').hidden=true;$('invite-password').value='';});
  $('generate-invite-password').addEventListener('click',()=>{
    if(!crypto?.getRandomValues){notice('Secure password generation is not available.',true);return;}
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes=new Uint8Array(20);crypto.getRandomValues(bytes);
    $('invite-password').value=Array.from(bytes,b=>alphabet[b%alphabet.length]).join('');
    $('invite-password').select();
    notice('Password generated. Copy it somewhere private before saving.');
  });
  $('invite-form').addEventListener('submit',async e=>{
    e.preventDefault();const save=e.submitter;save.disabled=true;
    const body={id:editId||$('invite-id').value.trim(),name:$('invite-name').value.trim(),password:$('invite-password').value.trim(),enabled:$('invite-enabled').checked};
    try{
      const result=await api('invite','POST',{invite:body});
      state.invites=result.invites;renderInvites();
      $('invite-editor').hidden=true;$('invite-password').value='';
      notice(body.password ? 'Invitation saved. Keep the guest password somewhere private.'
        : 'Invitation updated. The guest will see the new name when they open it again.');
    }catch(error){notice(error.message,true);}finally{save.disabled=false;}
  });
  function renderSettings(){
    const config=state.settings||{};
    availableDays=Array.isArray(config.availableDays)?[...new Set(config.availableDays)].sort():[];
    $('sender-name').value=config.senderName||'Alex';
    $('site-label').value=config.siteLabel||'tiny bunny mission';
    const screens=$('screen-fields');screens.replaceChildren();
    for(const [key,values] of Object.entries(defaults.screens)){
      const box=elt('div',null,'question');box.append(elt('h3',key.charAt(0).toUpperCase()+key.slice(1)));
      const grid=elt('div',null,'grid');
      for(const [index,field] of ['heading','subheading','speech'].entries()){
        const pair=labelInput(field==='speech'?'What Bunny says':field==='heading'?'Question/title':'Description',
          config.screens?.[key]?.[field]||'',values[index],field==='speech'?'textarea':'input',field==='speech'?500:180);
        pair.input.dataset.screen=key;pair.input.dataset.field=field;
        if(field==='speech')pair.outer.classList.add('full');
        grid.append(pair.outer);
      }
      box.append(grid);screens.append(box);
    }
    const outings=$('outing-fields');outings.replaceChildren();
    Object.entries(defaults.outings).forEach(([key,value])=>{
      const pair=labelInput(key,config.outingLabels?.[key]||'',value,'input',75);
      pair.input.dataset.outing=key;outings.append(pair.outer);
    });
    const details=$('detail-fields');details.replaceChildren();
    for(const [key,[heading,options]] of Object.entries(defaults.details)){
      const wrapper=elt('div',null,'question');wrapper.append(elt('h3',key));
      const inputs=elt('div',null,'grid');
      const h=labelInput('Follow-up question',config.detail?.[key]?.heading||'',heading,'input',180);
      h.input.dataset.detail=key;h.input.dataset.field='heading';
      const speech=labelInput('Bunny line (optional)',config.detail?.[key]?.speech||'','Keep original narration','textarea',500);
      speech.input.dataset.detail=key;speech.input.dataset.field='speech';
      const opts=labelInput('Four choices (one per line)',
        (config.detail?.[key]?.options?.some(Boolean)?config.detail[key].options:options).join('\n'),
        options.join(' / '),'textarea',600);
      opts.input.dataset.detail=key;opts.input.dataset.field='options';
      opts.outer.classList.add('full');speech.outer.classList.add('full');
      inputs.append(h.outer,speech.outer,opts.outer);wrapper.append(inputs);details.append(wrapper);
    }
    const areas=$('area-fields');areas.replaceChildren();
    defaults.areas.forEach((value,index)=>{
      const pair=labelInput('Area choice '+(index+1),config.areaLabels?.[index]||'',value,'input',85);
      pair.input.dataset.area=String(index);areas.append(pair.outer);
    });
    const timeFields=$('time-fields');timeFields.replaceChildren();
    const timeHeading=labelInput('Time of day question',config.timeHeading,'What time of day suits you?','input',180);
    timeHeading.outer.classList.add('full');timeHeading.input.id='time-heading';
    timeFields.append(timeHeading.outer);
    timeDefaults.forEach((value,index)=>{
      const pair=labelInput('Time choice '+(index+1),config.timeLabels?.[index]||'',value,'input',85);
      pair.input.dataset.time=String(index);timeFields.append(pair.outer);
    });
    renderAvailability();
    renderExtra();
    renderWorkflow();
  }
  function localDateKey(date){
    return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  }
  function renderAvailability(){
    const input=$('available-date');
    const now=new Date();
    input.min=localDateKey(now);
    input.max=localDateKey(new Date(now.getFullYear(),now.getMonth()+4,0));
    const list=$('availability-days');
    list.replaceChildren();
    if(!availableDays.length){
      list.append(elt('p','No days are open yet. Every guest date is blocked.','mini'));
      return;
    }
    for(const key of availableDays){
      const [year,month,day]=key.split('-').map(Number);
      const date=new Date(year,month-1,day);
      const row=elt('div',null,'question row between');
      row.setAttribute('role','listitem');
      row.append(elt('span',new Intl.DateTimeFormat('en',{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(date)));
      const block=elt('button','Block this day','btn danger');
      block.type='button';
      block.disabled=availabilityBusy;
      block.addEventListener('click',()=>updateAvailability(availableDays.filter(item=>item!==key),'Day blocked. Guests can no longer select it.'));
      row.append(block);
      list.append(row);
    }
  }
  async function updateAvailability(next,message){
    if(availabilityBusy)return;
    availabilityBusy=true;
    $('open-availability').disabled=true;
    try{
      const result=await api('availability','POST',{availableDays:next});
      state.settings=result.settings;
      availableDays=Array.isArray(result.settings.availableDays)?result.settings.availableDays:[];
      notice(message);
    }catch(error){notice(error.message,true);}
    finally{
      availabilityBusy=false;
      $('open-availability').disabled=false;
      renderAvailability();
    }
  }
  $('open-availability').addEventListener('click',()=>{
    const key=$('available-date').value;
    const now=new Date();
    const minimum=localDateKey(now);
    const maximum=localDateKey(new Date(now.getFullYear(),now.getMonth()+4,0));
    if(!key){notice('Choose a date first.',true);return;}
    if(key<minimum||key>maximum){notice('Choose a date from today through the next four months.',true);return;}
    if(availableDays.includes(key)){notice('That day is already open.',true);return;}
    updateAvailability([...availableDays,key].sort(),'Day opened. Guests can now select it.');
  });
  function renderWorkflow(){
    const list=$('workflow-fields');list.replaceChildren();
    stepOrder.forEach((key,index)=>{
      const extra=extraQuestions.find(q=>q.id===key);
      const name=stepLabels[key]||extra?.heading||'New question';
      const row=elt('div',null,'question row between');
      const label=elt('label',null,'row');
      const check=elt('input');check.type='checkbox';check.checked=enabledSteps.has(key);
      check.style.width='auto';check.style.minHeight='0';
      const caption=elt('span',name);caption.dataset.workflowTitle=key;
      label.append(check,caption);
      check.addEventListener('change',()=>{
        if(check.checked)enabledSteps.add(key);
        else enabledSteps.delete(key);
      });
      const controls=elt('div',null,'row');
      for(const [direction,offset] of [['Up',-1],['Down',1]]){
        const button=elt('button',direction,'btn');button.type='button';
        button.setAttribute('aria-label','Move '+name+' '+direction.toLowerCase());
        const target=index+offset;
        button.disabled=target<0||target>=stepOrder.length;
        button.addEventListener('click',()=>{
          [stepOrder[index],stepOrder[target]]=[stepOrder[target],stepOrder[index]];
          renderWorkflow();
        });
        controls.append(button);
      }
      row.append(label,controls);list.append(row);
    });
  }
  function renderExtra(){
    const list=$('extra-questions');list.replaceChildren();
    extraQuestions.forEach((q,index)=>{
      const box=elt('div',null,'question');
      const top=elt('div',null,'row between');top.append(elt('h3','Extra question '+(index+1)));
      const del=elt('button','Remove','btn danger');del.type='button';
      del.addEventListener('click',()=>{
        extraQuestions.splice(index,1);
        stepOrder=stepOrder.filter(key=>key!==q.id);
        enabledSteps.delete(q.id);
        renderExtra();renderWorkflow();
      });
      top.append(del);box.append(top);
      const title=labelInput('Question',q.heading,'e.g. What music do you love?','input',140);
      title.input.addEventListener('input',()=>{
        q.heading=title.input.value;
        const caption=$('workflow-fields').querySelector('[data-workflow-title="'+q.id+'"]');
        if(caption)caption.textContent=q.heading||'New question';
      });
      const speech=labelInput('Bunny commentary',q.speech,'Optional funny line','textarea',400);
      speech.input.addEventListener('input',()=>{q.speech=speech.input.value;});
      const options=labelInput('Choices, one per line',q.options.join('\n'),'Option one\nOption two','textarea',600);
      options.input.addEventListener('input',()=>{q.options=options.input.value.split('\n').map(x=>x.trim()).filter(Boolean);});
      box.append(title.outer,speech.outer,options.outer);list.append(box);
    });
  }
  $('add-question').addEventListener('click',()=>{
    if(extraQuestions.length>=5){notice('Maximum five extra questions.',true);return;}
    const id='extra-'+nextExtraId++;
    extraQuestions.push({id,heading:'',speech:'',options:['','']});
    stepOrder.push(id);enabledSteps.add(id);
    renderExtra();renderWorkflow();
    $('extra-questions').lastElementChild.querySelector('input').focus();
  });
  $('settings-form').addEventListener('submit',async e=>{
    e.preventDefault();const save=e.submitter;save.disabled=true;
    const extraIds=new Map(extraQuestions.map((q,index)=>[q.id,'extra-'+index]));
    const workflow=stepOrder.filter(key=>enabledSteps.has(key)).map(key=>extraIds.get(key)||key);
    const settings={senderName:$('sender-name').value,siteLabel:$('site-label').value,screens:{},outingLabels:{},
      detail:{},areaLabels:[],timeLabels:[],availableDays:[...availableDays],timeHeading:$('time-heading').value,workflow,extraQuestions};
    document.querySelectorAll('[data-screen]').forEach(x=>{
      if(!settings.screens[x.dataset.screen])settings.screens[x.dataset.screen]={};
      settings.screens[x.dataset.screen][x.dataset.field]=x.value;
    });
    document.querySelectorAll('[data-outing]').forEach(x=>{settings.outingLabels[x.dataset.outing]=x.value;});
    document.querySelectorAll('[data-detail]').forEach(x=>{
      if(!settings.detail[x.dataset.detail])settings.detail[x.dataset.detail]={};
      settings.detail[x.dataset.detail][x.dataset.field]=x.dataset.field==='options'?x.value.split('\n').map(y=>y.trim()):x.value;
    });
    document.querySelectorAll('[data-area]').forEach(x=>{settings.areaLabels[Number(x.dataset.area)]=x.value;});
    document.querySelectorAll('[data-time]').forEach(x=>{settings.timeLabels[Number(x.dataset.time)]=x.value;});
    try{
      const result=await api('save','POST',{settings});
      state.settings=result.settings;
      notice('Workflow saved. Guests see these changes the next time they unlock an invitation.');
    }catch(error){notice(error.message,true);}finally{save.disabled=false;}
  });
  refresh();
})();
