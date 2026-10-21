ALTER TABLE "Order"
ADD COLUMN "checkoutGroupId" TEXT;

UPDATE "Order"
SET "checkoutGroupId" = "orderNumber";

CREATE TEMP TABLE "_RuralConnectOrderSellerGroups" AS
WITH item_groups AS (
    SELECT
        o."id" AS "originalOrderId",
        COALESCE(ep."id", p."profileId") AS "sellerProfileId",
        SUM(oi."totalPrice") AS "groupTotal",
        o."entrepreneurId" AS "existingSellerId",
        o."orderNumber"
    FROM "Order" AS o
    JOIN "OrderItem" AS oi ON oi."orderId" = o."id"
    JOIN "Product" AS p ON p."id" = oi."productId"
    LEFT JOIN "EntrepreneurProfile" AS ep ON ep."userId" = p."entrepreneurId"
    GROUP BY o."id", COALESCE(ep."id", p."profileId")
),
orders_without_items AS (
    SELECT
        o."id" AS "originalOrderId",
        o."entrepreneurId" AS "sellerProfileId",
        o."totalAmount" AS "groupTotal",
        o."entrepreneurId" AS "existingSellerId",
        o."orderNumber"
    FROM "Order" AS o
    WHERE NOT EXISTS (
        SELECT 1 FROM "OrderItem" AS oi WHERE oi."orderId" = o."id"
    )
),
all_groups AS (
    SELECT * FROM item_groups WHERE "sellerProfileId" IS NOT NULL
    UNION ALL
    SELECT * FROM orders_without_items WHERE "sellerProfileId" IS NOT NULL
)
SELECT
    "originalOrderId",
    "sellerProfileId",
    "groupTotal",
    "orderNumber",
    ROW_NUMBER() OVER (
        PARTITION BY "originalOrderId"
        ORDER BY
            CASE WHEN "sellerProfileId" = "existingSellerId" THEN 0 ELSE 1 END,
            "sellerProfileId"
    ) AS "groupIndex",
    CASE
        WHEN ROW_NUMBER() OVER (
            PARTITION BY "originalOrderId"
            ORDER BY
                CASE WHEN "sellerProfileId" = "existingSellerId" THEN 0 ELSE 1 END,
                "sellerProfileId"
        ) = 1
        THEN "originalOrderId"
        ELSE 'legacy-' || gen_random_uuid()::TEXT
    END AS "targetOrderId"
FROM all_groups;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Order" AS o
        WHERE NOT EXISTS (
            SELECT 1
            FROM "_RuralConnectOrderSellerGroups" AS s
            WHERE s."originalOrderId" = o."id"
        )
    ) THEN
        RAISE EXCEPTION 'Cannot migrate orders without a seller; assign each legacy order to a seller first.';
    END IF;
END $$;

INSERT INTO "Order" (
    "id",
    "orderNumber",
    "checkoutGroupId",
    "customerId",
    "entrepreneurId",
    "status",
    "totalAmount",
    "shippingAddress",
    "paymentMethod",
    "createdAt",
    "updatedAt"
)
SELECT
    s."targetOrderId",
    'RC-' || gen_random_uuid()::TEXT,
    o."checkoutGroupId",
    o."customerId",
    s."sellerProfileId",
    o."status",
    s."groupTotal",
    o."shippingAddress",
    o."paymentMethod",
    o."createdAt",
    o."updatedAt"
FROM "_RuralConnectOrderSellerGroups" AS s
JOIN "Order" AS o ON o."id" = s."originalOrderId"
WHERE s."groupIndex" > 1;

UPDATE "Order" AS o
SET
    "entrepreneurId" = s."sellerProfileId",
    "totalAmount" = s."groupTotal"
FROM "_RuralConnectOrderSellerGroups" AS s
WHERE s."originalOrderId" = o."id"
  AND s."groupIndex" = 1;

UPDATE "OrderItem" AS oi
SET "orderId" = s."targetOrderId"
FROM "Product" AS p
JOIN "EntrepreneurProfile" AS ep ON ep."userId" = p."entrepreneurId"
JOIN "_RuralConnectOrderSellerGroups" AS s
  ON s."sellerProfileId" = ep."id"
WHERE p."id" = oi."productId"
  AND s."originalOrderId" = oi."orderId";

UPDATE "OrderItem" AS oi
SET "orderId" = s."targetOrderId"
FROM "Product" AS p
JOIN "_RuralConnectOrderSellerGroups" AS s
  ON s."sellerProfileId" = p."profileId"
WHERE p."id" = oi."productId"
  AND s."originalOrderId" = oi."orderId";

UPDATE "Payment" AS payment
SET "amount" = s."groupTotal"
FROM "_RuralConnectOrderSellerGroups" AS s
WHERE payment."orderId" = s."originalOrderId"
  AND s."groupIndex" = 1;

INSERT INTO "Payment" (
    "id",
    "orderId",
    "method",
    "amount",
    "status",
    "transactionRef",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy-payment-' || gen_random_uuid()::TEXT,
    s."targetOrderId",
    payment."method",
    s."groupTotal",
    payment."status",
    payment."transactionRef" || '-S' || s."groupIndex",
    payment."createdAt",
    payment."updatedAt"
FROM "_RuralConnectOrderSellerGroups" AS s
JOIN "Payment" AS payment ON payment."orderId" = s."originalOrderId"
WHERE s."groupIndex" > 1;

CREATE TEMP TABLE "_RuralConnectDeliverySplit" AS
SELECT
    s."targetOrderId",
    d."id" AS "originalDeliveryId",
    'legacy-delivery-' || gen_random_uuid()::TEXT AS "targetDeliveryId"
FROM "_RuralConnectOrderSellerGroups" AS s
JOIN "Delivery" AS d ON d."orderId" = s."originalOrderId"
WHERE s."groupIndex" > 1;

INSERT INTO "Delivery" (
    "id",
    "orderId",
    "deliveryAddress",
    "partnerName",
    "estimatedDate",
    "status",
    "createdAt",
    "updatedAt"
)
SELECT
    split."targetDeliveryId",
    split."targetOrderId",
    d."deliveryAddress",
    d."partnerName",
    d."estimatedDate",
    d."status",
    d."createdAt",
    d."updatedAt"
FROM "_RuralConnectDeliverySplit" AS split
JOIN "Delivery" AS d ON d."id" = split."originalDeliveryId";

INSERT INTO "TrackingEvent" ("id", "deliveryId", "status", "note", "createdAt")
SELECT
    'legacy-tracking-' || gen_random_uuid()::TEXT,
    split."targetDeliveryId",
    event."status",
    event."note",
    event."createdAt"
FROM "_RuralConnectDeliverySplit" AS split
JOIN "TrackingEvent" AS event ON event."deliveryId" = split."originalDeliveryId";

ALTER TABLE "Order"
ALTER COLUMN "entrepreneurId" SET NOT NULL,
ALTER COLUMN "checkoutGroupId" SET NOT NULL;

ALTER TABLE "Order"
DROP CONSTRAINT "Order_entrepreneurId_fkey";

ALTER TABLE "Order"
ADD CONSTRAINT "Order_entrepreneurId_fkey"
FOREIGN KEY ("entrepreneurId") REFERENCES "EntrepreneurProfile"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Order_checkoutGroupId_idx" ON "Order"("checkoutGroupId");
CREATE INDEX "Order_entrepreneurId_createdAt_idx" ON "Order"("entrepreneurId", "createdAt");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

ALTER TYPE "DeliveryStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';

DROP TABLE "_RuralConnectDeliverySplit";
DROP TABLE "_RuralConnectOrderSellerGroups";
