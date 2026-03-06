import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { prisma } from "../../prisma/client";
import { upload, uploadToCloudinary } from "../../utils/cloudinary";
import { z } from "zod";
import { validateBody } from "../../middleware/validate";

const router = Router();

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional()
});

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     responses:
 *       200:
 *         description: User profile with name, email, role, profileImage
 *       401:
 *         description: Unauthorized
 */
router.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      profileImage: true,
      createdAt: true
    }
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({
    ...user,
    name: `${user.firstName} ${user.lastName}`.trim()
  });
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User profile
 *       404:
 *         description: User not found
 */
router.get("/:id", authenticate, async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      profileImage: true,
      createdAt: true
    }
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({
    ...user,
    name: `${user.firstName} ${user.lastName}`.trim()
  });
});

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Update profile
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated profile
 */
router.put(
  "/profile",
  authenticate,
  validateBody(updateProfileSchema),
  async (req, res) => {
    const { firstName, lastName } = req.body as {
      firstName?: string;
      lastName?: string;
    };

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {})
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        profileImage: true,
        createdAt: true
      }
    });

    res.json({
      ...user,
      name: `${user.firstName} ${user.lastName}`.trim()
    });
  }
);

/**
 * @swagger
 * /api/users/profile-picture:
 *   post:
 *     tags: [Users]
 *     summary: Upload profile picture (Cloudinary)
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Profile picture uploaded
 *       400:
 *         description: No file uploaded
 */
router.post(
  "/profile-picture",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await uploadToCloudinary(req.file.buffer, "iga/profile-pictures", "image");

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { profileImage: result.url },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        profileImage: true,
        createdAt: true
      }
    });

    res.status(201).json({
      profileImage: result.url,
      user: {
        ...user,
        name: `${user.firstName} ${user.lastName}`.trim()
      }
    });
  }
);

export default router;

