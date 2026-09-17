import { Request, Response } from "express";
import { pool } from "../db/index.js";

let tablesInitialized = false;

// Helper: Slugify text
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

// Helper: Strip HTML tags to plain text
const stripHtml = (html?: string | null): string => {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
};

// Helper: Estimate read time
const estimateReadTime = (content?: string | null): string => {
  const plainText = stripHtml(content);
  const words = plainText.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
};

// Ensure blogs table exists and is populated
export const ensureBlogTable = async () => {
  if (tablesInitialized) return;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        cover_image VARCHAR(500),
        category VARCHAR(100) DEFAULT 'Solar Technology' NOT NULL,
        tags JSON,
        excerpt TEXT,
        description LONGTEXT,
        author_name VARCHAR(100) DEFAULT 'Solvex Editorial Team' NOT NULL,
        author_role VARCHAR(100) DEFAULT 'Renewable Energy Specialist' NOT NULL,
        author_avatar VARCHAR(500),
        read_time VARCHAR(50) DEFAULT '4 min read' NOT NULL,
        status ENUM('published', 'draft', 'archived') DEFAULT 'published' NOT NULL,
        is_featured BOOLEAN DEFAULT FALSE NOT NULL,
        views_count INT DEFAULT 0 NOT NULL,
        seo_title VARCHAR(255),
        seo_description TEXT,
        seo_keywords TEXT,
        og_image VARCHAR(500),
        translations JSON,
        published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed default sample blogs if table is completely empty
    const [rows]: any = await pool.query("SELECT COUNT(*) as count FROM blogs");
    if (rows && rows[0]?.count === 0) {
      console.log("Seeding default Solvex Engineering & Clean Tech blogs...");

      const sampleBlogs = [
        {
          title: "The Physics of Dual-Glass Bifacial TOPCon Solar Panels in Tropical Climates",
          slug: "physics-of-dual-glass-bifacial-topcon-solar-panels",
          cover_image: "/blog_1.png",
          category: "Solar Technology",
          tags: ["TOPCon", "Bifacial", "Photovoltaics", "Efficiency"],
          excerpt: "How tunnel oxide passivated contact (TOPCon) architecture outperforms traditional PERC in Bangladesh's high-humidity and high-ambient temperature industrial rooftop environments.",
          description: `<h2>Understanding Next-Generation N-Type Silicon Architecture</h2>
<p>As industrial rooftop adoption accelerates across South Asia, traditional P-type PERC panels are rapidly reaching their theoretical photoelectric efficiency ceiling of ~24.5%. At Solvex Global, our utility and industrial installations are pivoting toward <strong>N-type Tunnel Oxide Passivated Contact (TOPCon)</strong> technology.</p>
<p>TOPCon cells leverage an ultra-thin 1.5nm silicon oxide tunnel layer paired with a doped polycrystalline silicon film. This dramatically lowers surface recombination velocities and elevates open-circuit voltages (Voc) past 730 mV.</p>

<h3>Key Advantages for Industrial Operations:</h3>
<ul>
  <li><strong>Lower Temperature Coefficient:</strong> TOPCon modules exhibit a temperature coefficient of -0.30%/°C compared to PERC's -0.35%/°C, generating up to 3.8% more yield during scorching 38°C midday peaks.</li>
  <li><strong>Bifaciality Factor Exceeding 80%:</strong> Ground reflection and diffuse albedo radiation captured by the rear glass boost total energy output by an additional 12% to 22%.</li>
  <li><strong>Zero Light-Induced Degradation (LID):</strong> N-type silicon eliminates boron-oxygen defect pairs, guaranteeing less than 1% degradation in year one and 0.4% annually thereafter.</li>
</ul>

<blockquote>"Investing in Tier-1 TOPCon hardware reduces Levelized Cost of Electricity (LCOE) by up to 14% over a 25-year operational lifecycle." - Solvex Technical Engineering Division</blockquote>

<h3>Technical Performance Comparison Table</h3>
<p>Our telemetry data collected from commercial spinning mills in Gazipur confirms sustained midday performance even under heavy atmospheric dust and tropical cloud cover.</p>`,
          author_name: "Engr. Tariqul Islam",
          author_role: "Chief Technical Officer",
          author_avatar: "/chairman.jpeg",
          read_time: "5 min read",
          status: "published",
          is_featured: true,
          seo_title: "Physics of Bifacial TOPCon Solar Panels | Solvex Global",
          seo_description: "Deep dive into N-type TOPCon solar panel physics, bifacial albedo gains, and thermal coefficients in Bangladesh tropical conditions.",
          seo_keywords: "TOPCon solar, bifacial solar panels, industrial solar Bangladesh, solar EPC engineering",
          translations: {
            bn: {
              title: "গ্রীষ্মমন্ডলীয় আবহাওয়ায় ডুয়েল-গ্লাস বাইফেসিয়াল টপকন সোলার প্যানেলের বিজ্ঞান",
              category: "সৌর প্রযুক্তি",
              tags: ["টপকন", "বাইফেসিয়াল", "ফটোভোলটাইক", "দক্ষতা"],
              excerpt: "বাংলাদেশের উচ্চ আর্দ্রতা এবং উচ্চ তাপমাত্রায় ঐতিহ্যবাহী পার্ক প্যানেলের তুলনায় টপকন আর্কিটেকচার কীভাবে বেশি বিদ্যুৎ উৎপাদন করে।",
              description: `<h2>পরবর্তী প্রজন্মের এন-টাইপ সিলিকন প্রযুক্তির গুরুত্ব</h2><p>শিল্পকারখানার ছাদে ঐতিহ্যবাহী পি-টাইপ পার্ক প্যানেলের তুলনায় <strong>টপকন (TOPCon)</strong> প্রযুক্তি ২৫ বছরের দীর্ঘস্থায়ী কার্যক্ষমতা নিশ্চিত করে। সলভেক্স গ্লোবাল প্রতিটি প্রজেক্টে টিয়ার-১ সার্টিফাইড টপকন মডিউল ব্যবহার করে সর্বোচ্চ রিটার্ন অন ইনভেস্টমেন্ট প্রদান করে।</p>`,
            },
          },
        },
        {
          title: "Battery Energy Storage Systems (BESS): Mitigating Grid Voltage Fluctuation",
          slug: "battery-energy-storage-systems-bess-mitigating-voltage-fluctuation",
          cover_image: "/blog_2.png",
          category: "Energy Storage",
          tags: ["BESS", "LiFePO4", "Grid Stability", "Peak Shaving"],
          excerpt: "A technical breakdown of integrating containerized LiFePO4 battery storage to stabilize 11kV/33kV distribution lines for sensitive automated manufacturing machinery.",
          description: `<h2>Eliminating Production Downtime with Microsecond BESS Transfer</h2>
<p>In modern automated textile, pharmaceutical, and semiconductor plants, micro-voltage sags lasting merely 80 milliseconds can trip variable frequency drives (VFDs) and computer numerical control (CNC) systems, resulting in hours of expensive raw material spoilage.</p>
<p>Solvex containerized <strong>Battery Energy Storage Systems (BESS)</strong> act as a dynamic spinning reserve, executing static transfer within 4 milliseconds upon detection of sub-cycle grid anomalies.</p>

<h3>Architectural Highlights:</h3>
<ul>
  <li><strong>Safe LiFePO4 Chemistry:</strong> Thermal runaway threshold above 270°C with automated aerosol and Novec 1230 fire suppression.</li>
  <li><strong>Intelligent Peak Shaving:</strong> Automatically discharges during evening peak tariff hours (5 PM – 11 PM), cutting maximum demand billing surcharges.</li>
  <li><strong>Liquid Cooling Thermal Management:</strong> Uniform temperature gradient within ±2.5°C across all battery packs, extending cell lifecycle to 6,000+ cycles at 90% DoD.</li>
</ul>`,
          author_name: "Rajibul Islam",
          author_role: "Managing Director & Power Systems Engineer",
          author_avatar: "/managing_director.png",
          read_time: "6 min read",
          status: "published",
          is_featured: true,
          seo_title: "Industrial BESS Solutions & Grid Stability | Solvex Global",
          seo_description: "Discover how Solvex containerized LiFePO4 BESS mitigates voltage sags, delivers peak shaving, and stabilizes automated factories.",
          seo_keywords: "BESS, battery energy storage, LiFePO4, industrial grid stability, peak shaving",
          translations: {
            bn: {
              title: "ব্যাটারি এনার্জি স্টোরেজ সিস্টেম (BESS): গ্রিড ভোল্টেজ ওঠানামা নিরসন",
              category: "এনার্জি স্টোরেজ",
              tags: ["বিইএসএস", "ব্যাটারি", "গ্রিড স্ট্যাবিলিটি"],
              excerpt: "সংবেদনশীল শিল্প মেশিনারির সুরক্ষা এবং পিক শেভিংয়ের জন্য আধুনিক লিথিয়াম আয়রন ফসফেট ব্যাটারি স্টোরেজ সিস্টেমের কার্যকারিতা।",
            },
          },
        },
        {
          title: "Net Metering Regulatory Guidelines & Financial Modeling in Bangladesh",
          slug: "net-metering-regulatory-guidelines-financial-modeling-bangladesh",
          cover_image: "/blog_3.png",
          category: "Regulatory & Policy",
          tags: ["Net Metering", "SREDA", "ROI", "Tariff"],
          excerpt: "Everything industrial business owners need to know regarding SREDA net-metering approvals, bi-directional energy billing, and accelerated 3.5-year CAPEX recovery.",
          description: `<h2>Maximizing Renewable ROI Through Grid Interconnection</h2>
<p>Under the revised Net Metering Guidelines issued by the Ministry of Power, Energy and Mineral Resources (MPEMR) and SREDA, commercial and industrial electricity consumers can install solar PV systems up to 70% of their sanctioned load (up to a maximum of 10 MW).</p>

<h3>Financial Payback Mechanics:</h3>
<ol>
  <li><strong>Bi-Directional Metering:</strong> Energy exported during Friday/holiday low plant consumption is credited at bulk utility tariffs against your monthly billing invoice.</li>
  <li><strong>Zero Working Capital Bleed:</strong> Rooftop solar generates electricity at an equivalent levelized cost of less than 4.5 BDT/kWh, contrasting with grid peak tariffs exceeding 11 BDT/kWh.</li>
  <li><strong>Fast Capital Amortization:</strong> Most medium-to-heavy industrial facilities amortize 100% of their initial engineering investment within 38 to 48 months.</li>
</ol>`,
          author_name: "Solvex Editorial Team",
          author_role: "Regulatory Compliance Group",
          author_avatar: "/logo.png",
          read_time: "4 min read",
          status: "published",
          is_featured: false,
          seo_title: "Bangladesh Net Metering Regulations & ROI Modeling | Solvex Global",
          seo_description: "Complete guide to SREDA net metering policies, sanctioned load limits, and financial modeling for Bangladesh factory owners.",
          seo_keywords: "net metering Bangladesh, SREDA solar policy, industrial rooftop solar ROI",
        },
      ];

      for (const blog of sampleBlogs) {
        await pool.query(
          `INSERT INTO blogs (
            title, slug, cover_image, category, tags, excerpt, description,
            author_name, author_role, author_avatar, read_time, status,
            is_featured, seo_title, seo_description, seo_keywords, og_image, translations
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            blog.title,
            blog.slug,
            blog.cover_image,
            blog.category,
            JSON.stringify(blog.tags),
            blog.excerpt,
            blog.description,
            blog.author_name,
            blog.author_role,
            blog.author_avatar,
            blog.read_time,
            blog.status,
            blog.is_featured,
            blog.seo_title,
            blog.seo_description,
            blog.seo_keywords,
            blog.cover_image,
            blog.translations ? JSON.stringify(blog.translations) : null,
          ]
        );
      }
      console.log("Sample blogs seeded successfully!");
    }

    tablesInitialized = true;
  } catch (error) {
    console.error("Error ensuring blogs table:", error);
  }
};

// Helper: Format raw MySQL row with both camelCase & snake_case
const formatBlogRow = (r: any) => {
  if (!r) return null;
  return {
    ...r,
    coverImage: r.cover_image,
    authorName: r.author_name,
    authorRole: r.author_role,
    authorAvatar: r.author_avatar,
    readTime: r.read_time,
    isFeatured: Boolean(r.is_featured),
    viewsCount: r.views_count,
    seoTitle: r.seo_title,
    seoDescription: r.seo_description,
    seoKeywords: r.seo_keywords,
    ogImage: r.og_image,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    tags: typeof r.tags === "string" ? JSON.parse(r.tags) : r.tags || [],
    translations: typeof r.translations === "string" ? JSON.parse(r.translations) : r.translations || {},
  };
};

// GET /api/blogs - List blogs with filtering and pagination
export const getBlogs = async (req: Request, res: Response) => {
  try {
    await ensureBlogTable();

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;

    const status = req.query.status as string; // 'all', 'published', 'draft'
    const category = req.query.category as string;
    const search = req.query.search as string;
    const featured = req.query.featured as string;

    const conditions: string[] = [];
    const params: any[] = [];

    // Public API defaults to published
    if (!status || status === "published") {
      conditions.push("status = 'published'");
    } else if (status !== "all") {
      conditions.push("status = ?");
      params.push(status);
    }

    if (category && category !== "All") {
      conditions.push("category = ?");
      params.push(category);
    }

    if (featured === "true") {
      conditions.push("is_featured = TRUE");
    }

    if (search && search.trim()) {
      conditions.push("(title LIKE ? OR excerpt LIKE ? OR category LIKE ?)");
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count query
    const [countRows]: any = await pool.query(
      `SELECT COUNT(*) as total FROM blogs ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    // Data query
    const [rows]: any = await pool.query(
      `SELECT 
        id, title, slug, cover_image, category, tags, excerpt,
        author_name, author_role, author_avatar, read_time,
        status, is_featured, views_count, seo_title, seo_description,
        seo_keywords, og_image, translations, published_at, created_at, updated_at
      FROM blogs
      ${whereClause}
      ORDER BY is_featured DESC, published_at DESC, id DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const formatted = rows.map(formatBlogRow);

    res.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({ success: false, message: "Failed to fetch blogs", error: error.message });
  }
};

// GET /api/blogs/:slug - Get single blog by slug (or numeric ID fallback)
export const getBlogBySlug = async (req: Request, res: Response) => {
  try {
    await ensureBlogTable();
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ success: false, message: "Slug is required" });
    }

    // Try finding by slug first, or by ID if it's a number
    const isNumeric = /^\d+$/.test(slug);
    const query = isNumeric
      ? "SELECT * FROM blogs WHERE slug = ? OR id = ? LIMIT 1"
      : "SELECT * FROM blogs WHERE slug = ? LIMIT 1";
    const queryParams = isNumeric ? [slug, parseInt(slug)] : [slug];

    const [rows]: any = await pool.query(query, queryParams);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "Article not found" });
    }

    const blog = rows[0];

    // Increment views asynchronously
    pool.query("UPDATE blogs SET views_count = views_count + 1 WHERE id = ?", [blog.id]).catch(() => {});

    // Also fetch 3 recent related blogs for sidebar/bottom carousel
    const [recent]: any = await pool.query(
      `SELECT id, title, slug, cover_image, category, excerpt, read_time, published_at
       FROM blogs
       WHERE status = 'published' AND id != ?
       ORDER BY published_at DESC LIMIT 3`,
      [blog.id]
    );

    const formattedBlog = formatBlogRow(blog);
    const formattedRecent = recent.map(formatBlogRow);

    res.json({
      success: true,
      data: {
        ...formattedBlog,
        blog: formattedBlog,
        related: formattedRecent,
        relatedBlogs: formattedRecent,
      },
    });
  } catch (error: any) {
    console.error("Error fetching blog by slug:", error);
    res.status(500).json({ success: false, message: "Failed to fetch article", error: error.message });
  }
};

// GET /api/blogs/admin/:id - Get blog for editing by ID
export const getBlogById = async (req: Request, res: Response) => {
  try {
    await ensureBlogTable();
    const { id } = req.params;

    const [rows]: any = await pool.query("SELECT * FROM blogs WHERE id = ? LIMIT 1", [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    res.json({ success: true, data: formatBlogRow(rows[0]) });
  } catch (error: any) {
    console.error("Error fetching blog by ID:", error);
    res.status(500).json({ success: false, message: "Failed to fetch blog", error: error.message });
  }
};

// Helper: Ensure a unique slug
const generateUniqueSlug = async (baseSlug: string, currentId?: number): Promise<string> => {
  let cleanSlug = slugify(baseSlug) || "blog-post";
  let slug = cleanSlug;
  let counter = 1;

  while (true) {
    const query = currentId
      ? "SELECT id FROM blogs WHERE slug = ? AND id != ? LIMIT 1"
      : "SELECT id FROM blogs WHERE slug = ? LIMIT 1";
    const params = currentId ? [slug, currentId] : [slug];
    const [rows]: any = await pool.query(query, params);

    if (!rows || rows.length === 0) {
      return slug;
    }
    slug = `${cleanSlug}-${counter}`;
    counter++;
  }
};

// POST /api/blogs - Create new blog article
export const createBlog = async (req: Request, res: Response) => {
  try {
    await ensureBlogTable();

    const {
      title,
      slug: customSlug,
      coverImage,
      cover_image,
      category,
      tags,
      excerpt,
      description,
      authorName,
      author_name,
      authorRole,
      author_role,
      authorAvatar,
      author_avatar,
      readTime,
      read_time,
      status,
      isFeatured,
      is_featured,
      seoTitle,
      seo_title,
      seoDescription,
      seo_description,
      seoKeywords,
      seo_keywords,
      ogImage,
      og_image,
      translations,
      publishedAt,
      published_at,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Blog title is required" });
    }

    // Auto-generate or sanitize slug
    const finalSlug = await generateUniqueSlug(customSlug || title);

    const cImg = coverImage || cover_image || "";
    const plainExcerpt = excerpt || stripHtml(description).slice(0, 160) + "...";
    const calculatedReadTime = readTime || read_time || estimateReadTime(description);

    // Auto-fill SEO metadata from content if not provided
    const finalSeoTitle = seoTitle || seo_title || title.slice(0, 70);
    const finalSeoDesc = seoDescription || seo_description || plainExcerpt.slice(0, 160);
    const finalOgImage = ogImage || og_image || cImg;
    const finalSeoKeywords = seoKeywords || seo_keywords || (Array.isArray(tags) ? tags.join(", ") : "");

    const finalTags = Array.isArray(tags)
      ? JSON.stringify(tags)
      : typeof tags === "string"
      ? JSON.stringify(tags.split(",").map((t: string) => t.trim()).filter(Boolean))
      : JSON.stringify([]);

    const finalTranslations = translations ? JSON.stringify(translations) : null;
    const finalPublishedAt = publishedAt || published_at || new Date();

    const [result]: any = await pool.query(
      `INSERT INTO blogs (
        title, slug, cover_image, category, tags, excerpt, description,
        author_name, author_role, author_avatar, read_time, status,
        is_featured, seo_title, seo_description, seo_keywords, og_image,
        translations, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        finalSlug,
        cImg,
        category || "Solar Technology",
        finalTags,
        plainExcerpt,
        description || "",
        authorName || author_name || "Solvex Editorial Team",
        authorRole || author_role || "Renewable Energy Specialist",
        authorAvatar || author_avatar || "",
        calculatedReadTime,
        status || "published",
        isFeatured ?? is_featured ?? false,
        finalSeoTitle,
        finalSeoDesc,
        finalSeoKeywords,
        finalOgImage,
        finalTranslations,
        finalPublishedAt,
      ]
    );

    const [newRow]: any = await pool.query("SELECT * FROM blogs WHERE id = ?", [result.insertId]);

    res.status(201).json({
      success: true,
      message: "Blog article created successfully",
      data: newRow[0],
    });
  } catch (error: any) {
    console.error("Error creating blog:", error);
    res.status(500).json({ success: false, message: "Failed to create blog", error: error.message });
  }
};

// PUT /api/blogs/:id - Update blog article
export const updateBlog = async (req: Request, res: Response) => {
  try {
    await ensureBlogTable();
    const { id } = req.params;

    const [existing]: any = await pool.query("SELECT * FROM blogs WHERE id = ? LIMIT 1", [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    const prev = existing[0];
    const b = req.body;

    const title = b.title !== undefined ? b.title.trim() : prev.title;
    let finalSlug = prev.slug;
    if (b.slug && b.slug !== prev.slug) {
      finalSlug = await generateUniqueSlug(b.slug, parseInt(id));
    } else if (!prev.slug && title) {
      finalSlug = await generateUniqueSlug(title, parseInt(id));
    }

    const cImg = b.coverImage !== undefined ? b.coverImage : b.cover_image !== undefined ? b.cover_image : prev.cover_image;
    const desc = b.description !== undefined ? b.description : prev.description;
    const exc = b.excerpt !== undefined ? b.excerpt : (desc ? stripHtml(desc).slice(0, 160) + "..." : prev.excerpt);
    const rTime = b.readTime || b.read_time || (desc ? estimateReadTime(desc) : prev.read_time);

    const finalTags = b.tags !== undefined
      ? (Array.isArray(b.tags) ? JSON.stringify(b.tags) : JSON.stringify([]))
      : prev.tags;

    const finalTranslations = b.translations !== undefined
      ? JSON.stringify(b.translations)
      : prev.translations;

    const seoTitle = b.seoTitle !== undefined ? b.seoTitle : b.seo_title !== undefined ? b.seo_title : (title || prev.seo_title);
    const seoDesc = b.seoDescription !== undefined ? b.seoDescription : b.seo_description !== undefined ? b.seo_description : (exc || prev.seo_description);
    const seoKeywords = b.seoKeywords !== undefined ? b.seoKeywords : b.seo_keywords !== undefined ? b.seo_keywords : prev.seo_keywords;
    const ogImage = b.ogImage !== undefined ? b.ogImage : b.og_image !== undefined ? b.og_image : (cImg || prev.og_image);

    await pool.query(
      `UPDATE blogs SET
        title = ?,
        slug = ?,
        cover_image = ?,
        category = COALESCE(?, category),
        tags = ?,
        excerpt = ?,
        description = ?,
        author_name = COALESCE(?, author_name),
        author_role = COALESCE(?, author_role),
        author_avatar = COALESCE(?, author_avatar),
        read_time = ?,
        status = COALESCE(?, status),
        is_featured = COALESCE(?, is_featured),
        seo_title = ?,
        seo_description = ?,
        seo_keywords = ?,
        og_image = ?,
        translations = ?,
        published_at = COALESCE(?, published_at),
        updated_at = NOW()
      WHERE id = ?`,
      [
        title,
        finalSlug,
        cImg,
        b.category,
        finalTags,
        exc,
        desc,
        b.authorName ?? b.author_name,
        b.authorRole ?? b.author_role,
        b.authorAvatar ?? b.author_avatar,
        rTime,
        b.status,
        b.isFeatured ?? b.is_featured,
        seoTitle,
        seoDesc,
        seoKeywords,
        ogImage,
        finalTranslations,
        b.publishedAt || b.published_at || null,
        id,
      ]
    );

    const [updated]: any = await pool.query("SELECT * FROM blogs WHERE id = ?", [id]);
    res.json({
      success: true,
      message: "Blog article updated successfully",
      data: updated[0],
    });
  } catch (error: any) {
    console.error("Error updating blog:", error);
    res.status(500).json({ success: false, message: "Failed to update blog", error: error.message });
  }
};

// DELETE /api/blogs/:id - Delete blog article
export const deleteBlog = async (req: Request, res: Response) => {
  try {
    await ensureBlogTable();
    const { id } = req.params;

    const [result]: any = await pool.query("DELETE FROM blogs WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    res.json({ success: true, message: "Blog article deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting blog:", error);
    res.status(500).json({ success: false, message: "Failed to delete blog", error: error.message });
  }
};
