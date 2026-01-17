// Основная логика приложения
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация всех модулей
    console.log('Satva Samui Landing Page initialized');
    
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
});

// Навигация
function initNavigation() {
    const header = document.getElementById('header');
    const burger = document.getElementById('headerBurger');
    const nav = document.getElementById('headerNav');
    
    if (!header || !burger || !nav) return;
    
    // Бургер-меню
    burger.addEventListener('click', function() {
        burger.classList.toggle('header__burger--active');
        nav.classList.toggle('header__nav--active');
        document.body.style.overflow = nav.classList.contains('header__nav--active') ? 'hidden' : '';
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
        document.body.style.overflow = '';
        
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
    const slides = document.querySelectorAll('.procedure-slide');
    const dots = document.querySelectorAll('.slider-dot');
    const prevBtn = document.querySelector('.slider-nav__btn--prev');
    const nextBtn = document.querySelector('.slider-nav__btn--next');
    
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
    
    function nextSlide() {
        const next = (currentSlide + 1) % slides.length;
        showSlide(next);
    }
    
    function prevSlide() {
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
    
    // Обработчики для точек
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => showSlide(index));
    });
    
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
    
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => showSlide(index));
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Перейти к отзыву ${index + 1}`);
        dot.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    });
    
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
        lightbox.classList.add('lightbox--active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeLightbox() {
        lightbox.classList.remove('lightbox--active');
        document.body.style.overflow = '';
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
