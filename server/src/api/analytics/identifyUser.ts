import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { trackedUserProfiles, sites } from "../../db/postgres/schema.js";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const identifyUserSchema = z.object({
  site_id: z.union([z.string(), z.number()]).transform((val) => Number(val)),
  user_id: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  traits: z.record(z.unknown()).optional(),
});

export interface IdentifyUserRequest {
  Body: z.infer<typeof identifyUserSchema>;
}

/**
 * Endpoint to store/update user profile information (email, phone, name)
 * This is called when a user is identified in the tracking script
 * POST /api/identify
 */
export async function identifyUser(
  req: FastifyRequest<IdentifyUserRequest>,
  res: FastifyReply
) {
  try {
    const parsed = identifyUserSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).send({
        success: false,
        error: "Invalid payload",
        details: parsed.error.flatten(),
      });
    }

    const { site_id, user_id, email, phone, name, traits } = parsed.data;

    // Verify site exists
    const [site] = await db
      .select()
      .from(sites)
      .where(eq(sites.siteId, site_id))
      .limit(1);

    if (!site) {
      return res.status(404).send({
        success: false,
        error: "Site not found",
      });
    }

    // Upsert user profile
    const existingProfile = await db
      .select()
      .from(trackedUserProfiles)
      .where(
        and(
          eq(trackedUserProfiles.siteId, site_id),
          eq(trackedUserProfiles.userId, user_id)
        )
      )
      .limit(1);

    if (existingProfile.length > 0) {
      // Update existing profile
      await db
        .update(trackedUserProfiles)
        .set({
          email: email ?? existingProfile[0].email,
          phone: phone ?? existingProfile[0].phone,
          name: name ?? existingProfile[0].name,
          traits: traits ? { ...((existingProfile[0].traits as Record<string, unknown>) || {}), ...traits } : existingProfile[0].traits,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(trackedUserProfiles.siteId, site_id),
            eq(trackedUserProfiles.userId, user_id)
          )
        );
    } else {
      // Insert new profile
      await db.insert(trackedUserProfiles).values({
        siteId: site_id,
        userId: user_id,
        email: email ?? null,
        phone: phone ?? null,
        name: name ?? null,
        traits: traits ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return res.status(200).send({
      success: true,
      message: "User profile updated",
    });
  } catch (error) {
    console.error("Error identifying user:", error);
    return res.status(500).send({
      success: false,
      error: "Failed to identify user",
    });
  }
}
