/* Satva Samui — Meta Pixel extended events (marketing consent).
   PageView fires from inline <head> on main landings; this file handles Lead/Contact/ViewContent. */
(function () {
    'use strict';

    var marketingReady = false;
    var viewContentSent = false;

    function getFbq() {
        return typeof window.fbq === 'function' ? window.fbq : null;
    }

    function hasMarketingConsent() {
        return window.satvaConsent && window.satvaConsent.isGranted('marketing');
    }

    function initMarketingEvents() {
        if (marketingReady || !hasMarketingConsent()) return;
        marketingReady = true;
        bindContactTracking();
        bindViewContentTracking();
    }

    function trackLead(eventId) {
        if (!hasMarketingConsent() || !eventId) return;
        var fbq = getFbq();
        if (!fbq) return;
        fbq('track', 'Lead', {}, { eventID: String(eventId) });
    }

    function bindContactTracking() {
        document.addEventListener('click', function (e) {
            if (!marketingReady) return;
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

    window.satvaPixel = {
        trackLead: trackLead,
        isReady: function () {
            return marketingReady && !!getFbq();
        },
    };

    window.addEventListener('satva-consent-changed', initMarketingEvents);

    function scheduleInit() {
        initMarketingEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleInit);
    } else {
        scheduleInit();
    }
    window.addEventListener('load', scheduleInit);
})();
