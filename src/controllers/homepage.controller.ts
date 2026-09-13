import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { db, pool } from "../db/index.js";
import { homepageSettings, activityLogs } from "../db/schema.js";

// Ensure homepage_settings table exists
export const ensureHomepageTable = async (): Promise<void> => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homepage_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slider_section JSON,
        service_cards JSON,
        running_text JSON,
        about_section JSON,
        counter_section JSON,
        why_choose_us_section JSON,
        working_process_section JSON,
        solutions_section JSON,
        faq_section JSON,
        testimonial_section JSON,
        section_visibility JSON,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err) {
    console.error("Error creating homepage_settings table:", err);
  }
};

// Default Seed Content for Homepage
export const defaultHomepageData = {
  slider_section: [
    {
      id: "slide-1",
      small_title: "GLOBAL ENERGY & SOLAR INFRASTRUCTURE",
      big_title: "Powering Tomorrow with Intelligent Solar Energy",
      description: "Pioneering utility-scale PV, smart BESS energy storage, and industrial-grade high-frequency power solutions across Bangladesh and global markets.",
      button_text: "Explore Our Solutions",
      button_url: "/services",
      button_secondary_text: "Audit Sizing Calculator",
      button_secondary_url: "#calculator",
      card_badge: "$ ↓",
      card_title: "Cost Savings",
      card_description: "Over time, solar energy can significantly lower electricity bills and allow selling power back to the grid.",
      image_1: "https://image.solvexgloballtd.com/uploads/1789288549708-653475725.webp",
      image_2: "https://image.solvexgloballtd.com/uploads/1789288544689-739326945.webp",
      image_3: "https://image.solvexgloballtd.com/uploads/1789288545150-707423116.webp",
    },
    {
      id: "slide-2",
      small_title: "SMART ENERGY STORAGE SYSTEMS",
      big_title: "Next-Gen Commercial & Industrial Hybrid Inverters",
      description: "Engineered with dual MPPTs, IP66 rugged outdoor casing, and 9-unit parallel scalability for 100% resilient off-grid and on-grid continuity.",
      button_text: "View Products",
      button_url: "/products",
      button_secondary_text: "Request a Quote",
      button_secondary_url: "/contact",
      card_badge: "99.8% Uptime",
      card_title: "Zero Transfer Glitch",
      card_description: "Pure sine wave power continuity engineered for uninterrupted industrial manufacturing and medical theaters.",
      image_1: "https://image.solvexgloballtd.com/uploads/1789288546061-705316393.webp",
      image_2: "https://image.solvexgloballtd.com/uploads/1789288546687-947690242.webp",
      image_3: "https://image.solvexgloballtd.com/uploads/1789288547922-892866926.webp",
    },
  ],
  service_cards: [
    {
      id: "sc-1",
      icon: "SunMedium",
      title: "Utility-Scale Solar PV Plants",
      description: "Turnkey EPC development from high-irradiance engineering to grid synchronization and 25-year performance monitoring.",
    },
    {
      id: "sc-2",
      icon: "BatteryCharging",
      title: "C&I BESS Battery Storage",
      description: "High-capacity lithium iron phosphate (LiFePO4) storage for peak shaving, demand management, and continuous factory backup.",
    },
    {
      id: "sc-3",
      icon: "Wind",
      title: "Wind & Hybrid Microgrids",
      description: "Clean hybrid architectures combining solar, wind, and intelligent diesel generator synchronization.",
    },
    {
      id: "sc-4",
      icon: "Activity",
      title: "Healthcare Critical Power",
      description: "Zero-transfer-time medical-grade pure sine wave UPS systems for hospital ICUs, imaging centers, and emergency hubs.",
    },
  ],
  running_text: [
    { id: "rt-1", title: "100+ MW Utility Solar Deployed" },
    { id: "rt-2", title: "IP66 Certified Waterproof Engineering" },
    { id: "rt-3", title: "Tier-1 Hybrid Inverters & Lithium Storage" },
    { id: "rt-4", title: "24/7 Remote Telemetry & BMS Telematics" },
    { id: "rt-5", title: "ISO 9001 & CE Certified Quality" },
  ],
  about_section: {
    tag_icon: "Sparkles",
    tag_text: "20+ YEARS OF INDUSTRIAL ENGINEERING",
    mini_title: "Architecting Sustainable Power Solutions",
    big_title: "Empowering Industries with Clean, Uninterrupted Energy",
    description: "Solvex Global Ltd stands at the vanguard of renewable energy and critical power infrastructure. We bridge cutting-edge international solar technologies with local industrial needs, delivering turnkey EPC projects, high-frequency inverters, and battery systems that lower carbon footprints while maximizing operational profitability.",
    bullet_points: [
      "Tier-1 manufacturing partnerships with international solar leaders",
      "Dedicated R&D engineering division for tropical climate optimization",
      "Guaranteed 25-year performance warranties with full local RMA support",
      "Smart IoT telemetry and cloud telemetry integration on all deployments",
    ],
    video_link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    person_image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    person_name: "Engr. M. A. Rahman",
    person_designation: "Chief Executive Officer & Founder",
    button_text: "Discover Our Full Story",
    button_url: "/about",
  },
  counter_section: [
    { id: "cnt-1", counter: "150+", description: "MW Total Solar Capacity Installed" },
    { id: "cnt-2", counter: "99.8%", description: "System Uptime & Grid Reliability" },
    { id: "cnt-3", counter: "450+", description: "Commercial & Industrial Projects" },
  ],
  why_choose_us_section: {
    tag: "THE SOLVEX ADVANTAGE",
    title: "Engineered for Uncompromising Performance",
    description: "Every megawatt we engineer is backed by rigorous environmental stress testing, high-grade Tier-1 bill of materials, and guaranteed service level agreements.",
    metrics: [
      { id: "m-1", label: "Energy Cost Reduction", percentage: 92 },
      { id: "m-2", label: "Hardware Efficiency Rate", percentage: 98 },
      { id: "m-3", label: "Client Retention & SLA Delivery", percentage: 99 },
    ],
  },
  working_process_section: {
    tag: "STREAMLINED EXECUTION",
    title: "Our 4-Step Engineering Lifecycle",
    description: "From solar irradiation feasibility studies to lifetime telemetry monitoring, we ensure zero operational bottlenecks.",
    steps: [
      {
        id: "step-1",
        step_number: "01",
        title: "Energy Audit & Load Profiling",
        description: "High-resolution telemetry assessment of your daytime and nighttime industrial consumption curve.",
      },
      {
        id: "step-2",
        step_number: "02",
        title: "Simulation & Electrical Design",
        description: "CAD single-line diagrams, string sizing, MPPT yield modeling, and shading analysis.",
      },
      {
        id: "step-3",
        step_number: "03",
        title: "Certified Turnkey EPC Installation",
        description: "Rapid deployment adhering to BNBC, IEC, and global safety standards with zero factory downtime.",
      },
      {
        id: "step-4",
        step_number: "04",
        title: "Grid Sync & Lifetime RMA Care",
        description: "Formal net-metering approval, cloud SCADA setup, and dedicated on-site maintenance teams.",
      },
    ],
  },
  solutions_section: {
    small_title: "INNOVATIVE ARCHITECTURES",
    big_title: "Tailored Clean Energy Solutions",
    description: "Explore our specialized divisions built to address every scale of energy demand.",
  },
  faq_section: [
    {
      id: "faq-1",
      question: "How does net metering work with Solvex industrial solar installations?",
      answer: "Under Bangladesh net metering guidelines, excess electricity generated during peak sunlight is exported back to the national grid (DPDC, DESCO, REB, etc.) and credited against your monthly billing, dramatically reducing operational electricity expenses.",
    },
    {
      id: "faq-2",
      question: "What is the lifespan and warranty coverage of your hybrid inverters?",
      answer: "Our Solvex hybrid inverters come standard with 5 to 10-year manufacturer replacement warranties, with design lifespans exceeding 15 to 20 years when maintained under standard operating temperatures.",
    },
    {
      id: "faq-3",
      question: "Can Solvex systems operate without batteries during daytime grid outages?",
      answer: "Yes! Our XA-series hybrid inverters feature advanced battery-independent PV mode, allowing your facility to run daytime loads directly from solar generation even during utility blackout conditions.",
    },
    {
      id: "faq-4",
      question: "What financing and ROI payback periods can commercial clients expect?",
      answer: "Most commercial and industrial rooftop solar systems achieve full capital expenditure payback within 3.5 to 5 years, providing free clean electricity for the remaining 20+ years of panel operational life.",
    },
  ],
  testimonial_section: [
    {
      id: "test-1",
      name: "Ahmed Kabir",
      company: "Apex Spinning & Weaving Mills",
      role: "Director of Plant Operations",
      content: "Solvex deployed our 1.2MW rooftop solar array with absolute precision. Our daytime diesel generator run-time dropped by 75%, and the ROI has exceeded all initial projections.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
      rating: 5,
    },
    {
      id: "test-2",
      name: "Engr. Farhana Chowdhury",
      company: "CareMed Specialist Hospital",
      role: "Chief Medical Systems Engineer",
      content: "The pure sine wave medical UPS and BESS setup engineered by Solvex gives our operating theaters 100% reliable power continuity with zero transfer glitch.",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200",
      rating: 5,
    },
  ],
  section_visibility: {
    hero_slider: true,
    roi_calculator: true,
    feature_grid: true,
    partner_marquee: true,
    about_overview: true,
    divisions_section: true,
    solutions_showcase: true,
    products_carousel: true,
    why_choose_us: true,
    working_process: true,
    team_members: true,
    project_gallery: true,
    faq_section: true,
    testimonials: true,
    news_blog: true,
  },
};

// GET /api/homepage (Public)
export const getHomepage = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureHomepageTable();

    const [rows]: any = await pool.query("SELECT * FROM homepage_settings LIMIT 1");

    if (rows && rows.length > 0) {
      const s = rows[0];
      const data = {
        id: s.id,
        slider_section: s.slider_section ? (typeof s.slider_section === "string" ? JSON.parse(s.slider_section) : s.slider_section) : defaultHomepageData.slider_section,
        service_cards: s.service_cards ? (typeof s.service_cards === "string" ? JSON.parse(s.service_cards) : s.service_cards) : defaultHomepageData.service_cards,
        running_text: s.running_text ? (typeof s.running_text === "string" ? JSON.parse(s.running_text) : s.running_text) : defaultHomepageData.running_text,
        about_section: s.about_section ? (typeof s.about_section === "string" ? JSON.parse(s.about_section) : s.about_section) : defaultHomepageData.about_section,
        counter_section: s.counter_section ? (typeof s.counter_section === "string" ? JSON.parse(s.counter_section) : s.counter_section) : defaultHomepageData.counter_section,
        why_choose_us_section: s.why_choose_us_section ? (typeof s.why_choose_us_section === "string" ? JSON.parse(s.why_choose_us_section) : s.why_choose_us_section) : defaultHomepageData.why_choose_us_section,
        working_process_section: s.working_process_section ? (typeof s.working_process_section === "string" ? JSON.parse(s.working_process_section) : s.working_process_section) : defaultHomepageData.working_process_section,
        solutions_section: s.solutions_section ? (typeof s.solutions_section === "string" ? JSON.parse(s.solutions_section) : s.solutions_section) : defaultHomepageData.solutions_section,
        faq_section: s.faq_section ? (typeof s.faq_section === "string" ? JSON.parse(s.faq_section) : s.faq_section) : defaultHomepageData.faq_section,
        testimonial_section: s.testimonial_section ? (typeof s.testimonial_section === "string" ? JSON.parse(s.testimonial_section) : s.testimonial_section) : defaultHomepageData.testimonial_section,
        section_visibility: s.section_visibility ? (typeof s.section_visibility === "string" ? JSON.parse(s.section_visibility) : s.section_visibility) : defaultHomepageData.section_visibility,
        updated_at: s.updated_at,
      };

      res.json({
        status: "success",
        message: "Homepage settings retrieved successfully.",
        data,
      });
      return;
    }

    // Auto-seed default homepage settings if table is empty
    await pool.query(
      `INSERT INTO homepage_settings (
        slider_section, service_cards, running_text, about_section, counter_section,
        why_choose_us_section, working_process_section, solutions_section, faq_section,
        testimonial_section, section_visibility
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        JSON.stringify(defaultHomepageData.slider_section),
        JSON.stringify(defaultHomepageData.service_cards),
        JSON.stringify(defaultHomepageData.running_text),
        JSON.stringify(defaultHomepageData.about_section),
        JSON.stringify(defaultHomepageData.counter_section),
        JSON.stringify(defaultHomepageData.why_choose_us_section),
        JSON.stringify(defaultHomepageData.working_process_section),
        JSON.stringify(defaultHomepageData.solutions_section),
        JSON.stringify(defaultHomepageData.faq_section),
        JSON.stringify(defaultHomepageData.testimonial_section),
        JSON.stringify(defaultHomepageData.section_visibility),
      ]
    );

    res.json({
      status: "success",
      message: "Default homepage settings initialized successfully.",
      data: defaultHomepageData,
    });
  } catch (error: any) {
    console.error("Failed to fetch homepage settings:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch homepage settings",
      error: error.message,
    });
  }
};

// PUT /api/homepage (Admin Protected)
export const updateHomepage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureHomepageTable();

    const {
      slider_section,
      service_cards,
      running_text,
      about_section,
      counter_section,
      why_choose_us_section,
      working_process_section,
      solutions_section,
      faq_section,
      testimonial_section,
      section_visibility,
    } = req.body;

    const [existing]: any = await pool.query("SELECT id FROM homepage_settings LIMIT 1");

    if (existing && existing.length > 0) {
      await pool.query(
        `UPDATE homepage_settings SET
          slider_section = COALESCE(?, slider_section),
          service_cards = COALESCE(?, service_cards),
          running_text = COALESCE(?, running_text),
          about_section = COALESCE(?, about_section),
          counter_section = COALESCE(?, counter_section),
          why_choose_us_section = COALESCE(?, why_choose_us_section),
          working_process_section = COALESCE(?, working_process_section),
          solutions_section = COALESCE(?, solutions_section),
          faq_section = COALESCE(?, faq_section),
          testimonial_section = COALESCE(?, testimonial_section),
          section_visibility = COALESCE(?, section_visibility),
          updated_at = NOW()
        WHERE id = ?`,
        [
          slider_section ? JSON.stringify(slider_section) : null,
          service_cards ? JSON.stringify(service_cards) : null,
          running_text ? JSON.stringify(running_text) : null,
          about_section ? JSON.stringify(about_section) : null,
          counter_section ? JSON.stringify(counter_section) : null,
          why_choose_us_section ? JSON.stringify(why_choose_us_section) : null,
          working_process_section ? JSON.stringify(working_process_section) : null,
          solutions_section ? JSON.stringify(solutions_section) : null,
          faq_section ? JSON.stringify(faq_section) : null,
          testimonial_section ? JSON.stringify(testimonial_section) : null,
          section_visibility ? JSON.stringify(section_visibility) : null,
          existing[0].id,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO homepage_settings (
          slider_section, service_cards, running_text, about_section, counter_section,
          why_choose_us_section, working_process_section, solutions_section, faq_section,
          testimonial_section, section_visibility
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          JSON.stringify(slider_section || defaultHomepageData.slider_section),
          JSON.stringify(service_cards || defaultHomepageData.service_cards),
          JSON.stringify(running_text || defaultHomepageData.running_text),
          JSON.stringify(about_section || defaultHomepageData.about_section),
          JSON.stringify(counter_section || defaultHomepageData.counter_section),
          JSON.stringify(why_choose_us_section || defaultHomepageData.why_choose_us_section),
          JSON.stringify(working_process_section || defaultHomepageData.working_process_section),
          JSON.stringify(solutions_section || defaultHomepageData.solutions_section),
          JSON.stringify(faq_section || defaultHomepageData.faq_section),
          JSON.stringify(testimonial_section || defaultHomepageData.testimonial_section),
          JSON.stringify(section_visibility || defaultHomepageData.section_visibility),
        ]
      );
    }

    // Log Activity
    try {
      await db.insert(activityLogs).values({
        userId: req.user?.id || 1,
        userName: req.user?.name || "Admin",
        action: "Updated Homepage Settings",
        details: "Saved customizable sections and visibility preferences for Homepage.",
        ipAddress: req.ip || "127.0.0.1",
      });
    } catch (_) {}

    res.json({
      status: "success",
      message: "Homepage settings updated successfully.",
      data: req.body,
    });
  } catch (error: any) {
    console.error("Failed to update homepage settings:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update homepage settings",
      error: error.message,
    });
  }
};
