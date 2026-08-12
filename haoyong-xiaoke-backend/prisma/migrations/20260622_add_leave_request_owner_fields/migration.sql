-- Add owner fields for leave requests so upgraded environments receive the same schema as fresh installs
ALTER TABLE `LeaveRequest`
    ADD COLUMN `parentId` VARCHAR(191) NULL,
    ADD COLUMN `teacherId` VARCHAR(191) NULL;

-- Backfill teacher ownership from the linked student for historical rows
UPDATE `LeaveRequest` lr
INNER JOIN `Student` s ON s.`id` = lr.`studentId`
SET lr.`teacherId` = s.`teacherId`
WHERE lr.`teacherId` IS NULL;

CREATE INDEX `LeaveRequest_teacherId_status_idx` ON `LeaveRequest`(`teacherId`, `status`);
