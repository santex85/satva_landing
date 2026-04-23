/* =========================================================
 * Satva Samui — Yoga Tour landing (yoga.html)
 * Vanilla JS, без фреймворков.
 * ========================================================= */

(function () {
    'use strict';

    var HEADER_OFFSET = 80; // высота хедера для smooth scroll и триггера .--scrolled

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
            burger.setAttribute('aria-label', 'Закрыть меню');
        }

        function close() {
            nav.classList.remove('is-open');
            burger.classList.remove('is-open');
            burger.setAttribute('aria-expanded', 'false');
            burger.setAttribute('aria-label', 'Открыть меню');
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
                target = target.parentNode;
            }
        });

        // Закрытие по Esc
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && nav.classList.contains('is-open')) {
                close();
            }
        });
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

    // --- 01d. Fade-in по скроллу + hero zoom-out -----------------------------
    function initFadeIn() {
        var els = document.querySelectorAll('.yoga-fade-in');

        if ('IntersectionObserver' in window) {
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
            // Фолбэк: показать сразу
            els.forEach(function (el) { el.classList.add('is-visible'); });
        }

        // Hero — показываем контент сразу, без ожидания скролла
        var hero = document.querySelector('.yoga-hero');
        if (hero) {
            var heroFades = hero.querySelectorAll('.yoga-fade-in');
            heroFades.forEach(function (el) { el.classList.add('is-visible'); });
        }

        // Hero zoom-out — после полной загрузки картинки
        var heroBg = document.querySelector('.yoga-hero__bg');
        if (heroBg) {
            var activate = function () { heroBg.classList.add('is-loaded'); };
            if (document.readyState === 'complete') {
                activate();
            } else {
                window.addEventListener('load', activate, { once: true });
            }
        }
    }

    function boot() {
        initScrollProgress();
        initHeader();
        initBurgerMenu();
        initSmoothScroll();
        initFadeIn();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
