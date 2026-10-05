import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { pool } from "../db/index.js";

let tablesInitialized = false;

// In-Memory cache for ultra-fast calculator data (<2ms response)
let cachedPublicCalculatorData: any = null;
let publicCalculatorCacheExpiry = 0;
const PUBLIC_CALCULATOR_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export const invalidateCalculatorCache = (): void => {
  cachedPublicCalculatorData = null;
  publicCalculatorCacheExpiry = 0;
};

const ensureIndex = async (table: string, indexName: string, columns: string): Promise<void> => {
  try {
    const [existing]: any = await pool.query(`SHOW INDEX FROM ${table} WHERE Key_name = ?`, [indexName]);
    if (!existing || existing.length === 0) {
      await pool.query(`ALTER TABLE ${table} ADD INDEX ${indexName} (${columns})`);
    }
  } catch (_e) {}
};

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
        inverter_id INT NULL,
        min_watt INT DEFAULT 0,
        max_watt INT DEFAULT 0,
        model VARCHAR(191) NULL,
        price_bdt VARCHAR(100) NULL,
        price_usd VARCHAR(100) NULL,
        features JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure columns on existing table
    try {
      const [solarCols]: any = await pool.query("SHOW COLUMNS FROM calculator_solar_types");
      const solarColNames = solarCols.map((c: any) => c.Field);
      if (!solarColNames.includes("inverter_id")) await pool.query("ALTER TABLE calculator_solar_types ADD COLUMN inverter_id INT NULL");
      if (!solarColNames.includes("min_watt")) await pool.query("ALTER TABLE calculator_solar_types ADD COLUMN min_watt INT DEFAULT 0");
      if (!solarColNames.includes("max_watt")) await pool.query("ALTER TABLE calculator_solar_types ADD COLUMN max_watt INT DEFAULT 0");
      if (!solarColNames.includes("model")) await pool.query("ALTER TABLE calculator_solar_types ADD COLUMN model VARCHAR(191) NULL");
      if (!solarColNames.includes("price_bdt")) await pool.query("ALTER TABLE calculator_solar_types ADD COLUMN price_bdt VARCHAR(100) NULL");
      if (!solarColNames.includes("price_usd")) await pool.query("ALTER TABLE calculator_solar_types ADD COLUMN price_usd VARCHAR(100) NULL");
      if (!solarColNames.includes("features")) await pool.query("ALTER TABLE calculator_solar_types ADD COLUMN features JSON NULL");
    } catch (_e) {}

    // 3. Battery Chemistry Types (Lithium, Tubular, Gel)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calculator_battery_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inverter_id INT NULL,
        name VARCHAR(191) NOT NULL,
        name_bn VARCHAR(191) NULL,
        battery_code VARCHAR(50) NOT NULL,
        min_watt INT DEFAULT 0,
        max_watt INT DEFAULT 0,
        model VARCHAR(191) NULL,
        price_bdt VARCHAR(100) NULL,
        price_usd VARCHAR(100) NULL,
        features JSON NULL,
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

    // Ensure columns on existing battery table
    try {
      const [batteryCols]: any = await pool.query("SHOW COLUMNS FROM calculator_battery_types");
      const batteryColNames = batteryCols.map((c: any) => c.Field);
      if (!batteryColNames.includes("inverter_id")) await pool.query("ALTER TABLE calculator_battery_types ADD COLUMN inverter_id INT NULL");
      if (!batteryColNames.includes("min_watt")) await pool.query("ALTER TABLE calculator_battery_types ADD COLUMN min_watt INT DEFAULT 0");
      if (!batteryColNames.includes("max_watt")) await pool.query("ALTER TABLE calculator_battery_types ADD COLUMN max_watt INT DEFAULT 0");
      if (!batteryColNames.includes("model")) await pool.query("ALTER TABLE calculator_battery_types ADD COLUMN model VARCHAR(191) NULL");
      if (!batteryColNames.includes("price_bdt")) await pool.query("ALTER TABLE calculator_battery_types ADD COLUMN price_bdt VARCHAR(100) NULL");
      if (!batteryColNames.includes("price_usd")) await pool.query("ALTER TABLE calculator_battery_types ADD COLUMN price_usd VARCHAR(100) NULL");
      if (!batteryColNames.includes("features")) await pool.query("ALTER TABLE calculator_battery_types ADD COLUMN features JSON NULL");
    } catch (_e) {}

    // 4. Wattage Range Solar Recommendations & Website Product Linking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calculator_recommendations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(191) NOT NULL,
        title_bn VARCHAR(191) NULL,
        inverter_type VARCHAR(50) NOT NULL DEFAULT 'hybrid',
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

    // Ensure columns on existing calculator_recommendations table
    try {
      const [recCols]: any = await pool.query("SHOW COLUMNS FROM calculator_recommendations");
      const recColNames = recCols.map((c: any) => c.Field);
      if (!recColNames.includes("inverter_type")) {
        await pool.query("ALTER TABLE calculator_recommendations ADD COLUMN inverter_type VARCHAR(50) NOT NULL DEFAULT 'hybrid'");
      }
    } catch (_e) {}

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

    // 5. Installation Areas & Dynamic Services
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calculator_areas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inverter_id INT NULL,
        name VARCHAR(191) NOT NULL,
        name_bn VARCHAR(191) NULL,
        min_watt INT DEFAULT 0,
        max_watt INT DEFAULT 0,
        services JSON NULL,
        order_index INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure columns on existing areas table
    try {
      const [areaCols]: any = await pool.query("SHOW COLUMNS FROM calculator_areas");
      const areaColNames = areaCols.map((c: any) => c.Field);
      if (!areaColNames.includes("inverter_id")) await pool.query("ALTER TABLE calculator_areas ADD COLUMN inverter_id INT NULL");
      if (!areaColNames.includes("name_bn")) await pool.query("ALTER TABLE calculator_areas ADD COLUMN name_bn VARCHAR(191) NULL");
      if (!areaColNames.includes("min_watt")) await pool.query("ALTER TABLE calculator_areas ADD COLUMN min_watt INT DEFAULT 0");
      if (!areaColNames.includes("max_watt")) await pool.query("ALTER TABLE calculator_areas ADD COLUMN max_watt INT DEFAULT 0");
      if (!areaColNames.includes("services")) await pool.query("ALTER TABLE calculator_areas ADD COLUMN services JSON NULL");
    } catch (_e) {}

    // Check and seed areas
    const [areaRows]: any = await pool.query("SELECT id FROM calculator_areas LIMIT 1");
    if (!areaRows || areaRows.length === 0) {
      const [allInverters]: any = await pool.query("SELECT id, min_watt, max_watt FROM calculator_recommendations ORDER BY min_watt ASC");
      const inv0 = allInverters && allInverters[0] ? allInverters[0] : { id: null, min_watt: 0, max_watt: 600 };
      const inv1 = allInverters && allInverters[1] ? allInverters[1] : inv0;
      const inv2 = allInverters && allInverters[2] ? allInverters[2] : inv0;
      const inv3 = allInverters && allInverters[3] ? allInverters[3] : inv0;
      const inv4 = allInverters && allInverters[4] ? allInverters[4] : inv0;

      await pool.query(`
        INSERT INTO calculator_areas (inverter_id, name, name_bn, min_watt, max_watt, services, order_index, is_active) VALUES
        (${inv0.id || 'NULL'}, 'Dhaka City (Metropolitan)', 'ঢাকা মেট্রোপলিটন এলাকা', ${inv0.min_watt || 0}, ${inv0.max_watt || 600}, '${JSON.stringify([
          { id: "srv-1", name: "Service charge", price: 500 },
          { id: "srv-2", name: "Site Inspection & Solar Feasibility", price: 1000 },
          { id: "srv-3", name: "Standard Electrical & Rooftop Mounting", price: 2500 }
        ])}', 1, TRUE),
        (${inv1.id || 'NULL'}, 'Dhaka Suburbs (Gazipur, Savar, Narayanganj)', 'ঢাকা উপশহর ও শিল্পাঞ্চল', ${inv1.min_watt || 601}, ${inv1.max_watt || 1200}, '${JSON.stringify([
          { id: "srv-1", name: "Service charge", price: 700 },
          { id: "srv-2", name: "Suburban Logistics & Site Survey", price: 1500 },
          { id: "srv-3", name: "Standard Electrical & Rooftop Mounting", price: 3000 }
        ])}', 2, TRUE),
        (${inv2.id || 'NULL'}, 'Chittagong & Coastal Division', 'চট্টগ্রাম ও উপকূলীয় অঞ্চল', ${inv2.min_watt || 1201}, ${inv2.max_watt || 2500}, '${JSON.stringify([
          { id: "srv-1", name: "Service charge", price: 800 },
          { id: "srv-2", name: "Coastal Weatherproof Survey", price: 2000 },
          { id: "srv-3", name: "Heavy Duty Electrical Commissioning", price: 3500 }
        ])}', 3, TRUE),
        (${inv3.id || 'NULL'}, 'Sylhet & North Bengal Division', 'সিলেট ও উত্তরবঙ্গ বিভাগ', ${inv3.min_watt || 2501}, ${inv3.max_watt || 6000}, '${JSON.stringify([
          { id: "srv-1", name: "Service charge", price: 1000 },
          { id: "srv-2", name: "Divisional Technical Transport & Survey", price: 2500 },
          { id: "srv-3", name: "Array Installation & Grid Linking", price: 4000 }
        ])}', 4, TRUE),
        (${inv4.id || 'NULL'}, 'All Bangladesh (Nationwide Remote Outstation)', 'সমগ্র বাংলাদেশ (দূরবর্তী ও প্রত্যন্ত অঞ্চল)', ${inv4.min_watt || 6001}, ${inv4.max_watt || 50000}, '${JSON.stringify([
          { id: "srv-1", name: "Service charge", price: 1500 },
          { id: "srv-2", name: "Nationwide Heavy Logistics & Delivery", price: 3000 },
          { id: "srv-3", name: "Full Turnkey Industrial EPC Installation", price: 5000 }
        ])}', 5, TRUE);
      `);
    }

    // 6. Solar Panels Catalog
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calculator_panels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inverter_id INT NULL,
        area_id INT NULL,
        name VARCHAR(191) NOT NULL,
        name_bn VARCHAR(191) NULL,
        model VARCHAR(191) NULL,
        min_watt INT DEFAULT 0,
        max_watt INT DEFAULT 0,
        wattage INT DEFAULT 580,
        price_bdt VARCHAR(100) NULL,
        price_usd VARCHAR(100) NULL,
        features JSON NULL,
        efficiency VARCHAR(50) NULL,
        warranty_years VARCHAR(50) DEFAULT '25 Years',
        description TEXT NULL,
        description_bn TEXT NULL,
        order_index INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure columns on existing panels table
    try {
      const [panelCols]: any = await pool.query("SHOW COLUMNS FROM calculator_panels");
      const panelColNames = panelCols.map((c: any) => c.Field);
      if (!panelColNames.includes("inverter_id")) await pool.query("ALTER TABLE calculator_panels ADD COLUMN inverter_id INT NULL");
      if (!panelColNames.includes("area_id")) await pool.query("ALTER TABLE calculator_panels ADD COLUMN area_id INT NULL");
      if (!panelColNames.includes("name_bn")) await pool.query("ALTER TABLE calculator_panels ADD COLUMN name_bn VARCHAR(191) NULL");
      if (!panelColNames.includes("model")) await pool.query("ALTER TABLE calculator_panels ADD COLUMN model VARCHAR(191) NULL");
      if (!panelColNames.includes("min_watt")) await pool.query("ALTER TABLE calculator_panels ADD COLUMN min_watt INT DEFAULT 0");
      if (!panelColNames.includes("max_watt")) await pool.query("ALTER TABLE calculator_panels ADD COLUMN max_watt INT DEFAULT 0");
      if (!panelColNames.includes("wattage")) await pool.query("ALTER TABLE calculator_panels ADD COLUMN wattage INT DEFAULT 580");
      if (!panelColNames.includes("price_bdt")) await pool.query("ALTER TABLE calculator_panels ADD COLUMN price_bdt VARCHAR(100) NULL");
      if (!panelColNames.includes("price_usd")) await pool.query("ALTER TABLE calculator_panels ADD COLUMN price_usd VARCHAR(100) NULL");
      if (!panelColNames.includes("features")) await pool.query("ALTER TABLE calculator_panels ADD COLUMN features JSON NULL");
      if (!panelColNames.includes("efficiency")) await pool.query("ALTER TABLE calculator_panels ADD COLUMN efficiency VARCHAR(50) NULL");
      if (!panelColNames.includes("warranty_years")) await pool.query("ALTER TABLE calculator_panels ADD COLUMN warranty_years VARCHAR(50) DEFAULT '25 Years'");
    } catch (_e) {}

    // Check and seed panels
    const [panelRows]: any = await pool.query("SELECT id FROM calculator_panels LIMIT 1");
    if (!panelRows || panelRows.length === 0) {
      const [allInverters]: any = await pool.query("SELECT id, min_watt, max_watt FROM calculator_recommendations ORDER BY min_watt ASC");
      const [allAreas]: any = await pool.query("SELECT id FROM calculator_areas ORDER BY id ASC");
      const inv0 = allInverters && allInverters[0] ? allInverters[0] : { id: null, min_watt: 0, max_watt: 600 };
      const inv1 = allInverters && allInverters[1] ? allInverters[1] : inv0;
      const inv2 = allInverters && allInverters[2] ? allInverters[2] : inv0;
      const inv3 = allInverters && allInverters[3] ? allInverters[3] : inv0;
      const area0 = allAreas && allAreas[0] ? allAreas[0].id : null;
      const area1 = allAreas && allAreas[1] ? allAreas[1].id : null;

      await pool.query(`
        INSERT INTO calculator_panels (inverter_id, area_id, name, name_bn, model, min_watt, max_watt, wattage, price_bdt, price_usd, features, efficiency, warranty_years, description, description_bn, order_index, is_active) VALUES
        (${inv0.id || 'NULL'}, ${area0 || 'NULL'}, 'Solvex 580W N-Type Bifacial TOPCon Module', 'সলভেক্স ৫৮০W বাইফেশিয়াল টপকন সোলার প্যানেল', 'Solvex TOPCon 580-BT', ${inv0.min_watt || 0}, ${inv0.max_watt || 600}, 580, '৳18,500', '$155', '${JSON.stringify([
          "Up to 30% additional rear-side power gain",
          "Ultra-low degradation N-Type silicon cells",
          "Anti-PID & Anti-Salt/Ammonia resistant",
          "Exceptional low-light morning/cloud performance"
        ])}', '22.5%', '25-30 Years Linear Warranty', 'Premium bifacial N-type TOPCon module with superior high-temperature yield.', 'উচ্চ তাপমাত্রায় সর্বোচ্চ বিদ্যুৎ উৎপাদনকারী সর্বাধুনিক বাইফেশিয়াল সোলার প্যানেল।', 1, TRUE),
        (${inv1.id || 'NULL'}, ${area1 || 'NULL'}, 'Solvex 650W Industrial Mono PERC High-Yield', 'সলভেক্স ৬৫০W ইন্ডাস্ট্রিয়াল মনো পার্ক প্যানেল', 'Solvex MegaPower 650M', ${inv1.min_watt || 601}, ${inv1.max_watt || 1200}, 650, '৳22,000', '$185', '${JSON.stringify([
          "High power density for commercial rooftops",
          "Half-cut cell design minimizes shading loss",
          "Heavy duty 5400Pa snow & 2400Pa wind rating",
          "IP68 junction box with bypass diodes"
        ])}', '21.6%', '25 Years Performance Warranty', 'Heavy duty commercial rooftop panel engineered for industrial plants.', 'বাণিজ্যিক ও বৃহৎ কারখানার ছাদের জন্য উচ্চ ক্ষমতাসম্পন্ন হেভি ডিউটি সোলার প্যানেল।', 2, TRUE),
        (${inv2.id || 'NULL'}, NULL, 'Solvex 400W All-Black Architectural Residential Panel', 'সলভেক্স ৪০০W অল-ব্ল্যাক প্রিমিয়াম প্যানেল', 'Solvex Elegance 400-BLK', ${inv2.min_watt || 1201}, ${inv2.max_watt || 2500}, 400, '৳14,000', '$118', '${JSON.stringify([
          "Sleek aesthetic full-black appearance for modern villas",
          "Compact size fits complex roof geometries",
          "Integrated smart MC4 compatible connectors",
          "Positive power tolerance 0 to +5W"
        ])}', '20.8%', '25 Years Full Warranty', 'Architectural all-black panel designed for luxury villas and residential rooftops.', 'আধুনিক ভিলা ও অভিজাত বাড়ির জন্য দৃষ্টিনন্দন সম্পূর্ণ কালো সোলার প্যানেল।', 3, TRUE),
        (${inv3.id || 'NULL'}, NULL, 'Solvex 700W Ultra High-Yield Utility Scale TOPCon', 'সলভেক্স ৭০০W আল্ট্রা মেগা টপকন প্যানেল', 'Solvex Titan 700-TOP', ${inv3.min_watt || 2501}, ${inv3.max_watt || 6000}, 700, '৳24,500', '$205', '${JSON.stringify([
          "Engineered for mega utility plants and factory sheds",
          "Lowest Levelized Cost of Electricity (LCOE)",
          "Double-glass frameless durability",
          "Next-gen multi-busbar (SMBB) technology"
        ])}', '22.8%', '30 Years Performance Guarantee', 'Ultra high-output megawatt module delivering industry lowest LCOE.', 'মেগা সোলার প্ল্যান্ট ও বৃহৎ শেডের জন্য সর্বোচ্চ শক্তির আল্ট্রা টপকন প্যানেল।', 4, TRUE);
      `);
    }

    // 7. Solar Accessories Catalog
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calculator_accessories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inverter_id INT NULL,
        name VARCHAR(191) NOT NULL,
        name_bn VARCHAR(191) NULL,
        items JSON NULL,
        order_index INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure columns on existing accessories table
    try {
      const [accCols]: any = await pool.query("SHOW COLUMNS FROM calculator_accessories");
      const accColNames = accCols.map((c: any) => c.Field);
      if (!accColNames.includes("inverter_id")) await pool.query("ALTER TABLE calculator_accessories ADD COLUMN inverter_id INT NULL");
      if (!accColNames.includes("name_bn")) await pool.query("ALTER TABLE calculator_accessories ADD COLUMN name_bn VARCHAR(191) NULL");
      if (!accColNames.includes("items")) await pool.query("ALTER TABLE calculator_accessories ADD COLUMN items JSON NULL");
    } catch (_e) {}

    // Check and seed accessories
    const [accRows]: any = await pool.query("SELECT id FROM calculator_accessories LIMIT 1");
    if (!accRows || accRows.length === 0) {
      const [allInverters]: any = await pool.query("SELECT id, min_watt, max_watt FROM calculator_recommendations ORDER BY min_watt ASC");
      const inv0 = allInverters && allInverters[0] ? allInverters[0] : { id: null };
      const inv1 = allInverters && allInverters[1] ? allInverters[1] : inv0;
      const inv2 = allInverters && allInverters[2] ? allInverters[2] : inv0;
      const inv3 = allInverters && allInverters[3] ? allInverters[3] : inv0;

      await pool.query(`
        INSERT INTO calculator_accessories (inverter_id, name, name_bn, items, order_index, is_active) VALUES
        (${inv0.id || 'NULL'}, 'Solvex 1kVA Residential BOS Accessories Kit', 'সলভেক্স ১kVA রেসিডেন্সিয়াল বিওএস এক্সেসরিজ কিট', '${JSON.stringify([
          { id: "acc-1", title: "Heavy Duty Aluminum Solar Rail & Clamps (2 Panels)", price: 3500 },
          { id: "acc-2", title: "4mm² Double-Insulated UV Resistant DC Cable (20m)", price: 2200 },
          { id: "acc-3", title: "2-in-1 MC4 Waterproof Solar Connectors Pair", price: 600 },
          { id: "acc-4", title: "DC Circuit Breaker 32A 500V & In-line Fuse", price: 1800 },
          { id: "acc-5", title: "Pure Copper Grounding Earth Rod & Spike Kit", price: 1400 }
        ])}', 1, TRUE),
        (${inv1.id || 'NULL'}, 'Solvex 2.0kW Smart Hybrid Balance of System (BOS) Kit', 'সলভেক্স ২.০kW স্মার্ট হাইব্রিড বিওএস এক্সেসরিজ কিট', '${JSON.stringify([
          { id: "acc-1", title: "Anodized Aluminum Mounting Structure (4-6 Panels)", price: 6500 },
          { id: "acc-2", title: "6mm² Flexible UV Resistant DC Solar Cable (35m)", price: 4200 },
          { id: "acc-3", title: "2-String IP65 Waterproof DC Combiner Box", price: 5500 },
          { id: "acc-4", title: "AC/DC Surge Protective Devices (SPD Type II)", price: 3800 },
          { id: "acc-5", title: "Heavy Duty Battery Connecting Cables 25mm² (Pair)", price: 2500 }
        ])}', 2, TRUE),
        (${inv2.id || 'NULL'}, 'Solvex 4.0kW Premium Executive Villa Electrical Kit', 'সলভেক্স ৪.০kW প্রিমিয়াম এক্সিকিউটিভ ভিলা এক্সেসরিজ কিট', '${JSON.stringify([
          { id: "acc-1", title: "Industrial Grade Cyclone-Resistant Mounting Rail Set", price: 12000 },
          { id: "acc-2", title: "10mm² High-Current DC Cable & Conduit Set (50m)", price: 7500 },
          { id: "acc-3", title: "4-String Smart Combiner Box with Monitoring", price: 9500 },
          { id: "acc-4", title: "Dual SPD Class I+II Lightning & Surge Protector", price: 6000 },
          { id: "acc-5", title: "Substation Grade Earth Pit & Chemical Compound", price: 4500 }
        ])}', 3, TRUE),
        (${inv3.id || 'NULL'}, 'Solvex 8.0kW Commercial / Duplex Three-Phase BOS Kit', 'সলভেক্স ৮.০kW কমার্শিয়াল থ্রি-ফেজ বিওএস প্যাকেজ', '${JSON.stringify([
          { id: "acc-1", title: "High-Rise Commercial Rooftop Elevated Structure", price: 22000 },
          { id: "acc-2", title: "Multi-String Solar DC Armored Cables & Trays (80m)", price: 14000 },
          { id: "acc-3", title: "6-In 2-Out Heavy Duty Commercial Combiner Panel", price: 16500 },
          { id: "acc-4", title: "3-Phase AC Distribution Box with MCCB & Earth Leakage", price: 12500 },
          { id: "acc-5", title: "Early Streamer Emission (ESE) Lightning Arrestor", price: 9500 }
        ])}', 4, TRUE);
      `);
    }

    // 8. Solar Packages (Bundled Inverter, Panels, Battery, Accessories)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calculator_packages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        name_bn VARCHAR(191) NULL,
        min_watt INT NOT NULL DEFAULT 0,
        max_watt INT NOT NULL DEFAULT 0,
        features JSON NULL,
        description TEXT NULL,
        description_bn TEXT NULL,
        inverter_id INT NULL,
        inverter_qty INT NOT NULL DEFAULT 1,
        inverter_unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        inverter_subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        panel_id INT NULL,
        panel_qty INT NOT NULL DEFAULT 0,
        panel_unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        panel_subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        battery_type_id INT NULL,
        battery_qty INT NOT NULL DEFAULT 0,
        battery_unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        battery_subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        accessory_id INT NULL,
        accessory_qty INT NOT NULL DEFAULT 1,
        accessory_unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        accessory_subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        total_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        price_bdt VARCHAR(100) NULL,
        order_index INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure columns on existing packages table
    try {
      const [pkgCols]: any = await pool.query("SHOW COLUMNS FROM calculator_packages");
      const pkgColNames = pkgCols.map((c: any) => c.Field);
      if (!pkgColNames.includes("inverter_id")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN inverter_id INT NULL");
      if (!pkgColNames.includes("inverter_qty")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN inverter_qty INT NOT NULL DEFAULT 1");
      if (!pkgColNames.includes("inverter_unit_price")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN inverter_unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
      if (!pkgColNames.includes("inverter_subtotal")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN inverter_subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
      if (!pkgColNames.includes("panel_id")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN panel_id INT NULL");
      if (!pkgColNames.includes("panel_qty")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN panel_qty INT NOT NULL DEFAULT 0");
      if (!pkgColNames.includes("panel_unit_price")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN panel_unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
      if (!pkgColNames.includes("panel_subtotal")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN panel_subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
      if (!pkgColNames.includes("battery_type_id")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN battery_type_id INT NULL");
      if (!pkgColNames.includes("battery_qty")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN battery_qty INT NOT NULL DEFAULT 0");
      if (!pkgColNames.includes("battery_unit_price")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN battery_unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
      if (!pkgColNames.includes("battery_subtotal")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN battery_subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
      if (!pkgColNames.includes("accessory_id")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN accessory_id INT NULL");
      if (!pkgColNames.includes("accessory_qty")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN accessory_qty INT NOT NULL DEFAULT 1");
      if (!pkgColNames.includes("accessory_unit_price")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN accessory_unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
      if (!pkgColNames.includes("accessory_subtotal")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN accessory_subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
      if (!pkgColNames.includes("total_price")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN total_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
      if (!pkgColNames.includes("price_bdt")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN price_bdt VARCHAR(100) NULL");
      if (!pkgColNames.includes("features")) await pool.query("ALTER TABLE calculator_packages ADD COLUMN features JSON NULL");
    } catch (_e) {}

    // Check and seed packages
    const [pkgRows]: any = await pool.query("SELECT id FROM calculator_packages LIMIT 1");
    if (!pkgRows || pkgRows.length === 0) {
      const [allInverters]: any = await pool.query("SELECT id, min_watt, max_watt FROM calculator_recommendations ORDER BY min_watt ASC");
      const [allPanels]: any = await pool.query("SELECT id FROM calculator_panels ORDER BY id ASC");
      const [allBatteries]: any = await pool.query("SELECT id FROM calculator_battery_types ORDER BY id ASC");
      const [allAccessories]: any = await pool.query("SELECT id FROM calculator_accessories ORDER BY id ASC");

      const inv0 = allInverters && allInverters[0] ? allInverters[0] : { id: null, min_watt: 0, max_watt: 600 };
      const inv1 = allInverters && allInverters[1] ? allInverters[1] : inv0;
      const inv2 = allInverters && allInverters[2] ? allInverters[2] : inv0;

      const pnl0 = allPanels && allPanels[0] ? allPanels[0].id : null;
      const pnl1 = allPanels && allPanels[1] ? allPanels[1].id : pnl0;

      const bat0 = allBatteries && allBatteries[0] ? allBatteries[0].id : null;
      const bat1 = allBatteries && allBatteries[1] ? allBatteries[1].id : bat0;

      const acc0 = allAccessories && allAccessories[0] ? allAccessories[0].id : null;
      const acc1 = allAccessories && allAccessories[1] ? allAccessories[1].id : acc0;

      await pool.query(`
        INSERT INTO calculator_packages (
          name, name_bn, min_watt, max_watt, features, description, description_bn,
          inverter_id, inverter_qty, inverter_unit_price, inverter_subtotal,
          panel_id, panel_qty, panel_unit_price, panel_subtotal,
          battery_type_id, battery_qty, battery_unit_price, battery_subtotal,
          accessory_id, accessory_qty, accessory_unit_price, accessory_subtotal,
          total_price, price_bdt, order_index, is_active
        ) VALUES
        (
          'Solvex 600W Micro Residential Kit Package',
          'সলভেক্স ৬০০W মাইক্রো রেসিডেন্সিয়াল কিট প্যাকেজ',
          ${inv0.min_watt || 0}, ${inv0.max_watt || 600},
          '${JSON.stringify(["Powers 3 Fans, 6 LED Lights, TV & Router", "Compact rooftop footprint ~50 sq.ft", "Full surge & lightning protection"])}',
          'Perfect starter solar system for small apartments and residential setups.',
          'ছোট বাসা ও ফ্ল্যাটের নিরবচ্ছিন্ন ফ্যান-লাইট চালানোর সাশ্রয়ী প্যাকেজ।',
          ${inv0.id || 'NULL'}, 1, 28000, 28000,
          ${pnl0 || 'NULL'}, 2, 18500, 37000,
          ${bat1 || 'NULL'}, 1, 22000, 22000,
          ${acc0 || 'NULL'}, 1, 9500, 9500,
          96500, '৳96,500', 1, TRUE
        ),
        (
          'Solvex 1.5kW Smart Home Hybrid Complete Package',
          'সলভেক্স ১.৫kW স্মার্ট হোম হাইব্রিড কমপ্লিট প্যাকেজ',
          ${inv1.min_watt || 601}, ${inv1.max_watt || 1200},
          '${JSON.stringify(["Supports Refrigerator + Fans + Lights + PC", "Bifacial TOPCon extra rear-side gain", "Smart Wi-Fi mobile monitoring", "Automatic uninterrupted changeover"])}',
          'Our most popular mid-tier solar package designed for modern families.',
          'ফ্রিজ, ফ্যান ও লাইটসহ সম্পূর্ণ পারিবারিক বিদ্যুতের চাহিদা মেটানোর আদর্শ প্যাকেজ।',
          ${inv1.id || 'NULL'}, 1, 48000, 48000,
          ${pnl0 || 'NULL'}, 3, 18500, 55500,
          ${bat0 || 'NULL'}, 1, 55000, 55000,
          ${acc1 || 'NULL'}, 1, 22500, 22500,
          181000, '৳1,81,000', 2, TRUE
        ),
        (
          'Solvex 3.2kW Premium Executive Villa Package',
          'সলভেক্স ৩.২kW প্রিমিয়াম এক্সিকিউটিভ ভিলা প্যাকেজ',
          ${inv2.min_watt || 1201}, ${inv2.max_watt || 2500},
          '${JSON.stringify(["Runs 1.5 Ton Inverter AC + Refrigerator + Fans", "High-voltage MPPT efficiency up to 98.6%", "LiFePO4 modular wall-mount battery bank", "Substantial monthly grid bill offset"])}',
          'Designed for spacious multi-bedroom apartments and villas requiring AC support.',
          '১.৫ টন ইনভার্টার এসি ও সকল পারিবারিক সরঞ্জাম অনায়াসে চালানোর শক্তিশালী প্রিমিয়াম সমাধান।',
          ${inv2.id || 'NULL'}, 1, 85000, 85000,
          ${pnl1 || 'NULL'}, 6, 22000, 132000,
          ${bat0 || 'NULL'}, 2, 55000, 110000,
          ${acc1 || 'NULL'}, 1, 39500, 39500,
          366500, '৳3,66,500', 3, TRUE
        );
      `);
    }

    // 9. Calculator Settings (Current Grid Electricity Tariff & Dynamic Content Texts)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calculator_settings (
        id INT PRIMARY KEY DEFAULT 1,
        grid_tariff_bdt DECIMAL(10, 2) NOT NULL DEFAULT 10.50,
        grid_tariff_usd DECIMAL(10, 2) NOT NULL DEFAULT 0.16,
        solar_offset_percent DECIMAL(5, 2) NOT NULL DEFAULT 95.00,
        step2_subtitle VARCHAR(255) DEFAULT 'STEP 2: SUGGESTED SOLAR PACKAGES',
        step2_subtitle_bn VARCHAR(255) DEFAULT 'ধাপ ২: প্রস্তাবিত সোলার প্যাকেজ নির্বাচন',
        step2_title VARCHAR(255) DEFAULT 'Solar Packages Matched for Your Connected Capacity',
        step2_title_bn VARCHAR(255) DEFAULT 'আপনার লোডের জন্য সামঞ্জস্যপূর্ণ সোলার প্যাকেজসমূহ',
        step2_description TEXT NULL,
        step2_description_bn TEXT NULL,
        step3_subtitle VARCHAR(255) DEFAULT 'STEP 3: INSTALLATION AREA & SERVICES',
        step3_subtitle_bn VARCHAR(255) DEFAULT 'ধাপ ৩: ইনস্টলেশন এরিয়া ও অন-সাইট সার্ভিসেস',
        step3_title VARCHAR(255) DEFAULT 'Select Your Installation Region',
        step3_title_bn VARCHAR(255) DEFAULT 'আপনার ইনস্টলেশন এলাকা নির্বাচন করুন',
        step3_description TEXT NULL,
        step3_description_bn TEXT NULL,
        savings_badge VARCHAR(255) DEFAULT 'ELECTRIC BILL SAVINGS & BENEFIT COMPARISON',
        savings_badge_bn VARCHAR(255) DEFAULT 'বিদ্যুৎ বিল সাশ্রয় ও তুলনামূলক বিশ্লেষণ',
        savings_title VARCHAR(255) DEFAULT 'How Much Will You Benefit From Solar vs Regular Grid Electricity?',
        savings_title_bn VARCHAR(255) DEFAULT 'সোলার ব্যবহারে আপনি বিদ্যুৎ বিল থেকে কতটা লাভবান হবেন?',
        itemized_breakdown_badge VARCHAR(255) DEFAULT 'ITEMIZED TURNKEY BREAKDOWN',
        itemized_breakdown_badge_bn VARCHAR(255) DEFAULT 'আইটেমাইজড খরচ বিবরণী',
        itemized_breakdown_title VARCHAR(255) DEFAULT 'Turnkey Equipment & Regional EPC Services',
        itemized_breakdown_title_bn VARCHAR(255) DEFAULT 'প্যাকেজ ও সার্ভিসের বিস্তারিত খরচ',
        epc_assurance_badge VARCHAR(255) DEFAULT 'SOLVEX EPC ASSURANCE',
        epc_assurance_badge_bn VARCHAR(255) DEFAULT 'সলভেক্স কোয়ালিটি গ্যারান্টি',
        epc_assurance_title VARCHAR(255) DEFAULT 'Certified Engineering & Long-Term Warranty',
        epc_assurance_title_bn VARCHAR(255) DEFAULT 'আন্তর্জাতিক মানের টার্নকি স্ট্যান্ডার্ড',
        epc_assurance_tier_badge VARCHAR(100) DEFAULT 'TIER-1 EPC',
        epc_assurance_tier_badge_bn VARCHAR(100) DEFAULT 'টিয়ার-১ ইপিসি',
        warranty_card1_title VARCHAR(255) DEFAULT '25-Year Performance Warranty',
        warranty_card1_title_bn VARCHAR(255) DEFAULT '২৫ বছরের পারফরম্যান্স ওয়ারেন্টি',
        warranty_card1_desc TEXT NULL,
        warranty_card1_desc_bn TEXT NULL,
        warranty_card2_title VARCHAR(255) DEFAULT 'Certified Electrical Engineers',
        warranty_card2_title_bn VARCHAR(255) DEFAULT 'প্রকৌশলী অন-সাইট ইনস্টলেশন ও সাপোর্ট',
        warranty_card2_desc TEXT NULL,
        warranty_card2_desc_bn TEXT NULL,
        epc_advice_title VARCHAR(255) DEFAULT 'Need Custom EPC Advice?',
        epc_advice_title_bn VARCHAR(255) DEFAULT 'প্রকৌশলী পরামর্শ চান?',
        epc_advice_desc TEXT NULL,
        epc_advice_desc_bn TEXT NULL,
        epc_advice_btn_text VARCHAR(100) DEFAULT 'CONTACT',
        epc_advice_btn_text_bn VARCHAR(100) DEFAULT 'যোগাযোগ',
        epc_advice_btn_url VARCHAR(255) DEFAULT '/contact',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure all dynamic content columns exist on existing table
    try {
      const [cols]: any = await pool.query("SHOW COLUMNS FROM calculator_settings");
      const colNames = cols.map((c: any) => c.Field);

      const neededCols: { name: string; type: string; defaultVal: string }[] = [
        { name: "step2_subtitle", type: "VARCHAR(255)", defaultVal: "'STEP 2: SUGGESTED SOLAR PACKAGES'" },
        { name: "step2_subtitle_bn", type: "VARCHAR(255)", defaultVal: "'ধাপ ২: প্রস্তাবিত সোলার প্যাকেজ নির্বাচন'" },
        { name: "step2_title", type: "VARCHAR(255)", defaultVal: "'Solar Packages Matched for Your Connected Capacity'" },
        { name: "step2_title_bn", type: "VARCHAR(255)", defaultVal: "'আপনার লোডের জন্য সামঞ্জস্যপূর্ণ সোলার প্যাকেজসমূহ'" },
        { name: "step2_description", type: "TEXT", defaultVal: "'Your connected load is {load}W ({kwh} kWh/day). Showing packages covering your load, plus the next capacity upgrade option.'" },
        { name: "step2_description_bn", type: "TEXT", defaultVal: "'আপনার বর্তমান পিক লোড {load}W ({kwh} kWh/দিন)। আপনার লোডের সমতুল্য প্যাকেজ এবং ভবিষ্যতের জন্য পরবর্তী আপগ্রেড অপশন নিচে দেওয়া হলো।'" },
        { name: "step3_subtitle", type: "VARCHAR(255)", defaultVal: "'STEP 3: INSTALLATION AREA & SERVICES'" },
        { name: "step3_subtitle_bn", type: "VARCHAR(255)", defaultVal: "'ধাপ ৩: ইনস্টলেশন এরিয়া ও অন-সাইট সার্ভিসেস'" },
        { name: "step3_title", type: "VARCHAR(255)", defaultVal: "'Select Your Installation Region'" },
        { name: "step3_title_bn", type: "VARCHAR(255)", defaultVal: "'আপনার ইনস্টলেশন এলাকা নির্বাচন করুন'" },
        { name: "step3_description", type: "TEXT", defaultVal: "'Tailored installation regions and EPC services configured for your capacity ({load}W).'" },
        { name: "step3_description_bn", type: "TEXT", defaultVal: "'আপনার ওয়াট সক্ষমতা ({load}W) এর জন্য সমর্থিত এরিয়া এবং সাইট ভিজিট, মাউন্টিং ও ইঞ্জিনিয়ারিং সার্ভিসেস নিচে প্রদর্শিত হচ্ছে।'" },
        { name: "savings_badge", type: "VARCHAR(255)", defaultVal: "'ELECTRIC BILL SAVINGS & BENEFIT COMPARISON'" },
        { name: "savings_badge_bn", type: "VARCHAR(255)", defaultVal: "'বিদ্যুৎ বিল সাশ্রয় ও তুলনামূলক বিশ্লেষণ'" },
        { name: "savings_title", type: "VARCHAR(255)", defaultVal: "'How Much Will You Benefit From Solar vs Regular Grid Electricity?'" },
        { name: "savings_title_bn", type: "VARCHAR(255)", defaultVal: "'সোলার ব্যবহারে আপনি বিদ্যুৎ বিল থেকে কতটা লাভবান হবেন?'" },
        { name: "itemized_breakdown_badge", type: "VARCHAR(255)", defaultVal: "'ITEMIZED TURNKEY BREAKDOWN'" },
        { name: "itemized_breakdown_badge_bn", type: "VARCHAR(255)", defaultVal: "'আইটেমাইজড খরচ বিবরণী'" },
        { name: "itemized_breakdown_title", type: "VARCHAR(255)", defaultVal: "'Turnkey Equipment & Regional EPC Services'" },
        { name: "itemized_breakdown_title_bn", type: "VARCHAR(255)", defaultVal: "'প্যাকেজ ও সার্ভিসের বিস্তারিত খরচ'" },
        { name: "epc_assurance_badge", type: "VARCHAR(255)", defaultVal: "'SOLVEX EPC ASSURANCE'" },
        { name: "epc_assurance_badge_bn", type: "VARCHAR(255)", defaultVal: "'সলভেক্স কোয়ালিটি গ্যারান্টি'" },
        { name: "epc_assurance_title", type: "VARCHAR(255)", defaultVal: "'Certified Engineering & Long-Term Warranty'" },
        { name: "epc_assurance_title_bn", type: "VARCHAR(255)", defaultVal: "'আন্তর্জাতিক মানের টার্নকি স্ট্যান্ডার্ড'" },
        { name: "epc_assurance_tier_badge", type: "VARCHAR(100)", defaultVal: "'TIER-1 EPC'" },
        { name: "epc_assurance_tier_badge_bn", type: "VARCHAR(100)", defaultVal: "'টিয়ার-১ ইপিসি'" },
        { name: "warranty_card1_title", type: "VARCHAR(255)", defaultVal: "'25-Year Performance Warranty'" },
        { name: "warranty_card1_title_bn", type: "VARCHAR(255)", defaultVal: "'২৫ বছরের পারফরম্যান্স ওয়ারেন্টি'" },
        { name: "warranty_card1_desc", type: "TEXT", defaultVal: "'Linear power output guarantee on Tier-1 mono bifacial solar PV modules.'" },
        { name: "warranty_card1_desc_bn", type: "TEXT", defaultVal: "'বাইফেসিয়াল টপকন সোলার প্যানেলের ওপর দীর্ঘস্থায়ী ওয়ারেন্টি ও গ্যারান্টি।'" },
        { name: "warranty_card2_title", type: "VARCHAR(255)", defaultVal: "'Certified Electrical Engineers'" },
        { name: "warranty_card2_title_bn", type: "VARCHAR(255)", defaultVal: "'প্রকৌশলী অন-সাইট ইনস্টলেশন ও সাপোর্ট'" },
        { name: "warranty_card2_desc", type: "TEXT", defaultVal: "'Complete structural CAD layout, lightning protection, and utility net-metering compliance.'" },
        { name: "warranty_card2_desc_bn", type: "TEXT", defaultVal: "'অভিজ্ঞ সোলার ইঞ্জিনিয়ার দ্বারা সাইট সার্ভে, সঠিক ওয়্যারিং ও সম্পূর্ণ মাউন্টিং।'" },
        { name: "epc_advice_title", type: "VARCHAR(255)", defaultVal: "'Need Custom EPC Advice?'" },
        { name: "epc_advice_title_bn", type: "VARCHAR(255)", defaultVal: "'প্রকৌশলী পরামর্শ চান?'" },
        { name: "epc_advice_desc", type: "TEXT", defaultVal: "'Our engineers will prepare custom CAD layouts.'" },
        { name: "epc_advice_desc_bn", type: "TEXT", defaultVal: "'আমাদের সোলার ইঞ্জিনিয়াররা আপনার জন্য ফ্রি অডিট করবে।'" },
        { name: "epc_advice_btn_text", type: "VARCHAR(100)", defaultVal: "'CONTACT'" },
        { name: "epc_advice_btn_text_bn", type: "VARCHAR(100)", defaultVal: "'যোগাযোগ'" },
        { name: "epc_advice_btn_url", type: "VARCHAR(255)", defaultVal: "'/contact'" },
      ];

      for (const col of neededCols) {
        if (!colNames.includes(col.name)) {
          await pool.query(`ALTER TABLE calculator_settings ADD COLUMN ${col.name} ${col.type} NULL`);
          await pool.query(`UPDATE calculator_settings SET ${col.name} = ${col.defaultVal} WHERE ${col.name} IS NULL`);
        }
      }
    } catch (_e) {}

    const [settingsRow]: any = await pool.query("SELECT id FROM calculator_settings WHERE id = 1");
    if (!settingsRow || settingsRow.length === 0) {
      await pool.query(`
        INSERT INTO calculator_settings (
          id, grid_tariff_bdt, grid_tariff_usd, solar_offset_percent,
          step2_subtitle, step2_subtitle_bn, step2_title, step2_title_bn, step2_description, step2_description_bn,
          step3_subtitle, step3_subtitle_bn, step3_title, step3_title_bn, step3_description, step3_description_bn,
          savings_badge, savings_badge_bn, savings_title, savings_title_bn,
          itemized_breakdown_badge, itemized_breakdown_badge_bn, itemized_breakdown_title, itemized_breakdown_title_bn,
          epc_assurance_badge, epc_assurance_badge_bn, epc_assurance_title, epc_assurance_title_bn, epc_assurance_tier_badge, epc_assurance_tier_badge_bn,
          warranty_card1_title, warranty_card1_title_bn, warranty_card1_desc, warranty_card1_desc_bn,
          warranty_card2_title, warranty_card2_title_bn, warranty_card2_desc, warranty_card2_desc_bn,
          epc_advice_title, epc_advice_title_bn, epc_advice_desc, epc_advice_desc_bn, epc_advice_btn_text, epc_advice_btn_text_bn, epc_advice_btn_url
        ) VALUES (
          1, 10.50, 0.16, 95.00,
          'STEP 2: SUGGESTED SOLAR PACKAGES', 'ধাপ ২: প্রস্তাবিত সোলার প্যাকেজ নির্বাচন',
          'Solar Packages Matched for Your Connected Capacity', 'আপনার লোডের জন্য সামঞ্জস্যপূর্ণ সোলার প্যাকেজসমূহ',
          'Your connected load is {load}W ({kwh} kWh/day). Showing packages covering your load, plus the next capacity upgrade option.',
          'আপনার বর্তমান পিক লোড {load}W ({kwh} kWh/দিন)। আপনার লোডের সমতুল্য প্যাকেজ এবং ভবিষ্যতের জন্য পরবর্তী আপগ্রেড অপশন নিচে দেওয়া হলো।',
          'STEP 3: INSTALLATION AREA & SERVICES', 'ধাপ ৩: ইনস্টলেশন এরিয়া ও অন-সাইট সার্ভিসেস',
          'Select Your Installation Region', 'আপনার ইনস্টলেশন এলাকা নির্বাচন করুন',
          'Tailored installation regions and EPC services configured for your capacity ({load}W).',
          'আপনার ওয়াট সক্ষমতা ({load}W) এর জন্য সমর্থিত এরিয়া এবং সাইট ভিজিট, মাউন্টিং ও ইঞ্জিনিয়ারিং সার্ভিসেস নিচে প্রদর্শিত হচ্ছে।',
          'ELECTRIC BILL SAVINGS & BENEFIT COMPARISON', 'বিদ্যুৎ বিল সাশ্রয় ও তুলনামূলক বিশ্লেষণ',
          'How Much Will You Benefit From Solar vs Regular Grid Electricity?', 'সোলার ব্যবহারে আপনি বিদ্যুৎ বিল থেকে কতটা লাভবান হবেন?',
          'ITEMIZED TURNKEY BREAKDOWN', 'আইটেমাইজড খরচ বিবরণী',
          'Turnkey Equipment & Regional EPC Services', 'প্যাকেজ ও সার্ভিসের বিস্তারিত খরচ',
          'SOLVEX EPC ASSURANCE', 'সলভেক্স কোয়ালিটি গ্যারান্টি',
          'Certified Engineering & Long-Term Warranty', 'আন্তর্জাতিক মানের টার্নকি স্ট্যান্ডার্ড',
          'TIER-1 EPC', 'টিয়ার-১ ইপিসি',
          '25-Year Performance Warranty', '২৫ বছরের পারফরম্যান্স ওয়ারেন্টি',
          'Linear power output guarantee on Tier-1 mono bifacial solar PV modules.', 'বাইফেসিয়াল টপকন সোলার প্যানেলের ওপর দীর্ঘস্থায়ী ওয়ারেন্টি ও গ্যারান্টি।',
          'Certified Electrical Engineers', 'প্রকৌশলী অন-সাইট ইনস্টলেশন ও সাপোর্ট',
          'Complete structural CAD layout, lightning protection, and utility net-metering compliance.', 'অভিজ্ঞ সোলার ইঞ্জিনিয়ার দ্বারা সাইট সার্ভে, সঠিক ওয়্যারিং ও সম্পূর্ণ মাউন্টিং।',
          'Need Custom EPC Advice?', 'প্রকৌশলী পরামর্শ চান?',
          'Our engineers will prepare custom CAD layouts.', 'আমাদের সোলার ইঞ্জিনিয়াররা আপনার জন্য ফ্রি অডিট করবে।',
          'CONTACT', 'যোগাযোগ', '/contact'
        )
      `);
    } else {
      // Ensure defaults for existing rows if any text column is NULL
      await pool.query(`
        UPDATE calculator_settings SET
          step2_subtitle = COALESCE(step2_subtitle, 'STEP 2: SUGGESTED SOLAR PACKAGES'),
          step2_subtitle_bn = COALESCE(step2_subtitle_bn, 'ধাপ ২: প্রস্তাবিত সোলার প্যাকেজ নির্বাচন'),
          step2_title = COALESCE(step2_title, 'Solar Packages Matched for Your Connected Capacity'),
          step2_title_bn = COALESCE(step2_title_bn, 'আপনার লোডের জন্য সামঞ্জস্যপূর্ণ সোলার প্যাকেজসমূহ'),
          step2_description = COALESCE(step2_description, 'Your connected load is {load}W ({kwh} kWh/day). Showing packages covering your load, plus the next capacity upgrade option.'),
          step2_description_bn = COALESCE(step2_description_bn, 'আপনার বর্তমান পিক লোড {load}W ({kwh} kWh/দিন)। আপনার লোডের সমতুল্য প্যাকেজ এবং ভবিষ্যতের জন্য পরবর্তী আপগ্রেড অপশন নিচে দেওয়া হলো।'),
          step3_subtitle = COALESCE(step3_subtitle, 'STEP 3: INSTALLATION AREA & SERVICES'),
          step3_subtitle_bn = COALESCE(step3_subtitle_bn, 'ধাপ ৩: ইনস্টলেশন এরিয়া ও অন-সাইট সার্ভিসেস'),
          step3_title = COALESCE(step3_title, 'Select Your Installation Region'),
          step3_title_bn = COALESCE(step3_title_bn, 'আপনার ইনস্টলেশন এলাকা নির্বাচন করুন'),
          step3_description = COALESCE(step3_description, 'Tailored installation regions and EPC services configured for your capacity ({load}W).'),
          step3_description_bn = COALESCE(step3_description_bn, 'আপনার ওয়াট সক্ষমতা ({load}W) এর জন্য সমর্থিত এরিয়া এবং সাইট ভিজিট, মাউন্টিং ও ইঞ্জিনিয়ারিং সার্ভিসেস নিচে প্রদর্শিত হচ্ছে।'),
          savings_badge = COALESCE(savings_badge, 'ELECTRIC BILL SAVINGS & BENEFIT COMPARISON'),
          savings_badge_bn = COALESCE(savings_badge_bn, 'বিদ্যুৎ বিল সাশ্রয় ও তুলনামূলক বিশ্লেষণ'),
          savings_title = COALESCE(savings_title, 'How Much Will You Benefit From Solar vs Regular Grid Electricity?'),
          savings_title_bn = COALESCE(savings_title_bn, 'সোলার ব্যবহারে আপনি বিদ্যুৎ বিল থেকে কতটা লাভবান হবেন?'),
          itemized_breakdown_badge = COALESCE(itemized_breakdown_badge, 'ITEMIZED TURNKEY BREAKDOWN'),
          itemized_breakdown_badge_bn = COALESCE(itemized_breakdown_badge_bn, 'আইটেমাইজড খরচ বিবরণী'),
          itemized_breakdown_title = COALESCE(itemized_breakdown_title, 'Turnkey Equipment & Regional EPC Services'),
          itemized_breakdown_title_bn = COALESCE(itemized_breakdown_title_bn, 'প্যাকেজ ও সার্ভিসের বিস্তারিত খরচ'),
          epc_assurance_badge = COALESCE(epc_assurance_badge, 'SOLVEX EPC ASSURANCE'),
          epc_assurance_badge_bn = COALESCE(epc_assurance_badge_bn, 'সলভেক্স কোয়ালিটি গ্যারান্টি'),
          epc_assurance_title = COALESCE(epc_assurance_title, 'Certified Engineering & Long-Term Warranty'),
          epc_assurance_title_bn = COALESCE(epc_assurance_title_bn, 'আন্তর্জাতিক মানের টার্নকি স্ট্যান্ডার্ড'),
          epc_assurance_tier_badge = COALESCE(epc_assurance_tier_badge, 'TIER-1 EPC'),
          epc_assurance_tier_badge_bn = COALESCE(epc_assurance_tier_badge_bn, 'টিয়ার-১ ইপিসি'),
          warranty_card1_title = COALESCE(warranty_card1_title, '25-Year Performance Warranty'),
          warranty_card1_title_bn = COALESCE(warranty_card1_title_bn, '২৫ বছরের পারফরম্যান্স ওয়ারেন্টি'),
          warranty_card1_desc = COALESCE(warranty_card1_desc, 'Linear power output guarantee on Tier-1 mono bifacial solar PV modules.'),
          warranty_card1_desc_bn = COALESCE(warranty_card1_desc_bn, 'বাইফেসিয়াল টপকন সোলার প্যানেলের ওপর দীর্ঘস্থায়ী ওয়ারেন্টি ও গ্যারান্টি।'),
          warranty_card2_title = COALESCE(warranty_card2_title, 'Certified Electrical Engineers'),
          warranty_card2_title_bn = COALESCE(warranty_card2_title_bn, 'প্রকৌশলী অন-সাইট ইনস্টলেশন ও সাপোর্ট'),
          warranty_card2_desc = COALESCE(warranty_card2_desc, 'Complete structural CAD layout, lightning protection, and utility net-metering compliance.'),
          warranty_card2_desc_bn = COALESCE(warranty_card2_desc_bn, 'অভিজ্ঞ সোলার ইঞ্জিনিয়ার দ্বারা সাইট সার্ভে, সঠিক ওয়্যারিং ও সম্পূর্ণ মাউন্টিং।'),
          epc_advice_title = COALESCE(epc_advice_title, 'Need Custom EPC Advice?'),
          epc_advice_title_bn = COALESCE(epc_advice_title_bn, 'প্রকৌশলী পরামর্শ চান?'),
          epc_advice_desc = COALESCE(epc_advice_desc, 'Our engineers will prepare custom CAD layouts.'),
          epc_advice_desc_bn = COALESCE(epc_advice_desc_bn, 'আমাদের সোলার ইঞ্জিনিয়াররা আপনার জন্য ফ্রি অডিট করবে।'),
          epc_advice_btn_text = COALESCE(epc_advice_btn_text, 'CONTACT'),
          epc_advice_btn_text_bn = COALESCE(epc_advice_btn_text_bn, 'যোগাযোগ'),
          epc_advice_btn_url = COALESCE(epc_advice_btn_url, '/contact')
        WHERE id = 1
      `);
    }

        // Ensure performance indexes for sub-second queries
    await ensureIndex("calculator_appliances", "idx_appliances_active_order", "is_active, order_index, id");
    await ensureIndex("calculator_appliances", "idx_appliances_category", "category");
    await ensureIndex("calculator_solar_types", "idx_solar_active_order", "is_active, order_index, id");
    await ensureIndex("calculator_solar_types", "idx_solar_inverter", "inverter_id");
    await ensureIndex("calculator_battery_types", "idx_battery_active_order", "is_active, order_index, id");
    await ensureIndex("calculator_battery_types", "idx_battery_inverter", "inverter_id");
    await ensureIndex("calculator_recommendations", "idx_rec_active_watt", "is_active, min_watt, order_index");
    await ensureIndex("calculator_areas", "idx_areas_active_order", "is_active, order_index, id");
    await ensureIndex("calculator_areas", "idx_areas_inverter", "inverter_id");
    await ensureIndex("calculator_panels", "idx_panels_active_order", "is_active, order_index, id");
    await ensureIndex("calculator_panels", "idx_panels_inverter", "inverter_id");
    await ensureIndex("calculator_panels", "idx_panels_area", "area_id");
    await ensureIndex("calculator_accessories", "idx_accessories_active_order", "is_active, order_index, id");
    await ensureIndex("calculator_accessories", "idx_accessories_inverter", "inverter_id");
    await ensureIndex("calculator_packages", "idx_packages_active_order", "is_active, order_index, id");
    await ensureIndex("calculator_packages", "idx_packages_inverter", "inverter_id");
    await ensureIndex("calculator_packages", "idx_packages_panel", "panel_id");
    await ensureIndex("calculator_packages", "idx_packages_battery", "battery_type_id");
    await ensureIndex("calculator_packages", "idx_packages_accessory", "accessory_id");
    await ensureIndex("calculator_packages", "idx_packages_watt", "min_watt, max_watt");

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
    // 1. Fast in-memory cache hit (< 2ms response)
    if (cachedPublicCalculatorData && Date.now() < publicCalculatorCacheExpiry) {
      res.setHeader("Cache-Control", "public, max-age=120, s-maxage=300, stale-while-revalidate=600");
      res.json({
        success: true,
        data: cachedPublicCalculatorData,
        cached: true,
      });
      return;
    }

    if (!tablesInitialized) {
      await ensureCalculatorTables();
    }

    // 2. Fetch all 9 independent datasets concurrently in PARALLEL via Promise.all
    const [
      [appliances],
      [solarTypes],
      [batteryTypes],
      [recommendations],
      [areas],
      [panels],
      [accessories],
      [packages],
      [settingsRows]
    ]: any = await Promise.all([
      pool.query("SELECT * FROM calculator_appliances WHERE is_active = TRUE ORDER BY order_index ASC, id ASC"),
      pool.query("SELECT * FROM calculator_solar_types WHERE is_active = TRUE ORDER BY order_index ASC, id ASC"),
      pool.query("SELECT * FROM calculator_battery_types WHERE is_active = TRUE ORDER BY order_index ASC, id ASC"),
      pool.query("SELECT * FROM calculator_recommendations WHERE is_active = TRUE ORDER BY min_watt ASC, order_index ASC"),
      pool.query(`SELECT a.*, r.title as inverter_title, r.recommended_inverter_kw, r.recommended_inverter_model
       FROM calculator_areas a
       LEFT JOIN calculator_recommendations r ON a.inverter_id = r.id
       WHERE a.is_active = TRUE
       ORDER BY a.order_index ASC, a.id ASC`),
      pool.query(`SELECT p.*,
              r.title as inverter_title,
              r.recommended_inverter_kw,
              r.recommended_inverter_model,
              a.name as area_name,
              a.name_bn as area_name_bn
       FROM calculator_panels p
       LEFT JOIN calculator_recommendations r ON p.inverter_id = r.id
       LEFT JOIN calculator_areas a ON p.area_id = a.id
       WHERE p.is_active = TRUE
       ORDER BY p.order_index ASC, p.id ASC`),
      pool.query(`SELECT acc.*,
              r.title as inverter_title,
              r.recommended_inverter_kw,
              r.recommended_inverter_model,
              r.min_watt as inverter_min_watt,
              r.max_watt as inverter_max_watt
       FROM calculator_accessories acc
       LEFT JOIN calculator_recommendations r ON acc.inverter_id = r.id
       WHERE acc.is_active = TRUE
       ORDER BY acc.order_index ASC, acc.id ASC`),
      pool.query(`SELECT pkg.*,
              r.title as inverter_title, r.recommended_inverter_kw, r.recommended_inverter_model,
              p.name as panel_name, p.wattage as panel_wattage, p.model as panel_model,
              b.name as battery_name, b.model as battery_model,
              acc.name as accessory_name
       FROM calculator_packages pkg
       LEFT JOIN calculator_recommendations r ON pkg.inverter_id = r.id
       LEFT JOIN calculator_panels p ON pkg.panel_id = p.id
       LEFT JOIN calculator_battery_types b ON pkg.battery_type_id = b.id
       LEFT JOIN calculator_accessories acc ON pkg.accessory_id = acc.id
       WHERE pkg.is_active = TRUE
       ORDER BY pkg.order_index ASC, pkg.id ASC`),
      pool.query("SELECT * FROM calculator_settings WHERE id = 1"),
    ]);

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

      if (typeof rec.package_features === "string") {
        try {
          rec.package_features = JSON.parse(rec.package_features);
        } catch {
          rec.package_features = [];
        }
      }
    }

    for (const st of solarTypes) {
      if (typeof st.benefits === "string") {
        try { st.benefits = JSON.parse(st.benefits); } catch { st.benefits = []; }
      }
      if (typeof st.features === "string") {
        try { st.features = JSON.parse(st.features); } catch { st.features = []; }
      }
    }

    for (const bt of batteryTypes) {
      if (typeof bt.features === "string") {
        try { bt.features = JSON.parse(bt.features); } catch { bt.features = []; }
      }
    }

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
            try { p.features = JSON.parse(p.features); } catch { p.features = []; }
          }
          productsMap[p.id] = p;
        });
      }
    }

    const enrichedRecommendations = recommendations.map((rec: any) => {
      const suggestedProducts = (rec.suggested_product_ids || [])
        .map((pid: number) => productsMap[pid])
        .filter(Boolean);
      return {
        ...rec,
        suggestedProducts,
      };
    });

    for (const a of areas) {
      if (typeof a.services === "string") {
        try { a.services = JSON.parse(a.services); } catch { a.services = []; }
      }
    }

    for (const p of panels) {
      if (typeof p.features === "string") {
        try { p.features = JSON.parse(p.features); } catch { p.features = []; }
      }
    }

    for (const a of accessories) {
      if (typeof a.items === "string") {
        try { a.items = JSON.parse(a.items); } catch { a.items = []; }
      }
    }

    for (const pkg of packages) {
      if (typeof pkg.features === "string") {
        try { pkg.features = JSON.parse(pkg.features); } catch { pkg.features = []; }
      }
    }

    const settings = settingsRows && settingsRows[0] ? settingsRows[0] : {
      grid_tariff_bdt: 10.50,
      grid_tariff_usd: 0.16,
      solar_offset_percent: 95.00
    };

    const responsePayload = {
      appliances,
      solarTypes,
      batteryTypes,
      recommendations: enrichedRecommendations,
      areas,
      panels,
      accessories,
      packages,
      settings,
    };

    // Cache in memory for 10 minutes
    cachedPublicCalculatorData = responsePayload;
    publicCalculatorCacheExpiry = Date.now() + PUBLIC_CALCULATOR_CACHE_TTL_MS;

    res.setHeader("Cache-Control", "public, max-age=120, s-maxage=300, stale-while-revalidate=600");
    res.json({
      success: true,
      data: responsePayload,
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
      invalidateCalculatorCache();
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

    invalidateCalculatorCache();
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
    invalidateCalculatorCache();
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
    const [rows]: any = await pool.query(`
      SELECT s.*, 
             r.title AS inverter_title, 
             r.title_bn AS inverter_title_bn,
             r.recommended_inverter_kw,
             r.recommended_inverter_model,
             r.min_watt AS inverter_min_watt,
             r.max_watt AS inverter_max_watt
      FROM calculator_solar_types s
      LEFT JOIN calculator_recommendations r ON s.inverter_id = r.id
      ORDER BY s.order_index ASC, s.id ASC
    `);
    const parsed = rows.map((r: any) => ({
      ...r,
      benefits: typeof r.benefits === "string" ? JSON.parse(r.benefits) : (r.benefits || []),
      features: typeof r.features === "string" ? JSON.parse(r.features) : (r.features || r.benefits || []),
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
      inverter_id,
      name,
      name_bn,
      system_code,
      tagline,
      description,
      description_bn,
      features,
      benefits,
      badge,
      min_watt,
      max_watt,
      model,
      price_bdt,
      price_usd,
      min_recommended_watts,
      efficiency_factor = 0.85,
      order_index = 0,
      is_active = true,
    } = req.body;

    if (!name || !name.trim()) {
      invalidateCalculatorCache();
    res.status(400).json({ success: false, message: "Solar system name is required." });
      return;
    }

    const code = system_code || name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const activeFeatures = features || benefits || [];
    const featuresJson = Array.isArray(activeFeatures) ? JSON.stringify(activeFeatures) : JSON.stringify([]);

    const minW = min_watt !== undefined ? Number(min_watt) : (min_recommended_watts !== undefined ? Number(min_recommended_watts) : 500);
    const maxW = max_watt !== undefined ? Number(max_watt) : 1000;

    const [result]: any = await pool.query(
      `INSERT INTO calculator_solar_types
       (inverter_id, name, name_bn, system_code, min_watt, max_watt, model, price_bdt, price_usd, features, tagline, description, description_bn, benefits, badge, min_recommended_watts, efficiency_factor, order_index, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        inverter_id ? Number(inverter_id) : null,
        name.trim(),
        name_bn || null,
        code,
        minW,
        maxW,
        model ? String(model).trim() : null,
        price_bdt ? String(price_bdt).trim() : null,
        price_usd ? String(price_usd).trim() : null,
        featuresJson,
        tagline || null,
        description || null,
        description_bn || null,
        featuresJson,
        badge || null,
        minW,
        Number(efficiency_factor) || 0.85,
        Number(order_index) || 0,
        is_active ? 1 : 0,
      ]
    );

    const [created]: any = await pool.query(
      `SELECT s.*, 
              r.title AS inverter_title, 
              r.title_bn AS inverter_title_bn,
              r.recommended_inverter_kw,
              r.recommended_inverter_model,
              r.min_watt AS inverter_min_watt,
              r.max_watt AS inverter_max_watt
       FROM calculator_solar_types s
       LEFT JOIN calculator_recommendations r ON s.inverter_id = r.id
       WHERE s.id = ?`,
      [result.insertId]
    );
    const parsed = {
      ...created[0],
      benefits: typeof created[0].benefits === "string" ? JSON.parse(created[0].benefits) : (created[0].benefits || []),
      features: typeof created[0].features === "string" ? JSON.parse(created[0].features) : (created[0].features || []),
    };
    res.status(201).json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSolarType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    const {
      inverter_id,
      name,
      name_bn,
      system_code,
      tagline,
      description,
      description_bn,
      features,
      benefits,
      badge,
      min_watt,
      max_watt,
      model,
      price_bdt,
      price_usd,
      min_recommended_watts,
      efficiency_factor,
      order_index,
      is_active,
    } = req.body;

    const [existingRows]: any = await pool.query("SELECT * FROM calculator_solar_types WHERE id = ?", [id]);
    if (!existingRows || existingRows.length === 0) {
      invalidateCalculatorCache();
    res.status(404).json({ success: false, message: "Solar type not found." });
      return;
    }
    const existing = existingRows[0];

    let featuresJson = existing.features;
    if (features !== undefined) {
      featuresJson = Array.isArray(features) ? JSON.stringify(features) : features;
    } else if (benefits !== undefined) {
      featuresJson = Array.isArray(benefits) ? JSON.stringify(benefits) : benefits;
    }

    const minW = min_watt !== undefined ? Number(min_watt) : (min_recommended_watts !== undefined ? Number(min_recommended_watts) : existing.min_watt);
    const maxW = max_watt !== undefined ? Number(max_watt) : existing.max_watt;

    await pool.query(
      `UPDATE calculator_solar_types SET
        inverter_id = COALESCE(?, inverter_id),
        name = COALESCE(?, name),
        name_bn = COALESCE(?, name_bn),
        system_code = COALESCE(?, system_code),
        min_watt = COALESCE(?, min_watt),
        max_watt = COALESCE(?, max_watt),
        model = COALESCE(?, model),
        price_bdt = COALESCE(?, price_bdt),
        price_usd = COALESCE(?, price_usd),
        features = COALESCE(?, features),
        benefits = COALESCE(?, benefits),
        tagline = COALESCE(?, tagline),
        description = COALESCE(?, description),
        description_bn = COALESCE(?, description_bn),
        badge = COALESCE(?, badge),
        min_recommended_watts = COALESCE(?, min_recommended_watts),
        efficiency_factor = COALESCE(?, efficiency_factor),
        order_index = COALESCE(?, order_index),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        inverter_id !== undefined ? (inverter_id ? Number(inverter_id) : null) : null,
        name,
        name_bn,
        system_code,
        minW,
        maxW,
        model,
        price_bdt,
        price_usd,
        featuresJson,
        featuresJson,
        tagline,
        description,
        description_bn,
        badge,
        minW,
        efficiency_factor,
        order_index,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
      ]
    );

    const [updated]: any = await pool.query(
      `SELECT s.*, 
              r.title AS inverter_title, 
              r.title_bn AS inverter_title_bn,
              r.recommended_inverter_kw,
              r.recommended_inverter_model,
              r.min_watt AS inverter_min_watt,
              r.max_watt AS inverter_max_watt
       FROM calculator_solar_types s
       LEFT JOIN calculator_recommendations r ON s.inverter_id = r.id
       WHERE s.id = ?`,
      [id]
    );
    const parsed = {
      ...updated[0],
      benefits: typeof updated[0].benefits === "string" ? JSON.parse(updated[0].benefits) : (updated[0].benefits || []),
      features: typeof updated[0].features === "string" ? JSON.parse(updated[0].features) : (updated[0].features || []),
    };
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSolarType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    await pool.query("DELETE FROM calculator_solar_types WHERE id = ?", [id]);
    invalidateCalculatorCache();
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
      `SELECT b.*, 
              r.title AS inverter_title, 
              r.title_bn AS inverter_title_bn,
              r.recommended_inverter_kw,
              r.recommended_inverter_model,
              r.min_watt AS inverter_min_watt,
              r.max_watt AS inverter_max_watt
       FROM calculator_battery_types b
       LEFT JOIN calculator_recommendations r ON b.inverter_id = r.id
       ORDER BY b.order_index ASC, b.id ASC`
    );
    const parsed = rows.map((b: any) => ({
      ...b,
      features: typeof b.features === "string" ? JSON.parse(b.features) : (b.features || []),
    }));
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBatteryType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const {
      inverter_id,
      name,
      name_bn,
      battery_code,
      min_watt,
      max_watt,
      model,
      price_bdt,
      price_usd,
      features,
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
      invalidateCalculatorCache();
    res.status(400).json({ success: false, message: "Battery type name is required." });
      return;
    }

    const code = battery_code || name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const featuresJson = Array.isArray(features) ? JSON.stringify(features) : JSON.stringify([]);
    const minW = min_watt !== undefined ? Number(min_watt) : 0;
    const maxW = max_watt !== undefined ? Number(max_watt) : 1000;

    const [result]: any = await pool.query(
      `INSERT INTO calculator_battery_types
       (inverter_id, name, name_bn, battery_code, min_watt, max_watt, model, price_bdt, price_usd, features, tagline, description, description_bn, depth_of_discharge, lifespan_years, cycle_life, maintenance, badge, order_index, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        inverter_id ? Number(inverter_id) : null,
        name.trim(),
        name_bn || null,
        code,
        minW,
        maxW,
        model ? String(model).trim() : null,
        price_bdt ? String(price_bdt).trim() : null,
        price_usd ? String(price_usd).trim() : null,
        featuresJson,
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
      `SELECT b.*, 
              r.title AS inverter_title, 
              r.title_bn AS inverter_title_bn,
              r.recommended_inverter_kw,
              r.recommended_inverter_model,
              r.min_watt AS inverter_min_watt,
              r.max_watt AS inverter_max_watt
       FROM calculator_battery_types b
       LEFT JOIN calculator_recommendations r ON b.inverter_id = r.id
       WHERE b.id = ?`,
      [result.insertId]
    );
    const parsed = {
      ...created[0],
      features: typeof created[0].features === "string" ? JSON.parse(created[0].features) : (created[0].features || []),
    };
    res.status(201).json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBatteryType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    const {
      inverter_id,
      name,
      name_bn,
      battery_code,
      min_watt,
      max_watt,
      model,
      price_bdt,
      price_usd,
      features,
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

    const [existingRows]: any = await pool.query("SELECT * FROM calculator_battery_types WHERE id = ?", [id]);
    if (!existingRows || existingRows.length === 0) {
      invalidateCalculatorCache();
    res.status(404).json({ success: false, message: "Battery type not found." });
      return;
    }
    const existing = existingRows[0];

    let featuresJson = existing.features;
    if (features !== undefined) {
      featuresJson = Array.isArray(features) ? JSON.stringify(features) : features;
    }

    const minW = min_watt !== undefined ? Number(min_watt) : existing.min_watt;
    const maxW = max_watt !== undefined ? Number(max_watt) : existing.max_watt;

    await pool.query(
      `UPDATE calculator_battery_types SET
        inverter_id = COALESCE(?, inverter_id),
        name = COALESCE(?, name),
        name_bn = COALESCE(?, name_bn),
        battery_code = COALESCE(?, battery_code),
        min_watt = COALESCE(?, min_watt),
        max_watt = COALESCE(?, max_watt),
        model = COALESCE(?, model),
        price_bdt = COALESCE(?, price_bdt),
        price_usd = COALESCE(?, price_usd),
        features = COALESCE(?, features),
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
        inverter_id !== undefined ? (inverter_id ? Number(inverter_id) : null) : null,
        name,
        name_bn,
        battery_code,
        minW,
        maxW,
        model,
        price_bdt,
        price_usd,
        featuresJson,
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
      `SELECT b.*, 
              r.title AS inverter_title, 
              r.title_bn AS inverter_title_bn,
              r.recommended_inverter_kw,
              r.recommended_inverter_model,
              r.min_watt AS inverter_min_watt,
              r.max_watt AS inverter_max_watt
       FROM calculator_battery_types b
       LEFT JOIN calculator_recommendations r ON b.inverter_id = r.id
       WHERE b.id = ?`,
      [id]
    );
    const parsed = {
      ...updated[0],
      features: typeof updated[0].features === "string" ? JSON.parse(updated[0].features) : (updated[0].features || []),
    };
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBatteryType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    await pool.query("DELETE FROM calculator_battery_types WHERE id = ?", [id]);
    invalidateCalculatorCache();
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
      inverter_type,
      type,
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

    if (!title || !String(title).trim()) {
      invalidateCalculatorCache();
    res.status(400).json({ success: false, message: "Inverter name is required." });
      return;
    }
    if (min_watt === undefined || max_watt === undefined || min_watt === null || max_watt === null) {
      res.status(400).json({ success: false, message: "Range Min and Range Max are required." });
      return;
    }

    const featuresJson = Array.isArray(package_features) ? JSON.stringify(package_features) : JSON.stringify([]);
    const productIdsJson = Array.isArray(suggested_product_ids) ? JSON.stringify(suggested_product_ids) : JSON.stringify([]);

    const [result]: any = await pool.query(
      `INSERT INTO calculator_recommendations
       (title, title_bn, inverter_type, min_watt, max_watt, recommended_solar_kw, recommended_panels_count, recommended_panel_model, recommended_inverter_kw, recommended_inverter_model, recommended_battery_capacity, package_features, description, description_bn, suggested_product_ids, estimated_cost_bdt, estimated_cost_usd, order_index, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(title).trim(),
        title_bn ? String(title_bn).trim() : null,
        String(inverter_type || type || "hybrid").trim(),
        Number(min_watt) || 0,
        Number(max_watt) || 0,
        Number(recommended_solar_kw) || 1.5,
        Number(recommended_panels_count) || 3,
        recommended_panel_model ? String(recommended_panel_model).trim() : null,
        Number(recommended_inverter_kw) || 2.0,
        recommended_inverter_model ? String(recommended_inverter_model).trim() : null,
        recommended_battery_capacity ? String(recommended_battery_capacity).trim() : null,
        featuresJson,
        description ? String(description).trim() : null,
        description_bn ? String(description_bn).trim() : null,
        productIdsJson,
        estimated_cost_bdt ? String(estimated_cost_bdt).trim() : null,
        estimated_cost_usd ? String(estimated_cost_usd).trim() : null,
        Number(order_index) || 0,
        is_active ? 1 : 0,
      ]
    );

    const [created]: any = await pool.query(
      "SELECT * FROM calculator_recommendations WHERE id = ?",
      [result.insertId]
    );

    const parsed = {
      ...created[0],
      package_features: typeof created[0].package_features === "string" ? JSON.parse(created[0].package_features) : created[0].package_features,
      suggested_product_ids: typeof created[0].suggested_product_ids === "string" ? JSON.parse(created[0].suggested_product_ids) : created[0].suggested_product_ids,
    };

    res.status(201).json({ success: true, data: parsed });
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
      inverter_type,
      type,
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

    const [existingRows]: any = await pool.query("SELECT * FROM calculator_recommendations WHERE id = ?", [id]);
    if (!existingRows || existingRows.length === 0) {
      invalidateCalculatorCache();
    res.status(404).json({ success: false, message: "Inverter configuration not found." });
      return;
    }
    const existing = existingRows[0];

    const updatedTitle = title !== undefined ? String(title).trim() : existing.title;
    const updatedTitleBn = title_bn !== undefined ? (title_bn ? String(title_bn).trim() : null) : existing.title_bn;
    const updatedInverterType = inverter_type !== undefined
      ? String(inverter_type).trim()
      : (type !== undefined ? String(type).trim() : (existing.inverter_type || "hybrid"));
    const updatedMinWatt = min_watt !== undefined ? Number(min_watt) : existing.min_watt;
    const updatedMaxWatt = max_watt !== undefined ? Number(max_watt) : existing.max_watt;
    const updatedSolarKw = recommended_solar_kw !== undefined ? Number(recommended_solar_kw) : existing.recommended_solar_kw;
    const updatedPanelsCount = recommended_panels_count !== undefined ? Number(recommended_panels_count) : existing.recommended_panels_count;
    const updatedPanelModel = recommended_panel_model !== undefined ? (recommended_panel_model ? String(recommended_panel_model).trim() : null) : existing.recommended_panel_model;
    const updatedInverterKw = recommended_inverter_kw !== undefined ? Number(recommended_inverter_kw) : existing.recommended_inverter_kw;
    const updatedInverterModel = recommended_inverter_model !== undefined ? (recommended_inverter_model ? String(recommended_inverter_model).trim() : null) : existing.recommended_inverter_model;
    const updatedBatteryCap = recommended_battery_capacity !== undefined ? (recommended_battery_capacity ? String(recommended_battery_capacity).trim() : null) : existing.recommended_battery_capacity;

    let updatedFeaturesJson: string | null = null;
    if (package_features !== undefined) {
      updatedFeaturesJson = Array.isArray(package_features)
        ? JSON.stringify(package_features)
        : (typeof package_features === "string" ? package_features : JSON.stringify([]));
    } else if (existing.package_features !== null && existing.package_features !== undefined) {
      updatedFeaturesJson = typeof existing.package_features === "string"
        ? existing.package_features
        : JSON.stringify(existing.package_features);
    }

    const updatedDescription = description !== undefined ? (description ? String(description).trim() : null) : existing.description;
    const updatedDescriptionBn = description_bn !== undefined ? (description_bn ? String(description_bn).trim() : null) : existing.description_bn;

    let updatedProductIdsJson: string | null = null;
    if (suggested_product_ids !== undefined) {
      updatedProductIdsJson = Array.isArray(suggested_product_ids)
        ? JSON.stringify(suggested_product_ids)
        : (typeof suggested_product_ids === "string" ? suggested_product_ids : JSON.stringify([]));
    } else if (existing.suggested_product_ids !== null && existing.suggested_product_ids !== undefined) {
      updatedProductIdsJson = typeof existing.suggested_product_ids === "string"
        ? existing.suggested_product_ids
        : JSON.stringify(existing.suggested_product_ids);
    }

    const updatedCostBdt = estimated_cost_bdt !== undefined ? (estimated_cost_bdt ? String(estimated_cost_bdt).trim() : null) : existing.estimated_cost_bdt;
    const updatedCostUsd = estimated_cost_usd !== undefined ? (estimated_cost_usd ? String(estimated_cost_usd).trim() : null) : existing.estimated_cost_usd;
    const updatedOrderIndex = order_index !== undefined ? Number(order_index) : existing.order_index;
    const updatedIsActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

    await pool.query(
      `UPDATE calculator_recommendations SET
        title = ?,
        title_bn = ?,
        inverter_type = ?,
        min_watt = ?,
        max_watt = ?,
        recommended_solar_kw = ?,
        recommended_panels_count = ?,
        recommended_panel_model = ?,
        recommended_inverter_kw = ?,
        recommended_inverter_model = ?,
        recommended_battery_capacity = ?,
        package_features = ?,
        description = ?,
        description_bn = ?,
        suggested_product_ids = ?,
        estimated_cost_bdt = ?,
        estimated_cost_usd = ?,
        order_index = ?,
        is_active = ?
       WHERE id = ?`,
      [
        updatedTitle,
        updatedTitleBn,
        updatedInverterType,
        updatedMinWatt,
        updatedMaxWatt,
        updatedSolarKw,
        updatedPanelsCount,
        updatedPanelModel,
        updatedInverterKw,
        updatedInverterModel,
        updatedBatteryCap,
        updatedFeaturesJson,
        updatedDescription,
        updatedDescriptionBn,
        updatedProductIdsJson,
        updatedCostBdt,
        updatedCostUsd,
        updatedOrderIndex,
        updatedIsActive,
        id,
      ]
    );

    const [updated]: any = await pool.query(
      "SELECT * FROM calculator_recommendations WHERE id = ?",
      [id]
    );

    const parsed = {
      ...updated[0],
      package_features: typeof updated[0].package_features === "string" ? JSON.parse(updated[0].package_features) : updated[0].package_features,
      suggested_product_ids: typeof updated[0].suggested_product_ids === "string" ? JSON.parse(updated[0].suggested_product_ids) : updated[0].suggested_product_ids,
    };

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRecommendation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    const [existing]: any = await pool.query("SELECT id FROM calculator_recommendations WHERE id = ?", [id]);
    if (!existing || existing.length === 0) {
      invalidateCalculatorCache();
    res.status(404).json({ success: false, message: "Inverter not found." });
      return;
    }
    await pool.query("DELETE FROM calculator_recommendations WHERE id = ?", [id]);
    res.json({ success: true, message: "Inverter deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// INSTALLATION AREAS & DYNAMIC SERVICES CRUD (ADMIN)
// ==========================================

export const getAreas = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const [rows]: any = await pool.query(
      `SELECT a.*, r.title as inverter_title, r.recommended_inverter_kw, r.recommended_inverter_model
       FROM calculator_areas a
       LEFT JOIN calculator_recommendations r ON a.inverter_id = r.id
       ORDER BY a.order_index ASC, a.id ASC`
    );
    const parsed = rows.map((r: any) => ({
      ...r,
      services: typeof r.services === "string" ? JSON.parse(r.services) : (r.services || []),
    }));
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createArea = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const {
      inverter_id,
      name,
      name_bn,
      min_watt,
      max_watt,
      services,
      order_index,
      is_active,
    } = req.body;

    if (!name || !String(name).trim()) {
      invalidateCalculatorCache();
    res.status(400).json({ success: false, message: "Area name is required." });
      return;
    }

    let servicesJson: string | null = null;
    if (services !== undefined) {
      servicesJson = Array.isArray(services)
        ? JSON.stringify(services)
        : (typeof services === "string" ? services : JSON.stringify([]));
    } else {
      servicesJson = JSON.stringify([]);
    }

    const [result]: any = await pool.query(
      `INSERT INTO calculator_areas (
        inverter_id,
        name,
        name_bn,
        min_watt,
        max_watt,
        services,
        order_index,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        inverter_id ? Number(inverter_id) : null,
        String(name).trim(),
        name_bn ? String(name_bn).trim() : null,
        min_watt !== undefined ? Number(min_watt) : 0,
        max_watt !== undefined ? Number(max_watt) : 0,
        servicesJson,
        order_index !== undefined ? Number(order_index) : 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
      ]
    );

    const [created]: any = await pool.query(
      `SELECT a.*, r.title as inverter_title, r.recommended_inverter_kw, r.recommended_inverter_model
       FROM calculator_areas a
       LEFT JOIN calculator_recommendations r ON a.inverter_id = r.id
       WHERE a.id = ?`,
      [result.insertId]
    );

    const parsed = {
      ...created[0],
      services: typeof created[0].services === "string" ? JSON.parse(created[0].services) : (created[0].services || []),
    };

    res.status(201).json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateArea = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    const {
      inverter_id,
      name,
      name_bn,
      min_watt,
      max_watt,
      services,
      order_index,
      is_active,
    } = req.body;

    const [existingRows]: any = await pool.query("SELECT * FROM calculator_areas WHERE id = ?", [id]);
    if (!existingRows || existingRows.length === 0) {
      invalidateCalculatorCache();
    res.status(404).json({ success: false, message: "Installation area not found." });
      return;
    }
    const existing = existingRows[0];

    const updatedInverterId = inverter_id !== undefined ? (inverter_id ? Number(inverter_id) : null) : existing.inverter_id;
    const updatedName = name !== undefined ? String(name).trim() : existing.name;
    const updatedNameBn = name_bn !== undefined ? (name_bn ? String(name_bn).trim() : null) : existing.name_bn;
    const updatedMinWatt = min_watt !== undefined ? Number(min_watt) : existing.min_watt;
    const updatedMaxWatt = max_watt !== undefined ? Number(max_watt) : existing.max_watt;

    let updatedServicesJson: string | null = null;
    if (services !== undefined) {
      updatedServicesJson = Array.isArray(services)
        ? JSON.stringify(services)
        : (typeof services === "string" ? services : JSON.stringify([]));
    } else if (existing.services !== null && existing.services !== undefined) {
      updatedServicesJson = typeof existing.services === "string"
        ? existing.services
        : JSON.stringify(existing.services);
    }

    const updatedOrderIndex = order_index !== undefined ? Number(order_index) : existing.order_index;
    const updatedIsActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

    await pool.query(
      `UPDATE calculator_areas SET
        inverter_id = ?,
        name = ?,
        name_bn = ?,
        min_watt = ?,
        max_watt = ?,
        services = ?,
        order_index = ?,
        is_active = ?
       WHERE id = ?`,
      [
        updatedInverterId,
        updatedName,
        updatedNameBn,
        updatedMinWatt,
        updatedMaxWatt,
        updatedServicesJson,
        updatedOrderIndex,
        updatedIsActive,
        id,
      ]
    );

    const [updated]: any = await pool.query(
      `SELECT a.*, r.title as inverter_title, r.recommended_inverter_kw, r.recommended_inverter_model
       FROM calculator_areas a
       LEFT JOIN calculator_recommendations r ON a.inverter_id = r.id
       WHERE a.id = ?`,
      [id]
    );

    const parsed = {
      ...updated[0],
      services: typeof updated[0].services === "string" ? JSON.parse(updated[0].services) : (updated[0].services || []),
    };

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteArea = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    const [existing]: any = await pool.query("SELECT id FROM calculator_areas WHERE id = ?", [id]);
    if (!existing || existing.length === 0) {
      invalidateCalculatorCache();
    res.status(404).json({ success: false, message: "Installation area not found." });
      return;
    }
    await pool.query("DELETE FROM calculator_areas WHERE id = ?", [id]);
    res.json({ success: true, message: "Installation area deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// SOLAR PANELS CRUD (ADMIN)
// ==========================================

export const getPanels = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const [rows]: any = await pool.query(
      `SELECT p.*,
              r.title as inverter_title,
              r.recommended_inverter_kw,
              r.recommended_inverter_model,
              a.name as area_name,
              a.name_bn as area_name_bn
       FROM calculator_panels p
       LEFT JOIN calculator_recommendations r ON p.inverter_id = r.id
       LEFT JOIN calculator_areas a ON p.area_id = a.id
       ORDER BY p.order_index ASC, p.id ASC`
    );
    const parsed = rows.map((r: any) => ({
      ...r,
      features: typeof r.features === "string" ? JSON.parse(r.features) : (r.features || []),
    }));
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPanel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const {
      inverter_id,
      area_id,
      name,
      name_bn,
      model,
      min_watt,
      max_watt,
      wattage,
      price_bdt,
      price_usd,
      features,
      efficiency,
      warranty_years,
      description,
      description_bn,
      order_index,
      is_active,
    } = req.body;

    if (!name || !String(name).trim()) {
      invalidateCalculatorCache();
    res.status(400).json({ success: false, message: "Solar Panel name is required." });
      return;
    }

    let featuresJson: string | null = null;
    if (features !== undefined) {
      featuresJson = Array.isArray(features)
        ? JSON.stringify(features)
        : (typeof features === "string" ? features : JSON.stringify([]));
    } else {
      featuresJson = JSON.stringify([]);
    }

    const [result]: any = await pool.query(
      `INSERT INTO calculator_panels (
        inverter_id,
        area_id,
        name,
        name_bn,
        model,
        min_watt,
        max_watt,
        wattage,
        price_bdt,
        price_usd,
        features,
        efficiency,
        warranty_years,
        description,
        description_bn,
        order_index,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        inverter_id ? Number(inverter_id) : null,
        area_id ? Number(area_id) : null,
        String(name).trim(),
        name_bn ? String(name_bn).trim() : null,
        model ? String(model).trim() : null,
        min_watt !== undefined ? Number(min_watt) : 0,
        max_watt !== undefined ? Number(max_watt) : 0,
        wattage !== undefined ? Number(wattage) : 580,
        price_bdt ? String(price_bdt).trim() : null,
        price_usd ? String(price_usd).trim() : null,
        featuresJson,
        efficiency ? String(efficiency).trim() : null,
        warranty_years ? String(warranty_years).trim() : "25 Years",
        description ? String(description).trim() : null,
        description_bn ? String(description_bn).trim() : null,
        order_index !== undefined ? Number(order_index) : 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
      ]
    );

    const [created]: any = await pool.query(
      `SELECT p.*,
              r.title as inverter_title,
              r.recommended_inverter_kw,
              r.recommended_inverter_model,
              a.name as area_name,
              a.name_bn as area_name_bn
       FROM calculator_panels p
       LEFT JOIN calculator_recommendations r ON p.inverter_id = r.id
       LEFT JOIN calculator_areas a ON p.area_id = a.id
       WHERE p.id = ?`,
      [result.insertId]
    );

    const parsed = {
      ...created[0],
      features: typeof created[0].features === "string" ? JSON.parse(created[0].features) : (created[0].features || []),
    };

    res.status(201).json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePanel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    const {
      inverter_id,
      area_id,
      name,
      name_bn,
      model,
      min_watt,
      max_watt,
      wattage,
      price_bdt,
      price_usd,
      features,
      efficiency,
      warranty_years,
      description,
      description_bn,
      order_index,
      is_active,
    } = req.body;

    const [existingRows]: any = await pool.query("SELECT * FROM calculator_panels WHERE id = ?", [id]);
    if (!existingRows || existingRows.length === 0) {
      invalidateCalculatorCache();
    res.status(404).json({ success: false, message: "Solar Panel not found." });
      return;
    }
    const existing = existingRows[0];

    const updatedInverterId = inverter_id !== undefined ? (inverter_id ? Number(inverter_id) : null) : existing.inverter_id;
    const updatedAreaId = area_id !== undefined ? (area_id ? Number(area_id) : null) : existing.area_id;
    const updatedName = name !== undefined ? String(name).trim() : existing.name;
    const updatedNameBn = name_bn !== undefined ? (name_bn ? String(name_bn).trim() : null) : existing.name_bn;
    const updatedModel = model !== undefined ? (model ? String(model).trim() : null) : existing.model;
    const updatedMinWatt = min_watt !== undefined ? Number(min_watt) : existing.min_watt;
    const updatedMaxWatt = max_watt !== undefined ? Number(max_watt) : existing.max_watt;
    const updatedWattage = wattage !== undefined ? Number(wattage) : existing.wattage;
    const updatedPriceBdt = price_bdt !== undefined ? (price_bdt ? String(price_bdt).trim() : null) : existing.price_bdt;
    const updatedPriceUsd = price_usd !== undefined ? (price_usd ? String(price_usd).trim() : null) : existing.price_usd;

    let updatedFeaturesJson: string | null = null;
    if (features !== undefined) {
      updatedFeaturesJson = Array.isArray(features)
        ? JSON.stringify(features)
        : (typeof features === "string" ? features : JSON.stringify([]));
    } else if (existing.features !== null && existing.features !== undefined) {
      updatedFeaturesJson = typeof existing.features === "string"
        ? existing.features
        : JSON.stringify(existing.features);
    }

    const updatedEfficiency = efficiency !== undefined ? (efficiency ? String(efficiency).trim() : null) : existing.efficiency;
    const updatedWarranty = warranty_years !== undefined ? (warranty_years ? String(warranty_years).trim() : null) : existing.warranty_years;
    const updatedDescription = description !== undefined ? (description ? String(description).trim() : null) : existing.description;
    const updatedDescriptionBn = description_bn !== undefined ? (description_bn ? String(description_bn).trim() : null) : existing.description_bn;
    const updatedOrderIndex = order_index !== undefined ? Number(order_index) : existing.order_index;
    const updatedIsActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

    await pool.query(
      `UPDATE calculator_panels SET
        inverter_id = ?,
        area_id = ?,
        name = ?,
        name_bn = ?,
        model = ?,
        min_watt = ?,
        max_watt = ?,
        wattage = ?,
        price_bdt = ?,
        price_usd = ?,
        features = ?,
        efficiency = ?,
        warranty_years = ?,
        description = ?,
        description_bn = ?,
        order_index = ?,
        is_active = ?
       WHERE id = ?`,
      [
        updatedInverterId,
        updatedAreaId,
        updatedName,
        updatedNameBn,
        updatedModel,
        updatedMinWatt,
        updatedMaxWatt,
        updatedWattage,
        updatedPriceBdt,
        updatedPriceUsd,
        updatedFeaturesJson,
        updatedEfficiency,
        updatedWarranty,
        updatedDescription,
        updatedDescriptionBn,
        updatedOrderIndex,
        updatedIsActive,
        id,
      ]
    );

    const [updated]: any = await pool.query(
      `SELECT p.*,
              r.title as inverter_title,
              r.recommended_inverter_kw,
              r.recommended_inverter_model,
              a.name as area_name,
              a.name_bn as area_name_bn
       FROM calculator_panels p
       LEFT JOIN calculator_recommendations r ON p.inverter_id = r.id
       LEFT JOIN calculator_areas a ON p.area_id = a.id
       WHERE p.id = ?`,
      [id]
    );

    const parsed = {
      ...updated[0],
      features: typeof updated[0].features === "string" ? JSON.parse(updated[0].features) : (updated[0].features || []),
    };

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePanel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    const [existing]: any = await pool.query("SELECT id FROM calculator_panels WHERE id = ?", [id]);
    if (!existing || existing.length === 0) {
      invalidateCalculatorCache();
    res.status(404).json({ success: false, message: "Solar Panel not found." });
      return;
    }
    await pool.query("DELETE FROM calculator_panels WHERE id = ?", [id]);
    res.json({ success: true, message: "Solar Panel deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// ACCESSORIES & DYNAMIC ITEMS CRUD (ADMIN)
// ==========================================

export const getAccessories = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const [rows]: any = await pool.query(
      `SELECT acc.*,
              r.title as inverter_title,
              r.recommended_inverter_kw,
              r.recommended_inverter_model,
              r.min_watt as inverter_min_watt,
              r.max_watt as inverter_max_watt
       FROM calculator_accessories acc
       LEFT JOIN calculator_recommendations r ON acc.inverter_id = r.id
       ORDER BY acc.order_index ASC, acc.id ASC`
    );
    const parsed = rows.map((r: any) => ({
      ...r,
      items: typeof r.items === "string" ? JSON.parse(r.items) : (r.items || []),
    }));
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAccessory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const {
      inverter_id,
      name,
      name_bn,
      items,
      order_index,
      is_active,
    } = req.body;

    if (!name || !String(name).trim()) {
      invalidateCalculatorCache();
    res.status(400).json({ success: false, message: "Accessory package name is required." });
      return;
    }

    let itemsJson: string | null = null;
    if (items !== undefined) {
      itemsJson = Array.isArray(items)
        ? JSON.stringify(items)
        : (typeof items === "string" ? items : JSON.stringify([]));
    } else {
      itemsJson = JSON.stringify([]);
    }

    const [result]: any = await pool.query(
      `INSERT INTO calculator_accessories (
        inverter_id,
        name,
        name_bn,
        items,
        order_index,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        inverter_id ? Number(inverter_id) : null,
        String(name).trim(),
        name_bn ? String(name_bn).trim() : null,
        itemsJson,
        order_index !== undefined ? Number(order_index) : 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
      ]
    );

    const [created]: any = await pool.query(
      `SELECT acc.*,
              r.title as inverter_title,
              r.recommended_inverter_kw,
              r.recommended_inverter_model,
              r.min_watt as inverter_min_watt,
              r.max_watt as inverter_max_watt
       FROM calculator_accessories acc
       LEFT JOIN calculator_recommendations r ON acc.inverter_id = r.id
       WHERE acc.id = ?`,
      [result.insertId]
    );

    const parsed = {
      ...created[0],
      items: typeof created[0].items === "string" ? JSON.parse(created[0].items) : (created[0].items || []),
    };

    res.status(201).json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAccessory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    const {
      inverter_id,
      name,
      name_bn,
      items,
      order_index,
      is_active,
    } = req.body;

    const [existingRows]: any = await pool.query("SELECT * FROM calculator_accessories WHERE id = ?", [id]);
    if (!existingRows || existingRows.length === 0) {
      invalidateCalculatorCache();
    res.status(404).json({ success: false, message: "Accessory package not found." });
      return;
    }
    const existing = existingRows[0];

    const updatedInverterId = inverter_id !== undefined ? (inverter_id ? Number(inverter_id) : null) : existing.inverter_id;
    const updatedName = name !== undefined ? String(name).trim() : existing.name;
    const updatedNameBn = name_bn !== undefined ? (name_bn ? String(name_bn).trim() : null) : existing.name_bn;

    let updatedItemsJson: string | null = null;
    if (items !== undefined) {
      updatedItemsJson = Array.isArray(items)
        ? JSON.stringify(items)
        : (typeof items === "string" ? items : JSON.stringify([]));
    } else if (existing.items !== null && existing.items !== undefined) {
      updatedItemsJson = typeof existing.items === "string"
        ? existing.items
        : JSON.stringify(existing.items);
    }

    const updatedOrderIndex = order_index !== undefined ? Number(order_index) : existing.order_index;
    const updatedIsActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

    await pool.query(
      `UPDATE calculator_accessories SET
        inverter_id = ?,
        name = ?,
        name_bn = ?,
        items = ?,
        order_index = ?,
        is_active = ?
       WHERE id = ?`,
      [
        updatedInverterId,
        updatedName,
        updatedNameBn,
        updatedItemsJson,
        updatedOrderIndex,
        updatedIsActive,
        id,
      ]
    );

    const [updated]: any = await pool.query(
      `SELECT acc.*,
              r.title as inverter_title,
              r.recommended_inverter_kw,
              r.recommended_inverter_model,
              r.min_watt as inverter_min_watt,
              r.max_watt as inverter_max_watt
       FROM calculator_accessories acc
       LEFT JOIN calculator_recommendations r ON acc.inverter_id = r.id
       WHERE acc.id = ?`,
      [id]
    );

    const parsed = {
      ...updated[0],
      items: typeof updated[0].items === "string" ? JSON.parse(updated[0].items) : (updated[0].items || []),
    };

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAccessory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    const [existing]: any = await pool.query("SELECT id FROM calculator_accessories WHERE id = ?", [id]);
    if (!existing || existing.length === 0) {
      invalidateCalculatorCache();
    res.status(404).json({ success: false, message: "Accessory package not found." });
      return;
    }
    await pool.query("DELETE FROM calculator_accessories WHERE id = ?", [id]);
    res.json({ success: true, message: "Accessory package deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// PACKAGES PANEL CRUD (ADMIN)
// ==========================================

export const getPackages = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const [rows]: any = await pool.query(
      `SELECT pkg.*,
              r.title as inverter_title, r.recommended_inverter_kw, r.recommended_inverter_model,
              p.name as panel_name, p.wattage as panel_wattage, p.model as panel_model,
              b.name as battery_name, b.model as battery_model,
              acc.name as accessory_name
       FROM calculator_packages pkg
       LEFT JOIN calculator_recommendations r ON pkg.inverter_id = r.id
       LEFT JOIN calculator_panels p ON pkg.panel_id = p.id
       LEFT JOIN calculator_battery_types b ON pkg.battery_type_id = b.id
       LEFT JOIN calculator_accessories acc ON pkg.accessory_id = acc.id
       ORDER BY pkg.order_index ASC, pkg.id ASC`
    );
    const parsed = rows.map((r: any) => ({
      ...r,
      features: typeof r.features === "string" ? JSON.parse(r.features) : (r.features || []),
    }));
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPackage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const {
      name,
      name_bn,
      min_watt,
      max_watt,
      features,
      description,
      description_bn,
      inverter_id,
      inverter_qty = 1,
      inverter_unit_price = 0,
      inverter_subtotal = 0,
      panel_id,
      panel_qty = 0,
      panel_unit_price = 0,
      panel_subtotal = 0,
      battery_type_id,
      battery_qty = 0,
      battery_unit_price = 0,
      battery_subtotal = 0,
      accessory_id,
      accessory_qty = 1,
      accessory_unit_price = 0,
      accessory_subtotal = 0,
      total_price = 0,
      price_bdt,
      order_index,
      is_active,
    } = req.body;

    if (!name || !String(name).trim()) {
      invalidateCalculatorCache();
    res.status(400).json({ success: false, message: "Package name is required." });
      return;
    }

    let featuresJson: string | null = null;
    if (features !== undefined) {
      featuresJson = Array.isArray(features)
        ? JSON.stringify(features)
        : (typeof features === "string" ? features : JSON.stringify([]));
    } else {
      featuresJson = JSON.stringify([]);
    }

    const calcTotal = Number(total_price) || (
      Number(inverter_subtotal || 0) +
      Number(panel_subtotal || 0) +
      Number(battery_subtotal || 0) +
      Number(accessory_subtotal || 0)
    );

    const formattedPriceBdt = price_bdt && String(price_bdt).trim()
      ? String(price_bdt).trim()
      : `৳${Math.round(calcTotal).toLocaleString("en-BD")}`;

    const [result]: any = await pool.query(
      `INSERT INTO calculator_packages (
        name,
        name_bn,
        min_watt,
        max_watt,
        features,
        description,
        description_bn,
        inverter_id,
        inverter_qty,
        inverter_unit_price,
        inverter_subtotal,
        panel_id,
        panel_qty,
        panel_unit_price,
        panel_subtotal,
        battery_type_id,
        battery_qty,
        battery_unit_price,
        battery_subtotal,
        accessory_id,
        accessory_qty,
        accessory_unit_price,
        accessory_subtotal,
        total_price,
        price_bdt,
        order_index,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        name_bn ? String(name_bn).trim() : null,
        min_watt !== undefined ? Number(min_watt) : 0,
        max_watt !== undefined ? Number(max_watt) : 0,
        featuresJson,
        description ? String(description).trim() : null,
        description_bn ? String(description_bn).trim() : null,
        inverter_id ? Number(inverter_id) : null,
        Number(inverter_qty) || 0,
        Number(inverter_unit_price) || 0,
        Number(inverter_subtotal) || 0,
        panel_id ? Number(panel_id) : null,
        Number(panel_qty) || 0,
        Number(panel_unit_price) || 0,
        Number(panel_subtotal) || 0,
        battery_type_id ? Number(battery_type_id) : null,
        Number(battery_qty) || 0,
        Number(battery_unit_price) || 0,
        Number(battery_subtotal) || 0,
        accessory_id ? Number(accessory_id) : null,
        Number(accessory_qty) || 0,
        Number(accessory_unit_price) || 0,
        Number(accessory_subtotal) || 0,
        calcTotal,
        formattedPriceBdt,
        order_index !== undefined ? Number(order_index) : 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
      ]
    );

    const [created]: any = await pool.query(
      `SELECT pkg.*,
              r.title as inverter_title, r.recommended_inverter_kw, r.recommended_inverter_model,
              p.name as panel_name, p.wattage as panel_wattage, p.model as panel_model,
              b.name as battery_name, b.model as battery_model,
              acc.name as accessory_name
       FROM calculator_packages pkg
       LEFT JOIN calculator_recommendations r ON pkg.inverter_id = r.id
       LEFT JOIN calculator_panels p ON pkg.panel_id = p.id
       LEFT JOIN calculator_battery_types b ON pkg.battery_type_id = b.id
       LEFT JOIN calculator_accessories acc ON pkg.accessory_id = acc.id
       WHERE pkg.id = ?`,
      [result.insertId]
    );

    const parsed = {
      ...created[0],
      features: typeof created[0].features === "string" ? JSON.parse(created[0].features) : (created[0].features || []),
    };

    res.status(201).json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePackage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    const {
      name,
      name_bn,
      min_watt,
      max_watt,
      features,
      description,
      description_bn,
      inverter_id,
      inverter_qty,
      inverter_unit_price,
      inverter_subtotal,
      panel_id,
      panel_qty,
      panel_unit_price,
      panel_subtotal,
      battery_type_id,
      battery_qty,
      battery_unit_price,
      battery_subtotal,
      accessory_id,
      accessory_qty,
      accessory_unit_price,
      accessory_subtotal,
      total_price,
      price_bdt,
      order_index,
      is_active,
    } = req.body;

    const [existingRows]: any = await pool.query("SELECT * FROM calculator_packages WHERE id = ?", [id]);
    if (!existingRows || existingRows.length === 0) {
      invalidateCalculatorCache();
    res.status(404).json({ success: false, message: "Package not found." });
      return;
    }
    const existing = existingRows[0];

    const updatedName = name !== undefined ? String(name).trim() : existing.name;
    const updatedNameBn = name_bn !== undefined ? (name_bn ? String(name_bn).trim() : null) : existing.name_bn;
    const updatedMinWatt = min_watt !== undefined ? Number(min_watt) : existing.min_watt;
    const updatedMaxWatt = max_watt !== undefined ? Number(max_watt) : existing.max_watt;

    let updatedFeaturesJson: string | null = null;
    if (features !== undefined) {
      updatedFeaturesJson = Array.isArray(features)
        ? JSON.stringify(features)
        : (typeof features === "string" ? features : JSON.stringify([]));
    } else if (existing.features !== null && existing.features !== undefined) {
      updatedFeaturesJson = typeof existing.features === "string"
        ? existing.features
        : JSON.stringify(existing.features);
    }

    const updatedDesc = description !== undefined ? (description ? String(description).trim() : null) : existing.description;
    const updatedDescBn = description_bn !== undefined ? (description_bn ? String(description_bn).trim() : null) : existing.description_bn;

    const updatedInverterId = inverter_id !== undefined ? (inverter_id ? Number(inverter_id) : null) : existing.inverter_id;
    const updatedInverterQty = inverter_qty !== undefined ? Number(inverter_qty) : existing.inverter_qty;
    const updatedInverterUnitPrice = inverter_unit_price !== undefined ? Number(inverter_unit_price) : existing.inverter_unit_price;
    const updatedInverterSubtotal = inverter_subtotal !== undefined ? Number(inverter_subtotal) : (updatedInverterUnitPrice * updatedInverterQty);

    const updatedPanelId = panel_id !== undefined ? (panel_id ? Number(panel_id) : null) : existing.panel_id;
    const updatedPanelQty = panel_qty !== undefined ? Number(panel_qty) : existing.panel_qty;
    const updatedPanelUnitPrice = panel_unit_price !== undefined ? Number(panel_unit_price) : existing.panel_unit_price;
    const updatedPanelSubtotal = panel_subtotal !== undefined ? Number(panel_subtotal) : (updatedPanelUnitPrice * updatedPanelQty);

    const updatedBatteryTypeId = battery_type_id !== undefined ? (battery_type_id ? Number(battery_type_id) : null) : existing.battery_type_id;
    const updatedBatteryQty = battery_qty !== undefined ? Number(battery_qty) : existing.battery_qty;
    const updatedBatteryUnitPrice = battery_unit_price !== undefined ? Number(battery_unit_price) : existing.battery_unit_price;
    const updatedBatterySubtotal = battery_subtotal !== undefined ? Number(battery_subtotal) : (updatedBatteryUnitPrice * updatedBatteryQty);

    const updatedAccessoryId = accessory_id !== undefined ? (accessory_id ? Number(accessory_id) : null) : existing.accessory_id;
    const updatedAccessoryQty = accessory_qty !== undefined ? Number(accessory_qty) : existing.accessory_qty;
    const updatedAccessoryUnitPrice = accessory_unit_price !== undefined ? Number(accessory_unit_price) : existing.accessory_unit_price;
    const updatedAccessorySubtotal = accessory_subtotal !== undefined ? Number(accessory_subtotal) : (updatedAccessoryUnitPrice * updatedAccessoryQty);

    const updatedTotalPrice = total_price !== undefined
      ? Number(total_price)
      : (updatedInverterSubtotal + updatedPanelSubtotal + updatedBatterySubtotal + updatedAccessorySubtotal);

    const updatedPriceBdt = price_bdt !== undefined
      ? (price_bdt ? String(price_bdt).trim() : null)
      : (existing.price_bdt || `৳${Math.round(updatedTotalPrice).toLocaleString("en-BD")}`);

    const updatedOrderIndex = order_index !== undefined ? Number(order_index) : existing.order_index;
    const updatedIsActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

    await pool.query(
      `UPDATE calculator_packages SET
        name = ?,
        name_bn = ?,
        min_watt = ?,
        max_watt = ?,
        features = ?,
        description = ?,
        description_bn = ?,
        inverter_id = ?,
        inverter_qty = ?,
        inverter_unit_price = ?,
        inverter_subtotal = ?,
        panel_id = ?,
        panel_qty = ?,
        panel_unit_price = ?,
        panel_subtotal = ?,
        battery_type_id = ?,
        battery_qty = ?,
        battery_unit_price = ?,
        battery_subtotal = ?,
        accessory_id = ?,
        accessory_qty = ?,
        accessory_unit_price = ?,
        accessory_subtotal = ?,
        total_price = ?,
        price_bdt = ?,
        order_index = ?,
        is_active = ?
       WHERE id = ?`,
      [
        updatedName,
        updatedNameBn,
        updatedMinWatt,
        updatedMaxWatt,
        updatedFeaturesJson,
        updatedDesc,
        updatedDescBn,
        updatedInverterId,
        updatedInverterQty,
        updatedInverterUnitPrice,
        updatedInverterSubtotal,
        updatedPanelId,
        updatedPanelQty,
        updatedPanelUnitPrice,
        updatedPanelSubtotal,
        updatedBatteryTypeId,
        updatedBatteryQty,
        updatedBatteryUnitPrice,
        updatedBatterySubtotal,
        updatedAccessoryId,
        updatedAccessoryQty,
        updatedAccessoryUnitPrice,
        updatedAccessorySubtotal,
        updatedTotalPrice,
        updatedPriceBdt,
        updatedOrderIndex,
        updatedIsActive,
        id,
      ]
    );

    const [updated]: any = await pool.query(
      `SELECT pkg.*,
              r.title as inverter_title, r.recommended_inverter_kw, r.recommended_inverter_model,
              p.name as panel_name, p.wattage as panel_wattage, p.model as panel_model,
              b.name as battery_name, b.model as battery_model,
              acc.name as accessory_name
       FROM calculator_packages pkg
       LEFT JOIN calculator_recommendations r ON pkg.inverter_id = r.id
       LEFT JOIN calculator_panels p ON pkg.panel_id = p.id
       LEFT JOIN calculator_battery_types b ON pkg.battery_type_id = b.id
       LEFT JOIN calculator_accessories acc ON pkg.accessory_id = acc.id
       WHERE pkg.id = ?`,
      [id]
    );

    const parsed = {
      ...updated[0],
      features: typeof updated[0].features === "string" ? JSON.parse(updated[0].features) : (updated[0].features || []),
    };

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePackage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const { id } = req.params;
    const [existing]: any = await pool.query("SELECT id FROM calculator_packages WHERE id = ?", [id]);
    if (!existing || existing.length === 0) {
      invalidateCalculatorCache();
    res.status(404).json({ success: false, message: "Package not found." });
      return;
    }
    await pool.query("DELETE FROM calculator_packages WHERE id = ?", [id]);
    res.json({ success: true, message: "Package deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// CALCULATOR SETTINGS (GRID TARIFF & ASSUMPTIONS)
// ==========================================

export const getCalculatorSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const [rows]: any = await pool.query("SELECT * FROM calculator_settings WHERE id = 1");
    const data = rows && rows[0] ? rows[0] : {
      id: 1,
      grid_tariff_bdt: 10.50,
      grid_tariff_usd: 0.16,
      solar_offset_percent: 95.00
    };
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCalculatorSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureCalculatorTables();
    const body = req.body || {};

    const [existingRows]: any = await pool.query("SELECT * FROM calculator_settings WHERE id = 1");
    const existing = existingRows && existingRows[0] ? existingRows[0] : {};

    const grid_tariff_bdt = body.grid_tariff_bdt !== undefined ? Number(body.grid_tariff_bdt) : (existing.grid_tariff_bdt ?? 10.50);
    const grid_tariff_usd = body.grid_tariff_usd !== undefined ? Number(body.grid_tariff_usd) : (existing.grid_tariff_usd ?? 0.16);
    const solar_offset_percent = body.solar_offset_percent !== undefined ? Number(body.solar_offset_percent) : (existing.solar_offset_percent ?? 95.00);

    const step2_subtitle = body.step2_subtitle !== undefined ? body.step2_subtitle : existing.step2_subtitle;
    const step2_subtitle_bn = body.step2_subtitle_bn !== undefined ? body.step2_subtitle_bn : existing.step2_subtitle_bn;
    const step2_title = body.step2_title !== undefined ? body.step2_title : existing.step2_title;
    const step2_title_bn = body.step2_title_bn !== undefined ? body.step2_title_bn : existing.step2_title_bn;
    const step2_description = body.step2_description !== undefined ? body.step2_description : existing.step2_description;
    const step2_description_bn = body.step2_description_bn !== undefined ? body.step2_description_bn : existing.step2_description_bn;

    const step3_subtitle = body.step3_subtitle !== undefined ? body.step3_subtitle : existing.step3_subtitle;
    const step3_subtitle_bn = body.step3_subtitle_bn !== undefined ? body.step3_subtitle_bn : existing.step3_subtitle_bn;
    const step3_title = body.step3_title !== undefined ? body.step3_title : existing.step3_title;
    const step3_title_bn = body.step3_title_bn !== undefined ? body.step3_title_bn : existing.step3_title_bn;
    const step3_description = body.step3_description !== undefined ? body.step3_description : existing.step3_description;
    const step3_description_bn = body.step3_description_bn !== undefined ? body.step3_description_bn : existing.step3_description_bn;

    const savings_badge = body.savings_badge !== undefined ? body.savings_badge : existing.savings_badge;
    const savings_badge_bn = body.savings_badge_bn !== undefined ? body.savings_badge_bn : existing.savings_badge_bn;
    const savings_title = body.savings_title !== undefined ? body.savings_title : existing.savings_title;
    const savings_title_bn = body.savings_title_bn !== undefined ? body.savings_title_bn : existing.savings_title_bn;

    const itemized_breakdown_badge = body.itemized_breakdown_badge !== undefined ? body.itemized_breakdown_badge : existing.itemized_breakdown_badge;
    const itemized_breakdown_badge_bn = body.itemized_breakdown_badge_bn !== undefined ? body.itemized_breakdown_badge_bn : existing.itemized_breakdown_badge_bn;
    const itemized_breakdown_title = body.itemized_breakdown_title !== undefined ? body.itemized_breakdown_title : existing.itemized_breakdown_title;
    const itemized_breakdown_title_bn = body.itemized_breakdown_title_bn !== undefined ? body.itemized_breakdown_title_bn : existing.itemized_breakdown_title_bn;

    const epc_assurance_badge = body.epc_assurance_badge !== undefined ? body.epc_assurance_badge : existing.epc_assurance_badge;
    const epc_assurance_badge_bn = body.epc_assurance_badge_bn !== undefined ? body.epc_assurance_badge_bn : existing.epc_assurance_badge_bn;
    const epc_assurance_title = body.epc_assurance_title !== undefined ? body.epc_assurance_title : existing.epc_assurance_title;
    const epc_assurance_title_bn = body.epc_assurance_title_bn !== undefined ? body.epc_assurance_title_bn : existing.epc_assurance_title_bn;
    const epc_assurance_tier_badge = body.epc_assurance_tier_badge !== undefined ? body.epc_assurance_tier_badge : existing.epc_assurance_tier_badge;
    const epc_assurance_tier_badge_bn = body.epc_assurance_tier_badge_bn !== undefined ? body.epc_assurance_tier_badge_bn : existing.epc_assurance_tier_badge_bn;

    const warranty_card1_title = body.warranty_card1_title !== undefined ? body.warranty_card1_title : existing.warranty_card1_title;
    const warranty_card1_title_bn = body.warranty_card1_title_bn !== undefined ? body.warranty_card1_title_bn : existing.warranty_card1_title_bn;
    const warranty_card1_desc = body.warranty_card1_desc !== undefined ? body.warranty_card1_desc : existing.warranty_card1_desc;
    const warranty_card1_desc_bn = body.warranty_card1_desc_bn !== undefined ? body.warranty_card1_desc_bn : existing.warranty_card1_desc_bn;

    const warranty_card2_title = body.warranty_card2_title !== undefined ? body.warranty_card2_title : existing.warranty_card2_title;
    const warranty_card2_title_bn = body.warranty_card2_title_bn !== undefined ? body.warranty_card2_title_bn : existing.warranty_card2_title_bn;
    const warranty_card2_desc = body.warranty_card2_desc !== undefined ? body.warranty_card2_desc : existing.warranty_card2_desc;
    const warranty_card2_desc_bn = body.warranty_card2_desc_bn !== undefined ? body.warranty_card2_desc_bn : existing.warranty_card2_desc_bn;

    const epc_advice_title = body.epc_advice_title !== undefined ? body.epc_advice_title : existing.epc_advice_title;
    const epc_advice_title_bn = body.epc_advice_title_bn !== undefined ? body.epc_advice_title_bn : existing.epc_advice_title_bn;
    const epc_advice_desc = body.epc_advice_desc !== undefined ? body.epc_advice_desc : existing.epc_advice_desc;
    const epc_advice_desc_bn = body.epc_advice_desc_bn !== undefined ? body.epc_advice_desc_bn : existing.epc_advice_desc_bn;
    const epc_advice_btn_text = body.epc_advice_btn_text !== undefined ? body.epc_advice_btn_text : existing.epc_advice_btn_text;
    const epc_advice_btn_text_bn = body.epc_advice_btn_text_bn !== undefined ? body.epc_advice_btn_text_bn : existing.epc_advice_btn_text_bn;
    const epc_advice_btn_url = body.epc_advice_btn_url !== undefined ? body.epc_advice_btn_url : existing.epc_advice_btn_url;

    await pool.query(
      `INSERT INTO calculator_settings (
        id, grid_tariff_bdt, grid_tariff_usd, solar_offset_percent,
        step2_subtitle, step2_subtitle_bn, step2_title, step2_title_bn, step2_description, step2_description_bn,
        step3_subtitle, step3_subtitle_bn, step3_title, step3_title_bn, step3_description, step3_description_bn,
        savings_badge, savings_badge_bn, savings_title, savings_title_bn,
        itemized_breakdown_badge, itemized_breakdown_badge_bn, itemized_breakdown_title, itemized_breakdown_title_bn,
        epc_assurance_badge, epc_assurance_badge_bn, epc_assurance_title, epc_assurance_title_bn, epc_assurance_tier_badge, epc_assurance_tier_badge_bn,
        warranty_card1_title, warranty_card1_title_bn, warranty_card1_desc, warranty_card1_desc_bn,
        warranty_card2_title, warranty_card2_title_bn, warranty_card2_desc, warranty_card2_desc_bn,
        epc_advice_title, epc_advice_title_bn, epc_advice_desc, epc_advice_desc_bn, epc_advice_btn_text, epc_advice_btn_text_bn, epc_advice_btn_url
      ) VALUES (
        1, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?
      ) ON DUPLICATE KEY UPDATE
        grid_tariff_bdt = VALUES(grid_tariff_bdt),
        grid_tariff_usd = VALUES(grid_tariff_usd),
        solar_offset_percent = VALUES(solar_offset_percent),
        step2_subtitle = VALUES(step2_subtitle),
        step2_subtitle_bn = VALUES(step2_subtitle_bn),
        step2_title = VALUES(step2_title),
        step2_title_bn = VALUES(step2_title_bn),
        step2_description = VALUES(step2_description),
        step2_description_bn = VALUES(step2_description_bn),
        step3_subtitle = VALUES(step3_subtitle),
        step3_subtitle_bn = VALUES(step3_subtitle_bn),
        step3_title = VALUES(step3_title),
        step3_title_bn = VALUES(step3_title_bn),
        step3_description = VALUES(step3_description),
        step3_description_bn = VALUES(step3_description_bn),
        savings_badge = VALUES(savings_badge),
        savings_badge_bn = VALUES(savings_badge_bn),
        savings_title = VALUES(savings_title),
        savings_title_bn = VALUES(savings_title_bn),
        itemized_breakdown_badge = VALUES(itemized_breakdown_badge),
        itemized_breakdown_badge_bn = VALUES(itemized_breakdown_badge_bn),
        itemized_breakdown_title = VALUES(itemized_breakdown_title),
        itemized_breakdown_title_bn = VALUES(itemized_breakdown_title_bn),
        epc_assurance_badge = VALUES(epc_assurance_badge),
        epc_assurance_badge_bn = VALUES(epc_assurance_badge_bn),
        epc_assurance_title = VALUES(epc_assurance_title),
        epc_assurance_title_bn = VALUES(epc_assurance_title_bn),
        epc_assurance_tier_badge = VALUES(epc_assurance_tier_badge),
        epc_assurance_tier_badge_bn = VALUES(epc_assurance_tier_badge_bn),
        warranty_card1_title = VALUES(warranty_card1_title),
        warranty_card1_title_bn = VALUES(warranty_card1_title_bn),
        warranty_card1_desc = VALUES(warranty_card1_desc),
        warranty_card1_desc_bn = VALUES(warranty_card1_desc_bn),
        warranty_card2_title = VALUES(warranty_card2_title),
        warranty_card2_title_bn = VALUES(warranty_card2_title_bn),
        warranty_card2_desc = VALUES(warranty_card2_desc),
        warranty_card2_desc_bn = VALUES(warranty_card2_desc_bn),
        epc_advice_title = VALUES(epc_advice_title),
        epc_advice_title_bn = VALUES(epc_advice_title_bn),
        epc_advice_desc = VALUES(epc_advice_desc),
        epc_advice_desc_bn = VALUES(epc_advice_desc_bn),
        epc_advice_btn_text = VALUES(epc_advice_btn_text),
        epc_advice_btn_text_bn = VALUES(epc_advice_btn_text_bn),
        epc_advice_btn_url = VALUES(epc_advice_btn_url)`,
      [
        grid_tariff_bdt, grid_tariff_usd, solar_offset_percent,
        step2_subtitle, step2_subtitle_bn, step2_title, step2_title_bn, step2_description, step2_description_bn,
        step3_subtitle, step3_subtitle_bn, step3_title, step3_title_bn, step3_description, step3_description_bn,
        savings_badge, savings_badge_bn, savings_title, savings_title_bn,
        itemized_breakdown_badge, itemized_breakdown_badge_bn, itemized_breakdown_title, itemized_breakdown_title_bn,
        epc_assurance_badge, epc_assurance_badge_bn, epc_assurance_title, epc_assurance_title_bn, epc_assurance_tier_badge, epc_assurance_tier_badge_bn,
        warranty_card1_title, warranty_card1_title_bn, warranty_card1_desc, warranty_card1_desc_bn,
        warranty_card2_title, warranty_card2_title_bn, warranty_card2_desc, warranty_card2_desc_bn,
        epc_advice_title, epc_advice_title_bn, epc_advice_desc, epc_advice_desc_bn, epc_advice_btn_text, epc_advice_btn_text_bn, epc_advice_btn_url
      ]
    );

    const [rows]: any = await pool.query("SELECT * FROM calculator_settings WHERE id = 1");
    invalidateCalculatorCache();
    res.json({ success: true, data: rows[0], message: "Calculator settings updated successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};




