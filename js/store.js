'use strict';
const Store = (() => {
  const CART_KEY = 'motty_cart', WISH_KEY = 'motty_wish', ORDERS_KEY = 'motty_orders';
  function getCart(){ try{return JSON.parse(localStorage.getItem(CART_KEY))||[];}catch{return[];} }
  function saveCart(c){ localStorage.setItem(CART_KEY,JSON.stringify(c)); _emit('cart'); }
  function addToCart(productId, option=''){
    const cart=getCart(), key=productId+(option?':'+option:''), ex=cart.find(i=>i.key===key);
    if(ex){ ex.qty++; } else {
      const p=((window.MOTTY_REMOTE_PRODUCTS&&window.MOTTY_REMOTE_PRODUCTS.length)?window.MOTTY_REMOTE_PRODUCTS:MOTTY_PRODUCTS).find(p=>p.id===productId); if(!p) return;
      cart.push({key,id:productId,option,qty:1});
    }
    saveCart(cart); showToast(t('added_cart'));
  }
  function removeFromCart(key){ saveCart(getCart().filter(i=>i.key!==key)); }
  function updateQty(key,qty){
    const cart=getCart(), item=cart.find(i=>i.key===key); if(!item) return;
    if(qty<1){ removeFromCart(key); return; }
    item.qty=qty; saveCart(cart);
  }
  function clearCart(){ saveCart([]); }
  function getCartTotal(){ return getCart().reduce((s,i)=>{ const p=((window.MOTTY_REMOTE_PRODUCTS&&window.MOTTY_REMOTE_PRODUCTS.length)?window.MOTTY_REMOTE_PRODUCTS:MOTTY_PRODUCTS).find(p=>p.id===i.id); return s+(p?p.price*i.qty:0); },0); }
  function getCartCount(){ return getCart().reduce((s,i)=>s+i.qty,0); }
  function getCartItems(){ return getCart().map(i=>{ const p=((window.MOTTY_REMOTE_PRODUCTS&&window.MOTTY_REMOTE_PRODUCTS.length)?window.MOTTY_REMOTE_PRODUCTS:MOTTY_PRODUCTS).find(p=>p.id===i.id); return{...i,product:p}; }).filter(i=>i.product); }

  function getWish(){ try{return JSON.parse(localStorage.getItem(WISH_KEY))||[];}catch{return[];} }
  function toggleWish(id){
    const wish=getWish(), idx=wish.indexOf(id);
    if(idx>=0) wish.splice(idx,1); else wish.push(id);
    localStorage.setItem(WISH_KEY,JSON.stringify(wish)); _emit('wish');
    return idx<0;
  }
  function isWished(id){ return getWish().includes(id); }
  function getWishItems(){ return getWish().map(id=>((window.MOTTY_REMOTE_PRODUCTS&&window.MOTTY_REMOTE_PRODUCTS.length)?window.MOTTY_REMOTE_PRODUCTS:MOTTY_PRODUCTS).find(p=>p.id===id)).filter(Boolean); }

  function getOrders(){ return window.MOTTY_DB_ORDERS || []; }
  function saveOrder(o){ const orders=getOrders(); o.id='ORD-'+Date.now(); o.date=new Date().toISOString(); o.status='new'; orders.unshift(o); localStorage.setItem(ORDERS_KEY,JSON.stringify(orders)); return o; }
  async function updateOrderStatus(id,status){ await MottyDB.updateOrder(id,status); window.MOTTY_DB_ORDERS=MottyDB.orders(); }

  async function sendToTelegram(order){
    const {tgToken,tgChat}=MOTTY_SETTINGS; if(!tgToken||!tgChat) return false;
    const del=MOTTY_SETTINGS.delivery.find(d=>d.id===order.delivery), pay=MOTTY_SETTINGS.payment.find(p=>p.id===order.payment);
    const items=order.items.map(i=>`• ${i.product.title}${i.option?' ('+i.option+')':''} × ${i.qty} = ${(i.product.price*i.qty).toLocaleString()} ₴`).join('\n');
    const text=[`🎁 *Нове замовлення ${order.id}*`,``,`👤 *Покупець:* ${order.name}`,`📞 *Телефон:* ${order.phone}`,order.telegram?`✈️ *Telegram:* @${order.telegram}`:'',``,`📦 *Доставка:* ${del?.name||order.delivery}`,order.city?`🏙 *Місто:* ${order.city}`:'',order.warehouse?`📍 *Відділення:* ${order.warehouse}`:'',order.address?`🏠 *Адреса:* ${order.address}`:'',``,`💳 *Оплата:* ${pay?.name||order.payment}`,``,`🛍 *Товари:*\n${items}`,``,`💰 *Разом: ${order.total.toLocaleString()} ₴*`,order.comment?`\n💬 *Коментар:* ${order.comment}`:''].filter(Boolean).join('\n');
    try{ const r=await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:tgChat,text,parse_mode:'Markdown'})}); return r.ok; }catch{ return false; }
  }
  async function sendToSheets(order){
    const url=MOTTY_SETTINGS.sheetsUrl; if(!url) return false;
    const del=MOTTY_SETTINGS.delivery.find(d=>d.id===order.delivery), pay=MOTTY_SETTINGS.payment.find(p=>p.id===order.payment);
    const payload={id:order.id,date:order.date,name:order.name,phone:order.phone,telegram:order.telegram||'',itemsText:order.items.map(i=>`${i.product.title}${i.option?' ('+i.option+')':''} ×${i.qty}`).join('; '),total:order.total,delivery:del?.name||order.delivery,city:order.city||'',warehouse:order.warehouse||order.address||'',payment:pay?.name||order.payment,comment:order.comment||''};
    try{ await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); return true; }catch{ return false; }
  }
  async function submitOrder(order){
    const saved=await MottyDB.createOrder(order);
    return {order:saved};
  }

  const _l={};
  function _emit(e){ (_l[e]||[]).forEach(f=>f()); }
  function on(e,f){ if(!_l[e]) _l[e]=[]; _l[e].push(f); }
  return { getCart,addToCart,removeFromCart,updateQty,clearCart,getCartTotal,getCartCount,getCartItems, getWish,toggleWish,isWished,getWishItems, getOrders,saveOrder,updateOrderStatus,sendToTelegram,sendToSheets,submitOrder, on };
})();

function showToast(msg,dur=2500){
  let el=document.getElementById('toast');
  if(!el){ el=document.createElement('div'); el.id='toast'; el.className='toast'; document.body.appendChild(el); }
  el.textContent=msg; el.classList.add('show'); clearTimeout(el._t);
  el._t=setTimeout(()=>el.classList.remove('show'),dur);
}
function fmt(n){ return Number(n).toLocaleString('uk-UA')+' ₴'; }
function catName(id){ const c=MOTTY_CATEGORIES.find(c=>c.id===id); return c?c.name:id; }
function badgeHtml(p){
  if(!p.badge&&!p.old) return '';
  let b='';
  if(p.badge==='hit') b+=`<span class="badge badge-hit">${currentLang==='en'?'Hit':'Хіт'}</span>`;
  if(p.badge==='new') b+=`<span class="badge badge-new">${currentLang==='en'?'New':'Нове'}</span>`;
  if(p.old>0){
    const disc=Math.round((1-p.price/p.old)*100);
    b+=`<span class="badge badge-sale">-${disc}%</span>`;
  }
  return b;
}
