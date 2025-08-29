-- Add domain column to tenants table
-- This column will store comma-separated domain values like "xyz.com,abc.com"
ALTER TABLE tenants 
ADD COLUMN domain TEXT;
