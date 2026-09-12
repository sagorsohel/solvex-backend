import bcrypt from "bcryptjs";
import { db, testDbConnection, pool } from "./index.js";
import { users, products, inquiries, activityLogs, boardMembers, aboutPageSettings } from "./schema.js";
import { eq } from "drizzle-orm";

async function runSeed() {
  console.log("🌱 Starting MySQL Database Seeding for Solvex Global Ltd...");
  const connected = await testDbConnection();

  if (!connected) {
    console.error("❌ Unable to connect to MySQL database.");
    process.exit(1);
  }

  try {
    // 1. Seed Admin & Team Users
    const adminEmail = "admin@solvexgloballtd.com";
    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);

    const hashedAdminPassword = await bcrypt.hash("12345678", 10);

    if (existingAdmin.length > 0) {
      await db
        .update(users)
        .set({
          password: hashedAdminPassword,
          name: "Super Admin",
          role: "admin",
          status: "active",
        })
        .where(eq(users.email, adminEmail));
      console.log(`🔄 Updated admin user: ${adminEmail} (password: 12345678)`);
    } else {
      await db.insert(users).values({
        name: "Super Admin",
        email: adminEmail,
        password: hashedAdminPassword,
        role: "admin",
        status: "active",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      });
      console.log(`✅ Created admin user: ${adminEmail} (password: 12345678)`);
    }

    // Additional team users
    const teamUsers = [
      {
        name: "Rajibul Islam",
        email: "rajibul.islam@solvexgloballtd.com",
        role: "admin" as const,
        status: "active" as const,
        avatar: "https://backend.solvexgloballtd.com/storage/homepage/about/ceo.png",
      },
      {
        name: "Sarah Jenkins",
        email: "sarah.jenkins@solvexgloballtd.com",
        role: "editor" as const,
        status: "active" as const,
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      },
      {
        name: "Michael Chen",
        email: "michael.chen@solvexgloballtd.com",
        role: "viewer" as const,
        status: "active" as const,
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      },
    ];

    for (const u of teamUsers) {
      const exists = await db.select().from(users).where(eq(users.email, u.email)).limit(1);
      if (exists.length === 0) {
        const pass = await bcrypt.hash("12345678", 10);
        await db.insert(users).values({
          name: u.name,
          email: u.email,
          password: pass,
          role: u.role,
          status: u.status,
          avatar: u.avatar,
        });
        console.log(`✅ Created team user: ${u.email}`);
      }
    }

    // 2. Seed Real Solvex Products / Services
    const existingProducts = await db.select().from(products).limit(1);
    if (existingProducts.length === 0) {
      await db.insert(products).values([
        {
          title: "Utility Solar Farms (Mono-Crystalline 550W)",
          category: "Solar Solutions",
          price: "240.00",
          stock: 1450,
          status: "published",
          description: "High-efficiency mono-crystalline solar panels delivering maximum energy yield.",
          image: "https://backend.solvexgloballtd.com/storage/homepage/services/solar.png",
        },
        {
          title: "Offshore Wind Turbines (5MW Aerodynamic)",
          category: "Wind Energy",
          price: "1250000.00",
          stock: 24,
          status: "published",
          description: "Next-gen aerodynamic offshore wind generators engineered for extreme offshore conditions.",
          image: "https://backend.solvexgloballtd.com/storage/homepage/services/wind.png",
        },
        {
          title: "Industrial Battery Storage (100kWh Backup)",
          category: "Battery Storage",
          price: "68000.00",
          stock: 65,
          status: "published",
          description: "Lithium-ion utility storage systems providing continuous zero-downtime micro-grid backup.",
          image: "https://backend.solvexgloballtd.com/storage/homepage/services/battery.png",
        },
        {
          title: "Advanced Medical Precision Imaging & ICU Equipment",
          category: "Medical Devices",
          price: "320000.00",
          stock: 18,
          status: "published",
          description: "Diagnostic MRI scanners, ICU patient monitors, and surgical suites for international hospitals.",
          image: "https://backend.solvexgloballtd.com/storage/homepage/services/medical.png",
        },
        {
          title: "Smart Grid Inverter & Transformer 500kW",
          category: "Solar Solutions",
          price: "18500.00",
          stock: 90,
          status: "published",
          description: "Commercial 3-phase grid-tied inverter with real-time remote telemetry.",
        },
      ]);
      console.log("✅ Seeded Solvex Global products into MySQL.");
    }

    // 3. Seed Real Client Inquiries
    const existingInquiries = await db.select().from(inquiries).limit(1);
    if (existingInquiries.length === 0) {
      await db.insert(inquiries).values([
        {
          name: "Dr. Al-Mansoor Hospital",
          email: "procurement@almansoor-med.com",
          phone: "+971-4-892100",
          subject: "ICU Diagnostics & MRI Equipment RFP",
          message: "Requesting formal technical quotation and delivery timeline for 4 MRI diagnostic units.",
          status: "pending",
        },
        {
          name: "Nordic Green Energy Corp",
          email: "procure@nordicgreen.se",
          phone: "+46-8-555021",
          subject: "Offshore Wind Turbine 5MW Tender",
          message: "Inquiry regarding bulk order of 12 units of 5MW offshore wind turbines for Q3 deployment.",
          status: "contacted",
        },
        {
          name: "Apex Solar Utility Grid",
          email: "info@apexsolar.com.bd",
          phone: "+880-1711-223344",
          subject: "50MW Solar Farm Installation Query",
          message: "We need 550W Tier-1 mono-crystalline panels and inverters for a 50MW ground-mounted project.",
          status: "resolved",
        },
      ]);
      console.log("✅ Seeded client inquiries into MySQL.");
    }

    // 4. Seed Board of Members (Separate Collection)
    const existingBoard = await db.select().from(boardMembers).limit(1);
    if (existingBoard.length === 0) {
      await db.insert(boardMembers).values([
        {
          name: "Tariqul Islam",
          designation: "Chairman of the Board",
          tag: "Founder & Chairman",
          image: "https://backend.solvexgloballtd.com/storage/homepage/about/ceo.png",
          bio: "Visionary clean tech entrepreneur with 25+ years experience in renewable energy and healthcare logistics.",
          displayInWebsite: true,
          orderIndex: 1,
        },
        {
          name: "Rajibul Islam",
          designation: "Managing Director & CEO",
          tag: "Managing Director",
          image: "https://backend.solvexgloballtd.com/storage/homepage/about/ceo.png",
          bio: "Leading Solvex Global across 50+ countries in grid scale solar and critical medical infrastructure.",
          displayInWebsite: true,
          orderIndex: 2,
        },
        {
          name: "Dr. Sarah Jenkins",
          designation: "Executive Director, Healthcare",
          tag: "Medical Logistics",
          image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
          bio: "Specialized in international healthcare compliance and ICU diagnostic equipment distribution.",
          displayInWebsite: true,
          orderIndex: 3,
        },
        {
          name: "Michael Chen",
          designation: "Technical Director, Renewable Energy",
          tag: "Renewable Engineering",
          image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
          bio: "Oversees engineering validation for Tier-1 PV solar farms and 5MW offshore wind turbines.",
          displayInWebsite: true,
          orderIndex: 4,
        },
      ]);
      console.log("✅ Seeded Board of Members collection into MySQL.");
    }

    // 5. Seed About Page Customization Settings
    const existingAbout = await db.select().from(aboutPageSettings).limit(1);
    if (existingAbout.length === 0) {
      await db.insert(aboutPageSettings).values({
        discoverSection: {
          small_title: "Discover Solvex Global",
          big_title_1st_line: "Engineering",
          big_title_1st_line_style: "Sustainable",
          big_title_1st_line_style_color: "#10b981",
          big_title_second_line: "Infrastructure for Humanity",
          description: "Pioneering utility scale solar power farms, offshore wind generation, zero-downtime battery storage, and advanced diagnostic medical technology globally.",
          button_1_text: "Request System Audit",
          button_2_text: "Explore Solutions",
          cards: [
            { title: "500+ MW", subtitle: "Solar & Clean Tech" },
            { title: "50+", subtitle: "Countries Exported" },
            { title: "99.8%", subtitle: "Uptime Reliability" },
            { title: "24/7", subtitle: "Smart Grid Monitoring" },
          ],
        },
        chairmanMessageSection: {
          name: "Tariqul Islam",
          designation_and_company: "Chairman & Founder, Solvex Global Ltd",
          image: "https://backend.solvexgloballtd.com/storage/homepage/about/ceo.png",
          pill_text_on_image: "FOUNDER & CHAIRMAN",
          name_on_image: "Tariqul Islam",
          designation_on_image: "Chairman of the Board",
          company_on_image: "Solvex Global Ltd.",
          small_title: "Chairman's Address",
          big_size_quote: "Our mission is to empower developing and modern economies with uninterrupted renewable power and life-saving healthcare innovation.",
          small_size_quote: "Energy independence and reliable medical diagnostics are basic human rights.",
          normal_size_quote: "Through strategic engineering alliances and Tier-1 certified equipment, Solvex Global is building the backbone of tomorrow's sustainable infrastructure.",
          bottom_right_pill_text: "Global Excellence Award 2026",
        },
        boardOfDirectorsSection: {
          small_title: "OUR GOVERNANCE",
          big_title: "Board of Directors",
          description: "Distinguished industry pioneers and corporate leaders directing Solvex Global's long-term sustainability charter.",
        },
        ourStorySection: {
          small_title: "Our Journey & Legacy",
          big_title: "Pioneering Clean Power",
          big_style_title: "Since Inception",
          big_style_title_color: "#10b981",
          description: "From pioneering domestic rooftop solar installations to deploying 500MW utility grids and supplying ICU units to worldwide hospital networks.",
          image: "https://backend.solvexgloballtd.com/storage/homepage/sliders/solar_panel_hero.png",
          tag_text: "Tier-1 Certified Engineering",
          tag_color: "#10b981",
          card_title: "Global Logistics Network",
          card_description: "Direct supply pipelines operating across Southeast Asia, Europe, and Middle Eastern corridors.",
          roadmap: [
            { duration: "2018 - 2020", duration_color: "#10b981", title: "Establishment & Solar Supply Chain", description: "Founded Solvex Global with focus on high-efficiency mono-crystalline solar equipment." },
            { duration: "2021 - 2023", duration_color: "#0ea5e9", title: "Healthcare Division & Wind Turbines", description: "Expanded into offshore aerodynamic wind systems and CE-certified medical ICU equipment." },
            { duration: "2024 - Present", duration_color: "#8b5cf6", title: "Utility Battery Storage & 500MW Milestone", description: "Surpassed 500MW capacity worldwide with industrial lithium storage systems." },
          ],
        },
        directionPurposeSection: {
          small_title: "Direction & Purpose",
          big_title: "Guided by Principles",
          description: "Our purpose is built upon long-term environmental stewardship and human-centric healthcare innovation.",
          cards: [
            {
              title: "Our Mission",
              description: "To accelerate the world's transition to zero-carbon energy and provide high-precision medical technology to hospitals worldwide.",
              bullet_points: ["Zero-Carbon Microgrid Deployment", "Affordable Tier-1 Solar Solutions", "Life-Saving Diagnostic Availability"],
            },
            {
              title: "Our Vision",
              description: "To become the benchmark for renewable energy reliability and healthcare equipment procurement across emerging and global markets.",
              bullet_points: ["100% Carbon Neutral Operations by 2030", "Global Real-Time Smart Grid Telemetry", "Continuous Technological Innovation"],
            },
          ],
        },
        strategicPillarsSection: {
          small_title: "Foundational Principles",
          big_title: "Four Strategic Pillars",
          description: "The operational framework driving Solvex Global's engineering standards.",
          cards: [
            { title: "Engineering Precision", description: "Rigorous ISO 9001 and CE quality compliance on all solar panels, wind generators, and battery modules." },
            { title: "Sustainable Value", description: "Maximizing lifetime return on capital for energy utilities and public healthcare institutions." },
            { title: "Zero Downtime", description: "Industrial grade battery redundancy and 24/7 smart grid telemetry ensuring uninterrupted power." },
            { title: "Global Stewardship", description: "Ethical sourcing and community development in all regions where Solvex operates." },
          ],
        },
        peopleValuesSection: {
          small_title: "Culture & Values",
          big_title: "Our Core Values",
          description: "The fundamental beliefs that guide our people and partnerships every single day.",
          cards: [
            { colored_number: "01", title: "Integrity First", description: "Uncompromising transparency and ethical conduct with every supplier, client, and sovereign partner." },
            { colored_number: "02", title: "Obsession with Safety", description: "Zero compromise on occupational safety and equipment durability under extreme conditions." },
            { colored_number: "03", title: "Continuous Innovation", description: "Investing in next-generation high-efficiency solar cells and medical imaging technology." },
            { colored_number: "04", title: "Client Centricity", description: "Tailored engineering solutions and end-to-end commissioning support for every project." },
          ],
        },
        efficiencyCertificatesSection: {
          small_title: "Accreditations & Standards",
          big_title: "Certified International Quality",
          cards: [
            { title: "ISO 9001:2015", subtitle: "Quality Management System Certified" },
            { title: "CE Mark Compliant", subtitle: "European Health, Safety & Environmental Standards" },
            { title: "IEC 61215 / 61730", subtitle: "Solar PV Module Design & Safety Certification" },
            { title: "ISO 13485:2016", subtitle: "Medical Devices Quality Management Standard" },
          ],
        },
        carbonFreeFutureSection: {},
      });
      console.log("✅ Seeded About Page Settings into MySQL.");
    }

    // 6. Activity Logs
    const existingLogs = await db.select().from(activityLogs).limit(1);
    if (existingLogs.length === 0) {
      await db.insert(activityLogs).values([
        {
          userName: "Super Admin",
          action: "System Initialized & Drizzle ORM Connected",
          details: "Configured MySQL database solvex_db with JWT authentication.",
          ipAddress: "127.0.0.1",
        },
      ]);
      console.log("✅ Seeded initial activity logs into MySQL.");
    }

    console.log("✨ Seeding finished successfully!");
  } catch (err: any) {
    console.error("❌ Seeding error:", err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runSeed();
