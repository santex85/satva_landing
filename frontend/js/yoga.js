/* =========================================================
 * Satva Samui — Yoga Tour landing (yoga.html)
 * Vanilla JS, без фреймворков.
 * ========================================================= */

(function () {
    'use strict';

    var HEADER_OFFSET = 80; // высота хедера для smooth scroll и триггера .--scrolled

    var closeYogaLeadModalFn = null;
    var openYogaLeadModalFn = null;
    var closePromoModalFn = null;
    var yogaTurnstileLeadWidgetId = null;
    var yogaTurnstileSiteKey = '';

    var LANG = (document.documentElement.lang || 'ru').toLowerCase().indexOf('en') === 0 ? 'en' : 'ru';

    /** API: на satvasamui.ru запросы идут cross-origin на .com */
    function apiPath(p) {
        var h = window.location.hostname;
        if (h === 'satvasamui.ru' || h === 'www.satvasamui.ru') {
            return 'https://satvasamui.com/api' + p;
        }
        return (window.location.origin || '') + '/api' + p;
    }

    function isPartnerPage() {
        var path = (window.location.pathname || '').replace(/\/+$/, '') || '/';
        return path === '/partners' || path.indexOf('/partners/') === 0;
    }

    function applyLeadMeta(payload, form) {
        var src = (form.dataset && form.dataset.source) ? String(form.dataset.source).trim() : '';
        if (isPartnerPage()) {
            var base = src.replace(/^partner-/, '') || 'landing';
            payload.source = 'partner-' + base;
        } else if (src) {
            payload.source = src;
        }
        payload.lang = LANG;
    }

    var STRINGS = {
        ru: {
            invalidEmail: 'Некорректный email',
            phoneMinDigits: 'Минимум 10 цифр в номере',
            phoneTooLong: 'Слишком длинный номер',
            phoneThaiInvalid: 'Проверьте тайский номер (+66 …)',
            menuClose: 'Закрыть меню',
            menuOpen: 'Открыть меню',
            roomSlideLabel: 'Показать тип размещения {n} из {total}',
            genericErr: 'Ошибка отправки. Попробуйте позже или напишите в мессенджер.',
            submitting: 'Отправка…',
            submitButton: 'Отправить заявку',
            nameMin: 'Минимум 2 символа',
            nameChars: 'Только буквы, дефис и пробел',
            rateLimit: 'Слишком много запросов. Подождите минуту.',
            datesBothOrEmpty: 'Укажите обе даты заезда и выезда или оставьте поля пустыми.',
            departureBeforeArrival: 'Дата выезда не может быть раньше даты заезда.',
            cooldown: 'Подождите несколько секунд перед повторной отправкой.',
            consentRequired: 'Нужно согласие с политикой конфиденциальности, публичной офертой и условиями отмены бронирования.',
            checkFields: 'Проверьте поля выше.',
            captchaRequired: 'Пройдите проверку «Я не робот».',
            defaultProcedure: 'Йога-тур в Таиланд',
            networkError: 'Не удалось отправить. Проверьте сеть и попробуйте снова.',
        },
        en: {
            invalidEmail: 'Invalid email address',
            phoneMinDigits: 'Enter at least 10 digits',
            phoneTooLong: 'Phone number is too long',
            phoneThaiInvalid: 'Check the Thai number (+66 …)',
            menuClose: 'Close menu',
            menuOpen: 'Open menu',
            roomSlideLabel: 'Show accommodation type {n} of {total}',
            genericErr: 'Something went wrong. Please try again later or message us on WhatsApp.',
            submitting: 'Sending…',
            submitButton: 'Send Enquiry',
            nameMin: 'At least 2 characters',
            nameChars: 'Letters, hyphens and spaces only',
            rateLimit: 'Too many requests. Please wait a minute.',
            datesBothOrEmpty: 'Enter both arrival and departure dates, or leave both empty.',
            departureBeforeArrival: 'Departure date cannot be before arrival date.',
            cooldown: 'Please wait a few seconds before submitting again.',
            consentRequired: 'Please agree to the Privacy Policy, Terms & Conditions and Cancellation Policy.',
            checkFields: 'Please check the fields above.',
            captchaRequired: 'Please complete the security check.',
            defaultProcedure: 'Yoga Retreat in Thailand',
            networkError: 'Could not send your enquiry. Check your connection and try again.',
        },
    };

    function t(key) {
        var bucket = STRINGS[LANG] || STRINGS.ru;
        return bucket[key] != null ? bucket[key] : (STRINGS.ru[key] || key);
    }

    function tFmt(key, vars) {
        var s = t(key);
        if (!vars) return s;
        return s.replace(/\{(\w+)\}/g, function (_, k) {
            return vars[k] != null ? String(vars[k]) : '';
        });
    }

    /** Необязательный email: пусто допустимо, иначе простая проверка формата */
    function validateOptionalEmailRow(raw, errEl, inputEl) {
        var v = raw ? String(raw).trim() : '';
        if (!v) {
            if (errEl) errEl.textContent = '';
            if (inputEl) inputEl.classList.remove('yoga-form__input--error');
            return true;
        }
        var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        if (!ok) {
            if (errEl) errEl.textContent = t('invalidEmail');
            if (inputEl) inputEl.classList.add('yoga-form__input--error');
            return false;
        }
        if (errEl) errEl.textContent = '';
        if (inputEl) inputEl.classList.remove('yoga-form__input--error');
        return true;
    }

    /** E.164 для Tawk.to: только + и цифры, без пробелов. */
    function normalizeTawkPhone(phone) {
        if (!phone) return '';
        var cleaned = String(phone).replace(/[^\d+]/g, '');
        if (!cleaned) return '';
        if (cleaned.charAt(0) !== '+') cleaned = '+' + cleaned.replace(/^\+/, '');
        return cleaned;
    }

    function parseGuestCount(el) {
        if (!el || !el.value) return null;
        var n = parseInt(el.value, 10);
        return n >= 1 && n <= 999 ? n : null;
    }

    /** Метаданные для addEvent — без ключей phone/email (Tawk оборачивает их в HTML). */
    function buildTawkEventMeta(lead) {
        if (!lead || typeof lead !== 'object') return {};
        var meta = {};
        function add(key, val) {
            if (val == null) return;
            var s = String(val).trim();
            if (s) meta[key] = s;
        }
        add('name', lead.name);
        add('phone-number', normalizeTawkPhone(lead.phone) || lead.phone);
        add('email-address', lead.email);
        add('arrival-date', lead.preferred_date);
        add('departure-date', lead.departure_date);
        if (lead.guest_count != null) add('guest-count', lead.guest_count);
        add('comment', lead.comment);
        add('procedure', lead.procedure);
        add('package', lead.package_slug);
        add('source', lead.source);
        add('site-language', lead.lang === 'en' ? 'English site (EN)' : lead.lang === 'ru' ? 'Русский сайт (RU)' : '');
        add('submitted-at', new Date().toISOString());
        return meta;
    }

    function trackTawkLeadEvent(lead) {
        var eventMeta = buildTawkEventMeta(lead);
        if (!Object.keys(eventMeta).length) return;
        if (typeof window.Tawk_API.addEvent === 'function') {
            window.Tawk_API.addEvent('lead-form-submit', eventMeta, function (err) {
                if (err && window.console) console.warn('Tawk addEvent:', err);
            });
        }
    }

    function trackUmamiLead(lead) {
        try {
            if (window.umami && typeof window.umami.track === 'function') {
                window.umami.track('lead-submit', {
                    source: lead.source || '',
                    procedure: lead.procedure || '',
                    package: lead.package_slug || '',
                    lang: lead.lang || '',
                    promo: !!lead.promo_optin,
                });
            }
        } catch (e) {
            if (window.console) console.warn('Umami track failed:', e);
        }
    }

    function generateEventId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        return 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
    }

    function appendAttributionToPayload(payload) {
        if (window.satvaUtm && typeof window.satvaUtm.mergeIntoPayload === 'function') {
            window.satvaUtm.mergeIntoPayload(payload);
        }
        return payload;
    }

    function trackMetaLead(eventId, extra) {
        try {
            if (window.satvaPixel && typeof window.satvaPixel.trackLead === 'function') {
                window.satvaPixel.trackLead(eventId, extra);
            }
        } catch (e) {
            if (window.console) console.warn('Meta Pixel trackLead failed:', e);
        }
    }

    function isPromoFeatureActive() {
        return !!(window.satvaPromo && typeof window.satvaPromo.isActive === 'function' && window.satvaPromo.isActive());
    }

    function trackPromoEvent(name) {
        try {
            if (window.umami && typeof window.umami.track === 'function') {
                window.umami.track(name);
            }
        } catch (e) {
            if (window.console) console.warn('Umami promo track failed:', e);
        }
    }

    function countNights(arrival, departure) {
        if (!arrival || !departure) return null;
        var a = new Date(arrival + 'T00:00:00');
        var d = new Date(departure + 'T00:00:00');
        if (isNaN(a.getTime()) || isNaN(d.getTime())) return null;
        var nights = Math.round((d - a) / 86400000);
        return nights >= 0 ? nights : null;
    }

    function paidPromoNights() {
        return window.satvaPromo && typeof window.satvaPromo.paidNights === 'function'
            ? window.satvaPromo.paidNights()
            : 10;
    }

    function isPromoStayEligible(arrival, departure) {
        var nights = countNights(arrival, departure);
        return nights !== null && nights >= paidPromoNights();
    }

    function appendPromoToPayload(payload, optinEl) {
        if (!isPromoFeatureActive()) {
            payload.promo_id = null;
            payload.promo_optin = false;
            return;
        }
        var eligible = isPromoStayEligible(payload.preferred_date, payload.departure_date);
        var opted = eligible && !!(optinEl && optinEl.checked && !optinEl.disabled);
        payload.promo_optin = opted;
        payload.promo_id = opted && window.SATVA_PROMO ? window.SATVA_PROMO.id : null;
    }

    var pendingPromoOptin = false;

    function bindPromoFormFields(cfg) {
        if (!cfg || !cfg.optin) return;

        function syncOptinEnabled() {
            var arrival = cfg.arrival && cfg.arrival.value ? cfg.arrival.value.trim() : '';
            var departure = cfg.departure && cfg.departure.value ? cfg.departure.value.trim() : '';
            var eligible = isPromoStayEligible(arrival, departure);
            cfg.optin.disabled = !eligible;
            cfg.optin.setAttribute('aria-disabled', eligible ? 'false' : 'true');
            var label = cfg.optin.closest ? cfg.optin.closest('.yoga-form__promo-optin') : null;
            if (label) label.classList.toggle('is-disabled', !eligible);
            if (!eligible) {
                cfg.optin.checked = false;
            } else if (pendingPromoOptin) {
                cfg.optin.checked = true;
                pendingPromoOptin = false;
            }
            if (cfg.hint) cfg.hint.classList.toggle('is-hidden', eligible);
        }

        function onOptinChange() {
            if (cfg.optin.disabled) {
                cfg.optin.checked = false;
                return;
            }
            if (cfg.optin.checked) trackPromoEvent('promo_optin_checked');
        }

        cfg.optin.addEventListener('change', onOptinChange);
        ['change', 'input'].forEach(function (evt) {
            if (cfg.arrival) cfg.arrival.addEventListener(evt, syncOptinEnabled);
            if (cfg.departure) cfg.departure.addEventListener(evt, syncOptinEnabled);
        });

        syncOptinEnabled();
    }

    function openLeadModalWithPromoOptin() {
        if (closePromoModalFn) closePromoModalFn();
        if (openYogaLeadModalFn) openYogaLeadModalFn();
        pendingPromoOptin = true;
        var chk = document.getElementById('yogaLeadModalPromoOptin');
        var arrival = document.getElementById('yogaLeadModalArrivalDate');
        var departure = document.getElementById('yogaLeadModalDepartureDate');
        if (chk) {
            var eligible = isPromoStayEligible(
                arrival && arrival.value ? arrival.value.trim() : '',
                departure && departure.value ? departure.value.trim() : ''
            );
            chk.disabled = !eligible;
            chk.checked = eligible;
            if (eligible) pendingPromoOptin = false;
            var label = chk.closest ? chk.closest('.yoga-form__promo-optin') : null;
            if (label) label.classList.toggle('is-disabled', !eligible);
            var hint = document.getElementById('yogaLeadModalPromoNightsHint');
            if (hint) hint.classList.toggle('is-hidden', eligible);
        }
        trackPromoEvent('promo_modal_cta');
    }

    function initPromoBadgeView() {
        var badge = document.getElementById('promoBadge');
        if (!badge || !isPromoFeatureActive()) return;
        if (sessionStorage.getItem('satva_promo_badge_view')) return;

        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries, observer) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    if (!sessionStorage.getItem('satva_promo_badge_view')) {
                        sessionStorage.setItem('satva_promo_badge_view', '1');
                        trackPromoEvent('promo_badge_view');
                    }
                    observer.disconnect();
                });
            }, { threshold: 0.5 });
            io.observe(badge);
        }
    }

    function initPromoModal() {
        var modal = document.getElementById('promoModal');
        if (!modal || !modal.classList.contains('yoga-modal') || !isPromoFeatureActive()) return;

        var overlay = modal.querySelector('.yoga-modal__overlay');
        var closeBtn = modal.querySelector('.yoga-modal__close');
        var panel = modal.querySelector('.yoga-modal__content');
        var previousActive = null;
        var trapHandler = null;

        function getFocusable() {
            if (!panel) return [];
            return panel.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
        }

        function openModal(trigger) {
            previousActive = trigger || document.activeElement;
            modal.removeAttribute('hidden');
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            var list = getFocusable();
            if (list.length) list[0].focus();
            var first = list[0];
            var last = list[list.length - 1];
            trapHandler = function (e) {
                if (e.key !== 'Tab' || !list.length) return;
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            };
            modal.addEventListener('keydown', trapHandler);
        }

        function closeModal() {
            if (trapHandler) {
                modal.removeEventListener('keydown', trapHandler);
                trapHandler = null;
            }
            modal.classList.remove('is-open');
            modal.setAttribute('hidden', '');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            if (previousActive && previousActive.focus) previousActive.focus();
        }

        closePromoModalFn = closeModal;

        document.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('[data-open-modal]') : null;
            if (!btn || btn.getAttribute('data-open-modal') !== 'promoModal') return;
            e.preventDefault();
            if (btn.id === 'promoBadge') trackPromoEvent('promo_badge_click');
            openModal(btn);
        });

        var cta = document.getElementById('promoModalCtaLead');
        if (cta) {
            cta.addEventListener('click', function (e) {
                e.preventDefault();
                openLeadModalWithPromoOptin();
            });
        }

        if (overlay) overlay.addEventListener('click', closeModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (!modal.classList.contains('is-open')) return;
            e.preventDefault();
            closeModal();
        }, true);
    }

    /** Синхронизирует контакт Tawk (login по email + event). Без email — только addEvent. */
    function setTawkVisitor(lead, tawkLogin) {
        if (!lead || typeof lead !== 'object') return;

        if (!lead.email || !String(lead.email).trim()) {
            trackTawkLeadEvent(lead);
            return;
        }

        function applySetAttributes() {
            var attrs = {};
            if (lead.name) attrs.name = String(lead.name).trim();
            if (lead.email) attrs.email = String(lead.email).trim();
            var phone = normalizeTawkPhone(tawkLogin && tawkLogin.phone ? tawkLogin.phone : lead.phone);
            if (phone) attrs.phone = phone;
            if (!Object.keys(attrs).length) {
                trackTawkLeadEvent(lead);
                return;
            }
            if (typeof window.Tawk_API.setAttributes === 'function') {
                window.Tawk_API.setAttributes(attrs, function (err) {
                    if (err && window.console) console.warn('Tawk setAttributes:', err);
                    trackTawkLeadEvent(lead);
                });
            } else {
                trackTawkLeadEvent(lead);
            }
        }

        function apply() {
            if (!window.Tawk_API) return;
            try {
                if (
                    tawkLogin &&
                    tawkLogin.userId &&
                    tawkLogin.hash &&
                    typeof window.Tawk_API.login === 'function'
                ) {
                    var loginData = {
                        userId: String(tawkLogin.userId),
                        hash: String(tawkLogin.hash),
                    };
                    if (tawkLogin.name || lead.name) {
                        loginData.name = String(tawkLogin.name || lead.name).trim();
                    }
                    if (tawkLogin.email || lead.email) {
                        loginData.email = String(tawkLogin.email || lead.email).trim();
                    }
                    var loginPhone = normalizeTawkPhone(tawkLogin.phone || lead.phone);
                    if (loginPhone) loginData.phone = loginPhone;

                    window.Tawk_API.login(loginData, function (err) {
                        if (err && window.console) console.warn('Tawk login:', err);
                        trackTawkLeadEvent(lead);
                    });
                    return;
                }
                applySetAttributes();
            } catch (e) {
                if (window.console) console.warn('Tawk visitor sync failed:', e);
            }
        }

        if (window.Tawk_API && (typeof window.Tawk_API.login === 'function' || typeof window.Tawk_API.setAttributes === 'function')) {
            apply();
            return;
        }
        window.Tawk_API = window.Tawk_API || {};
        var prev = window.Tawk_API.onLoad;
        window.Tawk_API.onLoad = function () {
            if (typeof prev === 'function') {
                try {
                    prev();
                } catch (e) {}
            }
            apply();
        };
    }

    /** Собирает телефон из кода страны и национальной части в скрытое поле (для API и проверки). */
    function yogaSyncPhoneHidden(codeEl, nationalEl, hiddenEl) {
        if (!hiddenEl) return '';
        var code = (codeEl && codeEl.value) ? String(codeEl.value).trim() : '';
        if (!code) code = '+';
        var digitsNat = (nationalEl && nationalEl.value) ? String(nationalEl.value).replace(/\D/g, '') : '';
        if (!digitsNat) {
            hiddenEl.value = '';
            return '';
        }
        hiddenEl.value = code + ' ' + digitsNat;
        return hiddenEl.value;
    }

    /** Проверка номера: минимум 10 цифр суммарно; для +66 — тайское правило. */
    function yogaValidateIntlPhone(hiddenVal, phoneErr, errInput) {
        var raw = hiddenVal || '';
        var digits = raw.replace(/\D/g, '');
        if (digits.length < 10) {
            if (phoneErr) phoneErr.textContent = t('phoneMinDigits');
            if (errInput) errInput.classList.add('yoga-form__input--error');
            return false;
        }
        if (digits.length > 15) {
            if (phoneErr) phoneErr.textContent = t('phoneTooLong');
            if (errInput) errInput.classList.add('yoga-form__input--error');
            return false;
        }
        if (/^66/.test(digits) && !/^66[689]\d{8}$/.test(digits)) {
            if (phoneErr) phoneErr.textContent = t('phoneThaiInvalid');
            if (errInput) errInput.classList.add('yoga-form__input--error');
            return false;
        }
        return true;
    }

    // --- 00. Scroll Progress Bar ---------------------------------------------
    function initScrollProgress() {
        var bar = document.getElementById('yogaScrollProgress');
        if (!bar) return;

        var ticking = false;

        function update() {
            var doc = document.documentElement;
            var scrollTop = window.scrollY || doc.scrollTop || 0;
            var max = (doc.scrollHeight || document.body.scrollHeight) - window.innerHeight;
            var pct = max > 0 ? (scrollTop / max) * 100 : 0;
            if (pct < 0) pct = 0;
            if (pct > 100) pct = 100;
            bar.style.width = pct + '%';
            ticking = false;
        }

        function onScroll() {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(update);
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        update();
    }

    // --- 01. Header — затемнение после 80px ----------------------------------
    function initHeader() {
        var header = document.getElementById('yogaHeader');
        if (!header) return;

        var ticking = false;

        function update() {
            var scrolled = (window.scrollY || 0) > HEADER_OFFSET;
            header.classList.toggle('yoga-header--scrolled', scrolled);
            ticking = false;
        }

        function onScroll() {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(update);
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        update();
    }

    // --- 01b. Бургер-меню ----------------------------------------------------
    function initBurgerMenu() {
        var burger = document.getElementById('yogaBurger');
        var nav = document.getElementById('yogaNav');
        if (!burger || !nav) return;

        function open() {
            nav.classList.add('is-open');
            burger.classList.add('is-open');
            burger.setAttribute('aria-expanded', 'true');
            burger.setAttribute('aria-label', t('menuClose'));
        }

        function close() {
            nav.classList.remove('is-open');
            burger.classList.remove('is-open');
            burger.setAttribute('aria-expanded', 'false');
            burger.setAttribute('aria-label', t('menuOpen'));
        }

        function toggle() {
            if (nav.classList.contains('is-open')) close(); else open();
        }

        burger.addEventListener('click', function (e) {
            e.stopPropagation();
            toggle();
        });

        // Автозакрытие при клике по ссылке внутри меню
        nav.addEventListener('click', function (e) {
            var target = e.target;
            while (target && target !== nav) {
                if (target.tagName === 'A') {
                    close();
                    break;
                }
                if (target.tagName === 'BUTTON' && target.hasAttribute('data-open-modal')) {
                    close();
                    break;
                }
                target = target.parentNode;
            }
        });

        // Закрытие по Esc (capture: раньше всплытия, пока фокус внутри выезжающего меню)
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (!nav.classList.contains('is-open')) return;
            e.preventDefault();
            close();
            if (burger.focus) burger.focus();
        }, true);
    }

    // --- 01c. Плавный скролл по якорям ---------------------------------------
    function initSmoothScroll() {
        document.addEventListener('click', function (e) {
            var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
            if (!link) return;

            var href = link.getAttribute('href');
            if (!href || href === '#' || href.length < 2) return;

            var target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();
            var top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
            window.scrollTo({ top: top, behavior: 'smooth' });

            // Обновим hash без прыжка
            if (history.replaceState) {
                history.replaceState(null, '', href);
            }
        });
    }

    function initFadeIn() {
        var els = document.querySelectorAll('.yoga-fade-in');
        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (reduceMotion) {
            els.forEach(function (el) { el.classList.add('is-visible'); });
        } else if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries, observer) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

            els.forEach(function (el) { io.observe(el); });
        } else {
            els.forEach(function (el) { el.classList.add('is-visible'); });
        }

        // Hero — показываем контент сразу, без ожидания скролла
        if (!reduceMotion) {
            var hero = document.querySelector('.yoga-hero');
            if (hero) {
                var heroFades = hero.querySelectorAll('.yoga-fade-in');
                heroFades.forEach(function (el) { el.classList.add('is-visible'); });
            }
        }

        // Hero zoom-out — после полной загрузки картинки (LCP: <img> внутри .yoga-hero__bg)
        var heroBg = document.querySelector('.yoga-hero__bg');
        if (heroBg) {
            var activate = function () { heroBg.classList.add('is-loaded'); };
            var heroImg = heroBg.querySelector('img');
            if (heroImg) {
                if (heroImg.complete) {
                    activate();
                } else {
                    heroImg.addEventListener('load', activate, { once: true });
                    heroImg.addEventListener('error', activate, { once: true });
                }
            } else if (document.readyState === 'complete') {
                activate();
            } else {
                window.addEventListener('load', activate, { once: true });
            }
        }
    }

    // --- 09. Превью видео через canvas (кадр на ~1 с) -------------------------
    function initVideoThumbnails() {
        var videos = document.querySelectorAll(
            '#yogaReviews .yoga-reviews__card video, #yogaPromo .yoga-promo__thumb video'
        );
        if (!videos.length) return;

        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        function finishVideo(v) {
            try {
                v.pause();
                v.currentTime = 0;
            } catch (e) { /* noop */ }
        }

        function snapFrame(v) {
            v.addEventListener('seeked', function onSeeked() {
                v.removeEventListener('seeked', onSeeked);
                if (!ctx) {
                    finishVideo(v);
                    return;
                }
                try {
                    var w = v.videoWidth;
                    var h = v.videoHeight;
                    if (w > 0 && h > 0) {
                        canvas.width = w;
                        canvas.height = h;
                        ctx.drawImage(v, 0, 0, w, h);
                        v.poster = canvas.toDataURL('image/jpeg', 0.8);
                    }
                } catch (e) {
                    /* tainted canvas / Safari */
                }
                finishVideo(v);
            });

            var t = 1;
            try {
                if (v.duration && !isNaN(v.duration) && v.duration < 1.5) {
                    t = Math.max(0.08, v.duration * 0.25);
                }
            } catch (e) { /* noop */ }
            try {
                v.currentTime = t;
            } catch (e) {
                finishVideo(v);
            }
        }

        for (var i = 0; i < videos.length; i++) {
            (function (v) {
                if (v.readyState >= 1) {
                    snapFrame(v);
                } else {
                    v.addEventListener('loadedmetadata', function onMetaOnce() {
                        v.removeEventListener('loadedmetadata', onMetaOnce);
                        snapFrame(v);
                    });
                }
            }(videos[i]));
        }
    }

    // --- 09b. Модалка видео-отзыва --------------------------------------------
    function initVideoModal() {
        var modal = document.getElementById('yogaVideoModal');
        var player = document.getElementById('yogaVideoPlayer');
        if (!modal || !player) return;

        var overlay = modal.querySelector('.yoga-video-modal__overlay');
        var closeBtn = modal.querySelector('.yoga-video-modal__close');
        var landscapeClass = 'yoga-video-modal__player--landscape';

        function openModal(src, landscape) {
            player.src = src;
            if (landscape) {
                player.classList.add(landscapeClass);
            }
            modal.removeAttribute('hidden');
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            var p = player.play();
            if (p && typeof p.catch === 'function') p.catch(function () {});
        }

        function closeModal() {
            player.pause();
            player.removeAttribute('src');
            player.classList.remove(landscapeClass);
            try { player.load(); } catch (e) { /* noop */ }
            modal.classList.remove('is-open');
            modal.setAttribute('hidden', '');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        function onVideoClick(e) {
            var trigger = e.target.closest('[data-video]');
            if (!trigger) return;
            var src = trigger.getAttribute('data-video');
            if (!src) return;
            var isPromo = !!trigger.closest('#yogaPromo');
            openModal(src, isPromo);
        }

        var reviews = document.getElementById('yogaReviews');
        var promo = document.getElementById('yogaPromo');
        if (reviews) reviews.addEventListener('click', onVideoClick);
        if (promo) promo.addEventListener('click', onVideoClick);

        if (overlay) overlay.addEventListener('click', closeModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) {
                closeModal();
            }
        });
    }

    // --- 13. Год в подвале ---------------------------------------------------
    function initCopyrightYear() {
        var el = document.getElementById('yogaFooterYear');
        if (!el) return;
        el.textContent = String(new Date().getFullYear());
    }

    function initPrivacyModal() {
        var modal = document.getElementById('yogaModalPrivacy');
        if (!modal) return;
        var overlay = modal.querySelector('.yoga-modal__overlay');
        var closeBtn = modal.querySelector('.yoga-modal__close');
        var panel = modal.querySelector('.yoga-modal__content');
        var previousActive = null;
        var trapHandler = null;

        function getFocusable() {
            if (!panel) return [];
            return panel.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
        }

        function openModal() {
            previousActive = document.activeElement;
            modal.removeAttribute('hidden');
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            var list = getFocusable();
            if (list.length) {
                list[0].focus();
            }
            var first = list[0];
            var last = list[list.length - 1];
            trapHandler = function (e) {
                if (e.key !== 'Tab' || !list.length) return;
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            };
            modal.addEventListener('keydown', trapHandler);
        }

        function closeModal() {
            if (trapHandler) {
                modal.removeEventListener('keydown', trapHandler);
                trapHandler = null;
            }
            modal.classList.remove('is-open');
            modal.setAttribute('hidden', '');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            if (previousActive && previousActive.focus) {
                previousActive.focus();
            }
        }

        document.addEventListener('click', function (e) {
            var t = e.target;
            var opener = t.closest ? t.closest('.js-open-yoga-privacy') : null;
            if (!opener) return;
            e.preventDefault();
            e.stopPropagation();
            openModal();
        });

        if (overlay) {
            overlay.addEventListener('click', closeModal);
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (!modal.classList.contains('is-open')) return;
            closeModal();
        });
    }

    /** Модалки: публичная оферта и условия отмены (тот же UX, что у политики). */
    function initYogaOfferCancellationModals() {
        var configs = [
            ['yogaModalOffer', '.js-open-yoga-offer'],
            ['yogaModalCancellation', '.js-open-yoga-cancellation'],
        ];
        configs.forEach(function (cfg) {
            (function () {
                var modal = document.getElementById(cfg[0]);
                var openerSel = cfg[1];
                if (!modal) return;
                var overlay = modal.querySelector('.yoga-modal__overlay');
                var closeBtn = modal.querySelector('.yoga-modal__close');
                var panel = modal.querySelector('.yoga-modal__content');
                var previousActive = null;
                var trapHandler = null;

                function getFocusable() {
                    if (!panel) return [];
                    return panel.querySelectorAll(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );
                }

                function openModal() {
                    previousActive = document.activeElement;
                    modal.removeAttribute('hidden');
                    modal.classList.add('is-open');
                    modal.setAttribute('aria-hidden', 'false');
                    document.body.style.overflow = 'hidden';
                    var list = getFocusable();
                    if (list.length) list[0].focus();
                    var first = list[0];
                    var last = list[list.length - 1];
                    trapHandler = function (e) {
                        if (e.key !== 'Tab' || !list.length) return;
                        if (e.shiftKey) {
                            if (document.activeElement === first) {
                                e.preventDefault();
                                last.focus();
                            }
                        } else if (document.activeElement === last) {
                            e.preventDefault();
                            first.focus();
                        }
                    };
                    modal.addEventListener('keydown', trapHandler);
                }

                function closeModal() {
                    if (trapHandler) {
                        modal.removeEventListener('keydown', trapHandler);
                        trapHandler = null;
                    }
                    modal.classList.remove('is-open');
                    modal.setAttribute('hidden', '');
                    modal.setAttribute('aria-hidden', 'true');
                    document.body.style.overflow = '';
                    if (previousActive && previousActive.focus) previousActive.focus();
                }

                document.addEventListener('click', function (e) {
                    var opener = e.target.closest ? e.target.closest(openerSel) : null;
                    if (!opener) return;
                    e.preventDefault();
                    e.stopPropagation();
                    openModal();
                });

                if (overlay) overlay.addEventListener('click', closeModal);
                if (closeBtn) closeBtn.addEventListener('click', closeModal);
                document.addEventListener('keydown', function (e) {
                    if (e.key !== 'Escape') return;
                    if (!modal.classList.contains('is-open')) return;
                    closeModal();
                });
            }());
        });
    }

    function initTextReviewsShuffle() {
        var root = document.getElementById('yogaTextReviews');
        if (!root) return;
        var nodes = Array.prototype.slice.call(root.querySelectorAll('[data-text-review]'));
        for (var i = nodes.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = nodes[i];
            nodes[i] = nodes[j];
            nodes[j] = t;
        }
        nodes.forEach(function (n) {
            root.appendChild(n);
        });
    }

    function initFaqAccordion() {
        var root = document.getElementById('yogaFaq');
        if (!root) return;
        var toggles = root.querySelectorAll('.yoga-faq__question');
        toggles.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var isOpen = btn.getAttribute('aria-expanded') === 'true';
                var open = !isOpen;
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
                var panelId = btn.getAttribute('aria-controls');
                var panel = panelId ? document.getElementById(panelId) : null;
                if (panel) panel.hidden = !open;
            });
        });
    }

    function initRoomsCarousel() {
        var root = document.getElementById('yogaRoomsCarousel');
        if (!root) return;
        var viewport = root.querySelector('.yoga-rooms-carousel__viewport');
        var slides = Array.prototype.slice.call(root.querySelectorAll('.yoga-rooms-carousel__slide'));
        var prevBtn = root.querySelector('.yoga-rooms-carousel__btn--prev');
        var nextBtn = root.querySelector('.yoga-rooms-carousel__btn--next');
        var dotsRoot = root.querySelector('.yoga-rooms-carousel__dots');
        var idx = 0;
        var total = slides.length;
        if (!total || !dotsRoot) return;

        slides.forEach(function (_, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'yoga-rooms-carousel__dot' + (i === 0 ? ' is-active' : '');
            b.setAttribute('role', 'tab');
            b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
            b.textContent = String(i + 1);
            b.setAttribute('aria-label', tFmt('roomSlideLabel', { n: i + 1, total: total }));
            (function (slideIndex) {
                b.addEventListener('click', function () {
                    go(slideIndex, true);
                });
            }(i));
            dotsRoot.appendChild(b);
        });
        var dots = dotsRoot.querySelectorAll('.yoga-rooms-carousel__dot');

        function go(i, scrollDot) {
            idx = (i + total) % total;
            slides.forEach(function (s, j) {
                var on = j === idx;
                s.classList.toggle('is-active', on);
                s.hidden = !on;
                s.setAttribute('aria-hidden', on ? 'false' : 'true');
                if (dots[j]) {
                    dots[j].classList.toggle('is-active', on);
                    dots[j].setAttribute('aria-selected', on ? 'true' : 'false');
                    // scrollIntoView только по действию пользователя — иначе при go(0) на загрузке страница прыгает к номерам
                    if (on && scrollDot && dots[j].scrollIntoView) {
                        dots[j].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
                    }
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                go(idx - 1, true);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                go(idx + 1, true);
            });
        }
        var startX = null;
        var swipeStartedOnGalleryStage = false;
        if (viewport) {
            viewport.addEventListener('touchstart', function (e) {
                startX = e.changedTouches[0].screenX;
                swipeStartedOnGalleryStage = !!(
                    e.target &&
                    typeof e.target.closest === 'function' &&
                    e.target.closest('[data-room-gallery]')
                );
            }, { passive: true });
            viewport.addEventListener('touchend', function (e) {
                if (startX == null) return;
                var fromGalleryStage = swipeStartedOnGalleryStage;
                swipeStartedOnGalleryStage = false;
                var dx = e.changedTouches[0].screenX - startX;
                startX = null;
                if (Math.abs(dx) < 45) return;
                if (fromGalleryStage) return;
                if (dx < 0) go(idx + 1, true);
                else go(idx - 1, true);
            }, { passive: true });
        }
        go(0);
    }

    function initRoomsInnerGalleries() {
        var car = document.getElementById('yogaRoomsCarousel');
        if (!car) return;
        var galleries = car.querySelectorAll('[data-room-gallery]');
        if (!galleries.length) return;

        galleries.forEach(function (root) {
            var stage = root.querySelector('.yoga-rooms-gallery__stage');
            var panes = Array.prototype.slice.call(root.querySelectorAll('[data-gallery-pane]'));
            var thumbs = Array.prototype.slice.call(root.querySelectorAll('[data-gallery-thumb]'));
            var prevBtn = root.querySelector('[data-gallery-prev]');
            var nextBtn = root.querySelector('[data-gallery-next]');
            var n = panes.length;
            if (!n || !thumbs.length) return;

            var gi = 0;

            function goInner(i) {
                gi = (i + n) % n;
                panes.forEach(function (p, j) {
                    var on = j === gi;
                    p.classList.toggle('is-active', on);
                    p.setAttribute('aria-hidden', on ? 'false' : 'true');
                });
                thumbs.forEach(function (t, j) {
                    var on = j === gi;
                    t.classList.toggle('is-active', on);
                    t.setAttribute('aria-selected', on ? 'true' : 'false');
                    t.setAttribute('tabindex', on ? '0' : '-1');
                });
            }

            thumbs.forEach(function (t, j) {
                t.addEventListener('click', function () {
                    goInner(j);
                });
            });

            var tablist = root.querySelector('.yoga-rooms-gallery__thumbs');
            if (tablist) {
                tablist.addEventListener('keydown', function (e) {
                    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                    var fi = thumbs.indexOf(document.activeElement);
                    if (fi < 0) return;
                    e.preventDefault();
                    if (e.key === 'ArrowLeft') goInner(fi - 1);
                    else goInner(fi + 1);
                    if (thumbs[gi]) thumbs[gi].focus();
                });
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', function () {
                    goInner(gi - 1);
                });
            }
            if (nextBtn) {
                nextBtn.addEventListener('click', function () {
                    goInner(gi + 1);
                });
            }

            var sx = null;
            if (stage) {
                stage.addEventListener('touchstart', function (e) {
                    sx = e.changedTouches[0].screenX;
                }, { passive: true });
                stage.addEventListener('touchend', function (e) {
                    if (sx == null) return;
                    var dx = e.changedTouches[0].screenX - sx;
                    sx = null;
                    if (Math.abs(dx) < 45) return;
                    e.stopPropagation();
                    if (dx < 0) goInner(gi + 1);
                    else goInner(gi - 1);
                }, { passive: true });

                stage.addEventListener('keydown', function (e) {
                    if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        goInner(gi - 1);
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        goInner(gi + 1);
                    }
                });
            }

            goInner(0);
        });
    }

    // --- 14c. Модалка быстрой заявки (#modal-lead) ----------------------------
    function initYogaLeadModal() {
        var modal = document.getElementById('modal-lead');
        if (!modal || !modal.classList.contains('yoga-modal')) return;

        var overlay = modal.querySelector('.yoga-modal__overlay');
        var closeBtn = modal.querySelector('.yoga-modal__close');
        var panel = modal.querySelector('.yoga-modal__content');
        var previousActive = null;
        var trapHandler = null;

        function getFocusable() {
            if (!panel) return [];
            return panel.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
        }

        function resetLeadModalFormState() {
            var leadForm = document.getElementById('yogaLeadFormModal');
            var leadSuccess = document.getElementById('yogaLeadFormSuccess');
            var leadError = document.getElementById('yogaLeadFormError');
            if (leadForm) leadForm.classList.remove('is-hidden');
            if (leadSuccess) leadSuccess.classList.add('is-hidden');
            if (leadError) {
                leadError.textContent = '';
                leadError.classList.add('is-hidden');
            }
        }

        function openModal() {
            previousActive = document.activeElement;
            resetLeadModalFormState();
            modal.removeAttribute('hidden');
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            var list = getFocusable();
            if (list.length) {
                list[0].focus();
            }
            var first = list[0];
            var last = list[list.length - 1];
            trapHandler = function (e) {
                if (e.key !== 'Tab' || !list.length) return;
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            };
            modal.addEventListener('keydown', trapHandler);
        }

        function closeModal() {
            if (trapHandler) {
                modal.removeEventListener('keydown', trapHandler);
                trapHandler = null;
            }
            modal.classList.remove('is-open');
            modal.setAttribute('hidden', '');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            if (previousActive && previousActive.focus) {
                previousActive.focus();
            }
        }

        closeYogaLeadModalFn = closeModal;
        openYogaLeadModalFn = openModal;

        document.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('[data-open-modal]') : null;
            if (!btn || btn.getAttribute('data-open-modal') !== 'modal-lead') return;
            e.preventDefault();
            openModal();
            if (btn.hasAttribute('data-promo-cta')) {
                pendingPromoOptin = true;
                var chk = document.getElementById('yogaLeadModalPromoOptin');
                var arrival = document.getElementById('yogaLeadModalArrivalDate');
                var departure = document.getElementById('yogaLeadModalDepartureDate');
                if (chk) {
                    var eligible = isPromoStayEligible(
                        arrival && arrival.value ? arrival.value.trim() : '',
                        departure && departure.value ? departure.value.trim() : ''
                    );
                    chk.disabled = !eligible;
                    if (eligible) {
                        chk.checked = true;
                        pendingPromoOptin = false;
                    } else {
                        chk.checked = false;
                    }
                    chk.dispatchEvent(new Event('change'));
                    var label = chk.closest ? chk.closest('.yoga-form__promo-optin') : null;
                    if (label) label.classList.toggle('is-disabled', !eligible);
                    var hint = document.getElementById('yogaLeadModalPromoNightsHint');
                    if (hint) hint.classList.toggle('is-hidden', eligible);
                }
                trackPromoEvent('promo_hero_cta');
            }
        });

        if (overlay) {
            overlay.addEventListener('click', closeModal);
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (!modal.classList.contains('is-open')) return;
            e.preventDefault();
            closeModal();
        }, true);
    }

    // --- 14ca. Модалка «Подробнее» о Панчакарме ------------------------------
    function initYogaPanchaInfoModal() {
        var modal = document.getElementById('modal-pancha-info');
        if (!modal || !modal.classList.contains('yoga-modal')) return;

        var overlay = modal.querySelector('.yoga-modal__overlay');
        var closeBtn = modal.querySelector('.yoga-modal__close');
        var panel = modal.querySelector('.yoga-modal__content');
        var previousActive = null;
        var trapHandler = null;

        function getFocusable() {
            if (!panel) return [];
            return panel.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
        }

        function openModal() {
            previousActive = document.activeElement;
            modal.removeAttribute('hidden');
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            var list = getFocusable();
            if (list.length) {
                list[0].focus();
            }
            var first = list[0];
            var last = list[list.length - 1];
            trapHandler = function (e) {
                if (e.key !== 'Tab' || !list.length) return;
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            };
            modal.addEventListener('keydown', trapHandler);
        }

        function closeModal() {
            if (trapHandler) {
                modal.removeEventListener('keydown', trapHandler);
                trapHandler = null;
            }
            modal.classList.remove('is-open');
            modal.setAttribute('hidden', '');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            if (previousActive && previousActive.focus) {
                previousActive.focus();
            }
        }

        document.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('[data-open-modal]') : null;
            if (!btn || btn.getAttribute('data-open-modal') !== 'modal-pancha-info') return;
            e.preventDefault();
            openModal();
        });

        if (overlay) {
            overlay.addEventListener('click', closeModal);
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (!modal.classList.contains('is-open')) return;
            e.preventDefault();
            closeModal();
        }, true);
    }

    // --- 14d. Форма в модалке быстрой заявки ---------------------------------
    function initYogaLeadForm() {
        var form = document.getElementById('yogaLeadFormModal');
        if (!form) return;

        var nameIn = document.getElementById('yogaLeadModalName');
        var phoneIn = document.getElementById('yogaLeadModalPhone');
        var phoneCode = document.getElementById('yogaLeadModalPhoneCode');
        var phoneNat = document.getElementById('yogaLeadModalPhoneNational');
        var emailIn = document.getElementById('yogaLeadModalEmail');
        var consent = document.getElementById('yogaLeadModalConsent');
        var websiteHp = document.getElementById('yogaLeadModalWebsite');
        var submitBtn = document.getElementById('yogaLeadModalSubmit');
        var errBox = document.getElementById('yogaLeadFormError');
        var successBox = document.getElementById('yogaLeadFormSuccess');
        var nameErr = document.getElementById('yogaLeadModalNameErr');
        var phoneErr = document.getElementById('yogaLeadModalPhoneErr');
        var emailErr = document.getElementById('yogaLeadModalEmailErr');
        var arrivalDate = document.getElementById('yogaLeadModalArrivalDate');
        var departureDate = document.getElementById('yogaLeadModalDepartureDate');
        var guestCount = document.getElementById('yogaLeadModalGuestCount');
        var comment = document.getElementById('yogaLeadModalComment');
        var promoOptin = document.getElementById('yogaLeadModalPromoOptin');

        bindPromoFormFields({
            optin: promoOptin,
            hint: document.getElementById('yogaLeadModalPromoNightsHint'),
            arrival: arrivalDate,
            departure: departureDate,
        });

        var lastSubmitTime = 0;
        var SUBMIT_COOLDOWN_MS = 5000;

        var GENERIC_ERR = t('genericErr');

        function setFormLoading(loading) {
            if (!submitBtn) return;
            submitBtn.disabled = loading;
            submitBtn.textContent = loading ? t('submitting') : t('submitButton');
        }

        function showFormError(msg) {
            if (!errBox) return;
            errBox.textContent = msg || '';
            errBox.classList.toggle('is-hidden', !msg);
        }

        function clearNamePhoneErrors() {
            if (nameIn) nameIn.classList.remove('yoga-form__input--error');
            if (phoneNat) phoneNat.classList.remove('yoga-form__input--error');
            if (emailIn) emailIn.classList.remove('yoga-form__input--error');
            if (nameErr) nameErr.textContent = '';
            if (phoneErr) phoneErr.textContent = '';
            if (emailErr) emailErr.textContent = '';
        }

        function validateName() {
            var v = (nameIn && nameIn.value) ? nameIn.value.trim() : '';
            if (v.length < 2) {
                if (nameErr) nameErr.textContent = t('nameMin');
                if (nameIn) nameIn.classList.add('yoga-form__input--error');
                return false;
            }
            if (!/^[а-яА-ЯёЁa-zA-Z\s-]+$/.test(v)) {
                if (nameErr) nameErr.textContent = t('nameChars');
                if (nameIn) nameIn.classList.add('yoga-form__input--error');
                return false;
            }
            return true;
        }

        function validatePhone() {
            yogaSyncPhoneHidden(phoneCode, phoneNat, phoneIn);
            return yogaValidateIntlPhone(phoneIn && phoneIn.value, phoneErr, phoneNat);
        }

        function getCaptchaToken() {
            if (yogaTurnstileLeadWidgetId == null || !window.turnstile || !window.turnstile.getResponse) {
                return '';
            }
            return window.turnstile.getResponse(yogaTurnstileLeadWidgetId) || '';
        }

        function resetTurnstileLead() {
            if (yogaTurnstileLeadWidgetId != null && window.turnstile && window.turnstile.reset) {
                try {
                    window.turnstile.reset(yogaTurnstileLeadWidgetId);
                } catch (e) { /* noop */ }
            }
        }

        function msgFromApi(status, body) {
            if (status === 429) {
                return t('rateLimit');
            }
            if (!body || typeof body !== 'object') return null;
            var d = body.detail;
            if (typeof d === 'string' && d.trim()) return d;
            if (Array.isArray(d)) {
                var parts = [];
                for (var i = 0; i < d.length; i++) {
                    if (d[i] && typeof d[i].msg === 'string') parts.push(d[i].msg);
                }
                if (parts.length) return parts.join(' ');
            }
            return null;
        }

        function validateStayDates() {
            var a = (arrivalDate && arrivalDate.value) ? arrivalDate.value.trim() : '';
            var d = (departureDate && departureDate.value) ? departureDate.value.trim() : '';
            if (!a && !d) return true;
            if ((a && !d) || (!a && d)) {
                showFormError(t('datesBothOrEmpty'));
                return false;
            }
            if (d < a) {
                showFormError(t('departureBeforeArrival'));
                return false;
            }
            return true;
        }

        function bindLeadPhoneSync() {
            function onPhonePartChange() {
                yogaSyncPhoneHidden(phoneCode, phoneNat, phoneIn);
                if (phoneNat) phoneNat.classList.remove('yoga-form__input--error');
                if (phoneErr) phoneErr.textContent = '';
            }
            if (phoneCode) phoneCode.addEventListener('change', onPhonePartChange);
            if (phoneNat) phoneNat.addEventListener('input', onPhonePartChange);
        }
        bindLeadPhoneSync();

        if (nameIn) {
            nameIn.addEventListener('input', function () {
                nameIn.classList.remove('yoga-form__input--error');
                if (nameErr) nameErr.textContent = '';
            });
        }
        if (emailIn) {
            emailIn.addEventListener('input', function () {
                emailIn.classList.remove('yoga-form__input--error');
                if (emailErr) emailErr.textContent = '';
            });
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            showFormError('');

            var now = Date.now();
            if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
                showFormError(t('cooldown'));
                return;
            }

            if (consent && !consent.checked) {
                showFormError(t('consentRequired'));
                return;
            }

            clearNamePhoneErrors();
            yogaSyncPhoneHidden(phoneCode, phoneNat, phoneIn);
            var okN = validateName();
            var okP = validatePhone();
            var okD = validateStayDates();
            var rawEmailLead = emailIn ? emailIn.value : '';
            var okE = validateOptionalEmailRow(rawEmailLead, emailErr, emailIn);
            if (!okN || !okP || !okE || !okD) {
                if (okD) {
                    showFormError(t('checkFields'));
                }
                if (!okN && nameIn) nameIn.focus();
                else if (!okP && phoneNat) phoneNat.focus();
                else if (!okE && emailIn) emailIn.focus();
                else if (!okD && arrivalDate) arrivalDate.focus();
                return;
            }

            if (yogaTurnstileSiteKey && !getCaptchaToken()) {
                showFormError(t('captchaRequired'));
                return;
            }

            lastSubmitTime = now;
            setFormLoading(true);

            var pDate = (arrivalDate && arrivalDate.value) ? arrivalDate.value.trim() : '';
            var depDate = (departureDate && departureDate.value) ? departureDate.value.trim() : '';
            var guests = parseGuestCount(guestCount);
            var cmt = (comment && comment.value) ? comment.value.trim() : '';
            var procEl = form.querySelector('input[name="procedure"]');
            var procedure = (procEl && procEl.value) ? procEl.value.trim() : t('defaultProcedure');

            var payload = {
                name: (nameIn && nameIn.value) ? nameIn.value.trim() : '',
                phone: (phoneIn && phoneIn.value) ? phoneIn.value.trim() : '',
                consent: consent ? consent.checked : false,
                website: (websiteHp && websiteHp.value) ? websiteHp.value : '',
                captcha_token: getCaptchaToken() || null,
                procedure: procedure,
                preferred_date: pDate || null,
                departure_date: depDate || null,
                guest_count: guests,
                comment: cmt || null,
            };
            var emLeadTrim = (emailIn && emailIn.value) ? emailIn.value.trim() : '';
            if (emLeadTrim) payload.email = emLeadTrim;

            appendPromoToPayload(payload, promoOptin);
            applyLeadMeta(payload, form);
            payload.meta_event_id = generateEventId();
            appendAttributionToPayload(payload);

            fetch(apiPath('/booking'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
                .then(function (response) {
                    return response.text().then(function (text) {
                        var body = null;
                        if (text) {
                            try {
                                body = JSON.parse(text);
                            } catch (err) {
                                body = null;
                            }
                        }
                        return { ok: response.ok, status: response.status, body: body };
                    });
                })
                .then(function (r) {
                    setFormLoading(false);
                    resetTurnstileLead();
                    if (r.ok) {
                        trackUmamiLead(payload);
                        trackMetaLead(
                            payload.meta_event_id,
                            payload.promo_optin ? { content_category: 'promo_11th_night' } : undefined
                        );
                        setTawkVisitor(payload, r.body && r.body.tawk_login);
                        form.reset();
                        clearNamePhoneErrors();
                        showFormError('');
                        if (consent) consent.checked = false;
                        if (promoOptin) promoOptin.checked = false;
                        form.classList.add('is-hidden');
                        if (successBox) successBox.classList.remove('is-hidden');
                        setTimeout(function () {
                            if (closeYogaLeadModalFn) closeYogaLeadModalFn();
                        }, 2500);
                    } else {
                        showFormError(msgFromApi(r.status, r.body) || GENERIC_ERR);
                    }
                })
                .catch(function () {
                    setFormLoading(false);
                    resetTurnstileLead();
                    showFormError(t('networkError'));
                });
        });
    }

    // --- 14b. Форма бронирования (POST /api/booking) -------------------------
    function initForm() {
        var form = document.getElementById('yogaContactForm');
        if (!form) return;

        var nameIn = document.getElementById('yogaName');
        var phoneIn = document.getElementById('yogaPhone');
        var phoneCode = document.getElementById('yogaPhoneCode');
        var phoneNat = document.getElementById('yogaPhoneNational');
        var emailIn = document.getElementById('yogaEmail');
        var consent = document.getElementById('yogaConsent');
        var arrivalDate = document.getElementById('yogaArrivalDate');
        var departureDate = document.getElementById('yogaDepartureDate');
        var guestCount = document.getElementById('yogaGuestCount');
        var comment = document.getElementById('yogaComment');
        var websiteHp = document.getElementById('yogaWebsite');
        var submitBtn = document.getElementById('yogaSubmitBtn');
        var errBox = document.getElementById('yogaFormError');
        var successBox = document.getElementById('yogaFormSuccess');
        var turnstileEl = document.getElementById('yogaTurnstileWidget');
        var nameErr = document.getElementById('yogaNameErr');
        var phoneErr = document.getElementById('yogaPhoneErr');
        var emailErr = document.getElementById('yogaEmailErr');
        var promoOptin = document.getElementById('yogaPromoOptin');

        bindPromoFormFields({
            optin: promoOptin,
            hint: document.getElementById('yogaPromoNightsHint'),
            arrival: arrivalDate,
            departure: departureDate,
        });

        var lastSubmitTime = 0;
        var SUBMIT_COOLDOWN_MS = 5000;
        var turnstileWidgetId = null;
        var turnstileSiteKey = '';

        var GENERIC_ERR = t('genericErr');

        function setFormLoading(loading) {
            if (!submitBtn) return;
            submitBtn.disabled = loading;
            submitBtn.textContent = loading ? t('submitting') : t('submitButton');
        }

        function showFormError(msg) {
            if (!errBox) return;
            errBox.textContent = msg || '';
            errBox.classList.toggle('is-hidden', !msg);
        }

        function clearNamePhoneErrors() {
            if (nameIn) {
                nameIn.classList.remove('yoga-form__input--error');
            }
            if (phoneNat) {
                phoneNat.classList.remove('yoga-form__input--error');
            }
            if (emailIn) {
                emailIn.classList.remove('yoga-form__input--error');
            }
            if (nameErr) nameErr.textContent = '';
            if (phoneErr) phoneErr.textContent = '';
            if (emailErr) emailErr.textContent = '';
        }

        function validateName() {
            var v = (nameIn && nameIn.value) ? nameIn.value.trim() : '';
            if (v.length < 2) {
                if (nameErr) nameErr.textContent = t('nameMin');
                if (nameIn) nameIn.classList.add('yoga-form__input--error');
                return false;
            }
            if (!/^[а-яА-ЯёЁa-zA-Z\s-]+$/.test(v)) {
                if (nameErr) nameErr.textContent = t('nameChars');
                if (nameIn) nameIn.classList.add('yoga-form__input--error');
                return false;
            }
            return true;
        }

        function validatePhone() {
            yogaSyncPhoneHidden(phoneCode, phoneNat, phoneIn);
            return yogaValidateIntlPhone(phoneIn && phoneIn.value, phoneErr, phoneNat);
        }

        function validateStayDates() {
            var a = (arrivalDate && arrivalDate.value) ? arrivalDate.value.trim() : '';
            var d = (departureDate && departureDate.value) ? departureDate.value.trim() : '';
            if (!a && !d) return true;
            if ((a && !d) || (!a && d)) {
                showFormError(t('datesBothOrEmpty'));
                return false;
            }
            if (d < a) {
                showFormError(t('departureBeforeArrival'));
                return false;
            }
            return true;
        }

        function getCaptchaToken() {
            if (!turnstileSiteKey) return '';
            if (turnstileWidgetId == null || !window.turnstile || !window.turnstile.getResponse) {
                return '';
            }
            return window.turnstile.getResponse(turnstileWidgetId) || '';
        }

        function resetTurnstile() {
            if (turnstileWidgetId != null && window.turnstile && window.turnstile.reset) {
                try {
                    window.turnstile.reset(turnstileWidgetId);
                } catch (e) { /* noop */ }
            }
        }

        function msgFromApi(status, body) {
            if (status === 429) {
                return t('rateLimit');
            }
            if (!body || typeof body !== 'object') return null;
            var d = body.detail;
            if (typeof d === 'string' && d.trim()) return d;
            if (Array.isArray(d)) {
                var parts = [];
                for (var i = 0; i < d.length; i++) {
                    if (d[i] && typeof d[i].msg === 'string') parts.push(d[i].msg);
                }
                if (parts.length) return parts.join(' ');
            }
            return null;
        }

        fetch(apiPath('/public-config'))
            .then(function (r) { return r.json(); })
            .then(function (data) {
                turnstileSiteKey = (data && data.turnstileSiteKey) ? String(data.turnstileSiteKey).trim() : '';
                yogaTurnstileSiteKey = turnstileSiteKey;
                if (!turnstileSiteKey || !window.turnstile) return;
                if (turnstileEl) {
                    turnstileEl.innerHTML = '';
                    turnstileWidgetId = window.turnstile.render(turnstileEl, {
                        sitekey: turnstileSiteKey,
                        theme: 'light',
                    });
                }
                var turnstileLeadEl = document.getElementById('yogaTurnstileWidgetLead');
                if (turnstileLeadEl) {
                    turnstileLeadEl.innerHTML = '';
                    yogaTurnstileLeadWidgetId = window.turnstile.render(turnstileLeadEl, {
                        sitekey: turnstileSiteKey,
                        theme: 'light',
                    });
                }
            })
            .catch(function () { /* noop */ });

        function bindMainPhoneSync() {
            function onPhonePartChange() {
                yogaSyncPhoneHidden(phoneCode, phoneNat, phoneIn);
                if (phoneNat) phoneNat.classList.remove('yoga-form__input--error');
                if (phoneErr) phoneErr.textContent = '';
            }
            if (phoneCode) phoneCode.addEventListener('change', onPhonePartChange);
            if (phoneNat) phoneNat.addEventListener('input', onPhonePartChange);
        }
        bindMainPhoneSync();

        if (nameIn) {
            nameIn.addEventListener('input', function () {
                nameIn.classList.remove('yoga-form__input--error');
                if (nameErr) nameErr.textContent = '';
            });
        }
        if (emailIn) {
            emailIn.addEventListener('input', function () {
                emailIn.classList.remove('yoga-form__input--error');
                if (emailErr) emailErr.textContent = '';
            });
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            showFormError('');

            var now = Date.now();
            if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
                showFormError(t('cooldown'));
                return;
            }

            if (consent && !consent.checked) {
                showFormError(t('consentRequired'));
                return;
            }

            clearNamePhoneErrors();
            yogaSyncPhoneHidden(phoneCode, phoneNat, phoneIn);
            var okN = validateName();
            var okP = validatePhone();
            var okD = validateStayDates();
            var rawEmailMain = emailIn ? emailIn.value : '';
            var okE = validateOptionalEmailRow(rawEmailMain, emailErr, emailIn);
            if (!okN || !okP || !okE || !okD) {
                if (!okD) {
                    /* сообщение уже в showFormError */
                } else {
                    showFormError(t('checkFields'));
                }
                if (!okN && nameIn) nameIn.focus();
                else if (!okP && phoneNat) phoneNat.focus();
                else if (!okE && emailIn) emailIn.focus();
                else if (!okD && arrivalDate) arrivalDate.focus();
                return;
            }

            if (turnstileSiteKey && !getCaptchaToken()) {
                showFormError(t('captchaRequired'));
                return;
            }

            lastSubmitTime = now;
            setFormLoading(true);

            var pDate = (arrivalDate && arrivalDate.value) ? arrivalDate.value.trim() : '';
            var depDate = (departureDate && departureDate.value) ? departureDate.value.trim() : '';
            var guests = parseGuestCount(guestCount);
            var cmt = (comment && comment.value) ? comment.value.trim() : '';
            var procEl = form.querySelector('input[name="procedure"]');
            var procedure = (procEl && procEl.value) ? procEl.value.trim() : t('defaultProcedure');
            var payload = {
                name: (nameIn && nameIn.value) ? nameIn.value.trim() : '',
                phone: (phoneIn && phoneIn.value) ? phoneIn.value.trim() : '',
                consent: consent ? consent.checked : false,
                website: (websiteHp && websiteHp.value) ? websiteHp.value : '',
                captcha_token: getCaptchaToken() || null,
                procedure: procedure,
                preferred_date: pDate || null,
                departure_date: depDate || null,
                guest_count: guests,
                comment: cmt || null,
            };
            var emMainTrim = (emailIn && emailIn.value) ? emailIn.value.trim() : '';
            if (emMainTrim) payload.email = emMainTrim;
            appendPromoToPayload(payload, promoOptin);
            applyLeadMeta(payload, form);
            payload.meta_event_id = generateEventId();
            appendAttributionToPayload(payload);

            fetch(apiPath('/booking'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
                .then(function (response) {
                    return response.text().then(function (text) {
                        var body = null;
                        if (text) {
                            try {
                                body = JSON.parse(text);
                            } catch (err) {
                                body = null;
                            }
                        }
                        return { ok: response.ok, status: response.status, body: body };
                    });
                })
                .then(function (r) {
                    setFormLoading(false);
                    resetTurnstile();
                    if (r.ok) {
                        trackUmamiLead(payload);
                        trackMetaLead(
                            payload.meta_event_id,
                            payload.promo_optin ? { content_category: 'promo_11th_night' } : undefined
                        );
                        setTawkVisitor(payload, r.body && r.body.tawk_login);
                        if (successBox) successBox.classList.remove('is-hidden');
                        form.classList.add('is-hidden');
                        form.reset();
                        clearNamePhoneErrors();
                    } else {
                        showFormError(msgFromApi(r.status, r.body) || GENERIC_ERR);
                    }
                })
                .catch(function () {
                    setFormLoading(false);
                    resetTurnstile();
                    showFormError(t('networkError'));
                });
        });
    }

    function boot() {
        initScrollProgress();
        initHeader();
        initBurgerMenu();
        initSmoothScroll();
        initFadeIn();
        initVideoThumbnails();
        initVideoModal();
        initTextReviewsShuffle();
        initFaqAccordion();
        initRoomsCarousel();
        initRoomsInnerGalleries();
        initCopyrightYear();
        initPrivacyModal();
        initYogaOfferCancellationModals();
        initYogaLeadModal();
        initYogaPanchaInfoModal();
        initPromoModal();
        initPromoBadgeView();
        initForm();
        initYogaLeadForm();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
