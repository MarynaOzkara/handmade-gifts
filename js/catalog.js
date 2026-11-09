'use strict';
const Catalog = (() => {
  let currentCat='all', currentSort='pop', filterInStock=false, filterSale=false;
  let priceMin=0, priceMax=99999, currentModal=null;

  function init(){
    _initPriceRange();
    renderSidebar();
    renderProducts();
    initModal();
    initCart();
    initWish();
    initReveal();
    initNav();
    Store.on('cart', updateCartBadge);
    Store.on('wish', updateWishBadge);
    updateCartBadge(); updateWishBadge();
  }

  // ── Sidebar ──
  function renderSidebar(){
    const wrap = document.getElementById('catFilters');
    if(!wrap) return;
    const catKeyMap={all:'cat_all',decor:'cat_decor',jewelry:'cat_jewelry',figures:'cat_figures',holidays:'cat_holidays',print3d:'cat_print3d',personal:'cat_personal'};
    wrap.innerHTML = MOTTY_CATEGORIES.map(c => {
      const ALL2=_allProds(); const count = c.id==='all' ? ALL2.length : ALL2.filter(p=>p.cat===c.id).length;
      const label = (typeof t==='function' && catKeyMap[c.id]) ? t(catKeyMap[c.id]) : c.name;
      return `<div class="cat-filter-item ${c.id===currentCat?'active':''}" onclick="Catalog.setCat('${c.id}')">
        <span>${label}</span><span>${count}</span>
      </div>`;
    }).join('');
  }

  function _initPriceRange(){
    const prices = _allProds().map(p=>p.price);
    priceMin = Math.min(...prices); priceMax = Math.max(...prices);
    const mn=document.getElementById('priceMin'), mx=document.getElementById('priceMax');
    if(mn){ mn.value=priceMin; mn.min=priceMin; mn.max=priceMax; }
    if(mx){ mx.value=priceMax; mx.min=priceMin; mx.max=priceMax; }
  }

  function setCat(cat){ currentCat=cat; renderSidebar(); renderProducts(); }
  function setSort(v){ currentSort=v; renderProducts(); }
  function setInStock(v){ filterInStock=v; renderProducts(); }
  function setSale(v){ filterSale=v; renderProducts(); }
  function setPriceMin(v){ priceMin=+v||0; renderProducts(); }
  function setPriceMax(v){ priceMax=+v||99999; renderProducts(); }
  function resetFilters(){
    currentCat='all'; currentSort='pop'; filterInStock=false; filterSale=false;
    _initPriceRange();
    const is=document.getElementById('toggleInStock'), os=document.getElementById('toggleSale');
    if(is) is.checked=false; if(os) os.checked=false;
    renderSidebar(); renderProducts();
  }

  function _getCustomProds(){ return window.MOTTY_REMOTE_PRODUCTS || []; }
  function _allProds(){ const remote=_getCustomProds(); return remote.length ? remote : MOTTY_PRODUCTS; }
  function _getFiltered(){
    const ALL=_allProds();
    let list = currentCat==='all' ? [...ALL] : ALL.filter(p=>p.cat===currentCat);
    if(filterInStock) list=list.filter(p=>p.stock==='in');
    if(filterSale) list=list.filter(p=>p.old>0);
    list=list.filter(p=>p.price>=priceMin && p.price<=priceMax);
    if(currentSort==='pop')  list.sort((a,b)=>b.reviews-a.reviews);
    if(currentSort==='new')  list.sort((a,b)=>(b.badge==='new'?1:0)-(a.badge==='new'?1:0));
    if(currentSort==='asc')  list.sort((a,b)=>a.price-b.price);
    if(currentSort==='desc') list.sort((a,b)=>b.price-a.price);
    if(currentSort==='sale') list.sort((a,b)=>((b.old-b.price)/b.old||0)-((a.old-a.price)/a.old||0));
    return list;
  }

  function renderProducts(){
    const grid=document.getElementById('productsGrid');
    const titleEl=document.getElementById('catalogTitle');
    const countEl=document.getElementById('catalogCount');
    const activeFilters=document.getElementById('activeFilters');
    if(!grid) return;

    const list=_getFiltered();
    if(titleEl) titleEl.textContent = currentCat==='all' ? t('catalog_title') : MOTTY_CATEGORIES.find(c=>c.id===currentCat)?.name||'';
    if(countEl) countEl.textContent = list.length + (currentLang==='en' ? ` item${list.length!==1?'s':''}` : ` товар${list.length===1?'':list.length<5?'и':'ів'}`);

    // Active filter chips
    if(activeFilters){
      let chips='';
      if(currentCat!=='all'){ const cn=MOTTY_CATEGORIES.find(c=>c.id===currentCat)?.name||''; chips+=`<div class="filter-chip">${cn}<button onclick="Catalog.setCat('all')">×</button></div>`; }
      if(filterInStock) chips+=`<div class="filter-chip">${t('in_stock')}<button onclick="Catalog.setInStock(false);document.getElementById('toggleInStock').checked=false">×</button></div>`;
      if(filterSale) chips+=`<div class="filter-chip">${t('on_sale')}<button onclick="Catalog.setSale(false);document.getElementById('toggleSale').checked=false">×</button></div>`;
      activeFilters.innerHTML=chips;
    }

    if(!list.length){
      grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><h3>Нічого не знайдено</h3><p>Спробуйте інші фільтри</p></div>`;
      return;
    }
    grid.innerHTML=list.map(p=>_cardHtml(p)).join('');
  }

  function _cardHtml(p){
    const wished=Store.isWished(p.id);
    const disc=p.old>0?Math.round((1-p.price/p.old)*100):0;
    const stockHtml = p.stock==='in'
      ? `<div class="card-stock in">● ${t('in_stock_label')}</div>`
      : `<div class="card-stock order">● ${t('order_label')}</div>`;
    return `<div class="product-card reveal-scale" onclick="Catalog.openModal('${p.id}')">
      <div class="card-img">
        <img src="${p.images[0]}" alt="${p.title}" loading="lazy">
        <div class="card-badge">${badgeHtml(p)}</div>
        <button class="card-wish ${wished?'active':''}" onclick="event.stopPropagation();Catalog.toggleWish('${p.id}',this)" aria-label="Wishlist">
          <svg width="15" height="15" fill="${wished?'var(--acc)':'none'}" stroke="var(--acc)" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
      <div class="card-body">
        <div class="card-cat">${catName(p.cat)}</div>
        <div class="card-title">${currentLang==='en'?(p.title_en||t(p.id+'_title')!==p.id+'_title'?t(p.id+'_title'):p.title):p.title}</div>
        <div class="card-short">${currentLang==='en'?(p.short_en||(t(p.id+'_short')!==p.id+'_short'?t(p.id+'_short'):p.short)):p.short}</div>
        ${stockHtml}
        <div class="card-footer" style="margin-top:10px">
          <div class="card-prices">
            <span class="card-price">${fmt(p.price)}</span>
            ${p.old?`<span class="card-old">${fmt(p.old)}</span><span class="card-discount">-${disc}%</span>`:''}
          </div>
          <button class="card-add" onclick="event.stopPropagation();Catalog.quickAdd('${p.id}')" aria-label="${t('add_to_cart')}">
            <svg width="15" height="15" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  }

  function quickAdd(id){
    const p=_allProds().find(p=>p.id===id); if(!p) return;
    if(p.options&&p.options.length) { openModal(id); return; }
    Store.addToCart(id); openCartDrawer();
  }
  function toggleWish(id,btn){
    const added=Store.toggleWish(id);
    const svg=btn.querySelector('svg');
    svg.setAttribute('fill', added?'var(--acc)':'none');
    btn.classList.toggle('active', added);
    showToast(added?t('add_to_wish'):t('remove_wish'));
    updateWishBadge();
  }

  // ── Modal ──
  function initModal(){
    const ov=document.getElementById('modalOverlay'); if(!ov) return;
    ov.addEventListener('click',e=>{ if(e.target===ov) closeModal(); });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });
  }
  function openModal(id){
    const p=_allProds().find(p=>p.id===id); if(!p) return;
    currentModal=p;
    const disc=p.old>0?Math.round((1-p.price/p.old)*100):0;
    _set('modalImg',p.images[0],'src');
    _set('modalCat',catName(p.cat));
    _set('modalTitle', currentLang==='en'?(p.title_en||(t(p.id+'_title')!==p.id+'_title'?t(p.id+'_title'):p.title)):p.title);
    _set('modalDesc', currentLang==='en'?(p.desc_en||(t(p.id+'_desc')!==p.id+'_desc'?t(p.id+'_desc'):p.desc)):p.desc);
    _set('modalSpecs',p.specs.replace(/\\n/g,'<br>'),'html');
    _set('modalPrice',fmt(p.price));
    _set('modalOld',p.old?fmt(p.old):'');
    _set('modalDiscount',disc?`-${disc}%`:'');
    const stars=Math.round(p.rating); _set('modalStars','★'.repeat(stars)+'☆'.repeat(5-stars));
    _set('modalReviews',`${p.reviews} відгук${p.reviews===1?'':p.reviews<5?'и':'ів'}`);
    const th=document.getElementById('modalThumbs');
    if(th) th.innerHTML=p.images.map((s,i)=>`<div class="modal-thumb ${i===0?'active':''}" onclick="Catalog.setThumb(this,'${s}')"><img src="${s}" alt=""></div>`).join('');
    const ow=document.getElementById('modalOptions');
    if(ow){
      ow.innerHTML = p.options&&p.options.length
        ? `<label>${currentLang==='en'?'Choose variant':'Оберіть варіант'}</label><select id="modalOptSel">${p.options.map(o=>`<option value="${o}">${o}</option>`).join('')}</select>`
        : '';
    }
    const ab=document.getElementById('modalAddBtn');
    if(ab){
      if(p.stock==='order'){
        ab.textContent=currentLang==='en'?'Custom order':'Замовити індивідуально';
        ab.onclick=()=>{ closeModal(); document.getElementById('motty-quiz')?.scrollIntoView({behavior:'smooth'}); };
      } else {
        ab.textContent=t('add_to_cart');
        ab.onclick=addFromModal;
      }
    }
    const wo=document.getElementById('modalWishBtn');
    if(wo){
      const w=Store.isWished(id);
      wo.innerHTML=`<svg width="17" height="17" fill="${w?'var(--acc)':'none'}" stroke="var(--acc)" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
      wo.onclick=()=>{ Store.toggleWish(id); const w2=Store.isWished(id); wo.querySelector('svg').setAttribute('fill',w2?'var(--acc)':'none'); showToast(w2?t('add_to_wish'):t('remove_wish')); updateWishBadge(); };
    }
    document.getElementById('modalOverlay').classList.add('open');
    document.body.style.overflow='hidden';
  }
  function setThumb(el,src){
    document.getElementById('modalImg').src=src;
    document.querySelectorAll('.modal-thumb').forEach(t=>t.classList.remove('active'));
    el.classList.add('active');
  }
  function addFromModal(){
    if(!currentModal) return;
    const sel=document.getElementById('modalOptSel'), option=sel?sel.value:'';
    Store.addToCart(currentModal.id, option); closeModal(); openCartDrawer();
  }
  function closeModal(){ document.getElementById('modalOverlay').classList.remove('open'); document.body.style.overflow=''; currentModal=null; }

  // ── Cart Drawer ──
  function initCart(){
    const ov=document.getElementById('cartOverlay'); if(!ov) return;
    ov.addEventListener('click', closeCartDrawer);
  }
  function openCartDrawer(){ renderCartDrawer(); _openDrawer('cartOverlay','cartDrawer'); }
  function closeCartDrawer(){ _closeDrawer('cartOverlay','cartDrawer'); }

  function renderCartDrawer(){
    const body=document.getElementById('cartBody'), foot=document.getElementById('cartFoot');
    if(!body) return;
    const items=Store.getCartItems();
    if(!items.length){
      body.innerHTML=`<div class="empty-state"><svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg><h3>${t('cart_empty')}</h3><p>${t('cart_empty_sub')}</p></div>`;
      if(foot) foot.style.display='none'; return;
    }
    body.innerHTML=items.map(i=>`<div class="cart-item">
      <img class="cart-item-img" src="${i.product.images[0]}" alt="${i.product.title}">
      <div class="cart-item-info">
        <h5>${i.product.title}${i.option?' — '+i.option:''}</h5>
        <p>${fmt(i.product.price)}</p>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="Catalog.changeQty('${i.key}',-1)">−</button>
          <span class="qty-val">${i.qty}</span>
          <button class="qty-btn" onclick="Catalog.changeQty('${i.key}',1)">+</button>
        </div>
        <div class="cart-item-price">${fmt(i.product.price*i.qty)}</div>
      </div>
      <button class="cart-item-remove" onclick="Catalog.removeCartItem('${i.key}')">×</button>
    </div>`).join('');
    const total=Store.getCartTotal(), free=total>=MOTTY_SETTINGS.freeFrom;
    if(foot){ foot.innerHTML=`
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:600;margin-bottom:8px"><span>Разом:</span><span>${fmt(total)}</span></div>
      <div style="font-size:13px;color:${free?'var(--ok)':'var(--mute)'};margin-bottom:16px">${free?t('free_delivery'):t('to_free')+fmt(MOTTY_SETTINGS.freeFrom-total)}</div>
      <a href="cart.html" class="btn btn-primary btn-block">${t('checkout_btn')}</a>`;
      foot.style.display='block';
    }
  }
  function changeQty(key,d){ const i=Store.getCartItems().find(i=>i.key===key); if(i) Store.updateQty(key,i.qty+d); renderCartDrawer(); updateCartBadge(); }
  function removeCartItem(key){ Store.removeFromCart(key); renderCartDrawer(); updateCartBadge(); }

  // ── Wish Drawer ──
  function initWish(){
    const ov=document.getElementById('wishOverlay'); if(!ov) return;
    ov.addEventListener('click', closeWishDrawer);
  }
  function openWishDrawer(){ renderWishDrawer(); _openDrawer('wishOverlay','wishDrawer'); }
  function closeWishDrawer(){ _closeDrawer('wishOverlay','wishDrawer'); }
  function renderWishDrawer(){
    const body=document.getElementById('wishBody'); if(!body) return;
    const items=Store.getWishItems();
    if(!items.length){ body.innerHTML=`<div class="empty-state"><svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><h3>${t('wish_empty')}</h3><p>${t('wish_empty_sub')}</p></div>`; return; }
    body.innerHTML=items.map(p=>`<div class="wish-item">
      <img class="wish-item-img" src="${p.images[0]}" alt="${p.title}" onclick="Catalog.openModal('${p.id}')" style="cursor:pointer">
      <div class="wish-item-info">
        <h5 style="cursor:pointer" onclick="Catalog.openModal('${p.id}')">${p.title}</h5>
        <div class="wish-item-price">${fmt(p.price)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
        <button class="btn btn-sm btn-primary" onclick="Store.addToCart('${p.id}');Catalog.renderWishDrawer();updateCartBadge()">${currentLang==='en'?'Add':'До кошика'}</button>
        <button class="btn btn-sm btn-outline" onclick="Store.toggleWish('${p.id}');Catalog.renderWishDrawer();Catalog.updateWishBadge()">${currentLang==='en'?'Remove':'Видалити'}</button>
      </div>
    </div>`).join('');
  }

  // ── Badges ──
  function updateCartBadge(){
    const n=Store.getCartCount();
    document.querySelectorAll('.cart-badge').forEach(el=>{ el.textContent=n; el.style.display=n?'flex':'none'; });
  }
  function updateWishBadge(){
    const n=Store.getWish().length;
    document.querySelectorAll('.wish-badge').forEach(el=>{ el.textContent=n; el.style.display=n?'flex':'none'; });
  }

  // ── Nav scroll ──
  function initNav(){
    window.addEventListener('scroll',()=>{
      document.querySelector('.nav')?.classList.toggle('scrolled', window.scrollY>10);
    });
  }

  // ── Reveal animations ──
  function initReveal(){
    const obs=new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); } });
    },{threshold:0.05,rootMargin:'0px 0px 0px 0px'});
    function observe(){
      document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.reveal-scale,.stagger').forEach(el=>{
        if(el.classList.contains('visible')) return;
        const r=el.getBoundingClientRect();
        // Already in viewport at load time
        if(r.top < window.innerHeight && r.bottom > 0){
          requestAnimationFrame(()=>{ el.classList.add('visible'); });
        } else {
          obs.observe(el);
        }
      });
    }
    observe();
    const gridObs=new MutationObserver(()=>setTimeout(observe,50));
    const grid=document.getElementById('productsGrid');
    if(grid) gridObs.observe(grid,{childList:true});
  }

  // ── Mobile filter ──
  function openMobileFilter(){
    const sb=document.getElementById('catalogSidebar');
    if(sb){ sb.classList.add('mobile-open'); document.body.style.overflow='hidden'; }
  }
  function closeMobileFilter(){
    const sb=document.getElementById('catalogSidebar');
    if(sb){ sb.classList.remove('mobile-open'); document.body.style.overflow=''; }
  }

  // ── Helpers ──
  function _set(id,val,mode='text'){
    const el=document.getElementById(id); if(!el) return;
    if(mode==='src') el.src=val;
    else if(mode==='html') el.innerHTML=val;
    else el.textContent=val;
  }
  function _openDrawer(ovId,drId){ document.getElementById(ovId).classList.add('open'); document.getElementById(drId).classList.add('open'); document.body.style.overflow='hidden'; }
  function _closeDrawer(ovId,drId){ document.getElementById(ovId).classList.remove('open'); document.getElementById(drId).classList.remove('open'); document.body.style.overflow=''; }

  function rerenderText(){ renderSidebar(); renderProducts(); renderCartDrawer(); renderWishDrawer(); updateCartBadge(); updateWishBadge(); }

  return { init, setCat, setSort, setInStock, setSale, setPriceMin, setPriceMax, resetFilters,
    renderProducts, openModal, closeModal, setThumb, addFromModal, quickAdd, toggleWish,
    openCartDrawer, closeCartDrawer, renderCartDrawer, changeQty, removeCartItem,
    openWishDrawer, closeWishDrawer, renderWishDrawer,
    updateCartBadge, updateWishBadge, openMobileFilter, closeMobileFilter, rerenderText };
})();
