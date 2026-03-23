// Управление модальными окнами
document.addEventListener('DOMContentLoaded', function() {
    // Получаем все карточки с атрибутом data-modal
    const stepCards = document.querySelectorAll('.step-card[data-modal]');
    const modalButtons = document.querySelectorAll('.open-modal-btn');
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.modal__close');
    const overlays = document.querySelectorAll('.modal__overlay');
    
    // Добавляем курсор pointer к карточкам с модальными окнами
    stepCards.forEach(card => {
        card.style.cursor = 'pointer';
        
        // Клик по карточке
        card.addEventListener('click', function(e) {
            // Предотвращаем открытие, если клик был по ссылке или кнопке внутри карточки
            if (e.target.tagName === 'A' || e.target.classList.contains('open-modal-btn')) return;
            
            const modalId = this.getAttribute('data-modal');
            openModal(modalId);
        });
        
        // Keyboard navigation (Enter и Space)
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const modalId = this.getAttribute('data-modal');
                openModal(modalId);
            }
        });
    });
    
    // Обработка кликов по кнопкам "Подробнее"
    modalButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // Предотвращаем всплытие к карточке
            const modalId = this.getAttribute('data-modal');
            openModal(modalId);
        });
    });
    
    var activeModal = null;
    var modalFocusTrapHandler = null;
    var previousActiveElement = null;
    var modalOpenTimer = null;
    var modalCloseTimer = null;

    function trapFocus(modal) {
        var focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (!first) return;
        first.focus();
        modalFocusTrapHandler = function(e) {
            if (e.key !== 'Tab') return;
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
        modal.addEventListener('keydown', modalFocusTrapHandler);
    }

    function openModal(modalId) {
        var modal = document.getElementById(modalId);
        if (!modal) return;

        if (window.SatvaAnalytics && window.SatvaAnalytics.trackEvent) {
            window.SatvaAnalytics.trackEvent('modal', 'open', modalId);
        }

        if (modalOpenTimer) clearTimeout(modalOpenTimer);
        if (modalCloseTimer) clearTimeout(modalCloseTimer);
        previousActiveElement = document.activeElement;
        if (window.scrollLock) window.scrollLock.lock();
        modal.classList.add('modal--active');
        activeModal = modal;

        modalOpenTimer = setTimeout(function() {
            modalOpenTimer = null;
            modal.classList.add('modal--visible');
            trapFocus(modal);
        }, 10);
    }

    function closeModal(modal) {
        if (!modal) return;
        if (modalFocusTrapHandler) {
            modal.removeEventListener('keydown', modalFocusTrapHandler);
            modalFocusTrapHandler = null;
        }
        modal.classList.remove('modal--visible');
        if (modalCloseTimer) clearTimeout(modalCloseTimer);
        modalCloseTimer = setTimeout(function() {
            modalCloseTimer = null;
            modal.classList.remove('modal--active');
            if (window.scrollLock) window.scrollLock.unlock();
            activeModal = null;
            if (previousActiveElement && previousActiveElement.focus) {
                previousActiveElement.focus();
            }
        }, 300);
    }
    
    // Закрытие по кнопке закрытия
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });
    
    // Закрытие по клику на overlay
    overlays.forEach(overlay => {
        overlay.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });
    
    // Закрытие по клавише Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            modals.forEach(modal => {
                if (modal.classList.contains('modal--active')) {
                    closeModal(modal);
                }
            });
        }
    });

    // Открытие попапа политики конфиденциальности
    document.querySelectorAll('.js-open-privacy').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            openModal('modal-privacy');
        });
    });
});
