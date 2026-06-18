import { pgTable, uuid, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const platformTypeEnum = pgEnum('platform_type', ['telegram', 'instagram', 'framer', 'subsplash']);
export const postStatusEnum = pgEnum('post_status', ['draft', 'publishing', 'published', 'failed']);
export const postTargetStatusEnum = pgEnum('post_target_status', ['pending', 'processing', 'published', 'failed']);
export const mediaTypeEnum = pgEnum('media_type', ['photo', 'video']);

// Branches Table
export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
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
  event_at: timestamp('event_at').notNull(),
  status: postStatusEnum('status').default('draft').notNull(),
  media_url: text('media_url'),
  media_type: mediaTypeEnum('media_type'),
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
  error_message: text('error_message'),
  published_at: timestamp('published_at'),
});
export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type PostTarget = typeof postTargets.$inferSelect;
export type NewPostTarget = typeof postTargets.$inferInsert;
