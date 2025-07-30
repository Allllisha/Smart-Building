import { create } from 'zustand'
import { Project } from '@/types/project'
import { projectApi } from '@/api/projectApi'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  updateProjectAsync: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  setProjects: (projects) => set({ projects }),
  
  setCurrentProject: (project) => set({ currentProject: project }),
  
  addProject: (project) => set((state) => ({
    projects: [...state.projects, project],
    currentProject: project,
  })),
  
  updateProject: (id, updates) => set((state) => {
    // Deep merge function for nested objects
    const deepMerge = (target: any, source: any): any => {
      const output = { ...target }
      for (const key in source) {
        if (source[key] instanceof Array) {
          // For arrays, replace entirely
          output[key] = [...source[key]]
        } else if (source[key] instanceof Object && key in target && !(source[key] instanceof Date)) {
          // For objects (not Date), merge recursively
          output[key] = deepMerge(target[key], source[key])
        } else {
          // For primitives and Date objects, replace
          output[key] = source[key]
        }
      }
      return output
    }

    return {
      projects: state.projects.map(p => 
        p.id === id ? deepMerge(p, updates) : p
      ),
      currentProject: state.currentProject?.id === id 
        ? deepMerge(state.currentProject, updates)
        : state.currentProject,
    }
  }),

  updateProjectAsync: async (id, updates) => {
    try {
      console.log('Updating project via API:', id, updates)
      
      // ローカル状態を即座に更新（オプティミスティック更新）
      set((state) => {
        const deepMerge = (target: any, source: any): any => {
          const output = { ...target }
          for (const key in source) {
            if (source[key] instanceof Array) {
              output[key] = [...source[key]]
            } else if (source[key] instanceof Object && key in target && !(source[key] instanceof Date)) {
              output[key] = deepMerge(target[key], source[key])
            } else {
              output[key] = source[key]
            }
          }
          return output
        }

        return {
          projects: state.projects.map(p => 
            p.id === id ? deepMerge(p, updates) : p
          ),
          currentProject: state.currentProject?.id === id 
            ? deepMerge(state.currentProject, updates)
            : state.currentProject,
        }
      })

      // APIに保存
      await projectApi.update(id, updates)
      console.log('Project updated successfully via API')
    } catch (error) {
      console.error('Failed to update project via API:', error)
      // APIエラーの場合、最新データを再取得
      try {
        const updatedProject = await projectApi.getById(id)
        set((state) => ({
          currentProject: state.currentProject?.id === id ? updatedProject : state.currentProject,
          projects: state.projects.map(p => p.id === id ? updatedProject : p)
        }))
      } catch (fetchError) {
        console.error('Failed to refetch project after update error:', fetchError)
        set({ error: 'プロジェクトの更新に失敗しました' })
      }
    }
  },
  
  deleteProject: (id) => set((state) => ({
    projects: state.projects.filter(p => p.id !== id),
    currentProject: state.currentProject?.id === id ? null : state.currentProject,
  })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
}))