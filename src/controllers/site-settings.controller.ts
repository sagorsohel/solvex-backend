import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { db, pool } from "../db/index.js";
import { siteSettings, activityLogs } from "../db/schema.js";
import { eq } from "drizzle-orm";

let siteSettingsTableInitialized = false;

export const defaultSiteSettingsData = {
  contactPhone: "+1 (952) 435-7106",
  contactEmail: "info@solvexglobal.com",
  supportEmail: "help@solvexglobal.com",
  address: "12 Division Park, SKY 12546, Berlin",
  workingHours: "Mon - Fri 8:00 - 18:00 / Sun 8:00 - 14:00",
  socialLinks: {
    facebook: "https://facebook.com/solvexglobal",
    twitter: "https://twitter.com/solvexglobal",
    instagram: "https://instagram.com/solvexglobal",
    youtube: "https://youtube.com/@solvexglobal",
    linkedin: "https://linkedin.com/company/solvexglobal",
    whatsapp: "https://wa.me/19524357106",
  },
  headerSettings: {
    topbarVisible: true,
    workingHours: "Mon - Fri 8:00 - 18:00 / Sun 8:00 - 14:00",
    address: "12 Division Park, SKY 12546, Berlin",
    email: "help@solvexglobal.com",
    phone: "+1 (952) 435-7106",
    followUsLabel: "Follow Us On:",
  },
  footerSettings: {
    aboutTitle: "Solvex Global Ltd",
    aboutDescription:
      "Solar and wind energy are renewable and inexhaustible, making them sustainable solutions for meeting clean energy demands, usage design, and zero-emission grid integration for your property.",
    logo: "/logo.png",
    usefulLinksTitle: "Useful Links",
    usefulLinks: [
      { title: "About Us", url: "/about" },
      { title: "Services", url: "/#solutions" },
      { title: "Projects", url: "/projects" },
      { title: "ROI Calculator", url: "/#calculator" },
      { title: "Contact Us", url: "/contact" },
    ],
    servicesTitle: "Our Services",
    servicesLinks: [
      { title: "Renewable Energy", url: "/solutions/solar-panel" },
      { title: "Wind Generator Setup", url: "/solutions/wind-turbine" },
      { title: "Solar Grid Install", url: "/solutions/inverter-install" },
      { title: "Battery Systems", url: "/solutions/battery-storage" },
      { title: "Eco Maintenance", url: "/solutions/solar-repair" },
    ],
    contactTitle: "Contact Info",
    copyrightText: "© 2026 Solvex Global Ltd. All Rights Reserved.",
    galleryTitle: "Project Gallery",
    galleryImages: [
      { image: "/project_bay_area.png", alt: "Solar project" },
      { image: "/project_wind_farm.png", alt: "Wind project" },
      { image: "/about_engineers.png", alt: "Solar panel project" },
    ],
    bottomLinks: [
      { title: "Privacy Policy", url: "#" },
      { title: "Terms of Service", url: "#" },
      { title: "Security & ESG Compliance", url: "#" },
    ],
  },
  translations: {
    bn: {
      address: "১২ ডিভিশন পার্ক, স্কাই ১২৫৪৬, বার্লিন",
      workingHours: "সোম - শুক্র ৮:০০ - ১৮:০০ / রবি ৮:০০ - ১৪:০০",
      aboutDescription:
        "সৌর এবং বায়ু শক্তি পুনর্নবীকরণযোগ্য এবং অফুরন্ত, যা আপনার সম্পত্তির জন্য পরিচ্ছন্ন জ্বালানির চাহিদা মেটানো এবং টেকসই সমাধান প্রদানে কার্যকর।",
      followUsLabel: "আমাদের ফলো করুন:",
      usefulLinksTitle: "প্রয়োজনীয় লিংক",
      servicesTitle: "আমাদের সেবা সমূহ",
      contactTitle: "যোগাযোগের ঠিকানা",
      galleryTitle: "প্রকল্প গ্যালারি",
      copyrightText: "© ২০২৬ Solvex Global Ltd. সর্বস্বত্ব সংরক্ষিত।",
      usefulLinks: [
        { title: "আমাদের সম্পর্কে", url: "/about" },
        { title: "সার্ভিস সমূহ", url: "/#solutions" },
        { title: "প্রকল্প সমূহ", url: "/projects" },
        { title: "আরওআই ক্যালকুলেটর", url: "/#calculator" },
        { title: "যোগাযোগ", url: "/contact" },
      ],
      servicesLinks: [
        { title: "রিনিউয়েবল এনার্জি", url: "/solutions/solar-panel" },
        { title: "উইন্ড জেনারেটর সেটআপ", url: "/solutions/wind-turbine" },
        { title: "সোলার গ্রিড ইন্সটল", url: "/solutions/inverter-install" },
        { title: "ব্যাটারি সিস্টেম", url: "/solutions/battery-storage" },
        { title: "ইকো মেইনটেন্যান্স", url: "/solutions/solar-repair" },
      ],
    },
  },
};

export const ensureSiteSettingsTable = async () => {
  if (siteSettingsTableInitialized) return;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contact_phone VARCHAR(100) DEFAULT '+1 (952) 435-7106',
        contact_email VARCHAR(150) DEFAULT 'info@solvexglobal.com',
        support_email VARCHAR(150) DEFAULT 'help@solvexglobal.com',
        address VARCHAR(255) DEFAULT '12 Division Park, SKY 12546, Berlin',
        working_hours VARCHAR(255) DEFAULT 'Mon - Fri 8:00 - 18:00 / Sun 8:00 - 14:00',
        social_links JSON,
        header_settings JSON,
        footer_settings JSON,
        translations JSON,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check if initial row exists
    const [rows]: any = await pool.query("SELECT COUNT(*) as count FROM site_settings");
    if (rows[0]?.count === 0) {
      await db.insert(siteSettings).values({
        contactPhone: defaultSiteSettingsData.contactPhone,
        contactEmail: defaultSiteSettingsData.contactEmail,
        supportEmail: defaultSiteSettingsData.supportEmail,
        address: defaultSiteSettingsData.address,
        workingHours: defaultSiteSettingsData.workingHours,
        socialLinks: defaultSiteSettingsData.socialLinks,
        headerSettings: defaultSiteSettingsData.headerSettings,
        footerSettings: defaultSiteSettingsData.footerSettings,
        translations: defaultSiteSettingsData.translations,
      });
      console.log("✅ site_settings table seeded with initial settings.");
    }

    siteSettingsTableInitialized = true;
  } catch (error: any) {
    console.error("❌ Failed to ensure site_settings table:", error);
  }
};

export const getSiteSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureSiteSettingsTable();

    const results = await db.select().from(siteSettings).limit(1);

    if (results.length > 0) {
      const s = results[0];
      res.json({
        success: true,
        data: {
          id: s.id,
          contactPhone: s.contactPhone,
          contactEmail: s.contactEmail,
          supportEmail: s.supportEmail,
          address: s.address,
          workingHours: s.workingHours,
          socialLinks: s.socialLinks || defaultSiteSettingsData.socialLinks,
          headerSettings: s.headerSettings || defaultSiteSettingsData.headerSettings,
          footerSettings: s.footerSettings || defaultSiteSettingsData.footerSettings,
          translations: s.translations || defaultSiteSettingsData.translations,
          updatedAt: s.updatedAt,
        },
      });
      return;
    }

    // Fallback default response
    res.json({
      success: true,
      data: {
        id: 1,
        ...defaultSiteSettingsData,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("getSiteSettings Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch site settings", error: error.message });
  }
};

export const updateSiteSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureSiteSettingsTable();

    const {
      contactPhone,
      contactEmail,
      supportEmail,
      address,
      workingHours,
      socialLinks,
      headerSettings,
      footerSettings,
      translations,
    } = req.body;

    const existing = await db.select().from(siteSettings).limit(1);

    if (existing.length > 0) {
      await db
        .update(siteSettings)
        .set({
          contactPhone: contactPhone !== undefined ? contactPhone : existing[0].contactPhone,
          contactEmail: contactEmail !== undefined ? contactEmail : existing[0].contactEmail,
          supportEmail: supportEmail !== undefined ? supportEmail : existing[0].supportEmail,
          address: address !== undefined ? address : existing[0].address,
          workingHours: workingHours !== undefined ? workingHours : existing[0].workingHours,
          socialLinks: socialLinks !== undefined ? socialLinks : existing[0].socialLinks,
          headerSettings: headerSettings !== undefined ? headerSettings : existing[0].headerSettings,
          footerSettings: footerSettings !== undefined ? footerSettings : existing[0].footerSettings,
          translations: translations !== undefined ? translations : existing[0].translations,
        })
        .where(eq(siteSettings.id, existing[0].id));
    } else {
      await db.insert(siteSettings).values({
        contactPhone: contactPhone ?? defaultSiteSettingsData.contactPhone,
        contactEmail: contactEmail ?? defaultSiteSettingsData.contactEmail,
        supportEmail: supportEmail ?? defaultSiteSettingsData.supportEmail,
        address: address ?? defaultSiteSettingsData.address,
        workingHours: workingHours ?? defaultSiteSettingsData.workingHours,
        socialLinks: socialLinks ?? defaultSiteSettingsData.socialLinks,
        headerSettings: headerSettings ?? defaultSiteSettingsData.headerSettings,
        footerSettings: footerSettings ?? defaultSiteSettingsData.footerSettings,
        translations: translations ?? defaultSiteSettingsData.translations,
      });
    }

    // Log admin activity
    try {
      await db.insert(activityLogs).values({
        userId: req.user?.id || 1,
        userName: req.user?.name || "Admin",
        action: "Updated Site Settings",
        details: `Updated header, footer & contact settings`,
        ipAddress: req.ip || "127.0.0.1",
      });
    } catch {
      // ignore logging error
    }

    const updated = await db.select().from(siteSettings).limit(1);

    res.json({
      success: true,
      message: "Site settings updated successfully",
      data: updated[0],
    });
  } catch (error: any) {
    console.error("updateSiteSettings Error:", error);
    res.status(500).json({ success: false, message: "Failed to update site settings", error: error.message });
  }
};
