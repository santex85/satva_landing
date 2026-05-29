(function () {
  "use strict";

  var TOKEN_KEY = "satva_admin_token";
  var LIMIT = 20;
  var AUDIT_LIMIT = 50;

  var _ROLE_LABELS = {
    owner: "Owner",
    manager: "Manager",
  };

  var _LEAD_STATUS_LABELS = {
    new: "Новый",
    in_progress: "В работе",
    contacted: "Связались",
    booked: "Забронировано",
    cancelled: "Отмена",
    spam: "Спам",
  };

  var PAGE_TITLES = {
    login: "Вход",
    invite: "Приглашение",
    leads: "Заявки",
    detail: "Заявка",
    analytics: "Аналитика",
    settings: "Настройки",
    users: "Пользователи",
    audit: "Аудит",
  };

  var blocks = {
    login: null,
    invite: null,
    leads: null,
    detail: null,
    analytics: null,
    settings: null,
    users: null,
    audit: null,
  };

  var els = {};

  var state = {
    offset: 0,
    typeFilter: "",
    statusFilter: "",
    archived: false,
    createdAfter: "",
    createdBefore: "",
    q: "",
    leadsData: [],
    leadsTotal: 0,
    notificationEmails: [],
    currentLeadId: null,
    currentLeadArchived: false,
    analyticsRange: "7d",
    role: "",
    meEmail: "",
    currentSection: "login",
    usersData: [],
    invitationsData: [],
    auditData: [],
    auditOffset: 0,
    quickEditLeadId: null,
    quickEditReturnFocus: null,
    modalKeydownHandler: null,
  };

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function apiUrl(path) {
    var origin = typeof window !== "undefined" && window.location ? window.location.origin : "";
    return origin + "/api" + path;
  }

  function authHeaders() {
    return {
      Authorization: "Bearer " + getToken(),
    };
  }

  function handleUnauthorized(res) {
    if (res.status === 401) {
      clearToken();
      showLogin();
      return true;
    }
    return false;
  }

  function parseJsonError(res, data, fallback) {
    if (!res.ok) {
      var detail = data && data.detail ? data.detail : fallback;
      throw new Error(typeof detail === "string" ? detail : fallback);
    }
    return data;
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s == null ? "" : String(s);
    return div.innerHTML;
  }

  function escapeAttr(s) {
    return String(s == null ? "" : s).replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function setFormMessage(el, text, isError) {
    if (!el) return;
    el.textContent = text || "";
    el.className = "form-message" + (text ? (isError ? " form-message--error" : " form-message--success") : "");
  }

  function roleLabel(role) {
    return _ROLE_LABELS[role] || role || "—";
  }

  function statusLabel(status) {
    return _LEAD_STATUS_LABELS[status] || status || "—";
  }

  function renderStatusBadge(status) {
    var key = status || "new";
    return "<span class=\"admin-status-badge admin-status-badge--" + escapeAttr(key) + "\">" + escapeHtml(statusLabel(key)) + "</span>";
  }

  function formatDate(iso) {
    if (!iso) return "—";
    try {
      var d = new Date(iso);
      return isNaN(d.getTime()) ? iso : d.toLocaleString("ru-RU");
    } catch (e) {
      return iso;
    }
  }

  function linkPhone(phone) {
    if (phone == null || phone === "" || phone === "—") return "—";
    var raw = String(phone);
    var href = raw.replace(/[^\d+]/g, "");
    if (!href) return escapeHtml(raw);
    return "<a href=\"tel:" + escapeAttr(href) + "\">" + escapeHtml(raw) + "</a>";
  }

  function linkEmail(email) {
    if (email == null || email === "") return "—";
    var raw = String(email);
    return "<a href=\"mailto:" + escapeAttr(raw) + "\">" + escapeHtml(raw) + "</a>";
  }

  function renderPayloadValue(key, value) {
    if (value == null) return "—";
    if (typeof value === "object") return escapeHtml(JSON.stringify(value));
    var k = String(key).toLowerCase();
    if (k === "phone" || k === "tel" || k === "telephone") return linkPhone(String(value));
    if (k === "email" || k === "e-mail") return linkEmail(String(value));
    return escapeHtml(String(value));
  }

  function getInviteTokenFromUrl() {
    return new URLSearchParams(window.location.search).get("invite");
  }

  function clearInviteFromUrl() {
    var url = new URL(window.location.href);
    url.searchParams.delete("invite");
    var qs = url.searchParams.toString();
    window.history.replaceState({}, "", url.pathname + (qs ? "?" + qs : ""));
  }

  function buildLeadsParams(includePagination) {
    var params = new URLSearchParams();
    if (includePagination) {
      params.set("limit", String(LIMIT));
      params.set("offset", String(state.offset));
    }
    if (state.typeFilter) params.set("type", state.typeFilter);
    if (state.statusFilter) params.set("status", state.statusFilter);
    params.set("archived", state.archived ? "true" : "false");
    if (state.q) params.set("q", state.q);
    if (state.createdAfter) params.set("created_after", state.createdAfter);
    if (state.createdBefore) params.set("created_before", state.createdBefore);
    return params;
  }

  function syncFiltersToUrl() {
    if (state.currentSection !== "leads" && state.currentSection !== "detail") return;
    var params = new URLSearchParams();
    if (state.typeFilter) params.set("type", state.typeFilter);
    if (state.statusFilter) params.set("status", state.statusFilter);
    if (state.archived) params.set("archived", "true");
    if (state.q) params.set("q", state.q);
    if (state.createdAfter) params.set("created_after", state.createdAfter);
    if (state.createdBefore) params.set("created_before", state.createdBefore);
    if (state.offset > 0) params.set("offset", String(state.offset));
    var qs = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? "?" + qs : ""));
  }

  function restoreFiltersFromUrl() {
    if (getInviteTokenFromUrl()) return;
    var params = new URLSearchParams(window.location.search);
    state.typeFilter = params.get("type") || "";
    state.statusFilter = params.get("status") || "";
    state.archived = params.get("archived") === "true";
    state.q = params.get("q") || "";
    state.createdAfter = params.get("created_after") || "";
    state.createdBefore = params.get("created_before") || "";
    state.offset = parseInt(params.get("offset") || "0", 10) || 0;
  }

  function isoToDatetimeLocal(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var pad = function (n) {
      return n < 10 ? "0" + n : String(n);
    };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function datetimeLocalToIso(value) {
    if (!value) return "";
    var d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toISOString();
  }

  function syncFilterFormFromState() {
    if (els.leadsFilter) els.leadsFilter.value = state.typeFilter;
    if (els.statusFilter) els.statusFilter.value = state.statusFilter;
    if (els.leadsSearch) els.leadsSearch.value = state.q;
    if (els.dateFrom) els.dateFrom.value = isoToDatetimeLocal(state.createdAfter);
    if (els.dateTo) els.dateTo.value = isoToDatetimeLocal(state.createdBefore);
    updateArchiveTabs();
  }

  function setLoggedIn(isLoggedIn) {
    document.body.classList.toggle("admin-logged-in", isLoggedIn);
  }

  function closeSidebar() {
    document.body.classList.remove("admin-sidebar-open");
    if (els.sidebarToggle) {
      els.sidebarToggle.setAttribute("aria-expanded", "false");
      els.sidebarToggle.setAttribute("aria-label", "Открыть меню");
    }
    if (els.sidebarOverlay) {
      els.sidebarOverlay.classList.add("admin-hidden");
      els.sidebarOverlay.setAttribute("aria-hidden", "true");
    }
  }

  function openSidebar() {
    document.body.classList.add("admin-sidebar-open");
    if (els.sidebarToggle) {
      els.sidebarToggle.setAttribute("aria-expanded", "true");
      els.sidebarToggle.setAttribute("aria-label", "Закрыть меню");
    }
    if (els.sidebarOverlay) {
      els.sidebarOverlay.classList.remove("admin-hidden");
      els.sidebarOverlay.setAttribute("aria-hidden", "false");
    }
  }

  function toggleSidebar() {
    if (document.body.classList.contains("admin-sidebar-open")) closeSidebar();
    else openSidebar();
  }

  function updatePageTitle(name) {
    if (els.pageTitle) els.pageTitle.textContent = PAGE_TITLES[name] || "Админка";
  }

  function applyRoleVisibility() {
    var isOwner = state.role === "owner";
    document.body.classList.toggle("admin-role-owner", isOwner);
    if (els.navSettings) els.navSettings.classList.toggle("admin-hidden", !isOwner);
    if (els.navUsers) els.navUsers.classList.toggle("admin-hidden", !isOwner);
    if (els.navAudit) els.navAudit.classList.toggle("admin-hidden", !isOwner);
  }

  function updateNavTabs(name) {
    var activeLeads = name === "leads" || name === "detail";
    if (els.navLeads) els.navLeads.classList.toggle("admin-nav__tab--active", activeLeads);
    if (els.navAnalytics) els.navAnalytics.classList.toggle("admin-nav__tab--active", name === "analytics");
    if (els.navSettings) els.navSettings.classList.toggle("admin-nav__tab--active", name === "settings");
    if (els.navUsers) els.navUsers.classList.toggle("admin-nav__tab--active", name === "users");
    if (els.navAudit) els.navAudit.classList.toggle("admin-nav__tab--active", name === "audit");
  }

  function showBlock(name) {
    state.currentSection = name;
    Object.keys(blocks).forEach(function (key) {
      if (blocks[key]) blocks[key].classList.toggle("admin-hidden", key !== name);
    });
    var showNav = name !== "login" && name !== "invite";
    if (els.nav) els.nav.classList.toggle("admin-hidden", !showNav);
    if (els.topbar) els.topbar.classList.toggle("admin-hidden", !showNav);
    setLoggedIn(showNav);
    updateNavTabs(name);
    updatePageTitle(name);
    if (showNav) closeSidebar();
  }

  function showLogin() {
    setLoggedIn(false);
    showBlock("login");
    setFormMessage(els.loginMessage, "", false);
  }

  function showInviteBlock() {
    setLoggedIn(false);
    showBlock("invite");
  }

  function showLeads() {
    showBlock("leads");
  }

  function showDetail() {
    showBlock("detail");
  }

  function showSettings() {
    if (state.role !== "owner") {
      showLeads();
      return;
    }
    showBlock("settings");
    loadSettings();
    loadMe();
  }

  function showAnalytics() {
    showBlock("analytics");
    loadAnalytics(state.analyticsRange);
  }

  function showUsers() {
    if (state.role !== "owner") {
      showLeads();
      return;
    }
    showBlock("users");
    loadUsers();
    loadInvitations();
  }

  function showAudit() {
    if (state.role !== "owner") {
      showLeads();
      return;
    }
    showBlock("audit");
    loadAudit();
  }

  function updateArchiveTabs() {
    if (els.tabActive) {
      els.tabActive.classList.toggle("admin-archive-tab--active", !state.archived);
      els.tabActive.setAttribute("aria-selected", state.archived ? "false" : "true");
    }
    if (els.tabArchive) {
      els.tabArchive.classList.toggle("admin-archive-tab--active", state.archived);
      els.tabArchive.setAttribute("aria-selected", state.archived ? "true" : "false");
    }
  }

  function loadMe() {
    var token = getToken();
    if (!token) return Promise.resolve(null);
    return fetch(apiUrl("/auth/me"), { method: "GET", headers: authHeaders() })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        if (!res.ok) throw new Error("Ошибка загрузки профиля");
        return res.json();
      })
      .then(function (data) {
        if (!data) return null;
        state.meEmail = data.email || "";
        state.role = data.role || "";
        if (els.meEmail) els.meEmail.textContent = state.meEmail || "—";
        applyRoleVisibility();
        return data;
      })
      .catch(function () {
        if (els.meEmail) els.meEmail.textContent = "—";
        return null;
      });
  }

  function renderQuickModalNotesPreview(notes) {
    if (!els.quickModalNotesPreview) return;
    var count = notes ? notes.length : 0;
    if (!count) {
      els.quickModalNotesPreview.innerHTML = "<p class=\"admin-notes__empty\">Нет заметок</p>";
      return;
    }
    var last = notes[0];
    var author = last.author && last.author.email ? last.author.email : "—";
    els.quickModalNotesPreview.innerHTML =
      "<span class=\"admin-notes__meta\">Заметок: " + count + "</span>" +
      "<span class=\"admin-notes__meta\">" + escapeHtml(author) + " · " + formatDate(last.created_at) + "</span>" +
      "<div>" + escapeHtml(last.body) + "</div>";
  }

  function refreshNewLeadsBadge() {
    if (!getToken() || !els.navLeadsBadge) return;
    var params = new URLSearchParams();
    params.set("limit", "1");
    params.set("offset", "0");
    params.set("status", "new");
    params.set("archived", "false");
    fetch(apiUrl("/leads") + "?" + params.toString(), { method: "GET", headers: authHeaders() })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        return res.headers.get("X-Total-Count");
      })
      .then(function (totalHeader) {
        if (totalHeader == null) return;
        var total = parseInt(totalHeader, 10) || 0;
        els.navLeadsBadge.textContent = total > 0 ? String(total) : "";
        els.navLeadsBadge.classList.toggle("admin-hidden", total === 0);
      })
      .catch(function () {});
  }

  function loadLeads() {
    var token = getToken();
    if (!token) {
      showLogin();
      return;
    }
    syncFiltersToUrl();
    var url = apiUrl("/leads") + "?" + buildLeadsParams(true).toString();
    fetch(url, { method: "GET", headers: authHeaders() })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        if (!res.ok) throw new Error("Ошибка загрузки");
        state.leadsTotal = parseInt(res.headers.get("X-Total-Count") || "0", 10) || 0;
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        state.leadsData = Array.isArray(data) ? data : (data.items || data.data || []);
        renderLeadsTable();
        renderPagination();
        refreshNewLeadsBadge();
      })
      .catch(function (err) {
        if (els.leadsTableBody) {
          els.leadsTableBody.innerHTML = "<tr><td colspan=\"6\" class=\"admin-table__empty admin-error-msg\">" + escapeHtml(err.message || "Ошибка загрузки") + "</td></tr>";
        }
      });
  }

  function getLeadFromState(id) {
    for (var i = 0; i < state.leadsData.length; i++) {
      if (String(state.leadsData[i].id) === String(id)) return state.leadsData[i];
    }
    return null;
  }

  function updateLeadInState(lead) {
    for (var i = 0; i < state.leadsData.length; i++) {
      if (String(state.leadsData[i].id) === String(lead.id)) {
        state.leadsData[i] = Object.assign({}, state.leadsData[i], lead);
        return;
      }
    }
  }

  function removeLeadFromTable(id) {
    if (!els.leadsTableBody) return;
    var row = els.leadsTableBody.querySelector("tr[data-lead-id=\"" + id + "\"]");
    if (row) row.remove();
    if (!els.leadsTableBody.querySelector("tr[data-lead-id]")) {
      els.leadsTableBody.innerHTML = "<tr><td colspan=\"6\" class=\"admin-table__empty\">" + (state.archived ? "Архив пуст" : "Нет заявок") + "</td></tr>";
    }
  }

  function renderLeadRowCells(lead) {
    var payload = lead.payload || {};
    var name = payload.name != null ? String(payload.name) : "—";
    var phone = payload.phone != null ? String(payload.phone) : "—";
    var id = lead.id;
    return (
      "<td>" + formatDate(lead.created_at) + "</td>" +
      "<td><span class=\"admin-type-badge\">" + escapeHtml(lead.type || "—") + "</span></td>" +
      "<td>" + renderStatusBadge(lead.status) + "</td>" +
      "<td>" + escapeHtml(name) + "</td>" +
      "<td>" + linkPhone(phone) + "</td>" +
      "<td><button type=\"button\" class=\"admin-btn admin-btn--primary admin-btn--small\" data-lead-detail=\"" + escapeAttr(String(id)) + "\">Подробнее</button></td>"
    );
  }

  function bindLeadRowEvents(row) {
    var id = row.getAttribute("data-lead-id");
    if (!id) return;
    row.addEventListener("click", function (e) {
      if (e.target.closest("[data-lead-detail]")) return;
      openQuickEdit(id, row);
    });
    var detailBtn = row.querySelector("[data-lead-detail]");
    if (detailBtn) {
      detailBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        openLeadDetail(id);
      });
    }
  }

  function renderLeadsTable() {
    var tbody = els.leadsTableBody;
    if (!tbody) return;
    var rows = state.leadsData;
    if (!rows.length) {
      tbody.innerHTML = "<tr><td colspan=\"6\" class=\"admin-table__empty\">" + (state.archived ? "Архив пуст" : "Нет заявок") + "</td></tr>";
      return;
    }
    tbody.innerHTML = rows
      .map(function (lead) {
        return "<tr class=\"admin-table__row--clickable\" data-lead-id=\"" + escapeAttr(String(lead.id)) + "\">" + renderLeadRowCells(lead) + "</tr>";
      })
      .join("");
    tbody.querySelectorAll("tr[data-lead-id]").forEach(bindLeadRowEvents);
  }

  function updateLeadRowInTable(lead) {
    if (!els.leadsTableBody) return;
    var archived = !!lead.archived_at;
    if (archived !== state.archived) {
      removeLeadFromTable(lead.id);
      return;
    }
    var row = els.leadsTableBody.querySelector("tr[data-lead-id=\"" + lead.id + "\"]");
    if (!row) return;
    row.innerHTML = renderLeadRowCells(lead);
    bindLeadRowEvents(row);
  }

  function renderPagination() {
    if (els.paginationPrev) els.paginationPrev.disabled = state.offset === 0;
    if (els.paginationNext) {
      els.paginationNext.disabled = state.offset + state.leadsData.length >= state.leadsTotal || !state.leadsData.length;
    }
    if (els.paginationInfo) {
      if (!state.leadsTotal || !state.leadsData.length) {
        els.paginationInfo.textContent = state.leadsTotal ? "0 из " + state.leadsTotal : "0";
      } else {
        var from = state.offset + 1;
        var to = state.offset + state.leadsData.length;
        els.paginationInfo.textContent = from + "–" + to + " из " + state.leadsTotal;
      }
    }
  }

  function exportLeadsCsv() {
    if (!getToken()) {
      showLogin();
      return;
    }
    var url = apiUrl("/leads/export") + "?" + buildLeadsParams(false).toString();
    fetch(url, { method: "GET", headers: authHeaders() })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        if (!res.ok) throw new Error("Ошибка экспорта");
        return res.blob();
      })
      .then(function (blob) {
        if (!blob) return;
        var objectUrl = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = objectUrl;
        a.download = "leads.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      })
      .catch(function (err) {
        alert(err.message || "Ошибка экспорта");
      });
  }

  function applyDatePreset(days) {
    var now = new Date();
    var start = new Date(now);
    if (days === 0) start.setHours(0, 0, 0, 0);
    else start.setDate(start.getDate() - days);
    state.createdAfter = start.toISOString();
    state.createdBefore = now.toISOString();
    if (els.dateFrom) els.dateFrom.value = isoToDatetimeLocal(state.createdAfter);
    if (els.dateTo) els.dateTo.value = isoToDatetimeLocal(state.createdBefore);
    state.offset = 0;
    loadLeads();
  }

  function canEditNote(note) {
    return state.role === "owner" || (note.author && note.author.email === state.meEmail);
  }

  function loadLeadNotes(leadId) {
    return fetch(apiUrl("/leads/" + encodeURIComponent(leadId) + "/notes"), { method: "GET", headers: authHeaders() })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        if (!res.ok) throw new Error("Ошибка загрузки заметок");
        return res.json();
      });
  }

  function renderNotesList(container, notes, leadId, messageEl) {
    if (!container) return;
    if (!notes || !notes.length) {
      container.innerHTML = "<p class=\"admin-notes__empty\">Нет заметок</p>";
      return;
    }
    container.innerHTML = notes
      .map(function (note) {
        var author = note.author && note.author.email ? note.author.email : "—";
        var edited = note.updated_at ? " <span class=\"admin-notes__edited\">(изм.)</span>" : "";
        var actions = "";
        if (canEditNote(note)) {
          actions =
            "<div class=\"admin-notes__actions\">" +
            "<button type=\"button\" class=\"admin-btn admin-btn--ghost admin-btn--small\" data-note-edit=\"" + escapeAttr(String(note.id)) + "\">Изменить</button>" +
            "<button type=\"button\" class=\"admin-btn admin-btn--ghost admin-btn--small\" data-note-delete=\"" + escapeAttr(String(note.id)) + "\">Удалить</button>" +
            "</div>";
        }
        return (
          "<article class=\"admin-note\" data-note-id=\"" + escapeAttr(String(note.id)) + "\">" +
          "<div class=\"admin-note__meta\">" + escapeHtml(author) + " · " + formatDate(note.created_at) + edited + "</div>" +
          "<div class=\"admin-note__body\" data-note-body>" + escapeHtml(note.body) + "</div>" +
          actions +
          "</article>"
        );
      })
      .join("");

    container.querySelectorAll("[data-note-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var noteId = btn.getAttribute("data-note-edit");
        var article = container.querySelector("[data-note-id=\"" + noteId + "\"]");
        var bodyEl = article ? article.querySelector("[data-note-body]") : null;
        if (!bodyEl) return;
        var current = bodyEl.textContent || "";
        var next = window.prompt("Изменить заметку:", current);
        if (next == null) return;
        next = next.trim();
        if (!next || next === current) return;
        patchNote(leadId, noteId, next, messageEl).then(function () {
          return loadLeadNotes(leadId);
        }).then(function (notesData) {
          if (notesData) renderNotesList(container, notesData, leadId, messageEl);
        });
      });
    });

    container.querySelectorAll("[data-note-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var noteId = btn.getAttribute("data-note-delete");
        if (!window.confirm("Удалить заметку?")) return;
        deleteNote(leadId, noteId, messageEl).then(function () {
          return loadLeadNotes(leadId);
        }).then(function (notesData) {
          if (notesData) renderNotesList(container, notesData, leadId, messageEl);
        });
      });
    });
  }

  function createNote(leadId, body, messageEl) {
    setFormMessage(messageEl, "Сохранение…", false);
    return fetch(apiUrl("/leads/" + encodeURIComponent(leadId) + "/notes"), {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
      body: JSON.stringify({ body: body }),
    })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        return res.json().then(function (data) {
          return parseJsonError(res, data, "Ошибка добавления заметки");
        });
      })
      .then(function (data) {
        if (!data) return null;
        setFormMessage(messageEl, "Заметка добавлена", false);
        return data;
      })
      .catch(function (err) {
        setFormMessage(messageEl, err.message || "Ошибка добавления заметки", true);
        return null;
      });
  }

  function patchNote(leadId, noteId, body, messageEl) {
    return fetch(apiUrl("/leads/" + encodeURIComponent(leadId) + "/notes/" + encodeURIComponent(noteId)), {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
      body: JSON.stringify({ body: body }),
    })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        return res.json().then(function (data) {
          return parseJsonError(res, data, "Ошибка изменения заметки");
        });
      })
      .catch(function (err) {
        setFormMessage(messageEl, err.message || "Ошибка изменения заметки", true);
        return null;
      });
  }

  function deleteNote(leadId, noteId, messageEl) {
    return fetch(apiUrl("/leads/" + encodeURIComponent(leadId) + "/notes/" + encodeURIComponent(noteId)), {
      method: "DELETE",
      headers: authHeaders(),
    })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        if (!res.ok) throw new Error("Ошибка удаления заметки");
        setFormMessage(messageEl, "Заметка удалена", false);
        return true;
      })
      .catch(function (err) {
        setFormMessage(messageEl, err.message || "Ошибка удаления заметки", true);
        return null;
      });
  }

  function loadDetailNotes(leadId) {
    if (!els.detailNotesList) return;
    loadLeadNotes(leadId)
      .then(function (notes) {
        if (!notes) return;
        renderNotesList(els.detailNotesList, notes, leadId, els.detailNotesMessage);
      })
      .catch(function (err) {
        if (els.detailNotesList) els.detailNotesList.innerHTML = "<p class=\"admin-error-msg\">" + escapeHtml(err.message) + "</p>";
      });
  }

  function openLeadDetail(id) {
    var token = getToken();
    if (!token) {
      showLogin();
      return;
    }
    closeQuickEdit();
    state.currentLeadId = id;
    showDetail();
    if (els.detailLoading) els.detailLoading.classList.remove("admin-hidden");
    if (els.detailPayload) els.detailPayload.innerHTML = "";
    if (els.detailConsents) els.detailConsents.innerHTML = "";
    if (els.detailNotesList) els.detailNotesList.innerHTML = "";
    setFormMessage(els.detailMessage, "", false);
    setFormMessage(els.detailNotesMessage, "", false);

    fetch(apiUrl("/leads/" + encodeURIComponent(id)), { method: "GET", headers: authHeaders() })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        if (!res.ok) throw new Error("Ошибка загрузки");
        return res.json();
      })
      .then(function (data) {
        if (els.detailLoading) els.detailLoading.classList.add("admin-hidden");
        if (!data) return;
        state.currentLeadArchived = !!data.archived_at;
        if (els.detailStatus) els.detailStatus.value = data.status || "new";
        if (els.detailArchiveBtn) els.detailArchiveBtn.classList.toggle("admin-hidden", state.currentLeadArchived);
        if (els.detailRestoreBtn) els.detailRestoreBtn.classList.toggle("admin-hidden", !state.currentLeadArchived);

        var payload = data.payload || {};
        var payloadKeys = Object.keys(payload);
        if (payloadKeys.length && els.detailPayload) {
          var dl = "<dl>";
          payloadKeys.forEach(function (k) {
            dl += "<dt>" + escapeHtml(k) + "</dt><dd>" + renderPayloadValue(k, payload[k]) + "</dd>";
          });
          dl += "</dl>";
          els.detailPayload.innerHTML = dl;
        } else if (els.detailPayload) {
          els.detailPayload.innerHTML = "<p>Нет данных</p>";
        }

        var consents = data.consents || [];
        if (els.detailConsents) {
          if (!consents.length) {
            els.detailConsents.innerHTML = "<p>Нет согласий</p>";
          } else {
            els.detailConsents.innerHTML =
              "<div class=\"admin-table-wrap\"><table class=\"admin-table\"><thead><tr><th>Дата</th><th>Версия политики</th><th>IP</th></tr></thead><tbody>" +
              consents.map(function (c) {
                return "<tr><td>" + formatDate(c.consent_at) + "</td><td>" + escapeHtml(String(c.policy_version != null ? c.policy_version : "—")) + "</td><td>" + escapeHtml(String(c.ip_address != null ? c.ip_address : "—")) + "</td></tr>";
              }).join("") +
              "</tbody></table></div>";
          }
        }
        loadDetailNotes(id);
      })
      .catch(function (err) {
        if (els.detailLoading) els.detailLoading.classList.add("admin-hidden");
        if (els.detailPayload) els.detailPayload.innerHTML = "<p class=\"admin-error-msg\">" + escapeHtml(err.message || "Ошибка загрузки") + "</p>";
      });
  }

  function patchLead(leadId, body, successMessage, messageEl) {
    var id = leadId || state.currentLeadId;
    if (!id) return Promise.resolve(null);
    var msgEl = messageEl || els.detailMessage;
    setFormMessage(msgEl, "Сохранение…", false);
    return fetch(apiUrl("/leads/" + encodeURIComponent(id)), {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
      body: JSON.stringify(body),
    })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        return res.json().then(function (data) {
          return parseJsonError(res, data, "Ошибка сохранения");
        });
      })
      .then(function (data) {
        if (!data) return null;
        updateLeadInState(data);
        updateLeadRowInTable(data);
        if (String(state.currentLeadId) === String(id)) {
          state.currentLeadArchived = !!data.archived_at;
          if (els.detailStatus && data.status) els.detailStatus.value = data.status;
          if (els.detailArchiveBtn) els.detailArchiveBtn.classList.toggle("admin-hidden", state.currentLeadArchived);
          if (els.detailRestoreBtn) els.detailRestoreBtn.classList.toggle("admin-hidden", !state.currentLeadArchived);
        }
        setFormMessage(msgEl, successMessage || "Сохранено", false);
        refreshNewLeadsBadge();
        return data;
      })
      .catch(function (err) {
        setFormMessage(msgEl, err.message || "Ошибка сохранения", true);
        return null;
      });
  }

  function getFocusableElements(container) {
    if (!container) return [];
    return Array.prototype.slice.call(
      container.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')
    );
  }

  function trapModalFocus(e) {
    if (!els.quickModal || e.key !== "Tab") return;
    var focusable = getFocusableElements(els.quickModal);
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function closeQuickEdit() {
    if (state.modalKeydownHandler) {
      document.removeEventListener("keydown", state.modalKeydownHandler);
      state.modalKeydownHandler = null;
    }
    if (els.quickModal) {
      els.quickModal.classList.add("admin-hidden");
      els.quickModal.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("admin-modal-open");
    if (state.quickEditReturnFocus && state.quickEditReturnFocus.focus) {
      state.quickEditReturnFocus.focus();
    }
    state.quickEditLeadId = null;
    state.quickEditReturnFocus = null;
  }

  function openQuickEdit(id, returnFocusEl) {
    if (!els.quickModal) {
      openLeadDetail(id);
      return;
    }
    state.quickEditLeadId = id;
    state.quickEditReturnFocus = returnFocusEl || document.activeElement;
    setFormMessage(els.quickModalMessage, "", false);

    Promise.all([
      fetch(apiUrl("/leads/" + encodeURIComponent(id)), { method: "GET", headers: authHeaders() }).then(function (res) {
        if (handleUnauthorized(res)) return null;
        if (!res.ok) throw new Error("Ошибка загрузки");
        return res.json();
      }),
      loadLeadNotes(id),
    ])
      .then(function (results) {
        var lead = results[0];
        var notes = results[1];
        if (!lead) return;

        var payload = lead.payload || {};
        var name = payload.name != null ? String(payload.name) : "—";
        var phone = payload.phone != null ? String(payload.phone) : "—";
        if (els.quickModalTitle) {
          els.quickModalTitle.innerHTML = escapeHtml(lead.type || "—") + " · " + escapeHtml(name) + " · " + linkPhone(phone);
        }
        if (els.quickModalStatus) els.quickModalStatus.value = lead.status || "new";
        if (els.quickModalArchiveBtn) els.quickModalArchiveBtn.classList.toggle("admin-hidden", !!lead.archived_at);
        if (els.quickModalRestoreBtn) els.quickModalRestoreBtn.classList.toggle("admin-hidden", !lead.archived_at);

        renderQuickModalNotesPreview(notes);
        if (els.quickModalNoteInput) els.quickModalNoteInput.value = "";

        els.quickModal.classList.remove("admin-hidden");
        els.quickModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("admin-modal-open");

        state.modalKeydownHandler = function (e) {
          if (e.key === "Escape") {
            e.preventDefault();
            closeQuickEdit();
            return;
          }
          trapModalFocus(e);
        };
        document.addEventListener("keydown", state.modalKeydownHandler);

        var focusable = getFocusableElements(els.quickModal);
        if (focusable.length) focusable[0].focus();
      })
      .catch(function (err) {
        alert(err.message || "Ошибка загрузки");
      });
  }

  function renderLeadsByDayChart(data) {
    if (!els.analyticsLeadsChart) return;
    if (!data || !data.length) {
      els.analyticsLeadsChart.innerHTML = "<p class=\"admin-analytics-chart__empty\">Нет данных за период</p>";
      return;
    }
    var max = 1;
    data.forEach(function (d) {
      if ((d.count || 0) > max) max = d.count;
    });
    els.analyticsLeadsChart.innerHTML =
      "<div class=\"admin-bar-chart\" role=\"img\" aria-label=\"График заявок по дням\">" +
      data.map(function (d) {
        var count = d.count || 0;
        var pct = Math.round((count / max) * 100);
        var label = d.date ? d.date.slice(5) : "";
        return (
          "<div class=\"admin-bar-chart__item\" title=\"" + escapeAttr((d.date || "") + ": " + count) + "\">" +
          "<div class=\"admin-bar-chart__bar-wrap\"><div class=\"admin-bar-chart__bar\" style=\"height:" + pct + "%\"></div></div>" +
          "<span class=\"admin-bar-chart__value\">" + escapeHtml(String(count)) + "</span>" +
          "<span class=\"admin-bar-chart__label\">" + escapeHtml(label) + "</span>" +
          "</div>"
        );
      }).join("") +
      "</div>";
  }

  function loadAnalytics(range) {
    var token = getToken();
    if (!token) {
      showLogin();
      return;
    }
    state.analyticsRange = range || "7d";
    if (els.analyticsLoading) els.analyticsLoading.classList.remove("admin-hidden");
    if (els.analyticsNotConfigured) els.analyticsNotConfigured.classList.add("admin-hidden");
    if (els.analyticsContent) els.analyticsContent.classList.add("admin-hidden");
    updateAnalyticsRangeTabs();

    fetch(apiUrl("/admin/analytics/summary?range=" + encodeURIComponent(state.analyticsRange)), {
      method: "GET",
      headers: authHeaders(),
    })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        if (!res.ok) throw new Error("Ошибка загрузки аналитики");
        return res.json();
      })
      .then(function (data) {
        if (els.analyticsLoading) els.analyticsLoading.classList.add("admin-hidden");
        if (!data) return;
        renderAnalytics(data);
      })
      .catch(function () {
        if (els.analyticsLoading) els.analyticsLoading.classList.add("admin-hidden");
        if (els.analyticsNotConfigured) {
          els.analyticsNotConfigured.textContent = "Не удалось загрузить аналитику";
          els.analyticsNotConfigured.classList.remove("admin-hidden");
        }
      });
  }

  function updateAnalyticsRangeTabs() {
    if (els.analyticsRange7d) els.analyticsRange7d.classList.toggle("admin-archive-tab--active", state.analyticsRange === "7d");
    if (els.analyticsRange30d) els.analyticsRange30d.classList.toggle("admin-archive-tab--active", state.analyticsRange === "30d");
  }

  function renderAnalytics(data) {
    if (!data.configured) {
      if (els.analyticsNotConfigured) {
        els.analyticsNotConfigured.textContent = "Umami не настроен на сервере. Задайте UMAMI_API_KEY и UMAMI_WEBSITE_ID.";
        els.analyticsNotConfigured.classList.remove("admin-hidden");
      }
      if (els.analyticsContent) els.analyticsContent.classList.add("admin-hidden");
      return;
    }

    if (els.analyticsNotConfigured) els.analyticsNotConfigured.classList.add("admin-hidden");
    if (els.analyticsContent) els.analyticsContent.classList.remove("admin-hidden");
    if (els.analyticsVisitors) els.analyticsVisitors.textContent = String(data.visitors != null ? data.visitors : 0);
    if (els.analyticsPageviews) els.analyticsPageviews.textContent = String(data.pageviews != null ? data.pageviews : 0);
    if (els.analyticsVisits) els.analyticsVisits.textContent = String(data.visits != null ? data.visits : 0);
    if (els.analyticsBounces) els.analyticsBounces.textContent = String(data.bounces != null ? data.bounces : 0);
    if (els.analyticsLeadsCount) els.analyticsLeadsCount.textContent = String(data.leads_count != null ? data.leads_count : 0);
    if (els.analyticsConversion) els.analyticsConversion.textContent = String(data.conversion_rate != null ? data.conversion_rate : 0) + "%";
    renderLeadsByDayChart(data.leads_by_day || []);

    var pages = data.top_pages || [];
    if (els.analyticsTopPages) {
      if (!pages.length) {
        els.analyticsTopPages.innerHTML = "<p class=\"admin-analytics-top-list__empty\">Нет данных за выбранный период</p>";
      } else {
        els.analyticsTopPages.innerHTML =
          "<ol class=\"admin-analytics-top-list__items\">" +
          pages.map(function (page) {
            return "<li><span class=\"admin-analytics-top-list__path\">" + escapeHtml(page.path || "/") + "</span><span class=\"admin-analytics-top-list__views\">" + escapeHtml(String(page.views != null ? page.views : 0)) + "</span></li>";
          }).join("") +
          "</ol>";
      }
    }
  }

  function renderEmailList() {
    if (!els.emailList) return;
    if (!state.notificationEmails.length) {
      els.emailList.innerHTML = "<li class=\"admin-email-list__empty\">Нет получателей — добавьте email и сохраните</li>";
      return;
    }
    els.emailList.innerHTML = state.notificationEmails
      .map(function (email, index) {
        return "<li class=\"admin-email-chip\"><span>" + escapeHtml(email) + "</span><button type=\"button\" class=\"admin-email-chip__remove\" data-email-index=\"" + index + "\" aria-label=\"Удалить\">×</button></li>";
      })
      .join("");
    els.emailList.querySelectorAll("[data-email-index]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var index = parseInt(btn.getAttribute("data-email-index"), 10);
        if (!isNaN(index)) {
          state.notificationEmails.splice(index, 1);
          renderEmailList();
        }
      });
    });
  }

  function loadSettings() {
    if (!getToken()) {
      showLogin();
      return;
    }
    setFormMessage(els.settingsMessage, "", false);
    fetch(apiUrl("/admin/settings"), { method: "GET", headers: authHeaders() })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        if (!res.ok) throw new Error("Ошибка загрузки настроек");
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        state.notificationEmails = Array.isArray(data.lead_notification_emails) ? data.lead_notification_emails.slice() : [];
        renderEmailList();
      })
      .catch(function (err) {
        setFormMessage(els.settingsMessage, err.message || "Ошибка загрузки", true);
      });
  }

  function saveSettings() {
    if (!getToken()) {
      showLogin();
      return;
    }
    if (!state.notificationEmails.length) {
      setFormMessage(els.settingsMessage, "Добавьте хотя бы один email", true);
      return;
    }
    setFormMessage(els.settingsMessage, "Сохранение…", false);
    fetch(apiUrl("/admin/settings"), {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
      body: JSON.stringify({ lead_notification_emails: state.notificationEmails }),
    })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        return res.json().then(function (data) {
          return parseJsonError(res, data, "Ошибка сохранения");
        });
      })
      .then(function (data) {
        if (!data) return;
        state.notificationEmails = Array.isArray(data.lead_notification_emails) ? data.lead_notification_emails.slice() : state.notificationEmails;
        renderEmailList();
        setFormMessage(els.settingsMessage, "Настройки сохранены", false);
      })
      .catch(function (err) {
        setFormMessage(els.settingsMessage, err.message || "Ошибка сохранения", true);
      });
  }

  function addEmailFromInput() {
    if (!els.emailInput) return;
    var email = els.emailInput.value.trim().toLowerCase();
    if (!email) return;
    if (state.notificationEmails.indexOf(email) !== -1) {
      setFormMessage(els.settingsMessage, "Этот email уже в списке", true);
      return;
    }
    state.notificationEmails.push(email);
    els.emailInput.value = "";
    renderEmailList();
    setFormMessage(els.settingsMessage, "", false);
  }

  function loadUsers() {
    fetch(apiUrl("/admin/users"), { method: "GET", headers: authHeaders() })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        if (!res.ok) throw new Error("Ошибка загрузки пользователей");
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        state.usersData = data;
        renderUsersTable();
      })
      .catch(function (err) {
        if (els.usersTableBody) els.usersTableBody.innerHTML = "<tr><td colspan=\"5\" class=\"admin-table__empty admin-error-msg\">" + escapeHtml(err.message) + "</td></tr>";
      });
  }

  function renderUsersTable() {
    if (!els.usersTableBody) return;
    if (!state.usersData.length) {
      els.usersTableBody.innerHTML = "<tr><td colspan=\"5\" class=\"admin-table__empty\">Нет пользователей</td></tr>";
      return;
    }
    els.usersTableBody.innerHTML = state.usersData
      .map(function (user) {
        var status = user.is_active ? "Активен" : "Выключен";
        var roleSelect =
          "<select class=\"admin-select admin-select--small\" data-user-role=\"" + escapeAttr(String(user.id)) + "\" aria-label=\"Роль\">" +
          "<option value=\"owner\"" + (user.role === "owner" ? " selected" : "") + ">Owner</option>" +
          "<option value=\"manager\"" + (user.role === "manager" ? " selected" : "") + ">Manager</option>" +
          "</select>";
        var deactivateBtn = user.is_active
          ? "<button type=\"button\" class=\"admin-btn admin-btn--secondary admin-btn--small\" data-user-deactivate=\"" + escapeAttr(String(user.id)) + "\">Деактивировать</button>"
          : "—";
        return (
          "<tr>" +
          "<td>" + linkEmail(user.email) + "</td>" +
          "<td>" + roleSelect + "</td>" +
          "<td>" + escapeHtml(status) + "</td>" +
          "<td>" + formatDate(user.created_at) + "</td>" +
          "<td>" + deactivateBtn + "</td>" +
          "</tr>"
        );
      })
      .join("");

    els.usersTableBody.querySelectorAll("[data-user-role]").forEach(function (select) {
      select.addEventListener("change", function () {
        var userId = select.getAttribute("data-user-role");
        patchUser(userId, { role: select.value });
      });
    });
    els.usersTableBody.querySelectorAll("[data-user-deactivate]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var userId = btn.getAttribute("data-user-deactivate");
        if (!window.confirm("Деактивировать пользователя?")) return;
        deactivateUser(userId);
      });
    });
  }

  function patchUser(userId, body) {
    fetch(apiUrl("/admin/users/" + encodeURIComponent(userId)), {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
      body: JSON.stringify(body),
    })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        return res.json().then(function (data) {
          return parseJsonError(res, data, "Ошибка обновления пользователя");
        });
      })
      .then(function (data) {
        if (!data) return;
        loadUsers();
        setFormMessage(els.usersMessage, "Пользователь обновлён", false);
      })
      .catch(function (err) {
        setFormMessage(els.usersMessage, err.message || "Ошибка обновления", true);
        loadUsers();
      });
  }

  function deactivateUser(userId) {
    fetch(apiUrl("/admin/users/" + encodeURIComponent(userId)), { method: "DELETE", headers: authHeaders() })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        return res.json().then(function (data) {
          return parseJsonError(res, data, "Ошибка деактивации");
        });
      })
      .then(function (data) {
        if (!data) return;
        loadUsers();
        setFormMessage(els.usersMessage, "Пользователь деактивирован", false);
      })
      .catch(function (err) {
        setFormMessage(els.usersMessage, err.message || "Ошибка деактивации", true);
      });
  }

  function loadInvitations() {
    fetch(apiUrl("/admin/invitations"), { method: "GET", headers: authHeaders() })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        if (!res.ok) throw new Error("Ошибка загрузки приглашений");
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        state.invitationsData = data;
        renderInvitationsTable();
      })
      .catch(function (err) {
        if (els.invitationsList) els.invitationsList.innerHTML = "<li class=\"admin-invitations-list__empty admin-error-msg\">" + escapeHtml(err.message) + "</li>";
      });
  }

  function renderInvitationsTable() {
    if (!els.invitationsList) return;
    if (!state.invitationsData.length) {
      els.invitationsList.innerHTML = "<li class=\"admin-invitations-list__empty\">Нет ожидающих приглашений</li>";
      return;
    }
    els.invitationsList.innerHTML = state.invitationsData
      .map(function (inv) {
        return (
          "<li class=\"admin-invitations-list__item\">" +
          "<span>" + linkEmail(inv.email) + " · " + escapeHtml(roleLabel(inv.role)) + " · до " + formatDate(inv.expires_at) + "</span>" +
          "<span class=\"admin-invitations-list__actions\">" +
          "<button type=\"button\" class=\"admin-btn admin-btn--ghost admin-btn--small\" data-invite-resend=\"" + escapeAttr(String(inv.id)) + "\" data-invite-email=\"" + escapeAttr(inv.email) + "\" data-invite-role=\"" + escapeAttr(inv.role) + "\">Повторить</button> " +
          "<button type=\"button\" class=\"admin-btn admin-btn--ghost admin-btn--small\" data-invite-revoke=\"" + escapeAttr(String(inv.id)) + "\">Отозвать</button>" +
          "</span></li>"
        );
      })
      .join("");

    els.invitationsList.querySelectorAll("[data-invite-resend]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        sendInvite(btn.getAttribute("data-invite-email"), btn.getAttribute("data-invite-role"));
      });
    });
    els.invitationsList.querySelectorAll("[data-invite-revoke]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        revokeInvitation(btn.getAttribute("data-invite-revoke"));
      });
    });
  }

  function sendInvite(email, role) {
    if (!email || !role) return;
    setFormMessage(els.userInviteMessage, "Отправка…", false);
    fetch(apiUrl("/admin/users/invite"), {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
      body: JSON.stringify({ email: email, role: role }),
    })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        return res.json().then(function (data) {
          return parseJsonError(res, data, "Ошибка отправки приглашения");
        });
      })
      .then(function (data) {
        if (!data) return;
        if (els.userInviteEmail) els.userInviteEmail.value = "";
        setFormMessage(els.userInviteMessage, "Приглашение отправлено", false);
        loadInvitations();
      })
      .catch(function (err) {
        setFormMessage(els.userInviteMessage, err.message || "Ошибка отправки", true);
      });
  }

  function revokeInvitation(invitationId) {
    fetch(apiUrl("/admin/invitations/" + encodeURIComponent(invitationId)), { method: "DELETE", headers: authHeaders() })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        if (!res.ok) throw new Error("Ошибка отзыва приглашения");
        loadInvitations();
        setFormMessage(els.userInviteMessage, "Приглашение отозвано", false);
      })
      .catch(function (err) {
        setFormMessage(els.userInviteMessage, err.message || "Ошибка отзыва", true);
      });
  }

  function loadAudit() {
    var params = new URLSearchParams();
    params.set("limit", String(AUDIT_LIMIT));
    params.set("offset", String(state.auditOffset));
    fetch(apiUrl("/admin/audit") + "?" + params.toString(), { method: "GET", headers: authHeaders() })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        if (!res.ok) throw new Error("Ошибка загрузки аудита");
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        state.auditData = data;
        renderAuditTable();
        renderAuditPagination();
      })
      .catch(function (err) {
        if (els.auditTableBody) els.auditTableBody.innerHTML = "<tr><td colspan=\"5\" class=\"admin-table__empty admin-error-msg\">" + escapeHtml(err.message) + "</td></tr>";
      });
  }

  function renderAuditTable() {
    if (!els.auditTableBody) return;
    if (!state.auditData.length) {
      els.auditTableBody.innerHTML = "<tr><td colspan=\"5\" class=\"admin-table__empty\">Нет записей</td></tr>";
      return;
    }
    els.auditTableBody.innerHTML = state.auditData
      .map(function (row) {
        var meta = row.meta ? JSON.stringify(row.meta) : "—";
        return (
          "<tr>" +
          "<td>" + formatDate(row.created_at) + "</td>" +
          "<td>" + escapeHtml(row.actor_email || "—") + "</td>" +
          "<td>" + escapeHtml(row.action || "—") + "</td>" +
          "<td>" + escapeHtml((row.target_type || "—") + (row.target_id ? " #" + row.target_id : "")) + "</td>" +
          "<td>" + escapeHtml(meta) + "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function renderAuditPagination() {
    if (els.auditPrev) els.auditPrev.disabled = state.auditOffset === 0;
    if (els.auditNext) els.auditNext.disabled = state.auditData.length < AUDIT_LIMIT;
    if (els.auditInfo) {
      if (!state.auditData.length) els.auditInfo.textContent = "0";
      else {
        var from = state.auditOffset + 1;
        var to = state.auditOffset + state.auditData.length;
        els.auditInfo.textContent = from + "–" + to;
      }
    }
  }

  function loadInvitePreview(token) {
    setFormMessage(els.inviteMessage, "", false);
    fetch(apiUrl("/admin/invitations/" + encodeURIComponent(token)), { method: "GET" })
      .then(function (res) {
        if (res.status === 404 || res.status === 410) throw new Error("Приглашение недействительно или истекло");
        if (!res.ok) throw new Error("Ошибка проверки приглашения");
        return res.json();
      })
      .then(function (data) {
        if (els.inviteEmail) {
          els.inviteEmail.value = data.email || "";
          els.inviteEmail.readOnly = true;
        }
        if (els.inviteRoleDisplay) els.inviteRoleDisplay.textContent = roleLabel(data.role);
        state.inviteToken = token;
        state.inviteRole = data.role;
        showInviteBlock();
      })
      .catch(function (err) {
        setFormMessage(els.inviteMessage, err.message || "Ошибка", true);
        showInviteBlock();
      });
  }

  function acceptInvite(password) {
    if (!state.inviteToken) return Promise.resolve(null);
    return fetch(apiUrl("/admin/invitations/" + encodeURIComponent(state.inviteToken) + "/accept"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            var detail = data && data.detail ? data.detail : "Ошибка принятия приглашения";
            throw new Error(typeof detail === "string" ? detail : "Ошибка принятия приглашения");
          }
          return data;
        });
      });
  }

  function afterAuthSuccess() {
    return loadMe().then(function () {
      clearInviteFromUrl();
      restoreFiltersFromUrl();
      syncFilterFormFromState();
      showLeads();
      loadLeads();
      refreshNewLeadsBadge();
    });
  }

  function initElements() {
    blocks.login = document.getElementById("admin-login");
    blocks.invite = document.getElementById("admin-invite");
    blocks.leads = document.getElementById("admin-leads");
    blocks.detail = document.getElementById("admin-lead-detail");
    blocks.analytics = document.getElementById("admin-analytics");
    blocks.settings = document.getElementById("admin-settings");
    blocks.users = document.getElementById("admin-users");
    blocks.audit = document.getElementById("admin-audit");

    els.nav = document.getElementById("admin-nav");
    els.navLeads = document.getElementById("admin-nav-leads");
    els.navLeadsBadge = document.getElementById("admin-nav-leads-badge");
    els.navAnalytics = document.getElementById("admin-nav-analytics");
    els.navSettings = document.getElementById("admin-nav-settings");
    els.navUsers = document.getElementById("admin-nav-users");
    els.navAudit = document.getElementById("admin-nav-audit");
    els.topbar = document.getElementById("admin-topbar");
    els.pageTitle = document.getElementById("admin-page-title");
    els.sidebarToggle = document.getElementById("admin-sidebar-toggle");
    els.sidebarOverlay = document.getElementById("admin-sidebar-overlay");

    els.loginForm = document.getElementById("admin-login-form");
    els.loginMessage = document.getElementById("admin-login-message");

    els.inviteForm = document.getElementById("admin-invite-form");
    els.inviteEmail = document.getElementById("admin-invite-email");
    els.inviteRoleDisplay = document.getElementById("admin-invite-role-display");
    els.invitePassword = document.getElementById("admin-invite-password");
    els.inviteConfirm = document.getElementById("admin-invite-confirm");
    els.inviteMessage = document.getElementById("admin-invite-message");

    els.leadsTableBody = document.getElementById("admin-leads-tbody");
    els.leadsFilter = document.getElementById("admin-leads-filter");
    els.statusFilter = document.getElementById("admin-status-filter");
    els.leadsSearch = document.getElementById("admin-search");
    els.tabActive = document.getElementById("admin-tab-active");
    els.tabArchive = document.getElementById("admin-tab-archive");
    els.dateFrom = document.getElementById("admin-date-from");
    els.dateTo = document.getElementById("admin-date-to");
    els.datePresetToday = document.getElementById("admin-date-preset-today");
    els.datePreset7d = document.getElementById("admin-date-preset-7d");
    els.datePreset30d = document.getElementById("admin-date-preset-30d");
    els.applyFiltersBtn = document.getElementById("admin-apply-filters");
    els.clearDatesBtn = document.getElementById("admin-clear-dates");
    els.exportCsvBtn = document.getElementById("admin-export-csv");
    els.paginationPrev = document.getElementById("admin-pagination-prev");
    els.paginationNext = document.getElementById("admin-pagination-next");
    els.paginationInfo = document.getElementById("admin-pagination-info");

    els.detailBack = document.getElementById("admin-detail-back");
    els.detailPayload = document.getElementById("admin-detail-payload");
    els.detailConsents = document.getElementById("admin-detail-consents");
    els.detailLoading = document.getElementById("admin-detail-loading");
    els.detailStatus = document.getElementById("admin-detail-status");
    els.detailArchiveBtn = document.getElementById("admin-detail-archive");
    els.detailRestoreBtn = document.getElementById("admin-detail-restore");
    els.detailMessage = document.getElementById("admin-detail-message");
    els.detailNotesList = document.getElementById("admin-detail-notes-list");
    els.detailNoteInput = document.getElementById("admin-note-input");
    els.detailNoteAdd = document.getElementById("admin-note-add");
    els.detailNotesMessage = document.getElementById("admin-detail-notes-message");

    els.quickModal = document.getElementById("admin-quick-modal");
    els.quickModalOverlay = document.getElementById("admin-quick-modal-overlay");
    els.quickModalClose = document.getElementById("admin-quick-modal-close");
    els.quickModalTitle = document.getElementById("admin-quick-modal-title");
    els.quickModalStatus = document.getElementById("admin-quick-modal-status");
    els.quickModalArchiveBtn = document.getElementById("admin-quick-modal-archive");
    els.quickModalRestoreBtn = document.getElementById("admin-quick-modal-restore");
    els.quickModalMessage = document.getElementById("admin-quick-modal-message");
    els.quickModalNotesPreview = document.getElementById("admin-quick-modal-notes-preview");
    els.quickModalNoteInput = document.getElementById("admin-quick-modal-note-input");
    els.quickModalNoteAdd = document.getElementById("admin-quick-modal-note-add");
    els.quickModalOpenDetail = document.getElementById("admin-quick-modal-open-full");

    els.logoutBtn = document.getElementById("admin-logout");
    els.emailList = document.getElementById("admin-email-list");
    els.emailInput = document.getElementById("admin-email-input");
    els.emailAddBtn = document.getElementById("admin-email-add");
    els.settingsSaveBtn = document.getElementById("admin-settings-save");
    els.settingsMessage = document.getElementById("admin-settings-message");
    els.meEmail = document.getElementById("admin-me-email");
    els.passwordForm = document.getElementById("admin-password-form");
    els.passwordMessage = document.getElementById("admin-password-message");

    els.analyticsLoading = document.getElementById("admin-analytics-loading");
    els.analyticsNotConfigured = document.getElementById("admin-analytics-not-configured");
    els.analyticsContent = document.getElementById("admin-analytics-content");
    els.analyticsVisitors = document.getElementById("admin-analytics-visitors");
    els.analyticsPageviews = document.getElementById("admin-analytics-pageviews");
    els.analyticsVisits = document.getElementById("admin-analytics-visits");
    els.analyticsBounces = document.getElementById("admin-analytics-bounces");
    els.analyticsLeadsCount = document.getElementById("admin-analytics-leads-count");
    els.analyticsConversion = document.getElementById("admin-analytics-conversion-rate");
    els.analyticsLeadsChart = document.getElementById("admin-analytics-chart");
    els.analyticsTopPages = document.getElementById("admin-analytics-top-pages");
    els.analyticsRange7d = document.getElementById("admin-analytics-7d");
    els.analyticsRange30d = document.getElementById("admin-analytics-30d");

    els.usersTableBody = document.getElementById("admin-users-tbody");
    els.invitationsList = document.getElementById("admin-invitations-list");
    els.userInviteForm = document.getElementById("admin-users-invite-form");
    els.userInviteEmail = document.getElementById("admin-invite-user-email");
    els.userInviteRole = document.getElementById("admin-invite-user-role");
    els.userInviteMessage = document.getElementById("admin-users-invite-message");
    els.usersMessage = document.getElementById("admin-users-message");

    els.auditTableBody = document.getElementById("admin-audit-tbody");
    els.auditPrev = document.getElementById("admin-audit-pagination-prev");
    els.auditNext = document.getElementById("admin-audit-pagination-next");
    els.auditInfo = document.getElementById("admin-audit-pagination-info");
  }

  function bindEvents() {
    if (els.loginForm) {
      els.loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var emailEl = els.loginForm.querySelector('input[name="email"]');
        var passwordEl = els.loginForm.querySelector('input[name="password"]');
        var email = emailEl ? emailEl.value.trim() : "";
        var password = passwordEl ? passwordEl.value : "";
        if (!email || !password) {
          setFormMessage(els.loginMessage, "Введите email и пароль", true);
          return;
        }
        setFormMessage(els.loginMessage, "", false);
        fetch(apiUrl("/auth/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, password: password }),
        })
          .then(function (res) {
            if (res.status === 401) {
              setFormMessage(els.loginMessage, "Неверный email или пароль", true);
              return null;
            }
            if (!res.ok) throw new Error("Ошибка входа");
            return res.json();
          })
          .then(function (data) {
            if (!data) return;
            setToken(data.access_token || data.token || "");
            afterAuthSuccess();
          })
          .catch(function (err) {
            setFormMessage(els.loginMessage, err.message || "Ошибка входа", true);
          });
      });
    }

    if (els.inviteForm) {
      els.inviteForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var password = els.invitePassword ? els.invitePassword.value : "";
        var confirm = els.inviteConfirm ? els.inviteConfirm.value : "";
        if (password.length < 8) {
          setFormMessage(els.inviteMessage, "Пароль — минимум 8 символов", true);
          return;
        }
        if (password !== confirm) {
          setFormMessage(els.inviteMessage, "Пароли не совпадают", true);
          return;
        }
        setFormMessage(els.inviteMessage, "Создание аккаунта…", false);
        acceptInvite(password)
          .then(function (data) {
            if (!data) return;
            setToken(data.access_token || data.token || "");
            if (els.inviteForm) els.inviteForm.reset();
            return afterAuthSuccess();
          })
          .catch(function (err) {
            setFormMessage(els.inviteMessage, err.message || "Ошибка", true);
          });
      });
    }

    if (els.navLeads) {
      els.navLeads.addEventListener("click", function () {
        showLeads();
        loadLeads();
      });
    }
    if (els.navAnalytics) els.navAnalytics.addEventListener("click", showAnalytics);
    if (els.navSettings) els.navSettings.addEventListener("click", showSettings);
    if (els.navUsers) els.navUsers.addEventListener("click", showUsers);
    if (els.navAudit) els.navAudit.addEventListener("click", showAudit);

    if (els.leadsFilter) {
      els.leadsFilter.addEventListener("change", function () {
        state.typeFilter = els.leadsFilter.value || "";
        state.offset = 0;
        loadLeads();
      });
    }
    if (els.statusFilter) {
      els.statusFilter.addEventListener("change", function () {
        state.statusFilter = els.statusFilter.value || "";
        state.offset = 0;
        loadLeads();
      });
    }
    if (els.leadsSearch) {
      els.leadsSearch.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          state.q = els.leadsSearch.value.trim();
          state.offset = 0;
          loadLeads();
        }
      });
    }

    if (els.tabActive) {
      els.tabActive.addEventListener("click", function () {
        if (!state.archived) return;
        state.archived = false;
        state.offset = 0;
        updateArchiveTabs();
        loadLeads();
      });
    }
    if (els.tabArchive) {
      els.tabArchive.addEventListener("click", function () {
        if (state.archived) return;
        state.archived = true;
        state.offset = 0;
        updateArchiveTabs();
        loadLeads();
      });
    }

    if (els.applyFiltersBtn) {
      els.applyFiltersBtn.addEventListener("click", function () {
        state.createdAfter = els.dateFrom && els.dateFrom.value ? datetimeLocalToIso(els.dateFrom.value) : "";
        state.createdBefore = els.dateTo && els.dateTo.value ? datetimeLocalToIso(els.dateTo.value) : "";
        state.offset = 0;
        loadLeads();
      });
    }
    if (els.clearDatesBtn) {
      els.clearDatesBtn.addEventListener("click", function () {
        if (els.dateFrom) els.dateFrom.value = "";
        if (els.dateTo) els.dateTo.value = "";
        state.createdAfter = "";
        state.createdBefore = "";
        state.offset = 0;
        loadLeads();
      });
    }
    if (els.datePresetToday) els.datePresetToday.addEventListener("click", function () { applyDatePreset(0); });
    if (els.datePreset7d) els.datePreset7d.addEventListener("click", function () { applyDatePreset(7); });
    if (els.datePreset30d) els.datePreset30d.addEventListener("click", function () { applyDatePreset(30); });
    if (els.exportCsvBtn) els.exportCsvBtn.addEventListener("click", exportLeadsCsv);

    if (els.paginationPrev) {
      els.paginationPrev.addEventListener("click", function () {
        if (state.offset <= 0) return;
        state.offset = Math.max(0, state.offset - LIMIT);
        loadLeads();
      });
    }
    if (els.paginationNext) {
      els.paginationNext.addEventListener("click", function () {
        if (state.offset + state.leadsData.length >= state.leadsTotal) return;
        state.offset += LIMIT;
        loadLeads();
      });
    }

    if (els.detailBack) {
      els.detailBack.addEventListener("click", function () {
        showLeads();
        loadLeads();
      });
    }
    if (els.detailStatus) {
      els.detailStatus.addEventListener("change", function () {
        patchLead(state.currentLeadId, { status: els.detailStatus.value }, "Статус обновлён");
      });
    }
    if (els.detailArchiveBtn) {
      els.detailArchiveBtn.addEventListener("click", function () {
        patchLead(state.currentLeadId, { archived: true }, "Заявка в архиве").then(function () {
          showLeads();
          loadLeads();
        });
      });
    }
    if (els.detailRestoreBtn) {
      els.detailRestoreBtn.addEventListener("click", function () {
        patchLead(state.currentLeadId, { archived: false }, "Заявка восстановлена").then(function () {
          showLeads();
          loadLeads();
        });
      });
    }
    if (els.detailNoteAdd) {
      els.detailNoteAdd.addEventListener("click", function () {
        if (!state.currentLeadId || !els.detailNoteInput) return;
        var body = els.detailNoteInput.value.trim();
        if (!body) return;
        createNote(state.currentLeadId, body, els.detailNotesMessage).then(function () {
          if (els.detailNoteInput) els.detailNoteInput.value = "";
          loadDetailNotes(state.currentLeadId);
        });
      });
    }

    if (els.quickModalClose) els.quickModalClose.addEventListener("click", closeQuickEdit);
    if (els.quickModalOverlay) els.quickModalOverlay.addEventListener("click", closeQuickEdit);
    if (els.quickModalStatus) {
      els.quickModalStatus.addEventListener("change", function () {
        if (!state.quickEditLeadId) return;
        patchLead(state.quickEditLeadId, { status: els.quickModalStatus.value }, "Сохранено", els.quickModalMessage);
      });
    }
    if (els.quickModalArchiveBtn) {
      els.quickModalArchiveBtn.addEventListener("click", function () {
        if (!state.quickEditLeadId) return;
        patchLead(state.quickEditLeadId, { archived: true }, "В архиве", els.quickModalMessage).then(function (data) {
          if (data) closeQuickEdit();
        });
      });
    }
    if (els.quickModalRestoreBtn) {
      els.quickModalRestoreBtn.addEventListener("click", function () {
        if (!state.quickEditLeadId) return;
        patchLead(state.quickEditLeadId, { archived: false }, "Восстановлено", els.quickModalMessage).then(function (data) {
          if (data) closeQuickEdit();
        });
      });
    }
    if (els.quickModalNoteAdd) {
      els.quickModalNoteAdd.addEventListener("click", function () {
        if (!state.quickEditLeadId || !els.quickModalNoteInput) return;
        var body = els.quickModalNoteInput.value.trim();
        if (!body) return;
        createNote(state.quickEditLeadId, body, els.quickModalMessage).then(function () {
          if (els.quickModalNoteInput) els.quickModalNoteInput.value = "";
          loadLeadNotes(state.quickEditLeadId).then(function (notes) {
            renderQuickModalNotesPreview(notes);
          });
        });
      });
    }
    if (els.quickModalOpenDetail) {
      els.quickModalOpenDetail.addEventListener("click", function () {
        if (!state.quickEditLeadId) return;
        var id = state.quickEditLeadId;
        closeQuickEdit();
        openLeadDetail(id);
      });
    }

    if (els.analyticsRange7d) els.analyticsRange7d.addEventListener("click", function () { loadAnalytics("7d"); });
    if (els.analyticsRange30d) els.analyticsRange30d.addEventListener("click", function () { loadAnalytics("30d"); });

    if (els.logoutBtn) {
      els.logoutBtn.addEventListener("click", function () {
        clearToken();
        closeQuickEdit();
        closeSidebar();
        showLogin();
      });
    }
    if (els.sidebarToggle) els.sidebarToggle.addEventListener("click", toggleSidebar);
    if (els.sidebarOverlay) els.sidebarOverlay.addEventListener("click", closeSidebar);

    if (els.emailAddBtn) els.emailAddBtn.addEventListener("click", addEmailFromInput);
    if (els.emailInput) {
      els.emailInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          addEmailFromInput();
        }
      });
    }
    if (els.settingsSaveBtn) els.settingsSaveBtn.addEventListener("click", saveSettings);

    if (els.passwordForm) {
      els.passwordForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var currentEl = document.getElementById("admin-current-password");
        var newEl = document.getElementById("admin-new-password");
        var confirmEl = document.getElementById("admin-confirm-password");
        var currentPassword = currentEl ? currentEl.value : "";
        var newPassword = newEl ? newEl.value : "";
        var confirmPassword = confirmEl ? confirmEl.value : "";
        if (newPassword.length < 8) {
          setFormMessage(els.passwordMessage, "Новый пароль — минимум 8 символов", true);
          return;
        }
        if (newPassword !== confirmPassword) {
          setFormMessage(els.passwordMessage, "Пароли не совпадают", true);
          return;
        }
        setFormMessage(els.passwordMessage, "Сохранение…", false);
        fetch(apiUrl("/auth/change-password"), {
          method: "POST",
          headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
          body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        })
          .then(function (res) {
            if (handleUnauthorized(res)) return null;
            return res.json().then(function (data) {
              return parseJsonError(res, data, "Ошибка смены пароля");
            });
          })
          .then(function (data) {
            if (!data) return;
            els.passwordForm.reset();
            setFormMessage(els.passwordMessage, "Пароль изменён", false);
          })
          .catch(function (err) {
            setFormMessage(els.passwordMessage, err.message || "Ошибка смены пароля", true);
          });
      });
    }

    if (els.userInviteForm) {
      els.userInviteForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = els.userInviteEmail ? els.userInviteEmail.value.trim().toLowerCase() : "";
        var role = els.userInviteRole ? els.userInviteRole.value : "manager";
        if (!email) {
          setFormMessage(els.userInviteMessage, "Введите email", true);
          return;
        }
        sendInvite(email, role);
      });
    }

    if (els.auditPrev) {
      els.auditPrev.addEventListener("click", function () {
        if (state.auditOffset <= 0) return;
        state.auditOffset = Math.max(0, state.auditOffset - AUDIT_LIMIT);
        loadAudit();
      });
    }
    if (els.auditNext) {
      els.auditNext.addEventListener("click", function () {
        if (state.auditData.length < AUDIT_LIMIT) return;
        state.auditOffset += AUDIT_LIMIT;
        loadAudit();
      });
    }
  }

  function init() {
    initElements();
    bindEvents();
    updateArchiveTabs();

    var inviteToken = getInviteTokenFromUrl();
    if (inviteToken) {
      state.inviteToken = inviteToken;
      loadInvitePreview(inviteToken);
      return;
    }

    if (getToken()) {
      loadMe().then(function () {
        restoreFiltersFromUrl();
        syncFilterFormFromState();
        showLeads();
        loadLeads();
        refreshNewLeadsBadge();
      });
    } else {
      showLogin();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
