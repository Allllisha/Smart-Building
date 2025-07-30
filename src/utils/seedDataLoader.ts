import { Project } from '@/types/project'
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

export const loadSeedProjects = (): Project[] => {
  return seedProjects.projects.map((seedProject: SeedProject) => ({
    id: uuidv4(),
    name: seedProject.name,
    createdAt: new Date(),
    updatedAt: new Date(),
    location: seedProject.location,
    siteInfo: seedProject.siteInfo,
    buildingInfo: seedProject.buildingInfo,
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
    siteInfo: { ...seedProject.siteInfo },
    buildingInfo: { ...seedProject.buildingInfo },
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
    siteInfo: { ...seedProject.siteInfo },
    buildingInfo: { ...seedProject.buildingInfo },
    parkingPlan: seedProject.parkingPlan ? { ...seedProject.parkingPlan } : undefined,
    specialNotes: seedProject.specialNotes,
  }
}