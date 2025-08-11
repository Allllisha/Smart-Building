import { Response, NextFunction } from 'express'
import { ProjectModel } from '../models/project.model'
import { AuthRequest } from '../middleware/auth.middleware'
import { AppError } from '../middleware/error.middleware'
import { z } from 'zod'

// バリデーションスキーマ
const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  location: z.object({
    address: z.string().optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  buildingInfo: z.object({
    usage: z.enum(['共同住宅', '専用住宅', '商業施設', 'オフィス', 'その他']),
    structure: z.enum(['鉄骨鉄筋コンクリート造', '鉄筋コンクリート造', '壁式鉄筋コンクリート造', '木造', 'その他']),
    floors: z.number().int().positive(),
    units: z.number().int().positive().optional(),
    totalFloorArea: z.number().positive().optional(),
    maxHeight: z.number().positive().nullable().optional(),
    buildingArea: z.number().min(0).nullable(),
    effectiveArea: z.number().min(0).nullable(),
    constructionArea: z.number().min(0).nullable(),
  }),
  siteInfo: z.object({
    siteArea: z.number().min(0).nullable(),
    frontRoadWidth: z.number().min(0).nullable(),
    zoningType: z.string().optional(),
    buildingCoverage: z.number().min(0).max(100).nullable().optional(),
    floorAreaRatio: z.number().min(0).max(1000).nullable().optional(),
    heightLimit: z.string().optional(),
    heightDistrict: z.string().optional(),
    otherRegulations: z.array(z.string()).optional(),
    administrativeGuidance: z.object({
      urbanPlanningAct: z.boolean(),
      administrativeGuidance: z.boolean(),
      greenOrdinance: z.boolean(),
      landscapePlan: z.boolean(),
      welfareEnvironment: z.boolean(),
      midHighRiseOrdinance: z.boolean(),
      embankmentRegulation: z.boolean(),
    }),
  }),
  schedule: z.object({
    startDate: z.string().transform((str) => str ? new Date(str) : null).optional(),
    completionDate: z.string().transform((str) => str ? new Date(str) : null).optional(),
    duration: z.number().optional(),
  }).optional(),
})

export class ProjectController {
  static async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projects = await ProjectModel.findAll(req.user!.id)
      
      // 各プロジェクトの関連データを取得
      const formattedProjects = await Promise.all(projects.map(async (p) => {
        const [unitTypes, floorAreaDetails, parkingPlan, shadowRegulation, administrativeGuidanceDetails] = await Promise.all([
          ProjectModel.findUnitTypes(p.id),
          ProjectModel.findFloorAreaDetails(p.id),
          ProjectModel.findParkingPlan(p.id),
          ProjectModel.findShadowRegulation(p.id),
          ProjectModel.findAdministrativeGuidanceDetails(p.id)
        ])

        return {
        id: p.id,
        name: p.name,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        location: {
          address: p.location_address || '',
          latitude: Number(p.location_latitude),
          longitude: Number(p.location_longitude),
        },
        buildingInfo: {
          usage: p.building_usage,
          structure: p.building_structure,
          floors: p.building_floors ? Number(p.building_floors) : 1,
          units: p.building_units ? Number(p.building_units) : undefined,
          totalFloorArea: p.building_total_floor_area ? Number(p.building_total_floor_area) : undefined,
          maxHeight: p.building_max_height ? Number(p.building_max_height) : 0,
          buildingArea: p.building_area ? Number(p.building_area) : null,
          effectiveArea: p.building_effective_area ? Number(p.building_effective_area) : null,
          constructionArea: p.building_construction_area ? Number(p.building_construction_area) : null,
          floorDetails: floorAreaDetails.map(f => ({
            floor: Number(f.floor_number),
            residentialArea: Number(f.residential_area),
            capacityArea: Number(f.capacity_area),
            nonCapacityArea: Number(f.non_capacity_area),
          })),
          unitTypes: unitTypes.map(u => ({
            typeName: u.type_name,
            exclusiveArea: Number(u.exclusive_area),
            mbArea: Number(u.mb_area),
            balconyArea: Number(u.balcony_area),
            units: Number(u.units),
            layoutType: u.layout_type,
          })),
        },
        siteInfo: {
          siteArea: p.site_area ? Number(p.site_area) : null,
          frontRoadWidth: p.front_road_width ? Number(p.front_road_width) : null,
          zoningType: p.site_zoning_type || '',
          buildingCoverage: p.site_building_coverage ? Number(p.site_building_coverage) : 0,
          floorAreaRatio: p.site_floor_area_ratio ? Number(p.site_floor_area_ratio) : 0,
          heightLimit: p.site_height_limit || '',
          heightDistrict: p.site_height_district || '',
          otherRegulations: p.site_other_regulations || [],
          administrativeGuidance: {
            urbanPlanningAct: p.admin_urban_planning_act,
            administrativeGuidance: p.admin_administrative_guidance,
            greenOrdinance: p.admin_green_ordinance,
            landscapePlan: p.admin_landscape_plan,
            welfareEnvironment: p.admin_welfare_environment,
            midHighRiseOrdinance: p.admin_mid_high_rise_ordinance,
            embankmentRegulation: p.admin_embankment_regulation,
          },
          shadowRegulation: shadowRegulation ? {
            targetArea: shadowRegulation.target_area || '',
            targetBuilding: shadowRegulation.target_building || '',
            measurementHeight: shadowRegulation.measurement_height ? Number(shadowRegulation.measurement_height) : 0,
            measurementTime: shadowRegulation.measurement_time || '',
            allowedShadowTime5to10m: shadowRegulation.allowed_shadow_time_5to10m ? Number(shadowRegulation.allowed_shadow_time_5to10m) : 0,
            allowedShadowTimeOver10m: shadowRegulation.allowed_shadow_time_over10m ? Number(shadowRegulation.allowed_shadow_time_over10m) : 0,
          } : null,
          administrativeGuidanceDetails: administrativeGuidanceDetails.map(g => ({
            id: g.guidance_id,
            name: g.name,
            description: g.description,
            isRequired: g.is_required,
            applicableConditions: g.applicable_conditions,
          })),
        },
        schedule: {
          startDate: p.construction_start_date,
          completionDate: p.construction_completion_date,
          duration: p.construction_duration,
        },
        parkingPlan: parkingPlan ? {
          parkingSpaces: Number(parkingPlan.parking_spaces),
          bicycleSpaces: Number(parkingPlan.bicycle_spaces),
          motorcycleSpaces: Number(parkingPlan.motorcycle_spaces),
          greenArea: Number(parkingPlan.green_area),
        } : null,
        }
      }))

      res.json({
        success: true,
        data: formattedProjects,
      })
    } catch (error) {
      next(error)
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const project = await ProjectModel.findById(id, req.user!.id)

      if (!project) {
        throw new AppError(404, 'Project not found')
      }

      // 関連データを取得
      const [unitTypes, floorAreaDetails, parkingPlan, shadowRegulation, administrativeGuidanceDetails] = await Promise.all([
        ProjectModel.findUnitTypes(id),
        ProjectModel.findFloorAreaDetails(id),
        ProjectModel.findParkingPlan(id),
        ProjectModel.findShadowRegulation(id),
        ProjectModel.findAdministrativeGuidanceDetails(id)
      ])

      // DB形式からAPI形式に変換
      console.log('Raw project data from DB:', {
        floors: project.building_floors,
        maxHeight: project.building_max_height,
        buildingArea: project.building_area,
        siteArea: project.site_area
      })
      
      const formattedProject = {
        id: project.id,
        name: project.name,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        location: {
          address: project.location_address || '',
          latitude: Number(project.location_latitude),
          longitude: Number(project.location_longitude),
        },
        buildingInfo: {
          usage: project.building_usage,
          structure: project.building_structure,
          floors: project.building_floors ? Number(project.building_floors) : 1,
          units: project.building_units ? Number(project.building_units) : undefined,
          totalFloorArea: project.building_total_floor_area ? Number(project.building_total_floor_area) : undefined,
          maxHeight: project.building_max_height ? Number(project.building_max_height) : 0,
          buildingArea: project.building_area ? Number(project.building_area) : null,  
          effectiveArea: project.building_effective_area ? Number(project.building_effective_area) : null,
          constructionArea: project.building_construction_area ? Number(project.building_construction_area) : null,
          floorDetails: floorAreaDetails.map(f => ({
            floor: Number(f.floor_number),
            residentialArea: Number(f.residential_area),
            capacityArea: Number(f.capacity_area),
            nonCapacityArea: Number(f.non_capacity_area),
          })),
          unitTypes: unitTypes.map(u => ({
            typeName: u.type_name,
            exclusiveArea: Number(u.exclusive_area),
            mbArea: Number(u.mb_area),
            balconyArea: Number(u.balcony_area),
            units: Number(u.units),
            layoutType: u.layout_type,
          })),
        },
        siteInfo: {
          siteArea: project.site_area ? Number(project.site_area) : null,
          frontRoadWidth: project.front_road_width ? Number(project.front_road_width) : null,
          zoningType: project.site_zoning_type || '',
          buildingCoverage: project.site_building_coverage ? Number(project.site_building_coverage) : 0,
          floorAreaRatio: project.site_floor_area_ratio ? Number(project.site_floor_area_ratio) : 0,
          heightLimit: project.site_height_limit || '',
          heightDistrict: project.site_height_district || '',
          otherRegulations: project.site_other_regulations || [],
          administrativeGuidance: {
            urbanPlanningAct: project.admin_urban_planning_act,
            administrativeGuidance: project.admin_administrative_guidance,
            greenOrdinance: project.admin_green_ordinance,
            landscapePlan: project.admin_landscape_plan,
            welfareEnvironment: project.admin_welfare_environment,
            midHighRiseOrdinance: project.admin_mid_high_rise_ordinance,
            embankmentRegulation: project.admin_embankment_regulation,
          },
          shadowRegulation: shadowRegulation ? {
            targetArea: shadowRegulation.target_area || '',
            targetBuilding: shadowRegulation.target_building || '',
            measurementHeight: shadowRegulation.measurement_height ? Number(shadowRegulation.measurement_height) : 0,
            measurementTime: shadowRegulation.measurement_time || '',
            allowedShadowTime5to10m: shadowRegulation.allowed_shadow_time_5to10m ? Number(shadowRegulation.allowed_shadow_time_5to10m) : 0,
            allowedShadowTimeOver10m: shadowRegulation.allowed_shadow_time_over10m ? Number(shadowRegulation.allowed_shadow_time_over10m) : 0,
          } : null,
          administrativeGuidanceDetails: administrativeGuidanceDetails.map(g => ({
            id: g.guidance_id,
            name: g.name,
            description: g.description,
            isRequired: g.is_required,
            applicableConditions: g.applicable_conditions,
          })),
        },
        schedule: {
          startDate: project.construction_start_date,
          completionDate: project.construction_completion_date,
          duration: project.construction_duration,
        },
        parkingPlan: parkingPlan ? {
          parkingSpaces: Number(parkingPlan.parking_spaces),
          bicycleSpaces: Number(parkingPlan.bicycle_spaces),
          motorcycleSpaces: Number(parkingPlan.motorcycle_spaces),
          greenArea: Number(parkingPlan.green_area),
        } : null,
      }

      res.json({
        success: true,
        data: formattedProject,
      })
    } catch (error) {
      next(error)
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validatedData = createProjectSchema.parse(req.body)

      // API形式からDB形式に変換
      const projectData = {
        name: validatedData.name,
        user_id: req.user!.id,
        location_address: validatedData.location?.address || null,
        location_latitude: validatedData.location?.latitude || null,
        location_longitude: validatedData.location?.longitude || null,
        building_usage: validatedData.buildingInfo.usage,
        building_structure: validatedData.buildingInfo.structure,
        building_floors: validatedData.buildingInfo.floors,
        building_units: validatedData.buildingInfo.units || null,
        building_total_floor_area: validatedData.buildingInfo.totalFloorArea || null,
        building_max_height: validatedData.buildingInfo.maxHeight || null,
        building_area: validatedData.buildingInfo.buildingArea ?? undefined,
        building_effective_area: validatedData.buildingInfo.effectiveArea ?? undefined,
        building_construction_area: validatedData.buildingInfo.constructionArea ?? undefined,
        site_area: validatedData.siteInfo.siteArea,
        front_road_width: validatedData.siteInfo.frontRoadWidth,
        site_zoning_type: validatedData.siteInfo.zoningType || null,
        site_building_coverage: validatedData.siteInfo.buildingCoverage || null,
        site_floor_area_ratio: validatedData.siteInfo.floorAreaRatio || null,
        site_height_limit: validatedData.siteInfo.heightLimit || null,
        site_height_district: validatedData.siteInfo.heightDistrict || null,
        site_other_regulations: validatedData.siteInfo.otherRegulations || null,
        admin_urban_planning_act: validatedData.siteInfo.administrativeGuidance.urbanPlanningAct,
        admin_administrative_guidance: validatedData.siteInfo.administrativeGuidance.administrativeGuidance,
        admin_green_ordinance: validatedData.siteInfo.administrativeGuidance.greenOrdinance,
        admin_landscape_plan: validatedData.siteInfo.administrativeGuidance.landscapePlan,
        admin_welfare_environment: validatedData.siteInfo.administrativeGuidance.welfareEnvironment,
        admin_mid_high_rise_ordinance: validatedData.siteInfo.administrativeGuidance.midHighRiseOrdinance,
        admin_embankment_regulation: validatedData.siteInfo.administrativeGuidance.embankmentRegulation,
        construction_start_date: validatedData.schedule?.startDate || null,
        construction_completion_date: validatedData.schedule?.completionDate || null,
        construction_duration: validatedData.schedule?.duration || null,
      }

      const project = await ProjectModel.create(projectData)

      res.status(201).json({
        success: true,
        data: {
          id: project.id,
          name: project.name,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
        },
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, 'Invalid request data'))
      }
      next(error)
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const updates = req.body

      // 更新用のDB形式データを構築
      const dbUpdates: any = {}
      
      if (updates.name) dbUpdates.name = updates.name
      if (updates.updatedAt) {
        // updatedAtが送られた場合は、データベースのupdated_atカラムは自動で更新されるので、
        // ここでは何もしない（ただし、リクエストを有効として処理する）
      }
      if (updates.location) {
        if (updates.location.address !== undefined) dbUpdates.location_address = updates.location.address
        if (updates.location.latitude !== undefined) dbUpdates.location_latitude = updates.location.latitude
        if (updates.location.longitude !== undefined) dbUpdates.location_longitude = updates.location.longitude
      }
      
      if (updates.buildingInfo) {
        const b = updates.buildingInfo
        if (b.usage) dbUpdates.building_usage = b.usage
        if (b.structure) dbUpdates.building_structure = b.structure
        if (b.floors !== undefined) dbUpdates.building_floors = b.floors
        if (b.units !== undefined) dbUpdates.building_units = b.units
        if (b.totalFloorArea !== undefined) dbUpdates.building_total_floor_area = b.totalFloorArea
        if (b.maxHeight !== undefined) dbUpdates.building_max_height = b.maxHeight
        if (b.buildingArea !== undefined) dbUpdates.building_area = b.buildingArea
        if (b.effectiveArea !== undefined) dbUpdates.building_effective_area = b.effectiveArea
        if (b.constructionArea !== undefined) dbUpdates.building_construction_area = b.constructionArea
      }

      if (updates.siteInfo) {
        const s = updates.siteInfo
        if (s.siteArea !== undefined) dbUpdates.site_area = s.siteArea
        if (s.frontRoadWidth !== undefined) dbUpdates.front_road_width = s.frontRoadWidth
        if (s.zoningType !== undefined) dbUpdates.site_zoning_type = s.zoningType
        if (s.buildingCoverage !== undefined) dbUpdates.site_building_coverage = s.buildingCoverage
        if (s.floorAreaRatio !== undefined) dbUpdates.site_floor_area_ratio = s.floorAreaRatio
        if (s.heightLimit !== undefined) dbUpdates.site_height_limit = s.heightLimit
        if (s.heightDistrict !== undefined) dbUpdates.site_height_district = s.heightDistrict
        if (s.otherRegulations !== undefined) dbUpdates.site_other_regulations = s.otherRegulations
        
        if (s.administrativeGuidance) {
          const a = s.administrativeGuidance
          if (a.urbanPlanningAct !== undefined) dbUpdates.admin_urban_planning_act = a.urbanPlanningAct
          if (a.administrativeGuidance !== undefined) dbUpdates.admin_administrative_guidance = a.administrativeGuidance
          if (a.greenOrdinance !== undefined) dbUpdates.admin_green_ordinance = a.greenOrdinance
          if (a.landscapePlan !== undefined) dbUpdates.admin_landscape_plan = a.landscapePlan
          if (a.welfareEnvironment !== undefined) dbUpdates.admin_welfare_environment = a.welfareEnvironment
          if (a.midHighRiseOrdinance !== undefined) dbUpdates.admin_mid_high_rise_ordinance = a.midHighRiseOrdinance
          if (a.embankmentRegulation !== undefined) dbUpdates.admin_embankment_regulation = a.embankmentRegulation
        }
      }

      if (updates.schedule) {
        const s = updates.schedule
        if (s.startDate !== undefined) dbUpdates.construction_start_date = s.startDate
        if (s.completionDate !== undefined) dbUpdates.construction_completion_date = s.completionDate
        if (s.duration !== undefined) dbUpdates.construction_duration = s.duration
      }

      const updatedProject = await ProjectModel.update(id, req.user!.id, dbUpdates)

      if (!updatedProject) {
        throw new AppError(404, 'Project not found')
      }

      // 日影規制データの保存
      if (updates.siteInfo?.shadowRegulation) {
        const shadowData = updates.siteInfo.shadowRegulation
        await ProjectModel.saveShadowRegulation(id, {
          target_area: shadowData.targetArea,
          target_building: shadowData.targetBuilding,
          measurement_height: shadowData.measurementHeight,
          measurement_time: shadowData.measurementTime,
          allowed_shadow_time_5to10m: shadowData.allowedShadowTime5to10m,
          allowed_shadow_time_over10m: shadowData.allowedShadowTimeOver10m,
        })
      }

      // 行政指導詳細データの保存
      if (updates.siteInfo?.administrativeGuidanceDetails) {
        const guidanceList = updates.siteInfo.administrativeGuidanceDetails.map((g: any) => ({
          guidance_id: g.id,
          name: g.name,
          description: g.description,
          is_required: g.isRequired,
          applicable_conditions: g.applicableConditions,
        }))
        await ProjectModel.saveAdministrativeGuidanceDetails(id, guidanceList)
      }

      res.json({
        success: true,
        data: {
          id: updatedProject.id,
          name: updatedProject.name,
          updatedAt: updatedProject.updated_at,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const deleted = await ProjectModel.delete(id, req.user!.id)

      if (!deleted) {
        throw new AppError(404, 'Project not found')
      }

      res.json({
        success: true,
        message: 'Project deleted successfully',
      })
    } catch (error) {
      next(error)
    }
  }
}