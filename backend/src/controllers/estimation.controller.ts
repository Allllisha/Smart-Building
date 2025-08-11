import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { AppError } from '../middleware/error.middleware'
import { ProjectModel } from '../models/project.model'
import { EstimationService } from '../services/estimation.service'
import { AIEstimationService } from '../services/ai-estimation.service'
import { query } from '../config/database'

export class EstimationController {
  static async calculate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params

      // プロジェクトの存在確認
      const project = await ProjectModel.findById(projectId, req.user!.id)
      if (!project) {
        throw new AppError(404, 'Project not found')
      }

      // Try AI estimation first, fallback to traditional if it fails
      let estimation
      let useAI = true
      
      try {
        // プロジェクトデータをAI用に整形
        const projectData = {
          buildingInfo: {
            usage: project.building_usage,
            structure: project.building_structure,
            floors: project.building_floors,
            units: project.building_units ? Number(project.building_units) : undefined,
            maxHeight: Number(project.building_max_height),
            buildingArea: Number(project.building_area ?? 100),
            totalFloorArea: Number(project.building_total_floor_area ?? (project.building_area ?? 100) * project.building_floors),
            effectiveArea: Number(project.building_effective_area ?? (project.building_area ?? 100) * project.building_floors * 0.85),
            constructionArea: Number(project.building_construction_area ?? (project.building_area ?? 100) * project.building_floors * 1.1),
          },
          siteInfo: {
            siteArea: Number(project.site_area || 200),
            frontRoadWidth: Number(project.front_road_width || 4.0),
            zoningType: project.site_zoning_type || '第一種住居地域',
            buildingCoverage: 60, // デフォルト値
            floorAreaRatio: 200, // デフォルト値
            heightLimit: '20m', // デフォルト値
            heightDistrict: project.site_height_district || '第二種高度地区',
          },
          location: {
            address: project.location_address || '未設定',
            latitude: Number(project.location_latitude),
            longitude: Number(project.location_longitude),
          },
          schedule: {
            startDate: project.construction_start_date,
            completionDate: project.construction_completion_date,
            duration: project.construction_start_date && project.construction_completion_date 
              ? Math.round(
                  (new Date(project.construction_completion_date).getTime() - 
                   new Date(project.construction_start_date).getTime()) / 
                  (1000 * 60 * 60 * 24 * 30)
                ) 
              : null
          }
        }
        
        const aiService = new AIEstimationService()
        estimation = await aiService.generateDetailedEstimation(projectData)
        
      } catch (aiError) {
        console.warn('AI estimation failed, falling back to traditional:', aiError)
        useAI = false
        estimation = await EstimationService.calculateEstimation(project)
      }
      
      // データベースに保存
      await EstimationService.saveEstimation(projectId, estimation)

      res.json({
        success: true,
        data: estimation,
        meta: {
          method: useAI ? 'ai' : 'traditional',
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      next(error)
    }
  }

  static async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params

      // プロジェクトの存在確認
      const project = await ProjectModel.findById(projectId, req.user!.id)
      if (!project) {
        throw new AppError(404, 'Project not found')
      }

      // 既存の見積もりを取得
      const result = await query(
        'SELECT * FROM estimations WHERE project_id = $1',
        [projectId]
      )

      if (result.rows.length === 0) {
        throw new AppError(404, 'Estimation not found')
      }

      const estimation = result.rows[0]

      // DB形式からAPI形式に変換
      const formattedEstimation = {
        totalCost: estimation.total_cost,
        breakdown: {
          foundation: estimation.cost_foundation,
          structure: estimation.cost_structure,
          exterior: estimation.cost_exterior,
          interior: estimation.cost_interior,
          electrical: estimation.cost_electrical,
          plumbing: estimation.cost_plumbing,
          hvac: estimation.cost_hvac,
          other: estimation.cost_other,
          temporary: estimation.cost_temporary,
          design: estimation.cost_design,
        },
        operationalCost: {
          annualEnergyCost: estimation.operational_annual_energy_cost,
          heatingCost: estimation.operational_heating_cost,
          coolingCost: estimation.operational_cooling_cost,
          solarPowerGeneration: estimation.operational_solar_power_generation,
          paybackPeriod: estimation.operational_payback_period,
        },
        environmentalPerformance: {
          annualSunlightHours: estimation.env_annual_sunlight_hours,
          energyEfficiencyRating: estimation.env_energy_efficiency_rating,
          co2Emissions: estimation.env_co2_emissions,
        },
        disasterRiskCost: {
          floodRisk: estimation.disaster_flood_risk,
          earthquakeRisk: estimation.disaster_earthquake_risk,
          landslideRisk: estimation.disaster_landslide_risk,
          recommendedMeasuresCost: estimation.disaster_recommended_measures_cost,
        },
        aiAnalysis: estimation.ai_analysis,
        createdAt: estimation.created_at,
        updatedAt: estimation.updated_at,
      }

      res.json({
        success: true,
        data: formattedEstimation,
      })
    } catch (error) {
      next(error)
    }
  }
}