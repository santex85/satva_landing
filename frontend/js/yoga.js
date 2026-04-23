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

    // --- 05. Parallax для .yoga-parallax -------------------------------------
    function initParallax() {
        var els = document.querySelectorAll('.yoga-parallax');
        if (!els.length) return;

        // Уважаем prefers-reduced-motion: reduce — пропускаем активацию.
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        var ticking = false;

        function update() {
            var viewportH = window.innerHeight || document.documentElement.clientHeight;
            for (var i = 0; i < els.length; i++) {
                var el = els[i];
                var rect = el.getBoundingClientRect();
                // Активен, только если элемент попал во вьюпорт (оптимизация).
                if (rect.bottom < 0 || rect.top > viewportH) continue;
                // Смещение картинки относительно центра вьюпорта, слабый коэффициент.
                var delta = (rect.top - viewportH / 2) * 0.2;
                el.style.backgroundPosition = 'center calc(50% + ' + delta + 'px)';
            }
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

    // --- 09. Превью видео через canvas (кадр на ~1 с) -------------------------
    function initVideoThumbnails() {
        var section = document.getElementById('yogaReviews');
        if (!section) return;
        var videos = section.querySelectorAll('.yoga-reviews__card video');
        if (!videos.length) return;

        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        function finishVideo(v) {
            try {
                v.removeAttribute('src');
                v.load();
            } catch (e) { /* noop */ }
        }

        function snapFrame(v) {
            v.addEventListener('seeked', function onSeeked() {
                v.removeEventListener('seeked', onSeeked);
                if (!ctx) {
                    finishVideo(v);
                    return;
                }
                try {
                    var w = v.videoWidth;
                    var h = v.videoHeight;
                    if (w > 0 && h > 0) {
                        canvas.width = w;
                        canvas.height = h;
                        ctx.drawImage(v, 0, 0, w, h);
                        v.poster = canvas.toDataURL('image/jpeg', 0.8);
                    }
                } catch (e) {
                    /* tainted canvas / Safari */
                }
                finishVideo(v);
            });

            var t = 1;
            try {
                if (v.duration && !isNaN(v.duration) && v.duration < 1.5) {
                    t = Math.max(0.08, v.duration * 0.25);
                }
            } catch (e) { /* noop */ }
            try {
                v.currentTime = t;
            } catch (e) {
                finishVideo(v);
            }
        }

        for (var i = 0; i < videos.length; i++) {
            (function (v) {
                if (v.readyState >= 1) {
                    snapFrame(v);
                } else {
                    v.addEventListener('loadedmetadata', function onMetaOnce() {
                        v.removeEventListener('loadedmetadata', onMetaOnce);
                        snapFrame(v);
                    });
                }
            }(videos[i]));
        }
    }

    // --- 09b. Модалка видео-отзыва --------------------------------------------
    function initVideoModal() {
        var section = document.getElementById('yogaReviews');
        var modal = document.getElementById('yogaVideoModal');
        var player = document.getElementById('yogaVideoPlayer');
        if (!section || !modal || !player) return;

        var overlay = modal.querySelector('.yoga-video-modal__overlay');
        var closeBtn = modal.querySelector('.yoga-video-modal__close');

        function openModal(src) {
            player.src = src;
            modal.removeAttribute('hidden');
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            var p = player.play();
            if (p && typeof p.catch === 'function') p.catch(function () {});
        }

        function closeModal() {
            player.pause();
            player.removeAttribute('src');
            try { player.load(); } catch (e) { /* noop */ }
            modal.classList.remove('is-open');
            modal.setAttribute('hidden', '');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        section.addEventListener('click', function (e) {
            var card = e.target.closest('.yoga-reviews__card');
            if (!card) return;
            var src = card.getAttribute('data-video');
            if (src) openModal(src);
        });

        section.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            var card = e.target.closest('.yoga-reviews__card');
            if (!card) return;
            e.preventDefault();
            var src = card.getAttribute('data-video');
            if (src) openModal(src);
        });

        if (overlay) overlay.addEventListener('click', closeModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) {
                closeModal();
            }
        });
    }

    // --- 10. Пульсация CTA: класс .is-pulse + keyframes в _urgency.scss --------

    // --- 13. Год в подвале ---------------------------------------------------
    function initCopyrightYear() {
        var el = document.getElementById('yogaFooterYear');
        if (!el) return;
        el.textContent = String(new Date().getFullYear());
    }

    function boot() {
        initScrollProgress();
        initHeader();
        initBurgerMenu();
        initSmoothScroll();
        initFadeIn();
        initParallax();
        initVideoThumbnails();
        initVideoModal();
        initCopyrightYear();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
