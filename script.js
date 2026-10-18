(() => {
  "use strict";

  // Fresh Barber Angré — numéro WhatsApp au format international, sans le 0 initial.
  const WHATSAPP_NUMBER = "225544048989";
  const products = [
    { id: "fade", name: "Dégradé Fresh", price: 3000, category: "Coupe" },
    { id: "classic", name: "Coupe classique", price: 2500, category: "Coupe" },
    { id: "beard", name: "Taille de barbe", price: 1500, category: "Barbe" },
    { id: "combo", name: "Pack Coupe + Barbe", price: 4000, category: "Pack" }
  ];
  const cart = new Map();
  const favorites = new Set();
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const formatPrice = value => `${Number(value).toLocaleString("fr-FR")} FCFA`;
  let toastTimer;

  const overlay = $("#overlay");
  const cartPanel = $("#cartPanel");
  const favPanel = $("#favPanel");
  const orderModal = $("#orderModal");
  const toast = $("#toast");

  function notify(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function showLayer(layer) {
    [cartPanel, favPanel, orderModal].forEach(item => item.hidden = item !== layer);
    overlay.hidden = false;
    document.body.classList.add("panel-open");
    $("#mainNav").classList.remove("open");
    $("#menuToggle").setAttribute("aria-expanded", "false");
  }

  function closeLayers() {
    cartPanel.hidden = true;
    favPanel.hidden = true;
    orderModal.hidden = true;
    overlay.hidden = true;
    document.body.classList.remove("panel-open");
  }

  function updateCounts() {
    const cartCount = [...cart.values()].reduce((sum, quantity) => sum + quantity, 0);
    $("#cartCountNav").textContent = cartCount;
    $("#favCountNav").textContent = favorites.size;
    $("#panelCount").textContent = `(${cartCount})`;
    $("#favPanelCount").textContent = `(${favorites.size})`;
    $("#cartTotal").textContent = formatPrice(cartTotal());
    $("#formTotal").textContent = formatPrice(cartTotal());
  }

  function cartTotal() {
    return [...cart.entries()].reduce((sum, [id, quantity]) => {
      const product = products.find(item => item.id === id);
      return sum + (product ? product.price * quantity : 0);
    }, 0);
  }

  function renderCart() {
    const container = $("#panelItems");
    container.innerHTML = "";
    if (!cart.size) {
      container.innerHTML = '<div class="empty-state"><strong>Ton panier est vide.</strong>Choisis une prestation pour préparer ta demande.</div>';
    } else {
      cart.forEach((quantity, id) => {
        const product = products.find(item => item.id === id);
        if (!product) return;
        const row = document.createElement("div");
        row.className = "cart-item";
        row.innerHTML = `
          <div><h3>${product.name}</h3><p>${product.category}</p>
            <div class="item-controls">
              <button class="qty-btn" data-qty="-1" data-id="${id}" aria-label="Diminuer la quantité">−</button>
              <span class="qty-value">${quantity}</span>
              <button class="qty-btn" data-qty="1" data-id="${id}" aria-label="Augmenter la quantité">+</button>
              <button class="remove-btn" data-remove="${id}">Retirer</button>
            </div>
          </div><div class="item-price">${formatPrice(product.price * quantity)}</div>`;
        container.appendChild(row);
      });
    }
    updateCounts();
  }

  function renderFavorites() {
    const container = $("#favItems");
    container.innerHTML = "";
    if (!favorites.size) {
      container.innerHTML = '<div class="empty-state"><strong>Aucun favori pour le moment.</strong>Appuie sur le cœur d’une prestation pour la retrouver ici.</div>';
    } else {
      favorites.forEach(id => {
        const product = products.find(item => item.id === id);
        if (!product) return;
        const row = document.createElement("div");
        row.className = "cart-item";
        row.innerHTML = `<div><h3>${product.name}</h3><p>${product.category} · ${formatPrice(product.price)}</p>
          <div class="item-controls"><button class="add-btn" data-add="${id}">+ Ajouter au panier</button>
          <button class="remove-btn" data-unfav="${id}">Retirer des favoris</button></div></div>`;
        container.appendChild(row);
      });
    }
    updateCounts();
  }

  function syncHearts() {
    $$("[data-fav]").forEach(button => {
      const active = favorites.has(button.dataset.fav);
      button.classList.toggle("active", active);
      button.textContent = active ? "♥" : "♡";
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function addToCart(id) {
    if (!products.some(product => product.id === id)) return;
    cart.set(id, (cart.get(id) || 0) + 1);
    renderCart();
    notify(`${products.find(product => product.id === id).name} ajouté au panier.`);
  }

  function toggleFavorite(id) {
    if (favorites.has(id)) {
      favorites.delete(id);
      notify("Prestation retirée des favoris.");
    } else {
      favorites.add(id);
      notify("Prestation ajoutée aux favoris.");
    }
    syncHearts();
    renderFavorites();
  }

  function openOrder() {
    if (!cart.size) {
      notify("Ajoute au moins une prestation au panier avant de commander.");
      closeLayers();
      $("#boutique").scrollIntoView({ behavior: "smooth" });
      return;
    }
    $("#formTotal").textContent = formatPrice(cartTotal());
    showLayer(orderModal);
  }

  function buildOrderMessage(formData) {
    const lines = [
      "Bonjour Fresh Barber Angré ! Je souhaite préparer une commande / demande de rendez-vous.",
      "",
      `Nom : ${formData.get("name")}`,
      `Téléphone : ${formData.get("phone")}`,
      `Date souhaitée : ${formData.get("date") || "À convenir"}`,
      `Heure souhaitée : ${formData.get("time") || "À convenir"}`,
      "",
      "Prestations :"
    ];
    cart.forEach((quantity, id) => {
      const product = products.find(item => item.id === id);
      if (product) lines.push(`- ${product.name} x${quantity} : ${formatPrice(product.price * quantity)}`);
    });
    lines.push("", `Total estimé : ${formatPrice(cartTotal())}`);
    if (formData.get("note")) lines.push("", `Précision : ${formData.get("note")}`);
    lines.push("", "Merci de me confirmer la disponibilité et les tarifs.");
    return lines.join("\n");
  }

  $("#menuToggle").addEventListener("click", () => {
    const nav = $("#mainNav");
    const open = nav.classList.toggle("open");
    $("#menuToggle").setAttribute("aria-expanded", String(open));
    $("#menuToggle").setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  });

  $$("#mainNav a").forEach(link => link.addEventListener("click", () => {
    $("#mainNav").classList.remove("open");
    $("#menuToggle").setAttribute("aria-expanded", "false");
  }));

  document.addEventListener("click", event => {
    const add = event.target.closest("[data-add]");
    const fav = event.target.closest("[data-fav]");
    const remove = event.target.closest("[data-remove]");
    const unfav = event.target.closest("[data-unfav]");
    const qty = event.target.closest("[data-qty]");
    if (add) addToCart(add.dataset.add);
    if (fav) toggleFavorite(fav.dataset.fav);
    if (remove) {
      cart.delete(remove.dataset.remove);
      renderCart();
      notify("Prestation retirée du panier.");
    }
    if (unfav) {
      favorites.delete(unfav.dataset.unfav);
      syncHearts();
      renderFavorites();
      notify("Prestation retirée des favoris.");
    }
    if (qty) {
      const id = qty.dataset.id;
      const next = (cart.get(id) || 0) + Number(qty.dataset.qty);
      if (next <= 0) cart.delete(id); else cart.set(id, next);
      renderCart();
    }
  });

  $("#openCartNav").addEventListener("click", () => { renderCart(); showLayer(cartPanel); });
  $("#openFavoritesNav").addEventListener("click", () => { renderFavorites(); showLayer(favPanel); });
  $("#bookNow").addEventListener("click", openOrder);
  $("#checkoutBtn").addEventListener("click", openOrder);
  overlay.addEventListener("click", closeLayers);
  $$("[data-close]").forEach(button => button.addEventListener("click", closeLayers));
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeLayers(); });

  $("#orderForm").addEventListener("submit", event => {
    event.preventDefault();
    if (!cart.size) {
      notify("Ton panier est vide.");
      closeLayers();
      return;
    }
    const formData = new FormData(event.currentTarget);
    const message = buildOrderMessage(formData);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    closeLayers();
    notify("Récapitulatif préparé : termine l’envoi dans WhatsApp.");
  });

  const dateInput = $("#appointmentDate");
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  dateInput.min = localDate;
  $("#year").textContent = new Date().getFullYear();
  renderCart();
  renderFavorites();
  syncHearts();
})();