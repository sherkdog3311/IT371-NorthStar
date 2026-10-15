/* Live, single-card lookup. No API key or inventory changes are required. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const form=$('card-lookup'), button=$('lookup-button'), results=$('live-card-result');
  let busy=false, nextRequest=0;
  const colors={W:'White',U:'Blue',B:'Black',R:'Red',G:'Green'};
  const formats={standard:'Standard',modern:'Modern',commander:'Commander',vintage:'Vintage',legacy:'Legacy',pioneer:'Pioneer',pauper:'Pauper',duel:'Duel Commander',brawl:'Brawl',standardbrawl:'Standard Brawl',paupercommander:'Pauper Commander'};
  const states={legal:'Legal',not_legal:'Not legal',banned:'Banned',restricted:'Restricted'};
  const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  function status(text,error=false){$('lookup-status').textContent=text;$('lookup-status').classList.toggle('lookup-error',error);}
  function safeURL(value,host){try{const u=new URL(value);return u.protocol==='https:' && u.hostname===host ? u.href : null;}catch{return null;}}
  function showCard(card){
    results.replaceChildren();results.hidden=false;
    results.append(node('h2',card.name));
    const layout=node('div');layout.className='live-card-layout';
    const gallery=node('div');gallery.className='card-gallery';
    const faces=card.image_uris ? [{name:card.name,image_uris:card.image_uris,artist:card.artist}] : (card.card_faces || []);
    for(const face of faces){
      const imageURL=safeURL(face.image_uris?.normal,'cards.scryfall.io');
      if(!imageURL)continue;
      const figure=node('figure'), image=node('img');image.src=imageURL;image.alt=`${face.name} card image`;image.loading='lazy';image.width=488;image.height=680;
      image.addEventListener('error',()=>{image.hidden=true;figure.prepend(node('p','Card image could not load.'));});
      figure.append(image,node('figcaption',`${face.name} — Artist: ${face.artist || card.artist || 'Not listed'}`));
      const large=safeURL(face.image_uris?.large,'cards.scryfall.io');
      if(large){const link=node('a','Open larger image');link.href=large;link.target='_blank';link.rel='noopener noreferrer';figure.append(link);}
      gallery.append(figure);
    }
    if(!gallery.children.length)gallery.append(node('p','No card image is available.'));
    const details=node('div'), list=node('dl');
    const cardColors=card.colors || [...new Set((card.card_faces||[]).flatMap(f=>f.colors || []))];
    for(const [label,value] of [['Set / printing shown',card.set_name],['Type',card.type_line],['Mana cost',card.mana_cost || (card.card_faces||[]).map(f=>f.mana_cost||'').join(' / ') || 'None'],['Colors',cardColors.length?cardColors.map(c=>colors[c]||c).join(' / '):'Colorless'],['Rarity',card.rarity],['Collector number',card.collector_number]]){
      list.append(node('dt',label),node('dd',value || 'Not listed'));
    }
    details.append(list);
    const rules=node('p',card.oracle_text || (card.card_faces||[]).map(f=>`${f.name}\n${f.oracle_text || ''}`).join('\n\n'));rules.className='oracle-text';details.append(node('h3','Card rules'),rules);
    const uri=safeURL(card.scryfall_uri,'scryfall.com');if(uri){const link=node('a','View card and other printings on Scryfall');link.href=uri;link.target='_blank';link.rel='noopener noreferrer';details.append(link);}
    layout.append(gallery,details);results.append(layout,node('h3','Format legality'));
    results.append(node('p','Legal means the card is permitted in that format. Restricted means a limited number of copies are allowed. These statuses do not verify your entire deck, commander eligibility, or color identity.'));
    const grid=node('div');grid.className='legality-grid';
    const legality = card.legalities || {};
    const ordered = [...new Set(['commander','standard','modern','pioneer','legacy','vintage','pauper',...Object.keys(legality)])];
    for(const format of ordered){
      if (!(format in legality)) continue;
      const state = legality[format];
      const item=node('div');item.className='legality-item';item.append(node('strong',formats[format]||format.replace(/_/g,' ').replace(/^./,c=>c.toUpperCase())),node('span',states[state]||'Unknown'));grid.append(item);
    }
    results.append(grid,node('p',`Retrieved from Scryfall: ${new Date().toLocaleString()}. Legality can change; look up the card again for refreshed data.`));
  }
  async function lookup(name){
    if(busy)return;
    name=name.trim();if(!name){status('Enter a card name.',true);return;}
    if(Date.now()<nextRequest){status(`Please wait ${Math.ceil((nextRequest-Date.now())/1000)} seconds before another lookup.`,true);return;}
    busy=true;button.disabled=true;results.hidden=true;status(`Looking up ${name}…`);
    const abort=new AbortController(), timeout=setTimeout(()=>abort.abort(),15000);
    try{
      const response=await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,{headers:{Accept:'application/json'},signal:abort.signal});
      if(response.status===429){nextRequest=Date.now()+30000;throw Error('Scryfall is receiving too many requests. Wait 30 seconds and try again.');}
      const card=await response.json();
      if(!response.ok)throw Error(response.status===404 ? 'No unique card matched. Enter a more complete card name and try again.' : 'The card service is unavailable. Please try again later.');
      if(card.object!=='card' || typeof card.name!=='string')throw Error('The service returned an unexpected response.');
      showCard(card);status(`Found ${card.name}. Image, card details, and format legality are shown below.`);
    }catch(error){status(error.name==='AbortError' ? 'The lookup timed out. Check your connection and try again.' : error.message==='Failed to fetch' ? 'Unable to reach Scryfall. Check your internet connection and try again.' : error.message,true);}
    finally{clearTimeout(timeout);nextRequest=Math.max(nextRequest,Date.now()+600);busy=false;button.disabled=false;}
  }
  form.addEventListener('submit',event=>{event.preventDefault();if(form.reportValidity())lookup($('lookup-name').value);});
  for(const quick of document.querySelectorAll('[data-lookup-name]'))quick.addEventListener('click',()=>{$('lookup-name').value=quick.dataset.lookupName;lookup(quick.dataset.lookupName);});
})();
