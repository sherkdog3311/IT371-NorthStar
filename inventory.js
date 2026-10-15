/* Shared storage and ownership checks for NorthStar collection and decks. */
window.NorthStar = (() => {
  'use strict';
  const collectionKey = 'northstar.collection.v1', decksKey = 'northstar.decks.v1';
  const text = value => typeof value === 'string' && value.length <= 200;
  const quantity = value => Number.isSafeInteger(value) && value > 0 && value <= 999999;
  const unique = values => new Set(values).size === values.length;
  function read(key) { const raw = localStorage.getItem(key); return raw === null ? [] : JSON.parse(raw); }
  function collection() {
    const cards = read(collectionKey);
    if (!Array.isArray(cards) || !cards.every(c => c && text(c.id) && c.id &&
      ['name','set','type','color','rarity','condition','location'].every(f => text(c[f])) &&
      c.name.trim() && c.type.trim() && c.color.trim() && quantity(c.quantity)) || !unique(cards.map(c => c.id))) throw Error('Saved collection could not be read.');
    return cards;
  }
  function decks() {
    const items = read(decksKey);
    validateDecks(items); return items;
  }
  function validateDecks(items) {
    if (!Array.isArray(items) || !items.every(d => d && text(d.id) && d.id && text(d.name) && d.name.trim() &&
      text(d.format) && d.format.trim() && text(d.commander) && Array.isArray(d.cards) &&
      d.cards.every(c => c && text(c.cardId) && c.cardId && quantity(c.quantity)) && unique(d.cards.map(c => c.cardId))) || !unique(items.map(d => d.id))) throw Error('Saved deck data or backup is invalid.');
  }
  function used(cardId, items, exceptId = null) {
    return items.filter(d => d.id !== exceptId).reduce((total,d) => total + d.cards.filter(c => c.cardId === cardId).reduce((sum,c) => sum + c.quantity,0),0);
  }
  function assertAssignments(cards, items) {
    validateDecks(items);
    for (const deck of items) for (const entry of deck.cards) {
      const card = cards.find(c => c.id === entry.cardId);
      if (!card) throw Error('A card is assigned to a deck. Remove it from all decks before deleting it or restoring a different collection.');
      if (used(card.id, items) > card.quantity) throw Error(`${card.name} has ${used(card.id, items)} copies assigned to decks. Remove assignments before lowering its owned quantity.`);
    }
  }
  return {collectionKey, decksKey, collection, decks, used, assertAssignments};
})();
