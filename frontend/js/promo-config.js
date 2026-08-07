/* Satva Samui — promo config (single source of truth for «+1 ночь бесплатно») */
(function () {
    'use strict';

    window.SATVA_PROMO = {
        id: 'promo_11th_night_2026q4',
        active: true,
        startDate: '2026-08-07',
        endDate: '2026-10-31',
        stayBefore: null,
        paidNights: 10,
        bonusNights: 1,
        socialByLang: {
            en: {
                network: 'instagram',
                handle: 'satva_samui_eng',
                url: 'https://www.instagram.com/satva_samui_eng/',
            },
            ru: {
                network: 'instagram',
                handle: 'satvasamui',
                url: 'https://www.instagram.com/satvasamui/',
            },
        },
        social: {
            network: 'instagram',
            handle: 'satvasamui',
            url: 'https://www.instagram.com/satvasamui/',
        },
        termsUrl: '/promo.html',
        tz: 'Asia/Bangkok',
        bookingDeadlineDays: 5,
    };

    var MONTHS_RU = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
    ];

    var MONTHS_EN = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];

    function getPageLang() {
        var lang = document.documentElement && document.documentElement.lang;
        if (!lang) return 'en';
        return lang.split('-')[0].toLowerCase();
    }

    function getSocial() {
        var p = window.SATVA_PROMO;
        var lang = getPageLang();
        if (p && p.socialByLang && p.socialByLang[lang]) return p.socialByLang[lang];
        return p && p.social ? p.social : { handle: '', url: '' };
    }

    function getBangkokDateIso() {
        return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    }

    function isPromoActive() {
        var p = window.SATVA_PROMO;
        if (!p || p.active !== true) return false;
        var today = getBangkokDateIso();
        if (today < p.startDate || today > p.endDate) return false;
        return true;
    }

    function formatIsoDate(iso, lang) {
        if (!iso) return '';
        var parts = iso.split('-');
        if (parts.length !== 3) return iso;
        var day = parseInt(parts[2], 10);
        var month = parseInt(parts[1], 10) - 1;
        if (lang === 'ru') {
            return day + ' ' + MONTHS_RU[month] + ' ' + parts[0] + ' г.';
        }
        return MONTHS_EN[month] + ' ' + day + ', ' + parts[0];
    }

    function addDaysToIso(iso, days) {
        var parts = iso.split('-');
        var d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
        d.setUTCDate(d.getUTCDate() + days);
        return d.toISOString().slice(0, 10);
    }

    function getBookingDeadlineIso() {
        var p = window.SATVA_PROMO;
        var days = (p && p.bookingDeadlineDays) || 5;
        var deadline = addDaysToIso(getBangkokDateIso(), days);
        if (p && p.endDate && deadline > p.endDate) return p.endDate;
        return deadline;
    }

    function formatEndDate() {
        var p = window.SATVA_PROMO;
        return formatIsoDate(p && p.endDate, getPageLang());
    }

    function formatBookingDeadline() {
        return formatIsoDate(getBookingDeadlineIso(), getPageLang());
    }

    function setFaqAnswers(active) {
        document.querySelectorAll('[data-promo-faq-active]').forEach(function (el) {
            el.hidden = !active;
        });
        document.querySelectorAll('[data-promo-faq-inactive]').forEach(function (el) {
            el.hidden = active;
        });
    }

    function applyGating() {
        var active = isPromoActive();
        var gated = document.querySelectorAll('[data-promo-gated]');

        if (!active) {
            gated.forEach(function (el) {
                el.remove();
            });
            setFaqAnswers(false);
            document.querySelectorAll('[data-promo-page-active]').forEach(function (el) {
                el.hidden = true;
            });
            document.querySelectorAll('[data-promo-page-ended]').forEach(function (el) {
                el.hidden = false;
            });
            return;
        }

        gated.forEach(function (el) {
            el.removeAttribute('data-promo-gated');
        });
        document.querySelectorAll('[data-promo-enddate]').forEach(function (el) {
            el.textContent = formatEndDate();
        });
        document.querySelectorAll('[data-promo-bookby]').forEach(function (el) {
            el.textContent = formatBookingDeadline();
        });
        setFaqAnswers(true);
        document.querySelectorAll('[data-promo-page-active]').forEach(function (el) {
            el.hidden = false;
        });
        document.querySelectorAll('[data-promo-page-ended]').forEach(function (el) {
            el.hidden = true;
        });
    }

    window.satvaPromo = {
        isActive: isPromoActive,
        formatEndDate: formatEndDate,
        formatBookingDeadline: formatBookingDeadline,
        getBookingDeadlineIso: getBookingDeadlineIso,
        getBangkokDateIso: getBangkokDateIso,
        getSocial: getSocial,
        paidNights: function () {
            return window.SATVA_PROMO ? window.SATVA_PROMO.paidNights : 10;
        },
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyGating);
    } else {
        applyGating();
    }
})();
