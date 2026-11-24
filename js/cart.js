/* ═══════════════════════════════════
   CART — сторінка кошика і оформлення
═══════════════════════════════════ */
'use strict';

const CartPage = (() => {
  let selectedDelivery = null;
  let selectedPayment  = null;

  function productTitle(product) {
    if (currentLang !== 'en') return product.title;
    const translated = product.title_en || t(product.id + '_title');
    return translated !== product.id + '_title' ? translated : product.title;
  }

  function unitLabel() {
    return currentLang === 'en' ? 'pc.' : '\u0448\u0442.';
  }

  function confirmLabel() {
    return currentLang === 'en' ? 'Place order &rarr;' : '\u041f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f &rarr;';
  }

  function init() {
    const items = Store.getCartItems();
    if (!items.length) { showEmptyCart(); return; }
    renderSummary(items);
    renderDelivery();
    renderPayment();
    renderCheckoutItems(items);
    updateTotals();
  }

  function showEmptyCart() {
    document.getElementById('checkoutGrid').style.display = 'none';
    document.getElementById('emptyCart').style.display = 'block';
  }

  // ── Підсумок замовлення ──
  function renderCheckoutItems(items) {
    const wrap = document.getElementById('summaryItems');
    if (!wrap) return;
    wrap.innerHTML = items.map(i => `
      <div class="summary-item">
        <img class="summary-item-img" src="${i.product.images[0]}" alt="${productTitle(i.product)}">
        <div class="summary-item-info">
          <h5>${productTitle(i.product)}${i.option ? ' &mdash; ' + i.option : ''}</h5>
          <p>${i.qty} ${unitLabel()} &times; ${fmt(i.product.price)}</p>
        </div>
        <span class="summary-item-price">${fmt(i.product.price * i.qty)}</span>
      </div>`).join('');
  }

  function renderSummary(items) {
    const wrap = document.getElementById('cartItemsList');
    if (!wrap) return;
    wrap.innerHTML = items.map(i => `
      <div class="cart-item">
        <img class="cart-item-img" src="${i.product.images[0]}" alt="${productTitle(i.product)}">
        <div class="cart-item-info">
          <h5>${productTitle(i.product)}${i.option ? ' &mdash; ' + i.option : ''}</h5>
          <p>${fmt(i.product.price)} / ${unitLabel()}</p>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="CartPage.changeQty('${i.key}',-1)" aria-label="Decrease quantity">&minus;</button>
            <span class="qty-val">${i.qty}</span>
            <button class="qty-btn" onclick="CartPage.changeQty('${i.key}',1)" aria-label="Increase quantity">+</button>
          </div>
          <div class="cart-item-price">${fmt(i.product.price * i.qty)}</div>
        </div>
        <button class="cart-item-remove" aria-label="Remove item" onclick="CartPage.removeItem('${i.key}')">&times;</button>
      </div>`).join('');
  }

  function changeQty(key, delta) {
    const items = Store.getCartItems();
    const item = items.find(i => i.key === key);
    if (item) Store.updateQty(key, item.qty + delta);
    const updated = Store.getCartItems();
    if (!updated.length) { showEmptyCart(); return; }
    renderSummary(updated);
    renderCheckoutItems(updated);
    updateTotals();
  }
  function removeItem(key) {
    Store.removeFromCart(key);
    const updated = Store.getCartItems();
    if (!updated.length) { showEmptyCart(); return; }
    renderSummary(updated);
    renderCheckoutItems(updated);
    updateTotals();
  }

  // ── Доставка ──
  function renderDelivery() {
    const wrap = document.getElementById('deliveryOptions');
    if (!wrap) return;
    const english = {
      nova: ['Nova Poshta', 'To a branch or parcel locker'],
      nova_door: ['Nova Poshta courier', 'Courier delivery to your door'],
      ukr: ['Ukrposhta', 'Delivery to a post office'],
      pickup: ['Pickup', 'Kyiv, by arrangement'],
    };
    wrap.innerHTML = MOTTY_SETTINGS.delivery.map(d => {
      const label = currentLang === 'en' ? (english[d.id] || [d.name, d.desc]) : [d.name, d.desc];
      const free = getDeliveryCost(d) === 0;
      return `
      <label class="delivery-option" onclick="CartPage.selectDelivery('${d.id}')">
        <input type="radio" name="delivery" value="${d.id}">
        <div class="delivery-option-info">
          <h5>${label[0]}</h5>
          <p>${label[1]}</p>
        </div>
        <span class="delivery-price ${free ? 'free' : ''}">
          ${free ? (currentLang === 'en' ? 'Free' : '\u0411\u0435\u0437\u043a\u043e\u0448\u0442\u043e\u0432\u043d\u043e') : fmt(d.price)}
        </span>
      </label>`;
    }).join('');
    const deliveryId = selectedDelivery || MOTTY_SETTINGS.delivery[0].id;
    selectDelivery(deliveryId);
    const selected = wrap.querySelector(`input[value="${deliveryId}"]`);
    if (selected) selected.checked = true;
  }

  function getDeliveryCost(d) {
    const total = Store.getCartTotal();
    return (d.freeFrom > 0 && total >= d.freeFrom) ? 0 : d.price;
  }

  /* ── Нова Пошта API ── */
  // Proxy через Supabase Edge Function (обходить CORS GitHub Pages)
  const NP_PROXY_URL = 'https://vabcrkeaboessvcqsexp.supabase.co/functions/v1/hyper-handler';
  const NP_ANON_KEY  = 'sb_publishable_xxMv73seH3m6lP2dkPQPIg_DZZqOASj';

  async function npRequest(modelName, calledMethod, methodProps = {}) {
    try {
      const res = await fetch(NP_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NP_ANON_KEY}`,
        },
        body: JSON.stringify({ modelName, calledMethod, methodProperties: methodProps })
      });
      if (!res.ok) { console.error('[NP] HTTP error', res.status); return null; }
      const data = await res.json();
      if (!data.success) { console.error('[NP] API error', data.errors); return null; }
      return data.data;
    } catch(e) {
      console.error('[NP] fetch failed:', e.message);
      return null;
    }
  }

  async function loadCities(query) {
    return npRequest('Address', 'getCities', { FindByString: query, Limit: 20 });
  }

  async function loadWarehouses(cityRef, query = '') {
    return npRequest('AddressGeneral', 'getWarehouses', {
      CityRef: cityRef,
      FindByString: query,
      Limit: 50
    });
  }

  function fallbackToManual(fields, isEn) {
    fields.innerHTML = `
      <div class="field">
        <label>${isEn ? 'City' : 'Місто'}</label>
        <input id="fieldCity" type="text" placeholder="${isEn ? 'e.g. Kyiv' : 'Наприклад: Київ'}">
      </div>
      <div class="field">
        <label>${isEn ? 'Branch / locker number' : 'Номер відділення або поштомату'}</label>
        <input id="fieldWarehouse" type="text" placeholder="${isEn ? 'Branch №' : 'Відділення №'}">
      </div>`;
  }

  function renderCityAutocomplete(fields) {
    const isEn = currentLang === 'en';
    fields.innerHTML = `
      <div class="field np-city-field">
        <label>${isEn ? 'City' : 'Місто'}</label>
        <input id="fieldCityText" type="text" autocomplete="off"
          placeholder="${isEn ? 'Start typing city name…' : 'Почніть вводити назву міста…'}">
        <input id="fieldCity" type="hidden">
        <ul id="npCityList" class="np-dropdown" style="display:none"></ul>
      </div>
      <div class="field np-warehouse-field" id="warehouseWrap">
        <label>${isEn ? 'Branch / parcel locker' : 'Відділення / поштомат'}</label>
        <input id="npWarehouseSearch" type="text" autocomplete="off"
          placeholder="${isEn ? 'First choose a city' : 'Спочатку оберіть місто'}" disabled>
        <input id="fieldWarehouse" type="hidden">
        <ul id="npWarehouseList" class="np-dropdown" style="display:none"></ul>
        <div id="npLoading" style="display:none;font-size:12px;color:var(--mute);margin-top:4px">
          ${isEn ? 'Loading…' : 'Завантаження…'}
        </div>
      </div>`;

    let cityTimer, warehouseTimer;
    let selectedCityRef = '';
    let cityDropdownOpen = false;
    let whDropdownOpen   = false;

    const cityInput  = document.getElementById('fieldCityText');
    const cityHidden = document.getElementById('fieldCity');
    const cityList   = document.getElementById('npCityList');
    const whSearch   = document.getElementById('npWarehouseSearch');
    const whHidden   = document.getElementById('fieldWarehouse');
    const whList     = document.getElementById('npWarehouseList');
    const loadingEl  = document.getElementById('npLoading');

    /* ── Позиціонування під input.
         position:fixed → координати відносно viewport, scrollY не додаємо ── */
    function positionDropdown(dropdown, inputEl) {
      const r = inputEl.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      dropdown.style.left  = r.left + 'px';
      dropdown.style.width = r.width + 'px';
      if (spaceBelow < 230 && r.top > 230) {
        // відкриваємо вгору
        dropdown.style.bottom = (window.innerHeight - r.top + 2) + 'px';
        dropdown.style.top    = 'auto';
      } else {
        // відкриваємо вниз
        dropdown.style.top    = (r.bottom + 2) + 'px';
        dropdown.style.bottom = 'auto';
      }
    }

    /* ── Міста ── */
    function showCityList(items) {
      if (!items.length) { closeCityList(); return; }
      cityList.innerHTML = items.map((c, i) =>
        `<li data-idx="${i}">${c.Description}${c.AreaDescription ? ', ' + c.AreaDescription : ''}</li>`
      ).join('');
      cityList._items = items.map(c => ({ name: c.Description, ref: c.Ref }));
      positionDropdown(cityList, cityInput);
      cityList.style.display = 'block';
      cityDropdownOpen = true;
    }

    function closeCityList() {
      cityList.style.display = 'none';
      cityDropdownOpen = false;
    }

    cityList.addEventListener('pointerdown', e => {
      const li = e.target.closest('li');
      if (!li) return;
      e.preventDefault();
      const item = cityList._items ? cityList._items[+li.dataset.idx] : { name: li.textContent, ref: '' };
      cityInput.value  = item.name;
      cityHidden.value = item.name;
      selectedCityRef  = item.ref;
      closeCityList();
      whSearch.disabled     = false;
      whSearch.placeholder  = isEn ? 'Search branch or locker…' : 'Пошук відділення або поштомату…';
      whSearch.value        = '';
      whHidden.value        = '';
      fetchWarehouses('');
    });

    cityInput.addEventListener('input', () => {
      cityHidden.value  = '';
      selectedCityRef   = '';
      whSearch.disabled = true;
      whSearch.placeholder = isEn ? 'First choose a city' : 'Спочатку оберіть місто';
      whSearch.value    = '';
      whHidden.value    = '';
      closeWhList();
      clearTimeout(cityTimer);
      const q = cityInput.value.trim();
      if (q.length < 2) { closeCityList(); return; }
      cityTimer = setTimeout(async () => {
        const cities = await loadCities(q);
        if (cities === null) { fallbackToManual(fields, isEn); return; }
        showCityList(cities);
      }, 350);
    });

    cityInput.addEventListener('blur', () => {
      setTimeout(() => { closeCityList(); }, 300);
    });

    /* ── Відділення ── */
    function closeWhList() {
      whList.style.display = 'none';
      whDropdownOpen = false;
    }

    async function fetchWarehouses(query) {
      if (!selectedCityRef) return;
      loadingEl.style.display = 'block';
      closeWhList();
      const items = await loadWarehouses(selectedCityRef, query);
      loadingEl.style.display = 'none';
      if (!items || !items.length) return;
      whList.innerHTML = items.map((w, i) =>
        `<li data-idx="${i}">${w.Description}</li>`
      ).join('');
      // зберігаємо масив окремо щоб уникнути проблем з лапками в data-атрибутах
      whList._items = items.map(w => w.Description);
      positionDropdown(whList, whSearch);
      whList.style.display = 'block';
      whDropdownOpen = true;
    }

    whList.addEventListener('pointerdown', e => {
      const li = e.target.closest('li');
      if (!li) return;
      e.preventDefault();
      const name = whList._items ? whList._items[+li.dataset.idx] : li.textContent;
      whSearch.value = name;
      whHidden.value = name;
      closeWhList();
    });

    whSearch.addEventListener('input', () => {
      whHidden.value = '';
      clearTimeout(warehouseTimer);
      warehouseTimer = setTimeout(() => fetchWarehouses(whSearch.value.trim()), 400);
    });

    whSearch.addEventListener('focus', () => {
      if (selectedCityRef && !whSearch.value.trim()) fetchWarehouses('');
    });

    whSearch.addEventListener('blur', () => {
      setTimeout(() => { closeWhList(); }, 300);
    });
  }

  function selectDelivery(id) {
    selectedDelivery = id;
    document.querySelectorAll('.delivery-option').forEach(el => {
      el.classList.toggle('selected', el.querySelector('input').value === id);
    });
    const fields = document.getElementById('deliveryFields');
    if (!fields) return;
    if (id === 'pickup') {
      fields.innerHTML = `<p style="font-size:13px;color:var(--mute);margin-top:10px">${currentLang === 'en' ? 'Pickup in Kyiv. We will confirm the address after your order.' : '\u0421\u0430\u043c\u043e\u0432\u0438\u0432\u0456\u0437, \u041a\u0438\u0457\u0432. \u0410\u0434\u0440\u0435\u0441\u0443 \u0443\u0442\u043e\u0447\u043d\u0438\u043c\u043e \u043f\u0456\u0441\u043b\u044f \u043f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043d\u043d\u044f \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f.'}</p>`;
    } else if (id === 'nova_door') {
      fields.innerHTML = `
        <div class="field"><label>${currentLang === 'en' ? 'City' : '\u041c\u0456\u0441\u0442\u043e'}</label><input id="fieldCity" type="text" placeholder="${currentLang === 'en' ? 'For example: Kyiv' : '\u041d\u0430\u043f\u0440\u0438\u043a\u043b\u0430\u0434: \u041a\u0438\u0457\u0432'}"></div>
        <div class="field"><label>${currentLang === 'en' ? 'Street and building' : '\u0412\u0443\u043b\u0438\u0446\u044f \u0456 \u0431\u0443\u0434\u0438\u043d\u043e\u043a'}</label><input id="fieldAddress" type="text" placeholder="${currentLang === 'en' ? 'Street, building number' : '\u0432\u0443\u043b. \u0425\u0440\u0435\u0449\u0430\u0442\u0438\u043a, 1'}"></div>`;
    } else {
      /* nova — відділення через API */
      renderCityAutocomplete(fields);
    }
    updateTotals();
  }

  function renderPayment() {
    const wrap = document.getElementById('paymentOptions');
    if (!wrap) return;
    const icons = {
      cod: `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
      card: `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
      photo: `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
    };
    const english = {
      cod: ['Cash on delivery', 'Pay when you receive your order'],
      card: ['Online card payment', 'Monobank / PrivatBank'],
      photo: ['After item photo', 'Pay after receiving a photo of the finished item'],
    };
    wrap.innerHTML = MOTTY_SETTINGS.payment.map(p => {
      const label = currentLang === 'en' ? (english[p.id] || [p.name, p.desc]) : [p.name, p.desc];
      return `<div class="payment-option" onclick="CartPage.selectPayment('${p.id}')">${icons[p.icon] || ''}<h5>${label[0]}</h5><p>${label[1]}</p></div>`;
    }).join('');
    const paymentId = selectedPayment || MOTTY_SETTINGS.payment[0].id;
    selectPayment(paymentId);
  }

  function selectPayment(id) {
    selectedPayment = id;
    document.querySelectorAll('.payment-option').forEach((el, i) => {
      el.classList.toggle('selected', MOTTY_SETTINGS.payment[i]?.id === id);
    });
  }

  // ── Підсумки ──
  function updateTotals() {
    const subtotal = Store.getCartTotal();
    const d = MOTTY_SETTINGS.delivery.find(d => d.id === selectedDelivery);
    const deliveryCost = d ? getDeliveryCost(d) : 0;
    const total = subtotal + deliveryCost;

    _setText('subtotalAmt', fmt(subtotal));
    _setText('deliveryAmt', deliveryCost === 0 ? (currentLang === 'en' ? 'Free' : '\u0411\u0435\u0437\u043a\u043e\u0448\u0442\u043e\u0432\u043d\u043e') : fmt(deliveryCost));
    _setText('totalAmt', fmt(total));
    if (deliveryCost === 0) {
      const el = document.getElementById('deliveryAmt');
      if (el) el.style.color = 'var(--ok)';
    }
  }

  function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ── Відправка ──
  async function submit() {
    const name  = _val('fieldName');
    const phone = _val('fieldPhone');
    if (!name || !phone) { showToast(currentLang === 'en' ? 'Please enter your name and phone number.' : '\u0417\u0430\u043f\u043e\u0432\u043d\u0456\u0442\u044c \u0456\u043c\u0027\u044f \u0442\u0430 \u0442\u0435\u043b\u0435\u0444\u043e\u043d.'); return; }
    if (!selectedDelivery) { showToast(currentLang === 'en' ? 'Please select a delivery method.' : '\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u0441\u043f\u043e\u0441\u0456\u0431 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438.'); return; }
    if (!selectedPayment) { showToast(currentLang === 'en' ? 'Please select a payment method.' : '\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u0441\u043f\u043e\u0441\u0456\u0431 \u043e\u043f\u043b\u0430\u0442\u0438.'); return; }

    const d = MOTTY_SETTINGS.delivery.find(d => d.id === selectedDelivery);
    const order = {
      name, phone,
      telegram:  _val('fieldTelegram'),
      comment:   _val('fieldComment'),
      delivery:  selectedDelivery,
      city:      _val('fieldCity'),
      warehouse: _val('fieldWarehouse'),
      address:   _val('fieldAddress'),
      payment:   selectedPayment,
      items:     Store.getCartItems(),
      subtotal:  Store.getCartTotal(),
      deliveryCost: d ? getDeliveryCost(d) : 0,
      total:     Store.getCartTotal() + (d ? getDeliveryCost(d) : 0),
    };

    const btn = document.getElementById('submitBtn');
    btn.textContent = currentLang === 'en' ? 'Submitting...' : '\u0412\u0456\u0434\u043f\u0440\u0430\u0432\u043b\u044f\u0454\u043c\u043e...';
    btn.disabled = true;

    let saved;
    try { const result=await Store.submitOrder(order); saved=result.order; }
    catch(e){ btn.disabled=false; btn.innerHTML=confirmLabel(); showToast(currentLang === 'en' ? 'Could not submit the order. Check your connection and try again.' : '\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0432\u0456\u0434\u043f\u0440\u0430\u0432\u0438\u0442\u0438 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437.',5000); console.error(e); return; }
    Store.clearCart();

    // Показати success
    document.getElementById('checkoutGrid').style.display = 'none';
    const s = document.getElementById('successPage');
    s.style.display = 'flex';
    document.getElementById('successOrderId').textContent = saved.id;
  }

  function rerenderText() {
    const items = Store.getCartItems();
    if (!items.length) return;
    const savedValues = {};
    ['fieldCity', 'fieldWarehouse', 'fieldAddress'].forEach(id => {
      const field = document.getElementById(id);
      if (field) savedValues[id] = field.value;
    });
    renderSummary(items);
    renderCheckoutItems(items);
    renderDelivery();
    renderPayment();
    Object.keys(savedValues).forEach(id => {
      const field = document.getElementById(id);
      if (field) field.value = savedValues[id];
    });
    updateTotals();
  }

  function _val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  return { init, selectDelivery, selectPayment, changeQty, removeItem, submit, rerenderText };
})();