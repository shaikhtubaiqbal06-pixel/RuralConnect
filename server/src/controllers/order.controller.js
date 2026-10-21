import prisma from '../config/db.js';
import { CheckoutError, createCheckoutOrders } from '../services/orders.service.js';

const getStatusTransition = (status) => ({
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
})[status] || [];

const deliveryStatusForOrder = {
  CONFIRMED: 'ORDER_CONFIRMED',
  PROCESSING: 'PACKED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

const getEntrepreneurProfile = (userId) =>
  prisma.entrepreneurProfile.findUnique({ where: { userId } });

export const createOrder = async (req, res) => {
  try {
    const checkout = await createCheckoutOrders(prisma, {
      customerId: req.user.id,
      ...req.body,
    });
    return res.status(201).json({
      message: 'Checkout completed successfully.',
      ...checkout,
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return res.status(error.statusCode).json({
        message: error.message,
        ...(error.paymentStatus && { paymentStatus: error.paymentStatus }),
      });
    }
    console.error(error);
    return res.status(500).json({ message: 'Unable to complete checkout. No orders were placed.' });
  }
};

export const getOrders = async (req, res) => {
  try {
    let where;
    if (req.user.role === 'ENTREPRENEUR') {
      const profile = await getEntrepreneurProfile(req.user.id);
      if (!profile) {
        return res.status(403).json({ message: 'Entrepreneur profile not found.' });
      }
      where = { entrepreneurId: profile.id };
    } else if (req.user.role === 'CUSTOMER') {
      where = { customerId: req.user.id };
    } else {
      return res.status(403).json({ message: 'You do not have permission to view orders.' });
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        payment: true,
        delivery: { include: { trackingEvents: { orderBy: { createdAt: 'asc' } } } },
        entrepreneur: { select: { businessName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ orders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to load orders.' });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: true } },
        payment: true,
        delivery: { include: { trackingEvents: { orderBy: { createdAt: 'asc' } } } },
        entrepreneur: { select: { businessName: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const isCustomerOwner = req.user.role === 'CUSTOMER' && order.customerId === req.user.id;
    const profile = req.user.role === 'ENTREPRENEUR'
      ? await getEntrepreneurProfile(req.user.id)
      : null;
    const isSellerOwner = profile && order.entrepreneurId === profile.id;
    if (!isCustomerOwner && !isSellerOwner) {
      return res.status(403).json({ message: 'You cannot access this order.' });
    }

    return res.json({ order });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to fetch order details.' });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    if (req.user.role !== 'ENTREPRENEUR') {
      return res.status(403).json({ message: 'Only entrepreneurs can update order status.' });
    }
    const profile = await getEntrepreneurProfile(req.user.id);
    if (!profile) {
      return res.status(403).json({ message: 'Entrepreneur profile not found.' });
    }

    const { status } = req.body;
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: req.params.id },
        include: { delivery: true, payment: true, items: true },
      });
      if (!order) {
        throw new CheckoutError('Order not found.', 404);
      }
      if (order.entrepreneurId !== profile.id) {
        throw new CheckoutError('You can only manage your own orders.', 403);
      }
      if (!getStatusTransition(order.status).includes(status)) {
        throw new CheckoutError('Invalid status transition.');
      }

      const statusUpdate = await tx.order.updateMany({
        where: {
          id: order.id,
          entrepreneurId: profile.id,
          status: order.status,
        },
        data: { status },
      });
      if (statusUpdate.count !== 1) {
        throw new CheckoutError('Order status changed. Refresh and try again.', 409);
      }

      if (status === 'CANCELLED') {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              available: true,
            },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              change: item.quantity,
              reason: `Restocked after cancellation of order ${order.orderNumber}`,
            },
          });
        }
        if (order.payment) {
          await tx.payment.update({
            where: { orderId: order.id },
            data: {
              status: order.payment.status === 'SUCCESSFUL' ? 'REFUNDED' : 'CANCELLED',
            },
          });
        }
      }

      if (order.delivery) {
        const deliveryStatus = deliveryStatusForOrder[status];
        await tx.delivery.update({
          where: { id: order.delivery.id },
          data: {
            status: deliveryStatus,
            trackingEvents: {
              create: [{
                status: deliveryStatus,
                note: status === 'CANCELLED'
                  ? 'Order cancelled; reserved inventory restored.'
                  : `Order status updated to ${status}.`,
              }],
            },
          },
        });
      }
      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: { include: { product: true } },
          payment: true,
          delivery: { include: { trackingEvents: { orderBy: { createdAt: 'asc' } } } },
          entrepreneur: { select: { businessName: true } },
        },
      });
    });

    return res.json({ order: updatedOrder, message: 'Order status updated.' });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: 'Unable to update order status.' });
  }
};
