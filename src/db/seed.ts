import bcrypt from "bcryptjs";
import { db, testDbConnection, pool } from "./index.js";
import { users, products, inquiries, activityLogs } from "./schema.js";
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

    // 4. Seed Initial Activity Logs
    const existingLogs = await db.select().from(activityLogs).limit(1);
    if (existingLogs.length === 0) {
      await db.insert(activityLogs).values([
        {
          userName: "Super Admin",
          action: "System Initialized & Drizzle ORM Connected",
          details: "Configured MySQL database solvex_db with JWT authentication.",
          ipAddress: "127.0.0.1",
        },
        {
          userName: "Rajibul Islam",
          action: "Updated Homepage Clean Energy Sliders",
          details: "Published solar and offshore wind banners.",
          ipAddress: "192.168.1.10",
        },
        {
          userName: "Sarah Jenkins",
          action: "Catalog Inventory Sync",
          details: "Verified 5MW Wind Turbines and Battery Storage specifications.",
          ipAddress: "192.168.1.15",
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
