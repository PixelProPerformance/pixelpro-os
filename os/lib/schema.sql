CREATE TABLE IF NOT EXISTS `brands` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#7c5cff' NOT NULL,
	`created_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_brands_owner` ON `brands` (`owner_id`);
CREATE TABLE IF NOT EXISTS `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`caption` text NOT NULL,
	`channels` text NOT NULL,
	`scheduled_at` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`feedback` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `idx_posts_owner_date` ON `posts` (`owner_id`,`scheduled_at`);
CREATE INDEX IF NOT EXISTS `idx_posts_brand` ON `posts` (`brand_id`);
CREATE TABLE IF NOT EXISTS `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`filename` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `idx_assets_brand` ON `assets` (`brand_id`);
CREATE TABLE IF NOT EXISTS `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`member_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `idx_comments_post` ON `comments` (`post_id`);
CREATE TABLE IF NOT EXISTS `designs` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`template_id` text NOT NULL,
	`slides` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `idx_designs_post` ON `designs` (`post_id`);
CREATE TABLE IF NOT EXISTS `ideas` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`title` text NOT NULL,
	`angle` text,
	`format` text DEFAULT 'carousel' NOT NULL,
	`status` text DEFAULT 'saved' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `idx_ideas_brand` ON `ideas` (`brand_id`);
CREATE TABLE IF NOT EXISTS `member_brands` (
	`member_id` text NOT NULL,
	`brand_id` text NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `idx_member_brands_member` ON `member_brands` (`member_id`);
CREATE INDEX IF NOT EXISTS `idx_member_brands_brand` ON `member_brands` (`brand_id`);
CREATE TABLE IF NOT EXISTS `members` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`name` text,
	`role` text NOT NULL,
	`created_at` integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `members_email_unique` ON `members` (`email`);
CREATE UNIQUE INDEX IF NOT EXISTS `members_user_id_unique` ON `members` (`user_id`);
CREATE TABLE IF NOT EXISTS `social_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`platform` text NOT NULL,
	`account_name` text,
	`state` text DEFAULT 'not_connected' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `idx_social_brand` ON `social_connections` (`brand_id`);
CREATE TABLE IF NOT EXISTS `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`name` text NOT NULL,
	`background` text,
	`foreground` text DEFAULT '#ffffff' NOT NULL,
	`accent` text DEFAULT '#6e5ae6' NOT NULL,
	`font_family` text DEFAULT 'Arial' NOT NULL,
	`logo_key` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `idx_templates_brand` ON `templates` (`brand_id`);