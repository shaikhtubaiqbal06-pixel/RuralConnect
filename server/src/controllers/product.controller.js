import prisma from '../config/db.js';

export const getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { available: true },
      include: {
        entrepreneur: {
          select: {
            fullName: true,
            entrepreneurProfile: {
              select: { businessName: true, category: true, location: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      products: products.map((product) => ({
        ...product,
        price: Number(product.price),
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to fetch products.' });
  }
};

export const getMyProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { entrepreneurId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({
      products: products.map((product) => ({
        ...product,
        price: Number(product.price),
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to fetch your products.' });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        entrepreneur: {
          select: {
            fullName: true,
            entrepreneurProfile: {
              select: { businessName: true, category: true, location: true },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    return res.json({ product: { ...product, price: Number(product.price) } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to fetch product.' });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, stock, available } = req.body;

    if (!name || !description || !price || !category) {
      return res.status(400).json({ message: 'Name, description, price, and category are required.' });
    }

    if (Number(price) <= 0) {
      return res.status(400).json({ message: 'Price must be greater than zero.' });
    }

    if (Number(stock) < 0) {
      return res.status(400).json({ message: 'Stock cannot be negative.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { entrepreneurProfile: true } });
    if (!user || user.role !== 'ENTREPRENEUR') {
      return res.status(403).json({ message: 'Only entrepreneurs can create products.' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: Number(price),
        category,
        imageUrl: imageUrl || '/product-images/product-placeholder.svg',
        stock: Number(stock || 0),
        available: available !== false,
        entrepreneurId: user.id,
        profileId: user.entrepreneurProfile?.id,
      },
      include: {
        entrepreneur: {
          select: {
            fullName: true,
            entrepreneurProfile: {
              select: { businessName: true, category: true, location: true },
            },
          },
        },
      },
    });

    return res.status(201).json({ product: { ...product, price: Number(product.price) } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to create product.' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    if (product.entrepreneurId !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own products.' });
    }

    const { name, description, price, category, imageUrl, stock, available } = req.body;
    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(category && { category }),
        ...(imageUrl && { imageUrl }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(available !== undefined && { available }),
      },
      include: {
        entrepreneur: {
          select: {
            fullName: true,
            entrepreneurProfile: {
              select: { businessName: true, category: true, location: true },
            },
          },
        },
      },
    });

    return res.json({ product: { ...updatedProduct, price: Number(updatedProduct.price) } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to update product.' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    if (product.entrepreneurId !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own products.' });
    }

    await prisma.product.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to delete product.' });
  }
};
