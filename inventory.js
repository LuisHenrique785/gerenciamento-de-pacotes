const STORAGE_KEY = "inventory-system-v1";

const seedItems = [
  {
    id: "seed-001",
    name: "Notebook Dell Latitude 5440",
    sku: "TI-NB-5440",
    category: "Informática",
    quantity: 8,
    minimum: 3,
    cost: 4850,
    location: "Almoxarifado A"
  },
  {
    id: "seed-002",
    name: "Mouse sem fio Logitech",
    sku: "PER-MOU-LOG",
    category: "Periféricos",
    quantity: 2,
    minimum: 5,
    cost: 119.9,
    location: "Prateleira 2"
  },
  {
    id: "seed-003",
    name: "Etiqueta térmica 100x150",
    sku: "SUP-ETQ-100150",
    category: "Suprimentos",
    quantity: 32,
    minimum: 12,
    cost: 34.5,
    location: "Estoque B"
  },
  {
    id: "seed-004",
    name: "Roteador Wi-Fi 6",
    sku: "RED-WIFI6-AX",
    category: "Rede",
    quantity: 0,
    minimum: 2,
    cost: 389,
    location: "Almoxarifado A"
  }
];

const state = {
  items: [],
  search: "",
  category: "all",
  stockFilter: "all",
  sort: "name",
  editingId: null
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const els = {
  form: document.getElementById("itemForm"),
  itemId: document.getElementById("itemId"),
  name: document.getElementById("name"),
  sku: document.getElementById("sku"),
  category: document.getElementById("category"),
  quantity: document.getElementById("quantity"),
  minimum: document.getElementById("minimum"),
  cost: document.getElementById("cost"),
  location: document.getElementById("location"),
  rows: document.getElementById("inventoryRows"),
  emptyState: document.getElementById("emptyState"),
  resultCount: document.getElementById("resultCount"),
  categoryFilter: document.getElementById("categoryFilter"),
  categoryOptions: document.getElementById("categoryOptions"),
  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  submitLabel: document.getElementById("submitLabel"),
  formTitle: document.getElementById("formTitle"),
  btnClear: document.getElementById("btnClear"),
  btnCancelEdit: document.getElementById("btnCancelEdit"),
  btnExport: document.getElementById("btnExport"),
  fileImport: document.getElementById("fileImport"),
  toast: document.getElementById("toast"),
  metricItems: document.getElementById("metricItems"),
  metricUnits: document.getElementById("metricUnits"),
  metricLow: document.getElementById("metricLow"),
  metricValue: document.getElementById("metricValue")
};

function makeId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeItem(item) {
  return {
    id: item.id || makeId(),
    name: String(item.name || "").trim(),
    sku: String(item.sku || "").trim(),
    category: String(item.category || "").trim(),
    quantity: Math.max(0, Number(item.quantity) || 0),
    minimum: Math.max(0, Number(item.minimum) || 0),
    cost: Math.max(0, Number(item.cost) || 0),
    location: String(item.location || "").trim()
  };
}

function loadItems() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    state.items = stored ? JSON.parse(stored).map(normalizeItem) : seedItems.map(normalizeItem);
  } catch {
    state.items = seedItems.map(normalizeItem);
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function getStatus(item) {
  if (item.quantity === 0) {
    return { key: "critical", label: "Crítico", className: "badge-critical" };
  }

  if (item.quantity <= item.minimum) {
    return { key: "low", label: "Baixo", className: "badge-low" };
  }

  return { key: "ok", label: "OK", className: "badge-ok" };
}

function getCategories() {
  return [...new Set(state.items.map((item) => item.category).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
}

function updateCategoryControls() {
  const categories = getCategories();
  const currentFilter = els.categoryFilter.value || "all";

  els.categoryFilter.innerHTML = '<option value="all">Todas as categorias</option>';
  els.categoryOptions.innerHTML = "";

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    els.categoryFilter.appendChild(option);

    const dataOption = document.createElement("option");
    dataOption.value = category;
    els.categoryOptions.appendChild(dataOption);
  });

  els.categoryFilter.value = categories.includes(currentFilter) ? currentFilter : "all";
  state.category = els.categoryFilter.value;
}

function getFilteredItems() {
  const search = state.search.toLocaleLowerCase("pt-BR");

  return state.items
    .filter((item) => {
      const status = getStatus(item);
      const searchable = `${item.name} ${item.sku} ${item.category} ${item.location}`.toLocaleLowerCase("pt-BR");
      const matchesSearch = !search || searchable.includes(search);
      const matchesCategory = state.category === "all" || item.category === state.category;
      const matchesStock =
        state.stockFilter === "all" ||
        (state.stockFilter === "low" && status.key !== "ok") ||
        (state.stockFilter === "ok" && status.key === "ok");

      return matchesSearch && matchesCategory && matchesStock;
    })
    .sort((a, b) => {
      if (state.sort === "quantityAsc") return a.quantity - b.quantity;
      if (state.sort === "quantityDesc") return b.quantity - a.quantity;
      if (state.sort === "valueDesc") return b.quantity * b.cost - a.quantity * a.cost;
      return a.name.localeCompare(b.name, "pt-BR");
    });
}

function renderMetrics() {
  const totalUnits = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const lowItems = state.items.filter((item) => getStatus(item).key !== "ok").length;
  const totalValue = state.items.reduce((sum, item) => sum + item.quantity * item.cost, 0);

  els.metricItems.textContent = state.items.length;
  els.metricUnits.textContent = totalUnits;
  els.metricLow.textContent = lowItems;
  els.metricValue.textContent = currency.format(totalValue);
}

function icon(name) {
  const icons = {
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 4 4 4L8 20H4v-4L16 4Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2m-8 0 1 14h8l1-14"/></svg>'
  };

  return icons[name];
}

function createTextCell(text, className) {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = text;
  return cell;
}

function createItemCell(item) {
  const cell = document.createElement("td");
  const wrapper = document.createElement("div");
  const name = document.createElement("strong");
  const meta = document.createElement("span");

  wrapper.className = "item-name";
  name.textContent = item.name;
  meta.textContent = `${item.sku}${item.location ? ` • ${item.location}` : ""}`;

  wrapper.append(name, meta);
  cell.appendChild(wrapper);

  return cell;
}

function createStatusCell(item) {
  const cell = document.createElement("td");
  const status = getStatus(item);
  const badge = document.createElement("span");

  badge.className = `badge ${status.className}`;
  badge.textContent = status.label;
  cell.appendChild(badge);

  return cell;
}

function createStockCell(item) {
  const cell = document.createElement("td");
  const wrapper = document.createElement("div");
  const amount = document.createElement("span");
  const minus = document.createElement("button");
  const plus = document.createElement("button");

  wrapper.className = "stock-control";
  amount.className = "stock-number";
  amount.textContent = item.quantity;

  minus.className = "mini-btn";
  minus.type = "button";
  minus.title = "Diminuir estoque";
  minus.setAttribute("aria-label", `Diminuir estoque de ${item.name}`);
  minus.innerHTML = icon("minus");
  minus.addEventListener("click", () => adjustStock(item.id, -1));

  plus.className = "mini-btn";
  plus.type = "button";
  plus.title = "Aumentar estoque";
  plus.setAttribute("aria-label", `Aumentar estoque de ${item.name}`);
  plus.innerHTML = icon("plus");
  plus.addEventListener("click", () => adjustStock(item.id, 1));

  wrapper.append(minus, amount, plus);
  cell.appendChild(wrapper);

  return cell;
}

function createActionsCell(item) {
  const cell = document.createElement("td");
  const wrapper = document.createElement("div");
  const edit = document.createElement("button");
  const remove = document.createElement("button");

  wrapper.className = "row-actions";

  edit.className = "mini-btn";
  edit.type = "button";
  edit.title = "Editar item";
  edit.setAttribute("aria-label", `Editar ${item.name}`);
  edit.innerHTML = icon("edit");
  edit.addEventListener("click", () => startEdit(item.id));

  remove.className = "mini-btn danger";
  remove.type = "button";
  remove.title = "Remover item";
  remove.setAttribute("aria-label", `Remover ${item.name}`);
  remove.innerHTML = icon("trash");
  remove.addEventListener("click", () => deleteItem(item.id));

  wrapper.append(edit, remove);
  cell.appendChild(wrapper);

  return cell;
}

function renderRows() {
  const items = getFilteredItems();
  els.rows.innerHTML = "";
  els.emptyState.hidden = items.length > 0;
  els.resultCount.textContent = `${items.length} ${items.length === 1 ? "item" : "itens"}`;

  items.forEach((item) => {
    const row = document.createElement("tr");
    row.append(
      createStatusCell(item),
      createItemCell(item),
      createTextCell(item.category),
      createStockCell(item),
      createTextCell(currency.format(item.quantity * item.cost)),
      createActionsCell(item)
    );
    els.rows.appendChild(row);
  });
}

function render() {
  updateCategoryControls();
  renderMetrics();
  renderRows();
}

function readFormItem() {
  return normalizeItem({
    id: els.itemId.value || makeId(),
    name: els.name.value,
    sku: els.sku.value,
    category: els.category.value,
    quantity: els.quantity.value,
    minimum: els.minimum.value,
    cost: els.cost.value,
    location: els.location.value
  });
}

function resetForm() {
  state.editingId = null;
  els.form.reset();
  els.itemId.value = "";
  els.quantity.value = 0;
  els.minimum.value = 1;
  els.cost.value = "0.00";
  els.formTitle.textContent = "Novo item";
  els.submitLabel.textContent = "Salvar item";
  document.body.classList.remove("editing");
}

function submitItem(event) {
  event.preventDefault();
  const item = readFormItem();

  if (!item.name || !item.sku || !item.category) {
    showToast("Preencha item, SKU e categoria.");
    return;
  }

  const skuExists = state.items.some(
    (existing) => existing.sku.toLocaleLowerCase("pt-BR") === item.sku.toLocaleLowerCase("pt-BR") && existing.id !== item.id
  );

  if (skuExists) {
    showToast("Já existe um item com esse SKU.");
    return;
  }

  const index = state.items.findIndex((existing) => existing.id === item.id);
  if (index >= 0) {
    state.items[index] = item;
    showToast("Item atualizado.");
  } else {
    state.items.push(item);
    showToast("Item adicionado.");
  }

  saveItems();
  resetForm();
  render();
}

function startEdit(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;

  state.editingId = id;
  els.itemId.value = item.id;
  els.name.value = item.name;
  els.sku.value = item.sku;
  els.category.value = item.category;
  els.quantity.value = item.quantity;
  els.minimum.value = item.minimum;
  els.cost.value = item.cost;
  els.location.value = item.location;
  els.formTitle.textContent = "Editar item";
  els.submitLabel.textContent = "Atualizar item";
  document.body.classList.add("editing");
  els.name.focus();
}

function adjustStock(id, amount) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;

  item.quantity = Math.max(0, item.quantity + amount);
  saveItems();
  render();
}

function deleteItem(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;

  const confirmed = window.confirm(`Remover "${item.name}" do inventário?`);
  if (!confirmed) return;

  state.items = state.items.filter((entry) => entry.id !== id);
  if (state.editingId === id) resetForm();
  saveItems();
  render();
  showToast("Item removido.");
}

function exportItems() {
  const payload = {
    exportedAt: new Date().toISOString(),
    items: state.items
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "inventario.json";
  link.click();
  URL.revokeObjectURL(url);
}

function importItems(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const importedItems = Array.isArray(data) ? data : data.items;

      if (!Array.isArray(importedItems)) {
        throw new Error("Formato inválido");
      }

      state.items = importedItems.map(normalizeItem).filter((item) => item.name && item.sku && item.category);
      saveItems();
      resetForm();
      render();
      showToast("Inventário importado.");
    } catch {
      showToast("Arquivo JSON inválido.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

let toastTimer;
function showToast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 2400);
}

function bindEvents() {
  els.form.addEventListener("submit", submitItem);
  els.btnClear.addEventListener("click", resetForm);
  els.btnCancelEdit.addEventListener("click", resetForm);
  els.btnExport.addEventListener("click", exportItems);
  els.fileImport.addEventListener("change", importItems);

  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderRows();
  });

  els.categoryFilter.addEventListener("change", (event) => {
    state.category = event.target.value;
    renderRows();
  });

  els.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderRows();
  });

  document.querySelectorAll("[data-stock-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-stock-filter]").forEach((entry) => entry.classList.remove("active"));
      button.classList.add("active");
      state.stockFilter = button.dataset.stockFilter;
      renderRows();
    });
  });
}

loadItems();
bindEvents();
resetForm();
render();
