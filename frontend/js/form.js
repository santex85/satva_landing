// Обработка формы: contact / package-request / booking + Turnstile; модалка leadFormModal
document.addEventListener('DOMContentLoaded', function () {
    var contactForm = document.getElementById('contactForm');
    var leadFormModal = document.getElementById('leadFormModal');
    if (!contactForm && !leadFormModal) return;

    var nameInput = contactForm ? document.getElementById('name') : null;
    var phoneInput = contactForm ? document.getElementById('phone') : null;
    var emailInput = contactForm ? document.getElementById('email') : null;
    var submitBtn = contactForm ? contactForm.querySelector('button[type="submit"]') : null;

    var leadModalName = leadFormModal ? document.getElementById('leadModalName') : null;
    var leadModalPhone = leadFormModal ? document.getElementById('leadModalPhone') : null;
    var leadModalEmail = leadFormModal ? document.getElementById('leadModalEmail') : null;
    var leadModalSubmit = leadFormModal ? document.getElementById('leadModalSubmit') : null;

    var lastSubmitTime = 0;
    var SUBMIT_COOLDOWN_MS = 5000;
    var submitTimeoutId = null;

    var formMode = 'contact';
    var packageSlug = '';
    var bookingProcedure = '';
    var turnstileWidgetIdMain = null;
    var turnstileWidgetIdLead = null;
    var turnstileSiteKey = '';

    function apiPath(path) {
        return (window.location.origin || '') + '/api' + path;
    }

    function setFormMode(mode, opts) {
        formMode = mode;
        var hint = document.getElementById('formModeHint');
        var extra = document.getElementById('formBookingExtra');
        var preferredDate = document.getElementById('preferred_date');
        var bookingComment = document.getElementById('booking_comment');
        if (!contactForm) return;

        if (mode === 'contact') {
            packageSlug = '';
            bookingProcedure = '';
            contactForm.setAttribute('action', '/api/contact');
            if (hint) {
                hint.classList.add('is-hidden');
                hint.textContent = '';
            }
            if (extra) extra.classList.add('is-hidden');
            if (preferredDate) preferredDate.value = '';
            if (bookingComment) bookingComment.value = '';
        } else if (mode === 'package' && opts && opts.slug) {
            packageSlug = opts.slug;
            bookingProcedure = '';
            contactForm.setAttribute('action', '/api/package-request');
            if (hint) {
                hint.textContent = 'Выбран формат: «' + opts.slug + '». Заполните контакты ниже.';
                hint.classList.remove('is-hidden');
            }
            if (extra) extra.classList.add('is-hidden');
        } else if (mode === 'booking' && opts && opts.procedure) {
            bookingProcedure = opts.procedure;
            packageSlug = '';
            contactForm.setAttribute('action', '/api/booking');
            if (hint) {
                hint.textContent = 'Запись на: ' + opts.procedure;
                hint.classList.remove('is-hidden');
            }
            if (extra) extra.classList.remove('is-hidden');
        }
    }

    function closeActiveModals() {
        document.querySelectorAll('.modal.modal--active').forEach(function (modal) {
            modal.classList.remove('modal--visible');
            setTimeout(function () {
                modal.classList.remove('modal--active');
                if (window.scrollLock && window.scrollLock.unlock) window.scrollLock.unlock();
            }, 300);
        });
    }

    function closeMainLeadModal() {
        var m = document.getElementById('modal-lead');
        if (!m || !m.classList.contains('modal')) return;
        m.classList.remove('modal--visible');
        setTimeout(function () {
            m.classList.remove('modal--active');
            if (window.scrollLock && window.scrollLock.unlock) window.scrollLock.unlock();
        }, 300);
    }

    if (contactForm && nameInput && phoneInput) {
        document.querySelectorAll('.js-package-cta').forEach(function (link) {
            link.addEventListener('click', function () {
                var slug = link.getAttribute('data-package-slug') || '';
                if (slug) setFormMode('package', { slug: slug });
            });
        });

        document.querySelectorAll('.js-booking-from-modal').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var proc = btn.getAttribute('data-procedure') || '';
                if (!proc) return;
                closeActiveModals();
                setFormMode('booking', { procedure: proc });
                var el = document.getElementById('contact');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setTimeout(function () {
                    if (nameInput) nameInput.focus();
                }, 400);
            });
        });
    }

    function loadTurnstileScript() {
        return new Promise(function (resolve, reject) {
            if (window.turnstile) {
                resolve();
                return;
            }
            var s = document.createElement('script');
            s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            s.async = true;
            s.defer = true;
            s.onload = function () {
                resolve();
            };
            s.onerror = function () {
                reject(new Error('Turnstile script failed'));
            };
            document.head.appendChild(s);
        });
    }

    function renderTurnstileIn(elId, setter) {
        var el = document.getElementById(elId);
        if (!el || !turnstileSiteKey || !window.turnstile) return;
        el.innerHTML = '';
        var wid = window.turnstile.render(el, {
            sitekey: turnstileSiteKey,
            theme: 'dark',
        });
        if (typeof setter === 'function') setter(wid);
    }

    function resetTurnstileWidget(wid) {
        if (wid != null && window.turnstile && window.turnstile.reset) {
            try {
                window.turnstile.reset(wid);
            } catch (e) {}
        }
    }

    function getCaptchaToken(wid) {
        if (!turnstileSiteKey) return '';
        if (wid == null || !window.turnstile || !window.turnstile.getResponse) return '';
        return window.turnstile.getResponse(wid) || '';
    }

    fetch(apiPath('/public-config'))
        .then(function (r) {
            return r.json();
        })
        .then(function (data) {
            turnstileSiteKey = (data && data.turnstileSiteKey) ? String(data.turnstileSiteKey).trim() : '';
            if (!turnstileSiteKey) return loadTurnstileScript().then(function () {});
            return loadTurnstileScript().then(function () {
                renderTurnstileIn('turnstile-widget', function (id) {
                    turnstileWidgetIdMain = id;
                });
                renderTurnstileIn('turnstile-widget-lead', function (id) {
                    turnstileWidgetIdLead = id;
                });
            });
        })
        .catch(function () {});

    function fieldBaseId(field) {
        return field.id || field.name;
    }

    function validateField(field) {
        var value = field.value.trim();
        var fieldName = field.name;
        var isValid = true;
        var errorMessage = '';

        clearFieldError(field);

        if (fieldName === 'name') {
            if (!value) {
                isValid = false;
                errorMessage = 'Имя обязательно для заполнения';
            } else if (value.length < 2) {
                isValid = false;
                errorMessage = 'Имя должно содержать минимум 2 символа';
            } else if (!/^[а-яА-ЯёЁa-zA-Z\s-]+$/.test(value)) {
                isValid = false;
                errorMessage = 'Имя может содержать только буквы';
            }
        } else if (fieldName === 'phone') {
            var phoneDigits = value.replace(/\D/g, '');
            if (!value) {
                isValid = false;
                errorMessage = 'Телефон обязателен для заполнения';
            } else if (phoneDigits.length < 10) {
                isValid = false;
                errorMessage = 'Телефон должен содержать минимум 10 цифр';
            } else if (phoneDigits.length > 15) {
                isValid = false;
                errorMessage = 'Телефон слишком длинный';
            } else if (/^66/.test(phoneDigits) && !/^66[689]\d{8}$/.test(phoneDigits)) {
                isValid = false;
                errorMessage = 'Введите корректный тайский номер (+66, затем 9 цифр, начиная с 6, 8 или 9)';
            }
        } else if (fieldName === 'email') {
            if (!value) {
                field.classList.remove('form-input--success', 'form-input--error');
                field.setAttribute('aria-invalid', 'false');
                return true;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                isValid = false;
                errorMessage = 'Некорректный email';
            }
        }

        if (!isValid) {
            showFieldError(field, errorMessage);
            field.setAttribute('aria-invalid', 'true');
        } else {
            showFieldSuccess(field);
            field.setAttribute('aria-invalid', 'false');
        }

        return isValid;
    }

    function showFieldError(field, message) {
        field.classList.add('form-input--error');
        field.classList.remove('form-input--success');

        var bid = fieldBaseId(field);
        var errorEl = document.getElementById(bid + '-error');
        var errorIcon = document.getElementById(bid + '-error-icon');
        var successIcon = document.getElementById(bid + '-success-icon');

        if (errorEl) errorEl.textContent = message;
        if (errorIcon) errorIcon.style.display = 'block';
        if (successIcon) successIcon.style.display = 'none';
    }

    function showFieldSuccess(field) {
        field.classList.add('form-input--success');
        field.classList.remove('form-input--error');

        var bid = fieldBaseId(field);
        var errorEl = document.getElementById(bid + '-error');
        var errorIcon = document.getElementById(bid + '-error-icon');
        var successIcon = document.getElementById(bid + '-success-icon');

        if (errorEl) errorEl.textContent = '';
        if (errorIcon) errorIcon.style.display = 'none';
        if (successIcon) successIcon.style.display = 'block';
    }

    function clearFieldError(field) {
        var bid = fieldBaseId(field);
        var errorEl = document.getElementById(bid + '-error');
        var errorIcon = document.getElementById(bid + '-error-icon');
        var successIcon = document.getElementById(bid + '-success-icon');

        if (errorEl) errorEl.textContent = '';
        if (errorIcon) errorIcon.style.display = 'none';
        if (successIcon) successIcon.style.display = 'none';
    }

    function attachPhoneMask(input) {
        if (!input) return;
        input.addEventListener('input', function (e) {
            var value = e.target.value.replace(/\D/g, '');

            if (value.length > 0) {
                if (value.startsWith('66')) {
                    value = '+' + value;
                } else if (!value.startsWith('+')) {
                    value = '+66' + value;
                }

                if (value.length > 3) {
                    value = value.slice(0, 3) + ' ' + value.slice(3);
                }
                if (value.length > 7) {
                    value = value.slice(0, 7) + ' ' + value.slice(7);
                }
                if (value.length > 11) {
                    value = value.slice(0, 11) + ' ' + value.slice(11);
                }
            }

            e.target.value = value;
            validateField(e.target);
        });
    }

    if (contactForm && nameInput && phoneInput) {
        attachPhoneMask(phoneInput);

        nameInput.addEventListener('blur', function () {
            validateField(this);
        });

        nameInput.addEventListener('input', function () {
            clearFieldError(this);
        });

        phoneInput.addEventListener('blur', function () {
            validateField(this);
        });

        phoneInput.addEventListener('input', function () {
            clearFieldError(this);
        });
    }

    if (contactForm && emailInput) {
        emailInput.addEventListener('blur', function () {
            validateField(this);
        });
        emailInput.addEventListener('input', function () {
            clearFieldError(this);
        });
    }

    if (leadFormModal && leadModalName && leadModalPhone) {
        attachPhoneMask(leadModalPhone);

        leadModalName.addEventListener('blur', function () {
            validateField(this);
        });
        leadModalName.addEventListener('input', function () {
            clearFieldError(this);
        });
        leadModalPhone.addEventListener('blur', function () {
            validateField(this);
        });
        leadModalPhone.addEventListener('input', function () {
            clearFieldError(this);
        });
    }

    if (leadFormModal && leadModalEmail) {
        leadModalEmail.addEventListener('blur', function () {
            validateField(this);
        });
        leadModalEmail.addEventListener('input', function () {
            clearFieldError(this);
        });
    }

    var GENERIC_SUBMIT_ERROR = 'Ошибка отправки. Попробуйте позже или свяжитесь с нами по телефону.';

    function messageFromApiError(status, body) {
        if (status === 429) {
            return 'Слишком много отправок с вашего адреса. Подождите минуту и попробуйте снова.';
        }
        if (!body || typeof body !== 'object') return null;
        var detail = body.detail;
        if (typeof detail === 'string' && detail.trim()) return detail;
        if (Array.isArray(detail)) {
            var parts = [];
            for (var i = 0; i < detail.length; i++) {
                var item = detail[i];
                if (item && typeof item.msg === 'string') parts.push(item.msg);
            }
            if (parts.length) return parts.join(' ');
        }
        return null;
    }

    function appendSource(payload, form) {
        if (!form || !form.dataset) return;
        var s = form.dataset.source;
        if (s) payload.source = s;
    }

    function appendOptionalEmail(payload, formData) {
        if (!formData || !formData.get) return;
        var raw = formData.get('email');
        if (raw != null && String(raw).trim()) {
            payload.email = String(raw).trim();
        }
    }

    function setTawkVisitor(attrs) {
        if (!attrs || (!attrs.name && !attrs.phone && !attrs.email)) return;
        var payload = {};
        if (attrs.name) payload.name = String(attrs.name).trim();
        if (attrs.email) payload.email = String(attrs.email).trim();
        if (attrs.phone) payload.phone = String(attrs.phone).trim();
        if (!Object.keys(payload).length) return;

        function apply() {
            try {
                window.Tawk_API.setAttributes(payload, function (err) {
                    if (err && window.console) console.warn('Tawk setAttributes error:', err);
                });
            } catch (e) {}
        }

        if (window.Tawk_API && typeof window.Tawk_API.setAttributes === 'function') {
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

    function showMessageInForm(formEl, message, type) {
        if (!formEl) return;
        var existingMessage = formEl.querySelector(':scope > .form-message');
        if (existingMessage) existingMessage.remove();

        var messageEl = document.createElement('div');
        messageEl.className = 'form-message form-message--' + type;
        messageEl.textContent = message;
        messageEl.setAttribute('role', 'alert');
        messageEl.setAttribute('aria-live', 'polite');

        formEl.appendChild(messageEl);
        messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        if (submitTimeoutId) clearTimeout(submitTimeoutId);
        submitTimeoutId = setTimeout(function () {
            messageEl.style.opacity = '0';
            messageEl.style.transition = 'opacity 0.3s';
            setTimeout(function () {
                messageEl.remove();
            }, 300);
        }, 5000);
    }

    if (contactForm && nameInput && phoneInput) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            var now = Date.now();
            if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
                showMessageInForm(contactForm, 'Пожалуйста, подождите перед повторной отправкой', 'warning');
                return;
            }

            var consentCheck = document.getElementById('consent');
            var isNameValid = validateField(nameInput);
            var isPhoneValid = validateField(phoneInput);
            var isEmailValid = emailInput ? validateField(emailInput) : true;
            if (consentCheck && !consentCheck.checked) {
                showMessageInForm(contactForm, 'Необходимо согласие с политикой конфиденциальности', 'error');
                return;
            }

            if (!isNameValid || !isPhoneValid || !isEmailValid) {
                showMessageInForm(contactForm, 'Пожалуйста, исправьте ошибки в форме', 'error');
                if (!isNameValid) nameInput.focus();
                else if (!isPhoneValid) phoneInput.focus();
                else if (emailInput) emailInput.focus();
                return;
            }

            if (turnstileSiteKey && !getCaptchaToken(turnstileWidgetIdMain)) {
                showMessageInForm(contactForm, 'Пройдите проверку «Я не робот»', 'error');
                return;
            }

            lastSubmitTime = now;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Отправка…';
            }

            var formData = new FormData(contactForm);
            var captchaToken = getCaptchaToken(turnstileWidgetIdMain);
            var actionPath = contactForm.getAttribute('action') || '/api/contact';
            var url = (window.location.origin || '') + actionPath;

            var payload;
            if (formMode === 'package') {
                payload = {
                    name: formData.get('name'),
                    phone: formData.get('phone'),
                    consent: consentCheck ? consentCheck.checked : false,
                    website: formData.get('website') || '',
                    captcha_token: captchaToken || null,
                    package_slug: packageSlug,
                };
            } else if (formMode === 'booking') {
                var pd = document.getElementById('preferred_date');
                var bc = document.getElementById('booking_comment');
                var pval = pd && pd.value ? pd.value : null;
                var cval = bc && bc.value.trim() ? bc.value.trim() : null;
                payload = {
                    name: formData.get('name'),
                    phone: formData.get('phone'),
                    consent: consentCheck ? consentCheck.checked : false,
                    website: formData.get('website') || '',
                    captcha_token: captchaToken || null,
                    procedure: bookingProcedure,
                    preferred_date: pval,
                    comment: cval,
                };
            } else {
                payload = {
                    name: formData.get('name'),
                    phone: formData.get('phone'),
                    consent: consentCheck ? consentCheck.checked : false,
                    website: formData.get('website') || '',
                    captcha_token: captchaToken || null,
                };
            }
            appendOptionalEmail(payload, formData);
            appendSource(payload, contactForm);

            fetch(url, {
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
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Рассчитать программу';
                    }
                    if (r.ok) {
                        setTawkVisitor({ name: payload.name, phone: payload.phone, email: payload.email });
                        if (window.SatvaAnalytics) window.SatvaAnalytics.trackEvent('form', 'submit', formMode);
                        showMessageInForm(contactForm, 'Спасибо! Мы свяжемся с вами в ближайшее время.', 'success');
                        contactForm.reset();
                        nameInput.classList.remove('form-input--success', 'form-input--error');
                        phoneInput.classList.remove('form-input--success', 'form-input--error');
                        nameInput.setAttribute('aria-invalid', 'false');
                        phoneInput.setAttribute('aria-invalid', 'false');
                        clearFieldError(nameInput);
                        clearFieldError(phoneInput);
                        if (emailInput) {
                            emailInput.classList.remove('form-input--success', 'form-input--error');
                            emailInput.setAttribute('aria-invalid', 'false');
                            clearFieldError(emailInput);
                        }
                        if (consentCheck) consentCheck.checked = false;
                        setFormMode('contact');
                        resetTurnstileWidget(turnstileWidgetIdMain);
                    } else {
                        var apiMsg = messageFromApiError(r.status, r.body);
                        showMessageInForm(contactForm, apiMsg || GENERIC_SUBMIT_ERROR, 'error');
                        resetTurnstileWidget(turnstileWidgetIdMain);
                    }
                })
                .catch(function () {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Рассчитать программу';
                    }
                    showMessageInForm(contactForm, 'Не удалось отправить заявку. Проверьте интернет и попробуйте снова.', 'error');
                    resetTurnstileWidget(turnstileWidgetIdMain);
                });
        });
    }

    if (leadFormModal && leadModalName && leadModalPhone && leadModalSubmit) {
        leadFormModal.addEventListener('submit', function (e) {
            e.preventDefault();

            var now = Date.now();
            if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
                showMessageInForm(leadFormModal, 'Пожалуйста, подождите перед повторной отправкой', 'warning');
                return;
            }

            var consentCheck = document.getElementById('leadModalConsent');
            var isNameValid = validateField(leadModalName);
            var isPhoneValid = validateField(leadModalPhone);
            var isEmailValid = leadModalEmail ? validateField(leadModalEmail) : true;
            if (consentCheck && !consentCheck.checked) {
                showMessageInForm(leadFormModal, 'Необходимо согласие с политикой конфиденциальности', 'error');
                return;
            }

            if (!isNameValid || !isPhoneValid || !isEmailValid) {
                showMessageInForm(leadFormModal, 'Пожалуйста, исправьте ошибки в форме', 'error');
                if (!isNameValid) leadModalName.focus();
                else if (!isPhoneValid) leadModalPhone.focus();
                else if (leadModalEmail) leadModalEmail.focus();
                return;
            }

            if (turnstileSiteKey && !getCaptchaToken(turnstileWidgetIdLead)) {
                showMessageInForm(leadFormModal, 'Пройдите проверку «Я не робот»', 'error');
                return;
            }

            lastSubmitTime = now;
            leadModalSubmit.disabled = true;
            leadModalSubmit.textContent = 'Отправка…';

            var formData = new FormData(leadFormModal);
            var captchaToken = getCaptchaToken(turnstileWidgetIdLead);
            var url = (window.location.origin || '') + '/api/contact';

            var payload = {
                name: formData.get('name'),
                phone: formData.get('phone'),
                consent: consentCheck ? consentCheck.checked : false,
                website: formData.get('website') || '',
                captcha_token: captchaToken || null,
            };
            appendOptionalEmail(payload, formData);
            appendSource(payload, leadFormModal);

            fetch(url, {
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
                    leadModalSubmit.disabled = false;
                    leadModalSubmit.textContent = 'Отправить';
                    if (r.ok) {
                        setTawkVisitor({ name: payload.name, phone: payload.phone, email: payload.email });
                        if (window.SatvaAnalytics) window.SatvaAnalytics.trackEvent('form', 'submit', 'popup');
                        leadFormModal.reset();
                        leadModalName.classList.remove('form-input--success', 'form-input--error');
                        leadModalPhone.classList.remove('form-input--success', 'form-input--error');
                        clearFieldError(leadModalName);
                        clearFieldError(leadModalPhone);
                        if (leadModalEmail) {
                            leadModalEmail.classList.remove('form-input--success', 'form-input--error');
                            leadModalEmail.setAttribute('aria-invalid', 'false');
                            clearFieldError(leadModalEmail);
                        }
                        if (consentCheck) consentCheck.checked = false;
                        resetTurnstileWidget(turnstileWidgetIdLead);
                        closeMainLeadModal();
                    } else {
                        var apiMsg = messageFromApiError(r.status, r.body);
                        showMessageInForm(leadFormModal, apiMsg || GENERIC_SUBMIT_ERROR, 'error');
                        resetTurnstileWidget(turnstileWidgetIdLead);
                    }
                })
                .catch(function () {
                    leadModalSubmit.disabled = false;
                    leadModalSubmit.textContent = 'Отправить';
                    showMessageInForm(leadFormModal, 'Не удалось отправить заявку. Проверьте интернет и попробуйте снова.', 'error');
                    resetTurnstileWidget(turnstileWidgetIdLead);
                });
        });
    }
});
