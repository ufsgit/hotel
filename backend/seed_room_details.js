require('dotenv').config();
const pool = require('./src/config/db');

async function seedData() {
    try {
        console.log('Seeding detailed amenities and rate plans...');

        const detailedAmenities = {
            popular: [
                'Free High-Speed Wi-Fi',
                'Daily Housekeeping',
                '24-Hour Room Service',
                'Complimentary Breakfast'
            ],
            features: [
                'Mini Refrigerator',
                'Work Desk with Ergonomic Chair',
                'Coffee & Tea Maker',
                'Plush Sofa Seating Area',
                'Iron & Ironing Board'
            ],
            bathroom: [
                'Rainfall Showerhead',
                'Premium Organic Toiletries',
                'Hairdryer',
                'Bathrobes & Slippers',
                'Lighted Makeup Mirror'
            ],
            safety: [
                'In-Room Electronic Safe',
                'Smoke Detectors',
                'Keycard Access',
                'Emergency Evacuation Plan'
            ],
            media: [
                '55-inch Smart Flat-Screen TV',
                'Premium Cable & Satellite Channels',
                'Bluetooth Sound System',
                'Universal Charging Ports'
            ]
        };

        const ratePlans = [
            {
                id: 'room-only',
                name: 'Standard Room Only',
                badge: '',
                priceMultiplier: 1.0,
                inclusions: [
                    'Free High-Speed Wi-Fi',
                    'Free Cancellation up to 48 hours before check-in'
                ]
            },
            {
                id: 'bed-breakfast',
                name: 'Room with Breakfast Included',
                badge: 'Best Value',
                priceMultiplier: 1.15,
                inclusions: [
                    'Complimentary Buffet Breakfast',
                    'Free High-Speed Wi-Fi',
                    'Free Cancellation up to 48 hours before check-in'
                ]
            },
            {
                id: 'ultimate-getaway',
                name: 'Premium All-Inclusive Package',
                badge: 'VIP Experience',
                priceMultiplier: 1.4,
                inclusions: [
                    'Complimentary Buffet Breakfast',
                    'Choice of Lunch or Dinner',
                    'Free Airport Transfer',
                    'Welcome Drinks on Arrival',
                    '20% Off Spa Services'
                ]
            }
        ];

        const updateQuery = `
            UPDATE room_types 
            SET detailed_amenities = ?, 
                rate_plans = ?, 
                room_size = '210 sq.ft', 
                view_type = 'City View', 
                bed_type = '1 Queen Bed'
        `;

        await pool.query(updateQuery, [JSON.stringify(detailedAmenities), JSON.stringify(ratePlans)]);

        console.log('✅ Successfully seeded detailed data for all existing room types!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to seed data:', err.message);
        process.exit(1);
    }
}

seedData();
