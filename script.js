document.addEventListener('DOMContentLoaded', () => {
  let settings, products, categories, cart = [], favorites = [];

  // Load settings, products, and categories
  Promise.all([
    fetch('settings.json').then(res => res.json()),
    fetch('products.json').then(res => res.json()),
    fetch('categories.json').then(res => res.json())
  ])
    .then(([settingsData, productsData, categoriesData]) => {
      settings = settingsData;
      products = productsData;
      categories = categoriesData.categories;
      initialize();
    })
    .catch(err => console.error('Error loading data:', err));

  function initialize() {
    // Load saved cart and favorites
    cart = JSON.parse(localStorage.getItem('cart')) || [];
    favorites = JSON.parse(localStorage.getItem('favorites')) || [];

    // Set logo
    document.querySelectorAll('#logo, #footer-logo').forEach(logo => {
      logo.src = settings.logo;
    });

    // Set contact info
    const contactInfo = `
      <ul class="space-y-1">
        <li><a href="${settings.whatsapp}" target="_blank" class="hover:text-yellow-400 transition"><i class="fab fa-whatsapp mr-2"></i>واتساب: ${settings.whatsapp}</a></li>
        <li><a href="${settings.facebook}" target="_blank" class="hover:text-yellow-400 transition"><i class="fab fa-facebook mr-2"></i>فيسبوك</a></li>
        <li><a href="${settings.instagram}" target="_blank" class="hover:text-yellow-400 transition"><i class="fab fa-instagram mr-2"></i>إنستغرام</a></li>
        <li><i class="fas fa-phone mr-2"></i>${settings.phone}</li>
      </ul>
    `;
    document.querySelectorAll('#contact-info').forEach(el => {
      el.innerHTML = contactInfo;
    });

    // Initialize page-specific logic
    const page = window.location.pathname.split('/').pop();
    if (page === 'index.html' || page === '') initializeHome();
    else if (page === 'menu.html') initializeMenu();
    else if (page === 'product.html') initializeProduct();
    else if (page === 'favorites.html') initializeFavorites();
    else if (page === 'cart.html') initializeCart();

    // ScrollReveal animations
    ScrollReveal().reveal('.card, .favorites-card', { delay: 200, distance: '20px', origin: 'bottom', duration: 800 });
    ScrollReveal().reveal('h1, h2, h3', { delay: 100, distance: '20px', origin: 'top', duration: 800 });
  }

  function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.remove('hidden', 'opacity-0', 'bg-green-500', 'bg-red-500');
    notification.classList.add(type === 'success' ? 'bg-green-500' : 'bg-red-500', 'opacity-100');
    setTimeout(() => {
      notification.classList.add('opacity-0');
      setTimeout(() => notification.classList.add('hidden'), 300);
    }, 3000);
  }

  function initializeHome() {
    // Banner slider
    const banner = document.getElementById('banner');
    settings.bannerImages.forEach((img, index) => {
      const imgEl = document.createElement('img');
      imgEl.src = img;
      imgEl.alt = `Banner ${index + 1}`;
      imgEl.className = index === 0 ? 'active' : '';
      banner.appendChild(imgEl);
    });

    let currentBanner = 0;
    setInterval(() => {
      const images = banner.querySelectorAll('img');
      images[currentBanner].classList.remove('active');
      currentBanner = (currentBanner + 1) % images.length;
      images[currentBanner].classList.add('active');
    }, 5000);

    // Featured offers
    const featured = products.filter(p => p.popular);
    const offersContainer = document.getElementById('featured-offers');
    offersContainer.innerHTML = featured.map(product => `
      <div class="card p-4 hover-lift cursor-pointer" data-id="${product.id}" onclick="window.location.href='product.html?id=${product.id}'">
        <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover rounded-lg mb-4 image-loading" onload="this.classList.remove('image-loading')">
        <h3 class="font-tajawal font-bold text-xl">${product.name}</h3>
        <p class="text-gray-700">${product.hasSizes ? product.sizes[0].price.toFixed(2) + ' ج.م' : product.price.toFixed(2) + ' ج.م'}</p>
        <div class="flex justify-between mt-4">
          <button class="add-to-favorites bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:text-red-500 font-tajawal font-bold" data-id="${product.id}">
            <i class="fas fa-heart"></i> أضف إلى المفضلة
          </button>
          <button class="add-to-cart bg-yellow-500 text-red-900 hover:bg-yellow-600 px-4 py-2 rounded-lg font-tajawal font-bold" data-id="${product.id}">
            أضف إلى السلة
          </button>
        </div>
      </div>
    `).join('');

    addEventListeners();
  }

  function initializeMenu() {
    // Populate main categories
    const mainCategoryFilter = document.getElementById('main-category-filter');
    mainCategoryFilter.innerHTML = `
      <button class="filter-btn active" data-category="">الكل</button>
      ${categories.map(category => `
        <button class="filter-btn" data-category="${category.id}">${category.name}</button>
      `).join('')}
    `;

    // Category filter buttons
    let selectedMainCategory = '';
    document.querySelectorAll('#main-category-filter .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#main-category-filter .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedMainCategory = btn.dataset.category;

        const subCategoryFilter = document.getElementById('sub-category-filter');
        subCategoryFilter.innerHTML = '';
        subCategoryFilter.classList.add('hidden');

        if (selectedMainCategory) {
          const category = categories.find(c => c.id === selectedMainCategory);
          if (category.subCategories.length > 0) {
            subCategoryFilter.classList.remove('hidden');
            subCategoryFilter.innerHTML = `
              <button class="filter-btn active" data-subcategory="">الكل</button>
              ${category.subCategories.map(sub => `
                <button class="filter-btn" data-subcategory="${sub.id}">${sub.name}</button>
              `).join('')}
            `;
          }
        }
        filterMenu();

        // Sub-category filter buttons
        document.querySelectorAll('#sub-category-filter .filter-btn').forEach(subBtn => {
          subBtn.addEventListener('click', () => {
            document.querySelectorAll('#sub-category-filter .filter-btn').forEach(b => b.classList.remove('active'));
            subBtn.classList.add('active');
            filterMenu();
          });
        });
      });
    });

    // Search input
    document.getElementById('search-input').addEventListener('input', filterMenu);

    // Initial menu render
    filterMenu();

    function filterMenu() {
      const search = document.getElementById('search-input').value.toLowerCase();
      const mainCategory = selectedMainCategory;
      const subCategory = document.querySelector('#sub-category-filter .filter-btn.active')?.dataset.subcategory || '';
      const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(search);
        const matchesMainCategory = !mainCategory || product.category === mainCategory;
        const matchesSubCategory = !subCategory || product.subCategory === subCategory;
        return matchesSearch && matchesMainCategory && matchesSubCategory;
      });

      const menuItems = document.getElementById('menu-items');
      menuItems.innerHTML = filteredProducts.map(product => `
        <div class="card p-4 hover-lift cursor-pointer" data-id="${product.id}" onclick="window.location.href='product.html?id=${product.id}'">
          <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover rounded-lg mb-4 image-loading" onload="this.classList.remove('image-loading')">
          <h3 class="font-tajawal font-bold text-xl">${product.name}</h3>
          <p class="text-gray-700">${product.hasSizes ? product.sizes[0].price.toFixed(2) + ' ج.م' : product.price.toFixed(2) + ' ج.م'}</p>
          <div class="flex justify-between mt-4">
            <button class="add-to-favorites bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:text-red-500 font-tajawal font-bold" data-id="${product.id}">
              <i class="fas fa-heart"></i> أضف إلى المفضلة
            </button>
            <button class="add-to-cart bg-yellow-500 text-red-900 hover:bg-yellow-600 px-4 py-2 rounded-lg font-tajawal font-bold" data-id="${product.id}">
              أضف إلى السلة
            </button>
          </div>
        </div>
      `).join('');

      addEventListeners();
    }
  }

  function initializeProduct() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'));
    const product = products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('product-image').src = product.image;
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-description').textContent = product.description;
    document.getElementById('product-price').textContent = product.hasSizes ? product.sizes[0].price.toFixed(2) + ' ج.م' : product.price.toFixed(2) + ' ج.م';
    document.getElementById('add-to-favorites').dataset.id = productId;
    document.getElementById('add-to-cart').dataset.id = productId;

    const sizesContainer = document.getElementById('product-sizes');
    if (product.hasSizes) {
      sizesContainer.innerHTML = `
        <h3 class="font-tajawal font-bold text-lg mb-2">اختر الحجم</h3>
        <div class="flex space-x-4">
          ${product.sizes.map(size => `
            <label class="flex items-center space-x-2">
              <input type="radio" name="size" value="${size.size}" data-price="${size.price}" class="form-radio h-5 w-5 text-red-900 focus:ring-red-900" ${size.size === 'S' ? 'checked' : ''}>
              <span>${size.size} - ${size.price.toFixed(2)} ج.م</span>
            </label>
          `).join('')}
        </div>
      `;
      document.querySelectorAll('input[name="size"]').forEach(radio => {
        radio.addEventListener('change', () => {
          document.getElementById('product-price').textContent = radio.dataset.price + ' ج.م';
        });
      });
    } else {
      sizesContainer.innerHTML = '';
    }

    // Ensure buttons are functional
    document.getElementById('add-to-favorites').addEventListener('click', addToFavorites);
    document.getElementById('add-to-cart').addEventListener('click', addToCart);
  }

  window.addToFavorites = function() {
    const id = parseInt(document.getElementById('add-to-favorites').dataset.id);
    if (!favorites.includes(id)) {
      favorites.push(id);
      localStorage.setItem('favorites', JSON.stringify(favorites));
      showNotification('تمت الإضافة إلى المفضلة', 'success');
    } else {
      showNotification('المنتج موجود بالفعل في المفضلة', 'error');
    }
  };

  window.addToCart = function() {
    const id = parseInt(document.getElementById('add-to-cart').dataset.id);
    const product = products.find(p => p.id === id);
    const size = product.hasSizes ? document.querySelector('input[name="size"]:checked')?.value || 'S' : null;
    const cartItem = cart.find(item => item.id === id && (!item.size || item.size === size));
    if (cartItem) {
      cartItem.quantity += 1;
    } else {
      cart.push({ id, size, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    showNotification('تمت الإضافة إلى السلة', 'success');
  };

  function initializeFavorites() {
    const favoritesItems = document.getElementById('favorites-items');
    const noFavorites = document.getElementById('no-favorites');

    if (!favoritesItems || !noFavorites) {
      console.error('Favorites elements not found');
      showNotification('خطأ في تحميل صفحة المفضلة', 'error');
      return;
    }

    if (favorites.length === 0) {
      noFavorites.classList.remove('hidden');
      favoritesItems.innerHTML = '';
      return;
    }

    noFavorites.classList.add('hidden');
    favoritesItems.innerHTML = favorites.map(productId => {
      const product = products.find(p => p.id === productId);
      if (!product) return '';
      return `
        <div class="favorites-card hover-lift">
          <img src="${product.image}" alt="${product.name}" class="w-24 h-24 object-cover rounded-lg mr-4 image-loading" onload="this.classList.remove('image-loading')">
          <div class="flex-1">
            <h3 class="font-tajawal font-bold text-lg">${product.name}</h3>
            <p class="text-gray-700">${product.hasSizes ? product.sizes[0].price.toFixed(2) + ' ج.م' : product.price.toFixed(2) + ' ج.م'}</p>
          </div>
          <div class="flex space-x-4">
            <button class="remove-from-favorites bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:text-red-500 font-tajawal font-bold" data-id="${product.id}">
              <i class="fas fa-trash"></i> حذف
            </button>
            <button class="add-to-cart bg-yellow-500 text-red-900 hover:bg-yellow-600 px-4 py-2 rounded-lg font-tajawal font-bold" data-id="${product.id}">
              أضف إلى السلة
            </button>
          </div>
        </div>
      `;
    }).filter(item => item !== '').join('');

    addEventListeners();
  }

  function initializeCart() {
    const cartItems = document.getElementById('cart-items');
    const noCart = document.getElementById('no-cart');
    const cartSummary = document.getElementById('cart-summary');

    if (!cartItems || !noCart || !cartSummary) {
      console.error('Cart elements not found');
      showNotification('خطأ في تحميل صفحة السلة', 'error');
      return;
    }

    if (cart.length === 0) {
      noCart.classList.remove('hidden');
      cartSummary.classList.add('hidden');
      return;
    }

    cartSummary.classList.remove('hidden');
    cartItems.innerHTML = cart.map((item, index) => {
      const product = products.find(p => p.id === item.id);
      const price = product.hasSizes ? product.sizes.find(s => s.size === item.size).price : product.price;
      return `
        <div class="bg-gray-100 rounded-lg shadow-md p-4 flex items-center hover-lift">
          <img src="${product.image}" alt="${product.name}" class="w-20 h-20 object-cover rounded-lg mr-4 image-loading" onload="this.classList.remove('image-loading')">
          <div class="flex-1">
            <h3 class="font-tajawal font-bold text-lg">${product.name}</h3>
            <p class="text-gray-700">${item.size ? `الحجم: ${item.size} - ` : ''}${price.toFixed(2)} ج.م</p>
            <div class="flex items-center mt-2">
              <button class="decrease-quantity bg-gray-200 text-gray-900 px-2 py-1 rounded-l-lg" data-index="${index}">-</button>
              <span class="px-4">${item.quantity}</span>
              <button class="increase-quantity bg-gray-200 text-gray-900 px-2 py-1 rounded-r-lg" data-index="${index}">+</button>
            </div>
          </div>
          <button class="remove-from-cart bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:text-red-500 font-tajawal font-bold" data-index="${index}">
            <i class="fas fa-trash"></i> حذف
          </button>
        </div>
      `;
    }).join('');

    updateCartSummary();
    document.getElementById('checkout-btn').addEventListener('click', () => {
      const name = document.getElementById('customer-name').value;
      const phone = document.getElementById('customer-phone').value;
      const address = document.getElementById('customer-address').value;
      const notes = document.getElementById('customer-notes').value;

      if (!name || !phone || !address) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
      }

      let message = `طلب جديد من Mam's Pizza\n\n`;
      cart.forEach((item, index) => {
        const product = products.find(p => p.id === item.id);
        const price = product.hasSizes ? product.sizes.find(s => s.size === item.size).price : product.price;
        message += `${index + 1}) ${product.name} ${item.size ? `(الحجم: ${item.size})` : ''} - الكمية: ${item.quantity} - السعر: ${(price * item.quantity).toFixed(2)} ج.م\n`;
      });
      message += `\nالمجموع الفرعي: ${calculateSubtotal().toFixed(2)} ج.م\n`;
      message += `رسوم التوصيل: 20.00 ج.م\n`;
      message += `الإجمالي: ${(calculateSubtotal() + 20).toFixed(2)} ج.م\n\n`;
      message += `الاسم: ${name}\n`;
      message += `رقم الهاتف: ${phone}\n`;
      message += `العنوان: ${address}\n`;
      if (notes) message += `ملاحظات: ${notes}\n`;

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${settings.whatsapp.replace('+', '')}&text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      // Clear cart
      cart = [];
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartSummary();
      cartItems.innerHTML = '';
      noCart.classList.remove('hidden');
      cartSummary.classList.add('hidden');
      showNotification('تم إرسال الطلب بنجاح!', 'success');
    });

    addEventListeners();
  }

  function addEventListeners() {
    // Add to favorites
    document.querySelectorAll('.add-to-favorites').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        if (!favorites.includes(id)) {
          favorites.push(id);
          localStorage.setItem('favorites', JSON.stringify(favorites));
          showNotification('تمت الإضافة إلى المفضلة', 'success');
        } else {
          showNotification('المنتج موجود بالفعل في المفضلة', 'error');
        }
      });
    });

    // Remove from favorites
    document.querySelectorAll('.remove-from-favorites').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        favorites = favorites.filter(fav => fav !== id);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        initializeFavorites();
        showNotification('تم الحذف من المفضلة', 'success');
      });
    });

    // Add to cart
    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        const product = products.find(p => p.id === id);
        if (product.hasSizes && window.location.pathname.split('/').pop() !== 'product.html') {
          window.location.href = `product.html?id=${id}`;
          return;
        }
        const size = product.hasSizes ? document.querySelector('input[name="size"]:checked')?.value || 'S' : null;
        const cartItem = cart.find(item => item.id === id && (!item.size || item.size === size));
        if (cartItem) {
          cartItem.quantity += 1;
        } else {
          cart.push({ id, size, quantity: 1 });
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        showNotification('تمت الإضافة إلى السلة', 'success');
      });
    });

    // Remove from cart
    document.querySelectorAll('.remove-from-cart').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        cart.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cart));
        initializeCart();
        showNotification('تم الحذف من السلة', 'success');
      });
    });

    // Increase/Decrease quantity
    document.querySelectorAll('.increase-quantity').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        cart[index].quantity += 1;
        localStorage.setItem('cart', JSON.stringify(cart));
        initializeCart();
      });
    });

    document.querySelectorAll('.decrease-quantity').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        if (cart[index].quantity > 1) {
          cart[index].quantity -= 1;
          localStorage.setItem('cart', JSON.stringify(cart));
          initializeCart();
        }
      });
    });
  }

  function updateCartSummary() {
    const subtotal = calculateSubtotal();
    document.getElementById('subtotal').textContent = subtotal.toFixed(2) + ' ج.م';
    document.getElementById('total').textContent = (subtotal + 20).toFixed(2) + ' ج.م';
  }

  function calculateSubtotal() {
    return cart.reduce((sum, item) => {
      const product = products.find(p => p.id === item.id);
      const price = product.hasSizes ? product.sizes.find(s => s.size === item.size).price : product.price;
      return sum + price * item.quantity;
    }, 0);
  }
});