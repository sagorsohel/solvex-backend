import { mysqlTable, int, varchar, text, decimal, mysqlEnum, timestamp, boolean, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 191 }).notNull(),
  email: varchar("email", { length: 191 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "editor", "viewer"]).default("admin").notNull(),
  avatar: varchar("avatar", { length: 500 }),
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 191 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).default("0.00").notNull(),
  stock: int("stock").default(0).notNull(),
  status: mysqlEnum("status", ["published", "draft", "archived"]).default("published").notNull(),
  description: text("description"),
  image: varchar("image", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const inquiries = mysqlTable("inquiries", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 191 }).notNull(),
  email: varchar("email", { length: 191 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  subject: varchar("subject", { length: 191 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["pending", "contacted", "resolved"]).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id"),
  userName: varchar("user_name", { length: 191 }),
  action: varchar("action", { length: 191 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Dedicated Board of Members Collection
export const boardMembers = mysqlTable("board_members", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 191 }).notNull(),
  designation: varchar("designation", { length: 191 }).notNull(),
  tag: varchar("tag", { length: 100 }),
  image: varchar("image", { length: 500 }),
  bio: text("bio"),
  displayInWebsite: boolean("display_in_website").default(true).notNull(),
  orderIndex: int("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Full About Page Customization Settings
export const aboutPageSettings = mysqlTable("about_page_settings", {
  id: int("id").primaryKey().autoincrement(),
  discoverSection: json("discover_section").$type<any>(),
  chairmanMessageSection: json("chairman_message_section").$type<any>(),
  boardOfDirectorsSection: json("board_of_directors_section").$type<any>(),
  ourStorySection: json("our_story_section").$type<any>(),
  directionPurposeSection: json("direction_purpose_section").$type<any>(),
  strategicPillarsSection: json("strategic_pillars_section").$type<any>(),
  peopleValuesSection: json("people_values_section").$type<any>(),
  efficiencyCertificatesSection: json("efficiency_certificates_section").$type<any>(),
  carbonFreeFutureSection: json("carbon_free_future_section").$type<any>(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Services Catalog with dynamic architecture cards
export const services = mysqlTable("services", {
  id: int("id").primaryKey().autoincrement(),
  slug: varchar("slug", { length: 191 }).notNull().unique(),
  title: varchar("title", { length: 191 }).notNull(),
  shortDescription: text("short_description"),
  tags: json("tags").$type<string[]>(),
  heroImage: varchar("hero_image", { length: 500 }),
  cards: json("cards").$type<Array<{
    id?: string;
    phase_tag?: string;
    title: string;
    description?: string;
    bullet_points?: string[];
    image?: string;
  }>>(),
  hardwareCard: json("hardware_card").$type<{
    title?: string;
    description?: string;
    button_text?: string;
    button_color?: string;
    card_color?: string;
  }>(),
  consultationCard: json("consultation_card").$type<{
    title?: string;
    description?: string;
    button_text?: string;
    button_color?: string;
    card_color?: string;
  }>(),
  faqs: json("faqs").$type<Array<{ question: string; answer: string }>>(),
  status: mysqlEnum("status", ["published", "draft"]).default("published").notNull(),
  orderIndex: int("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Services Page CMS (Hero section, section header)
export const servicesPageSettings = mysqlTable("services_page_settings", {
  id: int("id").primaryKey().autoincrement(),
  heroSmallTitle: varchar("hero_small_title", { length: 191 }),
  heroTitle: varchar("hero_title", { length: 191 }),
  heroTitleStyle: varchar("hero_title_style", { length: 191 }),
  heroDescription: text("hero_description"),
  highlights: json("highlights").$type<string[]>(),
  sectionTitle: varchar("section_title", { length: 191 }),
  sectionSubtitle: text("section_subtitle"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Project Categories
export const projectCategories = mysqlTable("project_categories", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 191 }).notNull(),
  status: boolean("status").default(true).notNull(),
  showInWebsite: boolean("show_in_website").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Projects / Portfolio Archive
export const projects = mysqlTable("projects", {
  id: int("id").primaryKey().autoincrement(),
  slug: varchar("slug", { length: 191 }).unique(),
  projectCategoryId: int("project_category_id"),
  label: varchar("label", { length: 191 }),
  bigTitle: varchar("big_title", { length: 255 }).notNull(),
  descriptionCards: json("description_cards").$type<Array<{ title: string; subtitle: string }>>(),
  detailsCard: json("details_card").$type<Array<{
    image?: string | null;
    label?: string | null;
    label_color?: string | null;
    title?: string | null;
    description_1?: string | null;
    description_2?: string | null;
    bullet_points?: Array<{ icon?: string | null; icon_color?: string | null; text: string }>;
    image_left?: boolean;
  }>>(),
  faqIcon: varchar("faq_icon", { length: 100 }),
  faqTitle: varchar("faq_title", { length: 191 }),
  faqDescription: text("faq_description"),
  faqQuestions: json("faq_questions").$type<Array<{ question: string; answer: string }>>(),
  status: mysqlEnum("status", ["published", "draft"]).default("published").notNull(),
  orderIndex: int("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Projects Archive Page Hero Header CMS
export const projectsPageSettings = mysqlTable("projects_page_settings", {
  id: int("id").primaryKey().autoincrement(),
  badge: varchar("badge", { length: 191 }),
  title: varchar("title", { length: 191 }),
  titleHighlight: varchar("title_highlight", { length: 191 }),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type BoardMember = typeof boardMembers.$inferSelect;
export type NewBoardMember = typeof boardMembers.$inferInsert;
export type AboutPageSetting = typeof aboutPageSettings.$inferSelect;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type ServicesPageSetting = typeof servicesPageSettings.$inferSelect;
export type ProjectCategory = typeof projectCategories.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectsPageSetting = typeof projectsPageSettings.$inferSelect;

// 1. Sister Concerns (Subsidiaries / Divisions)
export const sisterConcerns = mysqlTable("sister_concerns", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 191 }).notNull(),
  code: varchar("50", { length: 50 }),
  description: text("description"),
  logo: varchar("logo", { length: 500 }),
  website: varchar("website", { length: 255 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  orderIndex: int("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// 2. Product Categories (Linked to Sister Concern)
export const productCategories = mysqlTable("product_categories", {
  id: int("id").primaryKey().autoincrement(),
  sisterConcernId: int("sister_concern_id").notNull(),
  name: varchar("name", { length: 191 }).notNull(),
  slug: varchar("slug", { length: 191 }),
  description: text("description"),
  image: varchar("image", { length: 500 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  orderIndex: int("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// 3. Product Sub Categories (Linked to Product Category)
export const productSubCategories = mysqlTable("product_sub_categories", {
  id: int("id").primaryKey().autoincrement(),
  productCategoryId: int("product_category_id").notNull(),
  name: varchar("name", { length: 191 }).notNull(),
  slug: varchar("slug", { length: 191 }),
  description: text("description"),
  image: varchar("image", { length: 500 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  orderIndex: int("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// 4. Product Tree Categories (Level-3 granular categories linked to Sub Category)
export const productTreeCategories = mysqlTable("product_tree_categories", {
  id: int("id").primaryKey().autoincrement(),
  productSubCategoryId: int("product_sub_category_id").notNull(),
  name: varchar("name", { length: 191 }).notNull(),
  slug: varchar("slug", { length: 191 }),
  description: text("description"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  orderIndex: int("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// 5. Product Brands (Individual entity)
export const productBrands = mysqlTable("product_brands", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 191 }).notNull(),
  slug: varchar("slug", { length: 191 }),
  logo: varchar("logo", { length: 500 }),
  originCountry: varchar("origin_country", { length: 100 }),
  website: varchar("website", { length: 255 }),
  description: text("description"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  orderIndex: int("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// 6. Product Models (Linked to Brand)
export const productModels = mysqlTable("product_models", {
  id: int("id").primaryKey().autoincrement(),
  brandId: int("brand_id").notNull(),
  name: varchar("name", { length: 191 }).notNull(),
  modelNumber: varchar("model_number", { length: 191 }),
  specifications: text("specifications"),
  description: text("description"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  orderIndex: int("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SisterConcern = typeof sisterConcerns.$inferSelect;
export type NewSisterConcern = typeof sisterConcerns.$inferInsert;

export type ProductCategory = typeof productCategories.$inferSelect;
export type NewProductCategory = typeof productCategories.$inferInsert;

export type ProductSubCategory = typeof productSubCategories.$inferSelect;
export type NewProductSubCategory = typeof productSubCategories.$inferInsert;

export type ProductTreeCategory = typeof productTreeCategories.$inferSelect;
export type NewProductTreeCategory = typeof productTreeCategories.$inferInsert;

export type ProductBrand = typeof productBrands.$inferSelect;
export type NewProductBrand = typeof productBrands.$inferInsert;

export type ProductModel = typeof productModels.$inferSelect;
export type NewProductModel = typeof productModels.$inferInsert;


