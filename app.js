const STORAGE_KEY = 'lianji-fitness-v1';

const defaultData = {
  plans: [
    { day: 1, name: '推 · 胸肩三头', exercises: [
      { id: 'bench', name: '杠铃卧推', muscle: '胸部', sets: 4, reps: 8, rest: 120 },
      { id: 'incline', name: '上斜哑铃卧推', muscle: '上胸', sets: 3, reps: 10, rest: 90 },
      { id: 'ohp', name: '坐姿推肩', muscle: '肩部', sets: 3, reps: 10, rest: 90 },
      { id: 'pushdown', name: '绳索下压', muscle: '三头', sets: 3, reps: 12, rest: 60 }
    ]},
    { day: 2, name: '休息 / 拉伸', exercises: [] },
    { day: 3, name: '拉 · 背部二头', exercises: [
      { id: 'pulldown', name: '高位下拉', muscle: '背部', sets: 4, reps: 10, rest: 90 },
      { id: 'row', name: '坐姿划船', muscle: '背部', sets: 4, reps: 10, rest: 90 },
      { id: 'facepull', name: '面拉', muscle: '后束', sets: 3, reps: 15, rest: 60 },
      { id: 'curl', name: '哑铃弯举', muscle: '二头', sets: 3, reps: 12, rest: 60 }
    ]},
    { day: 4, name: '休息 / 轻有氧', exercises: [] },
    { day: 5, name: '腿 · 下肢核心', exercises: [
      { id: 'squat', name: '深蹲', muscle: '腿部', sets: 4, reps: 8, rest: 150 },
      { id: 'rdl', name: '罗马尼亚硬拉', muscle: '后链', sets: 3, reps: 10, rest: 120 },
      { id: 'lunge', name: '行走箭步蹲', muscle: '腿部', sets: 3, reps: 12, rest: 90 },
      { id: 'plank', name: '平板支撑', muscle: '核心', sets: 3, reps: 45, rest: 60 }
    ]},
    { day: 6, name: '全身 · 轻量', exercises: [
      { id: 'goblet', name: '高脚杯深蹲', muscle: '腿部', sets: 3, reps: 12, rest: 75 },
      { id: 'pushup', name: '俯卧撑', muscle: '胸部', sets: 3, reps: 12, rest: 60 },
      { id: 'dumbrow', name: '单臂哑铃划船', muscle: '背部', sets: 3, reps: 12, rest: 75 }
    ]},
    { day: 0, name: '完全休息', exercises: [] }
  ],
  workouts: [],
  weights: [],
  customExercises: []
};

let data = loadData();
let selectedPlanDay = normalizeDay(new Date().getDay());
let workoutState = null;
let workoutTicker = null;

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && Array.isArray(saved.plans) ? { ...structuredClone(defaultData), ...saved } : structuredClone(defaultData);
  } catch { return structuredClone(defaultData); }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function normalizeDay(day) { return day === 0 ? 0 : day; }
function dayName(day) { return ['周日','周一','周二','周三','周四','周五','周六'][day]; }
function isoDate(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function formatDate(value) {
  const d = new Date(value);
  return `${d.getMonth()+1}月${d.getDate()}日 · ${dayName(d.getDay())}`;
}
function getPlan(day = new Date().getDay()) {
  return data.plans.find(p => p.day === day) || data.plans[0];
}
function volumeOf(workout) {
  return workout.exercises.reduce((sum, ex) => sum + ex.sets.reduce((s, set) => s + ((+set.weight || 0) * (+set.reps || 0)), 0), 0);
}
function weekStart(date = new Date()) {
  const d = new Date(date); const day = d.getDay() || 7;
  d.setHours(0,0,0,0); d.setDate(d.getDate() - day + 1); return d;
}
function inCurrentWeek(value) {
  const d = new Date(value); const start = weekStart(); const end = new Date(start); end.setDate(end.getDate()+7);
  return d >= start && d < end;
}
function showToast(message) {
  const t = $('#toast'); t.textContent = message; t.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function renderAll() {
  renderHome(); renderPlan(); renderHistory(); renderProfile();
}

function renderHome() {
  const today = new Date();
  $('#today-label').textContent = `${today.getMonth()+1}月${today.getDate()}日 · ${dayName(today.getDay())}`;
  const plan = getPlan();
  $('#today-plan-name').textContent = plan.exercises.length ? plan.name : '今天是恢复日';
  $('#today-duration').textContent = plan.exercises.length ? `约 ${Math.max(30, plan.exercises.length*11)} 分钟` : '休息也很重要';
  $('#start-workout').style.display = plan.exercises.length ? 'flex' : 'none';
  $('#today-exercise-preview').innerHTML = plan.exercises.length ? plan.exercises.slice(0,3).map((ex, i) => `
    <div class="exercise-chip"><span>${String(i+1).padStart(2,'0')}</span><strong>${ex.name}</strong><small>${ex.sets} 组 · ${ex.muscle}</small></div>`).join('') : '<div class="empty-state" style="width:100%;color:#a6b4ad;border-color:#34463e">散步、拉伸，给身体一点恢复时间。</div>';

  const start = weekStart(); const dayLabels = ['一','二','三','四','五','六','日'];
  $('#week-strip').innerHTML = dayLabels.map((label, i) => {
    const d = new Date(start); d.setDate(start.getDate()+i); const done = data.workouts.some(w => isoDate(new Date(w.date)) === isoDate(d));
    return `<div class="day-dot ${done?'done':''} ${isoDate(d)===isoDate(today)?'today':''}"><small>周${label}</small><span>${done?'✓':d.getDate()}</span></div>`;
  }).join('');

  const weekWorkouts = data.workouts.filter(w => inCurrentWeek(w.date));
  const weekVolume = weekWorkouts.reduce((s,w)=>s+volumeOf(w),0);
  $('#week-workouts').textContent = weekWorkouts.length;
  $('#week-volume').textContent = Math.round(weekVolume).toLocaleString('zh-CN');
  $('#volume-note').textContent = weekVolume ? '你正在把坚持变成看得见的数字' : '完成第一组，曲线就开始了';
  $('#weekly-bars').innerHTML = Array.from({length:7}, (_,i) => {
    const d = new Date(start); d.setDate(start.getDate()+i); const count = data.workouts.filter(w=>isoDate(new Date(w.date))===isoDate(d)).length;
    return `<i class="${count?'on':''}" style="height:${count ? Math.min(100,35+count*30) : 8}%"></i>`;
  }).join('');
  const weeks = uniqueWorkoutWeeks(); $('#streak-count').textContent = currentStreak(weeks);

  const recent = [...data.workouts].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3);
  $('#recent-list').innerHTML = recent.length ? recent.map(w=>`
    <article class="recent-item"><div class="left"><div class="recent-icon">${w.name.slice(0,1)}</div><div><strong>${w.name}</strong><small>${formatDate(w.date)} · ${w.exercises.length} 个动作</small></div></div><strong>${Math.round(volumeOf(w)).toLocaleString()} kg</strong></article>
  `).join('') : '<div class="empty-state">还没有训练记录。完成今天的训练后，它会出现在这里。</div>';
}

function renderPlan() {
  const order = [1,2,3,4,5,6,0];
  $('#plan-week').innerHTML = order.map(day => {
    const plan = getPlan(day); const selected = day === selectedPlanDay;
    return `<article class="plan-day ${!plan.exercises.length?'rest':''} ${selected?'selected':''}">
      <button class="plan-day-head" data-plan-day="${day}"><div><span class="plan-day-index">${dayName(day).replace('周','')}</span><span><strong>${plan.name}</strong><small>${plan.exercises.length ? `${plan.exercises.length} 个动作 · 约 ${Math.max(30, plan.exercises.length*11)} 分钟` : '恢复与休息'}</small></span></div><span>${selected?'−':'+'}</span></button>
      ${selected && plan.exercises.length ? `<div class="plan-day-body">${plan.exercises.map(ex=>`<div class="plan-exercise"><span>${ex.name}</span><span>${ex.sets} × ${ex.reps}</span></div>`).join('')}</div>`:''}
    </article>`;
  }).join('');
  $$('[data-plan-day]').forEach(btn => btn.onclick = () => { selectedPlanDay = +btn.dataset.planDay; renderPlan(); });
}

function renderHistory() {
  const sorted = [...data.workouts].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const totalVol = sorted.reduce((s,w)=>s+volumeOf(w),0);
  $('#total-workouts').textContent = sorted.length;
  $('#total-volume').textContent = totalVol >= 1000 ? `${(totalVol/1000).toFixed(1)}k` : Math.round(totalVol);
  const weeks = uniqueWorkoutWeeks(); $('#best-streak').textContent = bestStreak(weeks);
  const chart = Array.from({length:6}, (_,i) => { const d = weekStart(); d.setDate(d.getDate()-(5-i)*7); const end=new Date(d); end.setDate(end.getDate()+7); return {label:`${d.getMonth()+1}/${d.getDate()}`, value: sorted.filter(w=>new Date(w.date)>=d&&new Date(w.date)<end).reduce((s,w)=>s+volumeOf(w),0)}; });
  const max = Math.max(...chart.map(x=>x.value),1);
  $('#volume-chart').innerHTML = chart.map(x=>`<div class="chart-column"><i style="height:${Math.max(4,x.value/max*100)}%" title="${Math.round(x.value)} kg"></i><small>${x.label}</small></div>`).join('');
  $('#history-list').innerHTML = sorted.length ? sorted.map(w=>`
    <article class="history-entry"><div class="history-date"><div><strong>${w.name}</strong><br><span>${formatDate(w.date)}</span></div><button class="text-button" data-delete-workout="${w.id}">删除</button></div><div class="history-stats"><span><b>${w.exercises.length}</b> 个动作</span><span><b>${w.exercises.reduce((s,e)=>s+e.sets.length,0)}</b> 组</span><span><b>${Math.round(volumeOf(w)).toLocaleString()}</b> kg</span><span><b>${Math.round((w.duration||0)/60)}</b> 分钟</span></div></article>`).join('') : '<div class="empty-state">训练历史还是空白。你的第一条记录会成为起点。</div>';
  $$('[data-delete-workout]').forEach(btn => btn.onclick = () => {
    if (confirm('确定删除这次训练记录吗？')) { data.workouts = data.workouts.filter(w=>w.id!==btn.dataset.deleteWorkout); saveData(); renderAll(); showToast('训练记录已删除'); }
  });
}

function renderProfile() {
  const weights = [...data.weights].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const latest = weights.at(-1); $('#latest-weight').textContent = latest ? Number(latest.value).toFixed(1) : '--';
  if (weights.length > 1) {
    const delta = latest.value - weights[0].value; $('#weight-change').textContent = `从第一次记录至今 ${delta>0?'+':''}${delta.toFixed(1)} kg`;
  } else $('#weight-change').textContent = latest ? '已记录第一次体重，继续保持' : '记录一次体重，开始观察趋势';
  const points = weights.slice(-10);
  if (points.length < 2) $('#weight-spark').innerHTML = '';
  else {
    const vals = points.map(x=>+x.value), min=Math.min(...vals)-.5, max=Math.max(...vals)+.5;
    const coords = vals.map((v,i)=>`${i/(vals.length-1)*100},${55-(v-min)/(max-min)*48}`).join(' ');
    $('#weight-spark').innerHTML = `<svg viewBox="0 0 100 60" preserveAspectRatio="none"><polyline fill="none" stroke="#10211b" stroke-width="2.5" vector-effect="non-scaling-stroke" points="${coords}"/><circle cx="100" cy="${coords.split(' ').at(-1).split(',')[1]}" r="2.5" fill="#10211b"/></svg>`;
  }
}

function uniqueWorkoutWeeks() {
  return [...new Set(data.workouts.map(w=>isoDate(weekStart(new Date(w.date)))))].sort();
}
function currentStreak(weeks) {
  if (!weeks.length) return 0; let count=0; let cursor=weekStart();
  for (;;) { const key=isoDate(cursor); if(weeks.includes(key)){count++;cursor.setDate(cursor.getDate()-7);} else { if(count===0){cursor.setDate(cursor.getDate()-7); if(weeks.includes(isoDate(cursor))){count++;cursor.setDate(cursor.getDate()-7);continue;}} break;} }
  return count;
}
function bestStreak(weeks) {
  let best=0, streak=0, prev=null;
  weeks.forEach(key=>{ const d=new Date(`${key}T00:00:00`); streak=prev&&Math.round((d-prev)/86400000)===7?streak+1:1; best=Math.max(best,streak); prev=d; }); return best;
}

function navigate(page) {
  $$('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${page}`));
  $$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===page));
  window.scrollTo({top:0,behavior:'smooth'});
}

function startWorkout() {
  const plan = getPlan(); if (!plan.exercises.length) return;
  const last = [...data.workouts].reverse().find(w=>w.name===plan.name);
  workoutState = { id: crypto.randomUUID(), name: plan.name, date: new Date().toISOString(), startedAt: Date.now(), exercises: plan.exercises.map(ex=>({ ...ex, sets: Array.from({length:ex.sets},(_,i)=>({weight:last?.exercises.find(e=>e.id===ex.id)?.sets[i]?.weight||'', reps:ex.reps, done:false})) })) };
  renderWorkout();
  $('#sheet-backdrop').hidden=false; $('#workout-sheet').classList.add('open'); $('#workout-sheet').setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
  clearInterval(workoutTicker); workoutTicker=setInterval(updateWorkoutTimer,1000); updateWorkoutTimer();
}

function renderWorkout() {
  $('#workout-title').textContent=workoutState.name;
  $('#workout-exercises').innerHTML=workoutState.exercises.map((ex,ei)=>`
    <article class="log-exercise"><div class="log-exercise-head"><div><strong>${ex.name}</strong><small>${ex.muscle} · 建议 ${ex.reps} 次</small></div><span class="rest-tag">休 ${ex.rest} 秒</span></div>
      <div class="set-table"><div class="set-row header"><span>组</span><span>重量 kg</span><span>次数</span><span>完成</span></div>
      ${ex.sets.map((set,si)=>`<div class="set-row"><span class="set-number">${si+1}</span><input inputmode="decimal" aria-label="重量" data-set-field="weight" data-ei="${ei}" data-si="${si}" value="${set.weight}"><input inputmode="numeric" aria-label="次数" data-set-field="reps" data-ei="${ei}" data-si="${si}" value="${set.reps}"><button class="set-check ${set.done?'checked':''}" data-check-set data-ei="${ei}" data-si="${si}">${set.done?'✓':'○'}</button></div>`).join('')}
      <button class="add-set" data-add-set="${ei}">＋ 添加一组</button></div></article>`).join('');
  $$('[data-set-field]').forEach(input=>input.oninput=()=>{workoutState.exercises[+input.dataset.ei].sets[+input.dataset.si][input.dataset.setField]=input.value;});
  $$('[data-check-set]').forEach(btn=>btn.onclick=()=>{ const set=workoutState.exercises[+btn.dataset.ei].sets[+btn.dataset.si]; set.done=!set.done; btn.classList.toggle('checked',set.done); btn.textContent=set.done?'✓':'○'; updateProgress(); if(set.done) navigator.vibrate?.(30); });
  $$('[data-add-set]').forEach(btn=>btn.onclick=()=>{ const ex=workoutState.exercises[+btn.dataset.addSet]; ex.sets.push({weight:ex.sets.at(-1)?.weight||'',reps:ex.reps,done:false}); renderWorkout(); });
  updateProgress();
}
function updateProgress(){ const sets=workoutState.exercises.flatMap(e=>e.sets); const done=sets.filter(s=>s.done).length; $('#workout-progress-bar').style.width=`${done/sets.length*100}%`; }
function updateWorkoutTimer(){ if(!workoutState)return; const sec=Math.floor((Date.now()-workoutState.startedAt)/1000); $('#workout-time').textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`; }
function closeWorkout(){ clearInterval(workoutTicker); $('#workout-sheet').classList.remove('open'); $('#workout-sheet').setAttribute('aria-hidden','true'); $('#sheet-backdrop').hidden=true; document.body.style.overflow=''; }
function finishWorkout(){
  const completed=workoutState.exercises.map(ex=>({...ex,sets:ex.sets.filter(s=>s.done)})).filter(ex=>ex.sets.length);
  if(!completed.length){ showToast('至少完成一组再保存'); return; }
  workoutState.exercises=completed; workoutState.duration=Math.max(60,Math.floor((Date.now()-workoutState.startedAt)/1000)); delete workoutState.startedAt;
  data.workouts.push(workoutState); saveData(); closeWorkout(); renderAll(); navigate('history'); showToast('训练已保存，做得漂亮');
}

function openModal(html){ $('#modal-content').innerHTML=html; $('#generic-modal').classList.add('open'); $('#generic-modal').setAttribute('aria-hidden','false'); }
function closeModal(){ $('#generic-modal').classList.remove('open'); $('#generic-modal').setAttribute('aria-hidden','true'); }
function addWeightModal(){
  openModal(`<p class="eyebrow">身体数据</p><h2>记录今天的体重</h2><p>尽量在每天相近的时间和状态下测量，更容易看见真实趋势。</p><div class="field"><label>体重（kg）</label><input id="weight-input" inputmode="decimal" type="number" step="0.1" placeholder="例如 68.5"></div><button class="modal-action" id="save-weight">保存记录</button>`);
  $('#weight-input').focus(); $('#save-weight').onclick=()=>{ const v=+$('#weight-input').value; if(!v||v<20||v>400){showToast('请输入正确的体重');return;} data.weights.push({id:crypto.randomUUID(),date:new Date().toISOString(),value:v}); saveData(); closeModal(); renderProfile(); showToast('体重已记录'); };
}
function exerciseLibraryModal(mode='manage'){
  const plan=getPlan(selectedPlanDay); const library=[...new Map(data.plans.flatMap(p=>p.exercises).concat(data.customExercises).map(x=>[x.id,x])).values()];
  openModal(`<p class="eyebrow">动作库</p><h2>${mode==='add'?'选择一个动作':'我的动作库'}</h2><p>${mode==='add'?`添加到 ${plan.name}`:'常用动作和你自己创建的动作。'}</p><div class="exercise-library">${library.map(ex=>`<div class="library-row"><span><strong>${ex.name}</strong><small>${ex.muscle} · ${ex.sets} 组 × ${ex.reps}</small></span>${mode==='add'?`<button data-pick-exercise="${ex.id}">添加</button>`:''}</div>`).join('')}</div><button class="outline-action" id="create-exercise">＋ 创建自定义动作</button>`);
  $$('[data-pick-exercise]').forEach(btn=>btn.onclick=()=>{
    const ex=library.find(x=>x.id===btn.dataset.pickExercise);
    if(!plan.exercises.some(x=>x.id===ex.id)) {
      plan.exercises.push({...ex});
      saveData(); closeModal(); renderAll(); showToast('动作已加入训练日');
    } else {
      showToast('这个动作已经在计划中');
    }
  });
  $('#create-exercise').onclick=customExerciseModal;
}
function customExerciseModal(){
  openModal(`<p class="eyebrow">自定义动作</p><h2>创建一个新动作</h2><div class="field"><label>动作名称</label><input id="custom-name" placeholder="例如 哑铃侧平举"></div><div class="field"><label>训练部位</label><input id="custom-muscle" placeholder="例如 肩部"></div><div class="field"><label>组数</label><input id="custom-sets" inputmode="numeric" type="number" value="3"></div><div class="field"><label>每组次数</label><input id="custom-reps" inputmode="numeric" type="number" value="12"></div><button class="modal-action" id="save-custom">保存动作</button>`);
  $('#save-custom').onclick=()=>{ const name=$('#custom-name').value.trim(), muscle=$('#custom-muscle').value.trim(); if(!name||!muscle){showToast('请填写动作名称和部位');return;} const ex={id:`custom-${Date.now()}`,name,muscle,sets:Math.max(1,+$('#custom-sets').value||3),reps:Math.max(1,+$('#custom-reps').value||12),rest:60}; data.customExercises.push(ex); saveData(); closeModal(); renderAll(); showToast('自定义动作已创建'); };
}
function exportData(){ const blob=new Blob([JSON.stringify({app:'练迹',version:1,exportedAt:new Date().toISOString(),data},null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`练迹备份-${isoDate()}.json`; a.click(); URL.revokeObjectURL(url); showToast('备份文件已下载'); }
function importData(file){ const reader=new FileReader(); reader.onload=()=>{ try{ const parsed=JSON.parse(reader.result); const incoming=parsed.data||parsed; if(!Array.isArray(incoming.plans)||!Array.isArray(incoming.workouts)) throw new Error(); if(confirm('恢复备份会替换当前数据，确定继续吗？')){data={...structuredClone(defaultData),...incoming};saveData();renderAll();showToast('数据已恢复');} }catch{showToast('这个备份文件无法识别');} }; reader.readAsText(file); }
function installHelp(){ openModal(`<p class="eyebrow">iPhone 安装</p><h2>把练迹放到主屏幕</h2><p>请使用 Safari 打开这个网站，然后：</p><div class="exercise-library"><div class="library-row"><span><strong>1. 点底部的分享按钮</strong><small>图标是一个向上的箭头</small></span></div><div class="library-row"><span><strong>2. 选择“添加到主屏幕”</strong><small>向下滚动菜单即可看到</small></span></div><div class="library-row"><span><strong>3. 点击右上角“添加”</strong><small>之后就能像 App 一样全屏打开</small></span></div></div><p style="margin-top:16px">首次打开后，页面会缓存到手机；没有网络时也能查看和记录。</p>`); }

document.addEventListener('click', e=>{ const nav=e.target.closest('[data-nav]'); if(nav) navigate(nav.dataset.nav); if(e.target.closest('[data-close-modal]')) closeModal(); if(e.target.closest('[data-close-sheet]')) closeWorkout(); });
$('#start-workout').onclick=startWorkout; $('#finish-workout').onclick=finishWorkout; $('#sheet-backdrop').onclick=closeWorkout;
$('#add-exercise-to-day').onclick=()=>exerciseLibraryModal('add'); $('#manage-exercises').onclick=()=>exerciseLibraryModal('manage');
$('#add-weight').onclick=addWeightModal; $('#export-data').onclick=exportData; $('#import-data').onchange=e=>e.target.files[0]&&importData(e.target.files[0]); $('#install-help').onclick=installHelp;
$('#generic-modal').onclick=e=>{if(e.target.id==='generic-modal')closeModal();};

renderAll();
if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
