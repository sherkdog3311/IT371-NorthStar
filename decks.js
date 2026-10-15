/* Decks reference collection IDs; assignments reserve copies without changing ownership. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), ns = window.NorthStar;
  const form = $('deck-form'), addForm = $('deck-card-form');
  let decks = [], cards = [], selected = null, editing = null, ready = true;
  const say = (text, error = false) => { $('deck-status').textContent = text; $('deck-status').classList.toggle('error',error); };
  try { cards = ns.collection(); decks = ns.decks(); ns.assertAssignments(cards,decks); selected = decks[0]?.id || null; }
  catch(error) { ready = false; say(`${error.message} Changes are disabled to protect your saved data.`,true); }
  function save(next,message) {
    if (!ready) return false;
    try {
      const current = ns.collection(); ns.assertAssignments(current,next);
      localStorage.setItem(ns.decksKey,JSON.stringify(next)); cards=current; decks=next; render(); say(message); return true;
    } catch(error) { say(`The change was not saved. ${error.message}`,true); return false; }
  }
  function resetForm() {
    editing = null; form.reset(); $('deck-heading').textContent='Create a deck'; $('save-deck').textContent='Save deck'; $('cancel-deck').hidden=true;
  }
  function option(value,text) { const node = document.createElement('option'); node.value=value; node.textContent=text; return node; }
  function render() {
    $('deck-select').replaceChildren();
    if (!decks.some(d => d.id === selected)) selected = decks[0]?.id || null;
    for (const deck of decks) $('deck-select').append(option(deck.id,`${deck.name} (${deck.format})`));
    $('deck-select').value = selected || '';
    $('deck-select').disabled = !ready || !decks.length;
    const deck = decks.find(d => d.id === selected);
    $('deck-workspace').hidden = !deck;
    $('no-decks').hidden = !!deck;
    $('backup-decks').disabled = !ready || !decks.length;
    if (!deck) return;
    $('selected-deck-name').textContent=deck.name;
    $('deck-info').textContent=`Format: ${deck.format}. Commander: ${deck.commander || 'Not specified'}. Total assigned cards: ${deck.cards.reduce((sum,c) => sum+c.quantity,0)}.`;
    $('inventory-card').replaceChildren(option('','Choose a collection card'));
    for (const card of cards) {
      const available = card.quantity - ns.used(card.id,decks);
      const choice = option(card.id,`${card.name} — ${available} available of ${card.quantity} owned (${card.set || 'set not specified'})`);
      choice.disabled = available <= 0; $('inventory-card').append(choice);
    }
    $('inventory-empty').hidden=cards.length>0;
    $('assign-card').disabled=!ready || !cards.some(c => c.quantity > ns.used(c.id,decks));
    $('deck-rows').replaceChildren();
    for (const entry of deck.cards) {
      const card=cards.find(c => c.id===entry.cardId);
      const row=document.createElement('tr');
      for (const value of [card?.name || 'Missing collection card',card?.type || '',entry.quantity,card ? card.quantity-ns.used(card.id,decks) : 'Unknown']) {
        const cell=document.createElement('td'); cell.textContent=value; row.append(cell);
      }
      const action=document.createElement('td');
      const update=document.createElement('form'); update.className='quantity-update';
      const input=document.createElement('input'); input.type='number'; input.min=1; input.max=card ? card.quantity-ns.used(card.id,decks,deck.id) : 1;
      input.step=1; input.required=true; input.value=entry.quantity; input.setAttribute('aria-label',`Copies of ${card?.name || 'card'} in this deck`);
      const button=document.createElement('button'); button.type='submit'; button.textContent='Update'; button.setAttribute('aria-label',`Update ${card?.name || 'card'} quantity`);
      update.append(input,button);
      update.addEventListener('submit',event => {
        event.preventDefault(); if(!update.reportValidity()) return;
        const qty=Number(input.value); if(!Number.isSafeInteger(qty)) return;
        save(decks.map(d => d.id===deck.id ? {...d,cards:d.cards.map(c => c.cardId===entry.cardId ? {...c,quantity:qty} : c)} : d),'Deck quantity updated and saved.');
      });
      const remove=document.createElement('button'); remove.type='button'; remove.textContent='Remove'; remove.setAttribute('aria-label',`Remove ${card?.name || 'card'} from deck`);
      remove.addEventListener('click',() => save(decks.map(d => d.id===deck.id ? {...d,cards:d.cards.filter(c => c.cardId!==entry.cardId)} : d),'Card removed from deck. Copies are available again.'));
      action.append(update,remove);row.append(action);$('deck-rows').append(row);
    }
    $('deck-empty').hidden=deck.cards.length>0;
  }
  form.addEventListener('submit',event => {
    event.preventDefault(); if(!ready || !form.reportValidity()) return;
    const name=$('deck-name').value.trim(), format=$('deck-format').value, commander=$('deck-commander').value.trim();
    if(!name) {say('Enter a deck name.',true);return;}
    const id=editing || crypto.randomUUID(); const current=decks.find(d => d.id===id);
    const deck={id,name,format,commander,cards:current?.cards || []};
    const next=editing ? decks.map(d => d.id===id ? deck : d) : [...decks,deck];
    const oldSelection=selected; selected=id;
    if(save(next,`${name} saved in this browser.`)) {resetForm();$('deck-select').focus();} else selected=oldSelection;
  });
  $('cancel-deck').addEventListener('click',() => {resetForm();say('Edit canceled.');});
  $('deck-select').addEventListener('change',() => {selected=$('deck-select').value;resetForm();render();});
  $('edit-deck').addEventListener('click',() => {
    const deck=decks.find(d => d.id===selected); if(!deck) return;
    editing=deck.id; $('deck-name').value=deck.name; $('deck-format').value=deck.format; $('deck-commander').value=deck.commander;
    $('deck-heading').textContent='Edit deck details';$('save-deck').textContent='Save changes';$('cancel-deck').hidden=false;$('deck-name').focus();
  });
  $('delete-deck').addEventListener('click',() => {
    const deck=decks.find(d => d.id===selected);
    if(deck && confirm(`Delete ${deck.name}? Its cards remain owned in your collection and become available again.`)) {
      if(save(decks.filter(d => d.id!==deck.id),'Deck deleted. Collection ownership is unchanged.'))resetForm();
    }
  });
  addForm.addEventListener('submit',event => {
    event.preventDefault();if(!ready || !addForm.reportValidity())return;
    const cardId=$('inventory-card').value, qty=Number($('assign-quantity').value);
    const card=cards.find(c => c.id===cardId), deck=decks.find(d => d.id===selected);
    if(!card || !deck || !Number.isSafeInteger(qty) || qty<1) return;
    if(qty > card.quantity-ns.used(cardId,decks)) {say('Not enough available copies. Reduce the quantity or update your collection.',true);return;}
    const found=deck.cards.find(c => c.cardId===cardId);
    const entries=found ? deck.cards.map(c => c.cardId===cardId ? {...c,quantity:c.quantity+qty} : c) : [...deck.cards,{cardId,quantity:qty}];
    if(save(decks.map(d => d.id===deck.id ? {...d,cards:entries} : d),`${qty} copies of ${card.name} assigned and saved.`)) addForm.reset();
  });
  $('backup-decks').addEventListener('click',() => {
    const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,decks},null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='northstar-decks-backup.json';a.click();setTimeout(() => URL.revokeObjectURL(url),1000);
    say('Deck backup downloaded. Keep your collection backup too; decks reference its card entries.');
  });
  $('restore-decks').addEventListener('change',async event => {
    const file=event.target.files[0];if(!file || !ready)return;
    try {
      if(file.size>5000000)throw Error('Backup is too large.');
      const backup=JSON.parse(await file.text()); if(backup.version!==1 || !Array.isArray(backup.decks))throw Error('Invalid deck backup.');
      ns.assertAssignments(ns.collection(),backup.decks);
      if(confirm(`Replace your decks with ${backup.decks.length} decks from this backup?`)) if(save(backup.decks,'Deck backup restored.'))resetForm();
    }catch(error){say(`Backup was not restored. ${error.message} Restore the matching collection first if needed.`,true);}
    event.target.value='';
  });
  function disable() {
    ready=false;for(const node of document.querySelectorAll('#deck-manager input, #deck-manager select, #deck-manager button'))node.disabled=true;
  }
  render();if(!ready)disable();
  window.addEventListener('storage',event => {
    if([ns.collectionKey,ns.decksKey,null].includes(event.key)) {disable();say('Collection or deck data changed in another tab. Reload before continuing.',true);}
  });
})();
