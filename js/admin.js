'use strict';
const Admin = (() => {
  let currentTab = 'dashboard', editingId = null, pinEntered = '';
  const PIN_KEY = 'motty_admin_auth', PROD_KEY = 'motty_custom_products';

  // ── PIN ──
  function initLogin(){
    if(isAuthed()) showApp();
  }
  function isAuthed(){ return sessionStorage.getItem(PIN_KEY)==='ok'; }
  function pressNum(n){
    if(pinEntered.length>=4) return;
    pinEntered+=n; _dots();
    if(pinEntered.length===4){
      if(pinEntered===MOTTY_SETTINGS.adminPin){
        sessionStorage.setItem(PIN_KEY,'ok');
        setTimeout(()=>showApp(),300);
      } else {
        showToast('Невірний PIN ❌');
        setTimeout(()=>{ pinEntered=''; _dots(); },500);
      }
    }
  }
  function pressBack(){ pinEntered=pinEntered.slice(0,-1); _dots(); }
  function _dots(){ document.querySelectorAll('.pin-dot').forEach((d,i)=>d.classList.toggle('filled',i<pinEntered.length)); }
  function logout(){ sessionStorage.removeItem(PIN_KEY); location.reload(); }
  function showApp(){
    document.getElementById('loginScreen').style.display='none';
    document.getElementById('appScreen').style.display='grid';
    switchTab('dashboard');
  }

  // ── NAV ──
  function switchTab(tab){
    currentTab=tab;
    document.querySelectorAll('.admin-nav-item').forEach(el=>el.classList.toggle('active',el.dataset.tab===tab));
    document.querySelectorAll('.admin-tab').forEach(el=>el.style.display=el.id==='tab-'+tab?'block':'none');
    document.getElementById('adminPageTitle').textContent={dashboard:'Дашборд',orders:'Замовлення',products:'Товари',settings:'Налаштування'}[tab]||tab;
    if(tab==='dashboard') renderDashboard();
    if(tab==='orders')    renderOrders();
    if(tab==='products')  renderProducts();
    if(tab==='settings')  renderSettings();
  }

  // ── DASHBOARD ──
  function renderDashboard(){
    const orders=Store.getOrders();
    const total=orders.reduce((s,o)=>s+(o.total||0),0);
    const today=orders.filter(o=>o.date?.startsWith(new Date().toISOString().slice(0,10))).length;
    const newOrd=orders.filter(o=>o.status==='new').length;
    _setText('statOrders',orders.length);
    _setText('statRevenue',fmt(total));
    _setText('statNew',newOrd);
    _setText('statToday',today);
    const tbody=document.getElementById('recentOrdersBody');
    if(!tbody) return;
    tbody.innerHTML=orders.slice(0,5).map(o=>`
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${o.name}</td>
        <td>${o.phone}</td>
        <td>${fmt(o.total)}</td>
        <td><span class="status status-${o.status}">${_statusLabel(o.status)}</span></td>
        <td>${new Date(o.date).toLocaleDateString('uk-UA')}</td>
        <td><select onchange="Admin.changeStatus('${o.id}',this.value)" style="padding:4px 8px;border:1px solid var(--line);border-radius:6px;font-size:12px;background:var(--bg)">
          ${['new','process','sent','done','cancel'].map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${_statusLabel(s)}</option>`).join('')}
        </select></td>
      </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--mute);padding:24px">Замовлень ще немає</td></tr>';
  }

  // ── ORDERS ──
  function renderOrders(filter=''){
    let orders=Store.getOrders();
    if(filter) orders=orders.filter(o=>o.id.includes(filter)||o.name?.toLowerCase().includes(filter.toLowerCase())||o.phone?.includes(filter));
    const tbody=document.getElementById('ordersBody');
    if(!tbody) return;
    tbody.innerHTML=orders.map(o=>`
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${o.name}<br><small style="color:var(--mute)">${o.phone}</small></td>
        <td style="max-width:220px;font-size:13px">${o.items?.map(i=>i.product?.title+'×'+i.qty).join(', ')||'—'}</td>
        <td>${fmt(o.total)}</td>
        <td>${_deliveryLabel(o.delivery)}</td>
        <td><span class="status status-${o.status}">${_statusLabel(o.status)}</span></td>
        <td>${new Date(o.date).toLocaleDateString('uk-UA')}</td>
        <td><select onchange="Admin.changeStatus('${o.id}',this.value)" style="padding:4px 8px;border:1px solid var(--line);border-radius:6px;font-size:12px;background:var(--bg)">
          ${['new','process','sent','done','cancel'].map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${_statusLabel(s)}</option>`).join('')}
        </select></td>
      </tr>`).join('')||'<tr><td colspan="8" style="text-align:center;color:var(--mute);padding:24px">Замовлень не знайдено</td></tr>';
  }
  function changeStatus(id,status){
    Store.updateOrderStatus(id,status);
    renderOrders(); renderDashboard(); showToast('Статус оновлено ✓');
  }

  // ── PRODUCTS ──
  function _getCustom(){ try{return JSON.parse(localStorage.getItem(PROD_KEY))||[];}catch{return[];} }
  function _allProducts(){
    return [...MOTTY_PRODUCTS.map(p=>({...p,_custom:false})),..._getCustom().map(p=>({...p,_custom:true}))];
  }
  function renderProducts(filter=''){
    let prods=_allProducts();
    if(filter) prods=prods.filter(p=>p.title.toLowerCase().includes(filter.toLowerCase())||p.sku?.includes(filter));
    const tbody=document.getElementById('productsBody');
    if(!tbody) return;
    tbody.innerHTML=prods.map(p=>`
      <tr>
        <td><img class="td-img" src="${p.images?.[0]||''}" alt="${p.title}" onerror="this.style.display='none'"></td>
        <td><strong>${p.title}</strong><br><small style="color:var(--mute)">${p.sku}</small></td>
        <td>${catName(p.cat)}</td>
        <td>${fmt(p.price)}${p.old?`<br><small style="color:var(--mute);text-decoration:line-through">${fmt(p.old)}</small>`:''}</td>
        <td><span class="status ${p.stock==='in'?'status-done':'status-process'}">${p.stock==='in'?'В наявності':'Під замовлення'}</span></td>
        <td>
          ${p._custom?`
            <button class="td-action" onclick="Admin.editProduct('${p.id}')">Редагувати</button>
            <button class="td-action del" onclick="Admin.deleteProduct('${p.id}')">Видалити</button>
          `:'<span style="font-size:12px;color:var(--mute)">вбудований</span>'}
        </td>
      </tr>`).join('');
  }

  // ── PRODUCT MODAL ──
  function openProductModal(id=null){
    editingId=id;
    const p=id?_allProducts().find(p=>p.id===id):null;
    document.getElementById('productModalTitle').textContent=p?'Редагувати товар':'Новий товар';
    document.getElementById('pmTitle').value=p?.title||'';
    document.getElementById('pmTitleEn').value=p?.title_en||'';
    document.getElementById('pmSku').value=p?.sku||'';
    document.getElementById('pmPrice').value=p?.price||'';
    document.getElementById('pmOld').value=p?.old||'';
    document.getElementById('pmShort').value=p?.short||'';
    document.getElementById('pmShortEn').value=p?.short_en||'';
    document.getElementById('pmDesc').value=p?.desc||'';
    document.getElementById('pmDescEn').value=p?.desc_en||'';
    document.getElementById('pmBadge').value=p?.badge||'';
    document.getElementById('pmStock').value=p?.stock||'in';
    document.getElementById('pmCat').value=p?.cat||'decor';
    document.getElementById('pmOptions').value=p?.options?.join(', ')||'';
    // Show current image
    const prev=document.getElementById('pmImgPreview');
    if(prev){ prev.src=p?.images?.[0]||''; prev.style.display=p?.images?.[0]?'block':'none'; }
    document.getElementById('productModal').classList.add('open');
  }
  function closeProductModal(){ document.getElementById('productModal').classList.remove('open'); editingId=null; }

  function saveProduct(){
    const custom=_getCustom();
    // Get image - either uploaded or existing
    const imgInput=document.getElementById('pmImgFile');
    const existingImg=document.getElementById('pmImgPreview');
    let imageData=existingImg?.src&&existingImg.src.startsWith('data:')?existingImg.src:
                  (editingId?(_allProducts().find(p=>p.id===editingId)?.images||[]):[])[0]||'';

    function _finish(imgSrc){
      const prod={
        id: editingId||'cp-'+Date.now(),
        title: document.getElementById('pmTitle').value.trim(),
        title_en: document.getElementById('pmTitleEn').value.trim(),
        sku: document.getElementById('pmSku').value.trim(),
        price: +document.getElementById('pmPrice').value||0,
        old: +document.getElementById('pmOld').value||0,
        short: document.getElementById('pmShort').value.trim(),
        short_en: document.getElementById('pmShortEn').value.trim(),
        desc: document.getElementById('pmDesc').value.trim(),
        desc_en: document.getElementById('pmDescEn').value.trim(),
        badge: document.getElementById('pmBadge').value,
        stock: document.getElementById('pmStock').value,
        cat: document.getElementById('pmCat').value,
        options: document.getElementById('pmOptions').value.split(',').map(s=>s.trim()).filter(Boolean),
        images: imgSrc?[imgSrc]:[],
        reviews:0, rating:5.0, left:0,
        addedAt: editingId?((_allProducts().find(p=>p.id===editingId)?.addedAt)||Date.now()):Date.now(),
      };
      if(!prod.title||!prod.price){ showToast('Заповніть назву і ціну ❗'); return; }
      if(editingId){ const idx=custom.findIndex(p=>p.id===editingId); if(idx>=0) custom[idx]=prod; else custom.push(prod); }
      else custom.push(prod);
      localStorage.setItem(PROD_KEY,JSON.stringify(custom));
      closeProductModal(); renderProducts(); showToast('Товар збережено ✓');
    }

    // Handle file upload
    if(imgInput&&imgInput.files&&imgInput.files[0]){
      const reader=new FileReader();
      reader.onload=function(e){ _finish(e.target.result); };
      reader.readAsDataURL(imgInput.files[0]);
    } else {
      _finish(imageData);
    }
  }

  function editProduct(id){ openProductModal(id); }
  function deleteProduct(id){
    if(!confirm('Видалити товар?')) return;
    const custom=_getCustom().filter(p=>p.id!==id);
    localStorage.setItem(PROD_KEY,JSON.stringify(custom));
    renderProducts(); showToast('Товар видалено');
  }

  // ── SETTINGS ──
  function renderSettings(){
    document.getElementById('settingPhone').value=MOTTY_SETTINGS.phone;
    document.getElementById('settingTelegram').value=MOTTY_SETTINGS.telegram;
    document.getElementById('settingInstagram').value=MOTTY_SETTINGS.instagram;
    document.getElementById('settingEmail').value=MOTTY_SETTINGS.email;
    document.getElementById('settingTgToken').value=MOTTY_SETTINGS.tgToken;
    document.getElementById('settingTgChat').value=MOTTY_SETTINGS.tgChat;
    document.getElementById('settingFreeFrom').value=MOTTY_SETTINGS.freeFrom;
    document.getElementById('settingPin').value=MOTTY_SETTINGS.adminPin;
  }
  function saveSettings(){ showToast('Налаштування збережено ✓'); }

  // ── HELPERS ──
  function _setText(id,val){ const el=document.getElementById(id); if(el) el.textContent=val; }
  function _statusLabel(s){ return {new:'Нове',process:'В роботі',sent:'Відправлено',done:'Виконано',cancel:'Скасовано'}[s]||s; }
  function _deliveryLabel(id){ const d=MOTTY_SETTINGS.delivery?.find(d=>d.id===id); return d?d.name:id||'—'; }
  function searchOrders(q){ renderOrders(q); }
  function searchProducts(q){ renderProducts(q); }

  return { initLogin, pressNum, pressBack, logout, switchTab, changeStatus,
    renderDashboard, renderOrders, renderProducts,
    openProductModal, closeProductModal, saveProduct, editProduct, deleteProduct,
    renderSettings, saveSettings, searchOrders, searchProducts };
})();
