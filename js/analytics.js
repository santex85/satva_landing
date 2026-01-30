// Аналитика: заглушка для событий. Подставьте ID Google Analytics / Яндекс.Метрики и реализуйте отправку.
window.SatvaAnalytics = {
    trackEvent: function(category, action, label) {
        if (typeof gtag === 'function') {
            gtag('event', action, { event_category: category, event_label: label || '' });
        }
        if (typeof ym === 'function') {
            ym(window.YANDEX_METRIKA_ID, 'reachGoal', action, { category: category, label: label });
        }
    }
};
