/* Eritora Encounter Tracker — Application Logic */
// ── Constants ──
const CONDITIONS = ['Blinded','Charmed','Deafened','Exhausted','Frightened','Grappled',
  'Incapacitated','Invisible','Paralyzed','Petrified','Poisoned','Prone','Restrained','Stunned','Unconscious'];

// ── State ──
var nextId = 1;
var encounters = [mkEncounter('Encounter 1')];
var activeIdx = 0;
var selectedId = null;
var activeCR = 'all';
var activeType = 'all';
var selMonster = null;
var draggedMonster = null;

function mkEncounter(name) {
  return { id: nextId++, name: name, combatants: [], currentTurn: 0, round: 1 };
}
function enc() { return encounters[activeIdx]; }

// ── Init ──
function init() {
  buildCondGrid();
  setupDragDrop();
  renderEncTabs();
  renderMonsterList(MONSTERS);
  render();
}

// ── Encounter Tabs ──
function renderEncTabs() {
  var bar = document.getElementById('encTabs');
  bar.innerHTML = '';
  encounters.forEach(function(e, i) {
    var btn = document.createElement('button');
    btn.className = 'enc-tab' + (i === activeIdx ? ' active' : '');
    btn.innerHTML = '<span onclick="setEnc(' + i + ')">' + e.name + '</span>' +
      ' <span class="close-tab" onclick="removeEnc(' + i + ', event)">&#10005;</span>';
    bar.appendChild(btn);
  });
  var add = document.createElement('button');
  add.className = 'add-enc-btn';
  add.textContent = '+';
  add.title = 'New encounter tab';
  add.onclick = addEncTab;
  bar.appendChild(add);
}

function setEnc(i) {
  activeIdx = i;
  selectedId = null;
  document.getElementById('roundNum').textContent = enc().round;
  renderEncTabs();
  render();
}

function addEncTab() {
  encounters.push(mkEncounter('Encounter ' + (encounters.length + 1)));
  setEnc(encounters.length - 1);
}

function removeEnc(i, evt) {
  evt.stopPropagation();
  if (encounters.length === 1) { showToast('Need at least one tab.'); return; }
  if (enc().combatants.length > 0 && !confirm('Remove "' + encounters[i].name + '"?')) return;
  encounters.splice(i, 1);
  if (activeIdx >= encounters.length) activeIdx = encounters.length - 1;
  selectedId = null;
  document.getElementById('roundNum').textContent = enc().round;
  renderEncTabs();
  render();
}

function editEncName() {
  var n = prompt('Encounter name:', enc().name);
  if (n && n.trim()) {
    enc().name = n.trim();
    renderEncTabs();
    document.getElementById('encNameDisp').textContent = enc().name;
  }
}

// ── Tabs ──
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(function(el){ el.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(el){ el.classList.remove('active'); });
  document.getElementById('tabContent-' + tab).classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
}

// ── Monster Browser ──
function crToN(cr) {
  if (cr === '1/8') return 0.125;
  if (cr === '1/4') return 0.25;
  if (cr === '1/2') return 0.5;
  var n = parseFloat(cr);
  return isNaN(n) ? 999 : n;
}
function crCls(cr) {
  var n = crToN(cr);
  if (n === 0) return 'cr-0';
  if (n <= 1) return 'cr-low';
  if (n <= 4) return 'cr-med';
  if (n <= 10) return 'cr-high';
  return 'cr-legend';
}
function setCRF(btn) {
  document.querySelectorAll('[data-cr]').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  activeCR = btn.dataset.cr;
  filterMonsters();
}
function setTypeF(btn) {
  document.querySelectorAll('[data-type]').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  activeType = btn.dataset.type;
  filterMonsters();
}
function filterMonsters() {
  var q = document.getElementById('mSearch').value.toLowerCase();
  var list = MONSTERS.filter(function(m) {
    if (q && m.name.toLowerCase().indexOf(q) < 0) return false;
    if (activeCR !== 'all') {
      var n = crToN(m.cr);
      if (activeCR === '5+') { if (n < 5) return false; }
      else if (m.cr !== activeCR) return false;
    }
    if (activeType !== 'all' && m.type !== activeType) return false;
    return true;
  });
  renderMonsterList(list);
}
function renderMonsterList(list) {
  var container = document.getElementById('mList');
  container.innerHTML = '';
  if (!list || !list.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:12px;font-style:italic;font-size:.78rem;">No monsters found.</div>';
    return;
  }
  list.forEach(function(m) {
    var row = document.createElement('div');
    row.className = 'm-row';
    var hasSpells = m.spells && m.spells.length > 0;
    row.innerHTML = '<div>' +
      '<div class="m-name">' + m.name + (hasSpells ? ' <span style="color:var(--purple);font-size:.65rem;" title="Has spells">&#10022;</span>' : '') + '</div>' +
      '<div class="m-sub">' + m.size + ' ' + m.type + ' &middot; AC ' + (m.ac||'?') + ' HP ' + (m.hp||'?') + '</div>' +
      '</div>' +
      '<span class="cr-badge ' + crCls(m.cr) + '">CR ' + m.cr + '</span>';
    row.onclick = function() { showMonsterDetail(m); };
    // ── Drag to initiative list ──
    row.setAttribute('draggable', 'true');
    (function(monster, el) {
      el.addEventListener('dragstart', function(e) {
        draggedMonster = monster;
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', monster.name);
        el.classList.add('dragging');
        var listArea = document.querySelector('.init-list-area');
        if (listArea) listArea.classList.add('drop-active');
      });
      el.addEventListener('dragend', function() {
        el.classList.remove('dragging');
        draggedMonster = null;
        var listArea = document.querySelector('.init-list-area');
        if (listArea) listArea.classList.remove('drop-active', 'drag-hover');
      });
    })(m, row);
    container.appendChild(row);
  });
}
function showMonsterDetail(m) {
  selMonster = m;
  document.getElementById('mdName').textContent = m.name;
  document.getElementById('mdType').textContent = (m.size||'') + ' ' + (m.type||'') + (m.alignment ? ', ' + m.alignment : '');
  document.getElementById('mdAC').textContent = m.ac != null ? m.ac : '—';
  document.getElementById('mdHP').textContent = m.hp != null ? m.hp : '—';
  document.getElementById('mdCR').textContent = m.cr || '—';
  document.getElementById('mdSpeed').textContent = m.speed || '—';
  document.getElementById('mdInit').textContent = m.initiativeMod != null ? (m.initiativeMod >= 0 ? '+' : '') + m.initiativeMod : '—';
  document.getElementById('mdPP').textContent = m.passivePerception != null ? m.passivePerception : '—';
  // Spells
  var spWrap = document.getElementById('mdSpellsWrap');
  var spDiv = document.getElementById('mdSpells');
  if (m.spells && m.spells.length > 0) {
    spDiv.innerHTML = '';
    m.spells.forEach(function(sp) {
      var chip = document.createElement('span');
      chip.className = 'spell-chip';
      chip.textContent = sp;
      chip.onclick = function() { showSpellPopup(sp); };
      spDiv.appendChild(chip);
    });
    spWrap.style.display = 'block';
  } else {
    spWrap.style.display = 'none';
  }
  document.getElementById('addQty').value = 1;
  document.getElementById('mDetail').classList.add('show');
}
function closeMonsterDetail() {
  document.getElementById('mDetail').classList.remove('show');
  selMonster = null;
}
function changeQty(d) {
  var inp = document.getElementById('addQty');
  inp.value = Math.max(1, Math.min(20, parseInt(inp.value||1) + d));
}
function addMonsterToEnc() {
  if (!selMonster) return;
  var qty = parseInt(document.getElementById('addQty').value) || 1;
  var m = selMonster;
  for (var i = 0; i < qty; i++) {
    var name = qty > 1 ? m.name + ' ' + (i+1) : m.name;
    var mStats = m.stats || MONSTER_STATS[m.name] || null;
    var c = mkCombatant(name, m.encounterType || 'enemy', {
      maxHP: m.hp, hp: m.hp, ac: m.ac,
      initiativeMod: m.initiativeMod || 0,
      spells: m.spells ? m.spells.slice() : [],
      stats: mStats ? JSON.parse(JSON.stringify(mStats)) : null
    });
    enc().combatants.push(c);
    log('Added ' + name + ' (AC ' + (m.ac||'?') + ', HP ' + (m.hp||'?') + ')', 'hl');
  }
  render();
  showToast('Added ' + qty + 'x ' + m.name);
}

// ── Initiative Drop Zone ──
function setupInitDropZone() {
  var listArea = document.querySelector('.init-list-area');
  if (!listArea) return;
  // Inject the hover hint overlay
  var hint = document.createElement('div');
  hint.className = 'drop-hint-overlay';
  hint.innerHTML = '<span class="dho-icon">&#9876;</span>Drop to add<span class="dho-qty">Hold Shift to set quantity</span>';
  listArea.appendChild(hint);

  listArea.addEventListener('dragover', function(e) {
    if (!draggedMonster) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    listArea.classList.add('drag-hover');
  });
  listArea.addEventListener('dragleave', function(e) {
    if (!listArea.contains(e.relatedTarget)) {
      listArea.classList.remove('drag-hover');
    }
  });
  listArea.addEventListener('drop', function(e) {
    e.preventDefault();
    listArea.classList.remove('drag-hover', 'drop-active');
    if (!draggedMonster) return;
    var m = draggedMonster;
    draggedMonster = null;
    if (e.shiftKey) {
      var raw = prompt('Add how many ' + m.name + '?', '1');
      if (raw === null) return;
      var qty = Math.max(1, Math.min(20, parseInt(raw) || 1));
      dropAddMonster(m, qty);
    } else {
      dropAddMonster(m, 1);
    }
  });
}

function dropAddMonster(m, qty) {
  for (var i = 0; i < qty; i++) {
    var name = qty > 1 ? m.name + ' ' + (i + 1) : m.name;
    var mStats = m.stats || MONSTER_STATS[m.name] || null;
    var c = mkCombatant(name, m.encounterType || 'enemy', {
      maxHP: m.hp, hp: m.hp, ac: m.ac,
      initiativeMod: m.initiativeMod || 0,
      spells: m.spells ? m.spells.slice() : [],
      stats: mStats ? JSON.parse(JSON.stringify(mStats)) : null
    });
    enc().combatants.push(c);
    log('\u2694 Dropped ' + name + ' (AC ' + (m.ac || '?') + ', HP ' + (m.hp || '?') + ')', 'hl');
  }
  render();
  showToast('\u2694 ' + qty + 'x ' + m.name + ' added');
}

// ── Spell Popup ──
function showSpellPopup(spellName) {
  var s = SPELL_MAP[spellName.toLowerCase()];
  if (!s) { showToast('Spell not found: ' + spellName); return; }
  document.getElementById('spName').textContent = s.name;
  var lvl = s.level ? s.level + (s.level==1?'st':s.level==2?'nd':s.level==3?'rd':'th') + '-level' : 'Cantrip';
  document.getElementById('spMeta').textContent = lvl + ' ' + (s.school||'');
  document.getElementById('spConc').innerHTML = s.concentration ? '<span class="conc-badge">Concentration</span>' : '';
  var fields = [
    ['Casting Time', s.castingTime],
    ['Range', s.range],
    ['Components', s.components],
    ['Duration', s.duration]
  ];
  var gridHtml = '';
  fields.forEach(function(f) {
    if (f[1]) gridHtml += '<div class="sp-field"><div class="sp-fl">' + f[0] + '</div><div class="sp-fv">' + f[1] + '</div></div>';
  });
  document.getElementById('spGrid').innerHTML = gridHtml;
  document.getElementById('spDesc').textContent = s.desc || '';
  document.getElementById('spOverlay').classList.add('show');
  document.getElementById('spPopup').classList.add('show');
}
function closeSpellPopup() {
  document.getElementById('spOverlay').classList.remove('show');
  document.getElementById('spPopup').classList.remove('show');
}

// ── Combatant Factory ──
function mkCombatant(name, type, opts) {
  opts = opts || {};
  return {
    id: nextId++,
    name: name,
    type: type || 'enemy',
    initiative: opts.initiative != null ? opts.initiative : null,
    initiativeMod: opts.initiativeMod || 0,
    maxHP: opts.maxHP != null ? opts.maxHP : null,
    hp: opts.hp != null ? opts.hp : opts.maxHP != null ? opts.maxHP : null,
    ac: opts.ac != null ? opts.ac : null,
    tempHP: 0,
    conditions: opts.conditions ? opts.conditions.slice() : [],
    isDead: false,
    isKO: false,
    deathSaves: { success: [false,false,false], fail: [false,false,false] },
    notes: opts.notes || '',
    spells: opts.spells ? opts.spells.slice() : [],
    spellSlots: opts.spellSlots ? JSON.parse(JSON.stringify(opts.spellSlots)) : {},
    concentrating: opts.concentrating || '',
    prevHP: null,
    prevTempHP: null,
    stats: opts.stats ? JSON.parse(JSON.stringify(opts.stats)) : null
  };
}

// ── Manual Add ──
function addCombatant() {
  var name = document.getElementById('addName').value.trim();
  if (!name) { showToast('Enter a name.'); return; }
  var type = document.getElementById('addType').value;
  var init = document.getElementById('addInit').value;
  var maxHP = document.getElementById('addMaxHP').value;
  var ac = document.getElementById('addAC').value;
  var c = mkCombatant(name, type, {
    initiative: init ? parseInt(init) : null,
    maxHP: maxHP ? parseInt(maxHP) : null,
    hp: maxHP ? parseInt(maxHP) : null,
    ac: ac ? parseInt(ac) : null
  });
  enc().combatants.push(c);
  document.getElementById('addName').value = '';
  document.getElementById('addInit').value = '';
  document.getElementById('addMaxHP').value = '';
  document.getElementById('addAC').value = '';
  log('Added ' + name, 'hl');
  render();
  showToast('Added ' + name);
}
function quickAddPC(name, init, ac, initMod) {
  // Pull maxHP from party roster if available
  var rosterEntry = partyRoster.find(function(m){ return m.name === name; });
  var maxHP = rosterEntry ? rosterEntry.maxHP : null;
  var c = mkCombatant(name, 'pc', {
    initiative: init ? parseInt(init) : null,
    maxHP: maxHP, hp: maxHP,
    ac: ac ? parseInt(ac) : null,
    initiativeMod: initMod ? parseInt(initMod) : 0
  });
  enc().combatants.push(c);
  log('Added PC: ' + name, 'hl');
  render();
}

// ── Spell assignment on combatant ──
function searchSpells(q) {
  var drop = document.getElementById('spellDrop');
  if (!q) { drop.classList.remove('show'); drop.innerHTML = ''; return; }
  var ql = q.toLowerCase();
  var matches = SPELLS.filter(function(s){ return s.name.toLowerCase().indexOf(ql) >= 0; }).slice(0,15);
  if (!matches.length) { drop.innerHTML = '<div class="spell-opt" style="color:var(--text-dim);">No matches</div>'; drop.classList.add('show'); return; }
  drop.innerHTML = '';
  matches.forEach(function(s) {
    var opt = document.createElement('div');
    opt.className = 'spell-opt';
    opt.textContent = s.name + (s.level ? ' (Lv' + s.level + ')' : ' (cantrip)');
    opt.onmousedown = function() { addSpellToCombatant(s.name); };
    drop.appendChild(opt);
  });
  drop.classList.add('show');
}
function closeSpellDrop() {
  var drop = document.getElementById('spellDrop');
  drop.classList.remove('show');
  document.getElementById('spellSearchInp').value = '';
}
function addSpellToCombatant(spellName) {
  var sel = enc().combatants.find(function(c){ return c.id === selectedId; });
  if (!sel) return;
  if (sel.spells.indexOf(spellName) < 0) sel.spells.push(spellName);
  closeSpellDrop();
  renderCmbSpells(sel);
}
function removeSpellFromCombatant(spellName) {
  var sel = enc().combatants.find(function(c){ return c.id === selectedId; });
  if (!sel) return;
  var idx = sel.spells.indexOf(spellName);
  if (idx >= 0) sel.spells.splice(idx, 1);
  if (sel.concentrating === spellName) sel.concentrating = '';
  renderCmbSpells(sel);
}
function renderCmbSpells(sel) {
  var wrap = document.getElementById('cmbSpells');
  wrap.innerHTML = '';
  if (!sel || !sel.spells || !sel.spells.length) { wrap.innerHTML = '<span style="color:var(--text-dim);font-size:.75rem;font-style:italic;">None assigned.</span>'; return; }
  sel.spells.forEach(function(sp) {
    var spData = SPELL_MAP[sp.toLowerCase()];
    var isConc = spData && spData.concentration;
    var isActive = sel.concentrating === sp;
    var chip = document.createElement('span');
    chip.className = 'cmb-spell-chip';
    chip.style.borderColor = isActive ? 'var(--yellow)' : '';
    chip.style.color = isActive ? 'var(--yellow)' : '';
    chip.onclick = function() { showSpellPopup(sp); };
    chip.oncontextmenu = function(e) { e.preventDefault(); removeSpellFromCombatant(sp); };
    chip.title = 'Click to view | Right-click to remove' + (isConc ? ' | ◉ to toggle concentration' : '');
    var nameSpan = document.createElement('span');
    nameSpan.textContent = sp;
    chip.appendChild(nameSpan);
    if (isConc) {
      var concBtn = document.createElement('span');
      concBtn.textContent = isActive ? '\u25ce' : '\u25ef';
      concBtn.title = isActive ? 'End concentration' : 'Start concentrating on this spell';
      concBtn.style.cssText = 'font-size:0.7rem;color:' + (isActive ? 'var(--yellow)' : 'var(--text-dim)') + ';margin-left:2px;cursor:pointer;';
      concBtn.onclick = function(e) { e.stopPropagation(); toggleConcentration(sp); };
      chip.appendChild(concBtn);
    }
    wrap.appendChild(chip);
  });
}

// ── Spell Slots ──
function addSlotLevel() {
  var sel = enc().combatants.find(function(c){ return c.id === selectedId; });
  if (!sel) return;
  var lv = document.getElementById('slotLvSel').value;
  var ct = parseInt(document.getElementById('slotCtInp').value) || 3;
  if (!lv) { showToast('Choose a level.'); return; }
  if (!sel.spellSlots[lv]) {
    sel.spellSlots[lv] = { max: ct, used: 0 };
  } else {
    sel.spellSlots[lv].max = ct;
  }
  renderSlots(sel);
}
function toggleSlot(lv, idx) {
  var sel = enc().combatants.find(function(c){ return c.id === selectedId; });
  if (!sel || !sel.spellSlots[lv]) return;
  var slot = sel.spellSlots[lv];
  if (idx < slot.used) {
    slot.used--;
  } else if (slot.used < slot.max) {
    slot.used++;
  }
  renderSlots(sel);
}
function restoreSlots() {
  var sel = enc().combatants.find(function(c){ return c.id === selectedId; });
  if (!sel) return;
  Object.keys(sel.spellSlots).forEach(function(lv){ sel.spellSlots[lv].used = 0; });
  renderSlots(sel);
}
function renderAbilityScores(sel) {
  var grid = document.getElementById('abGrid');
  if (!grid) return;
  if (!sel || !sel.stats) {
    grid.innerHTML = '<div style="grid-column:1/-1;color:var(--text-dim);font-size:0.75rem;font-style:italic;text-align:center;padding:4px 0;">No stats \u2014 click Edit to add</div>';
    return;
  }
  var labels = ['STR','DEX','CON','INT','WIS','CHA'];
  var keys   = ['str','dex','con','int','wis','cha'];
  var html = '';
  keys.forEach(function(k, i) {
    var v = sel.stats[k] != null ? sel.stats[k] : 10;
    var mod = Math.floor((v - 10) / 2);
    var modStr = (mod >= 0 ? '+' : '') + mod;
    html += '<div class="ab-cell">' +
      '<div class="ab-lbl">' + labels[i] + '</div>' +
      '<div class="ab-val">' + v + '</div>' +
      '<div class="ab-mod">' + modStr + '</div>' +
      '</div>';
  });
  grid.innerHTML = html;
}
function editCombatantStats() {
  var sel = enc().combatants.find(function(c){ return c.id === selectedId; });
  if (!sel) return;
  var keys   = ['str','dex','con','int','wis','cha'];
  var labels = ['Strength','Dexterity','Constitution','Intelligence','Wisdom','Charisma'];
  var current = sel.stats || {str:10,dex:10,con:10,int:10,wis:10,cha:10};
  var updated = {};
  for (var i = 0; i < keys.length; i++) {
    var val = prompt(labels[i] + ' (' + sel.name + '):', current[keys[i]] || 10);
    if (val === null) return; // cancelled
    var n = parseInt(val);
    updated[keys[i]] = isNaN(n) ? (current[keys[i]] || 10) : Math.max(1, Math.min(30, n));
  }
  sel.stats = updated;
  renderAbilityScores(sel);
}

function renderSlots(sel) {
  var container = document.getElementById('slotRows');
  container.innerHTML = '';
  if (!sel || !Object.keys(sel.spellSlots).length) {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:.73rem;font-style:italic;">No spell slots configured.</div>';
    return;
  }
  var levels = Object.keys(sel.spellSlots).sort(function(a,b){ return parseInt(a)-parseInt(b); });
  levels.forEach(function(lv) {
    var slot = sel.spellSlots[lv];
    var row = document.createElement('div');
    row.className = 'slot-row';
    var ordinal = lv == 1 ? '1st' : lv == 2 ? '2nd' : lv == 3 ? '3rd' : lv + 'th';
    var html = '<span class="slot-lv">' + ordinal + '</span><span class="slot-pips">';
    for (var i = 0; i < slot.max; i++) {
      var used = i < slot.used;
      html += '<span class="pip' + (used ? ' used' : '') + '" onclick="toggleSlot(\'' + lv + '\',' + i + ')" title="' + (used ? 'Used' : 'Available') + '"></span>';
    }
    html += '</span><span style="font-size:.65rem;color:var(--text-dim);margin-left:4px;">' + (slot.max - slot.used) + '/' + slot.max + '</span>';
    row.innerHTML = html;
    container.appendChild(row);
  });
}

// ── Combat Actions ──
function adjHP(dir, mode, amount) {
  var sel = enc().combatants.find(function(c){ return c.id === selectedId; });
  if (!sel || sel.maxHP == null) return;
  var amt = amount != null ? amount : parseInt(document.getElementById('hpInp').value) || 0;
  if (!amt) return;
  // Save undo snapshot before any change
  sel.prevHP = sel.hp;
  sel.prevTempHP = sel.tempHP;
  var change = dir * amt;
  if (sel.tempHP > 0 && dir < 0) {
    var absorbed = Math.min(sel.tempHP, amt);
    sel.tempHP -= absorbed;
    amt -= absorbed;
    if (amt <= 0) { render(); return; }
    change = dir * amt;
  }
  sel.hp = Math.max(0, Math.min(sel.maxHP, (sel.hp || 0) + change));
  if (sel.hp === 0) {
    if (sel.type === 'pc') {
      sel.isKO = true;
      log(sel.name + ' is unconscious!', 'hi');
      showToast('\uD83D\uDCA4 ' + sel.name + ' is down!');
    } else {
      sel.isDead = true;
      log('\u2620 ' + sel.name + ' has been slain!', 'hi');
      showToast('\u2620 ' + sel.name + ' slain!');
    }
  }
  if (sel.hp > 0) { sel.isKO = false; sel.isDead = false; sel.deathSaves = {success:[false,false,false],fail:[false,false,false]}; }
  log((dir>0?'Healed ':'Damaged ') + sel.name + ' ' + Math.abs(change) + ' (' + sel.hp + '/' + sel.maxHP + ' HP)');
  // Concentration check on damage
  if (dir < 0 && amt > 0 && sel.concentrating) {
    var dc = Math.max(10, Math.ceil(amt / 2));
    showToast('\u26a0 ' + sel.name + ' is concentrating on ' + sel.concentrating + ' \u2014 DC ' + dc + ' Con save!');
  }
  document.getElementById('hpInp').value = '';
  render();
}
function setTempHP() {
  var sel = enc().combatants.find(function(c){ return c.id === selectedId; });
  if (!sel) return;
  var n = parseInt(prompt('Set temp HP:', sel.tempHP || 0));
  if (!isNaN(n)) { sel.tempHP = Math.max(0, n); render(); }
}
function undoHP() {
  var sel = enc().combatants.find(function(c){ return c.id === selectedId; });
  if (!sel || sel.prevHP === null) return;
  var restoredHP = sel.prevHP;
  var restoredTemp = sel.prevTempHP;
  sel.prevHP = null;
  sel.prevTempHP = null;
  sel.hp = restoredHP;
  sel.tempHP = restoredTemp != null ? restoredTemp : sel.tempHP;
  if (sel.hp > 0) { sel.isKO = false; }
  log('Undid last HP change on ' + sel.name + ' \u2192 ' + sel.hp + '/' + sel.maxHP);
  render();
}
function saveNotes(val) {
  var sel = enc().combatants.find(function(c){ return c.id === selectedId; });
  if (!sel) return;
  sel.notes = val;
}
function toggleConcentration(spellName) {
  var sel = enc().combatants.find(function(c){ return c.id === selectedId; });
  if (!sel) return;
  sel.concentrating = (sel.concentrating === spellName) ? '' : spellName;
  render();
}
function clearConcentration() {
  var sel = enc().combatants.find(function(c){ return c.id === selectedId; });
  if (!sel) return;
  sel.concentrating = '';
  render();
}
function toggleDS(type, idx) {
  var sel = enc().combatants.find(function(c){ return c.id === selectedId; });
  if (!sel) return;
  var arr = type === 's' ? sel.deathSaves.success : sel.deathSaves.fail;
  arr[idx] = !arr[idx];
  render();
}
function removeSel() {
  var e = enc();
  var idx = e.combatants.findIndex(function(c){ return c.id === selectedId; });
  if (idx < 0) return;
  var name = e.combatants[idx].name;
  e.combatants.splice(idx, 1);
  if (e.currentTurn >= e.combatants.length) e.currentTurn = 0;
  selectedId = null;
  log('Removed ' + name, 'dm');
  render();
}
function toggleDead() {
  var sel = enc().combatants.find(function(c){ return c.id === selectedId; });
  if (!sel) return;
  sel.isDead = !sel.isDead;
  log(sel.name + (sel.isDead ? ' died.' : ' stabilized.'), sel.isDead ? 'dm' : 'hl');
  render();
}
function toggleKO() {
  var sel = enc().combatants.find(function(c){ return c.id === selectedId; });
  if (!sel) return;
  sel.isKO = !sel.isKO;
  render();
}
function buildCondGrid() {
  var g = document.getElementById('condGrid');
  g.innerHTML = '';
  CONDITIONS.forEach(function(cond) {
    var b = document.createElement('button');
    b.className = 'cond-btn';
    b.id = 'cb-' + cond;
    b.textContent = cond;
    b.onclick = function() { toggleCond(cond); };
    g.appendChild(b);
  });
}
function toggleCond(cond) {
  var sel = enc().combatants.find(function(c){ return c.id === selectedId; });
  if (!sel) return;
  var idx = sel.conditions.indexOf(cond);
  if (idx >= 0) sel.conditions.splice(idx, 1);
  else sel.conditions.push(cond);
  updateCondBtns(sel);
  render();
}
function updateCondBtns(sel) {
  CONDITIONS.forEach(function(cond) {
    var b = document.getElementById('cb-' + cond);
    if (b) b.classList.toggle('on', sel.conditions.indexOf(cond) >= 0);
  });
}
function removeCondFromCard(id, cond, evt) {
  evt.stopPropagation();
  var c = enc().combatants.find(function(x){ return x.id === id; });
  if (!c) return;
  var i = c.conditions.indexOf(cond);
  if (i >= 0) c.conditions.splice(i, 1);
  render();
}

// ── Turn / Round ──
function nextTurn() {
  var e = enc();
  if (!e.combatants.length) return;
  e.currentTurn = (e.currentTurn + 1) % e.combatants.length;
  if (e.currentTurn === 0) { e.round++; document.getElementById('roundNum').textContent = e.round; log('=== Round ' + e.round + ' ===', 'hi'); }
  log('Turn: ' + e.combatants[e.currentTurn].name, 'hi');
  render();
}
function prevRound() {
  var e = enc();
  if (e.round <= 1) return;
  e.round--;
  document.getElementById('roundNum').textContent = e.round;
  log('Back to round ' + e.round, 'hi');
}
function sortByInit() {
  enc().combatants.sort(function(a,b){ return (b.initiative||0)-(a.initiative||0); });
  render();
}
function rollMonstersInit() {
  var count = 0;
  enc().combatants.forEach(function(c) {
    if (c.type !== 'pc') {
      c.initiative = Math.ceil(Math.random()*20) + (c.initiativeMod||0);
      count++;
    }
  });
  sortByInit();
  showToast('Rolled initiative for ' + count + ' monster(s). Enter PC rolls manually.');
}
function rollAllInit() {
  enc().combatants.forEach(function(c) {
    if (c.initiative == null || c.initiative === 0) {
      c.initiative = Math.ceil(Math.random()*20) + (c.initiativeMod||0);
    }
  });
  sortByInit();
  showToast('Initiative rolled for all!');
}

// ── Editing inline ──
function editInit(id) {
  var c = enc().combatants.find(function(x){ return x.id === id; });
  if (!c) return;
  var el = document.getElementById('init-' + id);
  if (!el) return;
  var inp = document.createElement('input');
  inp.className = 'init-inp';
  inp.type = 'number';
  inp.value = c.initiative || '';
  inp.onclick = function(e){ e.stopPropagation(); };
  inp.onblur = function() { var v = parseInt(inp.value); if (!isNaN(v)) c.initiative = v; render(); };
  inp.onkeydown = function(e) { if (e.key==='Enter') inp.blur(); };
  el.replaceWith(inp);
  inp.focus(); inp.select();
}
function editHP(id) {
  var c = enc().combatants.find(function(x){ return x.id === id; });
  if (!c || c.maxHP == null) return;
  var v = parseInt(prompt('Set HP (max ' + c.maxHP + '):', c.hp || 0));
  if (!isNaN(v)) {
    c.hp = Math.max(0, Math.min(c.maxHP, v));
    if (c.hp === 0) {
      if (c.type === 'pc') { c.isKO = true; }
      else { c.isDead = true; showToast('\u2620 ' + c.name + ' slain!'); }
    }
    if (c.hp > 0) { c.isKO = false; c.isDead = false; c.deathSaves = {success:[false,false,false],fail:[false,false,false]}; }
    render();
  }
}
function editCombatantName(id, spanEl) {
  var c = enc().combatants.find(function(x){ return x.id === id; });
  if (!c) return;
  var inp = document.createElement('input');
  inp.className = 'c-name-inp';
  inp.type = 'text';
  inp.value = c.name;
  inp.onclick = function(e){ e.stopPropagation(); };
  inp.onblur = function() {
    var v = inp.value.trim();
    if (v) { c.name = v; if (selectedId === id) document.getElementById('selTitle').textContent = v; }
    render();
  };
  inp.onkeydown = function(e) {
    if (e.key === 'Enter') inp.blur();
    if (e.key === 'Escape') { inp.value = c.name; inp.blur(); }
  };
  spanEl.replaceWith(inp);
  inp.focus(); inp.select();
}
function selectCombatant(id) {
  if (selectedId === id) return; // already selected — keep DOM intact so dblclick can fire
  selectedId = id;
  switchTab('combat');
  render();
}

// ── New / Reset Encounter ──
function newEncounter() {
  var name = prompt('Encounter name:', 'Encounter ' + (encounters.length + 1));
  if (!name) return;
  encounters.push(mkEncounter(name.trim()));
  setEnc(encounters.length - 1);
}
function resetEncounter() {
  if (!confirm('Reset this encounter?')) return;
  enc().combatants = [];
  enc().currentTurn = 0;
  enc().round = 1;
  selectedId = null;
  document.getElementById('roundNum').textContent = 1;
  log('Encounter reset.', 'hi');
  render();
}

// ── Drag & Drop ──
function setupDragDrop() {
  var zone = document.getElementById('dropZone');
  zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', function(){ zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', function(e){ e.preventDefault(); zone.classList.remove('drag-over'); var f = e.dataTransfer.files[0]; if(f) readEncFile(f); });
}
function handleFileSel(e) {
  var f = e.target.files[0];
  if (f) readEncFile(f);
}
function readEncFile(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      loadEncData(data, file.name);
    } catch(err) {
      showToast('Error reading file: ' + err.message);
    }
  };
  reader.readAsText(file);
}
function loadEncData(data, filename) {
  enc().combatants = [];
  enc().round = data.round || 1;
  enc().currentTurn = 0;
  if (data.name) enc().name = data.name;
  (data.combatants || []).forEach(function(cd) {
    var c = mkCombatant(cd.name, cd.type, {
      initiative: cd.initiative,
      initiativeMod: cd.initiativeMod || 0,
      maxHP: cd.maxHP,
      hp: cd.hp != null ? cd.hp : cd.maxHP,
      ac: cd.ac,
      conditions: cd.conditions || [],
      notes: cd.notes || '',
      spells: cd.spells || [],
      spellSlots: cd.spellSlots || {}
    });
    c.isDead = !!cd.isDead;
    c.isKO = !!cd.isKO;
    if (cd.tempHP != null) c.tempHP = cd.tempHP;
    if (cd.deathSaves) c.deathSaves = JSON.parse(JSON.stringify(cd.deathSaves));
    if (cd.concentrating) c.concentrating = cd.concentrating;
    if (cd.stats) c.stats = JSON.parse(JSON.stringify(cd.stats));
    enc().combatants.push(c);
  });
  document.getElementById('roundNum').textContent = enc().round;
  renderEncTabs();
  selectedId = null;
  var banner = document.getElementById('impBanner');
  document.getElementById('impBannerTxt').textContent = 'Loaded: ' + (data.name || filename);
  banner.classList.add('show');
  log('Imported: ' + (data.name || filename), 'hi');
  render();
}
function exportEncounter() {
  var e = enc();
  var data = { name: e.name, round: e.round, combatants: e.combatants.map(function(c){ return {
    name:c.name, type:c.type, initiative:c.initiative, initiativeMod:c.initiativeMod,
    maxHP:c.maxHP, hp:c.hp, ac:c.ac, tempHP:c.tempHP, conditions:c.conditions,
    isDead:c.isDead, isKO:c.isKO, deathSaves:c.deathSaves,
    notes:c.notes, spells:c.spells, spellSlots:c.spellSlots, concentrating:c.concentrating||'',
    stats:c.stats||null
  }; })};
  var blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = e.name.replace(/[^a-z0-9]/gi,'_') + '.encounter';
  a.click();
  showToast('Saved!');
}

// ── Log ──
function log(msg, cls) {
  var box = document.getElementById('combatLog');
  var el = document.createElement('div');
  el.className = 'le' + (cls ? ' ' + cls : '');
  el.textContent = msg;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}
function clearLog() {
  document.getElementById('combatLog').innerHTML = '<div class="le hi">-- Log cleared --</div>';
}

// ── Toast ──
var _toastTimer;
function showToast(msg) {
  var el = document.getElementById('toastEl');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function(){ el.classList.remove('show'); }, 2200);
}

// ── Main Render ──
function render() {
  var e = enc();
  document.getElementById('encNameDisp').textContent = e.name;
  document.getElementById('roundNum').textContent = e.round;
  document.title = 'Round\u00a0' + e.round + ' \u2014 ' + e.name + ' \u00b7 Eritora';
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(saveSession, 800);
  var list = document.getElementById('combatantList');
  if (!e.combatants.length) {
    list.innerHTML = '<div class="empty-state">No combatants yet.<br>Browse Monsters or use the Add tab.</div>';
    document.getElementById('noSelMsg').style.display = 'block';
    document.getElementById('combatPanel').style.display = 'none';
    return;
  }
  list.innerHTML = '';
  // Render live combatants in initiative order, dead ones at the bottom
  var liveCombatants = e.combatants.filter(function(c){ return !c.isDead; });
  var deadCombatants = e.combatants.filter(function(c){ return c.isDead; });
  var renderOrder = liveCombatants.concat(deadCombatants);
  renderOrder.forEach(function(c) {
    var idx = e.combatants.indexOf(c);
    var isActive = idx === e.currentTurn && !c.isDead;
    var typeCls = c.type === 'pc' ? 'pc-card' : c.type === 'enemy' ? 'enemy-card' : 'neutral-card';
    var badgeCls = c.type === 'pc' ? 'tbadge-pc' : c.type === 'enemy' ? 'tbadge-enemy' : 'tbadge-neutral';
    var hpPct = 100, hpColor = 'var(--green)';
    if (c.maxHP) {
      hpPct = Math.max(0, Math.round(((c.hp||0)/c.maxHP)*100));
      if (hpPct < 25) hpColor = 'var(--red)';
      else if (hpPct < 50) hpColor = 'var(--yellow)';
    }
    var condHTML = c.conditions.map(function(cond){
      return '<span class="cond-tag" onclick="removeCondFromCard(' + c.id + ',\'' + cond + '\',event)">' + cond + ' &times;</span>';
    }).join('');
    var hasSpells = c.spells && c.spells.length > 0;
    var card = document.createElement('div');
    card.className = 'c-card ' + typeCls +
      (isActive ? ' active-turn' : '') +
      (c.id === selectedId ? ' selected' : '') +
      (c.isDead ? ' dead' : '') +
      (c.isKO && !c.isDead ? ' ko' : '');
    card.onclick = function(){ selectCombatant(c.id); };
    // Status badge (dead/ko)
    var statusBadge = '';
    if (c.isDead) statusBadge = ' <span class="status-badge dead-badge">&#9760;&nbsp;Slain</span>';
    else if (c.isKO) statusBadge = ' <span class="status-badge ko-badge">&#128565;&nbsp;Down</span>';
    // Small indicator icons (spell, concentration)
    var spellIcon = hasSpells ? ' <span style="color:var(--purple);font-size:.64rem;opacity:.85;" title="Has spells">&#10022;</span>' : '';
    var concIcon = c.concentrating ? ' <span style="color:var(--yellow);font-size:.7rem;" title="Concentrating: ' + c.concentrating + '">&#9685;</span>' : '';
    // HP block — wider bar, critical pulse on low HP number
    var isCrit = c.maxHP && hpPct < 25 && !c.isDead;
    var hpBlock;
    if (c.maxHP != null) {
      hpBlock = '<div class="c-hp-row">' +
        '<div class="hpbar-wrap"><div class="hpbar" style="width:' + hpPct + '%;background:' + hpColor + ';"></div></div>' +
        '<span class="hp-fraction' + (isCrit ? ' hp-critical' : '') + '" onclick="event.stopPropagation();editHP(' + c.id + ')" title="Click to set HP">' + (c.hp||0) + '/' + c.maxHP + '</span>' +
        (c.tempHP > 0 ? '<span class="hp-temp">+' + c.tempHP + 'T</span>' : '') +
        '</div>';
    } else {
      hpBlock = '<div style="font-size:0.74rem;color:var(--text-dim);font-style:italic;margin-top:1px;">No HP tracked</div>';
    }
    // AC badge (right column)
    var acBlock = c.ac != null
      ? '<div class="ac-badge"><div class="ac-badge-lbl">AC</div><div class="ac-badge-val">' + c.ac + '</div></div>'
      : '<div class="ac-badge" style="opacity:.25;"><div class="ac-badge-lbl">AC</div><div class="ac-badge-val">—</div></div>';
    card.innerHTML =
      '<div id="init-' + c.id + '" class="init-num" onclick="event.stopPropagation();editInit(' + c.id + ')" title="Click to edit">' + (c.initiative != null ? c.initiative : '?') + '</div>' +
      '<div class="c-info">' +
        '<div class="c-name"><span class="c-name-text" title="Double-click to rename">' + c.name + '</span>' + statusBadge + spellIcon + concIcon + '</div>' +
        hpBlock +
        (condHTML ? '<div class="cond-row">' + condHTML + '</div>' : '') +
        (isActive ? '<div class="active-turn-lbl">&#9658; Your Turn</div>' : '') +
      '</div>' +
      '<div class="c-right">' + acBlock + '<div class="turn-ind">&#9658;</div></div>';
    list.appendChild(card);
    // Wire dblclick AFTER appending — inline ondblclick gets killed by render() rebuilds,
    // but since selectCombatant() now bails early when already selected, this listener
    // survives: first click selects (rebuilds), second click on already-selected card is
    // a no-op (no rebuild), so the dblclick fires on the still-live span.
    (function(cid) {
      var nameEl = card.querySelector('.c-name-text');
      if (nameEl) nameEl.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        editCombatantName(cid, nameEl);
      });
    })(c.id);
  });

  // Update combat panel
  var sel = e.combatants.find(function(c){ return c.id === selectedId; });
  var panel = document.getElementById('combatPanel');
  var noSel = document.getElementById('noSelMsg');
  if (sel) {
    panel.style.display = 'flex';
    noSel.style.display = 'none';
    document.getElementById('selTitle').textContent = sel.name;
    document.getElementById('dsSec').style.display = (sel.isKO && sel.type === 'pc') ? 'block' : 'none';
    if (sel.isKO) {
      document.querySelectorAll('.sbox').forEach(function(b,i){ b.classList.toggle('on', sel.deathSaves.success[i]); });
      document.querySelectorAll('.fbox').forEach(function(b,i){ b.classList.toggle('on', sel.deathSaves.fail[i]); });
    }
    // Notes (always visible, editable)
    var notesEl = document.getElementById('notesText');
    if (document.activeElement !== notesEl) notesEl.value = sel.notes || '';
    // Undo button state
    var undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.disabled = (sel.prevHP === null);
    // Concentration display
    var cw = document.getElementById('concWrap');
    if (sel.concentrating) {
      cw.style.display = 'block';
      document.getElementById('concSpellName').textContent = sel.concentrating;
    } else {
      cw.style.display = 'none';
    }
    updateCondBtns(sel);
    renderCmbSpells(sel);
    renderSlots(sel);
    // Ability scores
    renderAbilityScores(sel);
  } else {
    panel.style.display = 'none';
    noSel.style.display = 'block';
  }
}

// ── Party Roster ──
var partyRoster = [];   // [{id, name, cls, maxHP, ac, initiativeMod, present}]
var partyNextId = 1;

// Default party from D&D Beyond (ERITORA campaign) — used only if no saved roster exists
var DEFAULT_PARTY = {
  dndBeyondUrl: 'https://www.dndbeyond.com/campaigns/7412551',
  roster: [
    { id:1, name:'Bazriel Finnyon',      cls:'Bard 4',      maxHP:31, ac:13, initiativeMod: 2, present:true  },
    { id:2, name:'Klark, Son of Mark',   cls:'Fighter 4',   maxHP:32, ac:16, initiativeMod: 1, present:true  },
    { id:3, name:'Kyleena Baleena',      cls:'Druid 4',     maxHP:31, ac:16, initiativeMod: 3, present:true  },
    { id:4, name:'Mark, Son of Stark',   cls:'Barbarian 4', maxHP:21, ac:12, initiativeMod: 0, present:true  },
    { id:5, name:'Bingles the trash wizard', cls:'Artificer 4', maxHP:35, ac:12, initiativeMod: 2, present:true  },
    { id:6, name:'Mark',                 cls:'Barbarian 3', maxHP:32, ac:11, initiativeMod:-1, present:false }
  ]
};

function loadParty() {
  try {
    var raw = localStorage.getItem('eritora_party');
    var data = raw ? JSON.parse(raw) : null;
    // First launch: seed with D&D Beyond data
    if (!data || !data.roster || !data.roster.length) {
      data = DEFAULT_PARTY;
    }
    partyRoster = data.roster || [];
    partyNextId = Math.max.apply(null, partyRoster.map(function(m){ return m.id||0; }).concat([0])) + 1;
    var url = data.dndBeyondUrl || '';
    document.getElementById('partyDnDBeyondUrl').textContent = url || 'Not set';
    document.getElementById('partyDnDBeyondUrl').dataset.url = url;
    // Save back so any future loads use localStorage
    saveParty();
  } catch(e) {}
}

function saveParty() {
  var url = document.getElementById('partyDnDBeyondUrl').dataset.url || '';
  localStorage.setItem('eritora_party', JSON.stringify({
    roster: partyRoster,
    nextId: partyNextId,
    dndBeyondUrl: url
  }));
}

function renderPartyRoster() {
  var container = document.getElementById('partyRosterList');
  container.innerHTML = '';
  if (!partyRoster.length) {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:.75rem;font-style:italic;text-align:center;padding:10px;">No party members yet. Add some below or sync from D&amp;D Beyond.</div>';
    return;
  }
  partyRoster.forEach(function(m) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:7px;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:5px 8px;transition:border-color .1s;';
    if (m.present) row.style.borderColor = 'var(--green)';
    var initStr = m.initiativeMod != null ? (m.initiativeMod >= 0 ? '+' : '') + m.initiativeMod : '+0';
    row.innerHTML =
      '<input type="checkbox" ' + (m.present ? 'checked' : '') + ' onchange="togglePartyPresent(' + m.id + ',this.checked)" style="accent-color:var(--green);width:14px;height:14px;cursor:pointer;flex-shrink:0;">' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:.83rem;font-weight:bold;display:flex;align-items:center;gap:5px;">' + m.name +
          (m.cls ? '<span style="font-size:.62rem;color:var(--text-dim);font-weight:normal;">' + m.cls + '</span>' : '') +
        '</div>' +
        '<div style="font-size:.65rem;color:var(--text-dim);display:flex;gap:6px;">' +
          (m.maxHP ? '<span>HP ' + m.maxHP + '</span>' : '') +
          (m.ac ? '<span>AC ' + m.ac + '</span>' : '') +
          '<span>Init ' + initStr + '</span>' +
        '</div>' +
      '</div>' +
      '<button onclick="removePartyMember(' + m.id + ')" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:.8rem;padding:2px 4px;" title="Remove">&times;</button>';
    container.appendChild(row);
  });
}

function togglePartyPresent(id, checked) {
  var m = partyRoster.find(function(x){ return x.id === id; });
  if (m) { m.present = checked; saveParty(); renderPartyRoster(); }
}

function toggleAllParty() {
  var anyUnchecked = partyRoster.some(function(m){ return !m.present; });
  partyRoster.forEach(function(m){ m.present = anyUnchecked; });
  saveParty();
  renderPartyRoster();
}

function addPartyMember(data) {
  // Can be called with a data object (from D&D Beyond sync) or reads from form fields
  var name, cls, maxHP, ac, initMod;
  if (data && data.name) {
    name = data.name; cls = data.cls || ''; maxHP = data.maxHP || null;
    ac = data.ac || null; initMod = data.initiativeMod != null ? data.initiativeMod : 0;
  } else {
    name = document.getElementById('pAddName').value.trim();
    if (!name) { showToast('Enter a name.'); return; }
    cls = document.getElementById('pAddClass').value.trim();
    maxHP = parseInt(document.getElementById('pAddHP').value) || null;
    ac = parseInt(document.getElementById('pAddAC').value) || null;
    initMod = parseInt(document.getElementById('pAddInit').value) || 0;
    document.getElementById('pAddName').value = '';
    document.getElementById('pAddClass').value = '';
    document.getElementById('pAddHP').value = '';
    document.getElementById('pAddAC').value = '';
    document.getElementById('pAddInit').value = '';
  }
  // Avoid duplicates by name when syncing
  var existing = partyRoster.findIndex(function(m){ return m.name.toLowerCase() === name.toLowerCase(); });
  if (existing >= 0) {
    // Update existing
    partyRoster[existing].cls = cls || partyRoster[existing].cls;
    partyRoster[existing].maxHP = maxHP || partyRoster[existing].maxHP;
    partyRoster[existing].ac = ac || partyRoster[existing].ac;
    partyRoster[existing].initiativeMod = initMod;
    showToast('Updated ' + name);
  } else {
    partyRoster.push({ id: partyNextId++, name: name, cls: cls, maxHP: maxHP, ac: ac, initiativeMod: initMod, present: true });
    showToast('Added ' + name + ' to roster');
  }
  saveParty();
  renderPartyRoster();
}

function removePartyMember(id) {
  var idx = partyRoster.findIndex(function(m){ return m.id === id; });
  if (idx >= 0) { partyRoster.splice(idx, 1); saveParty(); renderPartyRoster(); }
}

function addCheckedToEncounter() {
  var present = partyRoster.filter(function(m){ return m.present; });
  if (!present.length) { showToast('No party members checked.'); return; }
  var added = 0;
  present.forEach(function(m) {
    // Don't add duplicates that are already in this encounter
    var alreadyIn = enc().combatants.some(function(c){ return c.name === m.name && c.type === 'pc'; });
    if (!alreadyIn) {
      var c = mkCombatant(m.name, 'pc', {
        maxHP: m.maxHP, hp: m.maxHP, ac: m.ac, initiativeMod: m.initiativeMod || 0
      });
      enc().combatants.push(c);
      added++;
    }
  });
  if (added > 0) {
    render();
    showToast('Added ' + added + ' party member(s) to encounter.');
    log('Party added: ' + present.filter(function(m){ return m.present; }).map(function(m){ return m.name; }).join(', '), 'hl');
    switchTab('monsters');
  } else {
    showToast('All checked members already in encounter.');
  }
}

// D&D Beyond URL management
function setDnDBeyondUrl() {
  var current = document.getElementById('partyDnDBeyondUrl').dataset.url || '';
  var url = prompt('D&D Beyond campaign URL:', current || 'https://www.dndbeyond.com/campaigns/');
  if (url && url.trim()) {
    var clean = url.trim();
    document.getElementById('partyDnDBeyondUrl').textContent = clean;
    document.getElementById('partyDnDBeyondUrl').dataset.url = clean;
    saveParty();
    showToast('Campaign URL saved!');
  }
}
function copyDnDBeyondUrl() {
  var url = document.getElementById('partyDnDBeyondUrl').dataset.url || '';
  if (!url) { showToast('No campaign URL set.'); return; }
  navigator.clipboard.writeText(url).then(function(){ showToast('URL copied!'); });
}

// .party file export/import
function exportParty() {
  var url = document.getElementById('partyDnDBeyondUrl').dataset.url || '';
  var data = { dndBeyondUrl: url, roster: partyRoster };
  var blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Eritora Party.party';
  a.click();
  showToast('Party roster saved!');
}
function importParty(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      partyRoster = data.roster || [];
      partyNextId = Math.max.apply(null, partyRoster.map(function(m){ return m.id||0; }).concat([0])) + 1;
      var url = data.dndBeyondUrl || '';
      document.getElementById('partyDnDBeyondUrl').textContent = url || 'Not set';
      document.getElementById('partyDnDBeyondUrl').dataset.url = url;
      saveParty();
      renderPartyRoster();
      showToast('Party roster loaded: ' + partyRoster.length + ' members');
    } catch(err) { showToast('Error loading file: ' + err.message); }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ── Home Screen ──
var homeEncQueue = [];
var homePartyPresent = {};

function renderHomeParty() {
  homePartyPresent = {};
  partyRoster.forEach(function(m) { homePartyPresent[m.id] = !!m.present; });
  var list = document.getElementById('homePartyList');
  if (!list) return;
  list.innerHTML = '';
  if (!partyRoster.length) {
    list.innerHTML = '<div style="color:var(--text-dim);font-size:.8rem;font-style:italic;text-align:center;padding:10px;">No party members yet.<br>Add them in the Party tab after starting.</div>';
    return;
  }
  partyRoster.forEach(function(m) {
    var isPresent = homePartyPresent[m.id];
    var initStr = m.initiativeMod != null ? (m.initiativeMod >= 0 ? '+' : '') + m.initiativeMod : '+0';
    var row = document.createElement('div');
    row.className = 'home-party-row' + (isPresent ? ' present' : '');
    row.id = 'hpr-' + m.id;
    row.onclick = function() { var cb = document.getElementById('hpc-' + m.id); if (cb) { cb.checked = !cb.checked; homeToggleMember(m.id, cb.checked); } };
    row.innerHTML =
      '<input type="checkbox" id="hpc-' + m.id + '"' + (isPresent ? ' checked' : '') +
        ' onclick="event.stopPropagation()" onchange="homeToggleMember(' + m.id + ',this.checked)"' +
        ' style="accent-color:var(--green);width:15px;height:15px;cursor:pointer;flex-shrink:0;">' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-family:var(--font-heading);font-size:.78rem;letter-spacing:.3px;">' + m.name +
          (m.cls ? ' <span style="font-family:var(--font-body);font-size:.72rem;color:var(--text-dim);font-style:italic;">' + m.cls + '</span>' : '') +
        '</div>' +
        '<div style="font-family:var(--font-heading);font-size:.58rem;color:var(--text-dim);letter-spacing:.5px;text-transform:uppercase;display:flex;gap:7px;margin-top:1px;">' +
          (m.maxHP ? '<span>HP ' + m.maxHP + '</span>' : '') +
          (m.ac ? '<span>AC ' + m.ac + '</span>' : '') +
          '<span>Init ' + initStr + '</span>' +
        '</div>' +
      '</div>';
    list.appendChild(row);
  });
}

function homeToggleMember(id, checked) {
  homePartyPresent[id] = checked;
  var row = document.getElementById('hpr-' + id);
  if (row) row.classList.toggle('present', checked);
}

function homeToggleAll(state) {
  partyRoster.forEach(function(m) {
    homePartyPresent[m.id] = state;
    var cb = document.getElementById('hpc-' + m.id);
    if (cb) cb.checked = state;
    var row = document.getElementById('hpr-' + m.id);
    if (row) row.classList.toggle('present', state);
  });
}

function homeRenderQueue() {
  var empty = document.getElementById('homeEncEmpty');
  var list = document.getElementById('homeEncList');
  if (!list) return;
  list.querySelectorAll('.home-enc-row').forEach(function(r){ r.parentNode.removeChild(r); });
  if (!homeEncQueue.length) { if (empty) empty.style.display = ''; return; }
  if (empty) empty.style.display = 'none';
  homeEncQueue.forEach(function(item, i) {
    var combCount = item.data.combatants ? item.data.combatants.length : 0;
    var row = document.createElement('div');
    row.className = 'home-enc-row';
    row.innerHTML =
      '<span style="color:var(--purple);font-size:.85rem;">&#128220;</span>' +
      '<span style="font-family:var(--font-heading);font-size:.72rem;letter-spacing:.3px;flex:1;">' + (item.data.name || item.filename) + '</span>' +
      '<span style="font-family:var(--font-heading);font-size:.56px;color:var(--text-dim);white-space:nowrap;letter-spacing:.3px;text-transform:uppercase;">Rnd ' + (item.data.round||1) + ' &bull; ' + combCount + '</span>' +
      '<button onclick="homeRemoveEnc(' + i + ')" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:.85rem;padding:2px 4px;line-height:1;" title="Remove">&times;</button>';
    list.appendChild(row);
  });
}

function homeRemoveEnc(i) { homeEncQueue.splice(i, 1); homeRenderQueue(); }

function homeHandleFileSel(event) { homeHandleFiles(event.target.files); event.target.value = ''; }

function homeHandleFiles(files) {
  var arr = Array.prototype.slice.call(files);
  if (!arr.length) return;
  var pending = arr.length;
  arr.forEach(function(file) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var data = JSON.parse(ev.target.result);
        if (!data.name) data.name = file.name.replace(/\.encounter$/i,'').replace(/_/g,' ');
        homeEncQueue.push({ filename: file.name, data: data });
      } catch(err) { showToast('Could not read: ' + file.name); }
      pending--;
      if (pending === 0) homeRenderQueue();
    };
    reader.readAsText(file);
  });
}

function setupHomeDrop() {
  var zone = document.getElementById('homeDropZone');
  if (!zone) return;
  zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', function(){ zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', function(e){ e.preventDefault(); zone.classList.remove('drag-over'); homeHandleFiles(e.dataTransfer.files); });
}

function startSession() {
  partyRoster.forEach(function(m) { m.present = !!homePartyPresent[m.id]; });
  saveParty();
  renderPartyRoster();
  if (homeEncQueue.length) {
    encounters = [];
    nextId = 1;
    homeEncQueue.forEach(function(item) {
      var e = mkEncounter(item.data.name || 'Encounter');
      e.round = item.data.round || 1;
      e.currentTurn = 0;
      encounters.push(e);
    });
    activeIdx = 0; selectedId = null;
    homeEncQueue.forEach(function(item, i) {
      var e = encounters[i];
      (item.data.combatants || []).forEach(function(cd) {
        var c = mkCombatant(cd.name, cd.type, {
          initiative:cd.initiative, initiativeMod:cd.initiativeMod||0,
          maxHP:cd.maxHP, hp:cd.hp!=null?cd.hp:cd.maxHP, ac:cd.ac,
          conditions:cd.conditions||[], notes:cd.notes||'',
          spells:cd.spells||[], spellSlots:cd.spellSlots||{}, concentrating:cd.concentrating||''
        });
        c.isDead=!!cd.isDead; c.isKO=!!cd.isKO;
        if (cd.tempHP!=null) c.tempHP=cd.tempHP;
        if (cd.deathSaves) c.deathSaves=JSON.parse(JSON.stringify(cd.deathSaves));
        if (cd.stats) c.stats=JSON.parse(JSON.stringify(cd.stats));
        e.combatants.push(c);
      });
    });
    renderEncTabs();
    document.getElementById('roundNum').textContent = enc().round;
  }
  log('=== Session started ===', 'hi');
  var names = partyRoster.filter(function(m){ return m.present; }).map(function(m){ return m.name.split(',')[0]; });
  if (names.length) log('Players: ' + names.join(', '), 'hi');
  if (homeEncQueue.length) log('Loaded ' + homeEncQueue.length + ' encounter(s).', 'hi');
  document.getElementById('homeScreen').style.display = 'none';
  render();
  showToast('Session started' + (homeEncQueue.length ? ' \u2014 ' + homeEncQueue.length + ' encounter(s)' : ''));
}

function skipHome() { document.getElementById('homeScreen').style.display = 'none'; }

// ── Autosave ──
var _saveTimer = null;
function saveSession() {
  try {
    var payload = {
      encounters: encounters,
      activeIdx: activeIdx,
      nextId: nextId,
      ts: Date.now()
    };
    localStorage.setItem('eritora_session', JSON.stringify(payload));
  } catch(e) {}
}
function loadSession() {
  try {
    var raw = localStorage.getItem('eritora_session');
    if (!raw) return;
    var payload = JSON.parse(raw);
    if (!payload || !payload.encounters || !payload.encounters.length) return;
    var d = new Date(payload.ts);
    var ago = Math.round((Date.now() - payload.ts) / 60000);
    var agoStr = ago < 2 ? 'just now' : ago < 60 ? ago + ' min ago' : Math.round(ago/60) + 'h ago';
    var encNames = payload.encounters.map(function(e){ return e.name; }).join(', ');
    var meta = payload.encounters.length + ' encounter(s) \u2014 ' + encNames + ' \u2014 saved ' + agoStr;
    var banner = document.getElementById('resumeBanner');
    var bannerMeta = document.getElementById('resumeBannerMeta');
    if (banner) { bannerMeta.textContent = meta; banner.classList.add('show'); }
    window._pendingSession = payload;
  } catch(e) {}
}
function resumeSession() {
  var payload = window._pendingSession;
  if (!payload) return;
  encounters = payload.encounters;
  activeIdx = payload.activeIdx || 0;
  nextId = payload.nextId || 1;
  // Restore nextId counter from combatants
  encounters.forEach(function(e) {
    (e.combatants || []).forEach(function(c) {
      if (c.id >= nextId) nextId = c.id + 1;
    });
  });
  renderEncTabs();
  document.getElementById('roundNum').textContent = enc().round;
  document.getElementById('resumeBanner').classList.remove('show');
  document.getElementById('homeScreen').style.display = 'none';
  log('=== Session resumed ===', 'hi');
  render();
  showToast('Session resumed \u2014 ' + encounters.length + ' encounter(s)');
}
function discardSession() {
  localStorage.removeItem('eritora_session');
  window._pendingSession = null;
  document.getElementById('resumeBanner').classList.remove('show');
  showToast('Previous session discarded.');
}

// ── Panel Resize ──
function setupPanelResize() {
  var resizer = document.getElementById('panelResizer');
  var sidePanel = document.getElementById('sidePanel');
  if (!resizer || !sidePanel) return;
  // Restore saved width
  var saved = localStorage.getItem('eritora_panel_width');
  if (saved) sidePanel.style.width = parseInt(saved) + 'px';
  var startX, startW;
  resizer.addEventListener('mousedown', function(e) {
    e.preventDefault();
    startX = e.clientX;
    startW = sidePanel.offsetWidth;
    resizer.classList.add('dragging');
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', onDragEnd);
  });
  function onDrag(e) {
    var delta = startX - e.clientX; // dragging left = bigger panel
    var newW = Math.max(180, Math.min(600, startW + delta));
    sidePanel.style.width = newW + 'px';
  }
  function onDragEnd() {
    resizer.classList.remove('dragging');
    localStorage.setItem('eritora_panel_width', sidePanel.offsetWidth);
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', onDragEnd);
  }
}

// ── Interactive Home Screen ──
function spawnFireflies() {
  var hs = document.getElementById('homeScreen');
  if (!hs) return;
  var count = 22;
  for (var i = 0; i < count; i++) {
    (function() {
      var ff = document.createElement('div');
      ff.className = 'firefly';
      var size = 2 + Math.random() * 3.5;
      var startX = 5 + Math.random() * 90;   // % across screen
      var startY = 55 + Math.random() * 40;  // start in lower half
      var duration = 9 + Math.random() * 14; // 9–23s per cycle
      var delay = -(Math.random() * duration);// stagger so not all at once
      ff.style.cssText = [
        'width:' + size + 'px',
        'height:' + size + 'px',
        'left:' + startX + '%',
        'top:' + startY + '%',
        'animation-duration:' + duration + 's',
        'animation-delay:' + delay + 's'
      ].join(';');
      hs.appendChild(ff);
    })();
  }
}

function setupHomeParallax() {
  var hs = document.getElementById('homeScreen');
  if (!hs) return;
  var title = hs.querySelector('.home-title');
  var cols  = hs.querySelector('.home-cols');
  var orn   = hs.querySelector('.home-orn');
  hs.addEventListener('mousemove', function(e) {
    var rx = (e.clientX / (hs.offsetWidth  || window.innerWidth)  - 0.5);
    var ry = (e.clientY / (hs.offsetHeight || window.innerHeight) - 0.5);
    if (title) title.style.transform = 'translate(' + (-rx * 10) + 'px,' + (-ry * 6) + 'px)';
    if (cols)  cols.style.transform  = 'translate(' + (-rx * 5)  + 'px,' + (-ry * 3) + 'px)';
    if (orn)   orn.style.transform   = 'translate(' + (-rx * 14) + 'px,' + (-ry * 8) + 'px)';
  });
  hs.addEventListener('mouseleave', function() {
    if (title) title.style.transform = '';
    if (cols)  cols.style.transform  = '';
    if (orn)   orn.style.transform   = '';
  });
}

// ── Boot ──
init();
loadParty();
renderPartyRoster();
renderHomeParty();
setupHomeDrop();
setupInitDropZone();
setupPanelResize();
loadSession();
spawnFireflies();
setupHomeParallax();
