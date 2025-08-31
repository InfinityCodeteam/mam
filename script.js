(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const state = {
    settings: null,
    categories: null,
    products: [],
    cart: JSON.parse(localStorage.getItem('cart') || '[]'),
    favs: JSON.parse(localStorage.getItem('favs') || '[]')
  };

  const saveLS = () => {
    localStorage.setItem('cart', JSON.stringify(state.cart));
    localStorage.setItem('favs', JSON.stringify(state.favs));
    updateBadges();
  };

  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const debouncedSaveLS = debounce(saveLS, 200);

  const money = n => Number(n || 0).toLocaleString('ar-EG');

  const findProduct = id => state.products.find(p => p.id === Number(id) || p.id === id);

  async function fetchWithTimeout(url, timeout = 5000, retries = 3) {
    for (let i = 0; i < retries; i++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);
        return await response.json();
      } catch (error) {
        clearTimeout(id);
        if (i === retries - 1) throw error;
      }
    }
  }

  async function boot() {
    try {
      const [settings, categories, products] = await Promise.all([
        fetchWithTimeout('settings.json'),
        fetchWithTimeout('categories.json'),
        fetchWithTimeout('products.json')
      ]);
      state.settings = settings;
      state.categories = categories;
      state.products = products.products;

      paintCommon();

      const page = location.pathname.split('/').pop() || 'index.html';
      if (page === 'index.html') initHome();
      if (page === 'menu.html') initMenu();
      if (page === 'product.html') initProduct();
      if (page === 'favorites.html') initFavorites();
      if (page === 'cart.html') initCart();
      if (page === 'contact.html') initContact();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: 'فشل في تحميل البيانات، يرجى التحقق من الاتصال والمحاولة لاحقًا'
      });
    }
  }

  function paintCommon() {
    updateBranding();
  }

  Object.defineProperty(Element.prototype, 'call', {
    value: function (v) { this.textContent = v; }
  });

  function updateBranding() {
    if (state.settings) {
      const { siteName, logo, phone, whatsapp, address, footerTagline } = state.settings;
      $('#siteName')?.call(siteName);
      $('#copyName')?.call(siteName);
      $('#footerName')?.call(siteName);
      $('#footerTag')?.call(footerTagline || '');
      $('#footerPhone')?.setAttribute('href', `tel:${phone}`);
      $('#footerWhats')?.setAttribute('href', `https://wa.me/${whatsapp}`);
      $('#footerAddress')?.call(address || '');
      $('#yearNow')?.call(new Date().getFullYear());

      const logoUrl = logo || 'https://images.unsplash.com/photo-1541745537413-b804ba48d929?q=80&w=400&auto=format&fit=crop';
      $('#logoImg')?.setAttribute('src', logoUrl);
      $('#footerLogo')?.setAttribute('src', logoUrl);

      updateBadges();
    }
  }

  function updateBadges() {
    $('#cartCount')?.call(String(state.cart.reduce((a, i) => a + i.qty, 0)));
    $('#favCount')?.call(String(state.favs.length));
  }

  /* ===== Home ===== */
  function initHome() {
    updateBranding();
    buildBanner();
    buildFeatured();
  }

  function buildBanner() {
    const cont = $('#bannerSlider');
    if (!cont || !state.settings?.banners) return;
    cont.innerHTML = `
      <div class="swiper">
        <div class="swiper-wrapper">
          ${state.settings.banners.map(b => `<div class="swiper-slide" style="background-image: url(${b})"></div>`).join('')}
        </div>
        <div class="swiper-pagination"></div>
      </div>
    `;
    if (typeof Swiper !== 'undefined') {
      new Swiper('.swiper', {
        loop: true,
        autoplay: { delay: 4000, disableOnInteraction: false },
        pagination: { el: '.swiper-pagination', clickable: true },
        effect: 'fade',
        fadeEffect: { crossFade: true }
      });
    }
  }

  function buildFeatured() {
    const row = $('#featuredRow');
    if (!row) return;
    const featured = state.products.filter(p => p.featured);
    row.innerHTML = '';
    featured.forEach(p => row.appendChild(productCard(p)));

    let dir = 1;
    const scroll = () => {
      if (!row.children.length) return;
      row.scrollBy({ left: dir * 220, behavior: 'smooth' });
      if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 5) dir = -1;
      if (row.scrollLeft <= 5) dir = 1;
      requestAnimationFrame(scroll);
    };
    setTimeout(scroll, 3500);
  }

  function productCard(p) {
    const el = document.createElement('article');
    el.className = 'card pop';
    el.innerHTML = `
      <img class="cover" src="${p.image}" alt="${p.name}" loading="lazy" srcset="${p.image} 1x, ${p.image.replace('w=600', 'w=300')} 0.5x">
      <div class="pad">
        <h3 class="title">${p.name}</h3>
        <p class="desc">${p.desc}</p>
        <div class="meta">
          <span class="price">${money(p.prices.S)} EGP</span>
        </div>
        <div class="actions-row">
          <button class="icon-btn" data-fav="${p.id}" aria-label="إضافة إلى المفضلة">إضافة للمفضلة</button>
          <button class="btn" data-cart="${p.id}" aria-label="إضافة إلى السلة">إضافة للسلة</button>
        </div>
      </div>
    `;
    el.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      location.href = `product.html?id=${p.id}`;
    });
    el.querySelector('[data-fav]').addEventListener('click', () => toggleFav(p.id));
    el.querySelector('[data-cart]').addEventListener('click', () => {
      if (p.optionsEnabled) {
        location.href = `product.html?id=${p.id}`;
      } else {
        addToCart(p.id, 'S', 1);
      }
    });
    return el;
  }

  /* ===== Menu ===== */
  function initMenu() {
    updateBranding();
    const params = new URLSearchParams(location.search);
    const cat = params.get('cat') || '';
    const sub = params.get('sub') || '';
    const search = params.get('q')?.toLowerCase() || '';

    const filters = $('#filters');
    const subFilters = $('#subFilters');
    const clearBtn = $('#clearFilter');
    const prods = $('#menuProds');

    filters.innerHTML = `
      <button class="filter-btn${cat === '' ? ' active' : ''}" data-cat="">الكل</button>
      ${state.categories.categories.map(c => `<button class="filter-btn${cat === c.id ? ' active' : ''}" data-cat="${c.id}">${c.name}</button>`).join('')}
    `;
    subFilters.innerHTML = '';
    if (cat && state.categories.subFilters[cat]) {
      subFilters.classList.add('active');
      subFilters.innerHTML = `
        <button class="filter-btn${sub === '' ? ' active' : ''}" data-sub="">الكل</button>
        ${state.categories.subFilters[cat].map(s => `<button class="filter-btn${sub === s ? ' active' : ''}" data-sub="${s}">${s}</button>`).join('')}
      `;
    }

    $$('.filter-btn', filters).forEach(btn => {
      btn.addEventListener('click', () => {
        const newCat = btn.dataset.cat;
        const url = newCat ? `menu.html?cat=${newCat}` : 'menu.html';
        location.href = url;
      });
    });

    $$('.filter-btn', subFilters).forEach(btn => {
      btn.addEventListener('click', () => {
        const newSub = btn.dataset.sub;
        const url = newSub ? `menu.html?cat=${cat}&sub=${newSub}` : `menu.html?cat=${cat}`;
        location.href = url;
      });
    });

    clearBtn.addEventListener('click', () => location.href = 'menu.html');

    let filtered = state.products;
    if (cat) filtered = filtered.filter(p => p.category === cat);
    if (sub) filtered = filtered.filter(p => p.tags.includes(sub));
    if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || p.keywords.toLowerCase().includes(search));

    prods.innerHTML = '';
    filtered.forEach(p => prods.appendChild(productCard(p)));
  }

  /* ===== Product ===== */
  function initProduct() {
    updateBranding();
    const id = new URLSearchParams(location.search).get('id');
    const p = findProduct(id);
    if (!p) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: 'المنتج غير موجود، يرجى المحاولة مرة أخرى'
      });
      setTimeout(() => location.href = 'menu.html', 2000);
      return;
    }

    $('#prodImg').src = p.image;
    $('#prodImg').setAttribute('srcset', `${p.image} 1x, ${p.image.replace('w=600', 'w=300')} 0.5x`);
    $('#prodName').call(p.name);
    $('#prodDesc').call(p.desc);
    const sizes = $('#sizes');
    if (!p.optionsEnabled) sizes.classList.add('hide');
    else {
      $$('input[name=size]').forEach(s => {
        if (!p.prices[s.value]) s.parentElement.classList.add('hide');
        s.addEventListener('change', () => {
          $$('input[name=size]').forEach(i => i.parentElement.classList.remove('active'));
          s.parentElement.classList.add('active');
          $('#priceLine').call(`السعر: ${money(p.prices[s.value])} EGP`);
        });
        if (s.value === 'S') {
          s.checked = true;
          s.parentElement.classList.add('active');
          $('#priceLine').call(`السعر: ${money(p.prices.S)} EGP`);
        }
      });
    }

    $('#addFav').addEventListener('click', () => toggleFav(p.id));
    $('#addCart').addEventListener('click', () => {
      const size = $$('input[name=size]:checked')[0]?.value || 'S';
      addToCart(p.id, size, 1);
    });
  }

  /* ===== Favorites ===== */
  function initFavorites() {
    updateBranding();
    const cont = $('#favList');
    cont.innerHTML = '';
    state.favs.forEach(id => {
      const p = findProduct(id);
      if (p) cont.appendChild(narrowRow(p, 'fav', null));
    });
  }

  /* ===== Cart ===== */
  function initCart() {
    updateBranding();
    const cont = $('#cartList');
    cont.innerHTML = '';
    let total = 0;
    state.cart.forEach(item => {
      const p = findProduct(item.id);
      if (p) {
        cont.appendChild(narrowRow(p, 'cart', item));
        total += (p.prices[item.size] || p.prices.S) * item.qty;
      }
    });
    $('#cartTotal').call(money(total));

    const form = $('#checkoutForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!state.cart.length) {
        Swal.fire({ icon: 'warning', title: 'السلة فارغة', text: 'يرجى إضافة منتجات إلى السلة' });
        return;
      }
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data.name || !data.phone || !data.address) {
        Swal.fire({ icon: 'error', title: 'خطأ', text: 'يرجى ملء جميع الحقول المطلوبة' });
        return;
      }
      if (!/^\d{11}$/.test(data.phone)) {
        Swal.fire({ icon: 'error', title: 'خطأ', text: 'رقم الهاتف يجب أن يكون 11 رقمًا' });
        return;
      }
      const lines = state.cart.map(it => {
        const p = findProduct(it.id);
        const price = p.prices[it.size] || p.prices.S;
        return `عدد(${it.qty}) ${p.name} ${it.size === 'S' ? 'Small' : it.size === 'M' ? 'Medium' : 'Large'} — ${price * it.qty} EGP`;
      });
      const total = $('#cartTotal').textContent;
      const details = `\nالاسم: ${data.name}\nالهاتف: ${data.phone}\nالعنوان: ${data.address}\nملاحظات: ${data.notes || '-'}\nالدفع: ${data.pay}`;
      const msg = `طلب جديد من موقع Mam's Pizza:%0A${lines.join('%0A')}%0Aالإجمالي: ${total} EGP%0A${encodeURIComponent(details)}`;
      const num = state.settings.whatsapp;
      location.href = `https://wa.me/${num}?text=${msg}`;
    });
  }

  function narrowRow(p, mode, item) {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <img src="${p.image}" alt="${p.name}" loading="lazy" srcset="${p.image} 1x, ${p.image.replace('w=600', 'w=300')} 0.5x">
      <div>
        <h4 class="title">${p.name}</h4>
        <div class="sub">${mode === 'cart' ? `الحجم: ${item.size}` : (p.optionsEnabled ? 'به أحجام — اضغط للتفاصيل' : 'بدون أحجام')}</div>
        <div class="sub">السعر: ${money(p.prices.S)} EGP</div>
        <div class="controls"></div>
      </div>
      <div class="controls"></div>
    `;

    row.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      if (mode === 'fav' && p.optionsEnabled) {
        location.href = `product.html?id=${p.id}`;
      }
    });

    const controls = row.querySelectorAll('.controls');
    if (mode === 'fav') {
      const c = controls[0];
      const add = document.createElement('button');
      add.className = 'icon-btn';
      add.textContent = 'إضافة للسلة';
      add.setAttribute('aria-label', 'إضافة إلى السلة');
      add.addEventListener('click', () => {
        if (p.optionsEnabled) {
          location.href = `product.html?id=${p.id}`;
          return;
        }
        addToCart(p.id, 'S', 1);
      });
      const del = document.createElement('button');
      del.className = 'icon-btn';
      del.textContent = 'حذف من المفضلة';
      del.setAttribute('aria-label', 'حذف من المفضلة');
      del.addEventListener('click', () => toggleFav(p.id, true));
      c.append(add, del);
    } else if (mode === 'cart') {
      const c = controls[1];
      const minus = document.createElement('button');
      minus.className = 'minus';
      minus.textContent = '−';
      minus.setAttribute('aria-label', 'تقليل الكمية');
      const qty = document.createElement('span');
      qty.className = 'qtynum';
      qty.textContent = String(item.qty);
      const plus = document.createElement('button');
      plus.className = 'plus';
      plus.textContent = '+';
      plus.setAttribute('aria-label', 'زيادة الكمية');
      const del = document.createElement('button');
      del.className = 'icon-btn';
      del.textContent = 'حذف';
      del.setAttribute('aria-label', 'حذف من السلة');

      minus.addEventListener('click', () => {
        item.qty = Math.max(1, item.qty - 1);
        debouncedSaveLS();
        qty.textContent = String(item.qty);
        updateCartTotal();
      });
      plus.addEventListener('click', () => {
        item.qty++;
        debouncedSaveLS();
        qty.textContent = String(item.qty);
        updateCartTotal();
      });
      del.addEventListener('click', () => {
        state.cart = state.cart.filter(x => !(x.id === item.id && x.size === item.size));
        debouncedSaveLS();
        row.remove();
        updateCartTotal();
      });
      c.append(minus, qty, plus, del);
    }
    return row;
  }

  function updateCartTotal() {
    let total = 0;
    state.cart.forEach(item => {
      const p = findProduct(item.id);
      if (p) total += (p.prices[item.size] || p.prices.S) * item.qty;
    });
    $('#cartTotal').call(money(total));
  }

  function toggleFav(id, fromFavPage = false) {
    const i = state.favs.indexOf(Number(id) || id);
    if (i >= 0) {
      state.favs.splice(i, 1);
      Swal.fire({ icon: 'success', title: 'تم الإزالة من المفضلة', showConfirmButton: false, timer: 1500 });
    } else {
      state.favs.push(Number(id) || id);
      Swal.fire({ icon: 'success', title: 'تمت الإضافة للمفضلة', showConfirmButton: false, timer: 1500 });
    }
    debouncedSaveLS();
    if (fromFavPage) location.reload();
  }

  function addToCart(id, size = 'S', qty = 1) {
    const existing = state.cart.find(it => it.id === Number(id) && it.size === size);
    if (existing) existing.qty += qty;
    else state.cart.push({ id: Number(id), size, qty });
    debouncedSaveLS();
    Swal.fire({ icon: 'success', title: 'تمت الإضافة للسلة', showConfirmButton: false, timer: 1500 });
  }

  /* ===== Contact ===== */
  function initContact() {
    updateBranding();
    const box = $('#contactCards');
    const s = state.settings;
    const items = [
      { label: 'هاتف', value: s.phone, href: `tel:${s.phone}` },
      { label: 'واتساب', value: s.whatsapp, href: `https://wa.me/${s.whatsapp}` },
      { label: 'فيسبوك', value: s.facebook, href: s.facebook },
      { label: 'إنستغرام', value: s.instagram, href: s.instagram },
      { label: 'العنوان', value: s.address }
    ];
    box.innerHTML = '';
    items.forEach(it => {
      const d = document.createElement('div');
      d.className = 'cardy';
      d.innerHTML = `<div style="font-weight:800">${it.label}</div><div>${it.value || '-'}</div>`;
      if (it.href) d.addEventListener('click', () => window.open(it.href, '_blank'));
      box.appendChild(d);
    });

    const map = $('#mapFrame');
    if (s.mapEmbed) map.src = s.mapEmbed;
  }

  boot();
})();