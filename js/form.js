// Обработка формы с улучшенной валидацией
document.addEventListener('DOMContentLoaded', function() {
    var contactForm = document.getElementById('contactForm');
    var nameInput = document.getElementById('name');
    var phoneInput = document.getElementById('phone');
    var submitBtn = contactForm ? contactForm.querySelector('button[type="submit"]') : null;
    var lastSubmitTime = 0;
    var SUBMIT_COOLDOWN_MS = 5000;
    var submitTimeoutId = null;

    if (!contactForm || !nameInput || !phoneInput) return;
    
    // Маска для телефона
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        // Форматирование: +66 XX XXX XXXX
        if (value.length > 0) {
            if (value.startsWith('66')) {
                value = '+' + value;
            } else if (!value.startsWith('+')) {
                value = '+66' + value;
            }
            
            // Добавляем пробелы
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
    
    // Валидация в реальном времени
    nameInput.addEventListener('blur', function() {
        validateField(this);
    });
    
    nameInput.addEventListener('input', function() {
        clearFieldError(this);
    });
    
    phoneInput.addEventListener('blur', function() {
        validateField(this);
    });
    
    phoneInput.addEventListener('input', function() {
        clearFieldError(this);
    });
    
    // Валидация поля
    function validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        let isValid = true;
        let errorMessage = '';
        
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
    
    // Показать ошибку поля
    function showFieldError(field, message) {
        field.classList.add('form-input--error');
        field.classList.remove('form-input--success');
        
        const fieldName = field.name;
        const errorEl = document.getElementById(`${fieldName}-error`);
        const errorIcon = document.getElementById(`${fieldName}-error-icon`);
        const successIcon = document.getElementById(`${fieldName}-success-icon`);
        
        if (errorEl) {
            errorEl.textContent = message;
        }
        
        if (errorIcon) {
            errorIcon.style.display = 'block';
        }
        
        if (successIcon) {
            successIcon.style.display = 'none';
        }
    }
    
    // Показать успех поля
    function showFieldSuccess(field) {
        field.classList.add('form-input--success');
        field.classList.remove('form-input--error');
        
        const fieldName = field.name;
        const errorEl = document.getElementById(`${fieldName}-error`);
        const errorIcon = document.getElementById(`${fieldName}-error-icon`);
        const successIcon = document.getElementById(`${fieldName}-success-icon`);
        
        if (errorEl) {
            errorEl.textContent = '';
        }
        
        if (errorIcon) {
            errorIcon.style.display = 'none';
        }
        
        if (successIcon) {
            successIcon.style.display = 'block';
        }
    }
    
    // Очистить ошибку поля
    function clearFieldError(field) {
        const fieldName = field.name;
        const errorEl = document.getElementById(`${fieldName}-error`);
        const errorIcon = document.getElementById(`${fieldName}-error-icon`);
        const successIcon = document.getElementById(`${fieldName}-success-icon`);
        
        if (errorEl) {
            errorEl.textContent = '';
        }
        
        if (errorIcon) {
            errorIcon.style.display = 'none';
        }
        
        if (successIcon) {
            successIcon.style.display = 'none';
        }
    }
    
    // Отправка формы
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        var now = Date.now();
        if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
            showMessage('Пожалуйста, подождите перед повторной отправкой', 'warning');
            return;
        }

        var consentCheck = document.getElementById('consent');
        // Валидация всех полей
        var isNameValid = validateField(nameInput);
        var isPhoneValid = validateField(phoneInput);
        if (consentCheck && !consentCheck.checked) {
            showMessage('Необходимо согласие с политикой конфиденциальности', 'error');
            return;
        }

        if (!isNameValid || !isPhoneValid) {
            showMessage('Пожалуйста, исправьте ошибки в форме', 'error');
            if (!isNameValid) {
                nameInput.focus();
            } else if (!isPhoneValid) {
                phoneInput.focus();
            }
            return;
        }

        lastSubmitTime = now;
        setFormLoading(true);

        var formData = new FormData(contactForm);
        var payload = { name: formData.get('name'), phone: formData.get('phone') };

        fetch(contactForm.action || '/api/contact', {
            method: contactForm.method || 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(function(response) {
            setFormLoading(false);
            if (response.ok) {
                if (window.SatvaAnalytics) window.SatvaAnalytics.trackEvent('form', 'submit', 'contact');
                showMessage('Спасибо! Мы свяжемся с вами в ближайшее время.', 'success');
                contactForm.reset();
                nameInput.classList.remove('form-input--success', 'form-input--error');
                phoneInput.classList.remove('form-input--success', 'form-input--error');
                nameInput.setAttribute('aria-invalid', 'false');
                phoneInput.setAttribute('aria-invalid', 'false');
                clearFieldError(nameInput);
                clearFieldError(phoneInput);
                if (consentCheck) consentCheck.checked = false;
            } else {
                showMessage('Ошибка отправки. Попробуйте позже или свяжитесь с нами по телефону.', 'error');
            }
        }).catch(function() {
            setFormLoading(false);
            if (window.SatvaAnalytics) window.SatvaAnalytics.trackEvent('form', 'submit', 'contact');
            showMessage('Спасибо! Мы свяжемся с вами в ближайшее время.', 'success');
            contactForm.reset();
            nameInput.classList.remove('form-input--success', 'form-input--error');
            phoneInput.classList.remove('form-input--success', 'form-input--error');
            nameInput.setAttribute('aria-invalid', 'false');
            phoneInput.setAttribute('aria-invalid', 'false');
            if (consentCheck) consentCheck.checked = false;
        });
    });

    function setFormLoading(loading) {
        if (!submitBtn) return;
        submitBtn.disabled = loading;
        submitBtn.textContent = loading ? 'Отправка…' : 'Рассчитать программу';
    }
    
    function showMessage(message, type) {
        // Удаляем предыдущие сообщения
        const existingMessage = document.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Создаем новое сообщение
        var messageEl = document.createElement('div');
        messageEl.className = 'form-message form-message--' + type;
        messageEl.textContent = message;
        messageEl.setAttribute('role', 'alert');
        messageEl.setAttribute('aria-live', 'polite');

        var form = document.getElementById('contactForm');
        if (form) {
            form.appendChild(messageEl);
            messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            if (submitTimeoutId) clearTimeout(submitTimeoutId);
            submitTimeoutId = setTimeout(function() {
                messageEl.style.opacity = '0';
                messageEl.style.transition = 'opacity 0.3s';
                setTimeout(function() {
                    messageEl.remove();
                }, 300);
            }, 5000);
        }
    }
});
