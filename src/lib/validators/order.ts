import { z } from 'zod';

export const orderItemSchema = z.object({
    designId: z.string().min(1, 'Design is required'),
    colorId: z.string().optional().nullable(),
    quantity: z.number().int().positive('Quantity must be at least 1'),
    unitType: z.enum(['PCS', 'SET']),
    productCode: z.string(), // Snapshot
    // We can add more validation here if needed, but server will verify against DB
});

export const createOrderSchema = z.object({
    dealerId: z.string().min(1, 'Dealer is required'),
    subDealerId: z.string().optional().nullable(),
    dealerMobile: z.string().length(10, 'Mobile number must be exactly 10 digits').regex(/^\d+$/, 'Mobile must be numeric'),
    paymentType: z.enum(['ADVANCE', 'CREDIT']),
    creditDays: z.number().int().nonnegative().optional(),
    remarks: z.string().optional(),
    items: z.array(orderItemSchema).min(1, 'At least one item is required'),
});

export type CreateOrderRequest = z.infer<typeof createOrderSchema>;
