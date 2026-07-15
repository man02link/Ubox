export const inventarioDto = {
    toCreateProduct(body, file) {
        let desc = body.Descripcion;
        if (Array.isArray(desc)) desc = desc[0];

        return {
            name: body.name || "Producto sin nombre",
            price: parseFloat(body.price) || 0,
            quantity: parseInt(body.quantity) || 0,
            brand: body.brand || null,
            Id_suppliers: body.Id_suppliers || null,
            userId: body.userId || null,
            Descripcion: desc || null,
            image_path: file ? file.filename : null
        };
    },

    toUpdateProduct(body) {
        const payload = {};
        if (body.name !== undefined) payload.name = body.name;
        if (body.price !== undefined) payload.price = parseFloat(body.price);
        if (body.quantity !== undefined) payload.quantity = parseInt(body.quantity);
        if (body.image_path !== undefined) payload.image_path = body.image_path;
        if (body.brand !== undefined) payload.brand = body.brand;
        if (body.Id_suppliers !== undefined) payload.Id_suppliers = body.Id_suppliers;
        if (body.Descripcion !== undefined) payload.Descripcion = body.Descripcion;
        return payload;
    }
};