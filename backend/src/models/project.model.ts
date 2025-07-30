import { query } from '../config/database'

export interface ProjectDB {
  id: string
  name: string
  user_id: string
  created_at: Date
  updated_at: Date
  location_address: string | null
  location_latitude: number
  location_longitude: number
  location_polygon: any
  building_usage: string
  building_structure: string
  building_floors: number
  building_units: number | null
  building_total_floor_area: number | null
  building_max_height: number | null
  building_foundation_height: number | null
  building_area: number | null
  building_effective_area: number | null
  building_construction_area: number | null
  site_land_type: string | null
  site_area: number | null
  site_effective_area: number | null
  site_zoning_type: string | null
  site_building_coverage: number | null
  site_floor_area_ratio: number | null
  site_height_limit: string | null
  site_height_district: string | null
  site_other_regulations: string[] | null
  admin_urban_planning_act: boolean
  admin_administrative_guidance: boolean
  admin_green_ordinance: boolean
  admin_landscape_plan: boolean
  admin_welfare_environment: boolean
  admin_mid_high_rise_ordinance: boolean
  admin_embankment_regulation: boolean
  construction_start_date: Date | null
  construction_completion_date: Date | null
  special_notes: string | null
}

export interface UnitTypeDB {
  id: string
  project_id: string
  type_name: string
  exclusive_area: number
  mb_area: number
  balcony_area: number
  units: number
  layout_type: string
}

export interface FloorAreaDetailDB {
  id: string
  project_id: string
  floor_number: number
  residential_area: number
  capacity_area: number
  non_capacity_area: number
}

export interface ParkingPlanDB {
  id: string
  project_id: string
  parking_spaces: number
  bicycle_spaces: number
  motorcycle_spaces: number
  green_area: number
}

export class ProjectModel {
  static async findAll(userId: string): Promise<ProjectDB[]> {
    const result = await query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )
    return result.rows
  }

  static async findUnitTypes(projectId: string): Promise<UnitTypeDB[]> {
    const result = await query(
      'SELECT * FROM unit_types WHERE project_id = $1 ORDER BY type_name',
      [projectId]
    )
    return result.rows
  }

  static async findFloorAreaDetails(projectId: string): Promise<FloorAreaDetailDB[]> {
    const result = await query(
      'SELECT * FROM floor_area_details WHERE project_id = $1 ORDER BY floor_number',
      [projectId]
    )
    return result.rows
  }

  static async findParkingPlan(projectId: string): Promise<ParkingPlanDB | null> {
    const result = await query(
      'SELECT * FROM parking_plans WHERE project_id = $1',
      [projectId]
    )
    return result.rows[0] || null
  }

  static async findById(id: string, userId: string): Promise<ProjectDB | null> {
    const result = await query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    return result.rows[0] || null
  }

  static async create(project: Partial<ProjectDB>): Promise<ProjectDB> {
    const {
      name, user_id, location_address, location_latitude, location_longitude,
      building_usage, building_structure, building_floors, building_units,
      building_total_floor_area, building_max_height, building_foundation_height,
      building_area, building_effective_area, building_construction_area,
      site_land_type, site_area, site_effective_area, site_zoning_type,
      site_height_district, site_other_regulations,
      admin_urban_planning_act, admin_administrative_guidance, admin_green_ordinance,
      admin_landscape_plan, admin_welfare_environment, admin_mid_high_rise_ordinance,
      admin_embankment_regulation, special_notes
    } = project

    const result = await query(`
      INSERT INTO projects (
        name, user_id, location_address, location_latitude, location_longitude,
        building_usage, building_structure, building_floors, building_units,
        building_total_floor_area, building_max_height, building_foundation_height,
        building_area, building_effective_area, building_construction_area,
        site_land_type, site_area, site_effective_area, site_zoning_type,
        site_height_district, site_other_regulations,
        admin_urban_planning_act, admin_administrative_guidance, admin_green_ordinance,
        admin_landscape_plan, admin_welfare_environment, admin_mid_high_rise_ordinance,
        admin_embankment_regulation, special_notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
      ) RETURNING *
    `, [
      name, user_id, location_address, location_latitude, location_longitude,
      building_usage, building_structure, building_floors, building_units,
      building_total_floor_area, building_max_height, building_foundation_height,
      building_area, building_effective_area, building_construction_area,
      site_land_type, site_area, site_effective_area, site_zoning_type,
      site_height_district, site_other_regulations,
      admin_urban_planning_act, admin_administrative_guidance, admin_green_ordinance,
      admin_landscape_plan, admin_welfare_environment, admin_mid_high_rise_ordinance,
      admin_embankment_regulation, special_notes
    ])

    return result.rows[0]
  }

  static async update(id: string, userId: string, updates: Partial<ProjectDB>): Promise<ProjectDB | null> {
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 1

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'user_id' && key !== 'created_at') {
        fields.push(`${key} = $${paramCount}`)
        values.push(value)
        paramCount++
      }
    })

    if (fields.length === 0) {
      // フィールドが空の場合でも、updated_atを更新する
      const result = await query(
        `UPDATE projects SET updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, userId]
      )
      return result.rows[0] || null
    }

    values.push(id, userId)
    const result = await query(
      `UPDATE projects SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`,
      values
    )

    return result.rows[0] || null
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    return (result.rowCount || 0) > 0
  }
}