import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { pool } from "../db/index.js";

let tablesInitialized = false;

/**
 * Automatically create tables and seed default realistic data for the Solar Sizing Calculator
 */
export const ensureCalculatorTables = async (): Promise<void> => {
  if (tablesInitialized) return;

  try {
    // 1. Appliances Catalog
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calculator_appliances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        name_bn VARCHAR(191) NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'cooling',
        icon VARCHAR(50) NOT NULL DEFAULT 'Zap',
        default_unit ENUM('watt', 'hp') NOT NULL DEFAULT 'watt',
        default_rating DECIMAL(10, 2) NOT NULL DEFAULT 65.00,
        default_watts INT NOT NULL DEFAULT 65,
        default_hours DECIMAL(4, 1) NOT NULL DEFAULT 6.0,
        default_quantity INT NOT NULL DEFAULT 1,
        order_index INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Solar System Types (Hybrid, On-Grid, Off-Grid)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calculator_solar_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        name_bn VARCHAR(191) NULL,
        system_code VARCHAR(50) NOT NULL,
        tagline VARCHAR(255) NULL,
        description TEXT NULL,
        description_bn TEXT NULL,
        benefits JSON NULL,
        badge VARCHAR(50) NULL,
        min_recommended_watts INT DEFAULT 500,
        efficiency_factor DECIMAL(4, 2) DEFAULT 0.85,
        order_index INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Battery Chemistry Types (Lithium, Tubular, Gel)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calculator_battery_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        name_bn VARCHAR(191) NULL,
        battery_code VARCHAR(50) NOT NULL,
        tagline VARCHAR(255) NULL,
        description TEXT NULL,
        description_bn TEXT NULL,
        depth_of_discharge INT NOT NULL DEFAULT 90,
        lifespan_years VARCHAR(50) DEFAULT '10-15 Years',
        cycle_life INT DEFAULT 6000,
        maintenance VARCHAR(100) DEFAULT 'Zero Maintenance',
        badge VARCHAR(50) NULL,
        order_index INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Wattage Range Solar Recommendations & Website Product Linking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calculator_recommendations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(191) NOT NULL,
        title_bn VARCHAR(191) NULL,
        min_watt INT NOT NULL,
        max_watt INT NOT NULL,
        recommended_solar_kw DECIMAL(6, 2) NOT NULL,
        recommended_panels_count INT DEFAULT 3,
        recommended_panel_model VARCHAR(191) NULL,
        recommended_inverter_kw DECIMAL(6, 2) NOT NULL,
        recommended_inverter_model VARCHAR(191) NULL,
        recommended_battery_capacity VARCHAR(191) NULL,
        package_features JSON NULL,
        description TEXT NULL,
        description_bn TEXT NULL,
        suggested_product_ids JSON NULL,
        estimated_cost_bdt VARCHAR(100) NULL,
        estimated_cost_usd VARCHAR(100) NULL,
        order_index INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check and seed appliances
    const [appliancesRows]: any = await pool.query("SELECT id FROM calculator_appliances LIMIT 1");
    if (!appliancesRows || appliancesRows.length === 0) {
      await pool.query(`
        INSERT INTO calculator_appliances (name, name_bn, category, icon, default_unit, default_rating, default_watts, default_hours, default_quantity, order_index, is_active) VALUES
        ('Ceiling / Standing Fan', 'সিলিং / স্ট্যান্ডিং ফ্যান', 'cooling', 'Wind', 'watt', 65.00, 65, 12.0, 3, 1, TRUE),
        ('LED Lights / Tube Bulbs', 'এলইডি লাইট / টিউব লাইট', 'lighting', 'Lightbulb', 'watt', 15.00, 15, 6.0, 6, 2, TRUE),
        ('Refrigerator / Deep Fridge', 'রেফ্রিজারেটর / ডিপ ফ্রিজ', 'appliance', 'Snowflake', 'watt', 200.00, 200, 24.0, 1, 3, TRUE),
        ('Smart LED Television', 'স্মার্ট এলইডি টেলিভিশন', 'electronics', 'Tv', 'watt', 75.00, 75, 5.0, 1, 4, TRUE),
        ('Inverter AC (1.5 Ton)', 'ইনভার্টার এসি (১.৫ টন)', 'cooling', 'Snowflake', 'watt', 1400.00, 1400, 6.0, 0, 5, TRUE),
        ('Water Pump (1.0 HP)', 'পানির পাম্প (১.০ ঘোড়া/এইচপি)', 'heavy', 'Droplets', 'hp', 1.00, 746, 1.0, 0, 6, TRUE),
        ('Wi-Fi Router & CCTV System', 'ওয়াই-ফাই রাউটার ও সিসিটিভি', 'electronics', 'Wifi', 'watt', 25.00, 25, 24.0, 1, 7, TRUE),
        ('Desktop PC / Workstation', 'ডেস্কটপ পিসি / ল্যাপটপ', 'electronics', 'Laptop', 'watt', 120.00, 120, 6.0, 1, 8, TRUE),
        ('Microwave Oven', 'মাইক্রোওয়েভ ওভেন', 'appliance', 'Flame', 'watt', 1200.00, 1200, 0.5, 0, 9, TRUE),
        ('Washing Machine', 'ওয়াশিং মেশিন', 'appliance', 'Shirt', 'watt', 500.00, 500, 1.0, 0, 10, TRUE);
      `);
    }

    // Check and seed solar types
    const [solarTypesRows]: any = await pool.query("SELECT id FROM calculator_solar_types LIMIT 1");
    if (!solarTypesRows || solarTypesRows.length === 0) {
      await pool.query(`
        INSERT INTO calculator_solar_types (name, name_bn, system_code, tagline, description, description_bn, benefits, badge, min_recommended_watts, efficiency_factor, order_index, is_active) VALUES
        ('Smart Hybrid Solar System', 'স্মার্ট হাইব্রিড সোলার সিস্টেম', 'hybrid', 'Solar + Battery Storage + Grid Synchronization', 'Combines rooftop solar power, smart lithium/tubular battery backup, and utility grid connectivity for uninterrupted power and maximum savings.', 'সোলার বিদ্যুৎ, ব্যাটারি ব্যাকআপ এবং গ্রিড বিদ্যুৎ একসাথে সমন্বয় করে লোডশেডিংহীন নিরবচ্ছিন্ন বিদ্যুৎ নিশ্চিত করে।', '["Zero-blackout continuous 24/7 power", "Smart battery night backup", "Automatic grid net-metering export", "Real-time mobile app energy monitoring"]', 'Most Popular', 800, 0.88, 1, TRUE),
        ('Grid-Tied / On-Grid Solar System', 'অন-গ্রিড / গ্রিড-টাইড সোলার সিস্টেম', 'on_grid', 'Direct Solar Generation with Utility Net Metering', 'Feeds daytime solar power directly into your home and exports surplus electricity to the national grid to drastically reduce or eliminate utility bills.', 'দিনের বেলায় সরাসরি সোলার থেকে বিদ্যুৎ ব্যবহার করে এবং অতিরিক্ত বিদ্যুৎ গ্রিডে পাঠিয়ে বিদ্যুৎ বিল প্রায় শূন্যে নামিয়ে আনে।', '["Lowest initial capital cost & highest ROI", "Government Net Metering compatible", "No battery replacement costs", "Payback period within 3-4 years"]', 'Highest ROI', 1000, 0.92, 2, TRUE),
        ('Standalone Off-Grid Solar System', 'অফ-গ্রিড / স্ট্যান্ডঅ্যালোন সোলার সিস্টেম', 'off_grid', '100% Energy Independence with Deep Battery Bank', 'Designed for remote locations, farms, and industrial setups without reliable national grid connectivity.', 'যেসব এলাকায় গ্রিড বিদ্যুৎ নেই বা ঘন ঘন লোডশেডিং হয়, তাদের জন্য সম্পূর্ণ স্বাধীন সোলার ও শক্তিশালী ব্যাটারি ব্যবস্থা।', '["100% Independent from utility grid outages", "Robust heavy-duty battery storage", "Ideal for rural farms, resorts & factories", "Clean green power anywhere"]', 'Complete Freedom', 500, 0.82, 3, TRUE);
      `);
    }

    // Check and seed battery types
    const [batteryTypesRows]: any = await pool.query("SELECT id FROM calculator_battery_types LIMIT 1");
    if (!batteryTypesRows || batteryTypesRows.length === 0) {
      await pool.query(`
        INSERT INTO calculator_battery_types (name, name_bn, battery_code, tagline, description, description_bn, depth_of_discharge, lifespan_years, cycle_life, maintenance, badge, order_index, is_active) VALUES
        ('Lithium-ion (LiFePO4) Battery', 'লিথিয়াম আয়ন (LiFePO4) ব্যাটারি', 'lithium', 'Next-Gen Ultra Compact & Deep Cycle', 'Ultra-safe Lithium Iron Phosphate (LiFePO4) technology delivering 90% usable depth of discharge with over 6,000 charge cycles and zero maintenance.', 'সর্বাধুনিক লিথিয়াম আয়রন ফসফেট প্রযুক্তি যা ৯০% পর্যন্ত ব্যবহারযোগ্য ব্যাকআপ দেয়, ১০-১৫ বছর স্থায়ী এবং কোনো রক্ষণাবেক্ষণ লাগে না।', 90, '12-15 Years', 6000, 'Zero Maintenance', 'Recommended', 1, TRUE),
        ('Deep Cycle Tubular Battery (Watered)', 'টিউবুলার লেড-অ্যাসিড ব্যাটারি (পানি দেওয়া ব্যাটারি)', 'tubular', 'Heavy-Duty & Economical Flooded Lead-Acid', 'Traditional heavy-duty tubular plate lead-acid battery. Reliable and cost-effective, requiring periodic distilled water topping.', 'ঐতিহ্যবাহী ভারী টিউবুলার ব্যাটারি যা সাশ্রয়ী মূল্যে ভালো ব্যাকআপ দেয়। নির্দিষ্ট সময় পর পর ডিস্টিল্ড ওয়াটার দিতে হয়।', 50, '4-6 Years', 1500, 'Distilled Water Topping Required', 'Cost Effective', 2, TRUE),
        ('Maintenance-Free Gel VRLA Battery', 'সিলড জেল (GEL VRLA) ব্যাটারি', 'gel', 'Sealed & Safe Deep Cycle Storage', 'Sealed valve-regulated gel electrolyte battery offering dependable deep cycle performance without any acid fumes or maintenance.', 'সম্পূর্ণ সিল করা জেল ব্যাটারি যা লিকপ্রুফ, কোনো গ্যাস নির্গমন করে না এবং রক্ষণাবেক্ষণ ছাড়াই দীর্ঘদিন চলে।', 60, '6-8 Years', 2500, 'Zero Maintenance (Sealed)', 'Reliable', 3, TRUE);
      `);
    }

    // Check and seed recommendations
    const [recRows]: any = await pool.query("SELECT id FROM calculator_recommendations LIMIT 1");
    if (!recRows || recRows.length === 0) {
      // Find top product IDs if available
      const [productRows]: any = await pool.query("SELECT id FROM products WHERE status = 'published' LIMIT 3");
      const defaultProductIds = productRows && productRows.length > 0 ? productRows.map((p: any) => p.id) : [];

      await pool.query(`
        INSERT INTO calculator_recommendations (title, title_bn, min_watt, max_watt, recommended_solar_kw, recommended_panels_count, recommended_panel_model, recommended_inverter_kw, recommended_inverter_model, recommended_battery_capacity, package_features, description, description_bn, suggested_product_ids, estimated_cost_bdt, estimated_cost_usd, order_index, is_active) VALUES
        ('Solvex 600W Micro Residential Kit', 'সলভেক্স ৬০০W মাইক্রো রেসিডেন্সিয়াল কিট', 0, 600, 0.70, 2, 'Solvex 350W-400W Mono Perc Modules', 1.00, 'Solvex 1kVA Pure Sine Wave Inverter', '1.2 kWh LiFePO4 or 1x 150Ah Tubular', '["Powers 3 Fans, 6 LED Lights, TV & Router", "Compact rooftop footprint ~50 sq.ft", "Full surge & lightning protection"]', 'Perfect starter solar system for small apartments, offices, and rural residences.', 'ছোট বাসা, ফ্ল্যাট বা গ্রামীণ বাড়ির ফ্যান ও লাইট নিরবচ্ছিন্নভাবে চালানোর সেরা সমাধান।', '${JSON.stringify(defaultProductIds)}', '৳75,000 - ৳95,000', '$650 - $800', 1, TRUE),
        ('Solvex 1.5kW Smart Home Hybrid Package', 'সলভেক্স ১.৫kW স্মার্ট হোম হাইব্রিড প্যাকেজ', 601, 1200, 1.74, 3, 'Solvex 580W Bifacial N-Type TOPCon Modules', 2.00, 'Solvex 2.0kW Smart Hybrid Inverter', '2.4 kWh LiFePO4 or 2x 150Ah Tubular', '["Supports Refrigerator + Fans + Lights + PC", "Bifacial TOPCon extra rear-side gain", "Smart Wi-Fi mobile monitoring", "Automatic uninterrupted changeover"]', 'Our most popular mid-tier system designed for modern households running refrigerators, computing gear, and full lighting.', 'ফ্রিজ, টিভি, ফ্যান ও লাইটসহ সম্পূর্ণ পারিবারিক বিদ্যুতের চাহিদা মেটানোর আদর্শ স্মার্ট সোলার প্যাকেজ।', '${JSON.stringify(defaultProductIds)}', '৳1,65,000 - ৳1,95,000', '$1,400 - $1,650', 2, TRUE),
        ('Solvex 3.2kW Premium Executive Villa Package', 'সলভেক্স ৩.২kW প্রিমিয়াম এক্সিকিউটিভ ভিলা প্যাকেজ', 1201, 2500, 3.48, 6, 'Solvex 580W Bifacial N-Type TOPCon Modules', 4.00, 'Solvex 4.0kW High-Efficiency Hybrid Inverter', '5.0 kWh LiFePO4 or 4x 200Ah Tubular', '["Runs 1.5 Ton Inverter AC + Refrigerator + Fans", "High-voltage MPPT efficiency up to 98.6%", "LiFePO4 modular wall-mount battery bank", "Substantial monthly grid bill offset"]', 'Designed for spacious multi-bedroom apartments and villas requiring AC and heavy appliance support during power outages.', '১.৫ টন ইনভার্টার এসি, ফ্রিজ ও সকল পারিবারিক সরঞ্জাম অনায়াসে চালানোর শক্তিশালী প্রিমিয়াম সমাধান।', '${JSON.stringify(defaultProductIds)}', '৳3,20,000 - ৳3,80,000', '$2,700 - $3,200', 3, TRUE),
        ('Solvex 6.0kW High-Capacity Commercial / Duplex Solution', 'সলভেক্স ৬.০kW হাই-ক্যাপাসিটি কমার্শিয়াল ও ডুপ্লেক্স সলিউশন', 2501, 6000, 6.96, 12, 'Solvex 580W-700W Bifacial N-Type Modules', 8.00, 'Solvex 8.0kW Smart 3-Phase / 1-Phase Hybrid Inverter', '10.0 kWh LiFePO4 Energy Storage Rack', '["Multiple Inverter ACs + Water Pump + Machinery", "Grid export net-metering ready", "Industrial grade surge & weatherproofing", "25-Year performance warranty"]', 'Heavy-duty system for duplex homes, corporate offices, rooftop restaurants, and commercial institutions.', 'ডুপ্লেক্স বাড়ি, করপোরেট অফিস, শোরুম ও বাণিজ্যিক প্রতিষ্ঠানের জন্য সর্বোত্তম শক্তিশালী সোলার প্ল্যান্ট।', '${JSON.stringify(defaultProductIds)}', '৳5,80,000 - ৳6,90,000', '$4,900 - $5,800', 4, TRUE),
        ('Solvex Enterprise Utility & Industrial Solar Plant', 'সলভেক্স এন্টারপ্রাইজ ইন্ডাস্ট্রিয়াল মেগা সোলার প্ল্যান্ট', 6001, 50000, 15.00, 26, 'Solvex 700W N-Type Industrial Modules', 20.00, 'Solvex Commercial Grid-Tied Inverter Array', 'Scalable High-Voltage BESS Storage', '["Custom tailored engineering sizing", "Factory & warehouse rooftop megawatt scale", "Government net-metering integration", "Dedicated EPC project management"]', 'Enterprise-grade industrial solar installation engineered specifically to your exact load profile.', 'কারখানা ও বৃহৎ বাণিজ্যিক প্রতিষ্ঠানের জন্য কাস্টমাইজড মেগা সোলার ইঞ্জিনিয়ারিং সলিউশন।', '${JSON.stringify(defaultProductIds)}', 'Contact for Custom EPC Quote', 'Custom Quote', 5, TRUE);
      `);
    }

    tablesInitialized = true;
  } catch (error) {
    console.error("ensureCalculatorTables error:", error);
  }
};

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

/**
 * GET /api/calculator/data
 * Returns active appliances, active solar types, active battery types,
 * and recommendations with populated suggested products.
 */
export const getPublicCalculatorData = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();

    // 1. Fetch active appliances
    const [appliances]: any = await pool.query(
      "SELECT * FROM calculator_appliances WHERE is_active = TRUE ORDER BY order_index ASC, id ASC"
    );

    // 2. Fetch active solar types
    const [solarTypes]: any = await pool.query(
      "SELECT * FROM calculator_solar_types WHERE is_active = TRUE ORDER BY order_index ASC, id ASC"
    );

    // 3. Fetch active battery types
    const [batteryTypes]: any = await pool.query(
      "SELECT * FROM calculator_battery_types WHERE is_active = TRUE ORDER BY order_index ASC, id ASC"
    );

    // 4. Fetch active recommendations
    const [recommendations]: any = await pool.query(
      "SELECT * FROM calculator_recommendations WHERE is_active = TRUE ORDER BY min_watt ASC, order_index ASC"
    );

    // Collect all suggested product IDs across recommendations
    const allProductIds = new Set<number>();
    for (const rec of recommendations) {
      if (Array.isArray(rec.suggested_product_ids)) {
        rec.suggested_product_ids.forEach((id: number) => allProductIds.add(id));
      } else if (typeof rec.suggested_product_ids === "string") {
        try {
          const parsed = JSON.parse(rec.suggested_product_ids);
          if (Array.isArray(parsed)) {
            parsed.forEach((id: number) => allProductIds.add(id));
            rec.suggested_product_ids = parsed;
          }
        } catch {
          rec.suggested_product_ids = [];
        }
      } else {
        rec.suggested_product_ids = [];
      }

      // Parse package features if string
      if (typeof rec.package_features === "string") {
        try {
          rec.package_features = JSON.parse(rec.package_features);
        } catch {
          rec.package_features = [];
        }
      }
    }

    // Parse solar types benefits if string
    for (const st of solarTypes) {
      if (typeof st.benefits === "string") {
        try {
          st.benefits = JSON.parse(st.benefits);
        } catch {
          st.benefits = [];
        }
      }
    }

    // Fetch products map if there are suggested product IDs
    const productsMap: Record<number, any> = {};
    if (allProductIds.size > 0) {
      const idsArray = Array.from(allProductIds);
      const [prods]: any = await pool.query(
        `SELECT id, title, slug, category, price, stock, image, features, description FROM products WHERE id IN (${idsArray.map(() => "?").join(",")})`,
        idsArray
      );
      if (Array.isArray(prods)) {
        prods.forEach((p) => {
          if (typeof p.features === "string") {
            try {
              p.features = JSON.parse(p.features);
            } catch {
              p.features = [];
            }
          }
          productsMap[p.id] = p;
        });
      }
    }

    // Attach populated suggested products to each recommendation
    const enrichedRecommendations = recommendations.map((rec: any) => {
      const suggestedProducts = (rec.suggested_product_ids || [])
        .map((pid: number) => productsMap[pid])
        .filter(Boolean);
      return {
        ...rec,
        suggestedProducts,
      };
    });

    res.json({
      success: true,
      data: {
        appliances,
        solarTypes,
        batteryTypes,
        recommendations: enrichedRecommendations,
      },
    });
  } catch (error: any) {
    console.error("getPublicCalculatorData error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// APPLIANCES CRUD (ADMIN)
// ==========================================

export const getAppliances = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const [rows]: any = await pool.query(
      "SELECT * FROM calculator_appliances ORDER BY order_index ASC, id ASC"
    );
    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAppliance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const {
      name,
      name_bn,
      category = "cooling",
      icon = "Zap",
      default_unit = "watt",
      default_rating = 65,
      default_hours = 6.0,
      default_quantity = 1,
      order_index = 0,
      is_active = true,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: "Appliance name is required." });
      return;
    }

    // Calculate default_watts based on unit
    // If unit is 'hp', 1 HP = 746W
    const ratingNum = Number(default_rating) || 1;
    const default_watts = default_unit === "hp" ? Math.round(ratingNum * 746) : Math.round(ratingNum);

    const [result]: any = await pool.query(
      `INSERT INTO calculator_appliances 
       (name, name_bn, category, icon, default_unit, default_rating, default_watts, default_hours, default_quantity, order_index, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        name_bn || null,
        category,
        icon,
        default_unit,
        ratingNum,
        default_watts,
        Number(default_hours) || 6,
        Number(default_quantity) || 1,
        Number(order_index) || 0,
        is_active ? 1 : 0,
      ]
    );

    const [created]: any = await pool.query(
      "SELECT * FROM calculator_appliances WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({ success: true, data: created[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAppliance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    const {
      name,
      name_bn,
      category,
      icon,
      default_unit,
      default_rating,
      default_hours,
      default_quantity,
      order_index,
      is_active,
    } = req.body;

    const ratingNum = default_rating !== undefined ? Number(default_rating) : undefined;
    let default_watts = undefined;
    if (ratingNum !== undefined && default_unit !== undefined) {
      default_watts = default_unit === "hp" ? Math.round(ratingNum * 746) : Math.round(ratingNum);
    }

    await pool.query(
      `UPDATE calculator_appliances SET
        name = COALESCE(?, name),
        name_bn = COALESCE(?, name_bn),
        category = COALESCE(?, category),
        icon = COALESCE(?, icon),
        default_unit = COALESCE(?, default_unit),
        default_rating = COALESCE(?, default_rating),
        default_watts = COALESCE(?, default_watts),
        default_hours = COALESCE(?, default_hours),
        default_quantity = COALESCE(?, default_quantity),
        order_index = COALESCE(?, order_index),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name,
        name_bn,
        category,
        icon,
        default_unit,
        ratingNum,
        default_watts,
        default_hours,
        default_quantity,
        order_index,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
      ]
    );

    const [updated]: any = await pool.query(
      "SELECT * FROM calculator_appliances WHERE id = ?",
      [id]
    );

    res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAppliance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    await pool.query("DELETE FROM calculator_appliances WHERE id = ?", [id]);
    res.json({ success: true, message: "Appliance deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// SOLAR TYPES CRUD (ADMIN)
// ==========================================

export const getSolarTypes = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const [rows]: any = await pool.query(
      "SELECT * FROM calculator_solar_types ORDER BY order_index ASC, id ASC"
    );
    const parsed = rows.map((r: any) => ({
      ...r,
      benefits: typeof r.benefits === "string" ? JSON.parse(r.benefits) : r.benefits,
    }));
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSolarType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const {
      name,
      name_bn,
      system_code,
      tagline,
      description,
      description_bn,
      benefits,
      badge,
      min_recommended_watts = 500,
      efficiency_factor = 0.85,
      order_index = 0,
      is_active = true,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: "Solar type name is required." });
      return;
    }

    const code = system_code || name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const benefitsJson = Array.isArray(benefits) ? JSON.stringify(benefits) : JSON.stringify([]);

    const [result]: any = await pool.query(
      `INSERT INTO calculator_solar_types
       (name, name_bn, system_code, tagline, description, description_bn, benefits, badge, min_recommended_watts, efficiency_factor, order_index, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        name_bn || null,
        code,
        tagline || null,
        description || null,
        description_bn || null,
        benefitsJson,
        badge || null,
        Number(min_recommended_watts) || 500,
        Number(efficiency_factor) || 0.85,
        Number(order_index) || 0,
        is_active ? 1 : 0,
      ]
    );

    const [created]: any = await pool.query(
      "SELECT * FROM calculator_solar_types WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json({ success: true, data: created[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSolarType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    const {
      name,
      name_bn,
      system_code,
      tagline,
      description,
      description_bn,
      benefits,
      badge,
      min_recommended_watts,
      efficiency_factor,
      order_index,
      is_active,
    } = req.body;

    const benefitsJson = benefits !== undefined ? (Array.isArray(benefits) ? JSON.stringify(benefits) : benefits) : null;

    await pool.query(
      `UPDATE calculator_solar_types SET
        name = COALESCE(?, name),
        name_bn = COALESCE(?, name_bn),
        system_code = COALESCE(?, system_code),
        tagline = COALESCE(?, tagline),
        description = COALESCE(?, description),
        description_bn = COALESCE(?, description_bn),
        benefits = COALESCE(?, benefits),
        badge = COALESCE(?, badge),
        min_recommended_watts = COALESCE(?, min_recommended_watts),
        efficiency_factor = COALESCE(?, efficiency_factor),
        order_index = COALESCE(?, order_index),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name,
        name_bn,
        system_code,
        tagline,
        description,
        description_bn,
        benefitsJson,
        badge,
        min_recommended_watts,
        efficiency_factor,
        order_index,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
      ]
    );

    const [updated]: any = await pool.query(
      "SELECT * FROM calculator_solar_types WHERE id = ?",
      [id]
    );
    res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSolarType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    await pool.query("DELETE FROM calculator_solar_types WHERE id = ?", [id]);
    res.json({ success: true, message: "Solar type deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// BATTERY TYPES CRUD (ADMIN)
// ==========================================

export const getBatteryTypes = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const [rows]: any = await pool.query(
      "SELECT * FROM calculator_battery_types ORDER BY order_index ASC, id ASC"
    );
    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBatteryType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const {
      name,
      name_bn,
      battery_code,
      tagline,
      description,
      description_bn,
      depth_of_discharge = 90,
      lifespan_years = "10-15 Years",
      cycle_life = 6000,
      maintenance = "Zero Maintenance",
      badge,
      order_index = 0,
      is_active = true,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: "Battery type name is required." });
      return;
    }

    const code = battery_code || name.toLowerCase().replace(/[^a-z0-9]+/g, "_");

    const [result]: any = await pool.query(
      `INSERT INTO calculator_battery_types
       (name, name_bn, battery_code, tagline, description, description_bn, depth_of_discharge, lifespan_years, cycle_life, maintenance, badge, order_index, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        name_bn || null,
        code,
        tagline || null,
        description || null,
        description_bn || null,
        Number(depth_of_discharge) || 90,
        lifespan_years || "10-15 Years",
        Number(cycle_life) || 6000,
        maintenance || "Zero Maintenance",
        badge || null,
        Number(order_index) || 0,
        is_active ? 1 : 0,
      ]
    );

    const [created]: any = await pool.query(
      "SELECT * FROM calculator_battery_types WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json({ success: true, data: created[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBatteryType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    const {
      name,
      name_bn,
      battery_code,
      tagline,
      description,
      description_bn,
      depth_of_discharge,
      lifespan_years,
      cycle_life,
      maintenance,
      badge,
      order_index,
      is_active,
    } = req.body;

    await pool.query(
      `UPDATE calculator_battery_types SET
        name = COALESCE(?, name),
        name_bn = COALESCE(?, name_bn),
        battery_code = COALESCE(?, battery_code),
        tagline = COALESCE(?, tagline),
        description = COALESCE(?, description),
        description_bn = COALESCE(?, description_bn),
        depth_of_discharge = COALESCE(?, depth_of_discharge),
        lifespan_years = COALESCE(?, lifespan_years),
        cycle_life = COALESCE(?, cycle_life),
        maintenance = COALESCE(?, maintenance),
        badge = COALESCE(?, badge),
        order_index = COALESCE(?, order_index),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name,
        name_bn,
        battery_code,
        tagline,
        description,
        description_bn,
        depth_of_discharge,
        lifespan_years,
        cycle_life,
        maintenance,
        badge,
        order_index,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
      ]
    );

    const [updated]: any = await pool.query(
      "SELECT * FROM calculator_battery_types WHERE id = ?",
      [id]
    );
    res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBatteryType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    await pool.query("DELETE FROM calculator_battery_types WHERE id = ?", [id]);
    res.json({ success: true, message: "Battery type deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// RECOMMENDATIONS / WATT RANGE CRUD (ADMIN)
// ==========================================

export const getRecommendations = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const [rows]: any = await pool.query(
      "SELECT * FROM calculator_recommendations ORDER BY min_watt ASC, order_index ASC"
    );
    const parsed = rows.map((r: any) => ({
      ...r,
      package_features: typeof r.package_features === "string" ? JSON.parse(r.package_features) : r.package_features,
      suggested_product_ids: typeof r.suggested_product_ids === "string" ? JSON.parse(r.suggested_product_ids) : r.suggested_product_ids,
    }));
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createRecommendation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const {
      title,
      title_bn,
      min_watt,
      max_watt,
      recommended_solar_kw,
      recommended_panels_count = 3,
      recommended_panel_model,
      recommended_inverter_kw,
      recommended_inverter_model,
      recommended_battery_capacity,
      package_features,
      description,
      description_bn,
      suggested_product_ids,
      estimated_cost_bdt,
      estimated_cost_usd,
      order_index = 0,
      is_active = true,
    } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ success: false, message: "Recommendation title is required." });
      return;
    }
    if (min_watt === undefined || max_watt === undefined) {
      res.status(400).json({ success: false, message: "Min Watt and Max Watt ranges are required." });
      return;
    }

    const featuresJson = Array.isArray(package_features) ? JSON.stringify(package_features) : JSON.stringify([]);
    const productIdsJson = Array.isArray(suggested_product_ids) ? JSON.stringify(suggested_product_ids) : JSON.stringify([]);

    const [result]: any = await pool.query(
      `INSERT INTO calculator_recommendations
       (title, title_bn, min_watt, max_watt, recommended_solar_kw, recommended_panels_count, recommended_panel_model, recommended_inverter_kw, recommended_inverter_model, recommended_battery_capacity, package_features, description, description_bn, suggested_product_ids, estimated_cost_bdt, estimated_cost_usd, order_index, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        title_bn || null,
        Number(min_watt),
        Number(max_watt),
        Number(recommended_solar_kw) || 1.5,
        Number(recommended_panels_count) || 3,
        recommended_panel_model || null,
        Number(recommended_inverter_kw) || 2.0,
        recommended_inverter_model || null,
        recommended_battery_capacity || null,
        featuresJson,
        description || null,
        description_bn || null,
        productIdsJson,
        estimated_cost_bdt || null,
        estimated_cost_usd || null,
        Number(order_index) || 0,
        is_active ? 1 : 0,
      ]
    );

    const [created]: any = await pool.query(
      "SELECT * FROM calculator_recommendations WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json({ success: true, data: created[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRecommendation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    const {
      title,
      title_bn,
      min_watt,
      max_watt,
      recommended_solar_kw,
      recommended_panels_count,
      recommended_panel_model,
      recommended_inverter_kw,
      recommended_inverter_model,
      recommended_battery_capacity,
      package_features,
      description,
      description_bn,
      suggested_product_ids,
      estimated_cost_bdt,
      estimated_cost_usd,
      order_index,
      is_active,
    } = req.body;

    const featuresJson = package_features !== undefined ? (Array.isArray(package_features) ? JSON.stringify(package_features) : package_features) : null;
    const productIdsJson = suggested_product_ids !== undefined ? (Array.isArray(suggested_product_ids) ? JSON.stringify(suggested_product_ids) : suggested_product_ids) : null;

    await pool.query(
      `UPDATE calculator_recommendations SET
        title = COALESCE(?, title),
        title_bn = COALESCE(?, title_bn),
        min_watt = COALESCE(?, min_watt),
        max_watt = COALESCE(?, max_watt),
        recommended_solar_kw = COALESCE(?, recommended_solar_kw),
        recommended_panels_count = COALESCE(?, recommended_panels_count),
        recommended_panel_model = COALESCE(?, recommended_panel_model),
        recommended_inverter_kw = COALESCE(?, recommended_inverter_kw),
        recommended_inverter_model = COALESCE(?, recommended_inverter_model),
        recommended_battery_capacity = COALESCE(?, recommended_battery_capacity),
        package_features = COALESCE(?, package_features),
        description = COALESCE(?, description),
        description_bn = COALESCE(?, description_bn),
        suggested_product_ids = COALESCE(?, suggested_product_ids),
        estimated_cost_bdt = COALESCE(?, estimated_cost_bdt),
        estimated_cost_usd = COALESCE(?, estimated_cost_usd),
        order_index = COALESCE(?, order_index),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        title,
        title_bn,
        min_watt,
        max_watt,
        recommended_solar_kw,
        recommended_panels_count,
        recommended_panel_model,
        recommended_inverter_kw,
        recommended_inverter_model,
        recommended_battery_capacity,
        featuresJson,
        description,
        description_bn,
        productIdsJson,
        estimated_cost_bdt,
        estimated_cost_usd,
        order_index,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
      ]
    );

    const [updated]: any = await pool.query(
      "SELECT * FROM calculator_recommendations WHERE id = ?",
      [id]
    );
    res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRecommendation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    await pool.query("DELETE FROM calculator_recommendations WHERE id = ?", [id]);
    res.json({ success: true, message: "Recommendation deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
