import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { prisma } from "../../prisma/client";
import { upload, uploadToCloudinary } from "../../utils/cloudinary";
import { z } from "zod";
import { validateBody } from "../../middleware/validate";
import { Role } from "@prisma/client";

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
 * /api/users/list:
 *   get:
 *     tags: [Users]
 *     summary: List users available for direct messages.
 *     description: |
 *       - TEACHER: can see all active users (students, teachers, admins) except themselves.
 *       - ADMIN: can see all active teachers and students (no other admins).
 *       - STUDENT: can see classmates (students sharing at least one course) and teachers of their courses.
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of users (id, name, email, role). Excludes current user.
 */
router.get("/list", authenticate, async (req, res) => {
  const search = (req.query.search as string)?.trim() || "";
  const currentId = req.user!.id;
  const currentRole = req.user!.role as Role;

  const searchFilter = search
    ? {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } }
        ]
      }
    : {};

  let whereClause: any = {
    id: { not: currentId },
    isActive: true,
    ...searchFilter
  };

  if (currentRole === Role.TEACHER) {
    // Teachers can see everyone (students, teachers, admins)
  } else if (currentRole === Role.ADMIN) {
    // Admins can see teachers and students, but not other admins
    whereClause = {
      ...whereClause,
      role: { in: [Role.TEACHER, Role.STUDENT] }
    };
  } else if (currentRole === Role.STUDENT) {
    // Students can only DM classmates and teachers of their courses
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: currentId },
      select: { courseId: true }
    });
    const courseIds = enrollments.map((e) => e.courseId);

    if (courseIds.length === 0) {
      return res.json([]);
    }

    whereClause = {
      id: { not: currentId },
      isActive: true,
      ...searchFilter,
      OR: [
        {
          role: Role.TEACHER,
          courses: {
            some: {
              id: { in: courseIds }
            }
          }
        },
        {
          role: Role.STUDENT,
          enrollments: {
            some: {
              courseId: { in: courseIds }
            }
          }
        }
      ]
    };
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
  });

  res.json(
    users.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
      role: u.role
    }))
  );
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

