import { query } from '../config/database'

export interface ProjectDB {
  id: string
  name: string
  user_id: string
  created_at: Date
  updated_at: Date
  location_address: string | null
  location_latitude: number | null
  location_longitude: number | null
  location_polygon: any
  building_usage: string
  building_structure: string
  building_floors: number
  building_units: number | null
  building_total_floor_area: number | null
  building_max_height: number | null
  building_area: number | null
  building_effective_area: number | null
  building_construction_area: number | null
  site_area: number | null
  front_road_width: number | null
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
  construction_duration: number | null
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

export interface ShadowRegulationDB {
  id: string
  project_id: string
  target_area: string | null
  target_building: string | null
  measurement_height: number | null
  measurement_time: string | null
  allowed_shadow_time_5to10m: number | null
  allowed_shadow_time_over10m: number | null
  created_at: Date
}

export interface AdministrativeGuidanceDetailDB {
  id: string
  project_id: string
  guidance_id: string
  name: string
  description: string | null
  is_required: boolean
  applicable_conditions: string | null
  created_at: Date
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

  static async findShadowRegulation(projectId: string): Promise<ShadowRegulationDB | null> {
    const result = await query(
      'SELECT * FROM shadow_regulations WHERE project_id = $1',
      [projectId]
    )
    return result.rows[0] || null
  }

  static async findAdministrativeGuidanceDetails(projectId: string): Promise<AdministrativeGuidanceDetailDB[]> {
    const result = await query(
      'SELECT * FROM administrative_guidance_details WHERE project_id = $1 ORDER BY created_at',
      [projectId]
    )
    return result.rows
  }

  static async saveShadowRegulation(projectId: string, data: Partial<ShadowRegulationDB>): Promise<ShadowRegulationDB> {
    const existing = await this.findShadowRegulation(projectId)
    
    if (existing) {
      // 更新
      const result = await query(`
        UPDATE shadow_regulations 
        SET target_area = $2, target_building = $3, measurement_height = $4,
            measurement_time = $5, allowed_shadow_time_5to10m = $6, allowed_shadow_time_over10m = $7
        WHERE project_id = $1
        RETURNING *
      `, [
        projectId,
        data.target_area,
        data.target_building,
        data.measurement_height,
        data.measurement_time,
        data.allowed_shadow_time_5to10m,
        data.allowed_shadow_time_over10m
      ])
      return result.rows[0]
    } else {
      // 新規作成
      const result = await query(`
        INSERT INTO shadow_regulations 
        (project_id, target_area, target_building, measurement_height, measurement_time, 
         allowed_shadow_time_5to10m, allowed_shadow_time_over10m)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        projectId,
        data.target_area,
        data.target_building,
        data.measurement_height,
        data.measurement_time,
        data.allowed_shadow_time_5to10m,
        data.allowed_shadow_time_over10m
      ])
      return result.rows[0]
    }
  }

  static async saveAdministrativeGuidanceDetails(
    projectId: string, 
    guidanceList: Array<{
      guidance_id: string
      name: string
      description?: string
      is_required?: boolean
      applicable_conditions?: string
    }>
  ): Promise<void> {
    // 既存のデータを削除
    await query('DELETE FROM administrative_guidance_details WHERE project_id = $1', [projectId])
    
    // 新しいデータを挿入
    for (const guidance of guidanceList) {
      await query(`
        INSERT INTO administrative_guidance_details 
        (project_id, guidance_id, name, description, is_required, applicable_conditions)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        projectId,
        guidance.guidance_id,
        guidance.name,
        guidance.description || null,
        guidance.is_required || false,
        guidance.applicable_conditions || null
      ])
    }
  }

  static async findById(id: string, userId: string): Promise<ProjectDB | null> {
    const result = await query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    return result.rows[0] || null
  }

  static async create(project: Partial<ProjectDB>): Promise<ProjectDB> {
    const result = await query(`
      INSERT INTO projects (
        user_id, name, location_address, location_latitude, location_longitude,
        building_usage, building_structure, building_floors, building_units,
        building_total_floor_area, building_max_height, building_area,
        building_effective_area, building_construction_area, site_area,
        front_road_width, site_zoning_type, site_building_coverage, 
        site_floor_area_ratio, site_height_limit, site_height_district,
        site_other_regulations, admin_urban_planning_act, admin_administrative_guidance,
        admin_green_ordinance, admin_landscape_plan, admin_welfare_environment,
        admin_mid_high_rise_ordinance, admin_embankment_regulation,
        construction_start_date, construction_completion_date, construction_duration,
        special_notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
      ) RETURNING *
    `, [
      project.user_id,
      project.name,
      project.location_address || null,
      project.location_latitude || null,
      project.location_longitude || null,
      project.building_usage || null,
      project.building_structure || null,
      project.building_floors || null,
      project.building_units || null,
      project.building_total_floor_area || null,
      project.building_max_height || null,
      project.building_area || null,
      project.building_effective_area || null,
      project.building_construction_area || null,
      project.site_area || null,
      project.front_road_width || null,
      project.site_zoning_type || null,
      project.site_building_coverage || null,
      project.site_floor_area_ratio || null,
      project.site_height_limit || null,
      project.site_height_district || null,
      project.site_other_regulations || null,
      project.admin_urban_planning_act || false,
      project.admin_administrative_guidance || false,
      project.admin_green_ordinance || false,
      project.admin_landscape_plan || false,
      project.admin_welfare_environment || false,
      project.admin_mid_high_rise_ordinance || false,
      project.admin_embankment_regulation || false,
      project.construction_start_date || null,
      project.construction_completion_date || null,
      project.construction_duration || null,
      project.special_notes || null
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