import { Project, SiteInfo, BuildingInfo, ShadowRegulation, BuildingUsage } from '@/types/project'
import seedProjects from '@/data/seed-projects.json'
import { v4 as uuidv4 } from 'uuid'

export interface SeedProject {
  name: string
  location: {
    address: string
    latitude: number
    longitude: number
  }
  siteInfo: any
  buildingInfo: any
  parkingPlan?: any
  specialNotes?: string
}

// シードデータの変換関数
const convertSeedShadowRegulation = (seedRegulation: any): ShadowRegulation => {
  return {
    targetArea: seedRegulation.targetArea || '',
    targetBuilding: seedRegulation.targetBuilding || '',
    measurementHeight: seedRegulation.measurementHeight || 0,
    measurementTime: seedRegulation.measurementTime || '',
    allowedShadowTime5to10m: seedRegulation.allowedShadowTime5to10m || seedRegulation.range5to10m || 0,
    allowedShadowTimeOver10m: seedRegulation.allowedShadowTimeOver10m || seedRegulation.rangeOver10m || 0,
  }
}

const convertSeedSiteInfo = (seedSiteInfo: any): SiteInfo => {
  return {
    siteArea: seedSiteInfo.siteArea,
    frontRoadWidth: seedSiteInfo.frontRoadWidth ?? 4.0,
    zoningType: seedSiteInfo.zoningType,
    buildingCoverage: seedSiteInfo.buildingCoverage,
    floorAreaRatio: seedSiteInfo.floorAreaRatio,
    heightLimit: seedSiteInfo.heightLimit,
    heightDistrict: seedSiteInfo.heightDistrict,
    shadowRegulation: convertSeedShadowRegulation(seedSiteInfo.shadowRegulation || {}),
    otherRegulations: seedSiteInfo.otherRegulations || [],
    administrativeGuidance: seedSiteInfo.administrativeGuidance || '',
  }
}

const convertSeedBuildingInfo = (seedBuildingInfo: any): BuildingInfo => {
  return {
    usage: (seedBuildingInfo.usage as BuildingUsage) || ('residential' as BuildingUsage),
    structure: seedBuildingInfo.structure,
    floors: seedBuildingInfo.floors,
    units: seedBuildingInfo.units,
    totalFloorArea: seedBuildingInfo.totalFloorArea,
    maxHeight: seedBuildingInfo.maxHeight,
    buildingArea: seedBuildingInfo.buildingArea,
    effectiveArea: seedBuildingInfo.effectiveArea,
    constructionArea: seedBuildingInfo.constructionArea,
    floorDetails: seedBuildingInfo.floorDetails || [],
    unitTypes: seedBuildingInfo.unitTypes || [],
  }
}

export const loadSeedProjects = (): Project[] => {
  return seedProjects.projects.map((seedProject: SeedProject) => ({
    id: uuidv4(),
    name: seedProject.name,
    createdAt: new Date(),
    updatedAt: new Date(),
    location: seedProject.location,
    siteInfo: convertSeedSiteInfo(seedProject.siteInfo),
    buildingInfo: convertSeedBuildingInfo(seedProject.buildingInfo),
    parkingPlan: seedProject.parkingPlan,
    specialNotes: seedProject.specialNotes,
  }))
}

export const createProjectFromSeed = (seedName?: string): Partial<Project> => {
  const seedProject = seedProjects.projects.find(p => p.name === seedName) || seedProjects.projects[0]
  
  if (!seedProject) {
    throw new Error('No seed projects available')
  }

  return {
    name: `${seedProject.name} (コピー)`,
    location: { ...seedProject.location },
    siteInfo: convertSeedSiteInfo(seedProject.siteInfo),
    buildingInfo: convertSeedBuildingInfo(seedProject.buildingInfo),
    parkingPlan: seedProject.parkingPlan ? { ...seedProject.parkingPlan } : undefined,
    specialNotes: seedProject.specialNotes,
  }
}

// シードデータから新規プロジェクトを作成するヘルパー関数
export const createNewProjectFromSeed = (baseName: string = '新規プロジェクト'): Project => {
  const seedProject = seedProjects.projects[0] // 最初のシードデータを使用
  
  return {
    id: uuidv4(),
    name: baseName,
    createdAt: new Date(),
    updatedAt: new Date(),
    location: { ...seedProject.location },
    siteInfo: convertSeedSiteInfo(seedProject.siteInfo),
    buildingInfo: convertSeedBuildingInfo(seedProject.buildingInfo),
    parkingPlan: seedProject.parkingPlan ? { ...seedProject.parkingPlan } : undefined,
    specialNotes: seedProject.specialNotes,
  }
}