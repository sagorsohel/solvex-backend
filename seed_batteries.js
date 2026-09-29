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

  // Check columns on calculator_battery_types
  const [cols] = await conn.query('SHOW COLUMNS FROM calculator_battery_types');
  const colNames = cols.map((c) => c.Field);

  if (!colNames.includes('inverter_id')) {
    await conn.query('ALTER TABLE calculator_battery_types ADD COLUMN inverter_id INT NULL');
    console.log('Added inverter_id column');
  }
  if (!colNames.includes('min_watt')) {
    await conn.query('ALTER TABLE calculator_battery_types ADD COLUMN min_watt INT DEFAULT 0');
    console.log('Added min_watt column');
  }
  if (!colNames.includes('max_watt')) {
    await conn.query('ALTER TABLE calculator_battery_types ADD COLUMN max_watt INT DEFAULT 0');
    console.log('Added max_watt column');
  }
  if (!colNames.includes('model')) {
    await conn.query('ALTER TABLE calculator_battery_types ADD COLUMN model VARCHAR(191) NULL');
    console.log('Added model column');
  }
  if (!colNames.includes('price_bdt')) {
    await conn.query('ALTER TABLE calculator_battery_types ADD COLUMN price_bdt VARCHAR(100) NULL');
    console.log('Added price_bdt column');
  }
  if (!colNames.includes('price_usd')) {
    await conn.query('ALTER TABLE calculator_battery_types ADD COLUMN price_usd VARCHAR(100) NULL');
    console.log('Added price_usd column');
  }
  if (!colNames.includes('features')) {
    await conn.query('ALTER TABLE calculator_battery_types ADD COLUMN features JSON NULL');
    console.log('Added features column');
  }

  // Fetch recommendations/inverters in order
  const [inverters] = await conn.query('SELECT id, min_watt, max_watt, title, recommended_inverter_kw FROM calculator_recommendations ORDER BY order_index ASC, id ASC');
  console.log(`Found ${inverters.length} inverters in database`);

  const batteryData = [
    {
      inverter_index: 0,
      name: 'Solvex PowerPack 1.28kWh Lithium LiFePO4 Battery',
      name_bn: 'সলভেক্স পাওয়ারপ্যাক ১.২৮kWh লিথিয়াম ব্যাটারি',
      battery_code: 'lithium_1_28kwh',
      model: '12.8V 100Ah Deep Cycle LiFePO4 with Smart BMS',
      min_watt: 0,
      max_watt: 600,
      price_bdt: '৳38,000',
      price_usd: '$320',
      depth_of_discharge: 90,
      lifespan_years: '10-15 Years',
      cycle_life: 6000,
      maintenance: 'Zero Maintenance',
      badge: 'Grade-A LiFePO4',
      tagline: 'Ultra-Safe Prismatic Lithium Storage for Compact Loads',
      description: 'Compact 12.8V 100Ah lithium iron phosphate battery providing long backup hours for lights, fans, and WiFi router.',
      description_bn: '১২.৮V ১০০Ah লিথিয়াম আয়রন ফসফেট ব্যাটারি যা লাইট, ফ্যান ও রাউটারের জন্য দীর্ঘ ব্যাকআপ নিশ্চিত করে।',
      features: [
        'Grade-A Prismatic LiFePO4 Cells',
        'Built-in 100A Smart BMS Protection',
        'Over 6,000 Cycles @ 80% DoD',
        'Lightweight & Wall-Mountable Design'
      ],
      order_index: 1
    },
    {
      inverter_index: 1,
      name: 'Solvex HomeVault 2.56kWh Lithium Energy Storage',
      name_bn: 'সলভেক্স হোমভল্ট ২.৫৬kWh লিথিয়াম ব্যাটারি',
      battery_code: 'lithium_2_56kwh',
      model: '25.6V 100Ah Lithium Iron Phosphate Power Box',
      min_watt: 601,
      max_watt: 1000,
      price_bdt: '৳68,000',
      price_usd: '$570',
      depth_of_discharge: 90,
      lifespan_years: '10-15 Years',
      cycle_life: 6000,
      maintenance: 'Zero Maintenance',
      badge: 'High Reliability',
      tagline: '24V Essential Home Backup with Smart BMS Display',
      description: 'Ideal 24V energy storage solution capable of running all residential essentials including TV, computer, and refrigerator.',
      description_bn: '২৪V বাসা-বাড়ির জন্য আদর্শ ব্যাটারি ব্যাকআপ যা টিভি, কম্পিউটার ও ফ্রিজকে মসৃণভাবে চালু রাখে।',
      features: [
        '25.6V 100Ah Continuous High Discharge',
        'Integrated Smart LCD Screen & LED State',
        'Short-Circuit & Low-Temp Auto Cutoff',
        'Zero Maintenance & Non-Hazardous'
      ],
      order_index: 2
    },
    {
      inverter_index: 2,
      name: 'Solvex PowerWall 5.12kWh LiFePO4 Server Rack Battery',
      name_bn: 'সলভেক্স পাওয়ারওয়াল ৫.১২kWh সার্ভার র‍্যাক লিথিয়াম ব্যাটারি',
      battery_code: 'lithium_5_12kwh',
      model: '51.2V 100Ah Smart Rack/Wall-Mount Battery Module',
      min_watt: 1001,
      max_watt: 1600,
      price_bdt: '৳1,25,000',
      price_usd: '$1,050',
      depth_of_discharge: 95,
      lifespan_years: '15 Years',
      cycle_life: 6500,
      maintenance: 'Zero Maintenance',
      badge: 'Best Seller',
      tagline: 'High-Density 48V Telecom & Residential Storage',
      description: 'Industry standard 51.2V 100Ah battery module with full CAN/RS485 communication protocol for hybrid inverters.',
      description_bn: 'স্ট্যান্ডার্ড ৫১.২V ১০০Ah ব্যাটারি যা হাইব্রিড ইনভার্টারের সাথে সরাসরি CAN/RS485 কমিউনিকেশন করে।',
      features: [
        '51.2V High-Voltage Standard Architecture',
        'CAN / RS485 Dual Protocol Inverter Sync',
        'Up to 16 Units Parallel Scalability',
        '10-Year Manufacturer Replacement Warranty'
      ],
      order_index: 3
    },
    {
      inverter_index: 3,
      name: 'Solvex VillaPro 7.68kWh Hybrid Power Storage',
      name_bn: 'সলভেক্স ভিলাপ্রো ৭.৬৮kWh হাইব্রিড লিথিয়াম স্টোরেজ',
      battery_code: 'lithium_7_68kwh',
      model: '51.2V 150Ah High-Density LiFePO4 Battery',
      min_watt: 1601,
      max_watt: 2500,
      price_bdt: '৳1,80,000',
      price_usd: '$1,500',
      depth_of_discharge: 95,
      lifespan_years: '15 Years',
      cycle_life: 6500,
      maintenance: 'Zero Maintenance',
      badge: 'Premium Grade',
      tagline: 'Heavy Overnight AC Backup with Fast C-Rate Charging',
      description: 'Supports continuous running of 1.0 Ton inverter air conditioners during night-time power cuts with high C-rate discharge.',
      description_bn: 'রাতের বেলা ১.০ টন ইনভার্টার এসি একটানা ৬-৮ ঘণ্টা চালানোর মতো সক্ষমতা সম্পন্ন।',
      features: [
        'Powers 1.0 Ton AC Overnight (6-8 Hours)',
        'Fast 1C Charging & Discharging Capability',
        'Active BMS Thermal Equalization',
        'Heavy Aluminum Enclosure'
      ],
      order_index: 4
    },
    {
      inverter_index: 4,
      name: 'Solvex UltraBank 10.24kWh Modular Lithium System',
      name_bn: 'সলভেক্স আল্ট্রাব্যাংক ১০.২৪kWh মডুলার লিথিয়াম সিস্টেম',
      battery_code: 'lithium_10_24kwh',
      model: '51.2V 200Ah (2x 100Ah Dual Server-Rack Pack)',
      min_watt: 2501,
      max_watt: 3800,
      price_bdt: '৳2,45,000',
      price_usd: '$2,050',
      depth_of_discharge: 95,
      lifespan_years: '15+ Years',
      cycle_life: 7000,
      maintenance: 'Zero Maintenance',
      badge: 'Heavy Residential',
      tagline: 'Dual Rack Energy Reservoir for Luxury Duplex Homes',
      description: '10.24kWh power bank effortlessly powering 1.5 Ton AC, refrigerator, and full duplex lighting with zero flickering.',
      description_bn: '১০.২৪kWh স্টোরেজ যা ১.৫ টন এসি, ফ্রিজ ও পুরো ডুপ্লেক্সের লোড স্বাচ্ছন্দ্যে হ্যান্ডেল করে।',
      features: [
        'Dual 5.12kWh Rack-Mounted Configuration',
        'Powers 1.5 Ton AC, Fridge & Home Load Seamlessly',
        'Cloud IoT Battery Monitoring App',
        'Zero Fire Risk Chemically Stable LiFePO4'
      ],
      order_index: 5
    },
    {
      inverter_index: 5,
      name: 'Solvex EstateMax 14.3kWh High-Energy Storage System',
      name_bn: 'সলভেক্স এস্টেটম্যাক্স ১৪.৩kWh হাই-এনার্জি ব্যাটারি সিস্টেম',
      battery_code: 'lithium_14_3kwh',
      model: '51.2V 280Ah CATL Cell Heavy Power Unit',
      min_watt: 3801,
      max_watt: 5200,
      price_bdt: '৳3,30,000',
      price_usd: '$2,750',
      depth_of_discharge: 95,
      lifespan_years: '15+ Years',
      cycle_life: 7000,
      maintenance: 'Zero Maintenance',
      badge: 'CATL Cells Inside',
      tagline: 'Automotive-Grade 280Ah Cell High Capacity Bank',
      description: 'Manufactured with tier-1 CATL 280Ah cells providing unprecedented thermal resilience and deep cycling capacity.',
      description_bn: 'টিয়ার-১ ক্যাটল ২৮০Ah অটোমোটিভ সেল নির্মিত যা উচ্চ তাপমাত্রা ও দীর্ঘ চক্রের জন্য বিখ্যাত।',
      features: [
        'Automotive Grade CATL 280Ah LiFePO4 Cells',
        'Supports Multiple Air Conditioners & Heavy Pumps',
        'CAN Bus Zero-Lag Closed-Loop Inverter Communication',
        'Built-in Automatic Fire Aerosol Extinguisher'
      ],
      order_index: 6
    },
    {
      inverter_index: 6,
      name: 'Solvex CommercialVault 20.48kWh Energy Storage',
      name_bn: 'সলভেক্স কমার্শিয়ালভল্ট ২০.৪৮kWh বাণিজ্যিক ব্যাটারি সিস্টেম',
      battery_code: 'commercial_20_48kwh',
      model: '4x 5.12kWh 51.2V 400Ah Industrial Battery Cabinet',
      min_watt: 5201,
      max_watt: 7000,
      price_bdt: '৳4,75,000',
      price_usd: '$3,980',
      depth_of_discharge: 95,
      lifespan_years: '15+ Years',
      cycle_life: 7500,
      maintenance: 'Zero Maintenance',
      badge: 'Commercial Enterprise',
      tagline: 'Industrial 4-Tier Battery Cabinet for Supermarkets & Clinics',
      description: 'High-power commercial backup ensuring zero medical equipment, server, or supermarket chiller downtime.',
      description_bn: 'সুপারমার্কেট, ক্লিনিক ও ডায়াগনস্টিক সেন্টারের জন্য অবিচ্ছিন্ন ও নির্ভরযোগ্য পাওয়ার ব্যাকআপ।',
      features: [
        'Industrial 4-Tier Server Rack with Rolling Casters',
        '20.48kWh Usable Clean Power Reservoir',
        'Redundant Circuit Breakers on Each Battery Bank',
        'Ideal for Clinics, Offices & Mini Supermarkets'
      ],
      order_index: 7
    },
    {
      inverter_index: 7,
      name: 'Solvex TriPhase 30.72kWh High-Voltage Battery Bank',
      name_bn: 'সলভেক্স ৩-ফেজ ৩০.৭২kWh হাই-ভোল্টেজ ব্যাটারি ব্যাংক',
      battery_code: 'triphase_30_72kwh',
      model: '300V-400V HV LiFePO4 Stack with Central Master BMS',
      min_watt: 7001,
      max_watt: 9500,
      price_bdt: '৳7,10,000',
      price_usd: '$5,950',
      depth_of_discharge: 95,
      lifespan_years: '15+ Years',
      cycle_life: 8000,
      maintenance: 'Zero Maintenance',
      badge: 'High Voltage Stack',
      tagline: 'High Voltage DC Architecture for 3-Phase Commercial Plants',
      description: '300V-400V HV battery stack directly synchronizing with 3-phase hybrid inverters for maximum efficiency and motor starting current.',
      description_bn: '৩-ফেজ হাইব্রিড ইনভার্টারের সাথে সরাসরি হাই-ভোল্টেজ সংযোগ যা মোটরের স্টার্টিং কারেন্ট বহন করে।',
      features: [
        'High-Voltage DC Stack for 98.2% Inverter Round-Trip Efficiency',
        'Powers 3-Phase Machinery & Heavy Motors during Blackouts',
        'Master High-Voltage Control Box with Emergency Stop',
        'Dynamic Peak-Shaving Program for Maximum Tariff Savings'
      ],
      order_index: 8
    },
    {
      inverter_index: 8,
      name: 'Solvex Industrial Titan 46kWh High-Capacity Storage',
      name_bn: 'সলভেক্স ইন্ডাস্ট্রিয়াল টাইটান ৪৬kWh হেভি ব্যাটারি স্টোরেজ',
      battery_code: 'industrial_46kwh',
      model: 'HV LiFePO4 Dual-Cabinet 46.08kWh Industrial System',
      min_watt: 9501,
      max_watt: 14000,
      price_bdt: '৳10,50,000',
      price_usd: '$8,800',
      depth_of_discharge: 95,
      lifespan_years: '15+ Years',
      cycle_life: 8000,
      maintenance: 'Zero Maintenance',
      badge: 'Industrial Mega',
      tagline: 'Millisecond UPS Backup for Automated Production Lines',
      description: '46.08kWh heavy industrial battery system keeping factory assembly robots and packaging machines operating uninterrupted.',
      description_bn: 'কল-কারখানার অটোমেটেড প্রোডাকশন লাইন ও প্যাকেজিং সচল রাখতে ৪৬kWh ব্যাকআপ সিস্টেম।',
      features: [
        'Heavy Industrial 46kWh Clean Battery Bank',
        'Seamless 10ms Millisecond UPS Factory Backup',
        'Integrated Industrial HVAC Temperature Control',
        'Ethernet / Modbus TCP Industrial SCADA Telemetry'
      ],
      order_index: 9
    },
    {
      inverter_index: 9,
      name: 'Solvex MegaStorage 61.4kWh Factory Utility Battery ESS',
      name_bn: 'সলভেক্স মেগাস্টোরেজ ৬১.৪kWh মেগা ফ্যাক্টরি ব্যাটারি ইএসএস',
      battery_code: 'megastorage_61_4kwh',
      model: '61.44kWh Utility ESS Outdoor IP65 Weatherproof Container',
      min_watt: 14001,
      max_watt: 25000,
      price_bdt: '৳13,80,000',
      price_usd: '$11,550',
      depth_of_discharge: 95,
      lifespan_years: '15+ Years',
      cycle_life: 8000,
      maintenance: 'Zero Maintenance',
      badge: 'Utility Scale ESS',
      tagline: 'Containerized Outdoor Energy Storage for Heavy Factory Night Shifts',
      description: 'Complete containerized outdoor utility ESS battery system for multi-megawatt factory complexes with automatic peak-shaving.',
      description_bn: 'কনটেইনারাইজড আউটডোর মেগা ব্যাটারি সিস্টেম যা কারখানার নাইট শিফট ও পিক-শেভিং নিয়ন্ত্রণ করে।',
      features: [
        'Utility Grade 61.44kWh Energy Storage System (ESS)',
        'Supports Full Factory Load & Continuous Night Shift Operations',
        'Automated Peak-Shaving & Demand-Charge Reduction',
        'Complete Turnkey Warranty with 24/7 Remote Diagnostics'
      ],
      order_index: 10
    }
  ];

  // Truncate and re-seed calculator_battery_types
  await conn.query('DELETE FROM calculator_battery_types');
  console.log('Cleaned old battery types');

  for (const b of batteryData) {
    const matchedInv = inverters[b.inverter_index] || null;
    const invId = matchedInv ? matchedInv.id : null;
    const minW = matchedInv ? matchedInv.min_watt : b.min_watt;
    const maxW = matchedInv ? matchedInv.max_watt : b.max_watt;

    await conn.query(
      `INSERT INTO calculator_battery_types
       (inverter_id, name, name_bn, battery_code, min_watt, max_watt, model, price_bdt, price_usd, features, tagline, description, description_bn, depth_of_discharge, lifespan_years, cycle_life, maintenance, badge, order_index, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invId,
        b.name,
        b.name_bn,
        b.battery_code,
        minW,
        maxW,
        b.model,
        b.price_bdt,
        b.price_usd,
        JSON.stringify(b.features),
        b.tagline,
        b.description,
        b.description_bn,
        b.depth_of_discharge,
        b.lifespan_years,
        b.cycle_life,
        b.maintenance,
        b.badge,
        b.order_index,
        1
      ]
    );
  }

  console.log('Seeded 10 Battery Types linked to Inverters successfully!');
  await conn.end();
}

run().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
