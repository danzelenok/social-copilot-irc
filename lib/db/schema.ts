import { pgTable, uuid, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const platformTypeEnum = pgEnum('platform_type', ['telegram', 'instagram', 'framer', 'subsplash']);
export const postStatusEnum = pgEnum('post_status', ['draft', 'publishing', 'published', 'failed', 'scheduled', 'cancelled']);
export const postTargetStatusEnum = pgEnum('post_target_status', ['pending', 'processing', 'published', 'failed', 'scheduled', 'cancelled']);
export const mediaTypeEnum = pgEnum('media_type', ['photo', 'video']);
export const postTypeEnum = pgEnum('post_type', ['post', 'story']);

// Organizations Table
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkOrgId: text('clerk_org_id').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Branches Table
export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  timezone: text('timezone'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Accounts Table
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  branch_id: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  platform_type: platformTypeEnum('platform_type').notNull(),
  credentials_json: text('credentials_json').notNull(), // encrypted JSON string
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Posts Table
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  status: postStatusEnum('status').default('draft').notNull(),
  media_url: text('media_url'),
  media_type: mediaTypeEnum('media_type'),
  post_type: postTypeEnum('post_type').default('post').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Post Targets Table
export const postTargets = pgTable('post_targets', {
  id: uuid('id').primaryKey().defaultRandom(),
  post_id: uuid('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  account_id: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  status: postTargetStatusEnum('status').default('pending').notNull(),
  asset_url: text('asset_url'),
  address: text('address'),
  error_message: text('error_message'),
  published_at: timestamp('published_at'),
  event_at: timestamp('event_at'),
  schedule_id: uuid('schedule_id'),
  platform_message_id: text('platform_message_id'),
  hidden_from_calendar: boolean('hidden_from_calendar').default(false).notNull(),
  hidden_at: timestamp('hidden_at'),
});

// Branch Addresses Table
export const branchAddresses = pgTable('branch_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  branch_id: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  address_text: text('address_text').notNull(),
  is_default: boolean('is_default').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// AI Style Settings Table
export const aiStyleSettings = pgTable('ai_style_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  style_prompt: text('style_prompt'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type PostTarget = typeof postTargets.$inferSelect;
export type NewPostTarget = typeof postTargets.$inferInsert;
export type BranchAddress = typeof branchAddresses.$inferSelect;
export type NewBranchAddress = typeof branchAddresses.$inferInsert;
export type AiStyleSetting = typeof aiStyleSettings.$inferSelect;
export type NewAiStyleSetting = typeof aiStyleSettings.$inferInsert;


