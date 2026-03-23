// Анимации при скролле
document.addEventListener('DOMContentLoaded', function() {
    var animateElements = document.querySelectorAll('.step-card, .concept__feature, .team-member, .benefit-item, .procedure-slide, .testimonial-card, .faq-item, .gallery-item');
    var sectionTitles = document.querySelectorAll('.section-title');
    var faqQuestions = document.querySelectorAll('.faq-question');

    if ('IntersectionObserver' in window) {
        var observerOptions = {
            threshold: [0, 0.1, 0.2],
            rootMargin: '0px 0px -30px 0px'
        };

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        animateElements.forEach(function(el, index) {
            el.classList.add('animate-on-scroll', 'slide-up');
            el.classList.add('animate-delay-' + ((index % 6) + 1));
            observer.observe(el);
        });

        sectionTitles.forEach(function(title) {
            title.classList.add('animate-on-scroll', 'fade-scale');
            observer.observe(title);
        });

        faqQuestions.forEach(function(question) {
            question.classList.add('animate-on-scroll', 'fade-scale');
            observer.observe(question);
        });
    } else {
        animateElements.forEach(function(el, index) {
            el.classList.add('animate-on-scroll', 'slide-up', 'animate-delay-' + ((index % 6) + 1), 'animated');
        });
        sectionTitles.forEach(function(title) {
            title.classList.add('animate-on-scroll', 'fade-scale', 'animated');
        });
        faqQuestions.forEach(function(question) {
            question.classList.add('animate-on-scroll', 'fade-scale', 'animated');
        });
    }
});
