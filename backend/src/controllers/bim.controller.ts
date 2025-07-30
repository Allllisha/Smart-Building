import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { AppError } from '../middleware/error.middleware'
import { ProjectModel } from '../models/project.model'
import { Text2BIMService } from '../services/text2bim.service'
import { getBlobServiceClient } from '../config/azure'
import { query } from '../config/database'
import { v4 as uuidv4 } from 'uuid'

export class BIMController {
  static async generate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params

      // プロジェクトの存在確認
      const project = await ProjectModel.findById(projectId, req.user!.id)
      if (!project) {
        throw new AppError(404, 'Project not found')
      }

      // Text2BIMでBIMモデルを生成
      const startTime = Date.now()
      const bimResult = await Text2BIMService.generateBIM(project)
      const generationTime = Date.now() - startTime

      if (!bimResult.success) {
        throw new AppError(500, bimResult.error || 'BIM generation failed')
      }

      // BIMファイル情報をデータベースに保存
      const bimFileId = uuidv4()
      await query(`
        INSERT INTO bim_files (
          id, project_id, file_name, file_url, model_id, generation_time
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        bimFileId,
        projectId,
        `${project.name}_${new Date().toISOString()}.ifc`,
        bimResult.ifcFileUrl,
        bimResult.modelId,
        generationTime,
      ])

      res.json({
        success: true,
        data: {
          id: bimFileId,
          ifcFileUrl: bimResult.ifcFileUrl,
          modelId: bimResult.modelId,
          generationTime,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  static async getByProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params

      // プロジェクトの存在確認
      const project = await ProjectModel.findById(projectId, req.user!.id)
      if (!project) {
        throw new AppError(404, 'Project not found')
      }

      // BIMファイル一覧を取得
      const result = await query(
        'SELECT * FROM bim_files WHERE project_id = $1 ORDER BY created_at DESC',
        [projectId]
      )

      const bimFiles = result.rows.map(row => ({
        id: row.id,
        fileName: row.file_name,
        fileUrl: row.file_url,
        modelId: row.model_id,
        generationTime: row.generation_time,
        createdAt: row.created_at,
      }))

      res.json({
        success: true,
        data: bimFiles,
      })
    } catch (error) {
      next(error)
    }
  }

  static async uploadIFC(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params
      
      if (!req.file) {
        throw new AppError(400, 'No IFC file provided')
      }

      // プロジェクトの存在確認
      const project = await ProjectModel.findById(projectId, req.user!.id)
      if (!project) {
        throw new AppError(404, 'Project not found')
      }

      // Azure Blob Storageにファイルをアップロード
      const blobServiceClient = getBlobServiceClient()
      const containerName = 'bim-files'
      const containerClient = blobServiceClient.getContainerClient(containerName)
      
      // コンテナが存在しない場合は作成
      await containerClient.createIfNotExists({ access: 'blob' })
      
      // ファイル名を生成（UUID + 元のファイル名）
      const fileId = uuidv4()
      const fileName = `${fileId}_${req.file.originalname}`
      const blockBlobClient = containerClient.getBlockBlobClient(fileName)
      
      // ファイルをアップロード
      await blockBlobClient.uploadData(req.file.buffer, {
        blobHTTPHeaders: {
          blobContentType: req.file.mimetype,
        },
      })
      
      const fileUrl = blockBlobClient.url

      // BIMファイル情報をデータベースに保存
      await query(`
        INSERT INTO bim_files (
          id, project_id, file_name, file_url, model_id, generation_time
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        fileId,
        projectId,
        req.file.originalname,
        fileUrl,
        null, // アップロードファイルの場合はmodel_idはnull
        0, // アップロードファイルの場合は生成時間は0
      ])

      res.json({
        success: true,
        data: {
          id: fileId,
          fileName: req.file.originalname,
          fileUrl: fileUrl,
          fileSize: req.file.size,
        },
      })
    } catch (error) {
      next(error)
    }
  }
}