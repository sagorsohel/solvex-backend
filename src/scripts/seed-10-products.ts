import { pool } from "../db/index.js";
import { ensureProductsColumns } from "../controllers/product.controller.js";

async function seed() {
  try {
    console.log("Ensuring database columns are updated...");
    await ensureProductsColumns();

    // Check existing sister concerns, categories, brands, models
    const [concerns]: any = await pool.query("SELECT id, name FROM sister_concerns LIMIT 10");
    const [categories]: any = await pool.query("SELECT id, name, sister_concern_id FROM product_categories LIMIT 10");
    const [subCategories]: any = await pool.query("SELECT id, name, product_category_id FROM product_sub_categories LIMIT 10");
    const [treeCategories]: any = await pool.query("SELECT id, name, product_sub_category_id FROM product_tree_categories LIMIT 10");
    const [brands]: any = await pool.query("SELECT id, name FROM product_brands LIMIT 10");
    const [models]: any = await pool.query("SELECT id, name, brand_id FROM product_models LIMIT 10");

    const scId = concerns[0]?.id || 1;
    const catId = categories[0]?.id || 1;
    const subCatId = subCategories[0]?.id || 1;
    const treeCatId = treeCategories[0]?.id || null;
    const brandId = brands[0]?.id || 1;
    const modelId = models[0]?.id || 1;

    // Highest 13-digit SKU query to track and increment
    const [skuRows]: any = await pool.query(`
      SELECT sku FROM products 
      WHERE sku IS NOT NULL AND CHAR_LENGTH(sku) = 13 AND sku REGEXP '^[0-9]+$'
      ORDER BY sku DESC LIMIT 1
    `);

    let currentSkuBase = 2026000000001n;
    if (skuRows && skuRows.length > 0 && skuRows[0].sku) {
      try {
        currentSkuBase = BigInt(skuRows[0].sku) + 1n;
      } catch (_) {}
    }

    const xaFeatures = [
      "IP66 protection level",
      "User-friendly HMI LCD design and easy configuration",
      "Built-in 2 MPPT trackers Maximum PV input current increases to 21A/27A",
      "Dual output for smart load control",
      "Two independent AC power sources connected and switched automatically",
      "Programmable supply priority for PV, Battery or Grid",
      "Built-in communication port for BMS (RS485)",
      "User-adjustable charging current and voltage",
      "Parallel operation up to 9 units",
      "Support storing energy from diesel generator",
    ];

    const xaDatasheetSpecs = [
      { id: "s1", key: "PHASE", hasValues: true, values: ["1-phase in / 1-phase out", "1-phase in / 1-phase out", "1-phase in / 1-phase out"] },
      { id: "s2", key: "MAXIMUM PV INPUT POWER", hasValues: true, values: ["12000W", "16000W", "18000W"] },
      { id: "s3", key: "RATED OUTPUT POWER", hasValues: true, values: ["6600VA / 6600W", "8600VA / 8600W", "10600VA / 10600W"] },
      { id: "s4", key: "MAXIMUM CHARGING POWER", hasValues: true, values: ["6600W", "8600W", "10600W"] },
      { id: "s5", key: "GRID OUTPUT (AC)", hasValues: false, values: ["", "", ""] },
      { id: "s6", key: "Nominal Output Voltage", hasValues: true, values: ["220/230/240 VAC", "220/230/240 VAC", "220/230/240 VAC"] },
      { id: "s7", key: "Output Voltage Range", hasValues: true, values: ["184–264.5 VAC", "195.5–253 VAC", "182–260 VAC"] },
      { id: "s8", key: "Nominal Output Current", hasValues: true, values: ["28.7A", "37.4A", "46.1A"] },
      { id: "s9", key: "Power Factor", hasValues: true, values: [">0.99", ">0.99", ">0.99"] },
      { id: "s10", key: "Maximum Conversion Efficiency (DC/AC)", hasValues: true, values: [">97%", ">97%", ">97%"] },
      { id: "s11", key: "AC INPUT", hasValues: false, values: ["", "", ""] },
      { id: "s12", key: "AC Start-up Voltage / Auto Restart Voltage", hasValues: true, values: ["60–80VAC / 180VAC", "60–80VAC / 180VAC", "60–80VAC / 180VAC"] },
      { id: "s13", key: "Acceptable Input Voltage Range", hasValues: true, values: ["90–280VAC or 170–280VAC", "90–280VAC or 170–280VAC", "90–280VAC or 170–280VAC"] },
      { id: "s14", key: "Frequency Range", hasValues: true, values: ["50Hz/60Hz (Auto sensing)", "50Hz/60Hz (Auto sensing)", "50Hz/60Hz (Auto sensing)"] },
      { id: "s15", key: "Maximum AC Input Current", hasValues: true, values: ["40A", "60A", "60A"] },
      { id: "s16", key: "PV INPUT (DC)", hasValues: false, values: ["", "", ""] },
      { id: "s17", key: "Maximum DC Voltage", hasValues: true, values: ["500VDC", "500VDC", "500VDC"] },
      { id: "s18", key: "MPPT Voltage Range", hasValues: true, values: ["120VDC–450VDC", "120VDC–450VDC", "120VDC–450VDC"] },
      { id: "s19", key: "Number of MPPT Trackers / Maximum Input Current", hasValues: true, values: ["2 / 21A", "2 / 27A", "2 / 27A"] },
      { id: "s20", key: "BATTERY MODE OUTPUT (AC)", hasValues: false, values: ["", "", ""] },
      { id: "s21", key: "Nominal Output Voltage", hasValues: true, values: ["220/230/240 VAC", "220/230/240 VAC", "220/230/240 VAC"] },
      { id: "s22", key: "Output Waveform", hasValues: true, values: ["Pure sine wave", "Pure sine wave", "Pure sine wave"] },
      { id: "s23", key: "Efficiency (DC to AC)", hasValues: true, values: ["93%", "93%", "93%"] },
      { id: "s24", key: "BATTERY & CHARGER", hasValues: false, values: ["", "", ""] },
      { id: "s25", key: "Battery Type", hasValues: true, values: ["Lead-acid or Lithium-ion", "Lead-acid or Lithium-ion", "Lead-acid or Lithium-ion"] },
      { id: "s26", key: "Battery Voltage Range (V)", hasValues: true, values: ["40–60VDC", "40–60VDC", "40–60VDC"] },
      { id: "s27", key: "Nominal DC Voltage", hasValues: true, values: ["48 VDC", "48 VDC", "48 VDC"] },
      { id: "s28", key: "Maximum Solar Charging Current", hasValues: true, values: ["135A", "190A", "210A"] },
      { id: "s29", key: "Maximum AC Charging Current", hasValues: true, values: ["135A", "190A", "210A"] },
      { id: "s30", key: "Maximum Charging Current", hasValues: true, values: ["155A", "190A", "210A"] },
      { id: "s31", key: "PHYSICAL SPECIFICATIONS", hasValues: false, values: ["", "", ""] },
      { id: "s32", key: "Dimension, D*W*H (mm)", hasValues: true, values: ["192*418*633", "192*418*633", "192*418*633"] },
      { id: "s33", key: "Net Weight (kgs)", hasValues: true, values: ["23.5", "28", "29"] },
      { id: "s34", key: "INTERFACE & COMMUNICATION", hasValues: false, values: ["", "", ""] },
      { id: "s35", key: "Parallel Function", hasValues: true, values: ["Yes, 9 units", "Yes, 9 units", "Yes, 9 units"] },
      { id: "s36", key: "Communication Port", hasValues: true, values: ["RS-232 / RS485, WIFI", "RS-232 / RS485, WIFI", "RS-232 / RS485, WIFI"] },
      { id: "s37", key: "ENVIRONMENT", hasValues: false, values: ["", "", ""] },
      { id: "s38", key: "Humidity", hasValues: true, values: ["0–100% RH (No condensing)", "0–100% RH (No condensing)", "0–100% RH (No condensing)"] },
      { id: "s39", key: "Operating Temperature", hasValues: true, values: ["-10°C to 50°C", "-10°C to 50°C", "-10°C to 50°C"] },
      { id: "s40", key: "PROTECTION & CERTIFICATE", hasValues: false, values: ["", "", ""] },
      { id: "s41", key: "Safety / EMC Standard", hasValues: true, values: ["IEC/EN 62109-1", "IEC/EN 62109-2", "IEC/EN 61000-6-2/4"] },
    ];

    const xaDescription = `
      <h3>On/Off-Grid Operation with Battery Power Export</h3>
      <p>Dual on/off-grid modes support battery-free operation. Enables energy storage and grid feed-in under SUE/PEC modes, with dual AC inputs and automatic switching.</p>
      <p>CT-based reverse current detection intelligently controls power flow, prioritizes self-use, prevents grid backfeed, and complies with energy regulations.</p>
      
      <p style="text-align: center;"><img src="https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800" style="width: 75%; max-width: 100%; border-radius: 8px; margin: 12px auto;" /></p>
      
      <h3>LCD Capacitive Touch Screen Display</h3>
      <p>Clear and intuitive interface with real-time display of current, voltage, power, energy data, and fault alarms for easy operation.</p>
      
      <h3>IP66 Protection for Harsh Outdoor Environments</h3>
      <p>Dustproof and waterproof design protects against rain, wind, salt spray, humidity, and industrial cleaning, ensuring long-term stable operation.</p>
      
      <h3>Parallel Expansion up to 9 Units</h3>
      <p>Supports single-phase and three-phase parallel operation. Up to 9 units in single phase and up to 4 units per phase in three-phase systems.</p>
      
      <h3>Wide Application Compatibility</h3>
      <p>Compatible with up to 99% of conventional electrical equipment. Flexible and practical for residential, commercial, and backup power applications.</p>
    `;

    const sampleProducts = [
      {
        title: "Solvex XA10648 10.6kW Hybrid Solar Inverter with Dual MPPT",
        price: "2450.00",
        stock: 35,
        is_featured: true,
        image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600",
        gallery_images: [
          "https://images.unsplash.com/photo-1508873696983-2df57046475a?w=600",
          "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=600",
          "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600",
        ],
        features: xaFeatures,
        datasheet_specs: xaDatasheetSpecs,
        description: xaDescription,
        brochures: [
          {
            id: "b1",
            title: "Solvex XA-Series Hybrid Inverter Technical Brochure 2026",
            pdfUrl: "http://localhost:5000/uploads/solvex-xa-series-brochure.pdf",
            fileSize: "4.2 MB PDF",
          },
        ],
      },
      {
        title: "Solvex XA8648 8.6kW Multi-Mode Residential & C&I Inverter",
        price: "2150.00",
        stock: 40,
        is_featured: true,
        image: "https://images.unsplash.com/photo-1508873696983-2df57046475a?w=600",
        gallery_images: [
          "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600",
          "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=600",
        ],
        features: xaFeatures,
        datasheet_specs: xaDatasheetSpecs,
        description: xaDescription,
        brochures: [
          {
            id: "b2",
            title: "Solvex XA8648 Installation & User Manual",
            pdfUrl: "http://localhost:5000/uploads/solvex-xa8648-manual.pdf",
            fileSize: "5.1 MB PDF",
          },
        ],
      },
      {
        title: "Solvex XA6648 6.6kW Pure Sine Wave Hybrid Solar Inverter",
        price: "1850.00",
        stock: 50,
        is_featured: false,
        image: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=600",
        gallery_images: [
          "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600",
        ],
        features: xaFeatures,
        datasheet_specs: xaDatasheetSpecs,
        description: xaDescription,
        brochures: [
          {
            id: "b3",
            title: "XA6648 Clean Energy System Specsheet",
            pdfUrl: "http://localhost:5000/uploads/xa6648-specs.pdf",
            fileSize: "3.8 MB PDF",
          },
        ],
      },
      {
        title: "Huawei FusionSolar SUN2000-100KTL-M1 Utility Three-Phase Inverter",
        price: "5600.00",
        stock: 18,
        is_featured: true,
        image: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600",
        gallery_images: [
          "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600",
          "https://images.unsplash.com/photo-1508873696983-2df57046475a?w=600",
        ],
        features: [
          "10 independent MPPTs for maximum energy harvest",
          "98.8% European weighted efficiency",
          "AI-powered AFCI arc fault protection",
          "IP66 rated waterproof and salt spray resistant housing",
          "Smart string monitoring and I-V curve diagnosis",
        ],
        datasheet_specs: xaDatasheetSpecs,
        description: `<h3>Huawei Utility Scale String Inverter</h3><p>Engineered for high-yield utility scale and commercial rooftops with state of the art telemetry and cloud monitoring.</p>`,
        brochures: [
          {
            id: "b4",
            title: "Huawei SUN2000-100KTL Datasheet",
            pdfUrl: "http://localhost:5000/uploads/huawei-sun2000-100ktl.pdf",
            fileSize: "6.2 MB PDF",
          },
        ],
      },
      {
        title: "Solvex PowerPro Bi-Facial Monocrystalline Solar Panel 600W",
        price: "165.00",
        stock: 500,
        is_featured: true,
        image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600",
        gallery_images: [
          "https://images.unsplash.com/photo-1508873696983-2df57046475a?w=600",
        ],
        features: [
          "22.8% Ultra-high module conversion efficiency",
          "Bi-facial power gain up to 25% from rear reflection",
          "Anti-PID and anti-snail trail degradation technology",
          "Heavy snow load (5400 Pa) and wind load (2400 Pa) certified",
          "30-year linear performance warranty",
        ],
        datasheet_specs: xaDatasheetSpecs,
        description: `<h3>High Efficiency Tier 1 Bi-Facial Solar PV</h3><p>Engineered with N-Type TOPCon solar cells to maximize dual-sided yield under all weather conditions.</p>`,
        brochures: [
          {
            id: "b5",
            title: "Solvex PowerPro 600W Module Datasheet",
            pdfUrl: "http://localhost:5000/uploads/solvex-powerpro-600w.pdf",
            fileSize: "2.4 MB PDF",
          },
        ],
      },
      {
        title: "Solvex WallVault LiFePO4 5.12kWh 48V 100Ah Smart Battery",
        price: "1450.00",
        stock: 65,
        is_featured: false,
        image: "https://images.unsplash.com/photo-1508873696983-2df57046475a?w=600",
        gallery_images: [
          "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=600",
        ],
        features: [
          "Grade A prismatic LiFePO4 cell chemistry with 6000+ cycles",
          "Built-in smart BMS with RS485/CAN communication",
          "Wall-mounted sleek compact aesthetic for home and office",
          "Supports up to 16 units parallel expansion (81.9kWh)",
          "10-year comprehensive manufacturer warranty",
        ],
        datasheet_specs: xaDatasheetSpecs,
        description: `<h3>Home & Commercial Energy Storage Solution</h3><p>Safe, thermal-stable lithium iron phosphate battery pack compatible with hybrid inverters.</p>`,
        brochures: [
          {
            id: "b6",
            title: "Solvex WallVault 5.12kWh Battery Manual",
            pdfUrl: "http://localhost:5000/uploads/wallvault-5kwh.pdf",
            fileSize: "3.1 MB PDF",
          },
        ],
      },
      {
        title: "Solvex MegaRack 100kWh Industrial Containerized Battery Storage",
        price: "24500.00",
        stock: 8,
        is_featured: true,
        image: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600",
        gallery_images: [
          "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600",
        ],
        features: [
          "100kWh C&I scalable rack energy storage system",
          "Liquid cooled thermal management for extended battery life",
          "Integrated aerosol fire suppression system",
          "Peak shaving, load leveling, and microgrid black start",
          "Cloud-based EMS with remote IoT monitoring",
        ],
        datasheet_specs: xaDatasheetSpecs,
        description: `<h3>Commercial & Industrial MegaRack BESS</h3><p>Turnkey containerized battery system designed for factories, hospitals, and clean grid infrastructure.</p>`,
        brochures: [
          {
            id: "b7",
            title: "Solvex MegaRack 100kWh System Brochure",
            pdfUrl: "http://localhost:5000/uploads/megarack-100kwh.pdf",
            fileSize: "7.8 MB PDF",
          },
        ],
      },
      {
        title: "Solvex AeroWind 10kW Vertical Axis Micro Wind Turbine",
        price: "4200.00",
        stock: 12,
        is_featured: false,
        image: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=600",
        gallery_images: [
          "https://images.unsplash.com/photo-1508873696983-2df57046475a?w=600",
        ],
        features: [
          "Ultra-quiet omnidirectional vertical axis airfoil blades",
          "Low start-up wind speed of 1.5 m/s",
          "Magnetic levitation coreless permanent magnet generator",
          "Typhoon resistant design rated up to 60 m/s gusts",
          "Seamless integration with solar hybrid battery systems",
        ],
        datasheet_specs: xaDatasheetSpecs,
        description: `<h3>Urban & Rural Clean Wind Generation</h3><p>Compact and silent wind generation technology for hybrid off-grid systems.</p>`,
        brochures: [
          {
            id: "b8",
            title: "AeroWind 10kW Turbine Datasheet",
            pdfUrl: "http://localhost:5000/uploads/aerowind-10kw.pdf",
            fileSize: "3.5 MB PDF",
          },
        ],
      },
      {
        title: "Solvex MediClean 20kVA Isolated Hospital Grade Clean UPS",
        price: "7800.00",
        stock: 15,
        is_featured: false,
        image: "https://images.unsplash.com/photo-1508873696983-2df57046475a?w=600",
        gallery_images: [
          "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600",
        ],
        features: [
          "Galvanic isolation transformer for zero leakage current",
          "Zero transfer time (True Online Double Conversion)",
          "Compliant with medical electrical safety standard IEC 60601-1",
          "Harmonic distortion THDi < 3% for sensitive MRI & ICU equipment",
          "Emergency power off (EPO) and redundant bypass",
        ],
        datasheet_specs: xaDatasheetSpecs,
        description: `<h3>Hospital Grade Mission-Critical UPS</h3><p>Guaranteed clean, uninterrupted sine wave power for operating theatres, ICUs, and medical imaging laboratories.</p>`,
        brochures: [
          {
            id: "b9",
            title: "Solvex MediClean 20kVA Hospital UPS Manual",
            pdfUrl: "http://localhost:5000/uploads/mediclean-20kva.pdf",
            fileSize: "4.7 MB PDF",
          },
        ],
      },
      {
        title: "Solvex HyperCharge 120kW Dual-Gun DC Fast EV Charger",
        price: "8900.00",
        stock: 10,
        is_featured: true,
        image: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600",
        gallery_images: [
          "https://images.unsplash.com/photo-1508873696983-2df57046475a?w=600",
        ],
        features: [
          "Dual CCS2 / CHAdeMO liquid cooled charging cables",
          "Dynamic power distribution 60kW+60kW or 120kW single gun",
          "OCPP 1.6J / 2.0.1 smart network protocol support",
          "7-inch sunlight readable touchscreen with RFID card reader",
          "Integrated overcurrent, surge, ground-fault, and overtemperature protection",
        ],
        datasheet_specs: xaDatasheetSpecs,
        description: `<h3>Commercial High-Speed EV Charging Hub</h3><p>Fast DC EV charging station built for fleets, highway plazas, and commercial business districts.</p>`,
        brochures: [
          {
            id: "b10",
            title: "Solvex HyperCharge 120kW EV Station Specification",
            pdfUrl: "http://localhost:5000/uploads/hypercharge-120kw.pdf",
            fileSize: "5.4 MB PDF",
          },
        ],
      },
    ];

    console.log(`Starting insertion of 10 seed products with tracked 13-digit SKUs...`);

    for (let i = 0; i < sampleProducts.length; i++) {
      const prod = sampleProducts[i];
      const sku = (currentSkuBase + BigInt(i)).toString();
      const slug = prod.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const [result]: any = await pool.query(
        `
        INSERT INTO products (
          title, slug, category, sister_concern_id, product_category_id,
          product_sub_category_id, product_tree_category_id, product_brand_id,
          product_model_id, sku, price, stock, status, features,
          description, image, gallery_images, datasheet_pdf, datasheet_specs, brochures, is_featured
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          prod.title,
          slug,
          "Solar Solutions",
          scId,
          catId,
          subCatId,
          treeCatId,
          brandId,
          modelId,
          sku,
          prod.price,
          prod.stock,
          "published",
          JSON.stringify(prod.features),
          prod.description,
          prod.image,
          JSON.stringify(prod.gallery_images),
          "http://localhost:5000/uploads/solvex-technical-datasheet.pdf",
          JSON.stringify(prod.datasheet_specs),
          JSON.stringify(prod.brochures),
          prod.is_featured ? 1 : 0,
        ]
      );

      console.log(`[Inserted Product #${i + 1}] ID: ${result.insertId} | SKU: ${sku} | Title: ${prod.title.slice(0, 45)}...`);
    }

    console.log("✅ Successfully seeded 10 products with tracked 13-digit SKUs, full features, 3-value datasheets, and brochures!");
  } catch (err) {
    console.error("Seeding failed:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seed();
