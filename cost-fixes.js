// 食事・観光施設・その他の共通費用入力
window.tabipuLegacyProposalCostFields = proposalCostFields;
window.tabipuLegacyScheduleCostFields = scheduleCostFields;

function tabipuGenericEditor(prefix, people) {
  return `<label>分け方<select id="${prefix}Mode"><option value="individual">参加者ごとに入力</option><option value="equal">全員同額</option><option value="total">合計を均等割り</option></select></label><div id="${prefix}Entry"></div>`;
}

function tabipuSetupGenericEditor(prefix, people) {
  const mode = $(`#${prefix}Mode`), entry = $(`#${prefix}Entry`);
  const draw = () => {
    entry.innerHTML = mode.value === 'individual'
      ? people.map(id => `<label>${member(id)?.name}の費用（円）<input class="${prefix}Value" data-id="${id}" min="0" type="number" inputmode="numeric"></label>`).join('')
      : `<label>${mode.value === 'equal' ? '一人あたりの費用（円）' : '費用の合計（円）'}<input class="${prefix}Value" min="0" type="number" inputmode="numeric"></label>`;
  };
  mode.onchange = draw;
  draw();
}

function tabipuReadGenericCost(prefix, people) {
  const mode = $(`#${prefix}Mode`).value;
  const values = [...document.querySelectorAll(`.${prefix}Value`)].map(input => Number(input.value) || 0);
  const shares = {};
  if (mode === 'individual') people.forEach((id, index) => shares[id] = values[index] || 0);
  else if (mode === 'equal') people.forEach(id => shares[id] = values[0] || 0);
  else {
    const total = values[0] || 0, base = Math.floor(total / people.length), rest = total - base * people.length;
    people.forEach((id, index) => shares[id] = base + (index < rest ? 1 : 0));
  }
  return { shares, total: Object.values(shares).reduce((sum, value) => sum + value, 0) };
}

proposalCostFields = function () {
  const type = $('#proposalType').value;
  const people = [...document.querySelectorAll('[name=participants]:checked')].map(input => input.value);
  if (!['meal', 'attraction', 'other'].includes(type)) return window.tabipuLegacyProposalCostFields();
  const box = $('#proposalForm .inlineCost');
  box.innerHTML = `<h3>費用（任意）</h3><p><select name="proposalCostPayer" id="proposalCostPayer"></select> が、参加候補の分を払って、</p>${tabipuGenericEditor('proposalGenericCost', people)}<input name="proposalCost" type="hidden"><input name="proposalShares" type="hidden">`;
  $('#proposalCostPayer').innerHTML = payerOptions();
  $('#proposalCostPayer').value = state.current;
  tabipuSetupGenericEditor('proposalGenericCost', people);
};

scheduleCostFields = function () {
  const type = $('#scheduleType').value;
  const people = [...document.querySelectorAll('[name=schedulePeople]:checked')].map(input => input.value);
  if (!['meal', 'attraction', 'other'].includes(type)) return window.tabipuLegacyScheduleCostFields();
  const box = $('#scheduleCostFields');
  box.hidden = false;
  box.innerHTML = `<h3>費用</h3><label>支払った人<select name="costPayer" id="costPayerChoices"></select></label>${tabipuGenericEditor('scheduleGenericCost', people)}`;
  $('#costPayerChoices').innerHTML = payerOptions();
  $('#costPayerChoices').value = state.current;
  tabipuSetupGenericEditor('scheduleGenericCost', people);
};

$('#proposalForm').addEventListener('submit', () => {
  const type = $('#proposalType').value;
  if (!['meal', 'attraction', 'other'].includes(type)) return;
  const people = [...document.querySelectorAll('[name=participants]:checked')].map(input => input.value);
  const result = tabipuReadGenericCost('proposalGenericCost', people);
  $('#proposalForm [name=proposalCost]').value = result.total || '';
  $('#proposalForm [name=proposalShares]').value = JSON.stringify(result.shares);
}, true);

$('#scheduleForm').addEventListener('submit', event => {
  const type = $('#scheduleType').value;
  if (!['meal', 'attraction', 'other'].includes(type)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const data = new FormData(event.target), people = data.getAll('schedulePeople');
  const result = tabipuReadGenericCost('scheduleGenericCost', people);
  const mapUrl = data.get('mapUrl');
  if (mapUrl && !safeMapUrl(mapUrl)) return alert('httpsから始まるGoogle Mapsのリンクを入力してください。');
  const old = editingEventId && state.events.find(item => item.id === editingEventId);
  const eventId = old?.id || crypto.randomUUID();
  const entry = { id:eventId, type, title:data.get('title'), date:data.get('date'), endDate:data.get('endDate'), start:data.get('start'), end:data.get('end'), checkIn:data.get('checkIn'), checkInFrom:data.get('checkInFrom'), checkOut:data.get('checkOut'), checkOutUntil:data.get('checkOutUntil'), transportMode:data.get('transportMode'), reserved:data.get('reserved') === 'on', mapUrl, mapPlace:mapPlaceName(mapUrl), ota:data.get('ota'), cancelPolicy:data.get('cancelPolicy'), participants:people, author:old?.author || state.current, costPayer:data.get('costPayer'), costLabel:result.total ? yen(result.total) : '' };
  if (old) Object.assign(old, entry); else state.events.push(entry);
  state.expenses = (state.expenses || []).filter(item => item.scheduleId !== eventId);
  if (result.total) addCostEntries(entry.title, data.get('costPayer'), result.shares, '個別・均等割り', eventId);
  log(old ? '予定を編集' : '予定を追加', entry.title);
  editingEventId = null;
  event.target.reset();
  byId('scheduleDialog').close();
  save();
}, true);

