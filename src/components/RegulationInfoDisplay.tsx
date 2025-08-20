import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  TextField
} from '@mui/material';
import { 
  Edit as EditIcon,
  AutoFixHigh as AutoIcon
} from '@mui/icons-material';
import { RegulationSearchState } from '@/types/regulationSearch';
import { AdministrativeGuidance, ShadowRegulation, AdministrativeGuidanceItem } from '@/types/project';
import { getShadowRegulationReference, getShadowRegulationReferenceFromAPI } from '@/services/shadowRegulationService';

interface RegulationInfoDisplayProps {
  searchState: RegulationSearchState;
  administrativeGuidance: AdministrativeGuidance;
  administrativeGuidanceDetails?: AdministrativeGuidanceItem[];
  shadowRegulation?: ShadowRegulation;
  zoningType?: string;  // 用途地域
  floorAreaRatio?: number;  // 容積率
  lat?: number;  // 緯度（商業地域の場合に必要）
  lng?: number;  // 経度（商業地域の場合に必要）
  onRefreshShadow: () => void;
  onRefreshAdminGuidance: () => void;
  onAdminGuidanceChange: (item: string, checked: boolean) => void;
  onShadowRegulationChange?: (updates: Partial<ShadowRegulation>) => void;
  onAddCustomGuidance?: (item: { name: string; description?: string }) => void;
  onRemoveCustomGuidance?: (itemId: string) => void;
}

export const RegulationInfoDisplay: React.FC<RegulationInfoDisplayProps> = ({
  searchState,
  administrativeGuidance: _administrativeGuidance,
  administrativeGuidanceDetails: _administrativeGuidanceDetails,
  shadowRegulation: projectShadowRegulation,
  zoningType,
  floorAreaRatio,
  lat,
  lng,
  onRefreshShadow: _onRefreshShadow,
  onRefreshAdminGuidance: _onRefreshAdminGuidance,
  onAdminGuidanceChange: _onAdminGuidanceChange,
  onShadowRegulationChange,
  onAddCustomGuidance: _onAddCustomGuidance,
  onRemoveCustomGuidance: _onRemoveCustomGuidance
}) => {
  const { shadowRegulation } = searchState;
  // const { administrativeGuidance: adminGuidanceState } = searchState; // 現在未使用
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Partial<ShadowRegulation>>({});
  const [autoCalculatedShadow, setAutoCalculatedShadow] = useState<Partial<ShadowRegulation> | null>(null);
  
  // 用途地域と容積率から日影規制の参考値を自動計算
  useEffect(() => {
    const fetchShadowRegulation = async () => {
      if (zoningType && floorAreaRatio) {
        try {
          // すべての用途地域でAPIを使用（商業地域の場合は座標情報も送信）
          const reference = await getShadowRegulationReferenceFromAPI(zoningType, floorAreaRatio, lat, lng);
          if (reference) {
            const calculatedShadow = {
              targetArea: reference.targetArea,
              targetBuilding: reference.targetBuilding,
              measurementHeight: reference.measurementHeight,
              measurementTime: reference.measurementTime,
              allowedShadowTime5to10m: reference.allowedShadowTime5to10m,
              allowedShadowTimeOver10m: reference.allowedShadowTimeOver10m
            };
            setAutoCalculatedShadow(calculatedShadow);
            
            // プロジェクトに保存された値がない場合のみ、自動的に参考値を適用
            if (!projectShadowRegulation || !projectShadowRegulation.targetArea) {
              onShadowRegulationChange?.(calculatedShadow);
            }
          } else {
            setAutoCalculatedShadow(null);
          }
        } catch (error) {
          console.error('日影規制参考値の取得に失敗:', error);
          // フォールバックとしてローカル計算を使用
          const reference = getShadowRegulationReference(zoningType, floorAreaRatio);
          if (reference) {
            const calculatedShadow = {
              targetArea: reference.targetArea,
              targetBuilding: reference.targetBuilding,
              measurementHeight: reference.measurementHeight,
              measurementTime: reference.measurementTime,
              allowedShadowTime5to10m: reference.allowedShadowTime5to10m,
              allowedShadowTimeOver10m: reference.allowedShadowTimeOver10m
            };
            setAutoCalculatedShadow(calculatedShadow);
            
            // プロジェクトに保存された値がない場合のみ、自動的に参考値を適用
            if (!projectShadowRegulation || !projectShadowRegulation.targetArea) {
              onShadowRegulationChange?.(calculatedShadow);
            }
          } else {
            setAutoCalculatedShadow(null);
          }
        }
      }
    };
    
    fetchShadowRegulation();
  }, [zoningType, floorAreaRatio, lat, lng, projectShadowRegulation, onShadowRegulationChange]);
  
  // 自動計算値を適用
  const applyAutoCalculated = () => {
    if (autoCalculatedShadow && onShadowRegulationChange) {
      onShadowRegulationChange(autoCalculatedShadow);
      setIsEditing(false);
    }
  };
  

  // 表示用の行政指導データを作成
  // 現在は未使用ですが、今後の実装のために保持しています
  // const displayAdminGuidance = useMemo(() => { ... }, [adminGuidanceState.data, _administrativeGuidanceDetails]);

  // 編集モードを開始する際に現在の値をセット
  const handleEditStart = () => {
    // プロジェクトの値を優先、なければAI取得値を使用
    const projectValues = (projectShadowRegulation || {}) as Partial<ShadowRegulation>;
    const aiValues = (shadowRegulation.data || {}) as any;
    
    // AI取得値のフィールド名をプロジェクトのフィールド名にマップ
    const mappedAiValues = {
      targetArea: aiValues?.targetArea || '',
      targetBuilding: aiValues?.targetBuildings || aiValues?.targetBuilding || '',
      measurementHeight: aiValues?.measurementHeight ? Number(aiValues.measurementHeight) : 0,
      measurementTime: aiValues?.measurementTime || '',
      allowedShadowTime5to10m: aiValues?.range5to10m ? Number(aiValues.range5to10m) : 0,
      allowedShadowTimeOver10m: aiValues?.rangeOver10m ? Number(aiValues.rangeOver10m) : 0
    };
    
    setEditValues({
      targetArea: projectValues.targetArea || mappedAiValues.targetArea,
      targetBuilding: projectValues.targetBuilding || mappedAiValues.targetBuilding,
      measurementHeight: projectValues.measurementHeight || mappedAiValues.measurementHeight,
      measurementTime: projectValues.measurementTime || mappedAiValues.measurementTime,
      allowedShadowTime5to10m: projectValues.allowedShadowTime5to10m || mappedAiValues.allowedShadowTime5to10m,
      allowedShadowTimeOver10m: projectValues.allowedShadowTimeOver10m || mappedAiValues.allowedShadowTimeOver10m
    });
    setIsEditing(true);
  };
  
  // 編集を保存
  const handleEditSave = () => {
    if (onShadowRegulationChange && editValues) {
      onShadowRegulationChange(editValues);
    }
    setIsEditing(false);
  };
  
  // 編集をキャンセル
  const handleEditCancel = () => {
    setEditValues({});
    setIsEditing(false);
  };
  
  // 表示用のデータを決定（編集中は編集値、そうでなければプロジェクトの値）
  const displayShadowData = useMemo(() => {
    if (isEditing) {
      return editValues;
    }
    
    // プロジェクトの値を優先（ユーザーが編集した値を表示）
    if (projectShadowRegulation && projectShadowRegulation.targetArea && projectShadowRegulation.targetArea !== '') {
      return projectShadowRegulation;
    }
    
    // プロジェクトに値がない場合は、自動計算された参考値を初期値として表示
    if (autoCalculatedShadow && autoCalculatedShadow.targetArea) {
      return autoCalculatedShadow;
    }
    
    // AI取得値をプロジェクトの形式にマップ
    if (shadowRegulation.data) {
      const aiData = shadowRegulation.data as any;
      return {
        targetArea: aiData?.targetArea || '',
        targetBuilding: aiData?.targetBuildings || aiData?.targetBuilding || '',
        measurementHeight: aiData?.measurementHeight ? Number(aiData.measurementHeight) : 0,
        measurementTime: aiData?.measurementTime || '',
        allowedShadowTime5to10m: aiData?.range5to10m ? Number(aiData.range5to10m) : 0,
        allowedShadowTimeOver10m: aiData?.rangeOver10m ? Number(aiData.rangeOver10m) : 0
      };
    }
    
    return null;
  }, [isEditing, editValues, projectShadowRegulation, shadowRegulation.data, autoCalculatedShadow]);


  return (
    <Box>
      {/* 日影規制 */}
      <Box>
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ color: '#2C3E50', flex: 1, minWidth: 200 }}>
              日影規制（参考値自動計算・編集可能）
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              {autoCalculatedShadow && (
                <Button
                  size="small"
                  variant={
                    // 参考値と現在の値が異なる場合は強調表示
                    JSON.stringify(autoCalculatedShadow) !== JSON.stringify(projectShadowRegulation) 
                      ? "contained" 
                      : "outlined"
                  }
                  color={
                    JSON.stringify(autoCalculatedShadow) !== JSON.stringify(projectShadowRegulation) 
                      ? "warning" 
                      : "success"
                  }
                  startIcon={<AutoIcon />}
                  onClick={applyAutoCalculated}
                  disabled={isEditing}
                  sx={{ 
                    flexShrink: 0,
                    ...(JSON.stringify(autoCalculatedShadow) !== JSON.stringify(projectShadowRegulation) && {
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 1 },
                        '50%': { opacity: 0.7 },
                        '100%': { opacity: 1 },
                      }
                    })
                  }}
                >
                  {JSON.stringify(autoCalculatedShadow) !== JSON.stringify(projectShadowRegulation) 
                    ? "参考値を適用（更新あり）" 
                    : "参考値を適用"}
                </Button>
              )}
              {!isEditing ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEditStart}
                  sx={{ flexShrink: 0 }}
                >
                  編集
                </Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleEditSave}
                    sx={{ flexShrink: 0 }}
                  >
                    保存
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleEditCancel}
                    sx={{ flexShrink: 0 }}
                  >
                    キャンセル
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {isEditing 
            ? '日影規制の各項目を直接編集できます' 
            : autoCalculatedShadow 
              ? '用途地域と容積率から参考値を自動計算しました。「参考値を適用」または「編集」ボタンで調整してください。'
              : '日影規制の参考値は用途地域と容穌率から自動計算されます。「編集」ボタンで手動入力も可能です。'
          }
        </Typography>
        
        {autoCalculatedShadow && !isEditing && (
          <Alert 
            severity={
              // ユーザーが編集した値と参考値が異なる場合は警告色
              projectShadowRegulation && 
              JSON.stringify(autoCalculatedShadow) !== JSON.stringify(projectShadowRegulation) 
                ? "warning" 
                : "info"
            } 
            sx={{ mb: 2 }}
          >
            <Typography variant="body2">
              <strong>
                {projectShadowRegulation && 
                 JSON.stringify(autoCalculatedShadow) !== JSON.stringify(projectShadowRegulation)
                  ? '参考値（用途地域・容積率から自動計算）：'
                  : '参考値：'}
              </strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              対象地域: {autoCalculatedShadow.targetArea}<br />
              対象建築物: {autoCalculatedShadow.targetBuilding}<br />
              測定面高さ: {autoCalculatedShadow.measurementHeight}m<br />
              測定時間帯: {autoCalculatedShadow.measurementTime}<br />
              5-10m範囲: {autoCalculatedShadow.allowedShadowTime5to10m}時間以内、
              10m超: {autoCalculatedShadow.allowedShadowTimeOver10m}時間以内
            </Typography>
            {projectShadowRegulation && 
             JSON.stringify(autoCalculatedShadow) !== JSON.stringify(projectShadowRegulation) && (
              <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block', fontWeight: 'bold' }}>
                ※ 現在の設定値は参考値と異なります。「参考値を適用」ボタンで参考値に戻すことができます。
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              ※ これは用途地域と容積率から計算された参考値です。正確な値は自治体に確認してください。
            </Typography>
          </Alert>
        )}

        {shadowRegulation.isLoading ? (
          <Box sx={{ 
            mt: 2, 
            p: 3, 
            bgcolor: 'grey.50', 
            borderRadius: 2, 
            border: '1px solid', 
            borderColor: 'grey.200',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              AIが日影規制情報を解析中...
            </Typography>
          </Box>
        ) : shadowRegulation.error && !displayShadowData ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {shadowRegulation.error}
          </Alert>
        ) : (
          <Box sx={{ 
            mt: 2, 
            p: 3, 
            bgcolor: isEditing ? 'grey.50' : 'primary.50', 
            borderRadius: 2, 
            border: '1px solid', 
            borderColor: isEditing ? 'grey.300' : 'primary.200' 
          }}>
            {isEditing ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="規制対象地域"
                  value={editValues.targetArea || ''}
                  onChange={(e) => setEditValues(prev => ({ ...prev, targetArea: e.target.value }))}
                  placeholder="例：第一種中高層住居専用地域"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="規制対象建築物"
                  value={editValues.targetBuilding || ''}
                  onChange={(e) => setEditValues(prev => ({ ...prev, targetBuilding: e.target.value }))}
                  placeholder="例：高さが10mを超える建築物"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="測定面高さ (m)"
                  type="number"
                  value={editValues.measurementHeight || ''}
                  onChange={(e) => setEditValues(prev => ({ ...prev, measurementHeight: Number(e.target.value) || 0 }))}
                  placeholder="例：1.5"
                  size="small"
                  inputProps={{ step: 0.1, min: 0 }}
                />
                <TextField
                  fullWidth
                  label="測定時間帯"
                  value={editValues.measurementTime || ''}
                  onChange={(e) => setEditValues(prev => ({ ...prev, measurementTime: e.target.value }))}
                  placeholder="例：8時から16時"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="5-10m範囲の許容日影時間 (時間)"
                  type="number"
                  value={editValues.allowedShadowTime5to10m || ''}
                  onChange={(e) => setEditValues(prev => ({ ...prev, allowedShadowTime5to10m: Number(e.target.value) || 0 }))}
                  placeholder="例：4"
                  size="small"
                  inputProps={{ step: 0.5, min: 0 }}
                />
                <TextField
                  fullWidth
                  label="10m超範囲の許容日影時間 (時間)"
                  type="number"
                  value={editValues.allowedShadowTimeOver10m || ''}
                  onChange={(e) => setEditValues(prev => ({ ...prev, allowedShadowTimeOver10m: Number(e.target.value) || 0 }))}
                  placeholder="例：2.5"
                  size="small"
                  inputProps={{ step: 0.5, min: 0 }}
                />
              </Box>
            ) : displayShadowData ? (
              <>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>規制対象地域:</strong> {displayShadowData.targetArea || '未設定'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>規制対象建築物:</strong> {displayShadowData.targetBuilding || '未設定'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>測定面高さ:</strong> {displayShadowData.measurementHeight || 0}m
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>測定時間帯:</strong> {displayShadowData.measurementTime || '未設定'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>5-10m範囲:</strong> {displayShadowData.allowedShadowTime5to10m || 0}時間以内
                </Typography>
                <Typography variant="body2">
                  <strong>10m超範囲:</strong> {displayShadowData.allowedShadowTimeOver10m || 0}時間以内
                </Typography>
                {displayShadowData.targetArea && (
                  <Typography variant="caption" color="info.main" sx={{ mt: 2, display: 'block' }}>
                    ※ 日影時間は、冬至日の測定時間帯内で建物の影が敷地外に落ちる時間の上限です
                  </Typography>
                )}
              </>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  日影規制情報がありません。「AI再検索」ボタンで取得するか、「編集」ボタンで手動入力してください。
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEditStart}
                  size="small"
                >
                  手動で入力
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};