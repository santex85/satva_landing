/* =========================================================
 * Satva Samui — Yoga Tour landing (yoga.html)
 * Vanilla JS, без фреймворков.
 * ========================================================= */

(function () {
    'use strict';

    var HEADER_OFFSET = 80; // высота хедера для smooth scroll и триггера .--scrolled

    var closeYogaLeadModalFn = null;
    var yogaTurnstileLeadWidgetId = null;
    var yogaTurnstileSiteKey = '';

    /** Необязательный email: пусто допустимо, иначе простая проверка формата */
    function validateOptionalEmailRow(raw, errEl, inputEl) {
        var v = raw ? String(raw).trim() : '';
        if (!v) {
            if (errEl) errEl.textContent = '';
            if (inputEl) inputEl.classList.remove('yoga-form__input--error');
            return true;
        }
        var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        if (!ok) {
            if (errEl) errEl.textContent = 'Некорректный email';
            if (inputEl) inputEl.classList.add('yoga-form__input--error');
            return false;
        }
        if (errEl) errEl.textContent = '';
        if (inputEl) inputEl.classList.remove('yoga-form__input--error');
        return true;
    }

    /** Собирает телефон из кода страны и национальной части в скрытое поле (для API и проверки). */
    function yogaSyncPhoneHidden(codeEl, nationalEl, hiddenEl) {
        if (!hiddenEl) return '';
        var code = (codeEl && codeEl.value) ? String(codeEl.value).trim() : '';
        if (!code) code = '+';
        var digitsNat = (nationalEl && nationalEl.value) ? String(nationalEl.value).replace(/\D/g, '') : '';
        if (!digitsNat) {
            hiddenEl.value = '';
            return '';
        }
        hiddenEl.value = code + ' ' + digitsNat;
        return hiddenEl.value;
    }

    /** Проверка номера: минимум 10 цифр суммарно; для +66 — тайское правило. */
    function yogaValidateIntlPhone(hiddenVal, phoneErr, errInput) {
        var raw = hiddenVal || '';
        var digits = raw.replace(/\D/g, '');
        if (digits.length < 10) {
            if (phoneErr) phoneErr.textContent = 'Минимум 10 цифр в номере';
            if (errInput) errInput.classList.add('yoga-form__input--error');
            return false;
        }
        if (digits.length > 15) {
            if (phoneErr) phoneErr.textContent = 'Слишком длинный номер';
            if (errInput) errInput.classList.add('yoga-form__input--error');
            return false;
        }
        if (/^66/.test(digits) && !/^66[689]\d{8}$/.test(digits)) {
            if (phoneErr) phoneErr.textContent = 'Проверьте тайский номер (+66 …)';
            if (errInput) errInput.classList.add('yoga-form__input--error');
            return false;
        }
        return true;
    }

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
                if (target.tagName === 'BUTTON' && target.hasAttribute('data-open-modal')) {
                    close();
                    break;
                }
                target = target.parentNode;
            }
        });

        // Закрытие по Esc (capture: раньше всплытия, пока фокус внутри выезжающего меню)
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (!nav.classList.contains('is-open')) return;
            e.preventDefault();
            close();
            if (burger.focus) burger.focus();
        }, true);
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

    function initFadeIn() {
        var els = document.querySelectorAll('.yoga-fade-in');
        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (reduceMotion) {
            els.forEach(function (el) { el.classList.add('is-visible'); });
        } else if ('IntersectionObserver' in window) {
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
            els.forEach(function (el) { el.classList.add('is-visible'); });
        }

        // Hero — показываем контент сразу, без ожидания скролла
        if (!reduceMotion) {
            var hero = document.querySelector('.yoga-hero');
            if (hero) {
                var heroFades = hero.querySelectorAll('.yoga-fade-in');
                heroFades.forEach(function (el) { el.classList.add('is-visible'); });
            }
        }

        // Hero zoom-out — после полной загрузки картинки (LCP: <img> внутри .yoga-hero__bg)
        var heroBg = document.querySelector('.yoga-hero__bg');
        if (heroBg) {
            var activate = function () { heroBg.classList.add('is-loaded'); };
            var heroImg = heroBg.querySelector('img');
            if (heroImg) {
                if (heroImg.complete) {
                    activate();
                } else {
                    heroImg.addEventListener('load', activate, { once: true });
                    heroImg.addEventListener('error', activate, { once: true });
                }
            } else if (document.readyState === 'complete') {
                activate();
            } else {
                window.addEventListener('load', activate, { once: true });
            }
        }
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
                v.pause();
                v.currentTime = 0;
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

        if (overlay) overlay.addEventListener('click', closeModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) {
                closeModal();
            }
        });
    }

    // --- 13. Год в подвале ---------------------------------------------------
    function initCopyrightYear() {
        var el = document.getElementById('yogaFooterYear');
        if (!el) return;
        el.textContent = String(new Date().getFullYear());
    }

    function initPrivacyModal() {
        var modal = document.getElementById('yogaModalPrivacy');
        if (!modal) return;
        var overlay = modal.querySelector('.yoga-modal__overlay');
        var closeBtn = modal.querySelector('.yoga-modal__close');
        var panel = modal.querySelector('.yoga-modal__content');
        var previousActive = null;
        var trapHandler = null;

        function getFocusable() {
            if (!panel) return [];
            return panel.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
        }

        function openModal() {
            previousActive = document.activeElement;
            modal.removeAttribute('hidden');
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            var list = getFocusable();
            if (list.length) {
                list[0].focus();
            }
            var first = list[0];
            var last = list[list.length - 1];
            trapHandler = function (e) {
                if (e.key !== 'Tab' || !list.length) return;
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
            modal.addEventListener('keydown', trapHandler);
        }

        function closeModal() {
            if (trapHandler) {
                modal.removeEventListener('keydown', trapHandler);
                trapHandler = null;
            }
            modal.classList.remove('is-open');
            modal.setAttribute('hidden', '');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            if (previousActive && previousActive.focus) {
                previousActive.focus();
            }
        }

        document.addEventListener('click', function (e) {
            var t = e.target;
            var opener = t.closest ? t.closest('.js-open-yoga-privacy') : null;
            if (!opener) return;
            e.preventDefault();
            e.stopPropagation();
            openModal();
        });

        if (overlay) {
            overlay.addEventListener('click', closeModal);
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (!modal.classList.contains('is-open')) return;
            closeModal();
        });
    }

    /** Модалки: публичная оферта и условия отмены (тот же UX, что у политики). */
    function initYogaOfferCancellationModals() {
        var configs = [
            ['yogaModalOffer', '.js-open-yoga-offer'],
            ['yogaModalCancellation', '.js-open-yoga-cancellation'],
        ];
        configs.forEach(function (cfg) {
            (function () {
                var modal = document.getElementById(cfg[0]);
                var openerSel = cfg[1];
                if (!modal) return;
                var overlay = modal.querySelector('.yoga-modal__overlay');
                var closeBtn = modal.querySelector('.yoga-modal__close');
                var panel = modal.querySelector('.yoga-modal__content');
                var previousActive = null;
                var trapHandler = null;

                function getFocusable() {
                    if (!panel) return [];
                    return panel.querySelectorAll(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );
                }

                function openModal() {
                    previousActive = document.activeElement;
                    modal.removeAttribute('hidden');
                    modal.classList.add('is-open');
                    modal.setAttribute('aria-hidden', 'false');
                    document.body.style.overflow = 'hidden';
                    var list = getFocusable();
                    if (list.length) list[0].focus();
                    var first = list[0];
                    var last = list[list.length - 1];
                    trapHandler = function (e) {
                        if (e.key !== 'Tab' || !list.length) return;
                        if (e.shiftKey) {
                            if (document.activeElement === first) {
                                e.preventDefault();
                                last.focus();
                            }
                        } else if (document.activeElement === last) {
                            e.preventDefault();
                            first.focus();
                        }
                    };
                    modal.addEventListener('keydown', trapHandler);
                }

                function closeModal() {
                    if (trapHandler) {
                        modal.removeEventListener('keydown', trapHandler);
                        trapHandler = null;
                    }
                    modal.classList.remove('is-open');
                    modal.setAttribute('hidden', '');
                    modal.setAttribute('aria-hidden', 'true');
                    document.body.style.overflow = '';
                    if (previousActive && previousActive.focus) previousActive.focus();
                }

                document.addEventListener('click', function (e) {
                    var opener = e.target.closest ? e.target.closest(openerSel) : null;
                    if (!opener) return;
                    e.preventDefault();
                    e.stopPropagation();
                    openModal();
                });

                if (overlay) overlay.addEventListener('click', closeModal);
                if (closeBtn) closeBtn.addEventListener('click', closeModal);
                document.addEventListener('keydown', function (e) {
                    if (e.key !== 'Escape') return;
                    if (!modal.classList.contains('is-open')) return;
                    closeModal();
                });
            }());
        });
    }

    function initTextReviewsShuffle() {
        var root = document.getElementById('yogaTextReviews');
        if (!root) return;
        var nodes = Array.prototype.slice.call(root.querySelectorAll('[data-text-review]'));
        for (var i = nodes.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = nodes[i];
            nodes[i] = nodes[j];
            nodes[j] = t;
        }
        nodes.forEach(function (n) {
            root.appendChild(n);
        });
    }

    function initFaqAccordion() {
        var root = document.getElementById('yogaFaq');
        if (!root) return;
        var toggles = root.querySelectorAll('.yoga-faq__question');
        toggles.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var isOpen = btn.getAttribute('aria-expanded') === 'true';
                var open = !isOpen;
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
                var panelId = btn.getAttribute('aria-controls');
                var panel = panelId ? document.getElementById(panelId) : null;
                if (panel) panel.hidden = !open;
            });
        });
    }

    function initRoomsCarousel() {
        var root = document.getElementById('yogaRoomsCarousel');
        if (!root) return;
        var viewport = root.querySelector('.yoga-rooms-carousel__viewport');
        var slides = Array.prototype.slice.call(root.querySelectorAll('.yoga-rooms-carousel__slide'));
        var prevBtn = root.querySelector('.yoga-rooms-carousel__btn--prev');
        var nextBtn = root.querySelector('.yoga-rooms-carousel__btn--next');
        var dotsRoot = root.querySelector('.yoga-rooms-carousel__dots');
        var idx = 0;
        var total = slides.length;
        if (!total || !dotsRoot) return;

        slides.forEach(function (_, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'yoga-rooms-carousel__dot' + (i === 0 ? ' is-active' : '');
            b.setAttribute('aria-label', 'Показать тип размещения ' + (i + 1) + ' из ' + total);
            (function (slideIndex) {
                b.addEventListener('click', function () {
                    go(slideIndex);
                });
            }(i));
            dotsRoot.appendChild(b);
        });
        var dots = dotsRoot.querySelectorAll('.yoga-rooms-carousel__dot');

        function go(i) {
            idx = (i + total) % total;
            slides.forEach(function (s, j) {
                var on = j === idx;
                s.classList.toggle('is-active', on);
                s.hidden = !on;
                s.setAttribute('aria-hidden', on ? 'false' : 'true');
                if (dots[j]) dots[j].classList.toggle('is-active', on);
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                go(idx - 1);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                go(idx + 1);
            });
        }
        var startX = null;
        var swipeStartedOnGalleryStage = false;
        if (viewport) {
            viewport.addEventListener('touchstart', function (e) {
                startX = e.changedTouches[0].screenX;
                swipeStartedOnGalleryStage = !!(
                    e.target &&
                    typeof e.target.closest === 'function' &&
                    e.target.closest('[data-room-gallery]')
                );
            }, { passive: true });
            viewport.addEventListener('touchend', function (e) {
                if (startX == null) return;
                var fromGalleryStage = swipeStartedOnGalleryStage;
                swipeStartedOnGalleryStage = false;
                var dx = e.changedTouches[0].screenX - startX;
                startX = null;
                if (Math.abs(dx) < 45) return;
                if (fromGalleryStage) return;
                if (dx < 0) go(idx + 1);
                else go(idx - 1);
            }, { passive: true });
        }
        go(0);
    }

    function initRoomsInnerGalleries() {
        var car = document.getElementById('yogaRoomsCarousel');
        if (!car) return;
        var galleries = car.querySelectorAll('[data-room-gallery]');
        if (!galleries.length) return;

        galleries.forEach(function (root) {
            var stage = root.querySelector('.yoga-rooms-gallery__stage');
            var panes = Array.prototype.slice.call(root.querySelectorAll('[data-gallery-pane]'));
            var thumbs = Array.prototype.slice.call(root.querySelectorAll('[data-gallery-thumb]'));
            var prevBtn = root.querySelector('[data-gallery-prev]');
            var nextBtn = root.querySelector('[data-gallery-next]');
            var n = panes.length;
            if (!n || !thumbs.length) return;

            var gi = 0;

            function goInner(i) {
                gi = (i + n) % n;
                panes.forEach(function (p, j) {
                    var on = j === gi;
                    p.classList.toggle('is-active', on);
                    p.setAttribute('aria-hidden', on ? 'false' : 'true');
                });
                thumbs.forEach(function (t, j) {
                    var on = j === gi;
                    t.classList.toggle('is-active', on);
                    t.setAttribute('aria-selected', on ? 'true' : 'false');
                    t.setAttribute('tabindex', on ? '0' : '-1');
                });
            }

            thumbs.forEach(function (t, j) {
                t.addEventListener('click', function () {
                    goInner(j);
                });
            });

            var tablist = root.querySelector('.yoga-rooms-gallery__thumbs');
            if (tablist) {
                tablist.addEventListener('keydown', function (e) {
                    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                    var fi = thumbs.indexOf(document.activeElement);
                    if (fi < 0) return;
                    e.preventDefault();
                    if (e.key === 'ArrowLeft') goInner(fi - 1);
                    else goInner(fi + 1);
                    if (thumbs[gi]) thumbs[gi].focus();
                });
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', function () {
                    goInner(gi - 1);
                });
            }
            if (nextBtn) {
                nextBtn.addEventListener('click', function () {
                    goInner(gi + 1);
                });
            }

            var sx = null;
            if (stage) {
                stage.addEventListener('touchstart', function (e) {
                    sx = e.changedTouches[0].screenX;
                }, { passive: true });
                stage.addEventListener('touchend', function (e) {
                    if (sx == null) return;
                    var dx = e.changedTouches[0].screenX - sx;
                    sx = null;
                    if (Math.abs(dx) < 45) return;
                    e.stopPropagation();
                    if (dx < 0) goInner(gi + 1);
                    else goInner(gi - 1);
                }, { passive: true });

                stage.addEventListener('keydown', function (e) {
                    if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        goInner(gi - 1);
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        goInner(gi + 1);
                    }
                });
            }

            goInner(0);
        });
    }

    // --- 14c. Модалка быстрой заявки (#modal-lead) ----------------------------
    function initYogaLeadModal() {
        var modal = document.getElementById('modal-lead');
        if (!modal || !modal.classList.contains('yoga-modal')) return;

        var overlay = modal.querySelector('.yoga-modal__overlay');
        var closeBtn = modal.querySelector('.yoga-modal__close');
        var panel = modal.querySelector('.yoga-modal__content');
        var previousActive = null;
        var trapHandler = null;

        function getFocusable() {
            if (!panel) return [];
            return panel.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
        }

        function openModal() {
            previousActive = document.activeElement;
            modal.removeAttribute('hidden');
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            var list = getFocusable();
            if (list.length) {
                list[0].focus();
            }
            var first = list[0];
            var last = list[list.length - 1];
            trapHandler = function (e) {
                if (e.key !== 'Tab' || !list.length) return;
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
            modal.addEventListener('keydown', trapHandler);
        }

        function closeModal() {
            if (trapHandler) {
                modal.removeEventListener('keydown', trapHandler);
                trapHandler = null;
            }
            modal.classList.remove('is-open');
            modal.setAttribute('hidden', '');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            if (previousActive && previousActive.focus) {
                previousActive.focus();
            }
        }

        closeYogaLeadModalFn = closeModal;

        document.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('[data-open-modal]') : null;
            if (!btn || btn.getAttribute('data-open-modal') !== 'modal-lead') return;
            e.preventDefault();
            openModal();
        });

        if (overlay) {
            overlay.addEventListener('click', closeModal);
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (!modal.classList.contains('is-open')) return;
            e.preventDefault();
            closeModal();
        }, true);
    }

    // --- 14ca. Модалка «Подробнее» о Панчакарме ------------------------------
    function initYogaPanchaInfoModal() {
        var modal = document.getElementById('modal-pancha-info');
        if (!modal || !modal.classList.contains('yoga-modal')) return;

        var overlay = modal.querySelector('.yoga-modal__overlay');
        var closeBtn = modal.querySelector('.yoga-modal__close');
        var panel = modal.querySelector('.yoga-modal__content');
        var previousActive = null;
        var trapHandler = null;

        function getFocusable() {
            if (!panel) return [];
            return panel.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
        }

        function openModal() {
            previousActive = document.activeElement;
            modal.removeAttribute('hidden');
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            var list = getFocusable();
            if (list.length) {
                list[0].focus();
            }
            var first = list[0];
            var last = list[list.length - 1];
            trapHandler = function (e) {
                if (e.key !== 'Tab' || !list.length) return;
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
            modal.addEventListener('keydown', trapHandler);
        }

        function closeModal() {
            if (trapHandler) {
                modal.removeEventListener('keydown', trapHandler);
                trapHandler = null;
            }
            modal.classList.remove('is-open');
            modal.setAttribute('hidden', '');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            if (previousActive && previousActive.focus) {
                previousActive.focus();
            }
        }

        document.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('[data-open-modal]') : null;
            if (!btn || btn.getAttribute('data-open-modal') !== 'modal-pancha-info') return;
            e.preventDefault();
            openModal();
        });

        if (overlay) {
            overlay.addEventListener('click', closeModal);
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (!modal.classList.contains('is-open')) return;
            e.preventDefault();
            closeModal();
        }, true);
    }

    // --- 14d. Форма в модалке быстрой заявки ---------------------------------
    function initYogaLeadForm() {
        var form = document.getElementById('yogaLeadFormModal');
        if (!form) return;

        var nameIn = document.getElementById('yogaLeadModalName');
        var phoneIn = document.getElementById('yogaLeadModalPhone');
        var phoneCode = document.getElementById('yogaLeadModalPhoneCode');
        var phoneNat = document.getElementById('yogaLeadModalPhoneNational');
        var emailIn = document.getElementById('yogaLeadModalEmail');
        var consent = document.getElementById('yogaLeadModalConsent');
        var websiteHp = document.getElementById('yogaLeadModalWebsite');
        var submitBtn = document.getElementById('yogaLeadModalSubmit');
        var errBox = document.getElementById('yogaLeadFormError');
        var nameErr = document.getElementById('yogaLeadModalNameErr');
        var phoneErr = document.getElementById('yogaLeadModalPhoneErr');
        var emailErr = document.getElementById('yogaLeadModalEmailErr');
        var arrivalDate = document.getElementById('yogaLeadModalArrivalDate');
        var departureDate = document.getElementById('yogaLeadModalDepartureDate');
        var comment = document.getElementById('yogaLeadModalComment');

        var lastSubmitTime = 0;
        var SUBMIT_COOLDOWN_MS = 5000;

        var GENERIC_ERR = 'Ошибка отправки. Попробуйте позже или напишите в мессенджер.';

        function apiPath(p) {
            return (window.location.origin || '') + '/api' + p;
        }

        function setFormLoading(loading) {
            if (!submitBtn) return;
            submitBtn.disabled = loading;
            submitBtn.textContent = loading ? 'Отправка…' : 'Отправить заявку';
        }

        function showFormError(msg) {
            if (!errBox) return;
            errBox.textContent = msg || '';
            errBox.classList.toggle('is-hidden', !msg);
        }

        function clearNamePhoneErrors() {
            if (nameIn) nameIn.classList.remove('yoga-form__input--error');
            if (phoneNat) phoneNat.classList.remove('yoga-form__input--error');
            if (emailIn) emailIn.classList.remove('yoga-form__input--error');
            if (nameErr) nameErr.textContent = '';
            if (phoneErr) phoneErr.textContent = '';
            if (emailErr) emailErr.textContent = '';
        }

        function validateName() {
            var v = (nameIn && nameIn.value) ? nameIn.value.trim() : '';
            if (v.length < 2) {
                if (nameErr) nameErr.textContent = 'Минимум 2 символа';
                if (nameIn) nameIn.classList.add('yoga-form__input--error');
                return false;
            }
            if (!/^[а-яА-ЯёЁa-zA-Z\s-]+$/.test(v)) {
                if (nameErr) nameErr.textContent = 'Только буквы, дефис и пробел';
                if (nameIn) nameIn.classList.add('yoga-form__input--error');
                return false;
            }
            return true;
        }

        function validatePhone() {
            yogaSyncPhoneHidden(phoneCode, phoneNat, phoneIn);
            return yogaValidateIntlPhone(phoneIn && phoneIn.value, phoneErr, phoneNat);
        }

        function getCaptchaToken() {
            if (yogaTurnstileLeadWidgetId == null || !window.turnstile || !window.turnstile.getResponse) {
                return '';
            }
            return window.turnstile.getResponse(yogaTurnstileLeadWidgetId) || '';
        }

        function resetTurnstileLead() {
            if (yogaTurnstileLeadWidgetId != null && window.turnstile && window.turnstile.reset) {
                try {
                    window.turnstile.reset(yogaTurnstileLeadWidgetId);
                } catch (e) { /* noop */ }
            }
        }

        function msgFromApi(status, body) {
            if (status === 429) {
                return 'Слишком много запросов. Подождите минуту.';
            }
            if (!body || typeof body !== 'object') return null;
            var d = body.detail;
            if (typeof d === 'string' && d.trim()) return d;
            if (Array.isArray(d)) {
                var parts = [];
                for (var i = 0; i < d.length; i++) {
                    if (d[i] && typeof d[i].msg === 'string') parts.push(d[i].msg);
                }
                if (parts.length) return parts.join(' ');
            }
            return null;
        }

        function validateStayDates() {
            var a = (arrivalDate && arrivalDate.value) ? arrivalDate.value.trim() : '';
            var d = (departureDate && departureDate.value) ? departureDate.value.trim() : '';
            if (!a && !d) return true;
            if ((a && !d) || (!a && d)) {
                showFormError('Укажите обе даты заезда и выезда или оставьте поля пустыми.');
                return false;
            }
            if (d < a) {
                showFormError('Дата выезда не может быть раньше даты заезда.');
                return false;
            }
            return true;
        }

        function bindLeadPhoneSync() {
            function onPhonePartChange() {
                yogaSyncPhoneHidden(phoneCode, phoneNat, phoneIn);
                if (phoneNat) phoneNat.classList.remove('yoga-form__input--error');
                if (phoneErr) phoneErr.textContent = '';
            }
            if (phoneCode) phoneCode.addEventListener('change', onPhonePartChange);
            if (phoneNat) phoneNat.addEventListener('input', onPhonePartChange);
        }
        bindLeadPhoneSync();

        if (nameIn) {
            nameIn.addEventListener('input', function () {
                nameIn.classList.remove('yoga-form__input--error');
                if (nameErr) nameErr.textContent = '';
            });
        }
        if (emailIn) {
            emailIn.addEventListener('input', function () {
                emailIn.classList.remove('yoga-form__input--error');
                if (emailErr) emailErr.textContent = '';
            });
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            showFormError('');

            var now = Date.now();
            if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
                showFormError('Подождите несколько секунд перед повторной отправкой.');
                return;
            }

            if (consent && !consent.checked) {
                showFormError('Нужно согласие с политикой конфиденциальности, публичной офертой и условиями отмены бронирования.');
                return;
            }

            clearNamePhoneErrors();
            yogaSyncPhoneHidden(phoneCode, phoneNat, phoneIn);
            var okN = validateName();
            var okP = validatePhone();
            var okD = validateStayDates();
            var rawEmailLead = emailIn ? emailIn.value : '';
            var okE = validateOptionalEmailRow(rawEmailLead, emailErr, emailIn);
            if (!okN || !okP || !okE || !okD) {
                if (okD) {
                    showFormError('Проверьте поля выше.');
                }
                if (!okN && nameIn) nameIn.focus();
                else if (!okP && phoneNat) phoneNat.focus();
                else if (!okE && emailIn) emailIn.focus();
                else if (!okD && arrivalDate) arrivalDate.focus();
                return;
            }

            if (yogaTurnstileSiteKey && !getCaptchaToken()) {
                showFormError('Пройдите проверку «Я не робот».');
                return;
            }

            lastSubmitTime = now;
            setFormLoading(true);

            var pDate = (arrivalDate && arrivalDate.value) ? arrivalDate.value.trim() : '';
            var depDate = (departureDate && departureDate.value) ? departureDate.value.trim() : '';
            var cmt = (comment && comment.value) ? comment.value.trim() : '';
            var procEl = form.querySelector('input[name="procedure"]');
            var procedure = (procEl && procEl.value) ? procEl.value.trim() : 'Йога-тур в Таиланд';

            var payload = {
                name: (nameIn && nameIn.value) ? nameIn.value.trim() : '',
                phone: (phoneIn && phoneIn.value) ? phoneIn.value.trim() : '',
                consent: consent ? consent.checked : false,
                website: (websiteHp && websiteHp.value) ? websiteHp.value : '',
                captcha_token: getCaptchaToken() || null,
                procedure: procedure,
                preferred_date: pDate || null,
                departure_date: depDate || null,
                comment: cmt || null,
            };
            var emLeadTrim = (emailIn && emailIn.value) ? emailIn.value.trim() : '';
            if (emLeadTrim) payload.email = emLeadTrim;

            var src = (form.dataset && form.dataset.source) ? String(form.dataset.source).trim() : '';
            if (src) payload.source = src;

            fetch(apiPath('/booking'), {
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
                    resetTurnstileLead();
                    if (r.ok) {
                        form.reset();
                        clearNamePhoneErrors();
                        showFormError('');
                        if (consent) consent.checked = false;
                        if (closeYogaLeadModalFn) closeYogaLeadModalFn();
                    } else {
                        showFormError(msgFromApi(r.status, r.body) || GENERIC_ERR);
                    }
                })
                .catch(function () {
                    setFormLoading(false);
                    resetTurnstileLead();
                    showFormError('Не удалось отправить. Проверьте сеть и попробуйте снова.');
                });
        });
    }

    // --- 14b. Форма бронирования (POST /api/booking) -------------------------
    function initForm() {
        var form = document.getElementById('yogaContactForm');
        if (!form) return;

        var nameIn = document.getElementById('yogaName');
        var phoneIn = document.getElementById('yogaPhone');
        var phoneCode = document.getElementById('yogaPhoneCode');
        var phoneNat = document.getElementById('yogaPhoneNational');
        var emailIn = document.getElementById('yogaEmail');
        var consent = document.getElementById('yogaConsent');
        var arrivalDate = document.getElementById('yogaArrivalDate');
        var departureDate = document.getElementById('yogaDepartureDate');
        var comment = document.getElementById('yogaComment');
        var websiteHp = document.getElementById('yogaWebsite');
        var submitBtn = document.getElementById('yogaSubmitBtn');
        var errBox = document.getElementById('yogaFormError');
        var successBox = document.getElementById('yogaFormSuccess');
        var turnstileEl = document.getElementById('yogaTurnstileWidget');
        var nameErr = document.getElementById('yogaNameErr');
        var phoneErr = document.getElementById('yogaPhoneErr');
        var emailErr = document.getElementById('yogaEmailErr');

        var lastSubmitTime = 0;
        var SUBMIT_COOLDOWN_MS = 5000;
        var turnstileWidgetId = null;
        var turnstileSiteKey = '';

        var GENERIC_ERR = 'Ошибка отправки. Попробуйте позже или напишите в мессенджер.';

        function apiPath(p) {
            return (window.location.origin || '') + '/api' + p;
        }

        function setFormLoading(loading) {
            if (!submitBtn) return;
            submitBtn.disabled = loading;
            submitBtn.textContent = loading ? 'Отправка…' : 'Отправить заявку';
        }

        function showFormError(msg) {
            if (!errBox) return;
            errBox.textContent = msg || '';
            errBox.classList.toggle('is-hidden', !msg);
        }

        function clearNamePhoneErrors() {
            if (nameIn) {
                nameIn.classList.remove('yoga-form__input--error');
            }
            if (phoneNat) {
                phoneNat.classList.remove('yoga-form__input--error');
            }
            if (emailIn) {
                emailIn.classList.remove('yoga-form__input--error');
            }
            if (nameErr) nameErr.textContent = '';
            if (phoneErr) phoneErr.textContent = '';
            if (emailErr) emailErr.textContent = '';
        }

        function validateName() {
            var v = (nameIn && nameIn.value) ? nameIn.value.trim() : '';
            if (v.length < 2) {
                if (nameErr) nameErr.textContent = 'Минимум 2 символа';
                if (nameIn) nameIn.classList.add('yoga-form__input--error');
                return false;
            }
            if (!/^[а-яА-ЯёЁa-zA-Z\s-]+$/.test(v)) {
                if (nameErr) nameErr.textContent = 'Только буквы, дефис и пробел';
                if (nameIn) nameIn.classList.add('yoga-form__input--error');
                return false;
            }
            return true;
        }

        function validatePhone() {
            yogaSyncPhoneHidden(phoneCode, phoneNat, phoneIn);
            return yogaValidateIntlPhone(phoneIn && phoneIn.value, phoneErr, phoneNat);
        }

        function validateStayDates() {
            var a = (arrivalDate && arrivalDate.value) ? arrivalDate.value.trim() : '';
            var d = (departureDate && departureDate.value) ? departureDate.value.trim() : '';
            if (!a && !d) return true;
            if ((a && !d) || (!a && d)) {
                showFormError('Укажите обе даты заезда и выезда или оставьте поля пустыми.');
                return false;
            }
            if (d < a) {
                showFormError('Дата выезда не может быть раньше даты заезда.');
                return false;
            }
            return true;
        }

        function getCaptchaToken() {
            if (!turnstileSiteKey) return '';
            if (turnstileWidgetId == null || !window.turnstile || !window.turnstile.getResponse) {
                return '';
            }
            return window.turnstile.getResponse(turnstileWidgetId) || '';
        }

        function resetTurnstile() {
            if (turnstileWidgetId != null && window.turnstile && window.turnstile.reset) {
                try {
                    window.turnstile.reset(turnstileWidgetId);
                } catch (e) { /* noop */ }
            }
        }

        function msgFromApi(status, body) {
            if (status === 429) {
                return 'Слишком много запросов. Подождите минуту.';
            }
            if (!body || typeof body !== 'object') return null;
            var d = body.detail;
            if (typeof d === 'string' && d.trim()) return d;
            if (Array.isArray(d)) {
                var parts = [];
                for (var i = 0; i < d.length; i++) {
                    if (d[i] && typeof d[i].msg === 'string') parts.push(d[i].msg);
                }
                if (parts.length) return parts.join(' ');
            }
            return null;
        }

        fetch(apiPath('/public-config'))
            .then(function (r) { return r.json(); })
            .then(function (data) {
                turnstileSiteKey = (data && data.turnstileSiteKey) ? String(data.turnstileSiteKey).trim() : '';
                yogaTurnstileSiteKey = turnstileSiteKey;
                if (!turnstileSiteKey || !window.turnstile) return;
                if (turnstileEl) {
                    turnstileEl.innerHTML = '';
                    turnstileWidgetId = window.turnstile.render(turnstileEl, {
                        sitekey: turnstileSiteKey,
                        theme: 'light',
                    });
                }
                var turnstileLeadEl = document.getElementById('yogaTurnstileWidgetLead');
                if (turnstileLeadEl) {
                    turnstileLeadEl.innerHTML = '';
                    yogaTurnstileLeadWidgetId = window.turnstile.render(turnstileLeadEl, {
                        sitekey: turnstileSiteKey,
                        theme: 'light',
                    });
                }
            })
            .catch(function () { /* noop */ });

        function bindMainPhoneSync() {
            function onPhonePartChange() {
                yogaSyncPhoneHidden(phoneCode, phoneNat, phoneIn);
                if (phoneNat) phoneNat.classList.remove('yoga-form__input--error');
                if (phoneErr) phoneErr.textContent = '';
            }
            if (phoneCode) phoneCode.addEventListener('change', onPhonePartChange);
            if (phoneNat) phoneNat.addEventListener('input', onPhonePartChange);
        }
        bindMainPhoneSync();

        if (nameIn) {
            nameIn.addEventListener('input', function () {
                nameIn.classList.remove('yoga-form__input--error');
                if (nameErr) nameErr.textContent = '';
            });
        }
        if (emailIn) {
            emailIn.addEventListener('input', function () {
                emailIn.classList.remove('yoga-form__input--error');
                if (emailErr) emailErr.textContent = '';
            });
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            showFormError('');

            var now = Date.now();
            if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
                showFormError('Подождите несколько секунд перед повторной отправкой.');
                return;
            }

            if (consent && !consent.checked) {
                showFormError('Нужно согласие с политикой конфиденциальности, публичной офертой и условиями отмены бронирования.');
                return;
            }

            clearNamePhoneErrors();
            yogaSyncPhoneHidden(phoneCode, phoneNat, phoneIn);
            var okN = validateName();
            var okP = validatePhone();
            var okD = validateStayDates();
            var rawEmailMain = emailIn ? emailIn.value : '';
            var okE = validateOptionalEmailRow(rawEmailMain, emailErr, emailIn);
            if (!okN || !okP || !okE || !okD) {
                if (!okD) {
                    /* сообщение уже в showFormError */
                } else {
                    showFormError('Проверьте поля выше.');
                }
                if (!okN && nameIn) nameIn.focus();
                else if (!okP && phoneNat) phoneNat.focus();
                else if (!okE && emailIn) emailIn.focus();
                else if (!okD && arrivalDate) arrivalDate.focus();
                return;
            }

            if (turnstileSiteKey && !getCaptchaToken()) {
                showFormError('Пройдите проверку «Я не робот».');
                return;
            }

            lastSubmitTime = now;
            setFormLoading(true);

            var pDate = (arrivalDate && arrivalDate.value) ? arrivalDate.value.trim() : '';
            var depDate = (departureDate && departureDate.value) ? departureDate.value.trim() : '';
            var cmt = (comment && comment.value) ? comment.value.trim() : '';
            var procEl = form.querySelector('input[name="procedure"]');
            var procedure = (procEl && procEl.value) ? procEl.value.trim() : 'Йога-тур в Таиланд';
            var payload = {
                name: (nameIn && nameIn.value) ? nameIn.value.trim() : '',
                phone: (phoneIn && phoneIn.value) ? phoneIn.value.trim() : '',
                consent: consent ? consent.checked : false,
                website: (websiteHp && websiteHp.value) ? websiteHp.value : '',
                captcha_token: getCaptchaToken() || null,
                procedure: procedure,
                preferred_date: pDate || null,
                departure_date: depDate || null,
                comment: cmt || null,
            };
            var emMainTrim = (emailIn && emailIn.value) ? emailIn.value.trim() : '';
            if (emMainTrim) payload.email = emMainTrim;
            var src = (form.dataset && form.dataset.source) ? String(form.dataset.source).trim() : '';
            if (src) payload.source = src;

            fetch(apiPath('/booking'), {
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
                    resetTurnstile();
                    if (r.ok) {
                        if (successBox) successBox.classList.remove('is-hidden');
                        form.classList.add('is-hidden');
                        form.reset();
                        clearNamePhoneErrors();
                    } else {
                        showFormError(msgFromApi(r.status, r.body) || GENERIC_ERR);
                    }
                })
                .catch(function () {
                    setFormLoading(false);
                    resetTurnstile();
                    showFormError('Не удалось отправить. Проверьте сеть и попробуйте снова.');
                });
        });
    }

    function boot() {
        initScrollProgress();
        initHeader();
        initBurgerMenu();
        initSmoothScroll();
        initFadeIn();
        initVideoThumbnails();
        initVideoModal();
        initTextReviewsShuffle();
        initFaqAccordion();
        initRoomsCarousel();
        initRoomsInnerGalleries();
        initCopyrightYear();
        initPrivacyModal();
        initYogaOfferCancellationModals();
        initYogaLeadModal();
        initYogaPanchaInfoModal();
        initForm();
        initYogaLeadForm();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
