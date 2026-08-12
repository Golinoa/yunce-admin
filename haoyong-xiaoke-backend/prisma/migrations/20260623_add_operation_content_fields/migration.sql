ALTER TABLE `Banner`
  ADD COLUMN `slotKey` VARCHAR(191) NOT NULL DEFAULT 'HOME_BANNER',
  ADD COLUMN `templateKey` VARCHAR(191) NOT NULL DEFAULT 'HOME_BANNER_IMAGE',
  ADD COLUMN `actionConfig` JSON NULL,
  ADD COLUMN `displayConfig` JSON NULL;

ALTER TABLE `Activity`
  ADD COLUMN `slotKey` VARCHAR(191) NOT NULL DEFAULT 'HOME_POPUP',
  ADD COLUMN `templateKey` VARCHAR(191) NOT NULL DEFAULT 'HOME_POPUP_SINGLE',
  ADD COLUMN `actionConfig` JSON NULL,
  ADD COLUMN `displayConfig` JSON NULL;

DROP INDEX `Banner_status_sortOrder_idx` ON `Banner`;
CREATE INDEX `Banner_status_slotKey_sortOrder_idx` ON `Banner`(`status`, `slotKey`, `sortOrder`);

DROP INDEX `Activity_status_sortOrder_idx` ON `Activity`;
CREATE INDEX `Activity_status_slotKey_sortOrder_idx` ON `Activity`(`status`, `slotKey`, `sortOrder`);
