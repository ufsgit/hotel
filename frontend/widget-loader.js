/**
 * Hotel Direct Booking Platform - Widget Loader
 * 
 * Instructions for Hotel Owners:
 * Copy and paste the following snippet into the <head> or <body> of your website:
 * 
 * <div id="hotel-booking-widget" data-hotel="grand-oasis"></div>
 * <script src="https://your-hotel-domain.com/widget-loader.js"></script>
 */

(function() {
    // URL where the Angular Guest Widget is hosted
    const WIDGET_BASE_URL = 'http://localhost:4201';

    function initWidget() {
        const container = document.getElementById('hotel-booking-widget');
        if (!container) {
            console.error('Hotel Booking Widget: Container <div id="hotel-booking-widget"> not found.');
            return;
        }

        const hotelSlug = container.getAttribute('data-hotel') || 'default-hotel';

        // We embed the Angular application using an iframe for maximum isolation
        // Alternatively, this could inject the Angular scripts directly into the DOM
        const iframe = document.createElement('iframe');
        iframe.src = `${WIDGET_BASE_URL}/?hotel=${hotelSlug}`;
        iframe.style.width = '100%';
        iframe.style.minHeight = '600px';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '8px';
        iframe.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        
        container.appendChild(iframe);
        console.log('Hotel Booking Widget loaded successfully.');
    }

    // Wait for the DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }
})();
