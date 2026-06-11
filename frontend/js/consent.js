/* Satva Samui — cookie consent banner + UTM capture */
(function () {
    'use strict';

    var STORAGE_KEY = 'satva_consent';
    var UTM_STORAGE_KEY = 'satva_utm';
    var CONSENT_VERSION = '2026-06-11';
    var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

    var LANG = (document.documentElement.lang || 'ru').toLowerCase().indexOf('en') === 0 ? 'en' : 'ru';

    var STRINGS = {
        ru: {
            bannerTitle: 'Мы используем cookies',
            bannerText: 'Мы используем данные для работы сайта и обезличенной статистики.',
            acceptAll: 'Принять',
            rejectAll: 'Отклонить',
            configure: 'Настроить',
            save: 'Сохранить',
            settingsTitle: 'Настройки cookies',
            necessary: 'Необходимые',
            necessaryDesc: 'Формы, безопасность, сохранение ваших настроек.',
            analytics: 'Аналитика',
            analyticsDesc: 'Umami — конфиденциальная статистика без рекламных профилей.',
            marketing: 'Маркетинг',
            marketingDesc: 'Meta Pixel — измерение эффективности рекламы Facebook и Instagram.',
            footerLink: 'Настроить cookies',
            alwaysOn: 'Всегда включено',
        },
        en: {
            bannerTitle: 'We use cookies',
            bannerText: 'We use data to run the site and collect anonymous statistics.',
            acceptAll: 'Accept',
            rejectAll: 'Reject',
            configure: 'Configure',
            save: 'Save',
            settingsTitle: 'Cookie settings',
            necessary: 'Strictly necessary',
            necessaryDesc: 'Forms, security, and saving your preferences.',
            analytics: 'Analytics',
            analyticsDesc: 'Umami — privacy-friendly statistics without ad profiles.',
            marketing: 'Marketing',
            marketingDesc: 'Meta Pixel — measuring Facebook and Instagram ad performance.',
            footerLink: 'Cookie settings',
            alwaysOn: 'Always on',
        },
    };

    function t(key) {
        var bucket = STRINGS[LANG] || STRINGS.ru;
        return bucket[key] != null ? bucket[key] : key;
    }

    function defaultPreferences() {
        return { necessary: true, analytics: true, marketing: false };
    }

    function readStoredConsent() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            var data = JSON.parse(raw);
            if (!data || data.version !== CONSENT_VERSION) return null;
            return {
                necessary: true,
                analytics: data.analytics !== false,
                marketing: data.marketing === true,
                updatedAt: data.updatedAt || null,
            };
        } catch (e) {
            return null;
        }
    }

    function writeConsent(prefs) {
        var record = {
            version: CONSENT_VERSION,
            necessary: true,
            analytics: prefs.analytics !== false,
            marketing: prefs.marketing === true,
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
        return record;
    }

    function dispatchConsentChanged(prefs) {
        try {
            window.dispatchEvent(new CustomEvent('satva-consent-changed', { detail: prefs }));
        } catch (e) {
            /* IE11 fallback not required */
        }
    }

    function captureUtmFromUrl() {
        try {
            var params = new URLSearchParams(window.location.search);
            var stored = {};
            try {
                var existing = sessionStorage.getItem(UTM_STORAGE_KEY);
                if (existing) stored = JSON.parse(existing) || {};
            } catch (err) {
                stored = {};
            }
            var changed = false;
            UTM_KEYS.forEach(function (key) {
                var val = params.get(key);
                if (val && String(val).trim()) {
                    stored[key] = String(val).trim().slice(0, 512);
                    changed = true;
                }
            });
            if (changed || Object.keys(stored).length) {
                sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(stored));
            }
        } catch (e) {
            /* private mode */
        }
    }

    function getUtmParams() {
        try {
            var raw = sessionStorage.getItem(UTM_STORAGE_KEY);
            if (!raw) return {};
            var data = JSON.parse(raw);
            return data && typeof data === 'object' ? data : {};
        } catch (e) {
            return {};
        }
    }

    function mergeUtmIntoPayload(payload) {
        if (!payload || typeof payload !== 'object') return payload;
        var utm = getUtmParams();
        UTM_KEYS.forEach(function (key) {
            if (utm[key]) payload[key] = utm[key];
        });
        return payload;
    }

    var currentPrefs = readStoredConsent();
    var bannerEl = null;
    var settingsEl = null;

    function isGranted(category) {
        if (category === 'necessary') return true;
        if (!currentPrefs) return false;
        if (category === 'analytics') return currentPrefs.analytics !== false;
        if (category === 'marketing') return currentPrefs.marketing === true;
        return false;
    }

    function applyConsent(prefs) {
        currentPrefs = {
            necessary: true,
            analytics: prefs.analytics !== false,
            marketing: prefs.marketing === true,
        };
        writeConsent(currentPrefs);
        dispatchConsentChanged(currentPrefs);
        hideBanner();
        hideSettings();
    }

    function hideBanner() {
        if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
        bannerEl = null;
    }

    function hideSettings() {
        if (settingsEl && settingsEl.parentNode) settingsEl.parentNode.removeChild(settingsEl);
        settingsEl = null;
        document.documentElement.classList.remove('satva-consent-modal-open');
    }

    function buildToggleRow(id, label, desc, checked, disabled) {
        var row = document.createElement('div');
        row.className = 'satva-consent__row';
        row.innerHTML =
            '<div class="satva-consent__row-text">' +
            '<strong>' + label + '</strong>' +
            '<span>' + desc + '</span>' +
            (disabled ? '<em class="satva-consent__always">' + t('alwaysOn') + '</em>' : '') +
            '</div>' +
            '<label class="satva-consent__switch">' +
            '<input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' +
            '<span class="satva-consent__switch-ui" aria-hidden="true"></span>' +
            '</label>';
        return row;
    }

    function openSettings() {
        hideBanner();
        hideSettings();

        var prefs = currentPrefs || defaultPreferences();
        settingsEl = document.createElement('div');
        settingsEl.className = 'satva-consent satva-consent--settings';
        settingsEl.setAttribute('role', 'dialog');
        settingsEl.setAttribute('aria-modal', 'true');
        settingsEl.setAttribute('aria-labelledby', 'satvaConsentSettingsTitle');

        var panel = document.createElement('div');
        panel.className = 'satva-consent__panel';
        panel.innerHTML = '<h2 id="satvaConsentSettingsTitle" class="satva-consent__title">' + t('settingsTitle') + '</h2>';

        panel.appendChild(buildToggleRow('satvaConsentNecessary', t('necessary'), t('necessaryDesc'), true, true));
        panel.appendChild(buildToggleRow('satvaConsentAnalytics', t('analytics'), t('analyticsDesc'), prefs.analytics !== false, false));
        panel.appendChild(buildToggleRow('satvaConsentMarketing', t('marketing'), t('marketingDesc'), prefs.marketing === true, false));

        var actions = document.createElement('div');
        actions.className = 'satva-consent__actions';
        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'satva-consent__btn satva-consent__btn--primary';
        saveBtn.textContent = t('save');
        saveBtn.addEventListener('click', function () {
            var analyticsEl = document.getElementById('satvaConsentAnalytics');
            var marketingEl = document.getElementById('satvaConsentMarketing');
            applyConsent({
                analytics: analyticsEl ? analyticsEl.checked : true,
                marketing: marketingEl ? marketingEl.checked : false,
            });
        });
        actions.appendChild(saveBtn);
        panel.appendChild(actions);

        var overlay = document.createElement('button');
        overlay.type = 'button';
        overlay.className = 'satva-consent__overlay';
        overlay.setAttribute('aria-label', t('save'));
        overlay.addEventListener('click', hideSettings);

        settingsEl.appendChild(overlay);
        settingsEl.appendChild(panel);
        document.body.appendChild(settingsEl);
        document.documentElement.classList.add('satva-consent-modal-open');
        saveBtn.focus();
    }

    function showBanner() {
        if (bannerEl || currentPrefs) return;

        bannerEl = document.createElement('div');
        bannerEl.className = 'satva-consent satva-consent--banner';
        bannerEl.setAttribute('role', 'dialog');
        bannerEl.setAttribute('aria-labelledby', 'satvaConsentBannerTitle');
        bannerEl.setAttribute('aria-describedby', 'satvaConsentBannerText');

        var inner = document.createElement('div');
        inner.className = 'satva-consent__inner';
        inner.innerHTML =
            '<div class="satva-consent__content">' +
            '<h2 id="satvaConsentBannerTitle" class="satva-consent__title">' + t('bannerTitle') + '</h2>' +
            '<p id="satvaConsentBannerText" class="satva-consent__text">' + t('bannerText') + '</p>' +
            '</div>' +
            '<div class="satva-consent__actions"></div>';

        var actions = inner.querySelector('.satva-consent__actions');

        var acceptBtn = document.createElement('button');
        acceptBtn.type = 'button';
        acceptBtn.className = 'satva-consent__btn satva-consent__btn--primary';
        acceptBtn.textContent = t('acceptAll');
        acceptBtn.addEventListener('click', function () {
            applyConsent({ analytics: true, marketing: true });
        });

        var rejectBtn = document.createElement('button');
        rejectBtn.type = 'button';
        rejectBtn.className = 'satva-consent__btn satva-consent__btn--ghost';
        rejectBtn.textContent = t('rejectAll');
        rejectBtn.addEventListener('click', function () {
            applyConsent({ analytics: true, marketing: false });
        });

        var configBtn = document.createElement('button');
        configBtn.type = 'button';
        configBtn.className = 'satva-consent__btn satva-consent__btn--ghost';
        configBtn.textContent = t('configure');
        configBtn.addEventListener('click', openSettings);

        actions.appendChild(acceptBtn);
        actions.appendChild(rejectBtn);
        actions.appendChild(configBtn);
        bannerEl.appendChild(inner);
        document.body.appendChild(bannerEl);
    }

    function bindFooterLinks() {
        document.addEventListener('click', function (e) {
            var btn = e.target && e.target.closest ? e.target.closest('.js-open-cookie-settings') : null;
            if (!btn) return;
            e.preventDefault();
            openSettings();
        });
    }

    window.satvaConsent = {
        isGranted: isGranted,
        getPreferences: function () {
            return currentPrefs ? Object.assign({}, currentPrefs) : null;
        },
        openSettings: openSettings,
    };

    window.satvaUtm = {
        getParams: getUtmParams,
        mergeIntoPayload: mergeUtmIntoPayload,
    };

    captureUtmFromUrl();
    bindFooterLinks();

    if (currentPrefs) {
        dispatchConsentChanged(currentPrefs);
        window.addEventListener('load', function () {
            dispatchConsentChanged(currentPrefs);
        });
    } else {
        showBanner();
    }
})();
