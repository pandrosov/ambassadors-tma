import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireRole } from '../middleware/adminAuth';
import { z } from 'zod';
import { createAuditLog } from '../lib/auditLog';

const router = Router();

// Схемы валидации
const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isActive: z.boolean().optional().default(true),
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

/**
 * Получить все товары
 * GET /api/products
 */
router.get('/', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            reportProducts: true,
          },
        },
      },
    });

    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

/**
 * Создать товар
 * POST /api/products
 */
router.post('/', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const data = createProductSchema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        isActive: data.isActive ?? true,
      },
    });

    // Логируем действие
    await createAuditLog({
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: product.id,
      userId,
      details: {
        name: product.name,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

/**
 * Обновить товар
 * PATCH /api/products/:id
 */
router.patch('/:id', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const data = updateProductSchema.parse(req.body);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    // Логируем действие
    await createAuditLog({
      action: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: id,
      userId,
      details: updateData,
    });

    res.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * Удалить товар
 * DELETE /api/products/:id
 */
router.delete('/:id', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Проверяем, используется ли товар в отчетах
    const usageCount = await prisma.reportProduct.count({
      where: { productId: id },
    });

    if (usageCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete product',
        message: `Товар используется в ${usageCount} отчетах. Сначала удалите связь с отчетами.`,
      });
    }

    await prisma.product.delete({
      where: { id },
    });

    // Логируем действие
    await createAuditLog({
      action: 'PRODUCT_DELETED',
      entityType: 'Product',
      entityId: id,
      userId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;

