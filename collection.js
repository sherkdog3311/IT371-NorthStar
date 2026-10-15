/* NorthStar personal collection, stored only in this browser. */
(() => {
  'use strict';
  const KEY = 'northstar.collection.v1';
  const $ = id => document.getElementById(id);
  const form = $('card-form'), rows = $('collection-results');
  let cards = [], editing = null, ready = true;
  const ns = window.NorthStar; let deckData = [];
  const fields = ['name', 'set', 'type', 'color', 'rarity', 'condition', 'quantity', 'location'];
  const announce = (message, error = false) => {
    $('collection-status').textContent = message;
    $('collection-status').classList.toggle('error', error);
  };
  function valid(card) {
    return card && typeof card.id === 'string' && card.id.length > 0 &&
      fields.filter(f => f !== 'quantity').every(f => typeof card[f] === 'string' && card[f].length <= 200) &&
      card.name.trim() && card.type.trim() && card.color.trim() &&
      Number.isSafeInteger(card.quantity) && card.quantity > 0 && card.quantity <= 999999;
  }
  try {
    const saved = localStorage.getItem(KEY);
    if (saved !== null) {
      cards = JSON.parse(saved);
      if (!Array.isArray(cards) || !cards.every(valid) || new Set(cards.map(c => c.id)).size !== cards.length) throw new Error('Invalid collection');
    }
  } catch {
    cards = []; ready = false;
    announce('Your saved collection could not be read. Changes are disabled to protect existing data. Try the browser where you saved your collection, or restore a browser backup.', true);
  }
  try { deckData = ns.decks(); ns.assertAssignments(cards, deckData); }
  catch (error) { ready = false; announce(`${error.message} Changes are disabled to protect saved data.`, true); }
  function persist(next, message) {
    if (!ready) return false;
    try { ns.assertAssignments(next, ns.decks()); localStorage.setItem(KEY, JSON.stringify(next)); }
    catch (error) { announce(`The change was not saved. ${error.message} Your current collection is unchanged.`, true); return false; }
    cards = next; render(); announce(message); return true;
  }
  function resetEditor() {
    editing = null; form.reset(); $('quantity').value = 1;
    $('editor-title').textContent = 'Add a card'; $('save-card').textContent = 'Save card'; $('cancel-edit').hidden = true;
  }
  function render() {
    rows.replaceChildren();
    const name = $('collection-search').value.trim().toLowerCase();
    const color = $('collection-color').value, type = $('collection-type').value;
    const visible = cards.filter(c => c.name.toLowerCase().includes(name) &&
      (!color || c.color.toLowerCase().split(/[\s/,]+/).includes(color)) &&
      (!type || c.type.toLowerCase().includes(type)));
    for (const card of visible) {
      const row = document.createElement('tr');
      for (const field of fields) { const cell = document.createElement('td'); cell.textContent = card[field] || 'Not specified'; row.append(cell); }
      for (const value of [ns.used(card.id, deckData), card.quantity - ns.used(card.id, deckData)]) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
      const actions = document.createElement('td');
      for (const action of ['Edit', 'Delete']) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = action;
        button.setAttribute('aria-label', `${action} ${card.name}`);
        button.addEventListener('click', () => {
          if (action === 'Edit') {
            editing = card.id; for (const field of fields) $(field).value = card[field];
            $('editor-title').textContent = 'Edit a card'; $('save-card').textContent = 'Save changes'; $('cancel-edit').hidden = false;
            $('name').focus(); announce(`Editing ${card.name}.`);
          } else if (confirm(`Delete ${card.name} (${card.quantity} copies) from your collection?`)) {
            if (persist(cards.filter(c => c.id !== card.id), `${card.name} deleted.`)) {
              if (editing === card.id) resetEditor(); $('collection-search').focus();
            }
          }
        }); actions.append(button);
      }
      row.append(actions); rows.append(row);
    }
    $('result-count').textContent = `Showing ${visible.length} of ${cards.length} entries. Total cards owned: ${cards.reduce((sum, c) => sum + c.quantity, 0)}.`;
    $('empty-message').hidden = visible.length > 0;
    $('empty-message').textContent = cards.length ? 'No cards match. Try another search or clear the filters.' : 'Your collection is empty. Add your first card above.';
    $('export-cards').disabled = !cards.length || !ready;
  }
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!form.reportValidity() || !ready) return;
    const card = {id: editing || crypto.randomUUID()};
    for (const field of fields) card[field] = field === 'quantity' ? Number($(field).value) : $(field).value.trim();
    if (!valid(card)) { announce('Enter a card name, type, color, and a whole-number quantity from 1 to 999999. Text fields must be no longer than 200 characters.', true); return; }
    const next = editing ? cards.map(c => c.id === editing ? card : c) : [...cards, card];
    if (persist(next, `${card.name} ${editing ? 'updated' : 'added'} and saved in this browser.`)) { resetEditor(); $('name').focus(); }
  });
  $('cancel-edit').addEventListener('click', () => { resetEditor(); announce('Edit canceled.'); });
  for (const id of ['collection-search', 'collection-color', 'collection-type']) $(id).addEventListener('input', render);
  $('clear-filters').addEventListener('click', () => {
    for (const id of ['collection-search', 'collection-color', 'collection-type']) $(id).value = ''; render();
  });
  $('export-cards').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({version: 1, cards}, null, 2)], {type: 'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'northstar-collection-backup.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); announce('Collection backup downloaded. Keep it in a safe place.');
  });
  $('import-cards').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file || !ready) return;
    try {
      if (file.size > 5000000) throw new Error('Too large');
      const backup = JSON.parse(await file.text());
      if (backup.version !== 1 || !Array.isArray(backup.cards) || !backup.cards.every(valid) || new Set(backup.cards.map(c => c.id)).size !== backup.cards.length) throw new Error('Invalid backup');
      if (confirm(`Replace your current collection with ${backup.cards.length} entries from this backup? Download your current backup first if needed.`)) {
        if (persist(backup.cards, 'Backup restored and saved in this browser.')) resetEditor();
      }
    } catch { announce('That file is not a valid NorthStar collection backup. Your collection was not changed.', true); }
    event.target.value = '';
  });
  // Avoid silent overwrites if this collection is open in two tabs.
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === ns.decksKey || event.key === null) {
      ready = false; for (const control of form.elements) control.disabled = true;
      $('import-cards').disabled = true; $('export-cards').disabled = true;
      announce('Your collection changed in another tab. Reload this page before making further changes.', true);
    }
  });
  if (!ready) { for (const control of form.elements) control.disabled = true; $('import-cards').disabled = true; }
  render();
})();
