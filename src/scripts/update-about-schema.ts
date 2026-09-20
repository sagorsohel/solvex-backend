import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'solvex_db'
  });

  // 1. Add factory_section column if not exists
  const [cols]: any = await conn.query("SHOW COLUMNS FROM about_page_settings LIKE 'factory_section'");
  if (cols.length === 0) {
    await conn.query("ALTER TABLE about_page_settings ADD COLUMN factory_section JSON DEFAULT NULL AFTER efficiency_certificates_section");
    console.log('✅ Added factory_section column to about_page_settings.');
  } else {
    console.log('ℹ️ factory_section column already exists.');
  }

  // 2. Check and seed sample certificates in efficiency_certificates_section
  const [rows]: any = await conn.query("SELECT efficiency_certificates_section, factory_section FROM about_page_settings WHERE id = 1");
  if (rows.length > 0) {
    let eff = rows[0].efficiency_certificates_section || {};
    if (typeof eff === 'string') eff = JSON.parse(eff);

    if (!eff.certificates || eff.certificates.length === 0) {
      eff.certificates = [
        {
          id: 'cert-1',
          name: 'CE',
          issuer: 'European Conformity Certification',
          image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
          pdf: ''
        },
        {
          id: 'cert-2',
          name: 'UPS-CE',
          issuer: 'Uninterruptible Power Supply CE Compliance',
          image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
          pdf: ''
        },
        {
          id: 'cert-3',
          name: 'IEC',
          issuer: 'Shenzhen Anbotek Compliance Laboratory',
          image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
          pdf: ''
        },
        {
          id: 'cert-4',
          name: 'ROHS',
          issuer: 'Restriction of Hazardous Substances Compliance',
          image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80',
          pdf: ''
        },
        {
          id: 'cert-5',
          name: 'ISO 9001:2015',
          issuer: 'Quality Management System Accreditation',
          image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80',
          pdf: ''
        },
        {
          id: 'cert-6',
          name: 'IEC 62446',
          issuer: 'Grid-Connected PV Systems Documentation & Verification',
          image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80',
          pdf: ''
        }
      ];
      await conn.query("UPDATE about_page_settings SET efficiency_certificates_section = ? WHERE id = 1", [JSON.stringify(eff)]);
      console.log('✅ Seeded default certificates into efficiency_certificates_section.');
    }

    let factory = rows[0].factory_section;
    if (!factory) {
      factory = {
        small_title: 'MANUFACTURING EXCELLENCE',
        big_title: 'State-of-the-Art Factory & High-Tech Facilities',
        description: 'Engineered with world-class German automated machinery, ISO Class 10,000 cleanroom environments, and 48-hour burn-in testing chambers to guarantee zero-defect solar and BESS manufacturing.',
        stats: [
          { label: 'Facility Footprint', value: '280,000 sq ft' },
          { label: 'Annual Capacity', value: '500+ MWp' },
          { label: 'Automated SMT Lines', value: '100% Robotics' },
          { label: 'Quality Burn-in Testing', value: '48 Hours' }
        ],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1000&auto=format&fit=crop&q=80',
            title: 'Automated Robotics Assembly',
            description: 'Sub-millimeter precision surface-mount technology.'
          },
          {
            url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1000&auto=format&fit=crop&q=80',
            title: 'High-Voltage Testing & QC Lab',
            description: 'Rigorous electrical dielectric and thermal stress validation.'
          },
          {
            url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&auto=format&fit=crop&q=80',
            title: 'Cleanroom Production Facility',
            description: 'ISO Class 10,000 certified micro-climate assembly.'
          }
        ]
      };
      await conn.query("UPDATE about_page_settings SET factory_section = ? WHERE id = 1", [JSON.stringify(factory)]);
      console.log('✅ Seeded default factory_section.');
    }
  }

  await conn.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
