import React from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { RegulationSearchState } from '@/types/regulationSearch';
import { AdministrativeGuidance } from '@/types/project';

interface RegulationInfoDisplayProps {
  searchState: RegulationSearchState;
  administrativeGuidance: AdministrativeGuidance;
  onRefreshShadow: () => void;
  onRefreshAdminGuidance: () => void;
  onAdminGuidanceChange: (item: string, checked: boolean) => void;
}

export const RegulationInfoDisplay: React.FC<RegulationInfoDisplayProps> = ({
  searchState,
  administrativeGuidance,
  onRefreshShadow,
  onRefreshAdminGuidance,
  onAdminGuidanceChange
}) => {
  const { shadowRegulation, administrativeGuidance: adminGuidanceState } = searchState;

  return (
    <Grid container spacing={3}>
      {/* 行政指導・要綱 */}
      <Grid item xs={12} md={6}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" sx={{ color: 'primary.main' }}>
            行政指導・要綱（AIが自動取得・適用判定）
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefreshAdminGuidance}
            disabled={adminGuidanceState.isLoading}
          >
            {adminGuidanceState.isLoading ? '検索中...' : '再検索'}
          </Button>
        </Box>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          建物の規模・用途に応じて適用される行政指導をAIが判定します
        </Typography>

        {adminGuidanceState.isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              行政指導情報を取得中...
            </Typography>
          </Box>
        ) : adminGuidanceState.error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {adminGuidanceState.error}
          </Alert>
        ) : adminGuidanceState.data && adminGuidanceState.data.length > 0 ? (
          <FormGroup sx={{ mt: 2 }}>
            {adminGuidanceState.data.map((item) => (
              <Box key={item.id} sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={administrativeGuidance[item.id] || false}
                      onChange={(e) => onAdminGuidanceChange(item.id, e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" component="span">
                        {item.name}
                        {item.isRequired && (
                          <Typography component="span" color="error" sx={{ ml: 1 }}>
                            *必須
                          </Typography>
                        )}
                      </Typography>
                      {item.description && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {typeof item.description === 'string' ? (
                            item.description
                          ) : Array.isArray(item.description) ? (
                            <Box component="ul" sx={{ m: 0, pl: 2 }}>
                              {(item.description as string[]).map((line, index) => (
                                <li key={index}>{line}</li>
                              ))}
                            </Box>
                          ) : (
                            String(item.description)
                          )}
                        </Typography>
                      )}
                      {item.applicableConditions && (
                        <Typography variant="caption" display="block" color="primary.main">
                          適用条件: {item.applicableConditions}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </Box>
            ))}
          </FormGroup>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 2 }}>
            住所入力後にAIが適用される行政指導を自動判定します
          </Typography>
        )}
      </Grid>

      {/* 日影規制 */}
      <Grid item xs={12} md={6}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" sx={{ color: 'primary.main' }}>
            日影規制（AIが自動取得・参考表示）
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefreshShadow}
            disabled={shadowRegulation.isLoading}
          >
            {shadowRegulation.isLoading ? '検索中...' : '再検索'}
          </Button>
        </Box>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          敷地の位置情報から、該当する日影規制の情報をAIが自動的に取得します
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
        ) : shadowRegulation.error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {shadowRegulation.error}
          </Alert>
        ) : shadowRegulation.data ? (
          <Box sx={{ 
            mt: 2, 
            p: 3, 
            bgcolor: 'primary.50', 
            borderRadius: 2, 
            border: '1px solid', 
            borderColor: 'primary.200' 
          }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>規制対象地域:</strong> {shadowRegulation.data.targetArea}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>規制対象建築物:</strong> {shadowRegulation.data.targetBuildings}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>測定面高さ:</strong> {shadowRegulation.data.measurementHeight}
              {shadowRegulation.data.measurementHeight && !shadowRegulation.data.measurementHeight.includes('m') ? 'm' : ''}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>測定時間帯:</strong> {shadowRegulation.data.measurementTime}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>5-10m範囲:</strong> {shadowRegulation.data.range5to10m}
              {shadowRegulation.data.range5to10m ? '時間以内' : ''}
            </Typography>
            <Typography variant="body2">
              <strong>10m超範囲:</strong> {shadowRegulation.data.rangeOver10m}
              {shadowRegulation.data.rangeOver10m ? '時間以内' : ''}
            </Typography>
            {shadowRegulation.data.targetArea && (
              <Typography variant="caption" color="info.main" sx={{ mt: 2, display: 'block' }}>
                ※ 日影時間は、冬至日の測定時間帯内で建物の影が敷地外に落ちる時間の上限です
              </Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ 
            mt: 2, 
            p: 3, 
            bgcolor: 'grey.50', 
            borderRadius: 2, 
            border: '1px solid', 
            borderColor: 'grey.200' 
          }}>
            <Typography variant="body2" color="text.secondary">
              日影規制情報を取得できませんでした。「再検索」ボタンをクリックして再度取得してください。
            </Typography>
          </Box>
        )}
      </Grid>
    </Grid>
  );
};