-- Align default emoji values with schema.prisma so fresh databases do not keep mojibake defaults
ALTER TABLE `Campus`
    MODIFY COLUMN `icon` VARCHAR(191) NOT NULL DEFAULT '🏫';

ALTER TABLE `Subject`
    MODIFY COLUMN `icon` VARCHAR(191) NOT NULL DEFAULT '📚';

ALTER TABLE `Holiday`
    MODIFY COLUMN `icon` VARCHAR(191) NOT NULL DEFAULT '🎉';
