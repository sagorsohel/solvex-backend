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
  contactPageSettings: {
    channelsBadge: "ENTERPRISE CHANNELS",
    channelsTitle: "Direct Business Connections",
    channelsDescription: "Connect with our technical design and pricing departments directly. We guarantee prompt responses and full confidentiality.",
    proposalsEmail: "proposals@solvexglobal.com",
    salesPhoneUs: "+1 (952) 435-7106 (US)",
    salesPhoneEu: "+49 (30) 8432-9011 (EU)",
    complianceEmail: "compliance@solvexglobal.com",
    slaBadge: "24h",
    slaTitle: "SLA Response Guarantee",
    slaDescription: "Our technical account executives respond to qualified commercial RFPs within one business day.",
    branchesBadge: "Offices Network",
    branchesTitle: "Our International Branch Network",
    branchesSubtitle: "Solvex maintains active engineering hubs across four continents to ensure local regulatory alignment and rapid response capabilities.",
    translations: {
      bn: {
        channelsBadge: "এন্টারপ্রাইজ চ্যানেল",
        channelsTitle: "সরাসরি ব্যবসায়িক যোগাযোগ",
        channelsDescription: "আমাদের টেকনিক্যাল ডিজাইন ও প্রাইসিং ডিপার্টমেন্টের সাথে সরাসরি যোগাযোগ করুন। আমরা দ্রুত সাড়া দেওয়ার নিশ্চয়তা দিচ্ছি।",
        slaTitle: "এসএলএ রেসপন্স গ্যারান্টি",
        slaDescription: "আমাদের টেকনিক্যাল অ্যাকাউন্ট এক্সিকিউটিভরা এক কার্যদিবসের মধ্যে আপনার আরএফপির জবাব প্রদান করে।",
        branchesBadge: "শাখা নেটওয়ার্ক",
        branchesTitle: "আমাদের আন্তর্জাতিক শাখা নেটওয়ার্ক",
        branchesSubtitle: "সলভেক্স চারটি মহাদেশ জুড়ে সক্রিয় ইঞ্জিনিয়ারিং হাব পরিচালনা করে যাতে স্থানীয় নিয়ন্ত্রক মান নিশ্চিত হয়।",
      },
    },
  },
  branches: [
    {
      id: "b1",
      city: "Berlin, Germany",
      role: "Global Headquarters",
      address: "12 Division Park, SKY 12546, Berlin",
      phone: "+49 (30) 8432-9011",
      email: "berlin@solvexglobal.com",
      hours: "Mon - Fri: 8:00 - 18:00",
      region: "Europe",
      translations: {
        bn: {
          city: "বার্লিন, জার্মানি",
          role: "গ্লোবাল হেডকোয়ার্টার",
          address: "১২ ডিভিশন পার্ক, স্কাই ১২৫৪৬, বার্লিন",
          hours: "সোম - শুক্র: ৮:০০ - ১৮:০০",
          region: "ইউরোপ",
        },
      },
    },
    {
      id: "b2",
      city: "Austin, Texas",
      role: "North America Hub",
      address: "804 Congress Ave, Suite 300, Austin, TX 78701",
      phone: "+1 (512) 490-3320",
      email: "austin@solvexglobal.com",
      hours: "Mon - Fri: 8:00 - 18:00",
      region: "North America",
      translations: {
        bn: {
          city: "অস্টিন, টেক্সাস",
          role: "উত্তর আমেরিকা হাব",
          address: "৮০৪ কংগ্রেস এভিনিউ, স্যুট ৩০০, অস্টিন, টিএক্স ৭৮৭০১",
          hours: "সোম - শুক্র: ৮:০০ - ১৮:০০",
          region: "উত্তর আমেরিকা",
        },
      },
    },
    {
      id: "b3",
      city: "Sydney, Australia",
      role: "Asia-Pacific Hub",
      address: "Level 22, 101 George St, Sydney NSW 2000",
      phone: "+61 (2) 9233-4450",
      email: "sydney@solvexglobal.com",
      hours: "Mon - Fri: 9:00 - 17:00",
      region: "Asia-Pacific",
      translations: {
        bn: {
          city: "সিডনি, অস্ট্রেলিয়া",
          role: "এশিয়া-প্যাসিফিক হাব",
          address: "লেভেল ২২, ১০১ জর্জ সেন্ট, সিডনি এনএসডব্লিউ ২০০০",
          hours: "সোম - শুক্র: ৯:০০ - ১৭:০০",
          region: "এশিয়া-প্যাসিফিক",
        },
      },
    },
    {
      id: "b4",
      city: "Santiago, Chile",
      role: "Latin America Hub",
      address: "Av. Vitacura 2670, Las Condes, Santiago",
      phone: "+56 (2) 2340-8800",
      email: "santiago@solvexglobal.com",
      hours: "Mon - Fri: 8:30 - 17:30",
      region: "Latin America",
      translations: {
        bn: {
          city: "সান্তিয়াগো, চিলি",
          role: "ল্যাটিন আমেরিকা হাব",
          address: "এভিনিউ ভিস্তাকুরা ২৬৭০, লাস কনদেস, সান্তিয়াগো",
          hours: "সোম - শুক্র: ৮:৩০ - ১৭:৩০",
          region: "ল্যাটিন আমেরিকা",
        },
      },
    },
  ],
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
        contact_page_settings JSON,
        branches JSON,
        translations JSON,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migrations for existing tables
    try {
      await pool.query(`ALTER TABLE site_settings ADD COLUMN contact_page_settings JSON NULL`);
    } catch (_) {}
    try {
      await pool.query(`ALTER TABLE site_settings ADD COLUMN branches JSON NULL`);
    } catch (_) {}

    // Check if initial row exists
    const [rows]: any = await pool.query("SELECT * FROM site_settings LIMIT 1");
    if (rows.length === 0) {
      await db.insert(siteSettings).values({
        contactPhone: defaultSiteSettingsData.contactPhone,
        contactEmail: defaultSiteSettingsData.contactEmail,
        supportEmail: defaultSiteSettingsData.supportEmail,
        address: defaultSiteSettingsData.address,
        workingHours: defaultSiteSettingsData.workingHours,
        socialLinks: defaultSiteSettingsData.socialLinks,
        headerSettings: defaultSiteSettingsData.headerSettings,
        footerSettings: defaultSiteSettingsData.footerSettings,
        contactPageSettings: defaultSiteSettingsData.contactPageSettings,
        branches: defaultSiteSettingsData.branches,
        translations: defaultSiteSettingsData.translations,
      });
      console.log("✅ site_settings table seeded with initial settings.");
    } else {
      // If row exists but branches or contactPageSettings are null, backfill defaults
      const current = rows[0];
      const updates: Record<string, any> = {};
      if (current.branches === null || current.branches === undefined || current.branches === "null") {
        updates.branches = defaultSiteSettingsData.branches;
      }
      if (!current.contact_page_settings || current.contact_page_settings === "null") {
        updates.contactPageSettings = defaultSiteSettingsData.contactPageSettings;
      }
      if (Object.keys(updates).length > 0) {
        await db.update(siteSettings).set(updates).where(eq(siteSettings.id, current.id));
        console.log("✅ site_settings backfilled with default branches & contact page settings.");
      }
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
          contactPageSettings: s.contactPageSettings || defaultSiteSettingsData.contactPageSettings,
          branches: Array.isArray(s.branches) ? s.branches : (s.branches ?? defaultSiteSettingsData.branches),
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
      contactPageSettings,
      branches,
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
          contactPageSettings: contactPageSettings !== undefined ? contactPageSettings : existing[0].contactPageSettings,
          branches: branches !== undefined ? branches : existing[0].branches,
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
        contactPageSettings: contactPageSettings ?? defaultSiteSettingsData.contactPageSettings,
        branches: branches ?? defaultSiteSettingsData.branches,
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
