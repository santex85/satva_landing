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
  };

  var els = {
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
  };

  var state = {
    offset: 0,
    typeFilter: "",
    createdAfter: "",
    createdBefore: "",
    leadsData: [],
  };

  function apiUrl(path) {
    var origin = typeof window !== "undefined" && window.location ? window.location.origin : "";
    return origin + "/api" + path;
  }

  function showBlock(name) {
    Object.keys(blocks).forEach(function (key) {
      if (blocks[key]) {
        blocks[key].classList.toggle("admin-hidden", key !== name);
      }
    });
  }

  function showLogin() {
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

  function formatDate(iso) {
    if (!iso) return "—";
    try {
      var d = new Date(iso);
      return isNaN(d.getTime()) ? iso : d.toLocaleString("ru-RU");
    } catch (e) {
      return iso;
    }
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
      headers: {
        Authorization: "Bearer " + token,
      },
    })
      .then(function (res) {
        if (res.status === 401) {
          clearToken();
          showLogin();
          return;
        }
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
          els.leadsTableBody.innerHTML = "<tr><td colspan=\"5\" class=\"admin-error-msg\">" + (err.message || "Ошибка загрузки") + "</td></tr>";
        }
      });
  }

  function renderLeadsTable() {
    var tbody = els.leadsTableBody;
    if (!tbody) return;
    var rows = state.leadsData;
    if (!rows.length) {
      tbody.innerHTML = "<tr><td colspan=\"5\">Нет заявок</td></tr>";
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
          "<td>" + (lead.type || "—") + "</td>" +
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

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function escapeAttr(s) {
    return s.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
      headers: {
        Authorization: "Bearer " + token,
      },
    })
      .then(function (res) {
        if (res.status === 401) {
          clearToken();
          showLogin();
          return null;
        }
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

  function initElements() {
    blocks.login = document.getElementById("admin-login");
    blocks.leads = document.getElementById("admin-leads");
    blocks.detail = document.getElementById("admin-lead-detail");

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
          if (els.loginMessage) {
            els.loginMessage.textContent = "Введите email и пароль";
            els.loginMessage.className = "form-message form-message--error";
          }
          return;
        }
        if (els.loginMessage) {
          els.loginMessage.textContent = "";
          els.loginMessage.className = "form-message";
        }
        fetch(apiUrl("/auth/login"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email, password: password }),
        })
          .then(function (res) {
            if (res.status === 401) {
              if (els.loginMessage) {
                els.loginMessage.textContent = "Неверный email или пароль";
                els.loginMessage.className = "form-message form-message--error";
              }
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
            if (els.loginMessage) {
              els.loginMessage.textContent = err.message || "Ошибка входа";
              els.loginMessage.className = "form-message form-message--error";
            }
          });
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
        showLogin();
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
