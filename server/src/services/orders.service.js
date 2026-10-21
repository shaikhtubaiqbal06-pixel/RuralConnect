import { v4 as uuidv4 } from 'uuid';

export class CheckoutError extends Error {
  constructor(message, statusCode = 400, paymentStatus, options) {
    super(message, options);
    this.name = 'CheckoutError';
    this.statusCode = statusCode;
    this.paymentStatus = paymentStatus;
  }
}

const validateCheckout = ({ items, shippingAddress, paymentMethod }) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new CheckoutError('Order must contain at least one item.');
  }
  if (typeof shippingAddress !== 'string' || !shippingAddress.trim()) {
    throw new CheckoutError('A shipping address is required.');
  }
  if (!['COD', 'UPI'].includes(paymentMethod)) {
    throw new CheckoutError('A valid payment method is required.');
  }

  const quantities = new Map();
  for (const item of items) {
    if (
      !item ||
      typeof item.productId !== 'string' ||
      !item.productId ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new CheckoutError('Each item must have a product and a positive whole-number quantity.');
    }
    quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
  }
  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
};

const simulatePayment = ({ paymentMethod }) => ({
  status: paymentMethod === 'UPI' ? 'SUCCESSFUL' : 'PENDING',
});

export const createCheckoutOrders = async (
  prisma,
  { customerId, items, shippingAddress, paymentMethod },
  paymentSimulator = simulatePayment,
) => {
  const normalizedItems = validateCheckout({ items, shippingAddress, paymentMethod });
  const checkoutGroupId = uuidv4();

  return prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: normalizedItems.map(({ productId }) => productId) } },
      include: { entrepreneur: { include: { entrepreneurProfile: true } } },
    });
    const productsById = new Map(products.map((product) => [product.id, product]));
    const sellerGroups = new Map();

    for (const item of normalizedItems) {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new CheckoutError(`Product not found: ${item.productId}`, 404);
      }
      if (!product.available || product.stock < item.quantity) {
        throw new CheckoutError(`Insufficient stock for ${product.name}`, 409);
      }

      const sellerProfileId = product.entrepreneur?.entrepreneurProfile?.id;
      if (!sellerProfileId) {
        throw new CheckoutError(`Seller profile not found for ${product.name}`, 409);
      }

      const group = sellerGroups.get(sellerProfileId) || {
        sellerProfileId,
        items: [],
        totalAmountCents: 0,
      };
      const unitPriceCents = Math.round(Number(product.price) * 100);
      const totalPriceCents = unitPriceCents * item.quantity;
      group.items.push({
        product,
        quantity: item.quantity,
        unitPrice: unitPriceCents / 100,
        totalPrice: totalPriceCents / 100,
      });
      group.totalAmountCents += totalPriceCents;
      sellerGroups.set(sellerProfileId, group);
    }

    const createdOrders = [];
    for (const group of sellerGroups.values()) {
      const totalAmount = group.totalAmountCents / 100;
      for (const item of group.items) {
        const reservation = await tx.product.updateMany({
          where: {
            id: item.product.id,
            available: true,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });
        if (reservation.count !== 1) {
          throw new CheckoutError(`Insufficient stock for ${item.product.name}`, 409);
        }
        await tx.product.updateMany({
          where: { id: item.product.id, stock: 0 },
          data: { available: false },
        });
      }

      let simulatedPayment;
      try {
        simulatedPayment = await paymentSimulator({
          paymentMethod,
          amount: totalAmount,
          checkoutGroupId,
          sellerProfileId: group.sellerProfileId,
        });
      } catch (error) {
        throw new CheckoutError(
          'Simulated payment failed. No orders were placed and inventory was restored.',
          402,
          'FAILED',
          { cause: error },
        );
      }
      if (simulatedPayment?.status !== (paymentMethod === 'COD' ? 'PENDING' : 'SUCCESSFUL')) {
        throw new CheckoutError(
          'Simulated payment failed. No orders were placed and inventory was restored.',
          402,
          'FAILED',
        );
      }

      const order = await tx.order.create({
        data: {
          orderNumber: `RC-${uuidv4()}`,
          checkoutGroupId,
          customerId,
          entrepreneurId: group.sellerProfileId,
          status: 'PENDING',
          totalAmount,
          shippingAddress: shippingAddress.trim(),
          paymentMethod,
          items: {
            create: group.items.map(({ product, quantity, unitPrice, totalPrice }) => ({
              productId: product.id,
              quantity,
              unitPrice,
              totalPrice,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          entrepreneur: { select: { businessName: true } },
        },
      });
      for (const item of group.items) {
        await tx.inventoryMovement.create({
          data: {
            productId: item.product.id,
            change: -item.quantity,
            reason: `Reserved for order ${order.orderNumber}`,
          },
        });
      }
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          method: paymentMethod,
          amount: totalAmount,
          status: simulatedPayment.status,
          transactionRef: `SIM-${uuidv4()}`,
        },
      });
      const delivery = await tx.delivery.create({
        data: {
          orderId: order.id,
          deliveryAddress: shippingAddress.trim(),
          partnerName: 'RuralConnect Logistics',
          estimatedDate: new Date(Date.now() + 5 * 86400000),
          status: 'ORDER_CONFIRMED',
          trackingEvents: {
            create: [{ status: 'ORDER_CONFIRMED', note: 'Order placed and awaiting fulfillment.' }],
          },
        },
      });

      createdOrders.push({ ...order, payment, delivery });
    }

    return { checkoutGroupId, orders: createdOrders };
  });
};
