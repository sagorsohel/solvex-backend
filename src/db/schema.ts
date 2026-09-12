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

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type BoardMember = typeof boardMembers.$inferSelect;
export type NewBoardMember = typeof boardMembers.$inferInsert;
export type AboutPageSetting = typeof aboutPageSettings.$inferSelect;
