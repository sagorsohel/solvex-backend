import { pool, testDbConnection } from "../db/index.js";
import { ensureServicesTables } from "../controllers/service.controller.js";
import { ensureProjectsTables } from "../controllers/project.controller.js";

async function seedServicesAndProjects() {
  console.log("🌱 Seeding 10 Solar Services and 10 Solar Projects...");
  const connected = await testDbConnection();
  if (!connected) {
    console.error("❌ Database connection failed.");
    process.exit(1);
  }

  await ensureServicesTables();
  await ensureProjectsTables();

  // Clear existing services & projects tables for a clean 10/10 seed
  await pool.query("DELETE FROM services");
  await pool.query("DELETE FROM projects");

  // -------------------------------------------------------------
  // 1. 10 REAL-WORLD SOLAR SERVICES
  // -------------------------------------------------------------
  const servicesData = [
    {
      slug: "ci-turnkey-solar-pv-systems",
      title: "C&I Turnkey Solar PV Systems",
      short_description: "Comprehensive EPC solutions designed for factories, textile mills, warehouses, and commercial establishments. Engineered for high yield, structural integrity, and maximum net-metering benefits.",
      tags: ["COMMERCIAL & INDUSTRIAL SOLAR", "TURNKEY EPC"],
      hero_image: "https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=1200&auto=format&fit=crop&q=80",
      cards: [
        {
          id: "card-1",
          phase_tag: "PHASE 01 SYSTEM ARCHITECTURE",
          title: "Structural Engineering & Aerodynamic Design",
          description: "Engineered for maximum resilience and high yield in heavy industrial environments.",
          bullet_points: [
            "Custom ballast and non-penetrating aluminum mounting for tin, RCC, and standing-seam roofs designed to withstand 180 km/h wind speeds.",
            "Full 3D shadow analysis and thermal modeling to ensure peak kilowatt-hour generation year-round."
          ],
          image: "https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
        {
          id: "card-2",
          phase_tag: "PHASE 02 SYSTEM ARCHITECTURE",
          title: "Tier-1 High-Efficiency Bifacial Modules",
          description: "State-of-the-art TOPCon and heterojunction cell technology delivering ultra-low degradation.",
          bullet_points: [
            "Deployment of N-Type TOPCon and heterojunction bifacial panels with up to 23.5% module efficiency and 30-year linear performance warranty.",
            "Integrated with smart multi-MPPT string inverters providing up to 99.0% Euro efficiency and AFCI arc-fault protection."
          ],
          image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
          image_left: true,
        },
      ],
      hardware_card: {
        title: "Industrial Solar PV Package",
        description: "Tier-1 TOPCon Bifacial Panels, High-Efficiency Multi-MPPT String Inverters, and Weather-Proof SCADA Combiner Boxes.",
        button_text: "VIEW TECHNICAL SPECIFICATIONS",
        button_color: "#10B981",
        card_color: "#0F172A",
      },
      consultation_card: {
        title: "Request Rooftop Feasibility Study",
        description: "Our certified design engineers provide complimentary structural shadow analysis and electrical load auditing free of charge.",
        button_text: "BOOK FREE SITE AUDIT",
        button_color: "#F59E0B",
        card_color: "#047857",
      },
      faqs: [
        {
          question: "How much factory roof space is required per megawatt (1 MWp)?",
          answer: "With modern 580W-700W N-Type TOPCon modules, approximately 60,000 to 75,000 square feet of unobstructed roof space is required per 1 MWp installation.",
        },
        {
          question: "What is the typical payback period for a commercial solar project?",
          answer: "In most industrial manufacturing facilities, net-metered rooftop solar achieves full capital payback within 3.5 to 5 years against volatile national grid tariffs.",
        },
      ],
      status: "published",
      order_index: 1,
    },
    {
      slug: "commercial-industrial-bess-storage",
      title: "Battery Energy Storage Systems (BESS)",
      short_description: "Utility-scale and commercial containerized Lithium-Iron-Phosphate (LFP) battery energy storage designed for peak shaving, diesel fuel displacement, and zero-interruption UPS power backup.",
      tags: ["ENERGY STORAGE", "MICROGRID & BESS"],
      hero_image: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1200&auto=format&fit=crop&q=80",
      cards: [
        {
          id: "card-1",
          phase_tag: "PHASE 01 STORAGE INTEGRATION",
          title: "Containerized Tier-1 LFP Battery Architecture",
          description: "Modular, liquid-cooled lithium iron phosphate battery racks with automated aerosol fire suppression.",
          bullet_points: [
            "Over 6,000 deep discharge cycles at 90% Depth of Discharge with a 10-to-15 year operating design lifespan.",
            "Integrated Liquid Cooling thermal management guaranteeing cell-to-cell delta temperature under 2.5°C."
          ],
          image: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
        {
          id: "card-2",
          phase_tag: "PHASE 02 ENERGY MANAGEMENT",
          title: "Intelligent Hybrid PCS & Microgrid Controller",
          description: "Sub-millisecond islanding transfer switch ensuring critical production loads never see a blackout.",
          bullet_points: [
            "Sub-20ms seamless grid-to-island transition displacing costly diesel generator spinning reserves.",
            "Smart AI time-of-use energy arbitrage charging during off-peak hours and discharging during peak tariff bands."
          ],
          image: "https://images.unsplash.com/photo-1548337138-e87d889cc369?w=800&auto=format&fit=crop&q=80",
          image_left: true,
        },
      ],
      hardware_card: {
        title: "Modular 1MWh - 10MWh BESS Container",
        description: "Liquid-cooled LFP battery packs, bi-directional PCS inverters, and IP55 outdoor enclosures.",
        button_text: "REQUEST BESS SPECSHEET",
        button_color: "#06B6D4",
        card_color: "#0F172A",
      },
      consultation_card: {
        title: "Simulate Peak-Shaving ROI",
        description: "Upload your utility interval load profile for an instant financial model on diesel replacement and peak tariff reductions.",
        button_text: "SCHEDULE BESS AUDIT",
        button_color: "#10B981",
        card_color: "#0E7490",
      },
      faqs: [
        {
          question: "Can BESS replace industrial diesel generators entirely?",
          answer: "Yes, when paired with solar PV and microgrid control, BESS provides immediate zero-emission backup and eliminates diesel fuel, oil maintenance, and generator startup delays.",
        },
        {
          question: "What safety protocols are engineered into your battery containers?",
          answer: "Our systems feature multi-tier BMS monitoring, NFPA 855 compliant deflagration venting, gas detection, and automated aerosol clean-agent fire suppression.",
        },
      ],
      status: "published",
      order_index: 2,
    },
    {
      slug: "hybrid-microgrid-generator-sync",
      title: "Solar-Diesel Microgrid Synchronization",
      short_description: "Intelligent fuel-saver controllers enabling solar arrays to synchronize directly with on-site diesel and gas generators with zero reverse-power risk.",
      tags: ["MICROGRID AUTOMATION", "HYBRID CONTROLLERS"],
      hero_image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200&auto=format&fit=crop&q=80",
      cards: [
        {
          id: "card-1",
          phase_tag: "PHASE 01 SYNCHRONIZATION",
          title: "Zero Reverse-Power & Dynamic Fuel Saver",
          description: "High-speed programmable microgrid controllers orchestrating solar and genset dispatch.",
          bullet_points: [
            "Maintains minimum 30% generator loading to prevent engine wet-stacking and thermal damage.",
            "Sub-second solar throttling prevents reverse power flow when heavy factory machinery turns off."
          ],
          image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      hardware_card: {
        title: "Hybrid Controller & Metering Panel",
        description: "Woodward/DEIF fuel-saver controller, Class 0.2s power transducers, and high-speed fiber-optic bus.",
        button_text: "EXPLORE FUEL SAVER TECH",
        button_color: "#10B981",
        card_color: "#0F172A",
      },
      consultation_card: {
        title: "Calculate Fuel Savings",
        description: "Find out how much diesel and natural gas your factory can save every month with integrated solar hybrid sync.",
        button_text: "CALCULATE GENSET SAVINGS",
        button_color: "#F59E0B",
        card_color: "#047857",
      },
      faqs: [
        {
          question: "Will solar back-feed power into our generators?",
          answer: "No. Our automated fuel-saver controller reacts within 100 milliseconds to curtail solar if load drops, ensuring zero reverse power into generator alternators.",
        },
      ],
      status: "published",
      order_index: 3,
    },
    {
      slug: "utility-scale-ground-mounted-solar",
      title: "Utility-Scale Ground-Mounted Solar Farms",
      short_description: "Gigawatt-scale ground-mounted solar power plants featuring single-axis AI astronomical trackers, high-voltage 33kV/132kV substations, and grid interconnection.",
      tags: ["UTILITY SOLAR", "GROUND MOUNTED"],
      hero_image: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1200&auto=format&fit=crop&q=80",
      cards: [
        {
          id: "card-1",
          phase_tag: "PHASE 01 FIELD ENGINEERING",
          title: "AI Single-Axis Astronomical Trackers",
          description: "High-yield tracking structures increasing annual energy generation by 18% to 25% over fixed-tilt systems.",
          bullet_points: [
            "Smart backtracking algorithms prevent inter-row shading on rolling terrain and uneven topography.",
            "Certified wind stow defensive mode triggering automatic 0° aerodynamic protection during severe cyclones."
          ],
          image: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      hardware_card: {
        title: "Utility Power Plant Balance of System",
        description: "Single-axis trackers, 3.125MW central inverter skid stations, and oil-immersed step-up transformers.",
        button_text: "UTILITY SPECIFICATIONS",
        button_color: "#10B981",
        card_color: "#0F172A",
      },
      consultation_card: {
        title: "Land Feasibility & PPA Advisory",
        description: "We provide comprehensive land geotechnical assessment, grid interconnection feasibility, and tariff structuring.",
        button_text: "CONSULT WITH UTILITY TEAM",
        button_color: "#F59E0B",
        card_color: "#047857",
      },
      faqs: [
        {
          question: "How much land is required for a 10 MWp solar farm?",
          answer: "With modern single-axis trackers and 700W+ bifacial modules, a 10 MWp project requires approximately 30 to 35 acres of land.",
        },
      ],
      status: "published",
      order_index: 4,
    },
    {
      slug: "net-metering-and-grid-synchronization",
      title: "Net Metering & Regulatory Liaison",
      short_description: "End-to-end regulatory approvals, utility substation compliance, bidirectional smart meter installation, and commercial tariff credit optimization.",
      tags: ["NET METERING", "UTILITY LIAISON"],
      hero_image: "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=1200&auto=format&fit=crop&q=80",
      cards: [
        {
          id: "card-1",
          phase_tag: "PHASE 01 REGULATORY APPROVALS",
          title: "Grid Interconnection & Smart Bidirectional Metering",
          description: "Complete utility liaison with power authorities ensuring frictionless net-metering synchronization.",
          bullet_points: [
            "Class 0.2s accuracy smart net meter deployment with optical telemetry for real-time power export verification.",
            "Full compliance with National Grid code harmonics, anti-islanding, and power factor regulations."
          ],
          image: "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      hardware_card: {
        title: "Utility-Approved Net Metering Skid",
        description: "Bidirectional 4-quadrant energy meters, CT/PT metering cabinets, and vacuum circuit breakers.",
        button_text: "VIEW COMPLIANCE HARDWARE",
        button_color: "#10B981",
        card_color: "#0F172A",
      },
      consultation_card: {
        title: "Net Metering Eligibility Check",
        description: "Our regulatory team evaluates your sanctioned load, substation capacity, and utility zone rules.",
        button_text: "CHECK ELIGIBILITY",
        button_color: "#F59E0B",
        card_color: "#047857",
      },
      faqs: [
        {
          question: "What percentage of electricity bill can be offset through net metering?",
          answer: "Depending on your sanctioned load and roof area, up to 100% of daytime energy consumption and export credits can be offset against your utility bill.",
        },
      ],
      status: "published",
      order_index: 5,
    },
    {
      slug: "scada-iot-remote-monitoring",
      title: "Smart SCADA & AI Remote Telemetry",
      short_description: "24/7 cloud SCADA analytics, string-level electrical monitoring, digital weather stations, and automated machine-learning performance ratio (PR) tracking.",
      tags: ["AI SCADA", "DIGITAL ASSET MANAGEMENT"],
      hero_image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80",
      cards: [
        {
          id: "card-1",
          phase_tag: "PHASE 01 TELEMETRY",
          title: "Real-Time Inverter & String Analytics",
          description: "Continuous telemetry monitoring capturing 1-second interval electrical and meteorological parameters.",
          bullet_points: [
            "Automated detection of soiling losses, cracked diodes, string shading, and inverter clipping.",
            "Integrated IEC 61724-1 Class-A weather stations measuring GHI, POA irradiance, ambient temp, and wind velocity."
          ],
          image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      hardware_card: {
        title: "Industrial IoT SCADA Gateways",
        description: "Cellular 4G/5G edge gateways, Modbus RTU/TCP data loggers, and pyranometers.",
        button_text: "EXPLORE SCADA DASHBOARD",
        button_color: "#10B981",
        card_color: "#0F172A",
      },
      consultation_card: {
        title: "Demo Live Solar Plant Telemetry",
        description: "Experience our live production monitoring dashboard and real-time fault alert dispatch system.",
        button_text: "BOOK A LIVE DEMO",
        button_color: "#F59E0B",
        card_color: "#047857",
      },
      faqs: [
        {
          question: "Does the monitoring system require a dedicated on-site server?",
          answer: "No, edge IoT gateways securely transmit encrypted data to our ISO 27001 certified cloud platform, accessible via mobile app and web browser.",
        },
      ],
      status: "published",
      order_index: 6,
    },
    {
      slug: "solar-operations-and-maintenance-om",
      title: "Comprehensive Solar Operations & Maintenance",
      short_description: "Preventive O&M services, robotic dry module cleaning, thermographic drone infrared inspections, and guaranteed 99% uptime availability SLAs.",
      tags: ["OPERATIONS & MAINTENANCE", "ASSET MANAGEMENT"],
      hero_image: "https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?w=1200&auto=format&fit=crop&q=80",
      cards: [
        {
          id: "card-1",
          phase_tag: "PHASE 01 ASSET RELIABILITY",
          title: "Robotic Cleaning & Thermographic Drone Scans",
          description: "Preventing hotspot cell degradation and ensuring consistent peak solar conversion.",
          bullet_points: [
            "Thermal drone scans compliant with IEC 62446-3 identifying micro-cracks and bypass diode failures.",
            "Waterless autonomous robotic module cleaning avoiding roof water accumulation and module surface scratching."
          ],
          image: "https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      hardware_card: {
        title: "Preventive O&M Contract Packages",
        description: "Scheduled preventive servicing, rapid 2-hour response dispatch, and spare parts warehousing.",
        button_text: "VIEW O&M PACKAGES",
        button_color: "#10B981",
        card_color: "#0F172A",
      },
      consultation_card: {
        title: "Request Plant Health Checkup",
        description: "Our certified technicians conduct comprehensive IV-curve tracing and thermal inspection of your existing solar plant.",
        button_text: "SCHEDULE HEALTH CHECK",
        button_color: "#F59E0B",
        card_color: "#047857",
      },
      faqs: [
        {
          question: "How often should industrial solar panels be cleaned?",
          answer: "In typical industrial textile and manufacturing corridors, bi-weekly or monthly automated cleaning recovers 8% to 15% of lost power generation.",
        },
      ],
      status: "published",
      order_index: 7,
    },
    {
      slug: "floating-solar-pv-systems",
      title: "Floating Solar PV (FPV) Systems",
      short_description: "Pioneering floating solar arrays engineered for water reservoirs, raw water retention ponds, and industrial effluent treatment ponds.",
      tags: ["FLOATING SOLAR", "WATER RESERVOIR"],
      hero_image: "https://images.unsplash.com/photo-1521618755572-156ae0cdd74d?w=1200&auto=format&fit=crop&q=80",
      cards: [
        {
          id: "card-1",
          phase_tag: "PHASE 01 AQUATIC ENGINEERING",
          title: "Food-Grade HDPE Modular Floats & Mooring",
          description: "Maximizing unused water bodies without consuming valuable commercial land.",
          bullet_points: [
            "Water natural cooling effect boosts module electrical conversion efficiency by up to 12.5%.",
            "Significantly reduces reservoir water evaporation by up to 35% while suppressing harmful algae blooms."
          ],
          image: "https://images.unsplash.com/photo-1521618755572-156ae0cdd74d?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      hardware_card: {
        title: "Floating Solar Pontoon Architecture",
        description: "UV-stabilized HDPE pontoons, corrosion-resistant anchoring cables, and submerged cables.",
        button_text: "FPV TECHNICAL DETAILS",
        button_color: "#10B981",
        card_color: "#0F172A",
      },
      consultation_card: {
        title: "Water Reservoir Feasibility",
        description: "Assess bathymetry, water level fluctuations, and wind wave dynamics for floating solar deployment.",
        button_text: "BOOK RESERVOIR AUDIT",
        button_color: "#F59E0B",
        card_color: "#047857",
      },
      faqs: [
        {
          question: "Can floating solar withstand severe wave action and monsoons?",
          answer: "Yes, our tensioned elastic anchoring systems automatically adjust for seasonal water depth variations and withstand up to 160 km/h wind shear.",
        },
      ],
      status: "published",
      order_index: 8,
    },
    {
      slug: "solar-carports-and-ev-charging",
      title: "Solar Carports & EV Fleet Charging Hubs",
      short_description: "Architectural steel canopy structures providing shaded parking for employee and executive fleets while charging electric vehicles with clean solar energy.",
      tags: ["SOLAR CARPORTS", "EV MOBILITY"],
      hero_image: "https://images.unsplash.com/photo-1545209568-98e3b3318182?w=1200&auto=format&fit=crop&q=80",
      cards: [
        {
          id: "card-1",
          phase_tag: "PHASE 01 STRUCTURAL CANOPY",
          title: "Architectural Waterproof Solar Canopies",
          description: "Dual-purpose engineering that monetizes corporate parking space into revenue-generating solar hubs.",
          bullet_points: [
            "Heavy-duty galvanized structural steel frames with integrated rainwater gutters and drainage.",
            "Integrated Level-2 AC and 60kW-180kW DC Ultra-Fast EV chargers for corporate fleet charging."
          ],
          image: "https://images.unsplash.com/photo-1545209568-98e3b3318182?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      hardware_card: {
        title: "Canopy Steel & Fast-Charger Package",
        description: "Hot-dip galvanized structural framing, bifacial solar glass, and OCPP-compliant EV chargers.",
        button_text: "VIEW CARPORT SPECS",
        button_color: "#10B981",
        card_color: "#0F172A",
      },
      consultation_card: {
        title: "Parking Lot Solar Design",
        description: "Send us your parking lot layout for an instant 3D layout rendering, vehicle capacity analysis, and generation model.",
        button_text: "REQUEST CARPORT PROPOSAL",
        button_color: "#F59E0B",
        card_color: "#047857",
      },
      faqs: [
        {
          question: "Are solar carports completely waterproof?",
          answer: "Yes, our carport systems feature patented EPDM rubber compression seals and hidden internal gutter channels for 100% dry parking underneath.",
        },
      ],
      status: "published",
      order_index: 9,
    },
    {
      slug: "industrial-solar-thermal-process-heat",
      title: "Industrial Solar Thermal & Process Heat",
      short_description: "Parabolic trough and evacuated tube solar collectors generating hot water and pressurized steam up to 180°C for industrial boilers and washing lines.",
      tags: ["SOLAR THERMAL", "INDUSTRIAL PROCESS HEAT"],
      hero_image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80",
      cards: [
        {
          id: "card-1",
          phase_tag: "PHASE 01 THERMAL CONCENTRATION",
          title: "High-Temperature Concentrating Solar Collectors",
          description: "Displacing fossil fuels in industrial boilers, textile dyeing, food processing, and chemical production.",
          bullet_points: [
            "Delivers pressurized hot water and industrial steam up to 180°C with thermal efficiency exceeding 70%.",
            "Reduces furnace oil, natural gas, and biomass boiler fuel expenses by 30% to 50% annually."
          ],
          image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      hardware_card: {
        title: "Solar Boiler Feed System",
        description: "Evacuated heat pipes, insulated thermal storage tanks, and high-temperature heat exchangers.",
        button_text: "EXPLORE PROCESS HEAT",
        button_color: "#10B981",
        card_color: "#0F172A",
      },
      consultation_card: {
        title: "Boiler Fuel Audit",
        description: "Our thermal engineers analyze your steam consumption to engineer a hybrid solar thermal feed system.",
        button_text: "SCHEDULE THERMAL AUDIT",
        button_color: "#F59E0B",
        card_color: "#047857",
      },
      faqs: [
        {
          question: "What temperature steam can solar thermal systems generate?",
          answer: "Our industrial concentrating collectors deliver pressurized steam up to 180°C (10 bar), perfectly matching textile dyeing and manufacturing boiler requirements.",
        },
      ],
      status: "published",
      order_index: 10,
    },
  ];

  for (const s of servicesData) {
    await pool.query(
      `INSERT INTO services (
        slug, title, short_description, tags, hero_image, cards,
        hardware_card, consultation_card, faqs, status, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.slug,
        s.title,
        s.short_description,
        JSON.stringify(s.tags),
        s.hero_image,
        JSON.stringify(s.cards),
        JSON.stringify(s.hardware_card),
        JSON.stringify(s.consultation_card),
        JSON.stringify(s.faqs),
        s.status,
        s.order_index,
      ]
    );
  }
  console.log("✅ 10 Solar Services successfully seeded into database!");

  // -------------------------------------------------------------
  // 2. 10 REAL-WORLD SOLAR PROJECTS / CASE STUDIES
  // -------------------------------------------------------------
  const projectsData = [
    {
      slug: "5-2-mwp-commercial-rooftop-solar-epc",
      project_category_id: 1,
      label: "Turnkey Industrial EPC",
      big_title: "5.2 MWp Commercial Rooftop Solar EPC Deployment",
      description_cards: [
        { title: "5.2 MWp", subtitle: "System Capacity" },
        { title: "6.8 GWh", subtitle: "Annual Yield" },
        { title: "4,200 Tons", subtitle: "CO2 Offset" },
        { title: "3.8 Years", subtitle: "Capital Payback" },
      ],
      details_card: [
        {
          label: "Milestone 01",
          label_color: "#10B981",
          title: "Structural Aerodynamic Modeling & Ballast Integration",
          description_1: "Engineered specifically for heavy industrial corrugated tin and standing seam roofs, featuring non-penetrating clamps tested to 180 km/h wind speeds.",
          description_2: "Full 3D LiDAR point-cloud scans and shadow analysis ensured maximum annual kilowatt-hour density across the 280,000 sq ft factory footprint.",
          bullet_points: [
            { icon_color: "#10B981", text: "Zero roof penetration with marine-grade AL6005-T5 anodized aluminum clamping." },
            { icon_color: "#10B981", text: "Certified wind-tunnel resilience up to 180 km/h wind shear ratings." }
          ],
          image: "https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
        {
          label: "Milestone 02",
          label_color: "#06B6D4",
          title: "Tier-1 TOPCon Bifacial Modules & String Inverter Architecture",
          description_1: "Deployment of high-yield N-Type TOPCon bifacial modules coupled with multi-MPPT smart string inverters for real-time string-level yield optimization.",
          description_2: "Euro efficiency rating of 99.0% with automated AI-assisted arc fault circuit interruption (AFCI) protecting facility assets 24/7.",
          bullet_points: [
            { icon_color: "#06B6D4", text: "N-Type TOPCon bifacial modules achieving up to 22.8% conversion efficiency." },
            { icon_color: "#06B6D4", text: "Multi-MPPT string architecture with rapid shutdown and SCADA telemetry." }
          ],
          image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
          image_left: true,
        },
      ],
      faq_title: "Project FAQs",
      faq_description: "Technical inquiries regarding the 5.2 MWp industrial rooftop project.",
      faq_questions: [
        {
          question: "How does the non-penetrating clamping protect the factory roof?",
          answer: "We deploy precision-engineered aluminum standing-seam clamps with EPDM rubber dampening that grip the seams without puncturing the roof sheet, preserving 100% of factory waterproofing warranties.",
        },
      ],
      status: "published",
      order_index: 1,
    },
    {
      slug: "10-mwh-containerized-industrial-bess",
      project_category_id: 2,
      label: "Utility Microgrid",
      big_title: "10 MWh Containerized Industrial BESS Peak Shaving Hub",
      description_cards: [
        { title: "10.4 MWh", subtitle: "Energy Storage" },
        { title: "5.0 MW", subtitle: "Inverter Rating" },
        { title: "92.5%", subtitle: "Round-Trip Eff" },
        { title: "100%", subtitle: "Zero Outage" },
      ],
      details_card: [
        {
          label: "Milestone 01",
          label_color: "#06B6D4",
          title: "Liquid-Cooled Battery Enclosures & Fire Safety",
          description_1: "Designed for a heavy manufacturing zone suffering from frequent grid voltage sags and rolling brownouts.",
          description_2: "Utilizes advanced LFP chemistry with comprehensive cell-level monitoring and integrated clean-agent fire suppression.",
          bullet_points: [
            { icon_color: "#06B6D4", text: "Liquid cooling maintains cell temperature variance below 2.0°C." },
            { icon_color: "#06B6D4", text: "NFPA 855 and UL 9540A safety compliance certification." }
          ],
          image: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      faq_title: "BESS Project Details",
      faq_description: "Technical questions regarding the 10 MWh battery installation.",
      faq_questions: [
        {
          question: "How fast is the transfer time during a power cut?",
          answer: "The BESS system engages in under 15 milliseconds, ensuring continuous operation of sensitive robotics and computerized knitting lines.",
        },
      ],
      status: "published",
      order_index: 2,
    },
    {
      slug: "8-4-mwp-composite-textile-solar",
      project_category_id: 3,
      label: "LEED Platinum Certified",
      big_title: "8.4 MWp Composite Textile Mills Rooftop PV Plant",
      description_cards: [
        { title: "8.4 MWp", subtitle: "Installed Capacity" },
        { title: "11.2 GWh", subtitle: "Annual Generation" },
        { title: "320,000 sq ft", subtitle: "Roof Coverage" },
        { title: "7,100 Tons", subtitle: "CO2 Avoided" },
      ],
      details_card: [
        {
          label: "Milestone 01",
          label_color: "#10B981",
          title: "Textile Factory Roof Retrofit & Structural Reinforcement",
          description_1: "One of the largest self-consumption rooftop solar installations in South Asia, spread across five interconnected spinning sheds.",
          description_2: "Enables the textile conglomerate to meet strict European carbon compliance and global buyer ESG mandates.",
          bullet_points: [
            { icon_color: "#10B981", text: "Supplies over 38% of total annual manufacturing energy." },
            { icon_color: "#10B981", text: "Achieved LEED Platinum zero-carbon factory certification." }
          ],
          image: "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      faq_title: "Textile Solar Case Study",
      faq_description: "Details on industrial textile mill solar installations.",
      faq_questions: [
        {
          question: "Did factory operations stop during solar installation?",
          answer: "Zero manufacturing downtime occurred. All lifting and mechanical mounting were coordinated during scheduled weekend maintenance shifts.",
        },
      ],
      status: "published",
      order_index: 3,
    },
    {
      slug: "25-mwp-utility-scale-solar-farm",
      project_category_id: 4,
      label: "132kV Substation",
      big_title: "25 MWp Utility-Scale Ground-Mounted Solar Farm",
      description_cards: [
        { title: "25.0 MWp", subtitle: "Nominal Power" },
        { title: "38.5 GWh", subtitle: "Annual Yield" },
        { title: "1-Axis", subtitle: "Smart Trackers" },
        { title: "132kV", subtitle: "Grid Substation" },
      ],
      details_card: [
        {
          label: "Milestone 01",
          label_color: "#F59E0B",
          title: "Astronomical Single-Axis Tracking on 85 Acres",
          description_1: "Utility power plant feeding clean electricity directly into the national power grid through a dedicated 132kV switchyard.",
          description_2: "Equipped with AI terrain-adaptive algorithms to optimize generation on undulating land.",
          bullet_points: [
            { icon_color: "#F59E0B", text: "Over 42,000 N-Type bifacial solar panels installed." },
            { icon_color: "#F59E0B", text: "Automated weather station stowing against monsoon gales." }
          ],
          image: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      faq_title: "Utility Project Questions",
      faq_description: "Grid connection and technical specifications.",
      faq_questions: [
        {
          question: "What is the expected plant availability rate?",
          answer: "The plant is engineered for greater than 99.2% technical availability, monitored 24/7 by central SCADA.",
        },
      ],
      status: "published",
      order_index: 4,
    },
    {
      slug: "3-6-mwp-pharma-cleanroom-solar",
      project_category_id: 1,
      label: "Pharma Clean-Room",
      big_title: "3.6 MWp Pharmaceutical Manufacturing Clean Solar Array",
      description_cards: [
        { title: "3.6 MWp", subtitle: "Peak Power" },
        { title: "4.9 GWh", subtitle: "Annual Generation" },
        { title: "Zero Dust", subtitle: "Sterile Standard" },
        { title: "99.8%", subtitle: "Power Quality" },
      ],
      details_card: [
        {
          label: "Milestone 01",
          label_color: "#10B981",
          title: "Cleanroom Safe Installation & Power Quality Harmonization",
          description_1: "Engineered above sterile pharmaceutical formulation labs with active active harmonic filters ensuring clean power for precision lab instruments.",
          description_2: "Non-vibrational installation techniques ensured zero particulate contamination inside cleanrooms during mounting.",
          bullet_points: [
            { icon_color: "#10B981", text: "Active harmonic filtering maintaining THD below 2.5%." },
            { icon_color: "#10B981", text: "Full WHO-GMP environmental compliance during execution." }
          ],
          image: "https://images.unsplash.com/photo-1548337138-e87d889cc369?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      faq_title: "Pharma Solar FAQ",
      faq_description: "High-spec power quality and cleanroom safety.",
      faq_questions: [
        {
          question: "Does solar power affect sensitive pharmaceutical machinery?",
          answer: "No, our multi-level power conditioning and active filters provide cleaner sine-wave power than the incoming utility grid.",
        },
      ],
      status: "published",
      order_index: 5,
    },
    {
      slug: "2-2-mwp-floating-solar-reservoir",
      project_category_id: 1,
      label: "Water Reservoir FPV",
      big_title: "2.2 MWp Floating Solar PV Array on Industrial Reservoir",
      description_cards: [
        { title: "2.2 MWp", subtitle: "Floating Solar" },
        { title: "3.1 GWh", subtitle: "Annual Energy" },
        { title: "35%", subtitle: "Evap Reduction" },
        { title: "12%", subtitle: "Thermal Gain" },
      ],
      details_card: [
        {
          label: "Milestone 01",
          label_color: "#06B6D4",
          title: "Aquatic Pontoon Deployment on Raw Water Reservoir",
          description_1: "Built upon a textile factory's 12-acre raw water lake, conserving valuable expansion land while cooling the solar cells naturally.",
          description_2: "Anchored with corrosion-proof mooring cables accommodating a 5-meter seasonal water level variation.",
          bullet_points: [
            { icon_color: "#06B6D4", text: "Conserved 18 million gallons of industrial water annually." },
            { icon_color: "#06B6D4", text: "Food-grade HDPE floats prevent water contamination." }
          ],
          image: "https://images.unsplash.com/photo-1521618755572-156ae0cdd74d?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      faq_title: "Floating Solar FAQ",
      faq_description: "Aquatic stability and environmental benefits.",
      faq_questions: [
        {
          question: "Does floating solar affect water quality for factory processing?",
          answer: "It actually improves water quality by shading the pond from UV sunlight, preventing algae blooms that clog treatment filters.",
        },
      ],
      status: "published",
      order_index: 6,
    },
    {
      slug: "4-5-mwp-steel-mill-solar-diesel-hybrid",
      project_category_id: 1,
      label: "Steel Mill Microgrid",
      big_title: "4.5 MWp Steel Re-Rolling Mill Solar-Genset Microgrid",
      description_cards: [
        { title: "4.5 MWp", subtitle: "PV Hybrid" },
        { title: "1.8M Liters", subtitle: "Diesel Saved" },
        { title: "Zero", subtitle: "Reverse Feed" },
        { title: "100 ms", subtitle: "Response Speed" },
      ],
      details_card: [
        {
          label: "Milestone 01",
          label_color: "#F59E0B",
          title: "Heavy Inductive Load Management & Fast Solar Dispatch",
          description_1: "Steel mills experience severe load swings from electric arc furnaces and rolling stands. Our dynamic controller manages solar output in real-time.",
          description_2: "Synchronized with 4 x 2,000 kVA diesel generators to slash monthly fuel costs by over 40%.",
          bullet_points: [
            { icon_color: "#F59E0B", text: "Advanced fast-response power curtailment prevents generator reverse-power trips." },
            { icon_color: "#F59E0B", text: "Real-time reactive power compensation boosts plant power factor." }
          ],
          image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      faq_title: "Steel Mill Microgrid FAQ",
      faq_description: "Heavy industry power stabilization.",
      faq_questions: [
        {
          question: "Can solar handle instantaneous motor starting surges?",
          answer: "Yes, the hybrid controller works alongside generators and fast inverters to absorb voltage dips seamlessly.",
        },
      ],
      status: "published",
      order_index: 7,
    },
    {
      slug: "1-8-mwp-corporate-solar-carport",
      project_category_id: 2,
      label: "Solar Carport & EV",
      big_title: "1.8 MWp Corporate Headquarters Solar Carport & EV Hub",
      description_cards: [
        { title: "1.8 MWp", subtitle: "Canopy Array" },
        { title: "650", subtitle: "Shaded Bays" },
        { title: "30", subtitle: "Fast Chargers" },
        { title: "2.4 GWh", subtitle: "Annual Solar" },
      ],
      details_card: [
        {
          label: "Milestone 01",
          label_color: "#10B981",
          title: "Architectural Steel Canopy with Integrated EV Fleet Chargers",
          description_1: "Transforms open-air executive parking into an energy-generating landmark for a multinational technology campus.",
          description_2: "Includes 30 high-speed EV charging stations powered by 100% on-site generated solar electricity.",
          bullet_points: [
            { icon_color: "#10B981", text: "100% waterproof sealed canopy with internal rainwater downspouts." },
            { icon_color: "#10B981", text: "Smart RFID-enabled employee EV charging management software." }
          ],
          image: "https://images.unsplash.com/photo-1545209568-98e3b3318182?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      faq_title: "Solar Carport FAQ",
      faq_description: "Corporate e-mobility and architectural design.",
      faq_questions: [
        {
          question: "Are solar carports resistant to high monsoon winds?",
          answer: "All structural columns are anchored into reinforced concrete pile foundations certified to resist 170 km/h wind shear.",
        },
      ],
      status: "published",
      order_index: 8,
    },
    {
      slug: "6-0-mwp-jute-packaging-solar",
      project_category_id: 1,
      label: "Agro-Industrial Solar",
      big_title: "6.0 MWp Jute & Packaging Processing Facility Solar Array",
      description_cards: [
        { title: "6.0 MWp", subtitle: "Total Output" },
        { title: "8.1 GWh", subtitle: "Annual Yield" },
        { title: "4,900 Tons", subtitle: "Emissions Avoided" },
        { title: "4.1 Years", subtitle: "Payback Period" },
      ],
      details_card: [
        {
          label: "Milestone 01",
          label_color: "#10B981",
          title: "Long-Span Roof Structural Engineering for Agro-Industry",
          description_1: "Equipped with automated anti-soiling drone inspections and string-level fault monitoring across four large packaging mills.",
          description_2: "Generates massive operational cost savings that hedge the facility against rising grid utility tariffs.",
          bullet_points: [
            { icon_color: "#10B981", text: "High-yield N-Type TOPCon panels for humid sub-tropical conditions." },
            { icon_color: "#10B981", text: "Automated dry-cleaning system reduces water consumption to zero." }
          ],
          image: "https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      faq_title: "Agro-Industrial Solar FAQ",
      faq_description: "Jute and packaging facility solar benefits.",
      faq_questions: [
        {
          question: "How does the system handle fiber dust accumulation?",
          answer: "Robotic dry-cleaning runs every morning before sunrise, keeping module glass spotless without manual water spraying.",
        },
      ],
      status: "published",
      order_index: 9,
    },
    {
      slug: "15-mwp-cement-clinker-renewable-station",
      project_category_id: 4,
      label: "Heavy Industry Microgrid",
      big_title: "15 MWp Cement Clinker Facility Renewable Power Station",
      description_cards: [
        { title: "15.0 MWp", subtitle: "PV System" },
        { title: "21.6 GWh", subtitle: "Clean Energy" },
        { title: "14,200 Tons", subtitle: "CO2 Cut" },
        { title: "33kV", subtitle: "Dedicated Feeder" },
      ],
      details_card: [
        {
          label: "Milestone 01",
          label_color: "#F59E0B",
          title: "High-Voltage Interconnection & Heavy Industrial Offset",
          description_1: "Supplying green energy directly to high-torque ball mills and clinker crushers via a dedicated 33kV internal substation.",
          description_2: "Significantly reduces the carbon intensity of cement manufacturing to comply with green building standards.",
          bullet_points: [
            { icon_color: "#F59E0B", text: "High-spec IP66 inverters engineered for dusty cement environments." },
            { icon_color: "#F59E0B", text: "Full SCADA remote telemetry dispatch integrated with plant DCS." }
          ],
          image: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&auto=format&fit=crop&q=80",
          image_left: false,
        },
      ],
      faq_title: "Cement Industry Solar FAQ",
      faq_description: "High-dust heavy industrial clean energy.",
      faq_questions: [
        {
          question: "How does the electrical equipment handle heavy cement dust?",
          answer: "All inverters and junction boxes feature IP66 hermetic sealing with pressurized cooling channels to prevent abrasive dust ingress.",
        },
      ],
      status: "published",
      order_index: 10,
    },
  ];

  for (const p of projectsData) {
    await pool.query(
      `INSERT INTO projects (
        slug, project_category_id, label, big_title, description_cards, details_card,
        faq_title, faq_description, faq_questions, status, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.slug,
        p.project_category_id,
        p.label,
        p.big_title,
        JSON.stringify(p.description_cards),
        JSON.stringify(p.details_card),
        p.faq_title,
        p.faq_description,
        JSON.stringify(p.faq_questions),
        p.status,
        p.order_index,
      ]
    );
  }
  console.log("✅ 10 Solar Projects successfully seeded into database!");

  console.log("🎉 All 10 Services and 10 Projects successfully seeded!");
  process.exit(0);
}

seedServicesAndProjects().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
