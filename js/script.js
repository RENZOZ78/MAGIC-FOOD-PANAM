/* =====================================================================
   MAGIC FOOD PANAM – script principal
   Panier, favoris, recherche, filtres, formulaires, thème et effets.
   ===================================================================== */
(() => {
  'use strict';

  /* ---------- Utilitaires ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = reducedMotion ? 'auto' : 'smooth';
  const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* stockage indisponible */ }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (e) { /* stockage indisponible */ }
    }
  };

  const normalize = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /* ---------- Notifications (toasts) ---------- */
  const toastContainer = $('#toast-container');
  function toast(message, type = 'info', duration = 3200) {
    if (!toastContainer) return;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<i class="fas ${icons[type] || icons.info}" aria-hidden="true"></i><span></span>`;
    el.querySelector('span').textContent = message;
    toastContainer.appendChild(el);
    while (toastContainer.children.length > 3) toastContainer.firstElementChild.remove();
    setTimeout(() => {
      el.classList.add('hide');
      el.addEventListener('animationend', () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 600);
    }, duration);
  }

  /* ---------- Thème clair / sombre ---------- */
  const themeToggles = $$('[data-theme-toggle]');
  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    const dark = theme === 'dark';
    themeToggles.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Activer le mode clair' : 'Activer le mode sombre');
      const icon = btn.querySelector('i');
      if (icon) icon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
      const label = btn.querySelector('span');
      if (label) label.textContent = dark ? 'Mode clair' : 'Mode sombre';
    });
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0f1117' : '#27ae60');
    if (persist) store.set('mf-theme', theme);
  }
  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);
  themeToggles.forEach((btn) => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
    toast(next === 'dark' ? 'Mode sombre activé' : 'Mode clair activé', 'info', 1800);
  }));

  /* ---------- Hauteur du header (utilisée par le CSS) ---------- */
  const header = $('#header');
  function syncHeaderHeight() {
    if (header) root.style.setProperty('--header-h', `${header.offsetHeight}px`);
  }
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight);

  /* ---------- Panneaux : menu mobile, recherche, panier, connexion ---------- */
  const navbar = $('#navbar');
  const backdrop = $('#backdrop');
  const panels = {
    nav: { btn: $('#menu-btn'), panel: navbar, aria: false },
    search: { btn: $('#search-btn'), panel: $('#search-panel'), focus: '#search-box' },
    cart: { btn: $('#cart-btn'), panel: $('#cart-drawer'), backdrop: true },
    login: { btn: $('#login-btn'), panel: $('#login-modal'), backdrop: true, focus: 'input:not([disabled]):not([type="checkbox"])' }
  };
  let openKey = null;

  function closeAll() {
    Object.values(panels).forEach((p) => {
      p.panel?.classList.remove('active');
      if (p.aria !== false) p.panel?.setAttribute('aria-hidden', 'true');
      p.btn?.setAttribute('aria-expanded', 'false');
    });
    const menuIcon = panels.nav.btn?.querySelector('i');
    if (menuIcon) menuIcon.className = 'fas fa-bars';
    backdrop?.classList.remove('active');
    document.body.classList.remove('no-scroll');
    openKey = null;
  }

  function openPanel(key) {
    const p = panels[key];
    if (!p?.panel) return;
    closeAll();
    p.panel.classList.add('active');
    if (p.aria !== false) p.panel.setAttribute('aria-hidden', 'false');
    p.btn?.setAttribute('aria-expanded', 'true');
    if (p.backdrop) {
      backdrop?.classList.add('active');
      document.body.classList.add('no-scroll');
    }
    if (key === 'nav') {
      const menuIcon = p.btn?.querySelector('i');
      if (menuIcon) menuIcon.className = 'fas fa-xmark';
    }
    openKey = key;
    if (p.focus) setTimeout(() => p.panel.querySelector(p.focus)?.focus({ preventScroll: true }), 300);
  }

  function togglePanel(key) { openKey === key ? closeAll() : openPanel(key); }

  Object.entries(panels).forEach(([key, p]) => {
    p.btn?.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(key); });
  });
  backdrop?.addEventListener('click', closeAll);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openKey) closeAll(); });
  document.addEventListener('click', (e) => {
    if (!openKey) return;
    if (e.target.closest('[data-close]')) { closeAll(); return; }
    if (openKey === 'cart' || openKey === 'login') return; // fermés via le fond assombri
    if (!e.target.closest('.header, .search-form-container')) closeAll();
  });
  navbar?.addEventListener('click', (e) => { if (e.target.closest('a')) closeAll(); });
  $$('[data-open]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); openPanel(el.dataset.open); }));

  /* ---------- Header compact, retour en haut, lien actif ---------- */
  const backToTop = $('#back-to-top');
  let ticking = false;
  let wasScrolled = false;
  function onScroll() {
    const y = window.scrollY;
    const scrolled = y > 40;
    header?.classList.toggle('scrolled', scrolled);
    if (scrolled !== wasScrolled) {
      wasScrolled = scrolled;
      setTimeout(syncHeaderHeight, 450); // après la transition du header compact
    }
    if (backToTop) {
      const max = root.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(100, (y / max) * 100) : 0;
      backToTop.style.setProperty('--progress', `${pct}%`);
      backToTop.classList.toggle('show', y > 400);
    }
    if (openKey === 'nav') closeAll();
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();
  backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: scrollBehavior }));

  const navLinks = $$('.navbar a[href^="#"]');
  const navSections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && navSections.length) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === id));
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
    navSections.forEach((s) => navObserver.observe(s));
  }

  /* ---------- Apparition au défilement ---------- */
  $$('[data-reveal-children]').forEach((container) => {
    Array.from(container.children).forEach((child, i) => {
      child.classList.add('reveal');
      child.style.setProperty('--i', i % 8);
    });
  });
  $$('[data-reveal]').forEach((el, i) => { el.classList.add('reveal'); el.style.setProperty('--i', i % 8); });

  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -4% 0px' });
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  /* ---------- Parallaxe et inclinaison 3D dans l'accueil ---------- */
  const home = $('.home');
  const parallaxImg = $('.home .home-parallax-img');
  const homeImageWrap = $('.home .image');
  if (home && parallaxImg && !reducedMotion && window.matchMedia('(hover: hover)').matches) {
    let targetX = 0, targetY = 0, curX = 0, curY = 0, raf = null;
    const animate = () => {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      parallaxImg.style.transform = `translate3d(${curX}px, ${curY}px, 0)`;
      if (homeImageWrap) homeImageWrap.style.transform = `perspective(120rem) rotateY(${curX * -0.18}deg) rotateX(${curY * 0.18}deg)`;
      if (Math.abs(targetX - curX) > 0.05 || Math.abs(targetY - curY) > 0.05) raf = requestAnimationFrame(animate);
      else raf = null;
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(animate); };
    home.addEventListener('mousemove', (e) => {
      const r = home.getBoundingClientRect();
      targetX = ((e.clientX - r.left) / r.width - 0.5) * -40;
      targetY = ((e.clientY - r.top) / r.height - 0.5) * -30;
      schedule();
    });
    home.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; schedule(); });
  }

  /* ---------- Catalogue des produits (lu depuis le HTML) ---------- */
  const products = new Map();
  $$('.product[data-id]').forEach((el) => {
    const id = el.dataset.id;
    if (products.has(id)) return;
    products.set(id, {
      id,
      name: el.dataset.name || el.querySelector('h3')?.textContent.trim() || id,
      price: parseFloat(el.dataset.price) || 0,
      category: (el.dataset.category || '').split(/\s+/).filter(Boolean),
      img: el.querySelector('img')?.getAttribute('src') || '',
      el
    });
  });

  /* ---------- Favoris ---------- */
  const favs = new Set(store.get('mf-favs', []));
  function renderFavs() {
    $$('.fav-btn').forEach((btn) => {
      const id = btn.closest('.product')?.dataset.id;
      const on = favs.has(id);
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', String(on));
      const icon = btn.querySelector('i');
      if (icon) icon.className = on ? 'fas fa-heart' : 'far fa-heart';
    });
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.fav-btn');
    if (!btn) return;
    const id = btn.closest('.product')?.dataset.id;
    if (!id || !products.has(id)) return;
    if (favs.has(id)) {
      favs.delete(id);
      toast('Retiré de vos favoris', 'info');
    } else {
      favs.add(id);
      btn.classList.add('pop');
      btn.addEventListener('animationend', () => btn.classList.remove('pop'), { once: true });
      toast(`${products.get(id).name} ajouté à vos favoris`, 'success');
    }
    store.set('mf-favs', [...favs]);
    renderFavs();
    if (currentFilter === 'favorites') applyFilter('favorites');
  });
  renderFavs();

  /* ---------- Filtres par catégorie ---------- */
  let currentFilter = 'all';
  const EMPTY_MESSAGES = {
    favorites: 'Vous n’avez pas encore de favoris. Cliquez sur le cœur d’un plat pour l’ajouter.',
    'café': 'Notre carte café arrive très bientôt ! En attendant, découvrez nos autres plats.',
    default: 'Aucun plat dans cette catégorie pour le moment.'
  };
  function applyFilter(filter) {
    currentFilter = filter;
    $$('.filter-bar [data-filter]').forEach((chip) => {
      const on = chip.dataset.filter === filter;
      chip.classList.toggle('active', on);
      chip.setAttribute('aria-pressed', String(on));
    });
    $$('.category .box[data-category]').forEach((b) => b.classList.toggle('active', b.dataset.category === filter));
    $$('.product-grid').forEach((grid) => {
      let visible = 0;
      $$('.product', grid).forEach((p) => {
        const cats = (p.dataset.category || '').split(/\s+/);
        const show = filter === 'all' || (filter === 'favorites' ? favs.has(p.dataset.id) : cats.includes(filter));
        p.hidden = !show;
        if (show) visible++;
      });
      const empty = grid.parentElement.querySelector('.empty-state');
      if (empty) {
        empty.hidden = visible > 0;
        empty.textContent = EMPTY_MESSAGES[filter] || EMPTY_MESSAGES.default;
      }
    });
  }
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-filter], .category .box[data-category]');
    if (!trigger) return;
    e.preventDefault();
    const filter = trigger.dataset.filter || trigger.dataset.category;
    applyFilter(filter);
    if (!trigger.closest('.filter-bar')) {
      $('#popular')?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
    }
  });

  /* ---------- Panier ---------- */
  const DELIVERY_FEE = 2.9;
  const FREE_DELIVERY_FROM = 25;
  const MAX_QTY = 20;
  const cart = { items: store.get('mf-cart', {}) };
  const cartItemsEl = $('#cart-items');
  const cartEmptyEl = $('#cart-empty');
  const cartCountEl = $('#cart-count');
  const cartLabelEl = $('#cart-items-label');
  const cartSubtotalEl = $('#cart-subtotal');
  const cartDeliveryEl = $('#cart-delivery');
  const cartTotalEl = $('#cart-total');
  const freeDeliveryEl = $('#free-delivery');
  const checkoutBtn = $('#checkout-btn');
  const clearCartBtn = $('#clear-cart-btn');

  if (typeof cart.items !== 'object' || cart.items === null || Array.isArray(cart.items)) cart.items = {};

  const cartEntries = () => Object.entries(cart.items).filter(([id, qty]) => products.has(id) && qty > 0);
  function cartTotals() {
    const entries = cartEntries();
    const sub = entries.reduce((s, [id, q]) => s + products.get(id).price * q, 0);
    const count = entries.reduce((s, [, q]) => s + q, 0);
    const delivery = sub === 0 || sub >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
    return { sub, count, delivery, total: sub + delivery };
  }
  const saveCart = () => store.set('mf-cart', cart.items);

  function bumpBadge() {
    if (!cartCountEl) return;
    cartCountEl.classList.remove('bump');
    void cartCountEl.offsetWidth;
    cartCountEl.classList.add('bump');
  }

  function renderCart() {
    if (!cartItemsEl) return;
    const entries = cartEntries();
    const t = cartTotals();

    cartItemsEl.innerHTML = '';
    entries.forEach(([id, qty], i) => {
      const p = products.get(id);
      const box = document.createElement('div');
      box.className = 'box';
      box.dataset.id = id;
      box.style.animationDelay = `${i * 50}ms`;
      box.innerHTML = `
        <button type="button" class="remove" aria-label="Retirer ${escapeHtml(p.name)} du panier"><i class="fas fa-times" aria-hidden="true"></i></button>
        <img src="${escapeHtml(p.img)}" alt="">
        <div class="content">
          <h3></h3>
          <div class="qty">
            <button type="button" data-step="-1" aria-label="Diminuer la quantité">−</button>
            <input type="number" min="1" max="${MAX_QTY}" value="${qty}" aria-label="Quantité de ${escapeHtml(p.name)}">
            <button type="button" data-step="1" aria-label="Augmenter la quantité">+</button>
          </div>
          <span class="price">${euro.format(p.price * qty)}</span>
        </div>`;
      box.querySelector('h3').textContent = p.name;
      cartItemsEl.appendChild(box);
    });

    if (cartEmptyEl) cartEmptyEl.hidden = entries.length > 0;
    if (cartCountEl) { cartCountEl.textContent = t.count; cartCountEl.hidden = t.count === 0; }
    if (cartLabelEl) cartLabelEl.textContent = `(${t.count} article${t.count > 1 ? 's' : ''})`;
    if (cartSubtotalEl) cartSubtotalEl.textContent = euro.format(t.sub);
    if (cartDeliveryEl) cartDeliveryEl.textContent = t.sub === 0 ? euro.format(DELIVERY_FEE) : (t.delivery ? euro.format(t.delivery) : 'Offerte');
    if (cartTotalEl) cartTotalEl.textContent = euro.format(t.total);
    if (freeDeliveryEl) {
      const remaining = Math.max(0, FREE_DELIVERY_FROM - t.sub);
      const bar = freeDeliveryEl.querySelector('.bar span');
      const text = freeDeliveryEl.querySelector('p');
      if (bar) bar.style.width = `${Math.min(100, (t.sub / FREE_DELIVERY_FROM) * 100)}%`;
      if (text) text.textContent = remaining > 0 ? `Plus que ${euro.format(remaining)} pour la livraison offerte` : 'Livraison offerte 🎉';
    }
    if (checkoutBtn) checkoutBtn.disabled = entries.length === 0;
    if (clearCartBtn) clearCartBtn.hidden = entries.length === 0;
    syncOrderForm();
  }

  function setQty(id, qty) {
    if (!products.has(id)) return;
    if (qty <= 0) delete cart.items[id];
    else cart.items[id] = Math.min(MAX_QTY, qty);
    saveCart();
    renderCart();
  }

  function flyToCart(sourceEl, id) {
    const cartBtn = panels.cart.btn;
    const p = products.get(id);
    if (!sourceEl || !cartBtn || !p?.img || reducedMotion || typeof sourceEl.animate !== 'function') { bumpBadge(); return; }
    const from = sourceEl.getBoundingClientRect();
    const to = cartBtn.getBoundingClientRect();
    if (!from.width || !to.width) { bumpBadge(); return; }
    const size = Math.max(40, Math.min(from.width, from.height, 90));
    const img = document.createElement('img');
    img.src = p.img;
    img.alt = '';
    img.className = 'fly-img';
    img.style.cssText = `left:${from.left + from.width / 2 - size / 2}px;top:${from.top + from.height / 2 - size / 2}px;width:${size}px;height:${size}px;`;
    document.body.appendChild(img);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const anim = img.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 120}px) scale(.85)`, opacity: .95, offset: .5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.15)`, opacity: .3 }
    ], { duration: 800, easing: 'cubic-bezier(.4, 0, .2, 1)' });
    anim.onfinish = () => { img.remove(); bumpBadge(); };
    anim.oncancel = () => img.remove();
  }

  function addToCart(id, sourceEl) {
    if (!products.has(id)) return;
    const current = cart.items[id] || 0;
    if (current >= MAX_QTY) { toast(`Quantité maximale atteinte pour ${products.get(id).name}`, 'error'); return; }
    cart.items[id] = current + 1;
    saveCart();
    renderCart();
    flyToCart(sourceEl, id);
    toast(`${products.get(id).name} ajouté au panier`, 'success');
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart, [data-add]');
    if (!btn) return;
    e.preventDefault();
    const product = btn.closest('.product');
    const id = btn.dataset.add || product?.dataset.id;
    const sourceEl = product?.querySelector('img') || btn.closest('li')?.querySelector('img') || btn;
    addToCart(id, sourceEl);
  });

  cartItemsEl?.addEventListener('click', (e) => {
    const box = e.target.closest('.box');
    if (!box) return;
    const id = box.dataset.id;
    if (e.target.closest('.remove')) {
      setQty(id, 0);
      toast('Article retiré du panier', 'info');
      return;
    }
    const step = e.target.closest('[data-step]');
    if (step) setQty(id, (cart.items[id] || 0) + Number(step.dataset.step));
  });
  cartItemsEl?.addEventListener('change', (e) => {
    if (!e.target.matches('input[type="number"]')) return;
    const id = e.target.closest('.box')?.dataset.id;
    setQty(id, Math.max(1, parseInt(e.target.value, 10) || 1));
  });
  clearCartBtn?.addEventListener('click', () => {
    cart.items = {};
    saveCart();
    renderCart();
    toast('Panier vidé', 'info');
  });
  checkoutBtn?.addEventListener('click', () => {
    closeAll();
    $('#order')?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
    setTimeout(() => $('#o-name')?.focus({ preventScroll: true }), 700);
  });

  /* ---------- Recherche ---------- */
  const searchForm = $('#search-form');
  const searchBox = $('#search-box');
  const searchResults = $('#search-results');

  function findProducts(query) {
    const q = normalize(query);
    if (!q) return [];
    return [...products.values()].filter((p) => normalize(p.name).includes(q) || p.category.some((c) => normalize(c).includes(q)));
  }

  function highlightMatch(name, query) {
    const q = query.trim();
    if (!q) return escapeHtml(name);
    const re = new RegExp(`(${escapeRegExp(q)})`, 'i');
    return escapeHtml(name).replace(re, '<mark>$1</mark>');
  }

  function renderSearch(query) {
    if (!searchResults) return;
    searchResults.innerHTML = '';
    if (!query.trim()) {
      searchResults.innerHTML = '<p class="hint">Tapez le nom d’un plat ou d’une catégorie : pizza, burger, poulet, gyozas…</p>';
      return;
    }
    const matches = findProducts(query);
    if (!matches.length) {
      searchResults.innerHTML = `<p class="hint">Aucun plat trouvé pour « ${escapeHtml(query.trim())} ». Essayez « pizza » ou « burger ».</p>`;
      return;
    }
    const list = document.createElement('ul');
    list.className = 'results-list';
    matches.slice(0, 8).forEach((p, i) => {
      const li = document.createElement('li');
      li.style.animationDelay = `${i * 40}ms`;
      li.innerHTML = `
        <img src="${escapeHtml(p.img)}" alt="">
        <div><h4>${highlightMatch(p.name, query)}</h4><span>${euro.format(p.price)}</span></div>
        <button type="button" class="btn small" data-add="${escapeHtml(p.id)}"><i class="fas fa-cart-plus" aria-hidden="true"></i> Ajouter</button>
        <a href="#${escapeHtml(p.el.closest('section')?.id || 'popular')}" class="goto" data-goto="${escapeHtml(p.id)}" aria-label="Voir ${escapeHtml(p.name)}"><i class="fas fa-arrow-right" aria-hidden="true"></i></a>`;
      list.appendChild(li);
    });
    searchResults.appendChild(list);
  }

  function goToProduct(id) {
    const p = products.get(id);
    if (!p) return;
    closeAll();
    if (p.el.hidden) applyFilter('all');
    p.el.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
    p.el.classList.remove('highlight');
    void p.el.offsetWidth;
    p.el.classList.add('highlight');
    setTimeout(() => p.el.classList.remove('highlight'), 2000);
  }

  searchBox?.addEventListener('input', () => renderSearch(searchBox.value));
  searchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const matches = findProducts(searchBox.value);
    if (matches.length) goToProduct(matches[0].id);
    else if (searchBox.value.trim()) toast('Aucun plat ne correspond à votre recherche', 'error');
  });
  searchResults?.addEventListener('click', (e) => {
    const goto = e.target.closest('[data-goto]');
    if (goto) { e.preventDefault(); goToProduct(goto.dataset.goto); }
  });
  renderSearch('');

  /* ---------- Validation des formulaires ---------- */
  const PHONE_RE = /^(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function fieldWrapper(input) {
    return input.closest('.inputBox, .field') || input.parentElement;
  }

  function validateField(input) {
    if (input.disabled || input.readOnly || input.closest('[hidden]')) return true;
    const value = input.value.trim();
    let msg = '';
    if (input.required && !value) msg = 'Ce champ est obligatoire.';
    else if (value && input.type === 'email' && !EMAIL_RE.test(value)) msg = 'Adresse e-mail invalide.';
    else if (value && input.type === 'tel' && !PHONE_RE.test(value)) msg = 'Numéro invalide (ex : 06 12 34 56 78).';
    else if (value && input.type === 'password' && value.length < 6) msg = 'Au moins 6 caractères.';
    else if (value && input.minLength > 0 && value.length < input.minLength) msg = `Au moins ${input.minLength} caractères.`;
    else if (value && input.type === 'datetime-local') {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) msg = 'Date invalide.';
      else if (d.getTime() < Date.now() + 15 * 60 * 1000) msg = 'Prévoyez au moins 15 minutes de préparation.';
    }
    const wrap = fieldWrapper(input);
    wrap.classList.toggle('invalid', Boolean(msg));
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    let err = wrap.querySelector(':scope > .error-msg');
    if (!err) {
      err = document.createElement('small');
      err.className = 'error-msg';
      wrap.appendChild(err);
    }
    err.textContent = msg;
    return !msg;
  }

  function validateForm(form) {
    let firstInvalid = null;
    $$('input:not([type="checkbox"]):not([type="submit"]):not([type="button"]), textarea, select', form).forEach((input) => {
      if (!validateField(input) && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) firstInvalid.focus({ preventScroll: false });
    return !firstInvalid;
  }

  function liveValidation(form) {
    form.addEventListener('input', (e) => {
      if (e.target.matches('input, textarea, select') && fieldWrapper(e.target).classList.contains('invalid')) validateField(e.target);
    });
    form.addEventListener('focusout', (e) => {
      if (e.target.matches('input:not([type="checkbox"]):not([type="submit"]), textarea, select') && e.target.value.trim()) validateField(e.target);
    });
  }

  /* ---------- Connexion / création de compte ---------- */
  const loginForm = $('#login-form');
  const loggedInPanel = $('#logged-in');
  const nameField = $('#name-field');
  const nameInput = $('#login-name');
  const loginTitle = $('#login-title');
  const loginSubmit = $('#login-submit');
  const toggleSignup = $('#toggle-signup');
  const signupText = $('#signup-text');
  const userDot = $('#user-dot');
  let signupMode = false;

  function setSignupMode(on) {
    signupMode = on;
    if (nameField) nameField.hidden = !on;
    if (nameInput) nameInput.disabled = !on;
    if (loginTitle) loginTitle.textContent = on ? 'Créer un compte' : 'Connexion';
    if (loginSubmit) loginSubmit.value = on ? 'Créer mon compte' : 'Se connecter';
    if (signupText && toggleSignup) {
      signupText.firstChild.textContent = on ? 'Vous avez déjà un compte ? ' : 'Vous n’avez pas de compte ? ';
      toggleSignup.textContent = on ? 'Se connecter' : 'Créer un compte';
    }
    $('#login-password')?.setAttribute('autocomplete', on ? 'new-password' : 'current-password');
  }

  function renderUser() {
    const user = store.get('mf-user', null);
    const logged = Boolean(user?.email);
    if (loginForm) loginForm.hidden = logged;
    if (loggedInPanel) loggedInPanel.hidden = !logged;
    if (userDot) userDot.hidden = !logged;
    panels.login.btn?.setAttribute('aria-label', logged ? 'Mon compte' : 'Se connecter');
    if (logged) {
      const nameEl = $('#user-name');
      const emailEl = $('#user-email');
      if (nameEl) nameEl.textContent = user.name || user.email.split('@')[0];
      if (emailEl) emailEl.textContent = user.email;
    }
  }

  toggleSignup?.addEventListener('click', (e) => { e.preventDefault(); setSignupMode(!signupMode); nameInput?.focus(); });
  $('#forgot-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    const email = $('#login-email')?.value.trim();
    if (email && EMAIL_RE.test(email)) toast(`Un lien de réinitialisation a été envoyé à ${email}`, 'success', 4500);
    else { toast('Saisissez d’abord votre adresse e-mail', 'error'); $('#login-email')?.focus(); }
  });

  if (loginForm) {
    liveValidation(loginForm);
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateForm(loginForm)) return;
      const email = $('#login-email').value.trim();
      const name = signupMode ? nameInput.value.trim() : '';
      const remember = $('#remember-me')?.checked;
      const user = { email, name, remember: Boolean(remember), since: Date.now() };
      store.set('mf-user', user);
      toast(signupMode ? `Bienvenue ${name} ! Votre compte est créé.` : `Ravi de vous revoir, ${name || email} !`, 'success', 4000);
      loginForm.reset();
      setSignupMode(false);
      renderUser();
      const orderName = $('#o-name');
      if (orderName && !orderName.value && name) orderName.value = name;
      setTimeout(closeAll, 400);
    });
  }
  $('#logout-btn')?.addEventListener('click', () => {
    store.remove('mf-user');
    renderUser();
    toast('Vous êtes déconnecté(e). À bientôt !', 'info');
    closeAll();
  });
  renderUser();

  /* ---------- Formulaire de commande ---------- */
  const orderForm = $('#order-form');
  const orderItems = $('#o-items');
  const orderAmount = $('#o-amount');
  const orderMode = $('#o-mode');
  const orderTime = $('#o-time');
  const orderSuccess = $('#order-success');

  function toLocalInputValue(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function setPickupDefaults() {
    if (!orderTime) return;
    const min = new Date(Date.now() + 15 * 60 * 1000);
    const suggested = new Date(Date.now() + 45 * 60 * 1000);
    suggested.setMinutes(Math.ceil(suggested.getMinutes() / 15) * 15, 0, 0);
    orderTime.min = toLocalInputValue(min);
    if (!orderTime.value) orderTime.value = toLocalInputValue(suggested);
  }

  function syncOrderForm() {
    if (!orderItems || !orderAmount) return;
    const entries = cartEntries();
    const t = cartTotals();
    const manual = orderItems.dataset.manual === 'true';
    if (entries.length && !manual) {
      orderItems.value = entries.map(([id, q]) => `${q} × ${products.get(id).name}`).join('\n');
    } else if (!entries.length && !manual) {
      orderItems.value = '';
    }
    if (!entries.length) {
      orderAmount.value = '—';
      return;
    }
    const pickup = orderMode?.value === 'emporter';
    const total = pickup ? t.sub : t.total;
    let detail = '';
    if (pickup) detail = ' (à emporter, sans frais)';
    else detail = t.delivery ? ` (dont livraison ${euro.format(t.delivery)})` : ' (livraison offerte)';
    orderAmount.value = euro.format(total) + detail;
  }

  orderItems?.addEventListener('input', () => {
    orderItems.dataset.manual = orderItems.value.trim() ? 'true' : 'false';
    if (!orderItems.value.trim()) syncOrderForm();
  });
  orderMode?.addEventListener('change', () => {
    const addressBox = $('#o-address');
    if (addressBox) {
      addressBox.required = orderMode.value !== 'emporter';
      const label = fieldWrapper(addressBox).querySelector('label');
      if (label) label.textContent = orderMode.value === 'emporter' ? 'Votre adresse (facultatif)' : 'Votre adresse';
      if (!addressBox.required) { fieldWrapper(addressBox).classList.remove('invalid'); const err = fieldWrapper(addressBox).querySelector('.error-msg'); if (err) err.textContent = ''; }
    }
    syncOrderForm();
  });
  $('#order-success-close')?.addEventListener('click', () => { if (orderSuccess) orderSuccess.hidden = true; });

  if (orderForm) {
    liveValidation(orderForm);
    setPickupDefaults();
    const prefillUser = store.get('mf-user', null);
    const nameBox = $('#o-name');
    if (prefillUser?.name && nameBox && !nameBox.value) nameBox.value = prefillUser.name;

    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateForm(orderForm)) { toast('Veuillez corriger les champs en rouge.', 'error'); return; }
      const submitBtn = orderForm.querySelector('[type="submit"]');
      const icon = submitBtn?.querySelector('i');
      submitBtn?.classList.add('loading');
      if (submitBtn) submitBtn.disabled = true;
      if (icon) icon.className = 'fas fa-spinner';

      // Simulation d'envoi (pas de serveur) : confirmation après un court délai
      setTimeout(() => {
        const number = `MF-${Math.floor(1000 + Math.random() * 9000)}`;
        const name = $('#o-name').value.trim();
        const when = orderTime?.value ? new Date(orderTime.value) : null;
        const whenText = when && !Number.isNaN(when.getTime())
          ? when.toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })
          : 'dès que possible';
        const mode = orderMode?.value === 'emporter' ? 'à emporter' : 'en livraison';
        const amount = orderAmount?.value && orderAmount.value !== '—' ? ` Montant : ${orderAmount.value.split(' (')[0]}.` : '';
        if (orderSuccess) {
          $('#order-success-text').textContent = `Merci ${name} ! Votre commande n° ${number} ${mode} est prévue ${whenText}.${amount} Un SMS de confirmation vous sera envoyé.`;
          orderSuccess.hidden = false;
          orderSuccess.classList.add('visible');
          orderSuccess.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
        }
        toast(`Commande ${number} confirmée !`, 'success', 5000);
        cart.items = {};
        saveCart();
        orderForm.reset();
        orderItems.dataset.manual = 'false';
        if (prefillUser?.name && nameBox) nameBox.value = prefillUser.name;
        setPickupDefaults();
        renderCart();
        orderForm.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
        submitBtn?.classList.remove('loading');
        if (submitBtn) submitBtn.disabled = false;
        if (icon) icon.className = 'fas fa-paper-plane';
      }, 900);
    });
  }

  /* ---------- Newsletter ---------- */
  const newsletterForm = $('#newsletter-form');
  if (newsletterForm) {
    liveValidation(newsletterForm);
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector('input[type="email"]');
      if (!validateField(input)) { input.focus(); return; }
      const list = new Set(store.get('mf-newsletter', []));
      if (list.has(input.value.trim().toLowerCase())) {
        toast('Vous êtes déjà abonné(e) à notre newsletter.', 'info');
      } else {
        list.add(input.value.trim().toLowerCase());
        store.set('mf-newsletter', [...list]);
        toast('Merci ! Vous êtes abonné(e) à notre newsletter.', 'success', 4000);
      }
      newsletterForm.reset();
    });
  }

  /* ---------- Blog : lire la suite ---------- */
  $$('.read-more').forEach((btn) => {
    btn.addEventListener('click', () => {
      const more = btn.parentElement.querySelector('.more');
      if (!more) return;
      const open = more.hidden;
      more.hidden = !open;
      btn.textContent = open ? 'Réduire' : 'Lire la suite';
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- Divers ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Liens « # » sans destination : on évite le saut en haut de page
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href="#"]');
    if (a && !a.dataset.filter && !a.dataset.open && !a.dataset.close) {
      e.preventDefault();
      if (a.closest('.share')) toast('Nos réseaux sociaux arrivent bientôt !', 'info', 2200);
      else if (a.closest('.footer')) toast('Cette page sera bientôt disponible.', 'info', 2200);
    }
  });

  // Rendu initial du panier (après que tout est en place)
  renderCart();
})();
