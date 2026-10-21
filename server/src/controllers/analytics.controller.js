import prisma from '../config/db.js';

export const getDashboardData = async (req, res) => {
  try {
    const products = await prisma.product.findMany({ where: { entrepreneurId: req.user.id } });
    let orderFilter;
    if (req.user.role === 'ENTREPRENEUR') {
      const entrepreneurProfile = await prisma.entrepreneurProfile.findUnique({ where: { userId: req.user.id } });
      if (!entrepreneurProfile) {
        return res.status(403).json({ message: 'Entrepreneur profile not found.' });
      }
      orderFilter = { entrepreneurId: entrepreneurProfile.id };
    } else {
      orderFilter = { customerId: req.user.id };
    }
    const orders = await prisma.order.findMany({
      where: orderFilter,
      include: { items: true },
    });

    const totalSales = orders.reduce((sum, order) => (order.status === 'CANCELLED' ? sum : sum + Number(order.totalAmount)), 0);
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((order) => order.status === 'PENDING').length;
    const lowStock = products.filter((product) => product.stock <= 5 && product.stock > 0).length;
    const outOfStock = products.filter((product) => product.stock === 0).length;

    return res.json({
      stats: {
        totalProducts: products.length,
        totalOrders,
        pendingOrders,
        confirmedOrders: orders.filter((order) => order.status === 'CONFIRMED').length,
        shippedOrders: orders.filter((order) => order.status === 'SHIPPED').length,
        deliveredOrders: orders.filter((order) => order.status === 'DELIVERED').length,
        availableInventory: products.reduce((sum, product) => sum + product.stock, 0),
        totalSales,
        lowStock,
        outOfStock,
      },
      recentOrders: orders.slice(0, 5),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to load analytics.' });
  }
};
