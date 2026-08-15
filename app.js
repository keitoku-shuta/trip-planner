const key='trip-together-v1';
const defaultState={trip:{title:'石垣島旅行',dates:'8/17〜8/19'},members:[{id:'a',name:'しゅうた',color:'#e75d38'},{id:'b',name:'Aさん',color:'#2a9d8f'},{id:'c',name:'Bさん',color:'#4c78c2'}],current:'a',proposals:[],events:[]};
let state=JSON.parse(localStorage.getItem(key)||'null')||defaultState;
const $=s=>document.querySelector(s); const byId=id=>document.getElementById(id);
function save(){localStorage.setItem(key,JSON.stringify(state));render()}
function member(id){return state.members.find(x=>x.id===id)}
function render(){
  $('#tripTitle').textContent=state.trip.title; $('#tripDates').textContent=state.trip.dates;
  const cur=member(state.current);$('#identityButton').textContent='👤 操作中：'+(cur?.name||'未選択');$('#proposalCount').textContent=state.proposals.length;
  $('#members').innerHTML=state.members.map(m=>`<span class="member"><i class="dot" style="background:${m.color}"></i>${m.name}</span>`).join('')||'<p class="empty">参加者を追加してください。</p>';
  const day=$('#datePicker').value;const events=state.events.filter(e=>!day||e.date===day).sort((a,b)=>(a.start||'99').localeCompare(b.start||'99'));
  $('#timeline').innerHTML=events.length?events.map(e=>`<article class="event"><time>${e.start||'時間未定'}${e.end?'–'+e.end:''}</time><div class="eventBody" style="border-color:${member(e.participants[0])?.color||'#e75d38'}"><strong>${e.title}</strong><small>${e.place||''}</small>${e.participants.map(id=>`<span class="chip">${member(id)?.name}</span>`).join('')}</div></article>`).join(''):'<p class="empty">この日の確定予定はまだありません。</p>';
  $('#proposals').innerHTML=state.proposals.length?state.proposals.map(p=>{const mine=p.votes[state.current];return `<article class="proposal"><h3>${p.title}</h3><p class="meta">${p.date}${p.start?' '+p.start:''}${p.place?' · '+p.place:''}　提案：${member(p.author)?.name||''}</p><div class="votes">${p.participants.map(id=>`<button class="vote ${p.votes[id]==='参加したい'?'active':''}" data-vote="${p.id}" data-person="${id}">${member(id)?.name}：${p.votes[id]||'未回答'}</button>`).join('')}</div><button class="adopt" data-adopt="${p.id}">この参加者で予定に追加</button></article>`}).join(''):'<p class="empty">未処理の提案はありません。気になることを気軽に追加しましょう。</p>';
}
function choices(container,checked=true){container.innerHTML=state.members.map(m=>`<label class="choice"><input type="checkbox" name="participants" value="${m.id}" ${checked?'checked':''}>${m.name}</label>`).join('')}
$('#openMember').onclick=()=>byId('memberDialog').showModal();
$('#memberForm').addEventListener('submit',e=>{e.preventDefault();let d=new FormData(e.target);state.members.push({id:crypto.randomUUID(),name:d.get('name'),color:d.get('color')});e.target.reset();byId('memberDialog').close();save()});
function openProposal(){choices($('#participantChoices'));$('#proposalForm [name=date]').value=$('#datePicker').value||new Date().toISOString().slice(0,10);byId('proposalDialog').showModal()}
$('#openProposal').onclick=openProposal;$('#openProposalSmall').onclick=openProposal;
$('#proposalForm').addEventListener('submit',e=>{e.preventDefault();let d=new FormData(e.target),participants=d.getAll('participants');let p={id:crypto.randomUUID(),title:d.get('title'),date:d.get('date'),start:d.get('start'),end:d.get('end'),place:d.get('place'),participants,author:state.current,votes:{}};participants.forEach(id=>p.votes[id]=id===state.current?'参加したい':'未回答');state.proposals.unshift(p);e.target.reset();byId('proposalDialog').close();save()});
$('#identityButton').onclick=()=>{let box=$('#identityChoices');box.innerHTML='';state.members.forEach(m=>{let b=document.createElement('button');b.className='identityChoice';b.value='cancel';b.textContent=m.name;b.onclick=()=>{state.current=m.id;byId('identityDialog').close();save()};box.append(b)});byId('identityDialog').showModal()};
$('#proposals').onclick=e=>{let vote=e.target.dataset.vote,adopt=e.target.dataset.adopt;if(vote){let p=state.proposals.find(x=>x.id===vote);let id=e.target.dataset.person;if(id===state.current)p.votes[id]=p.votes[id]==='参加したい'?'行かない':'参加したい';save()}if(adopt){let i=state.proposals.findIndex(x=>x.id===adopt),p=state.proposals[i];let attendees=p.participants.filter(id=>p.votes[id]==='参加したい');state.events.push({...p,participants:attendees.length?attendees:p.participants});state.proposals.splice(i,1);save()}};
$('#exportJson').onclick=()=>{let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='trip-together-backup.json';a.click();URL.revokeObjectURL(a.href)};
$('#importJson').onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader;r.onload=()=>{try{state=JSON.parse(r.result);save()}catch{alert('読み込めないファイルです。')}};r.readAsText(f)};
$('#datePicker').onchange=render; render();

