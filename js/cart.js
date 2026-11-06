/* ═══════════════════════════════════
   CART — сторінка кошика і оформлення
═══════════════════════════════════ */
'use strict';

const CartPage = (() => {
  let selectedDelivery = null;
  let selectedPayment  = null;

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
    wrap.innerHTML = items.map(i => `
      <div class="summary-item">
        <img class="summary-item-img" src="${i.product.images[0]}" alt="${i.product.title}">
        <div class="summary-item-info">
          <h5>${i.product.title}${i.option ? ' — ' + i.option : ''}</h5>
          <p>${i.qty} шт. × ${fmt(i.product.price)}</p>
        </div>
        <span class="summary-item-price">${fmt(i.product.price * i.qty)}</span>
      </div>`).join('');
  }

  function renderSummary(items) {
    const wrap = document.getElementById('cartItemsList');
    if (!wrap) return;
    wrap.innerHTML = items.map(i => `
      <div class="cart-item">
        <img class="cart-item-img" src="${i.product.images[0]}" alt="${i.product.title}">
        <div class="cart-item-info">
          <h5>${i.product.title}${i.option ? ' — ' + i.option : ''}</h5>
          <p>${fmt(i.product.price)} / шт.</p>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="CartPage.changeQty('${i.key}',-1)">−</button>
            <span class="qty-val">${i.qty}</span>
            <button class="qty-btn" onclick="CartPage.changeQty('${i.key}',1)">+</button>
          </div>
          <div class="cart-item-price">${fmt(i.product.price * i.qty)}</div>
        </div>
        <button class="cart-item-remove" onclick="CartPage.removeItem('${i.key}')">×</button>
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
    wrap.innerHTML = MOTTY_SETTINGS.delivery.map(d => `
      <label class="delivery-option" onclick="CartPage.selectDelivery('${d.id}')">
        <input type="radio" name="delivery" value="${d.id}">
        <div class="delivery-option-info">
          <h5>${d.name}</h5>
          <p>${d.desc}</p>
        </div>
        <span class="delivery-price ${getDeliveryCost(d) === 0 ? 'free' : ''}">
          ${getDeliveryCost(d) === 0 ? 'Безкоштовно' : fmt(d.price)}
        </span>
      </label>`).join('');
    // Вибрати перший
    selectDelivery(MOTTY_SETTINGS.delivery[0].id);
    document.querySelector(`input[value="${MOTTY_SETTINGS.delivery[0].id}"]`).checked = true;
  }

  function getDeliveryCost(d) {
    const total = Store.getCartTotal();
    return (d.freeFrom > 0 && total >= d.freeFrom) ? 0 : d.price;
  }

  function selectDelivery(id) {
    selectedDelivery = id;
    document.querySelectorAll('.delivery-option').forEach(el => {
      el.classList.toggle('selected', el.querySelector('input').value === id);
    });
    const d = MOTTY_SETTINGS.delivery.find(d => d.id === id);
    const fields = document.getElementById('deliveryFields');
    if (!fields) return;
    if (id === 'pickup') {
      fields.innerHTML = `<p style="font-size:13px;color:var(--mute);margin-top:10px">📍 Самовивіз, Київ. Адресу уточнимо після підтвердження замовлення.</p>`;
    } else if (id === 'nova_door') {
      fields.innerHTML = `
        <div class="field"><label>Місто</label><input id="fieldCity" type="text" placeholder="Наприклад: Київ"></div>
        <div class="field"><label>Вулиця і будинок</label><input id="fieldAddress" type="text" placeholder="вул. Хрещатик, 1"></div>`;
    } else {
      fields.innerHTML = `
        <div class="field-row">
          <div class="field"><label>Місто</label><input id="fieldCity" type="text" placeholder="Наприклад: Київ"></div>
          <div class="field"><label>Відділення / поштомат</label><input id="fieldWarehouse" type="text" placeholder="№ відділення"></div>
        </div>`;
    }
    updateTotals();
  }

  // ── Оплата ──
  function renderPayment() {
    const wrap = document.getElementById('paymentOptions');
    if (!wrap) return;
    const icons = {
      cod:   `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
      card:  `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
      photo: `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
    };
    wrap.innerHTML = MOTTY_SETTINGS.payment.map(p => `
      <div class="payment-option" onclick="CartPage.selectPayment('${p.id}')">
        ${icons[p.icon] || ''}
        <h5>${p.name}</h5>
        <p>${p.desc}</p>
      </div>`).join('');
    selectPayment(MOTTY_SETTINGS.payment[0].id);
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
    _setText('deliveryAmt', deliveryCost === 0 ? 'Безкоштовно' : fmt(deliveryCost));
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
    if (!name || !phone) { showToast('Заповніть ім\'я і телефон ❗'); return; }
    if (!selectedDelivery) { showToast('Оберіть спосіб доставки ❗'); return; }
    if (!selectedPayment)  { showToast('Оберіть спосіб оплати ❗'); return; }

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
    btn.textContent = 'Відправляємо...';
    btn.disabled = true;

    const { order: saved } = await Store.submitOrder(order);
    Store.clearCart();

    // Показати success
    document.getElementById('checkoutGrid').style.display = 'none';
    const s = document.getElementById('successPage');
    s.style.display = 'flex';
    document.getElementById('successOrderId').textContent = saved.id;
  }

  function _val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  return { init, selectDelivery, selectPayment, changeQty, removeItem, submit };
})();
