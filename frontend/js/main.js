// Единый механизм блокировки скролла (меню, модалки, lightbox)
window.scrollLock = (function() {
    var count = 0;
    return {
        lock: function() {
            count++;
            document.body.classList.add('scroll-locked');
        },
        unlock: function() {
            count--;
            if (count <= 0) {
                count = 0;
                document.body.classList.remove('scroll-locked');
            }
        }
    };
})();

// Основная логика приложения
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация всех модулей
    // Инициализация навигации
    initNavigation();
    
    // Плавная прокрутка к секциям
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href !== '#' && href.length > 1) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const headerHeight = document.querySelector('.header')?.offsetHeight || 80;
                    const offsetTop = targetElement.offsetTop - headerHeight;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                    
                    // Закрываем мобильное меню после клика (с небольшой задержкой для плавности)
                    setTimeout(() => {
                        closeMobileMenu();
                    }, 100);
                }
            }
        });
    });
    
    // Инициализация слайдера процедур
    initProceduresSlider();
    
    // Инициализация слайдера отзывов
    initTestimonialsSlider();
    
    // Инициализация FAQ
    initFAQ();
    
    // Инициализация галереи
    initGallery();
    
    // Инициализация индикатора прогресса
    updateScrollProgress();
    
    // Инициализация keyboard navigation для слайдеров
    initSliderKeyboardNav();

    // Аналитика: события CTA, соцсети, WhatsApp
    initAnalyticsTracking();

    // Год в футере
    var yearEl = document.getElementById('copyright-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Обработка ошибок загрузки изображений
    document.querySelectorAll('img').forEach(function(img) {
        img.addEventListener('error', function() {
            this.src = 'img/placeholder-ayurveda.svg';
            this.alt = 'Изображение не загружено';
        });
    });
});

function initAnalyticsTracking() {
    if (typeof window.SatvaAnalytics === 'undefined' || !window.SatvaAnalytics.trackEvent) return;
    var track = window.SatvaAnalytics.trackEvent.bind(window.SatvaAnalytics);
    document.addEventListener('click', function(e) {
        var target = e.target.closest('a');
        if (!target) return;
        if (target.classList.contains('floating-button') || (target.href && target.href.indexOf('wa.me') !== -1)) {
            track('contact', 'whatsapp_click', '');
        } else if (target.classList.contains('social-link')) {
            var label = target.getAttribute('aria-label') || target.href || '';
            track('social', 'click', label);
        } else if (target.getAttribute('href') === '#contact' && (target.classList.contains('btn') || target.classList.contains('header__link'))) {
            track('cta', target.classList.contains('btn--primary') ? 'consultation' : 'nav_contact', '');
        } else if (target.classList.contains('btn--outline') && target.getAttribute('href') === '#contact') {
            track('cta', 'book', '');
        }
    });
}

// Навигация
function initNavigation() {
    const header = document.getElementById('header');
    const burger = document.getElementById('headerBurger');
    const nav = document.getElementById('headerNav');
    
    if (!header || !burger || !nav) return;
    
    // Бургер-меню
    burger.addEventListener('click', function() {
        var isOpen = nav.classList.toggle('header__nav--active');
        burger.classList.toggle('header__burger--active', isOpen);
        burger.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Меню');
        if (isOpen) window.scrollLock.lock(); else window.scrollLock.unlock();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && nav.classList.contains('header__nav--active')) {
            closeMobileMenu();
        }
    });
    
    // Изменение header при скролле
    let lastScroll = 0;
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            header.classList.add('header--scrolled');
        } else {
            header.classList.remove('header--scrolled');
        }
        
        // Обновление индикатора прогресса
        updateScrollProgress();
        
        lastScroll = currentScroll;
    });
}

// Индикатор прогресса скролла
function updateScrollProgress() {
    const scrollProgress = document.getElementById('scrollProgress');
    if (!scrollProgress) return;
    
    const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (window.scrollY / windowHeight) * 100;
    scrollProgress.style.width = scrolled + '%';
    scrollProgress.setAttribute('aria-valuenow', Math.round(scrolled));
}

// Закрытие мобильного меню
function closeMobileMenu() {
    const burger = document.getElementById('headerBurger');
    const nav = document.getElementById('headerNav');
    
    if (burger && nav) {
        burger.classList.remove('header__burger--active');
        nav.classList.remove('header__nav--active');
        window.scrollLock.unlock();
        
        // Убираем focus с бургера после закрытия
        burger.blur();
    }
}

// Закрытие меню при клике вне его области
document.addEventListener('click', function(e) {
    const burger = document.getElementById('headerBurger');
    const nav = document.getElementById('headerNav');
    
    if (!burger || !nav) return;
    
    const isMenuOpen = nav.classList.contains('header__nav--active');
    const isClickInsideNav = nav.contains(e.target);
    const isClickOnBurger = burger.contains(e.target);
    
    if (isMenuOpen && !isClickInsideNav && !isClickOnBurger) {
        closeMobileMenu();
    }
});

// Слайдер процедур
function initProceduresSlider() {
    const section = document.getElementById('procedures');
    if (!section) return;
    
    const slides = section.querySelectorAll('.procedure-slide');
    const dots = section.querySelectorAll('.slider-dot');
    const prevBtn = section.querySelector('.slider-nav__btn--prev');
    const nextBtn = section.querySelector('.slider-nav__btn--next');
    
    if (slides.length === 0) return;
    
    let currentSlide = 0;
    
    function showSlide(index) {
        // Скрываем все слайды
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        // Показываем текущий слайд
        if (slides[index]) {
            slides[index].classList.add('active');
        }
        if (dots[index]) {
            dots[index].classList.add('active');
        }
        
        currentSlide = index;
    }
    
    function nextSlide(e) {
        if (e) e.preventDefault();
        const next = (currentSlide + 1) % slides.length;
        showSlide(next);
    }
    
    function prevSlide(e) {
        if (e) e.preventDefault();
        const prev = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(prev);
    }
    
    // Обработчики событий
    if (nextBtn) {
        nextBtn.addEventListener('click', nextSlide);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', prevSlide);
    }
    
    // Обработчики для точек (клик и клавиатура)
    dots.forEach(function(dot, index) {
        dot.setAttribute('tabindex', '0');
        dot.setAttribute('role', 'button');
        dot.setAttribute('aria-label', 'Слайд ' + (index + 1));
        dot.addEventListener('click', function(e) {
            e.preventDefault();
            showSlide(index);
        });
        dot.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showSlide(index);
            }
        });
    });

    // Touch/swipe для мобильных
    let touchStartX = 0;
    let touchEndX = 0;
    section.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    section.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) nextSlide(e);
            else prevSlide(e);
        }
    }, { passive: true });

    // Автоматическая смена слайдов (опционально)
    // setInterval(nextSlide, 5000);
}

// Слайдер отзывов
function initTestimonialsSlider() {
    const slides = document.querySelectorAll('.testimonial-slide');
    const dots = document.querySelectorAll('.testimonial-dot');
    const prevBtn = document.querySelector('.testimonial-nav__btn--prev');
    const nextBtn = document.querySelector('.testimonial-nav__btn--next');
    
    if (slides.length === 0) return;
    
    let currentSlide = 0;
    
    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        if (slides[index]) {
            slides[index].classList.add('active');
        }
        if (dots[index]) {
            dots[index].classList.add('active');
        }
        
        currentSlide = index;
    }
    
    function nextSlide() {
        const next = (currentSlide + 1) % slides.length;
        showSlide(next);
    }
    
    function prevSlide() {
        const prev = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(prev);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', nextSlide);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', prevSlide);
    }
    
    dots.forEach(function(dot, index) {
        dot.setAttribute('tabindex', '0');
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', 'Перейти к отзыву ' + (index + 1));
        dot.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
        dot.addEventListener('click', function() { showSlide(index); });
        dot.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showSlide(index);
            }
        });
    });

    // Touch/swipe для мобильных
    var testimonialsContainer = document.querySelector('.testimonials-slider');
    if (testimonialsContainer) {
        var touchStartX = 0;
        var touchEndX = 0;
        testimonialsContainer.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        testimonialsContainer.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            var diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) nextSlide();
                else prevSlide();
            }
        }, { passive: true });
    }

    // Keyboard navigation для слайдера отзывов
    document.addEventListener('keydown', function(e) {
        if (e.target.closest('.testimonials-slider')) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevSlide();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextSlide();
            }
        }
    });
    
    // Обновление aria-selected
    const originalShowSlide = showSlide;
    showSlide = function(index) {
        originalShowSlide(index);
        dots.forEach((dot, i) => {
            dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
        });
    };
}

// FAQ аккордеон
function initFAQ() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.closest('.faq-item');
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            
            // Закрываем все остальные
            faqQuestions.forEach(q => {
                if (q !== this) {
                    q.setAttribute('aria-expanded', 'false');
                    q.closest('.faq-item').classList.remove('active');
                }
            });
            
            // Переключаем текущий
            if (isExpanded) {
                this.setAttribute('aria-expanded', 'false');
                faqItem.classList.remove('active');
            } else {
                this.setAttribute('aria-expanded', 'true');
                faqItem.classList.add('active');
            }
        });
    });
}

// Галерея Lightbox
function initGallery() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.querySelector('.lightbox__image');
    const lightboxClose = document.querySelector('.lightbox__close');
    const lightboxPrev = document.querySelector('.lightbox__prev');
    const lightboxNext = document.querySelector('.lightbox__next');
    
    if (!lightbox || !lightboxImage) return;
    
    let currentIndex = 0;
    const images = Array.from(galleryItems).map(item => item.getAttribute('data-image'));
    
    function openLightbox(index) {
        currentIndex = index;
        lightboxImage.src = images[currentIndex];
        var sourceImg = galleryItems[currentIndex] ? galleryItems[currentIndex].querySelector('img') : null;
        lightboxImage.alt = sourceImg ? (sourceImg.getAttribute('alt') || 'Изображение галереи') : 'Изображение галереи';
        lightbox.classList.add('lightbox--active');
        window.scrollLock.lock();
        var closeBtn = document.querySelector('.lightbox__close');
        if (closeBtn) closeBtn.focus();
    }
    
    function closeLightbox() {
        lightbox.classList.remove('lightbox--active');
        window.scrollLock.unlock();
    }
    
    function showNext() {
        currentIndex = (currentIndex + 1) % images.length;
        lightboxImage.src = images[currentIndex];
    }
    
    function showPrev() {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        lightboxImage.src = images[currentIndex];
    }
    
    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => openLightbox(index));
    });
    
    if (lightboxClose) {
        lightboxClose.addEventListener('click', closeLightbox);
    }
    
    if (lightboxPrev) {
        lightboxPrev.addEventListener('click', showPrev);
    }
    
    if (lightboxNext) {
        lightboxNext.addEventListener('click', showNext);
    }
    
    // Свайп пальцем: влево — следующее, вправо — предыдущее
    var touchStartX = 0;
    var touchStartY = 0;
    var SWIPE_THRESHOLD = 50;
    
    lightbox.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    lightbox.addEventListener('touchmove', function(e) {
        if (!lightbox.classList.contains('lightbox--active') || e.touches.length !== 1) return;
        var deltaX = Math.abs(e.touches[0].clientX - touchStartX);
        var deltaY = Math.abs(e.touches[0].clientY - touchStartY);
        if (deltaX > deltaY && deltaX > 30) {
            e.preventDefault();
        }
    }, { passive: false });
    
    lightbox.addEventListener('touchend', function(e) {
        if (!lightbox.classList.contains('lightbox--active') || e.changedTouches.length !== 1) return;
        var endX = e.changedTouches[0].clientX;
        var deltaX = endX - touchStartX;
        if (deltaX < -SWIPE_THRESHOLD) {
            showNext();
        } else if (deltaX > SWIPE_THRESHOLD) {
            showPrev();
        }
    }, { passive: true });
    
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (!lightbox.classList.contains('lightbox--active')) return;
        
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            showPrev();
        } else if (e.key === 'ArrowRight') {
            showNext();
        } else if (e.key === 'Tab') {
            var focusable = lightbox.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
            var first = focusable[0];
            var last = focusable[focusable.length - 1];
            if (focusable.length && document.activeElement === last && !e.shiftKey) {
                e.preventDefault();
                first.focus();
            } else if (focusable.length && document.activeElement === first && e.shiftKey) {
                e.preventDefault();
                last.focus();
            }
        }
    });
}

// Keyboard navigation для слайдеров
function initSliderKeyboardNav() {
    // Слайдер процедур
    const procedureSlides = document.querySelectorAll('.procedure-slide');
    procedureSlides.forEach((slide, index) => {
        slide.setAttribute('tabindex', '0');
        slide.setAttribute('role', 'tabpanel');
        slide.setAttribute('aria-label', `Слайд процедуры ${index + 1}`);
    });
    
    // Слайдер отзывов
    const testimonialSlides = document.querySelectorAll('.testimonial-slide');
    testimonialSlides.forEach((slide, index) => {
        slide.setAttribute('tabindex', '0');
        slide.setAttribute('role', 'tabpanel');
        slide.setAttribute('aria-label', `Отзыв ${index + 1}`);
    });
}
