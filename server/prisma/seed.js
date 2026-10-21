import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ensureEntrepreneur = async ({
  fullName,
  email,
  phone,
  password,
  businessName,
  category,
  location,
}) => {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      fullName,
      email,
      phone,
      password,
      role: 'ENTREPRENEUR',
      entrepreneurProfile: {
        create: { businessName, category, location },
      },
    },
  });
  await prisma.entrepreneurProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, businessName, category, location },
  });
  return prisma.user.findUnique({
    where: { id: user.id },
    include: { entrepreneurProfile: true },
  });
};

const ensureProduct = async (seller, product) => {
  const existing = await prisma.product.findFirst({
    where: { entrepreneurId: seller.id, name: product.name },
  });
  if (existing) {
    return prisma.product.update({
      where: { id: existing.id },
      data: {
        description: product.description,
        price: product.price,
        category: product.category,
        imageUrl: product.imageUrl,
        available: existing.stock > 0,
      },
    });
  }

  return prisma.product.create({
    data: {
      ...product,
      entrepreneurId: seller.id,
      profileId: seller.entrepreneurProfile.id,
      available: product.stock > 0,
    },
  });
};

const retireLegacyBasketListing = async (seller) => {
  const legacyProduct = await prisma.product.findFirst({
    where: {
      entrepreneurId: seller.id,
      name: 'Handmade Baskets',
      description: 'Eco-friendly woven baskets for daily use.',
      category: 'Handcraft',
      imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518',
    },
    select: { id: true, _count: { select: { orderItems: true } } },
  });

  if (legacyProduct && legacyProduct._count.orderItems === 0) {
    await prisma.product.update({
      where: { id: legacyProduct.id },
      data: { available: false },
    });
  }
};

const ensureOrder = async ({ customer, seller, orderNumber, checkoutGroupId, shippingAddress, paymentMethod, items }) => {
  const existing = await prisma.order.findUnique({ where: { orderNumber } });
  const order = existing
    ? await prisma.order.update({
      where: { id: existing.id },
      data: { checkoutGroupId },
    })
    : await prisma.order.create({
      data: {
        orderNumber,
        checkoutGroupId,
        customerId: customer.id,
        entrepreneurId: seller.entrepreneurProfile.id,
        status: 'PENDING',
        totalAmount: items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
        shippingAddress,
        paymentMethod,
        items: {
          create: items.map(({ product, quantity }) => ({
            productId: product.id,
            quantity,
            unitPrice: product.price,
            totalPrice: product.price * quantity,
          })),
        },
      },
    });

  await prisma.payment.upsert({
    where: { orderId: order.id },
    update: {},
    create: {
      orderId: order.id,
      method: paymentMethod,
      amount: order.totalAmount,
      status: 'PENDING',
      transactionRef: `SIM-${orderNumber}`,
    },
  });

  const delivery = await prisma.delivery.upsert({
    where: { orderId: order.id },
    update: {},
    create: {
      orderId: order.id,
      deliveryAddress: shippingAddress,
      partnerName: 'RuralConnect Logistics',
      estimatedDate: new Date(Date.now() + 5 * 86400000),
      status: 'ORDER_CONFIRMED',
    },
  });
  const trackingEvent = await prisma.trackingEvent.findFirst({
    where: { deliveryId: delivery.id, status: 'ORDER_CONFIRMED' },
  });
  if (!trackingEvent) {
    await prisma.trackingEvent.create({
      data: {
        deliveryId: delivery.id,
        status: 'ORDER_CONFIRMED',
        note: 'Order placed and awaiting fulfillment.',
      },
    });
  }

  return order;
};

const ensureNotification = async (notification) => {
  const existing = await prisma.notification.findFirst({
    where: {
      userId: notification.userId,
      title: notification.title,
      type: notification.type,
      orderId: notification.orderId ?? null,
    },
  });
  if (!existing) await prisma.notification.create({ data: notification });
};

async function main() {
  const entrepreneurPassword = await bcrypt.hash('Demo@123', 10);
  const customerPassword = await bcrypt.hash('Demo@456', 10);
  const entrepreneur = await ensureEntrepreneur({
    fullName: 'Asha Verma',
    email: 'asha@ruralconnect.in',
    phone: '9876543210',
    password: entrepreneurPassword,
    businessName: 'Asha Organic Farms',
    category: 'Agriculture',
    location: 'Nashik, Maharashtra',
  });
  const secondEntrepreneur = await ensureEntrepreneur({
    fullName: 'Meera Joshi',
    email: 'meera@ruralconnect.in',
    phone: '9988776655',
    password: entrepreneurPassword,
    businessName: 'Meera Handmade Crafts',
    category: 'Handcraft',
    location: 'Pune, Maharashtra',
  });
  const customer = await prisma.user.upsert({
    where: { email: 'rohit@ruralconnect.in' },
    update: {},
    create: {
      fullName: 'Rohit Patil',
      email: 'rohit@ruralconnect.in',
      phone: '9123456780',
      password: customerPassword,
      role: 'CUSTOMER',
    },
  });

  const sellerProducts = [
    { name: 'Organic Rice', description: 'Premium aromatic rice from local farms.', price: 120, category: 'Grains', imageUrl: '/product-images/grains.svg', stock: 24 },
    { name: 'Fresh Mangoes', description: 'Sweet Alphonso mangoes harvested this week.', price: 180, category: 'Fruits', imageUrl: '/product-images/fruits.svg', stock: 14 },
    { name: 'Homemade Pickles', description: 'Traditional family recipe with natural ingredients.', price: 95, category: 'Food', imageUrl: '/product-images/food.svg', stock: 18 },
    { name: 'Cotton Bags', description: 'Durable reusable cotton shopping bags.', price: 240, category: 'Lifestyle', imageUrl: '/product-images/cotton-bags.svg', stock: 20 },
  ];
  const products = [];
  for (const product of sellerProducts) {
    products.push(await ensureProduct(entrepreneur, product));
  }
  const craftProduct = await ensureProduct(secondEntrepreneur, {
    name: 'Handmade Baskets',
    description: 'Eco-friendly woven baskets made by local artisans.',
    price: 420,
    category: 'Handcraft',
    imageUrl: '/product-images/handicrafts.svg',
    stock: 9,
  });
  await retireLegacyBasketListing(entrepreneur);

  const checkoutGroupId = 'RC-CHECKOUT-1001';
  const order = await ensureOrder({
    customer,
    seller: entrepreneur,
    orderNumber: 'RC-1001',
    checkoutGroupId,
    shippingAddress: '12 Market Road, Pune',
    paymentMethod: 'COD',
    items: [
      { product: products[0], quantity: 2 },
      { product: products[2], quantity: 1 },
    ],
  });
  const craftOrder = await ensureOrder({
    customer,
    seller: secondEntrepreneur,
    orderNumber: 'RC-1002',
    checkoutGroupId,
    shippingAddress: '12 Market Road, Pune',
    paymentMethod: 'COD',
    items: [{ product: craftProduct, quantity: 1 }],
  });

  await Promise.all([
    ensureNotification({
      userId: entrepreneur.id,
      title: 'New order received',
      message: 'A new order was created from the marketplace.',
      type: 'order',
      orderId: order.id,
    }),
    ensureNotification({
      userId: secondEntrepreneur.id,
      title: 'New order received',
      message: 'A new order was created from the marketplace.',
      type: 'order',
      orderId: craftOrder.id,
    }),
    ensureNotification({
      userId: customer.id,
      title: 'Welcome to RuralConnect',
      message: 'Your account has been created successfully.',
      type: 'welcome',
    }),
    ensureNotification({
      userId: entrepreneur.id,
      title: 'Stock alert',
      message: 'One or more products are running low on inventory.',
      type: 'inventory',
    }),
  ]);

  console.log('Seed completed with two sellers and a shared multi-seller checkout.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
