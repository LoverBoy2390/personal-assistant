'use strict';
const navItems=['Dashboard','Command','Planning','Guardian','Health','Wealth','Projects'];
const defaults=[{id:1,label:'Review today’s priorities',done:true,tag:'Planning'},{id:2,label:'Complete 20-minute recovery workout',done:false,tag:'Health'},{id:3,label:'Check debt payoff progress',done:false,tag:'Wealth'}];
let tasks;try{tasks=JSON.parse(localStorage.getItem('aegis.tasks'))||defaults}catch{tasks=defaults}
const $=s=>document.querySelector(s);const nav=$('#nav');
navItems.forEach((x,i)=>{const b=document.createElement('button');b.className=i===0?'active':'';b.innerHTML=`<span>${['▦','⌘','☑','⬡','♡','◫','◎'][i]}</span>${x}`;b.onclick=()=>{[...nav.children].forEach(n=>n.classList.remove('active'));b.classList.add('active');notice(`${x} module selected`);closeMenu()};nav.appendChild(b)});
const notice=t=>$('#notice').textContent=t;
function save(){localStorage.setItem('aegis.tasks',JSON.stringify(tasks));renderTasks()}
function renderTasks(){const host=$('#taskList');host.innerHTML='';tasks.forEach(t=>{const b=document.createElement('button');b.className=`task-row ${t.done?'done':''}`;b.innerHTML=`<i>${t.done?'✓':''}</i><span><strong>${escapeHtml(t.label)}</strong><small>${escapeHtml(t.tag)}</small></span><b>›</b>`;b.onclick=()=>{t.done=!t.done;notice('Task status updated locally');save()};host.appendChild(b)});const done=tasks.filter(t=>t.done).length;const pct=tasks.length?Math.round(done/tasks.length*100):0;$('#progress').textContent=`${pct}%`;$('#progressText').textContent=`${done} of ${tasks.length} priorities`}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
$('#addTask').onclick=()=>{const label=prompt('Name this priority:','New priority');if(label){tasks.push({id:Date.now(),label,done:false,tag:'General'});save();notice('Priority added locally')}};
function runLocalDiagnostics(){
  const checks=[
    {name:'Required interface elements',ok:['#nav','#taskList','#progress','#notice'].every(sel=>document.querySelector(sel))},
    {name:'Local storage access',ok:(()=>{try{const k='aegis.check';localStorage.setItem(k,'ok');localStorage.removeItem(k);return true}catch{return false}})()},
    {name:'Page assets loaded',ok:[...document.styleSheets].length>0 && document.readyState!=='loading'}
  ];
  const passed=checks.filter(c=>c.ok).length;
  const ok=passed===checks.length;
  $('#diagnosticState').textContent=`${passed}/${checks.length} passed`;
  $('#guardianSummary').textContent=ok?'Local interface and storage checks passed. No device or security scan was performed.':'A local interface check failed. No device or security scan was performed.';
  notice(`Local check: ${passed}/${checks.length} passed — device scanning is not connected`);
  return {passed,total:checks.length,ok};
}
$('#runCheck').onclick=runLocalDiagnostics;
$('#connectWealth').onclick=()=>notice('Financial connection remains disabled until explicit authorization');
let focusRemaining=20*60;let focusTimer=null;
function renderFocus(){const m=String(Math.floor(focusRemaining/60)).padStart(2,'0');const sec=String(focusRemaining%60).padStart(2,'0');$('#startFocus').textContent=focusTimer?`Pause ${m}:${sec}`:`Start ${m}:${sec} ›`}
$('#startFocus').onclick=()=>{if(focusTimer){clearInterval(focusTimer);focusTimer=null;notice('Recovery timer paused locally');renderFocus();return}notice('20-minute recovery timer started locally');focusTimer=setInterval(()=>{focusRemaining--;renderFocus();if(focusRemaining<=0){clearInterval(focusTimer);focusTimer=null;focusRemaining=20*60;renderFocus();notice('Recovery block complete')}},1000);renderFocus()};
const h=new Date().getHours();$('#greeting').textContent=`Good ${h<12?'morning':h<18?'afternoon':'evening'}, Sir.`;$('#today').textContent=new Date().toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
const sidebar=$('#sidebar');function closeMenu(){sidebar.classList.remove('open');$('#scrim').classList.remove('show')}$('#menuBtn').onclick=()=>{sidebar.classList.toggle('open');$('#scrim').classList.toggle('show')};$('#scrim').onclick=closeMenu;
$('#search').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll('.glass-card').forEach(c=>c.style.display=!q||c.textContent.toLowerCase().includes(q)?'':'none')});renderTasks();renderFocus();
