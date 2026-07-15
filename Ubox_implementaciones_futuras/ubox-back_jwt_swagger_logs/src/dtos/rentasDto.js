export const rentasDto = {
    toCreateRental(body) {
        return {
            userId: body.userId,
            client_name: body.client_name,
            client_id_card: body.client_id_card,
            client_phone: body.client_phone || null,
            client_email: body.client_email || null,
            date_end_plan: body.date_end_plan,
            cartItems: body.cartItems || []
        };
    }
};