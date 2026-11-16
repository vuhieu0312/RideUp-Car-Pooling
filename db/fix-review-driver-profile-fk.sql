-- Align review.driver_id with Review.driver -> DriverProfile.
-- Safe to run when the current foreign key points to either app_user or driver_profile.
SET @review_driver_fk = (
    SELECT constraint_name
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
      AND table_name = 'review'
      AND column_name = 'driver_id'
      AND referenced_table_name = 'app_user'
    LIMIT 1
);

SET @review_driver_ref = (
    SELECT referenced_table_name
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
      AND table_name = 'review'
      AND column_name = 'driver_id'
      AND referenced_table_name = 'app_user'
    LIMIT 1
);

SET @drop_review_driver_fk = IF(
    @review_driver_ref = 'app_user',
    CONCAT('ALTER TABLE review DROP FOREIGN KEY `', REPLACE(@review_driver_fk, '`', '``'), '`'),
    'SELECT 1'
);
PREPARE drop_review_driver_fk_stmt FROM @drop_review_driver_fk;
EXECUTE drop_review_driver_fk_stmt;
DEALLOCATE PREPARE drop_review_driver_fk_stmt;

SET @convert_review_driver_ids = IF(
    @review_driver_ref = 'app_user',
    'UPDATE review r JOIN driver_profile dp ON dp.user_id = r.driver_id SET r.driver_id = dp.id',
    'SELECT 1'
);
PREPARE convert_review_driver_ids_stmt FROM @convert_review_driver_ids;
EXECUTE convert_review_driver_ids_stmt;
DEALLOCATE PREPARE convert_review_driver_ids_stmt;

SET @profile_driver_fk_exists = (
    SELECT COUNT(*)
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
      AND table_name = 'review'
      AND column_name = 'driver_id'
      AND referenced_table_name = 'driver_profile'
);

SET @add_review_driver_fk = IF(
    @profile_driver_fk_exists = 0,
    'ALTER TABLE review ADD CONSTRAINT fk_review_driver_profile FOREIGN KEY (driver_id) REFERENCES driver_profile(id)',
    'SELECT 1'
);
PREPARE add_review_driver_fk_stmt FROM @add_review_driver_fk;
EXECUTE add_review_driver_fk_stmt;
DEALLOCATE PREPARE add_review_driver_fk_stmt;
