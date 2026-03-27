// Обработка формы: contact / package-request / booking + Turnstile
document.addEventListener('DOMContentLoaded', function () {
    var contactForm = document.getElementById('contactForm');
    var nameInput = document.getElementById('name');
    var phoneInput = document.getElementById('phone');
    var submitBtn = contactForm ? contactForm.querySelector('button[type="submit"]') : null;
    var lastSubmitTime = 0;
    var SUBMIT_COOLDOWN_MS = 5000;
    var submitTimeoutId = null;

    var formMode = 'contact';
    var packageSlug = '';
    var bookingProcedure = '';
    var turnstileWidgetId = null;
    var turnstileSiteKey = '';

    if (!contactForm || !nameInput || !phoneInput) return;

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

    function renderTurnstileWidget() {
        var el = document.getElementById('turnstile-widget');
        if (!el || !turnstileSiteKey || !window.turnstile) return;
        el.innerHTML = '';
        turnstileWidgetId = window.turnstile.render(el, {
            sitekey: turnstileSiteKey,
            theme: 'dark',
        });
    }

    function resetTurnstile() {
        if (turnstileWidgetId != null && window.turnstile && window.turnstile.reset) {
            try {
                window.turnstile.reset(turnstileWidgetId);
            } catch (e) {}
        }
    }

    function getCaptchaToken() {
        if (!turnstileSiteKey) return '';
        if (turnstileWidgetId == null || !window.turnstile || !window.turnstile.getResponse) return '';
        return window.turnstile.getResponse(turnstileWidgetId) || '';
    }

    fetch(apiPath('/public-config'))
        .then(function (r) {
            return r.json();
        })
        .then(function (data) {
            turnstileSiteKey = (data && data.turnstileSiteKey) ? String(data.turnstileSiteKey).trim() : '';
            if (!turnstileSiteKey) return loadTurnstileScript().then(function () {});
            return loadTurnstileScript().then(function () {
                renderTurnstileWidget();
            });
        })
        .catch(function () {});

    // Маска для телефона
    phoneInput.addEventListener('input', function (e) {
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

        var fieldName = field.name;
        var errorEl = document.getElementById(fieldName + '-error');
        var errorIcon = document.getElementById(fieldName + '-error-icon');
        var successIcon = document.getElementById(fieldName + '-success-icon');

        if (errorEl) errorEl.textContent = message;
        if (errorIcon) errorIcon.style.display = 'block';
        if (successIcon) successIcon.style.display = 'none';
    }

    function showFieldSuccess(field) {
        field.classList.add('form-input--success');
        field.classList.remove('form-input--error');

        var fieldName = field.name;
        var errorEl = document.getElementById(fieldName + '-error');
        var errorIcon = document.getElementById(fieldName + '-error-icon');
        var successIcon = document.getElementById(fieldName + '-success-icon');

        if (errorEl) errorEl.textContent = '';
        if (errorIcon) errorIcon.style.display = 'none';
        if (successIcon) successIcon.style.display = 'block';
    }

    function clearFieldError(field) {
        var fieldName = field.name;
        var errorEl = document.getElementById(fieldName + '-error');
        var errorIcon = document.getElementById(fieldName + '-error-icon');
        var successIcon = document.getElementById(fieldName + '-success-icon');

        if (errorEl) errorEl.textContent = '';
        if (errorIcon) errorIcon.style.display = 'none';
        if (successIcon) successIcon.style.display = 'none';
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

    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var now = Date.now();
        if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
            showMessage('Пожалуйста, подождите перед повторной отправкой', 'warning');
            return;
        }

        var consentCheck = document.getElementById('consent');
        var isNameValid = validateField(nameInput);
        var isPhoneValid = validateField(phoneInput);
        if (consentCheck && !consentCheck.checked) {
            showMessage('Необходимо согласие с политикой конфиденциальности', 'error');
            return;
        }

        if (!isNameValid || !isPhoneValid) {
            showMessage('Пожалуйста, исправьте ошибки в форме', 'error');
            if (!isNameValid) nameInput.focus();
            else if (!isPhoneValid) phoneInput.focus();
            return;
        }

        if (turnstileSiteKey && !getCaptchaToken()) {
            showMessage('Пройдите проверку «Я не робот»', 'error');
            return;
        }

        lastSubmitTime = now;
        setFormLoading(true);

        var formData = new FormData(contactForm);
        var captchaToken = getCaptchaToken();
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
                setFormLoading(false);
                if (r.ok) {
                    if (window.SatvaAnalytics) window.SatvaAnalytics.trackEvent('form', 'submit', formMode);
                    showMessage('Спасибо! Мы свяжемся с вами в ближайшее время.', 'success');
                    contactForm.reset();
                    nameInput.classList.remove('form-input--success', 'form-input--error');
                    phoneInput.classList.remove('form-input--success', 'form-input--error');
                    nameInput.setAttribute('aria-invalid', 'false');
                    phoneInput.setAttribute('aria-invalid', 'false');
                    clearFieldError(nameInput);
                    clearFieldError(phoneInput);
                    if (consentCheck) consentCheck.checked = false;
                    setFormMode('contact');
                    resetTurnstile();
                } else {
                    var apiMsg = messageFromApiError(r.status, r.body);
                    showMessage(apiMsg || GENERIC_SUBMIT_ERROR, 'error');
                    resetTurnstile();
                }
            })
            .catch(function () {
                setFormLoading(false);
                showMessage('Не удалось отправить заявку. Проверьте интернет и попробуйте снова.', 'error');
                resetTurnstile();
            });
    });

    function setFormLoading(loading) {
        if (!submitBtn) return;
        submitBtn.disabled = loading;
        submitBtn.textContent = loading ? 'Отправка…' : 'Рассчитать программу';
    }

    function showMessage(message, type) {
        var existingMessage = document.querySelector('#contactForm .form-message');
        if (existingMessage) existingMessage.remove();

        var messageEl = document.createElement('div');
        messageEl.className = 'form-message form-message--' + type;
        messageEl.textContent = message;
        messageEl.setAttribute('role', 'alert');
        messageEl.setAttribute('aria-live', 'polite');

        if (contactForm) {
            contactForm.appendChild(messageEl);
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
    }
});
