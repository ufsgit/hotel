const pool = require('../config/db');

async function calculatePrice(hotel_id, room_type_id, check_in, check_out, guests, promo_code_str = null) {
    const [roomTypes] = await pool.query('SELECT base_price, extra_bed_price, max_occupancy FROM room_types WHERE id = ?', [room_type_id]);
    if (roomTypes.length === 0) throw new Error('Room type not found');
    const room = roomTypes[0];

    const start = new Date(check_in);
    const end = new Date(check_out);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) throw new Error('Invalid dates');

    let baseTotal = room.base_price * nights;
    
    // Extra beds
    let extraBeds = 0;
    const capacity = room.max_occupancy || 2;
    if (guests > capacity) {
        extraBeds = guests - capacity;
        baseTotal += (extraBeds * (room.extra_bed_price || 0) * nights);
    }

    let subtotal = baseTotal;
    let seasonOfferId = null;

    // Check for active seasonal offers
    const [offers] = await pool.query(
        `SELECT * FROM seasons_offers 
         WHERE hotel_id = ? AND is_active = TRUE 
         AND start_date <= ? AND end_date >= ?
         ORDER BY priority DESC LIMIT 1`,
        [hotel_id, check_in, check_in] // Simplified logic: check if check_in falls in season
    );

    if (offers.length > 0) {
        const offer = offers[0];
        seasonOfferId = offer.id;
        if (offer.discount_type === 'percent') {
            subtotal -= subtotal * (offer.discount_value / 100);
        } else {
            subtotal -= offer.discount_value;
        }
    }

    let promoCodeId = null;
    let promoDiscount = 0;

    // Check for promo code
    if (promo_code_str) {
        const [promos] = await pool.query(
            `SELECT * FROM promo_codes 
             WHERE hotel_id = ? AND code = ? AND is_active = TRUE 
             AND valid_from <= ? AND valid_to >= ?`,
            [hotel_id, promo_code_str, check_in, check_in]
        );

        if (promos.length > 0) {
            const promo = promos[0];
            if (promo.max_uses === null || promo.times_used < promo.max_uses) {
                promoCodeId = promo.id;
                if (promo.discount_type === 'percent') {
                    promoDiscount = subtotal * (promo.discount_value / 100);
                } else {
                    promoDiscount = promo.discount_value;
                }
                subtotal -= promoDiscount;
            }
        }
    }

    // Ensure subtotal doesn't go below 0
    if (subtotal < 0) subtotal = 0;

    const taxAmount = subtotal * 0.10; // 10% flat tax for MVP
    const totalAmount = subtotal + taxAmount;

    return {
        nights,
        baseTotal,
        subtotal,
        taxAmount,
        totalAmount,
        extraBeds,
        seasonOfferId,
        promoCodeId
    };
}

module.exports = {
    calculatePrice
};
