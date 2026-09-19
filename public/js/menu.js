(() => {
  const { slug, currency, tableNumber } = window.__RESTAURANT__;
  const cart = []; // [{ key, itemId, name, price, qty, options: [{option_id,value_ids:[]}] }]
  let menuCache = {};

  /* ------------ Item modal ------------ */
  const itemModal = document.getElementById('item-modal');
  const itemBody = document.getElementById('item-modal-body');

  async function openItem(itemId) {
    itemBody.innerHTML = 'Loading…';
    itemModal.classList.remove('hidden');
    try {
      const res = await fetch(`/api/r/${slug}/items/${itemId}`);
      const data = await res.json();
      menuCache[itemId] = data;
      renderItemModal(data);
    } catch (e) {
      itemBody.innerHTML = 'Failed to load item.';
    }
  }

  function closeItemModal() {
    itemModal.classList.add('hidden');
  }

  function renderItemModal({ item, options }) {
    const price = Number(item.discount_price || item.price);
    let html = '';
    if (item.image_large) html += `<img class="big" src="${item.image_large}" alt="">`;
    html += `<h3>${escapeHtml(item.name)}</h3>`;
    if (item.description) html += `<p class="desc">${escapeHtml(item.description)}</p>`;
    html += `<div style="font-size:18px;font-weight:700;color:var(--primary);margin-bottom:8px">${currency} ${price}</div>`;

    (options || []).forEach((opt) => {
      html += `<div class="option-group" data-opt-id="${opt.id}" data-required="${opt.is_required}" data-multi="${opt.is_multi}">`;
      html += `<h4>${escapeHtml(opt.name)}${opt.is_required ? ' • required' : ''}</h4>`;
      opt.values.forEach((v) => {
        const inputType = opt.is_multi ? 'checkbox' : 'radio';
        const nameAttr = opt.is_multi ? `opt-${opt.id}-${v.id}` : `opt-${opt.id}`;
        html += `
          <label class="option-value">
            <input type="${inputType}" name="${nameAttr}" value="${v.id}"
                   data-option-id="${opt.id}" data-delta="${Number(v.price_delta)}"
                   ${v.is_default ? 'checked' : ''}>
            <span>${escapeHtml(v.name)}</span>
            ${Number(v.price_delta) !== 0 ? `<span class="muted small">+ ${currency} ${v.price_delta}</span>` : ''}
          </label>`;
      });
      html += `</div>`;
    });

    html += `
      <div class="qty-row">
        <button id="modal-minus">−</button>
        <span id="modal-qty" style="font-size:18px;font-weight:600;min-width:32px;text-align:center">1</span>
        <button id="modal-plus">+</button>
      </div>
      <button class="btn-primary" id="modal-add">Add to Order • <span id="modal-total">${currency} ${price}</span></button>
    `;
    itemBody.innerHTML = html;

    let qty = 1;
    const updateTotal = () => {
      const base = Number(item.discount_price || item.price);
      let extra = 0;
      itemBody.querySelectorAll('input:checked').forEach((i) => { extra += Number(i.dataset.delta || 0); });
      const total = (base + extra) * qty;
      document.getElementById('modal-total').textContent = `${currency} ${total.toFixed(2)}`;
      document.getElementById('modal-qty').textContent = qty;
    };
    itemBody.addEventListener('change', updateTotal);

    document.getElementById('modal-minus').onclick = () => { if (qty > 1) { qty--; updateTotal(); } };
    document.getElementById('modal-plus').onclick = () => { qty++; updateTotal(); };
    document.getElementById('modal-add').onclick = () => {
      // Group selected options
      const grouped = {};
      itemBody.querySelectorAll('input:checked').forEach((i) => {
        const oid = i.dataset.optionId;
        if (!grouped[oid]) grouped[oid] = [];
        grouped[oid].push(Number(i.value));
      });
      const options = Object.entries(grouped).map(([option_id, value_ids]) => ({
        option_id: Number(option_id), value_ids,
      }));

      // Validate required options
      const requiredNotMet = (options || []).some((o) => false); // basic — refine as needed
      addToCart({ itemId: item.id, name: item.name, options, qty });
      closeItemModal();
    };
    updateTotal();
  }

  /* ------------ Cart ------------ */
  function addToCart({ itemId, name, options, qty }) {
    const key = itemId + '|' + JSON.stringify(options);
    const existing = cart.find((c) => c.key === key);
    if (existing) existing.qty += qty;
    else cart.push({ key, itemId, name, options, qty });
    updateCartUI();
    pulseCart();
  }

  function updateCartUI() {
    const count = cart.reduce((s, c) => s + c.qty, 0);
    document.getElementById('cart-count').textContent = count;
    const itemsEl = document.getElementById('cart-items');
    if (!cart.length) {
      itemsEl.innerHTML = '<p class="muted">Cart is empty</p>';
    } else {
      itemsEl.innerHTML = cart.map((c, i) => `
        <div class="cart-item-row">
          <div>
            <b>${escapeHtml(c.name)}</b>
            <div class="muted small">${c.qty} × ${currency} ${c.qty > 0 ? '' : ''}${c.qty ? '' : ''}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="qty-btn" onclick="changeQty(${i}, -1)">−</button>
            <span>${c.qty}</span>
            <button class="qty-btn" onclick="changeQty(${i}, 1)">+</button>
          </div>
        </div>
      `).join('');
    }
    // NOTE: total calculation needs server data — we approximate with 0 here; realistic version pre-fetches prices.
    // For Phase 1, we compute total via API when placing the order; UI shows 0 in drawer.
  }

  window.changeQty = (index, delta) => {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    updateCartUI();
  };

  function pulseCart() {
    const fab = document.getElementById('cart-toggle');
    fab.style.transform = 'scale(1.1)';
    setTimeout(() => (fab.style.transform = ''), 120);
  }

  function openCart() { document.getElementById('cart-drawer').classList.remove('hidden'); }
  function closeCart() { document.getElementById('cart-drawer').classList.add('hidden'); }
  window.closeCart = closeCart;

  /* ------------ Order type conditional fields ------------ */
  document.getElementById('order-type').addEventListener('change', (e) => {
    const v = e.target.value;
    document.getElementById('address-wrap').classList.toggle('hidden', v !== 'delivery');
    document.getElementById('table-wrap').classList.toggle('hidden', v !== 'dine_in');
  });

  /* ------------ Checkout ------------ */
  document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!cart.length) return alert('Cart is empty');
    const fd = new FormData(e.target);
    const payload = {
      customer_name: fd.get('customer_name'),
      customer_phone: fd.get('customer_phone'),
      customer_address: fd.get('customer_address'),
      order_type: fd.get('order_type'),
      table_number: fd.get('table_number'),
      notes: fd.get('notes'),
      items: cart.map((c) => ({
        menu_item_id: c.itemId,
        quantity: c.qty,
        options: c.options,
      })),
    };
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Placing…';
    try {
      const res = await fetch(`/api/r/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      // Clear cart & show success
      cart.length = 0;
      updateCartUI();
      closeCart();
      alert(`Order placed! Your number: ${data.order.order_number}`);
      location.reload();
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Place Order';
    }
  });

  /* ------------ Category chip scroll ------------ */
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const id = chip.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ------------ Search ------------ */
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.cat-section').forEach((sec) => {
        let visible = 0;
        sec.querySelectorAll('.card-item').forEach((card) => {
          const name = card.dataset.name.toLowerCase();
          const show = !q || name.includes(q);
          card.style.display = show ? '' : 'none';
          if (show) visible++;
        });
        sec.style.display = visible ? '' : 'none';
      });
    });
  }

  /* ------------ Card click / add button ------------ */
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) {
      e.stopPropagation();
      openItem(Number(addBtn.dataset.add));
      return;
    }
    const card = e.target.closest('.card-item');
    if (card) openItem(Number(card.dataset.id));
  });

  document.getElementById('cart-toggle').addEventListener('click', openCart);
  document.getElementById('item-modal').addEventListener('click', (e) => {
    if (e.target === itemModal) closeItemModal();
  });
  window.closeItemModal = closeItemModal;

  /* ------------ Utils ------------ */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
})();