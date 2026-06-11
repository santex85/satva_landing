/* Satva Samui — Meta Pixel (marketing consent only) */
(function () {
    'use strict';

    var pixelId = '';
    var meta = document.querySelector('meta[name="satva-meta-pixel-id"]');
    if (meta && meta.content) pixelId = String(meta.content).trim();

    var initialized = false;
    var viewContentSent = false;

    function getFbq() {
        return typeof window.fbq === 'function' ? window.fbq : null;
    }

    function loadPixelScript(callback) {
        if (window.fbq) {
            callback();
            return;
        }
        var n = window.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!window._fbq) window._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = '2.0';
        n.queue = [];
        var script = document.createElement('script');
        script.async = true;
        script.src = 'https://connect.facebook.net/en_US/fbevents.js';
        script.onload = callback;
        script.onerror = callback;
        var first = document.getElementsByTagName('script')[0];
        first.parentNode.insertBefore(script, first);
    }

    function initPixel() {
        if (initialized || !pixelId) return;
        if (!window.satvaConsent || !window.satvaConsent.isGranted('marketing')) return;

        loadPixelScript(function () {
            if (initialized || !pixelId) return;
            var fbq = getFbq();
            if (!fbq) return;
            fbq('init', pixelId);
            fbq('track', 'PageView');
            initialized = true;
            bindContactTracking();
            bindViewContentTracking();
        });
    }

    function trackLead(eventId) {
        if (!initialized || !eventId) return;
        var fbq = getFbq();
        if (!fbq) return;
        fbq('track', 'Lead', {}, { eventID: String(eventId) });
    }

    function bindContactTracking() {
        document.addEventListener('click', function (e) {
            if (!initialized) return;
            var link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
            if (!link) return;
            var href = link.getAttribute('href') || '';
            var isContact =
                href.indexOf('https://wa.me') === 0 ||
                href.indexOf('http://wa.me') === 0 ||
                href.indexOf('tel:') === 0 ||
                href.indexOf('t.me/') !== -1 ||
                href.indexOf('telegram.me/') !== -1 ||
                href.indexOf('https://t.me') === 0;
            if (!isContact) return;
            var fbq = getFbq();
            if (fbq) fbq('track', 'Contact');
        });
    }

    function bindViewContentTracking() {
        var target = document.getElementById('booking');
        if (!target || typeof IntersectionObserver === 'undefined') return;

        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting || viewContentSent) return;
                    viewContentSent = true;
                    var fbq = getFbq();
                    if (fbq) fbq('track', 'ViewContent', { content_name: 'booking' });
                    observer.disconnect();
                });
            },
            { threshold: 0.35 }
        );
        observer.observe(target);
    }

    function onConsentChanged() {
        if (window.satvaConsent && window.satvaConsent.isGranted('marketing')) {
            initPixel();
        }
    }

    window.satvaPixel = {
        trackLead: trackLead,
        isReady: function () {
            return initialized;
        },
    };

    window.addEventListener('satva-consent-changed', onConsentChanged);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onConsentChanged);
    } else {
        onConsentChanged();
    }
})();
