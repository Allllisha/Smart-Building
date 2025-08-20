-- Add preview_image column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS preview_image TEXT;