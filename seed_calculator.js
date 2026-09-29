import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'solvex_db'
  });

  console.log('Connected to MySQL');

  // Check columns on calculator_solar_types
  const [cols] = await conn.query('SHOW COLUMNS FROM calculator_solar_types');
  const colNames = cols.map((c) => c.Field);

  if (!colNames.includes('inverter_id')) {
    await conn.query('ALTER TABLE calculator_solar_types ADD COLUMN inverter_id INT NULL');
    console.log('Added inverter_id column');
  }
  if (!colNames.includes('min_watt')) {
    await conn.query('ALTER TABLE calculator_solar_types ADD COLUMN min_watt INT DEFAULT 0');
    console.log('Added min_watt column');
  }
  if (!colNames.includes('max_watt')) {
    await conn.query('ALTER TABLE calculator_solar_types ADD COLUMN max_watt INT DEFAULT 0');
    console.log('Added max_watt column');
  }
  if (!colNames.includes('model')) {
    await conn.query('ALTER TABLE calculator_solar_types ADD COLUMN model VARCHAR(191) NULL');
    console.log('Added model column');
  }
  if (!colNames.includes('price_bdt')) {
    await conn.query('ALTER TABLE calculator_solar_types ADD COLUMN price_bdt VARCHAR(100) NULL');
    console.log('Added price_bdt column');
  }
  if (!colNames.includes('price_usd')) {
    await conn.query('ALTER TABLE calculator_solar_types ADD COLUMN price_usd VARCHAR(100) NULL');
    console.log('Added price_usd column');
  }
  if (!colNames.includes('features')) {
    await conn.query('ALTER TABLE calculator_solar_types ADD COLUMN features JSON NULL');
    console.log('Added features column');
  }

  // 10 Inverters
  const inverters = [
    {
      title: 'Solvex MicroHome 1kVA Pure Sine Wave Inverter',
      title_bn: 'সলভেক্স মাইক্রোহোম ১kVA পিওর সাইন ওয়েভ ইনভার্টার',
      min_watt: 0,
      max_watt: 600,
      recommended_inverter_kw: 1.0,
      recommended_inverter_model: 'Solvex EcoSine 1000VA / 12V',
      estimated_cost_bdt: '৳45,000 - ৳55,000',
      estimated_cost_usd: '$380 - $460',
      description: 'Ideal for basic apartment lighting, fans, Wi-Fi, and television backup.',
      description_bn: 'বাসাবাড়ির লাইট, ফ্যান, ওয়াই-ফাই রাউটার ও টিভি চালানোর জন্য উপযুক্ত।',
      features: ['Pure Sine Wave AC Output', 'Smart PWM Solar Charge Controller', 'Overload & Short Circuit Protection', 'LED Status Indicator'],
      order_index: 1
    },
    {
      title: 'Solvex SmartHome 1.5kVA Hybrid Inverter',
      title_bn: 'সলভেক্স স্মার্টহোম ১.৫kVA হাইব্রিড ইনভার্টার',
      min_watt: 601,
      max_watt: 1000,
      recommended_inverter_kw: 1.5,
      recommended_inverter_model: 'Solvex SolarEdge 1.5kVA / 24V',
      estimated_cost_bdt: '৳68,000 - ৳82,000',
      estimated_cost_usd: '$570 - $690',
      description: 'Perfect for 2-3 bedroom apartments with refrigerator, fans, and computer workstations.',
      description_bn: '২-৩ রুমের বাসা, ফ্রিজ, ফ্যান এবং কম্পিউটার চালানোর চমৎকার হাইব্রিড সমাধান।',
      features: ['High Efficiency MPPT Controller (40A)', 'Dual Battery 24V DC Architecture', 'Instant Transfer Time (<10ms)', 'LCD Multi-Function Display'],
      order_index: 2
    },
    {
      title: 'Solvex 2.2kW Smart Hybrid Inverter',
      title_bn: 'সলভেক্স ২.২kW স্মার্ট হাইব্রিড ইনভার্টার',
      min_watt: 1001,
      max_watt: 1600,
      recommended_inverter_kw: 2.2,
      recommended_inverter_model: 'Solvex PowerMax 2200H / 24V',
      estimated_cost_bdt: '৳95,000 - ৳1,15,000',
      estimated_cost_usd: '$800 - $970',
      description: 'Robust power solution running deep fridge, kitchen appliances, and home entertainment.',
      description_bn: 'ডিপ ফ্রিজ, কিচেন অ্যাপ্লায়েন্স ও টেলিভিশন সহ নিরবচ্ছিন্ন ব্যাকআপের ব্যবস্থা।',
      features: ['Built-in 60A MPPT Solar Charger', 'Mobile Wi-Fi Remote Monitoring', 'Supports Lithium-ion and Tubular Batteries', 'Zero Flickering Transfer Mode'],
      order_index: 3
    },
    {
      title: 'Solvex 3.5kW Prime Hybrid Inverter',
      title_bn: 'সলভেক্স ৩.৫kW প্রাইম হাইব্রিড ইনভার্টার',
      min_watt: 1601,
      max_watt: 2500,
      recommended_inverter_kw: 3.5,
      recommended_inverter_model: 'Solvex VoltMaster 3500H / 48V',
      estimated_cost_bdt: '৳1,45,000 - ৳1,75,000',
      estimated_cost_usd: '$1,220 - $1,470',
      description: 'High-capacity residential system capable of powering 1.0 Ton Inverter AC plus essential household loads.',
      description_bn: '১ টন ইনভার্টার এসি এবং ঘরের সমস্ত প্রয়োজনীয় লোড অনায়াসে চালানোর সক্ষমতা।',
      features: ['Pure Sine Wave with 80A MPPT', 'Wide PV Input Range (120V - 450V DC)', 'Parallel Operation Capable', 'Smart Battery Equalization'],
      order_index: 4
    },
    {
      title: 'Solvex 5.0kW Ultra Hybrid Solar Inverter',
      title_bn: 'সলভেক্স ৫.০kW আল্ট্রা হাইব্রিড সোলার ইনভার্টার',
      min_watt: 2501,
      max_watt: 3800,
      recommended_inverter_kw: 5.0,
      recommended_inverter_model: 'Solvex SolisPro 5000H / 48V',
      estimated_cost_bdt: '৳2,10,000 - ৳2,50,000',
      estimated_cost_usd: '$1,760 - $2,100',
      description: 'Designed for premium modern residences and duplex villas with high daytime cooling requirements.',
      description_bn: 'আধুনিক ডুপ্লেক্স ও ফ্ল্যাটে ১.৫ টন এসি ও মোটর চালানোর প্রিমিয়াম সোলার ইনভার্টার।',
      features: ['Dual MPPT Trackers (100A Max)', '1.5 Ton AC + Water Pump Support', 'BMS Communication Port (CAN / RS485)', 'Export Power Limitation (Zero-Export)'],
      order_index: 5
    },
    {
      title: 'Solvex 6.5kW Duplex Hybrid Inverter',
      title_bn: 'সলভেক্স ৬.৫kW ডুপ্লেক্স হাইব্রিড ইনভার্টার',
      min_watt: 3801,
      max_watt: 5200,
      recommended_inverter_kw: 6.5,
      recommended_inverter_model: 'Solvex GrandVolt 6500H',
      estimated_cost_bdt: '৳2,85,000 - ৳3,40,000',
      estimated_cost_usd: '$2,400 - $2,850',
      description: 'Ideal for large family homes, clinics, and offices requiring heavy motor start-up capacity.',
      description_bn: 'বড় পরিবার, ক্লিনিক এবং অফিসের হেভি লোড ও মোটর চালানোর উপযোগী।',
      features: ['High Surge Capacity (13kW Peak)', 'Dual AC Outlets for Critical / Non-Critical Loads', 'Intelligent Peak Shaving Mode', 'Cloud Data Logging via iOS / Android App'],
      order_index: 6
    },
    {
      title: 'Solvex 8.0kW Commercial Pro Hybrid Inverter',
      title_bn: 'সলভেক্স ৮.০kW কমার্শিয়াল প্রো হাইব্রিড ইনভার্টার',
      min_watt: 5201,
      max_watt: 7000,
      recommended_inverter_kw: 8.0,
      recommended_inverter_model: 'Solvex Enterprise 8000H / 48V',
      estimated_cost_bdt: '৳3,60,000 - ৳4,30,000',
      estimated_cost_usd: '$3,000 - $3,600',
      description: 'Heavy commercial single/split-phase powerhouse for retail stores, restaurants, and schools.',
      description_bn: 'রেস্তোরাঁ, শোরুম ও শিক্ষা প্রতিষ্ঠানের জন্য শক্তিশালী বাণিজ্যিক ইনভার্টার।',
      features: ['Triple MPPT Solar Tracking Inputs', 'Supports up to 6 Inverters in Parallel', 'Net Metering Grid Export Capable', 'Arc Fault Circuit Interrupter (AFCI) Protection'],
      order_index: 7
    },
    {
      title: 'Solvex 10kW 3-Phase Commercial Hybrid Inverter',
      title_bn: 'সলভেক্স ১০kW ৩-ফেজ কমার্শিয়াল হাইব্রিড ইনভার্টার',
      min_watt: 7001,
      max_watt: 9500,
      recommended_inverter_kw: 10.0,
      recommended_inverter_model: 'Solvex TriPhase 10K-Pro',
      estimated_cost_bdt: '৳4,80,000 - ৳5,70,000',
      estimated_cost_usd: '$4,000 - $4,800',
      description: 'Robust 3-phase hybrid solution for petrol pumps, warehouses, hospitals, and agro-farms.',
      description_bn: 'পেট্রোল পাম্প, হাসপাতাল, ওয়ারহাউস এবং খামারের জন্য ৩-ফেজ হাইব্রিড সমাধান।',
      features: ['3-Phase 400V Balanced & Unbalanced Output', 'High-Voltage Lithium Battery Input (160V-600V)', 'Industrial Grade IP65 Weatherproof Enclosure', 'Generator Automatic Start Signal Support'],
      order_index: 8
    },
    {
      title: 'Solvex 15kW Industrial Hybrid Inverter',
      title_bn: 'সলভেক্স ১৫kW ইন্ডাস্ট্রিয়াল হাইব্রিড ইনভার্টার',
      min_watt: 9501,
      max_watt: 14000,
      recommended_inverter_kw: 15.0,
      recommended_inverter_model: 'Solvex MegaVolt 15K-3P',
      estimated_cost_bdt: '৳6,90,000 - ৳8,20,000',
      estimated_cost_usd: '$5,800 - $6,900',
      description: 'Tailored for mid-scale manufacturing plants, garment factories, and cold storages.',
      description_bn: 'মাঝারি কারখানা, গার্মেন্টস ও কোল্ড স্টোরেজের নিরবচ্ছিন্ন বিদ্যুৎ নিশ্চিতকারী।',
      features: ['Quad MPPT Controllers with 98.6% Efficiency', 'Heavy Industrial Surge Endurance', 'Integrated Rapid Shutdown Transmitter', 'Direct SCADA & Modbus Integration'],
      order_index: 9
    },
    {
      title: 'Solvex 25kW Mega Commercial Solar Inverter',
      title_bn: 'সলভেক্স ২৫kW মেগা কমার্শিয়াল সোলার ইনভার্টার',
      min_watt: 14001,
      max_watt: 25000,
      recommended_inverter_kw: 25.0,
      recommended_inverter_model: 'Solvex Industrial Max 25K',
      estimated_cost_bdt: '৳10,50,000 - ৳12,50,000',
      estimated_cost_usd: '$8,800 - $10,500',
      description: 'Enterprise utility solution for commercial complexes, educational campuses, and industrial rooftops.',
      description_bn: 'বড় বাণিজ্যিক ভবন ও শিল্প কারখানার জন্য গ্রিড-টাইড ও হাইব্রিড মেগা সোলার ইনভার্টার।',
      features: ['Multi-MPPT High Power Density Design', 'Utility Grade Net Metering Synchronizer', 'Smart I-V Curve Diagnostics', 'Heavy-Duty Surge Protection Device (Type II DC & AC)'],
      order_index: 10
    }
  ];

  // Truncate and re-seed inverters
  await conn.query('DELETE FROM calculator_recommendations');
  console.log('Cleaned old inverters');

  const inverterIds = [];
  for (const inv of inverters) {
    const [res] = await conn.query(
      `INSERT INTO calculator_recommendations 
       (title, title_bn, min_watt, max_watt, recommended_solar_kw, recommended_panels_count, recommended_panel_model, recommended_inverter_kw, recommended_inverter_model, recommended_battery_capacity, package_features, description, description_bn, suggested_product_ids, estimated_cost_bdt, estimated_cost_usd, order_index, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        inv.title,
        inv.title_bn,
        inv.min_watt,
        inv.max_watt,
        inv.recommended_inverter_kw * 1.2,
        Math.ceil((inv.recommended_inverter_kw * 1200) / 580),
        'Solvex 580W Bifacial N-Type TOPCon Modules',
        inv.recommended_inverter_kw,
        inv.recommended_inverter_model,
        'Solvex Smart LiFePO4 Battery Bank',
        JSON.stringify(inv.features),
        inv.description,
        inv.description_bn,
        JSON.stringify([]),
        inv.estimated_cost_bdt,
        inv.estimated_cost_usd,
        inv.order_index,
        1
      ]
    );
    inverterIds.push(res.insertId);
  }
  console.log('Seeded 10 Inverters with IDs:', inverterIds);

  // 10 Matching Solar Types linked to Inverters
  const solarTypes = [
    {
      inverter_index: 0,
      name: 'Solvex EcoLite 600W Hybrid Solar Kit',
      name_bn: 'সলভেক্স ইকোলাইট ৬০০W হাইব্রিড সোলার কিট',
      system_code: 'hybrid_600w',
      model: '1x Solvex 580W N-Type Bifacial Mono Module',
      min_watt: 0,
      max_watt: 600,
      price_bdt: '৳65,000',
      price_usd: '$550',
      tagline: 'Ultra-Compact Rooftop Solar for Urban Apartments',
      description: 'Single high-efficiency bifacial panel setup paired with 1kVA pure sine wave inverter.',
      description_bn: '১টি হাই-ইফিসিয়েন্সি বাইফেসিয়াল সোলার প্যানেল সহ অ্যাপার্টমেন্টের জন্য নিখুঁত সমাধান।',
      features: ['580W High-Efficiency Monocrystalline Module', 'Anodized Aluminum Mounting Structure', 'DC Circuit Breaker & Lightning Arrester', 'IP65 Weatherproof Junction Box'],
      order_index: 1
    },
    {
      inverter_index: 1,
      name: 'Solvex SmartHome 1.16kW Dual-Panel Solar System',
      name_bn: 'সলভেক্স স্মার্টহোম ১.১৬kW ডুয়াল-প্যানেল সোলার সিস্টেম',
      system_code: 'hybrid_1kw',
      model: '2x Solvex 580W TOPCon Bifacial Modules',
      min_watt: 601,
      max_watt: 1000,
      price_bdt: '৳1,15,000',
      price_usd: '$970',
      tagline: 'Dual Solar Modules with High Daytime Generation',
      description: 'Generates up to 5 kWh daily power to keep essential appliances running smoothly.',
      description_bn: 'দৈনিক ৫ ইউনিট পর্যন্ত বিদ্যুৎ উৎপাদন করে প্রয়োজনীয় সব যন্ত্রপাতি সচল রাখে।',
      features: ['1.16kW Peak Solar Array', '25-Year Linear Power Warranty (84.8%)', 'Anti-PID & Dual-Glass Hail Resistance', 'MC4 Pre-crimped UV-resistant Solar Cables'],
      order_index: 2
    },
    {
      inverter_index: 2,
      name: 'Solvex ResidentPro 1.74kW 3-Panel Rooftop Setup',
      name_bn: 'সলভেক্স রেসিডেন্টপ্রো ১.৭৪kW ৩-প্যানেল সোলার সিস্টেম',
      system_code: 'hybrid_1_74kw',
      model: '3x Solvex 580W N-Type Tier-1 Modules',
      min_watt: 1001,
      max_watt: 1600,
      price_bdt: '৳1,65,000',
      price_usd: '$1,390',
      tagline: 'High-Yield Residential Solar Generation',
      description: 'Generates 7.5 to 9 kWh clean solar electricity every day with smart hybrid sync.',
      description_bn: 'প্রতিদিন ৭.৫ থেকে ৯ ইউনিট বিদ্যুৎ উৎপাদন করে এবং স্মার্ট হাইব্রিড সিঙ্ক সুবিধা দেয়।',
      features: ['1.74kW Rooftop Generation', 'Zero Export Controller Compatible', 'High Wind & Cyclone Resistant Railing', 'Integrated Grounding & Earthing Kit'],
      order_index: 3
    },
    {
      inverter_index: 3,
      name: 'Solvex VillaMaster 2.9kW 5-Panel Solar Array',
      name_bn: 'সলভেক্স ভিলামাস্টার ২.৯kW ৫-প্যানেল সোলার অ্যারে',
      system_code: 'hybrid_2_9kw',
      model: '5x Solvex 580W Bifacial High-Yield Modules',
      min_watt: 1601,
      max_watt: 2500,
      price_bdt: '৳2,45,000',
      price_usd: '$2,050',
      tagline: 'Powers 1.0 Ton AC and Complete Villa Lighting',
      description: 'Generates 12 to 14.5 kWh daily clean power, supporting daytime air conditioner load.',
      description_bn: 'দিনের বেলায় এসি সহ ঘরের যাবতীয় লোড চালাতে সক্ষম এবং ১২-১৪.৫ ইউনিট উৎপাদন করে।',
      features: ['2.9kW Clean Daytime Solar Production', 'Bifacial Rear-Side Gain up to 25%', 'Smart String Inverter Optimizer', 'Surge Protection Device (SPD Class II)'],
      order_index: 4
    },
    {
      inverter_index: 4,
      name: 'Solvex SolisPro 4.6kW 8-Panel Smart Solar System',
      name_bn: 'সলভেক্স সলিসপ্রো ৪.৬kW ৮-প্যানেল স্মার্ট সোলার সিস্টেম',
      system_code: 'hybrid_4_6kw',
      model: '8x Solvex 580W N-Type TOPCon Panels',
      min_watt: 2501,
      max_watt: 3800,
      price_bdt: '৳3,75,000',
      price_usd: '$3,150',
      tagline: 'Powers 1.5 Ton AC + Water Pump Directly from Sunshine',
      description: 'Heavy residential array providing up to 22 kWh daily solar generation.',
      description_bn: '১.৫ টন এসি ও পানির পাম্প চালাতে সক্ষম; দৈনিক ২০-২২ ইউনিট বিদ্যুৎ উৎপাদন করে।',
      features: ['4.64kW High-Power PV Array', 'Powers 1.5 Ton AC Directly from Sun', 'Dual-String Balanced MPPT Configuration', 'Galvanized Heavy-Duty Rooftop Structure'],
      order_index: 5
    },
    {
      inverter_index: 5,
      name: 'Solvex DuplexMax 5.8kW 10-Panel High-Yield Solar System',
      name_bn: 'সলভেক্স ডুপ্লেক্সম্যাক্স ৫.৮kW ১০-প্যানেল হাই-ইয়েল্ড সোলার সিস্টেম',
      system_code: 'hybrid_5_8kw',
      model: '10x Solvex 580W Dual-Glass Tier-1 Panels',
      min_watt: 3801,
      max_watt: 5200,
      price_bdt: '৳4,60,000',
      price_usd: '$3,850',
      tagline: 'High-Capacity Duplex & Multi-Family Solar Solution',
      description: 'Produces 26 to 30 kWh daily with dual-glass high durability panels.',
      description_bn: 'ডুপ্লেক্স ও বহুতল ভবনের জন্য আদর্শ; দৈনিক ২৬-৩০ ইউনিট বিদ্যুৎ উৎপাদন করে।',
      features: ['5.8kW Solar Generator', 'High-Temperature Efficiency Performance', 'Smart Cloud Energy Management', 'Net Metering Dual-Bi Directional Ready'],
      order_index: 6
    },
    {
      inverter_index: 6,
      name: 'Solvex Commercial 8.1kW 14-Panel Solar Power Station',
      name_bn: 'সলভেক্স কমার্শিয়াল ৮.১kW ১৪-প্যানেল সোলার পাওয়ার স্টেশন',
      system_code: 'commercial_8_1kw',
      model: '14x Solvex 580W Bifacial N-Type Modules',
      min_watt: 5201,
      max_watt: 7000,
      price_bdt: '৳6,20,000',
      price_usd: '$5,200',
      tagline: 'Commercial Power Station for Supermarkets & Clinics',
      description: 'Produces 36 to 42 kWh daily power, drastically slashing commercial tariff electricity costs.',
      description_bn: 'বাণিজ্যিক প্রতিষ্ঠান, সুপারমার্কেট ও ডায়াগনস্টিকের বিদ্যুৎ খরচ ৮০% পর্যন্ত কমায়।',
      features: ['8.12kW Commercial Rooftop Capacity', 'Arc Fault & Rapid Shutdown Equipped', 'Ideal for Supermarkets & Clinics', 'Heavy Commercial Industrial Racking'],
      order_index: 7
    },
    {
      inverter_index: 7,
      name: 'Solvex TriPhase 11.6kW 20-Panel 3-Phase Solar System',
      name_bn: 'সলভেক্স ৩-ফেজ ১১.৬kW ২০-প্যানেল সোলার সিস্টেম',
      system_code: 'triphase_11_6kw',
      model: '20x Solvex 580W Bifacial High-Power Panels',
      min_watt: 7001,
      max_watt: 9500,
      price_bdt: '৳8,50,000',
      price_usd: '$7,150',
      tagline: 'Heavy 3-Phase Industrial Solution for Motors & Pumps',
      description: 'Produces 50 to 58 kWh daily with balanced 3-phase AC export synchronization.',
      description_bn: '৩-ফেজ ভারী মোটর, ফিলিং স্টেশন ও খামারের জন্য ৫০-৫৮ ইউনিট দৈনিক বিদ্যুৎ উৎপাদনকারী।',
      features: ['11.6kW 3-Phase Industrial Power Generation', 'Zero Daytime Grid Dependency for Motors', 'Smart 3-Phase Load Balancer Integration', '24/7 Industrial Telemetry & Alarms'],
      order_index: 8
    },
    {
      inverter_index: 8,
      name: 'Solvex MegaPower 17.4kW 30-Panel Factory Solar Setup',
      name_bn: 'সলভেক্স মেগাপাওয়ার ১৭.৪kW ৩০-প্যানেল ফ্যাক্টরি সোলার সেটআপ',
      system_code: 'industrial_17_4kw',
      model: '30x Solvex 580W N-Type TOPCon Array',
      min_watt: 9501,
      max_watt: 14000,
      price_bdt: '৳12,20,000',
      price_usd: '$10,250',
      tagline: 'Mid-Scale Industrial Solar Plant with SCADA Monitoring',
      description: 'Produces 75 to 87 kWh daily for continuous factory machinery operations.',
      description_bn: 'মাঝারি কল-কারখানার জন্য দৈনিক ৭৫-৮৭ ইউনিট বিদ্যুৎ উৎপাদন ও ভারী লোড সক্ষমতা।',
      features: ['17.4kW Industrial Array', 'SCADA Ready Monitoring Interface', 'Over 2,200 kWh Average Monthly Generation', 'Heavy-Duty Cable Trays & Weatherproof Disconnects'],
      order_index: 9
    },
    {
      inverter_index: 9,
      name: 'Solvex Industrial Utility 29kW 50-Panel Solar Power Plant',
      name_bn: 'সলভেক্স ইন্ডাস্ট্রিয়াল ইউটিলিটি ২৯kW ৫০-প্যানেল মেগা সোলার প্ল্যান্ট',
      system_code: 'industrial_29kw',
      model: '50x Solvex 580W Bifacial Solar Modules',
      min_watt: 14001,
      max_watt: 25000,
      price_bdt: '৳19,80,000',
      price_usd: '$16,600',
      tagline: 'Turnkey Commercial EPC Solar Power Plant',
      description: 'Produces 130 to 150 kWh daily solar energy with government Net Metering compatibility.',
      description_bn: 'সরকারী নেট মিটারিং সুবিধাযুক্ত মেগা প্ল্যান্ট যা দৈনিক ১৩০-১৫০ ইউনিট বিদ্যুৎ উৎপাদন করে।',
      features: ['29kW Mega Solar Generation', 'Government Net Metering Export Approved', 'Reduces up to 80% Commercial Factory Electric Bills', 'Full EPC Turnkey Warranty with 5 Years O&M'],
      order_index: 10
    }
  ];

  // Truncate and seed solar types
  await conn.query('DELETE FROM calculator_solar_types');
  console.log('Cleaned old solar types');

  for (const st of solarTypes) {
    const invId = inverterIds[st.inverter_index] || null;
    await conn.query(
      `INSERT INTO calculator_solar_types
       (inverter_id, name, name_bn, system_code, min_watt, max_watt, model, price_bdt, price_usd, features, tagline, description, description_bn, benefits, badge, min_recommended_watts, efficiency_factor, order_index, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invId,
        st.name,
        st.name_bn,
        st.system_code,
        st.min_watt,
        st.max_watt,
        st.model,
        st.price_bdt,
        st.price_usd,
        JSON.stringify(st.features),
        st.tagline,
        st.description,
        st.description_bn,
        JSON.stringify(st.features),
        'Tier-1 Solar',
        st.min_watt,
        0.88,
        st.order_index,
        1
      ]
    );
  }
  console.log('Seeded 10 Solar Types linked to Inverters successfully!');

  await conn.end();
}

run().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
