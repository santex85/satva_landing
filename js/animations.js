// Анимации при скролле
document.addEventListener('DOMContentLoaded', function() {
    // Оптимизированный Intersection Observer для анимаций при скролле
    const observerOptions = {
        threshold: [0, 0.1, 0.2],
        rootMargin: '0px 0px -30px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                // Не удаляем observer для возможности повторной анимации при необходимости
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Добавляем классы для анимации к элементам
    const animateElements = document.querySelectorAll('.step-card, .concept__feature, .team-member, .benefit-item, .procedure-slide, .testimonial-card, .faq-item, .gallery-item');
    
    animateElements.forEach((el, index) => {
        el.classList.add('animate-on-scroll', 'slide-up');
        el.classList.add(`animate-delay-${(index % 6) + 1}`);
        observer.observe(el);
    });
    
    // Анимация для заголовков секций
    const sectionTitles = document.querySelectorAll('.section-title');
    sectionTitles.forEach(title => {
        title.classList.add('animate-on-scroll', 'fade-scale');
        observer.observe(title);
    });
    
    // Анимация для FAQ вопросов (без задержки)
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.classList.add('animate-on-scroll', 'fade-scale');
        observer.observe(question);
    });
});
