-- Add project schedule columns
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS construction_start_date DATE,
  ADD COLUMN IF NOT EXISTS construction_completion_date DATE;