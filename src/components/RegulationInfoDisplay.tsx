import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid,
  TextField,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { RegulationSearchState } from '@/types/regulationSearch';
import { AdministrativeGuidance, ShadowRegulation, AdministrativeGuidanceItem } from '@/types/project';

interface RegulationInfoDisplayProps {
  searchState: RegulationSearchState;
  administrativeGuidance: AdministrativeGuidance;
  administrativeGuidanceDetails?: AdministrativeGuidanceItem[];
  shadowRegulation?: ShadowRegulation;
  onRefreshShadow: () => void;
  onRefreshAdminGuidance: () => void;
  onAdminGuidanceChange: (item: string, checked: boolean) => void;
  onShadowRegulationChange?: (updates: Partial<ShadowRegulation>) => void;
  onAddCustomGuidance?: (item: { name: string; description?: string }) => void;
  onRemoveCustomGuidance?: (itemId: string) => void;
}

export const RegulationInfoDisplay: React.FC<RegulationInfoDisplayProps> = ({
  searchState,
  administrativeGuidance,
  administrativeGuidanceDetails,
  shadowRegulation: projectShadowRegulation,
  onRefreshShadow,
  onRefreshAdminGuidance,
  onAdminGuidanceChange,
  onShadowRegulationChange,
  onAddCustomGuidance,
  onRemoveCustomGuidance
}) => {
  const { shadowRegulation, administrativeGuidance: adminGuidanceState } = searchState;
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Partial<ShadowRegulation>>({});
  const [showAddGuidance, setShowAddGuidance] = useState(false);
  const [newGuidanceName, setNewGuidanceName] = useState('');
  const [newGuidanceDescription, setNewGuidanceDescription] = useState('');
  
  // 行政指導・要綱の編集状態
  const [isEditingAdminGuidance, setIsEditingAdminGuidance] = useState(false);
  const [editingAdminGuidance, setEditingAdminGuidance] = useState<any[]>([]);

  // 表示用の行政指導データを作成
  const displayAdminGuidance = useMemo(() => {
    const aiItems = adminGuidanceState.data || [];
    const manualItems = administrativeGuidanceDetails || [];
    
    console.log('🔍 AI取得データの確認:', {
      aiItems,
      type: typeof aiItems,
      isArray: Array.isArray(aiItems),
      length: aiItems?.length,
      stringified: JSON.stringify(aiItems, null, 2)
    });
    console.log('🔍 手動データの確認:', {
      manualItems,
      type: typeof manualItems,
      isArray: Array.isArray(manualItems),
      length: manualItems?.length
    });
    
    // 手動データの詳細も確認
    if (manualItems && manualItems.length > 0) {
      manualItems.forEach((item, index) => {
        console.log(`🔍 手動項目${index}の詳細:`, {
          item,
          name: item.name,
          nameType: typeof item.name
        });
      });
    }
    
    // 各項目の詳細も確認
    if (aiItems && aiItems.length > 0) {
      aiItems.forEach((item, index) => {
        console.log(`🔍 AI項目${index}の詳細:`, {
          item,
          type: typeof item,
          keys: typeof item === 'object' && item !== null ? Object.keys(item) : 'not object',
          stringified: JSON.stringify(item),
          directProps: typeof item === 'object' && item !== null ? {
            id: item.id,
            name: item.name,
            description: item.description,
            isRequired: item.isRequired
          } : 'not object'
        });
      });
    }
    
    // AIデータの正規化処理
    const normalizedAiItems = aiItems.map((item, index) => {
      const uniqueId = `ai_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (typeof item === 'string') {
        return {
          id: uniqueId,
          name: item,
          description: '',
          isRequired: false
        };
      } else if (item && typeof item === 'object') {
        // item.nameが[object Object]の場合、一般的な行政指導項目名にフォールバック
        let displayName = item.name;
        if (displayName === '[object Object]' || typeof displayName === 'object') {
          // インデックスに基づいて一般的な行政指導項目名を設定
          const commonNames = [
            '住環境の整備に関する条例',
            '中高層建築物等の条例', 
            '雨水流出抑制施設の設置に関する指導要綱',
            '緑化指導',
            '建築指導要綱',
            '都市計画法開発行為',
            '景観条例・景観計画',
            '福祉環境整備要綱'
          ];
          displayName = commonNames[index] || `行政指導項目${index + 1}`;
        }
        
        return {
          id: item.id || uniqueId,
          name: displayName,
          description: item.description || '',
          isRequired: item.isRequired || false,
          applicableConditions: item.applicableConditions || ''
        };
      } else {
        return {
          id: uniqueId,
          name: String(item) || 'Unknown',
          description: '',
          isRequired: false
        };
      }
    });
    
    // 重複を除去（nameベースで）
    const allItems = [...normalizedAiItems, ...manualItems];
    const uniqueItems = allItems.filter((item, index, arr) => 
      arr.findIndex(i => i.name === item.name) === index
    );
    
    console.log('🔍 最終表示データ:', uniqueItems);
    return uniqueItems;
  }, [adminGuidanceState.data, administrativeGuidanceDetails]);

  // 行政指導・要綱の編集開始
  const startAdminGuidanceEdit = () => {
    setEditingAdminGuidance(displayAdminGuidance.map(item => ({
      id: item.id || `manual_${Date.now()}_${Math.random()}`,
      name: item.name || '',
      description: item.description || '',
      isRequired: item.isRequired || false,
      applicableConditions: item.applicableConditions || ''
    })));
    setIsEditingAdminGuidance(true);
  };

  // 行政指導・要綱の編集保存
  const saveAdminGuidanceChanges = () => {
    // TODO: 行政指導の詳細を保存する処理を追加
    console.log('保存する行政指導データ:', editingAdminGuidance);
    setIsEditingAdminGuidance(false);
  };

  // 行政指導・要綱の編集キャンセル
  const cancelAdminGuidanceEdit = () => {
    setIsEditingAdminGuidance(false);
    setEditingAdminGuidance([]);
  };

  // 行政指導・要綱のフィールド変更
  const handleAdminGuidanceFieldChange = (index: number, field: string, value: any) => {
    const newItems = [...editingAdminGuidance];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditingAdminGuidance(newItems);
  };

  // 行政指導・要綱の項目追加
  const addAdminGuidanceItem = () => {
    const newItem = {
      id: `manual_${Date.now()}_${Math.random()}`,
      name: '',
      description: '',
      isRequired: false,
      applicableConditions: ''
    };
    setEditingAdminGuidance([...editingAdminGuidance, newItem]);
  };

  // 行政指導・要綱の項目削除
  const removeAdminGuidanceItem = (index: number) => {
    const newItems = editingAdminGuidance.filter((_, i) => i !== index);
    setEditingAdminGuidance(newItems);
  };

  // 編集モードを開始する際に現在の値をセット
  const handleEditStart = () => {
    // プロジェクトの値を優先、なければAI取得値を使用
    const projectValues = projectShadowRegulation || {};
    const aiValues = shadowRegulation.data || {};
    
    // AI取得値のフィールド名をプロジェクトのフィールド名にマップ
    const mappedAiValues = {
      targetArea: aiValues.targetArea || '',
      targetBuilding: aiValues.targetBuildings || aiValues.targetBuilding || '',
      measurementHeight: aiValues.measurementHeight ? Number(aiValues.measurementHeight) : 0,
      measurementTime: aiValues.measurementTime || '',
      allowedShadowTime5to10m: aiValues.range5to10m ? Number(aiValues.range5to10m) : 0,
      allowedShadowTimeOver10m: aiValues.rangeOver10m ? Number(aiValues.rangeOver10m) : 0
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
  
  // 表示用のデータを決定（編集中は編集値、そうでなければプロジェクトの値またはAI取得値）
  const displayShadowData = useMemo(() => {
    if (isEditing) {
      return editValues;
    }
    
    // プロジェクトの値を優先
    if (projectShadowRegulation && projectShadowRegulation.targetArea) {
      return projectShadowRegulation;
    }
    
    // AI取得値をプロジェクトの形式にマップ
    if (shadowRegulation.data) {
      const aiData = shadowRegulation.data;
      return {
        targetArea: aiData.targetArea || '',
        targetBuilding: aiData.targetBuildings || aiData.targetBuilding || '',
        measurementHeight: aiData.measurementHeight ? Number(aiData.measurementHeight) : 0,
        measurementTime: aiData.measurementTime || '',
        allowedShadowTime5to10m: aiData.range5to10m ? Number(aiData.range5to10m) : 0,
        allowedShadowTimeOver10m: aiData.rangeOver10m ? Number(aiData.rangeOver10m) : 0
      };
    }
    
    return null;
  }, [isEditing, editValues, projectShadowRegulation, shadowRegulation.data]);

  // 行政指導の追加処理
  const handleAddGuidance = () => {
    if (!newGuidanceName.trim()) return;
    
    if (onAddCustomGuidance) {
      onAddCustomGuidance({
        name: newGuidanceName.trim(),
        description: newGuidanceDescription.trim() || undefined
      });
    }
    
    // フォームをリセット
    setNewGuidanceName('');
    setNewGuidanceDescription('');
    setShowAddGuidance(false);
  };

  // 行政指導の削除処理
  const handleRemoveGuidance = (itemId: string) => {
    if (onRemoveCustomGuidance) {
      onRemoveCustomGuidance(itemId);
    }
  };

  return (
    <Box>
      {/* 日影規制 */}
      <Box>
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ color: 'primary.main', flex: 1, minWidth: 200 }}>
              日影規制（手動入力・編集可能）
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={onRefreshShadow}
                disabled={shadowRegulation.isLoading || isEditing}
                sx={{ flexShrink: 0 }}
              >
                {shadowRegulation.isLoading ? '検索中...' : 'AI再検索'}
              </Button>
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
            : 'AIが自動取得した値を手動で編集できます。「編集」ボタンで編集モードに切り替えます。'
          }
        </Typography>

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