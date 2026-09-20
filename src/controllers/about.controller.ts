import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { aboutPageSettings, activityLogs } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const getAboutPage = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await db.select().from(aboutPageSettings).limit(1);

    if (settings.length > 0) {
      const s = settings[0];
      res.json({
        status: "success",
        message: "About page settings retrieved successfully.",
        data: {
          id: s.id,
          discover_section: s.discoverSection,
          chairman_message_section: s.chairmanMessageSection,
          board_of_directors_section: s.boardOfDirectorsSection,
          our_story_section: s.ourStorySection,
          direction_purpose_section: s.directionPurposeSection,
          strategic_pillars_section: s.strategicPillarsSection,
          people_values_section: s.peopleValuesSection,
          efficiency_certificates_section: s.efficiencyCertificatesSection,
          factory_section: s.factorySection,
          carbon_free_future_section: s.carbonFreeFutureSection,
          updated_at: s.updatedAt,
        },
      });
      return;
    }

    res.status(404).json({ status: "error", message: "About page settings not found." });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch about page settings", error: error.message });
  }
};

export const updateAboutPage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      discover_section,
      chairman_message_section,
      board_of_directors_section,
      our_story_section,
      direction_purpose_section,
      strategic_pillars_section,
      people_values_section,
      efficiency_certificates_section,
      factory_section,
      carbon_free_future_section,
    } = req.body;

    const existing = await db.select().from(aboutPageSettings).limit(1);

    if (existing.length > 0) {
      await db
        .update(aboutPageSettings)
        .set({
          discoverSection: discover_section ?? existing[0].discoverSection,
          chairmanMessageSection: chairman_message_section ?? existing[0].chairmanMessageSection,
          boardOfDirectorsSection: board_of_directors_section ?? existing[0].boardOfDirectorsSection,
          ourStorySection: our_story_section ?? existing[0].ourStorySection,
          directionPurposeSection: direction_purpose_section ?? existing[0].directionPurposeSection,
          strategicPillarsSection: strategic_pillars_section ?? existing[0].strategicPillarsSection,
          peopleValuesSection: people_values_section ?? existing[0].peopleValuesSection,
          efficiencyCertificatesSection: efficiency_certificates_section ?? existing[0].efficiencyCertificatesSection,
          factorySection: factory_section ?? existing[0].factorySection,
          carbonFreeFutureSection: carbon_free_future_section ?? existing[0].carbonFreeFutureSection,
        })
        .where(eq(aboutPageSettings.id, existing[0].id));
    } else {
      await db.insert(aboutPageSettings).values({
        discoverSection: discover_section,
        chairmanMessageSection: chairman_message_section,
        boardOfDirectorsSection: board_of_directors_section,
        ourStorySection: our_story_section,
        directionPurposeSection: direction_purpose_section,
        strategicPillarsSection: strategic_pillars_section,
        peopleValuesSection: people_values_section,
        efficiencyCertificatesSection: efficiency_certificates_section,
        factorySection: factory_section,
        carbonFreeFutureSection: carbon_free_future_section,
      });
    }

    try {
      await db.insert(activityLogs).values({
        userId: req.user?.id || 1,
        userName: req.user?.name || "Admin",
        action: "Updated About Page Settings",
        details: "Modified About Page sections from Admin Panel",
        ipAddress: req.ip || "127.0.0.1",
      });
    } catch (_) {}

    res.json({
      status: "success",
      message: "About page settings updated successfully.",
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to update about page settings", error: error.message });
  }
};
