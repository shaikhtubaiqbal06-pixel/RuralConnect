import test from 'node:test';
import assert from 'node:assert/strict';
import { CheckoutError, createCheckoutOrders } from './orders.service.js';

const makeDatabase = (products, { failReservation = false } = {}) => {
  const state = {
    products: structuredClone(products),
    orders: [],
    payments: [],
    deliveries: [],
    movements: [],
  };

  const prisma = {
    async $transaction(callback) {
      const working = structuredClone(state);
      const productById = (id) => working.products.find((product) => product.id === id);
      const tx = {
        product: {
          async findMany({ where }) {
            return working.products.filter((product) => where.id.in.includes(product.id));
          },
          async updateMany({ where, data }) {
            const product = productById(where.id);
            if (!product) return { count: 0 };
            if (data.stock?.decrement !== undefined) {
              if (
                failReservation ||
                !product.available ||
                product.stock < where.stock.gte
              ) {
                return { count: 0 };
              }
              product.stock -= data.stock.decrement;
              return { count: 1 };
            }
            if (where.stock === 0 && product.stock === 0) {
              product.available = data.available;
              return { count: 1 };
            }
            if (where.stock !== undefined) {
              return { count: 0 };
            }
            return { count: 0 };
          },
          async update({ where, data }) {
            const product = productById(where.id);
            if (data.available !== undefined) product.available = data.available;
            if (data.stock?.increment) product.stock += data.stock.increment;
            return product;
          },
        },
        order: {
          async create({ data }) {
            const { items, ...fields } = data;
            const order = {
              id: `order-${working.orders.length + 1}`,
              ...fields,
              items: items.create,
            };
            working.orders.push(order);
            return order;
          },
          async findUnique() {
            return null;
          },
          async update() {
            throw new Error('Not needed by checkout tests.');
          },
        },
        payment: {
          async create({ data }) {
            const payment = { id: `payment-${working.payments.length + 1}`, ...data };
            working.payments.push(payment);
            return payment;
          },
        },
        delivery: {
          async create({ data }) {
            const delivery = { id: `delivery-${working.deliveries.length + 1}`, ...data };
            working.deliveries.push(delivery);
            return delivery;
          },
        },
        inventoryMovement: {
          async create({ data }) {
            working.movements.push(data);
          },
        },
      };

      const result = await callback(tx);
      Object.assign(state, working);
      return result;
    },
  };
  return { prisma, state };
};

const fixtureProducts = [
  {
    id: 'rice',
    name: 'Rice',
    price: 12,
    stock: 5,
    available: true,
    entrepreneur: { entrepreneurProfile: { id: 'seller-a' } },
  },
  {
    id: 'pickle',
    name: 'Pickles',
    price: 7,
    stock: 4,
    available: true,
    entrepreneur: { entrepreneurProfile: { id: 'seller-a' } },
  },
  {
    id: 'basket',
    name: 'Basket',
    price: 25,
    stock: 3,
    available: true,
    entrepreneur: { entrepreneurProfile: { id: 'seller-b' } },
  },
];

const request = {
  customerId: 'customer-1',
  items: [
    { productId: 'rice', quantity: 1 },
    { productId: 'rice', quantity: 2 },
    { productId: 'basket', quantity: 1 },
  ],
  shippingAddress: '12 Market Road',
  paymentMethod: 'COD',
};

test('groups a multi-seller checkout into seller-owned orders sharing one checkout reference', async () => {
  const { prisma, state } = makeDatabase(fixtureProducts);

  const checkout = await createCheckoutOrders(prisma, request);

  assert.equal(checkout.orders.length, 2);
  assert.equal(new Set(checkout.orders.map((order) => order.checkoutGroupId)).size, 1);
  assert.equal(checkout.orders[0].checkoutGroupId, checkout.checkoutGroupId);
  assert.deepEqual(
    checkout.orders.map(({ entrepreneurId, totalAmount }) => ({ entrepreneurId, totalAmount })),
    [
      { entrepreneurId: 'seller-a', totalAmount: 36 },
      { entrepreneurId: 'seller-b', totalAmount: 25 },
    ],
  );
  assert.deepEqual(state.products.map(({ id, stock }) => [id, stock]), [
    ['rice', 2],
    ['pickle', 4],
    ['basket', 2],
  ]);
  assert.ok(checkout.orders.every((order) => order.payment.status === 'PENDING'));
  assert.ok(state.orders.every((order) =>
    order.items.every((item) =>
      fixtureProducts.find((product) => product.id === item.productId)
        .entrepreneur.entrepreneurProfile.id === order.entrepreneurId,
    ),
  ));
});

test('marks simulated UPI payments successful for each seller order', async () => {
  const { prisma } = makeDatabase(fixtureProducts);
  const checkout = await createCheckoutOrders(prisma, {
    ...request,
    items: [{ productId: 'rice', quantity: 1 }, { productId: 'basket', quantity: 1 }],
    paymentMethod: 'UPI',
  });

  assert.equal(checkout.orders.length, 2);
  assert.ok(checkout.orders.every((order) => order.payment.status === 'SUCCESSFUL'));
});

test('marks a product unavailable atomically when the checkout reserves its last unit', async () => {
  const lastUnitProduct = {
    ...fixtureProducts[0],
    stock: 1,
  };
  const { prisma, state } = makeDatabase([lastUnitProduct]);

  await createCheckoutOrders(prisma, {
    ...request,
    items: [{ productId: lastUnitProduct.id, quantity: 1 }],
  });

  assert.equal(state.products[0].stock, 0);
  assert.equal(state.products[0].available, false);
});

test('rolls back every seller order and stock reservation when simulated payment fails', async () => {
  const { prisma, state } = makeDatabase(fixtureProducts);
  let attempts = 0;

  await assert.rejects(
    createCheckoutOrders(
      prisma,
      request,
      async () => {
        attempts += 1;
        if (attempts === 2) throw new Error('Simulated provider failure');
        return { status: 'PENDING' };
      },
    ),
    (error) => error instanceof CheckoutError && error.statusCode === 402 && error.paymentStatus === 'FAILED',
  );

  assert.deepEqual(state.products.map(({ id, stock }) => [id, stock]), [
    ['rice', 5],
    ['pickle', 4],
    ['basket', 3],
  ]);
  assert.equal(state.orders.length, 0);
  assert.equal(state.payments.length, 0);
  assert.equal(state.deliveries.length, 0);
  assert.equal(state.movements.length, 0);
});

test('rolls back all reservations when a conditional stock reservation loses a race', async () => {
  const { prisma, state } = makeDatabase(fixtureProducts, { failReservation: true });

  await assert.rejects(
    createCheckoutOrders(prisma, request),
    (error) => error instanceof CheckoutError && error.statusCode === 409,
  );

  assert.deepEqual(state.products.map(({ id, stock }) => [id, stock]), [
    ['rice', 5],
    ['pickle', 4],
    ['basket', 3],
  ]);
  assert.equal(state.orders.length, 0);
});

test('rejects invalid quantities before opening the checkout transaction', async () => {
  let transactionStarted = false;
  const prisma = {
    async $transaction() {
      transactionStarted = true;
    },
  };

  await assert.rejects(
    createCheckoutOrders(prisma, {
      ...request,
      items: [{ productId: 'rice', quantity: 0 }],
    }),
    (error) => error instanceof CheckoutError && error.statusCode === 400,
  );
  assert.equal(transactionStarted, false);
});
