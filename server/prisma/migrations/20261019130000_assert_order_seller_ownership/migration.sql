DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "OrderItem" AS oi
        JOIN "Order" AS o ON o."id" = oi."orderId"
        JOIN "Product" AS p ON p."id" = oi."productId"
        LEFT JOIN "EntrepreneurProfile" AS ep ON ep."userId" = p."entrepreneurId"
        WHERE COALESCE(ep."id", p."profileId") IS NULL
           OR COALESCE(ep."id", p."profileId") <> o."entrepreneurId"
    ) THEN
        RAISE EXCEPTION 'Every order item must belong to its order seller; resolve seller ownership before continuing.';
    END IF;
END $$;
