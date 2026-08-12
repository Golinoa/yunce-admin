-- AlterTable
ALTER TABLE `Feedback`
  ADD COLUMN `handleStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `handleRemark` VARCHAR(191) NULL,
  ADD COLUMN `handledAt` DATETIME(3) NULL,
  ADD COLUMN `handledByAdminId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Feedback_handleStatus_idx` ON `Feedback`(`handleStatus`);

-- CreateIndex
CREATE INDEX `Feedback_handledByAdminId_idx` ON `Feedback`(`handledByAdminId`);

-- AddForeignKey
ALTER TABLE `Feedback`
  ADD CONSTRAINT `Feedback_handledByAdminId_fkey`
  FOREIGN KEY (`handledByAdminId`) REFERENCES `AdminUser`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
