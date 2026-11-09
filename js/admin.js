'use strict';
const Admin = (() => {
  let currentTab = 'dashboard', editingId = null;

  // ── Supabase Auth ──
  async function initLogin(){
    document.getElementById('loginScreen').style.display='flex';
    document.getElementById('appScreen').style.display='none';
    try { if(await MottyDB.restoreSession()) await showApp(); }
    catch(e){ console.error(e); }
  }
  async function login(){
    const email=document.getElementById('adminEmail').value.trim();
    const password=document.getElementById('adminPassword').value;
    const error=document.getElementById('loginError'); error.textContent='';
    try { await MottyDB.signIn(email,password); await showApp(); }
    catch(e){ error.textContent=e.message||'Не вдалося увійти'; }
  }
  async function logout(){ await MottyDB.signOut(); location.reload(); }
  async function showApp(){
    try { await MottyDB.seed(); await MottyDB.loadOrders(); window.MOTTY_DB_ORDERS=MottyDB.orders(); }
    catch(e){ showToast('Не вдалося завантажити замовлення: '+e.message,5000); }
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
  async function changeStatus(id,status){
    try { await Store.updateOrderStatus(id,status); renderOrders(); renderDashboard(); showToast('Статус оновлено ✓'); }
    catch(e){showToast('Помилка: '+e.message,5000);}
  }

  // ── PRODUCTS ──
  function _getCustom(){ return window.MOTTY_REMOTE_PRODUCTS || []; }
  function _allProducts(){ return _getCustom().map(p=>({...p,_custom:true})); }
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
          <button class="td-action" onclick="Admin.editProduct('${p.id}')">Редагувати</button>
          <button class="td-action del" onclick="Admin.deleteProduct('${p.id}')">Видалити</button>
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

  async function saveProduct(){
    const imgInput=document.getElementById('pmImgFile');
    const old=_allProducts().find(p=>p.id===editingId);
    const prod={
      id:editingId||'p-'+Date.now(), title:document.getElementById('pmTitle').value.trim(),
      title_en:document.getElementById('pmTitleEn').value.trim(), sku:document.getElementById('pmSku').value.trim(),
      price:+document.getElementById('pmPrice').value||0, old:+document.getElementById('pmOld').value||0,
      short:document.getElementById('pmShort').value.trim(), short_en:document.getElementById('pmShortEn').value.trim(),
      desc:document.getElementById('pmDesc').value.trim(), desc_en:document.getElementById('pmDescEn').value.trim(),
      badge:document.getElementById('pmBadge').value, stock:document.getElementById('pmStock').value,
      cat:document.getElementById('pmCat').value, options:document.getElementById('pmOptions').value.split(',').map(x=>x.trim()).filter(Boolean),
      images:old?.images||[], reviews:old?.reviews||0, rating:old?.rating||5, left:old?.left||0, addedAt:old?.addedAt||Date.now()
    };
    if(!prod.title||!prod.price){showToast('Заповніть назву і ціну ❗');return;}
    const btn=document.querySelector('#productModal .btn-primary'); if(btn){btn.disabled=true;btn.textContent='Збереження…';}
    try { await MottyDB.saveProduct(prod,imgInput?.files?.[0]||null); closeProductModal(); renderProducts(); renderDashboard(); showToast('Товар збережено в базі ✓'); }
    catch(e){showToast('Помилка збереження: '+e.message,5000);}
    finally{if(btn){btn.disabled=false;btn.textContent='Зберегти';}}
  }

  function editProduct(id){ openProductModal(id); }
  async function deleteProduct(id){
    if(!confirm('Видалити товар?')) return;
    try { await MottyDB.deleteProduct(id); renderProducts(); showToast('Товар видалено'); }
    catch(e){showToast('Не вдалося видалити: '+e.message,5000);}
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
  }
  function saveSettings(){ showToast('Налаштування збережено ✓'); }

  // ── HELPERS ──
  function _setText(id,val){ const el=document.getElementById(id); if(el) el.textContent=val; }
  function _statusLabel(s){ return {new:'Нове',process:'В роботі',sent:'Відправлено',done:'Виконано',cancel:'Скасовано'}[s]||s; }
  function _deliveryLabel(id){ const d=MOTTY_SETTINGS.delivery?.find(d=>d.id===id); return d?d.name:id||'—'; }
  function searchOrders(q){ renderOrders(q); }
  function searchProducts(q){ renderProducts(q); }

  return { initLogin, login, logout, switchTab, changeStatus,
    renderDashboard, renderOrders, renderProducts,
    openProductModal, closeProductModal, saveProduct, editProduct, deleteProduct,
    renderSettings, saveSettings, searchOrders, searchProducts };
})();
