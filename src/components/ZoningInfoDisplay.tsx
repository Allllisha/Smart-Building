import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Grid,
  InputAdornment,
  MenuItem
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { RegulationItemState } from '@/types/regulationSearch';
import { SiteInfo } from '@/types/project';

interface ZoningInfoDisplayProps {
  zoningState: RegulationItemState<{
    zoningType: string;
    buildingCoverageRatio: number;
    floorAreaRatio: number;
    heightLimit: string;
    heightDistrict: string;
  }>;
  siteInfo: SiteInfo;
  onRefresh: () => void;
  onSiteInfoChange: (updates: Partial<SiteInfo>) => void;
}

// 用途地域のオプション
const ZONING_TYPES = [
  '第一種低層住居専用地域',
  '第二種低層住居専用地域',
  '第一種中高層住居専用地域',
  '第二種中高層住居専用地域',
  '第一種住居地域',
  '第二種住居地域',
  '準住居地域',
  '近隣商業地域',
  '商業地域',
  '準工業地域',
  '工業地域',
  '工業専用地域',
  '市街化調整区域'
];

// 高度地区のオプション
const HEIGHT_DISTRICTS = [
  '第一種高度地区',
  '第二種高度地区',
  '第三種高度地区',
  '高度地区なし'
];

export const ZoningInfoDisplay: React.FC<ZoningInfoDisplayProps> = ({
  zoningState,
  siteInfo,
  onRefresh,
  onSiteInfoChange
}) => {
  // AI取得データと手動入力データをマージ
  const displayData = {
    zoningType: siteInfo.zoningType || zoningState.data?.zoningType || '',
    buildingCoverage: siteInfo.buildingCoverage || zoningState.data?.buildingCoverageRatio || 0,
    floorAreaRatio: siteInfo.floorAreaRatio || zoningState.data?.floorAreaRatio || 0,
    heightLimit: siteInfo.heightLimit || zoningState.data?.heightLimit || '',
    heightDistrict: siteInfo.heightDistrict || zoningState.data?.heightDistrict || ''
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ color: 'primary.main' }}>
          都市計画情報
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          disabled={zoningState.isLoading}
        >
          {zoningState.isLoading ? '検索中...' : 'AI再取得'}
        </Button>
      </Box>

      {zoningState.isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            都市計画情報を取得中...
          </Typography>
        </Box>
      )}

      {zoningState.error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {zoningState.error}
        </Alert>
      )}

      {zoningState.data && (
        <Alert severity="info" sx={{ mb: 2 }}>
          AIが都市計画情報を取得しました。必要に応じて手動で修正してください。
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            select
            fullWidth
            label="用途地域"
            value={displayData.zoningType}
            onChange={(e) => onSiteInfoChange({ zoningType: e.target.value })}
            helperText={zoningState.data?.zoningType && `AI取得: ${zoningState.data.zoningType}`}
          >
            <MenuItem value="">選択してください</MenuItem>
            {ZONING_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            select
            fullWidth
            label="高度地区"
            value={displayData.heightDistrict}
            onChange={(e) => onSiteInfoChange({ heightDistrict: e.target.value })}
            helperText={zoningState.data?.heightDistrict && `AI取得: ${zoningState.data.heightDistrict}`}
          >
            <MenuItem value="">選択してください</MenuItem>
            {HEIGHT_DISTRICTS.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            type="number"
            fullWidth
            label="建ぺい率"
            value={displayData.buildingCoverage}
            onChange={(e) => onSiteInfoChange({ buildingCoverage: Number(e.target.value) })}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>
            }}
            inputProps={{ 
              min: 0, 
              max: 100,
              step: 5
            }}
            helperText={zoningState.data?.buildingCoverageRatio && `AI取得: ${zoningState.data.buildingCoverageRatio}%`}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            type="number"
            fullWidth
            label="容積率"
            value={displayData.floorAreaRatio}
            onChange={(e) => onSiteInfoChange({ floorAreaRatio: Number(e.target.value) })}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>
            }}
            inputProps={{ 
              min: 0, 
              max: 1300,
              step: 10
            }}
            helperText={zoningState.data?.floorAreaRatio && `AI取得: ${zoningState.data.floorAreaRatio}%`}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="高さ制限"
            value={displayData.heightLimit}
            onChange={(e) => onSiteInfoChange({ heightLimit: e.target.value })}
            placeholder="例: 20m"
            helperText={zoningState.data?.heightLimit && `AI取得: ${zoningState.data.heightLimit}`}
          />
        </Grid>
      </Grid>
    </Box>
  );
};