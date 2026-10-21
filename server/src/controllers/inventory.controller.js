import prisma from '../config/db.js';

export const getInventory = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { entrepreneurId: req.user.id },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ products });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to fetch inventory.' });
  }
};

export const updateInventory = async (req, res) => {
  try {
    const { productId, quantity, reason } = req.body;
    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    if (product.entrepreneurId !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own inventory.' });
    }

    const nextStock = product.stock + Number(quantity);
    if (nextStock < 0) {
      return res.status(400).json({ message: 'Inventory cannot go negative.' });
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const result = await tx.product.update({
        where: { id: productId },
        data: {
          stock: nextStock,
          available: nextStock > 0,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          productId,
          change: Number(quantity),
          reason: reason || 'Manual inventory adjustment',
        },
      });

      return result;
    });

    return res.json({ product: updatedProduct, message: 'Inventory updated successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to update inventory.' });
  }
};
