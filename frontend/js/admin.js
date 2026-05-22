(function () {
  "use strict";

  var TOKEN_KEY = "satva_admin_token";
  var LIMIT = 20;

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  var blocks = {
    login: null,
    leads: null,
    detail: null,
    settings: null,
  };

  var PAGE_TITLES = {
    leads: "Заявки",
    detail: "Заявка",
    settings: "Настройки",
  };

  var els = {
    nav: null,
    navLeads: null,
    navSettings: null,
    topbar: null,
    pageTitle: null,
    sidebarToggle: null,
    sidebarOverlay: null,
    loginForm: null,
    loginMessage: null,
    leadsTableBody: null,
    leadsFilter: null,
    dateFrom: null,
    dateTo: null,
    applyFiltersBtn: null,
    clearDatesBtn: null,
    paginationPrev: null,
    paginationNext: null,
    paginationInfo: null,
    detailBack: null,
    detailPayload: null,
    detailConsents: null,
    detailLoading: null,
    logoutBtn: null,
    emailList: null,
    emailInput: null,
    emailAddBtn: null,
    settingsSaveBtn: null,
    settingsMessage: null,
    meEmail: null,
    passwordForm: null,
    passwordMessage: null,
  };

  var state = {
    offset: 0,
    typeFilter: "",
    createdAfter: "",
    createdBefore: "",
    leadsData: [],
    notificationEmails: [],
  };

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
    if (document.body.classList.contains("admin-sidebar-open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  function updatePageTitle(name) {
    if (!els.pageTitle) return;
    els.pageTitle.textContent = PAGE_TITLES[name] || "Админка";
  }

  function showBlock(name) {
    Object.keys(blocks).forEach(function (key) {
      if (blocks[key]) {
        blocks[key].classList.toggle("admin-hidden", key !== name);
      }
    });
    var showNav = name !== "login";
    if (els.nav) {
      els.nav.classList.toggle("admin-hidden", !showNav);
    }
    if (els.topbar) {
      els.topbar.classList.toggle("admin-hidden", !showNav);
    }
    setLoggedIn(showNav);
    updateNavTabs(name);
    updatePageTitle(name);
    if (showNav) {
      closeSidebar();
    }
  }

  function updateNavTabs(name) {
    var activeLeads = name === "leads" || name === "detail";
    if (els.navLeads) {
      els.navLeads.classList.toggle("admin-nav__tab--active", activeLeads);
    }
    if (els.navSettings) {
      els.navSettings.classList.toggle("admin-nav__tab--active", name === "settings");
    }
  }

  function showLogin() {
    setLoggedIn(false);
    showBlock("login");
    if (els.loginMessage) {
      els.loginMessage.textContent = "";
      els.loginMessage.className = "form-message";
    }
  }

  function showLeads() {
    showBlock("leads");
  }

  function showDetail() {
    showBlock("detail");
  }

  function showSettings() {
    showBlock("settings");
    loadSettings();
    loadMe();
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

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function escapeAttr(s) {
    return s.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function setFormMessage(el, text, isError) {
    if (!el) return;
    el.textContent = text || "";
    el.className = "form-message" + (text ? (isError ? " form-message--error" : " form-message--success") : "");
  }

  function loadLeads() {
    var token = getToken();
    if (!token) {
      showLogin();
      return;
    }
    var params = new URLSearchParams();
    params.set("limit", String(LIMIT));
    params.set("offset", String(state.offset));
    if (state.typeFilter) {
      params.set("type", state.typeFilter);
    }
    if (state.createdAfter) {
      params.set("created_after", state.createdAfter);
    }
    if (state.createdBefore) {
      params.set("created_before", state.createdBefore);
    }
    var url = apiUrl("/leads") + "?" + params.toString();
    fetch(url, {
      method: "GET",
      headers: authHeaders(),
    })
      .then(function (res) {
        if (handleUnauthorized(res)) return;
        if (!res.ok) {
          throw new Error("Ошибка загрузки");
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        state.leadsData = Array.isArray(data) ? data : (data.items || data.data || []);
        renderLeadsTable();
        renderPagination();
      })
      .catch(function (err) {
        if (els.leadsTableBody) {
          els.leadsTableBody.innerHTML = "<tr><td colspan=\"5\" class=\"admin-table__empty admin-error-msg\">" + (err.message || "Ошибка загрузки") + "</td></tr>";
        }
      });
  }

  function renderLeadsTable() {
    var tbody = els.leadsTableBody;
    if (!tbody) return;
    var rows = state.leadsData;
    if (!rows.length) {
      tbody.innerHTML = "<tr><td colspan=\"5\" class=\"admin-table__empty\">Нет заявок</td></tr>";
      return;
    }
    tbody.innerHTML = rows
      .map(function (lead) {
        var payload = lead.payload || {};
        var name = payload.name != null ? String(payload.name) : "—";
        var phone = payload.phone != null ? String(payload.phone) : "—";
        var id = lead.id;
        return (
          "<tr>" +
          "<td>" + formatDate(lead.created_at) + "</td>" +
          "<td><span class=\"admin-type-badge\">" + escapeHtml(lead.type || "—") + "</span></td>" +
          "<td>" + escapeHtml(name) + "</td>" +
          "<td>" + escapeHtml(phone) + "</td>" +
          "<td><button type=\"button\" class=\"admin-btn admin-btn--primary admin-btn--small\" data-lead-id=\"" + escapeAttr(String(id)) + "\">Подробнее</button></td>" +
          "</tr>"
        );
      })
      .join("");

    tbody.querySelectorAll("[data-lead-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-lead-id");
        if (id) openLeadDetail(id);
      });
    });
  }

  function renderPagination() {
    var prev = els.paginationPrev;
    var next = els.paginationNext;
    var info = els.paginationInfo;
    if (prev) prev.disabled = state.offset === 0;
    if (next) next.disabled = state.leadsData.length < LIMIT;
    if (info) {
      var from = state.offset + 1;
      var to = state.offset + state.leadsData.length;
      info.textContent = state.leadsData.length ? from + "–" + to : "0";
    }
  }

  function openLeadDetail(id) {
    var token = getToken();
    if (!token) {
      showLogin();
      return;
    }
    showDetail();
    if (els.detailLoading) els.detailLoading.classList.remove("admin-hidden");
    if (els.detailPayload) els.detailPayload.innerHTML = "";
    if (els.detailConsents) els.detailConsents.innerHTML = "";

    fetch(apiUrl("/leads/" + encodeURIComponent(id)), {
      method: "GET",
      headers: authHeaders(),
    })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        if (!res.ok) throw new Error("Ошибка загрузки");
        return res.json();
      })
      .then(function (data) {
        if (els.detailLoading) els.detailLoading.classList.add("admin-hidden");
        if (!data) return;
        var payload = data.payload || {};
        var payloadKeys = Object.keys(payload);
        if (payloadKeys.length && els.detailPayload) {
          var dl = "<dl>";
          payloadKeys.forEach(function (k) {
            var v = payload[k];
            if (v != null && typeof v === "object") v = JSON.stringify(v);
            dl += "<dt>" + escapeHtml(k) + "</dt><dd>" + escapeHtml(String(v)) + "</dd>";
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
              consents
                .map(function (c) {
                  return (
                    "<tr><td>" +
                    formatDate(c.consent_at) +
                    "</td><td>" +
                    escapeHtml(String(c.policy_version != null ? c.policy_version : "—")) +
                    "</td><td>" +
                    escapeHtml(String(c.ip_address != null ? c.ip_address : "—")) +
                    "</td></tr>"
                  );
                })
                .join("") +
              "</tbody></table></div>";
          }
        }
      })
      .catch(function (err) {
        if (els.detailLoading) els.detailLoading.classList.add("admin-hidden");
        if (els.detailPayload) els.detailPayload.innerHTML = "<p class=\"admin-error-msg\">" + escapeHtml(err.message || "Ошибка загрузки") + "</p>";
      });
  }

  function renderEmailList() {
    if (!els.emailList) return;
    if (!state.notificationEmails.length) {
      els.emailList.innerHTML = "<li class=\"admin-email-list__empty\">Нет получателей — добавьте email и сохраните</li>";
      return;
    }
    els.emailList.innerHTML = state.notificationEmails
      .map(function (email, index) {
        return (
          "<li class=\"admin-email-chip\">" +
          "<span>" + escapeHtml(email) + "</span>" +
          "<button type=\"button\" class=\"admin-email-chip__remove\" data-email-index=\"" + index + "\" aria-label=\"Удалить\">×</button>" +
          "</li>"
        );
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
    var token = getToken();
    if (!token) {
      showLogin();
      return;
    }
    setFormMessage(els.settingsMessage, "", false);
    fetch(apiUrl("/admin/settings"), {
      method: "GET",
      headers: authHeaders(),
    })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        if (!res.ok) throw new Error("Ошибка загрузки настроек");
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        state.notificationEmails = Array.isArray(data.lead_notification_emails)
          ? data.lead_notification_emails.slice()
          : [];
        renderEmailList();
      })
      .catch(function (err) {
        setFormMessage(els.settingsMessage, err.message || "Ошибка загрузки", true);
      });
  }

  function saveSettings() {
    var token = getToken();
    if (!token) {
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
          if (!res.ok) {
            var detail = data && data.detail ? data.detail : "Ошибка сохранения";
            throw new Error(typeof detail === "string" ? detail : "Ошибка сохранения");
          }
          return data;
        });
      })
      .then(function (data) {
        if (!data) return;
        state.notificationEmails = Array.isArray(data.lead_notification_emails)
          ? data.lead_notification_emails.slice()
          : state.notificationEmails;
        renderEmailList();
        setFormMessage(els.settingsMessage, "Настройки сохранены", false);
      })
      .catch(function (err) {
        setFormMessage(els.settingsMessage, err.message || "Ошибка сохранения", true);
      });
  }

  function loadMe() {
    var token = getToken();
    if (!token || !els.meEmail) return;
    fetch(apiUrl("/auth/me"), {
      method: "GET",
      headers: authHeaders(),
    })
      .then(function (res) {
        if (handleUnauthorized(res)) return null;
        if (!res.ok) throw new Error("Ошибка загрузки профиля");
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        els.meEmail.textContent = data.email || "—";
      })
      .catch(function () {
        els.meEmail.textContent = "—";
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

  function initElements() {
    blocks.login = document.getElementById("admin-login");
    blocks.leads = document.getElementById("admin-leads");
    blocks.detail = document.getElementById("admin-lead-detail");
    blocks.settings = document.getElementById("admin-settings");

    els.nav = document.getElementById("admin-nav");
    els.navLeads = document.getElementById("admin-nav-leads");
    els.navSettings = document.getElementById("admin-nav-settings");
    els.topbar = document.getElementById("admin-topbar");
    els.pageTitle = document.getElementById("admin-page-title");
    els.sidebarToggle = document.getElementById("admin-sidebar-toggle");
    els.sidebarOverlay = document.getElementById("admin-sidebar-overlay");
    els.loginForm = document.getElementById("admin-login-form");
    els.loginMessage = document.getElementById("admin-login-message");
    els.leadsTableBody = document.getElementById("admin-leads-tbody");
    els.leadsFilter = document.getElementById("admin-leads-filter");
    els.dateFrom = document.getElementById("admin-date-from");
    els.dateTo = document.getElementById("admin-date-to");
    els.applyFiltersBtn = document.getElementById("admin-apply-filters");
    els.clearDatesBtn = document.getElementById("admin-clear-dates");
    els.paginationPrev = document.getElementById("admin-pagination-prev");
    els.paginationNext = document.getElementById("admin-pagination-next");
    els.paginationInfo = document.getElementById("admin-pagination-info");
    els.detailBack = document.getElementById("admin-detail-back");
    els.detailPayload = document.getElementById("admin-detail-payload");
    els.detailConsents = document.getElementById("admin-detail-consents");
    els.detailLoading = document.getElementById("admin-detail-loading");
    els.logoutBtn = document.getElementById("admin-logout");
    els.emailList = document.getElementById("admin-email-list");
    els.emailInput = document.getElementById("admin-email-input");
    els.emailAddBtn = document.getElementById("admin-email-add");
    els.settingsSaveBtn = document.getElementById("admin-settings-save");
    els.settingsMessage = document.getElementById("admin-settings-message");
    els.meEmail = document.getElementById("admin-me-email");
    els.passwordForm = document.getElementById("admin-password-form");
    els.passwordMessage = document.getElementById("admin-password-message");
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
          headers: {
            "Content-Type": "application/json",
          },
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
            showLeads();
            state.offset = 0;
            loadLeads();
          })
          .catch(function (err) {
            setFormMessage(els.loginMessage, err.message || "Ошибка входа", true);
          });
      });
    }

    if (els.navLeads) {
      els.navLeads.addEventListener("click", function () {
        showLeads();
        loadLeads();
      });
    }

    if (els.navSettings) {
      els.navSettings.addEventListener("click", function () {
        showSettings();
      });
    }

    if (els.leadsFilter) {
      els.leadsFilter.addEventListener("change", function () {
        state.typeFilter = els.leadsFilter.value || "";
        state.offset = 0;
        loadLeads();
      });
    }

    function datetimeLocalToIso(value) {
      if (!value) return "";
      var d = new Date(value);
      if (isNaN(d.getTime())) return "";
      return d.toISOString();
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

    if (els.paginationPrev) {
      els.paginationPrev.addEventListener("click", function () {
        if (state.offset <= 0) return;
        state.offset = Math.max(0, state.offset - LIMIT);
        loadLeads();
      });
    }

    if (els.paginationNext) {
      els.paginationNext.addEventListener("click", function () {
        state.offset += LIMIT;
        loadLeads();
      });
    }

    if (els.detailBack) {
      els.detailBack.addEventListener("click", function () {
        showLeads();
      });
    }

    if (els.logoutBtn) {
      els.logoutBtn.addEventListener("click", function () {
        clearToken();
        closeSidebar();
        showLogin();
      });
    }

    if (els.sidebarToggle) {
      els.sidebarToggle.addEventListener("click", toggleSidebar);
    }

    if (els.sidebarOverlay) {
      els.sidebarOverlay.addEventListener("click", closeSidebar);
    }

    if (els.emailAddBtn) {
      els.emailAddBtn.addEventListener("click", addEmailFromInput);
    }

    if (els.emailInput) {
      els.emailInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          addEmailFromInput();
        }
      });
    }

    if (els.settingsSaveBtn) {
      els.settingsSaveBtn.addEventListener("click", saveSettings);
    }

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
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        })
          .then(function (res) {
            if (handleUnauthorized(res)) return null;
            return res.json().then(function (data) {
              if (!res.ok) {
                var detail = data && data.detail ? data.detail : "Ошибка смены пароля";
                throw new Error(typeof detail === "string" ? detail : "Ошибка смены пароля");
              }
              return data;
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
  }

  function init() {
    initElements();
    bindEvents();
    if (getToken()) {
      showLeads();
      loadLeads();
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
