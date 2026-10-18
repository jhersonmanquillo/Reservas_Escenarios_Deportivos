const $ = (selector) => document.querySelector(selector);
let currentUser = null;
let scenarios = [];

function showMessage(message, isError = false) {
  const box = $("#message");
  box.replaceChildren();
  const item = document.createElement("div");
  item.className = `notice${isError ? " error" : ""}`;
  item.textContent = message;
  box.append(item);
  window.setTimeout(() => { if (box.contains(item)) item.remove(); }, 5000);
}
function formatDate(value) {
  return new Date(value).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}
function safeText(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
async function loadScenarios() {
  const result = await api("/api/scenarios");
  scenarios = result.scenarios;
  const grid = $("#scenarios");
  const select = $("#scenario-select");
  grid.replaceChildren();
  select.replaceChildren();
  scenarios.forEach((scenario) => {
    const card = document.createElement("article");
    card.className = "scenario-card";
    card.append(safeText("h4", scenario.name));
    card.append(safeText("p", `Deporte: ${scenario.sport}`));
    card.append(safeText("p", `Ubicación: ${scenario.location}`));
    card.append(safeText("p", `Capacidad: ${scenario.capacity} personas`));
    card.append(safeText("span", scenario.active ? "Activo" : "Inactivo", "status"));
    grid.append(card);
    if (scenario.active) {
      const option = document.createElement("option");
      option.value = scenario.id;
      option.textContent = scenario.name;
      select.append(option);
    }
  });
}
async function loadReservations() {
  const { reservations } = await api("/api/reservations/mine");
  const list = $("#my-reservations");
  list.replaceChildren();
  if (!reservations.length) list.append(safeText("p", "Todavía no tienes reservas."));
  reservations.forEach((reservation) => {
    const scenario = scenarios.find((item) => item.id === reservation.scenarioId);
    const card = document.createElement("article");
    card.className = "reservation-card";
    const info = document.createElement("div");
    info.append(safeText("strong", scenario ? scenario.name : "Escenario"));
    info.append(safeText("p", `${formatDate(reservation.start)} – ${formatDate(reservation.end)}`));
    info.append(safeText("span", reservation.status, "status"));
    if (reservation.cancellationReason) info.append(safeText("p", `Motivo: ${reservation.cancellationReason}`));
    card.append(info);
    if (reservation.status === "Reservada") {
      const cancel = safeText("button", "Cancelar reserva", "secondary");
      cancel.addEventListener("click", async () => {
        const reason = window.prompt("Indica el motivo de la cancelación:");
        if (!reason || !reason.trim()) return showMessage("Debes escribir un motivo para cancelar.", true);
        try {
          await api(`/api/reservations/${reservation.id}/cancel`, { method: "POST", body: JSON.stringify({ reason: reason.trim() }) });
          showMessage("Reserva cancelada.");
          await loadReservations();
        } catch (error) { showMessage(error.message, true); }
      });
      card.append(cancel);
    }
    list.append(card);
  });
}
async function loadStaffReservations() {
  const { reservations } = await api("/api/staff/reservations");
  const list = $("#staff-reservations");
  list.replaceChildren();
  reservations.forEach((reservation) => {
    const card = document.createElement("article");
    card.className = "reservation-card";
    card.append(safeText("span", `${reservation.id} · ${reservation.status} · ${formatDate(reservation.start)}`));
    if (reservation.status === "Reservada") {
      ["Completada", "Inasistencia"].forEach((status) => {
        const button = safeText("button", status);
        button.addEventListener("click", async () => {
          try {
            await api(`/api/staff/reservations/${reservation.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
            showMessage("Estado actualizado.");
            await loadStaffReservations();
          } catch (error) { showMessage(error.message, true); }
        });
        card.append(button);
      });
    }
    list.append(card);
  });
}
async function showApp(user) {
  currentUser = user;
  $("#login-panel").classList.add("hidden");
  $("#app-panel").classList.remove("hidden");
  $("#logout-button").classList.remove("hidden");
  $("#session-label").textContent = `${user.name} (${user.role})`;
  $("#staff-panel").classList.toggle("hidden", !["personal", "admin"].includes(user.role));
  $("#admin-panel").classList.toggle("hidden", user.role !== "admin");
  await loadScenarios();
  await loadReservations();
  if (["personal", "admin"].includes(user.role)) await loadStaffReservations();
  if (user.role === "admin") $("#admin-summary").textContent = `${scenarios.length} escenarios registrados.`;
}
$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
    showMessage("Sesión iniciada.");
    await showApp(result.user);
  } catch (error) { showMessage(error.message, true); }
});
$("#reservation-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await api("/api/reservations", { method: "POST", body: JSON.stringify({ scenarioId: form.get("scenarioId"), start: new Date(form.get("start")).toISOString() }) });
    showMessage("Reserva creada correctamente.");
    event.currentTarget.reset();
    await loadReservations();
  } catch (error) { showMessage(error.message, true); }
});
$("#logout-button").addEventListener("click", async () => {
  try { await api("/api/auth/logout", { method: "POST" }); } catch (_) {}
  currentUser = null;
  $("#login-panel").classList.remove("hidden");
  $("#app-panel").classList.add("hidden");
  $("#logout-button").classList.add("hidden");
  $("#session-label").textContent = "No has iniciado sesión";
  showMessage("Sesión cerrada.");
});
$("#refresh-button").addEventListener("click", async () => {
  try { await loadScenarios(); await loadReservations(); showMessage("Información actualizada."); }
  catch (error) { showMessage(error.message, true); }
});
(async function init() {
  try {
    const result = await api("/api/auth/me");
    if (result.user) await showApp(result.user);
  } catch (_) { /* Una sesión inexistente es normal al abrir la página. */ }
})();