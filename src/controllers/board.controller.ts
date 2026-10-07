import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { boardMembers, activityLogs, aboutPageSettings } from "../db/schema.js";
import { asc, eq } from "drizzle-orm";
import { pool } from "../db/index.js";

let boardMigrationDone = false;
const ensureBoardMigration = async () => {
  if (boardMigrationDone) return;
  const queries = [
    `ALTER TABLE board_members ADD COLUMN translations JSON NULL`,
    `ALTER TABLE board_members ADD COLUMN show_in_about_page TINYINT(1) DEFAULT 0`,
    `ALTER TABLE board_members ADD COLUMN small_title VARCHAR(255) NULL`,
    `ALTER TABLE board_members ADD COLUMN pill_text_on_image VARCHAR(255) NULL`,
    `ALTER TABLE board_members ADD COLUMN bottom_right_pill_text VARCHAR(255) NULL`,
    `ALTER TABLE board_members ADD COLUMN designation_and_company VARCHAR(255) NULL`,
    `ALTER TABLE board_members ADD COLUMN big_size_quote TEXT NULL`,
    `ALTER TABLE board_members ADD COLUMN small_size_quote TEXT NULL`,
    `ALTER TABLE board_members ADD COLUMN normal_size_quote TEXT NULL`,
  ];
  for (const q of queries) {
    try {
      await pool.query(q);
    } catch (_) {}
  }
  boardMigrationDone = true;
};

const syncChairmanToAboutPage = async (memberData: any) => {
  try {
    const existingAbout = await db.select().from(aboutPageSettings).limit(1);
    const chairmanPayload = {
      name: memberData.name,
      name_on_image: memberData.name,
      image: memberData.image || "",
      small_title: memberData.small_title || "CHAIRMAN'S MESSAGE",
      pill_text_on_image: memberData.pill_text_on_image || memberData.tag || "FOUNDER & CHAIRMAN",
      bottom_right_pill_text: memberData.bottom_right_pill_text || "",
      designation_and_company: memberData.designation_and_company || memberData.designation || "",
      designation_on_image: memberData.designation_and_company || memberData.designation || "",
      big_size_quote: memberData.big_size_quote || "",
      small_size_quote: memberData.small_size_quote || "",
      normal_size_quote: memberData.normal_size_quote || memberData.bio || "",
      show_in_about_page: true,
      member_id: memberData.member_id,
      translations: memberData.translations?.bn
        ? {
            bn: {
              name: memberData.translations.bn.name || memberData.name,
              name_on_image: memberData.translations.bn.name || memberData.name,
              designation_and_company:
                memberData.translations.bn.designation_and_company ||
                memberData.translations.bn.designation ||
                memberData.designation,
              designation_on_image:
                memberData.translations.bn.designation_and_company ||
                memberData.translations.bn.designation ||
                memberData.designation,
              small_title: memberData.translations.bn.small_title || memberData.small_title,
              pill_text_on_image: memberData.translations.bn.pill_text_on_image || memberData.pill_text_on_image,
              bottom_right_pill_text: memberData.translations.bn.bottom_right_pill_text || memberData.bottom_right_pill_text,
              big_size_quote: memberData.translations.bn.big_size_quote || memberData.big_size_quote,
              small_size_quote: memberData.translations.bn.small_size_quote || memberData.small_size_quote,
              normal_size_quote: memberData.translations.bn.normal_size_quote || memberData.normal_size_quote,
            },
          }
        : undefined,
    };

    if (existingAbout.length > 0) {
      await db
        .update(aboutPageSettings)
        .set({
          chairmanMessageSection: chairmanPayload,
        })
        .where(eq(aboutPageSettings.id, existingAbout[0].id));
    } else {
      await db.insert(aboutPageSettings).values({
        chairmanMessageSection: chairmanPayload,
      });
    }
  } catch (err) {
    console.error("Failed to sync chairman to about page:", err);
  }
};

const disableChairmanInAboutPage = async (memberId: number) => {
  try {
    const existingAbout = await db.select().from(aboutPageSettings).limit(1);
    if (existingAbout.length > 0) {
      const current = existingAbout[0].chairmanMessageSection || {};
      if (current.member_id === memberId || !current.member_id) {
        await db
          .update(aboutPageSettings)
          .set({
            chairmanMessageSection: {
              ...current,
              show_in_about_page: false,
            },
          })
          .where(eq(aboutPageSettings.id, existingAbout[0].id));
      }
    }
  } catch (err) {
    console.error("Failed to disable chairman in about page:", err);
  }
};

export const getBoardMembers = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureBoardMigration();
    const list = await db
      .select({
        id: boardMembers.id,
        name: boardMembers.name,
        designation: boardMembers.designation,
        tag: boardMembers.tag,
        image: boardMembers.image,
        bio: boardMembers.bio,
        display_in_website: boardMembers.displayInWebsite,
        show_in_about_page: boardMembers.showInAboutPage,
        small_title: boardMembers.smallTitle,
        pill_text_on_image: boardMembers.pillTextOnImage,
        bottom_right_pill_text: boardMembers.bottomRightPillText,
        designation_and_company: boardMembers.designationAndCompany,
        big_size_quote: boardMembers.bigSizeQuote,
        small_size_quote: boardMembers.smallSizeQuote,
        normal_size_quote: boardMembers.normalSizeQuote,
        order_index: boardMembers.orderIndex,
        translations: boardMembers.translations,
        created_at: boardMembers.createdAt,
        updated_at: boardMembers.updatedAt,
      })
      .from(boardMembers)
      .orderBy(asc(boardMembers.orderIndex), asc(boardMembers.id));

    res.json({
      status: "success",
      message: "Board members retrieved successfully.",
      data: list,
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch board members", error: error.message });
  }
};

export const createBoardMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureBoardMigration();
    const {
      name,
      designation,
      tag,
      image,
      bio,
      display_in_website,
      show_in_about_page,
      small_title,
      pill_text_on_image,
      bottom_right_pill_text,
      designation_and_company,
      big_size_quote,
      small_size_quote,
      normal_size_quote,
      order_index,
      translations,
    } = req.body;

    if (!name || !designation) {
      res.status(400).json({ status: "error", message: "Name and designation are required." });
      return;
    }

    const isShowInAbout = Boolean(show_in_about_page);

    // If marked as chairman in about page, ensure others are set to false
    // Multiple board members can be featured on the About page in order of order_index

    const [insertResult] = await db.insert(boardMembers).values({
      name,
      designation,
      tag: tag || null,
      image: image || null,
      bio: bio || null,
      displayInWebsite: display_in_website !== undefined ? Boolean(display_in_website) : true,
      showInAboutPage: isShowInAbout,
      smallTitle: small_title || null,
      pillTextOnImage: pill_text_on_image || null,
      bottomRightPillText: bottom_right_pill_text || null,
      designationAndCompany: designation_and_company || null,
      bigSizeQuote: big_size_quote || null,
      smallSizeQuote: small_size_quote || null,
      normalSizeQuote: normal_size_quote || null,
      orderIndex: Number(order_index) || 0,
      translations: translations || null,
    });

    const newId = (insertResult as any)?.insertId;

    if (isShowInAbout) {
      await syncChairmanToAboutPage({
        name,
        image,
        tag,
        designation,
        small_title,
        pill_text_on_image,
        bottom_right_pill_text,
        designation_and_company,
        big_size_quote,
        small_size_quote,
        normal_size_quote,
        translations,
        member_id: newId,
      });
    }

    try {
      await db.insert(activityLogs).values({
        userId: req.user?.id || 1,
        userName: req.user?.name || "Admin",
        action: `Added Board Member: ${name}`,
        details: `Designation: ${designation}${isShowInAbout ? " (Featured on About Page)" : ""}`,
        ipAddress: req.ip || "127.0.0.1",
      });
    } catch (_) {}

    res.status(201).json({ status: "success", message: "Board member created successfully." });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to create board member", error: error.message });
  }
};

export const updateBoardMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureBoardMigration();
    const { id } = req.params;
    const {
      name,
      designation,
      tag,
      image,
      bio,
      display_in_website,
      show_in_about_page,
      small_title,
      pill_text_on_image,
      bottom_right_pill_text,
      designation_and_company,
      big_size_quote,
      small_size_quote,
      normal_size_quote,
      order_index,
      translations,
    } = req.body;

    const isShowInAbout = show_in_about_page !== undefined ? Boolean(show_in_about_page) : undefined;

    // Multiple board members can be featured on the About page in order of order_index

    await db
      .update(boardMembers)
      .set({
        name: name !== undefined ? name : undefined,
        designation: designation !== undefined ? designation : undefined,
        tag: tag !== undefined ? tag : undefined,
        image: image !== undefined ? image : undefined,
        bio: bio !== undefined ? bio : undefined,
        displayInWebsite: display_in_website !== undefined ? Boolean(display_in_website) : undefined,
        showInAboutPage: isShowInAbout !== undefined ? isShowInAbout : undefined,
        smallTitle: small_title !== undefined ? small_title : undefined,
        pillTextOnImage: pill_text_on_image !== undefined ? pill_text_on_image : undefined,
        bottomRightPillText: bottom_right_pill_text !== undefined ? bottom_right_pill_text : undefined,
        designationAndCompany: designation_and_company !== undefined ? designation_and_company : undefined,
        bigSizeQuote: big_size_quote !== undefined ? big_size_quote : undefined,
        smallSizeQuote: small_size_quote !== undefined ? small_size_quote : undefined,
        normalSizeQuote: normal_size_quote !== undefined ? normal_size_quote : undefined,
        orderIndex: order_index !== undefined ? Number(order_index) : undefined,
        translations: translations !== undefined ? translations : undefined,
      })
      .where(eq(boardMembers.id, Number(id)));

    // Sync to about_page_settings
    const isChairman = Number(id) === 1 || (designation && String(designation).toLowerCase().includes('chairman'));
    if (isChairman && isShowInAbout === true) {
      await syncChairmanToAboutPage({
        name,
        image,
        tag,
        designation,
        small_title,
        pill_text_on_image,
        bottom_right_pill_text,
        designation_and_company,
        big_size_quote,
        small_size_quote,
        normal_size_quote,
        translations,
        member_id: Number(id),
      });
    } else if (isChairman && isShowInAbout === false) {
      await disableChairmanInAboutPage(Number(id));
    }

    res.json({ status: "success", message: "Board member updated successfully." });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to update board member", error: error.message });
  }
};

export const deleteBoardMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (Number(id) === 1) { await disableChairmanInAboutPage(Number(id)); }
    await db.delete(boardMembers).where(eq(boardMembers.id, Number(id)));
    res.json({ status: "success", message: "Board member deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to delete board member", error: error.message });
  }
};
