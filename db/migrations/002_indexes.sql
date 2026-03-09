CREATE INDEX IF NOT EXISTS idx_users_tenant_active ON users(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_bookings_object_time ON bookings(booking_object_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_user_time ON bookings(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_blocks_object_time ON booking_blocks(booking_object_id, start_time);
CREATE INDEX IF NOT EXISTS idx_rfid_tags_tenant_uid ON rfid_tags(tenant_id, uid);
CREATE INDEX IF NOT EXISTS idx_booking_object_permissions ON booking_object_permissions(booking_object_id, mode, scope);
