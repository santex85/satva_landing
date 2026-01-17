// Управление модальными окнами
document.addEventListener('DOMContentLoaded', function() {
    // Получаем все карточки с атрибутом data-modal
    const stepCards = document.querySelectorAll('.step-card[data-modal]');
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.modal__close');
    const overlays = document.querySelectorAll('.modal__overlay');
    
    // Добавляем курсор pointer к карточкам с модальными окнами
    stepCards.forEach(card => {
        card.style.cursor = 'pointer';
        
        // Клик по карточке
        card.addEventListener('click', function(e) {
            // Предотвращаем открытие, если клик был по ссылке внутри карточки
            if (e.target.tagName === 'A') return;
            
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
    
    // Функция открытия модального окна
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        // Блокируем скролл body
        document.body.style.overflow = 'hidden';
        
        // Показываем модальное окно
        modal.classList.add('modal--active');
        
        // Плавное появление
        setTimeout(() => {
            modal.classList.add('modal--visible');
        }, 10);
    }
    
    // Функция закрытия модального окна
    function closeModal(modal) {
        if (!modal) return;
        
        // Убираем класс видимости
        modal.classList.remove('modal--visible');
        
        // После анимации скрываем модальное окно
        setTimeout(() => {
            modal.classList.remove('modal--active');
            document.body.style.overflow = '';
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
});
