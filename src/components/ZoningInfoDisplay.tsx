import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  InputAdornment,
  MenuItem,
  Grid
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { SiteInfo } from '@/types/project';
import { fetchCityPlanningByAddress, CityPlanningData } from '@/services/cityPlanningApi.service';

interface ZoningInfoDisplayProps {
  siteInfo: SiteInfo;
  address?: string; // 住所を受け取る
  onSiteInfoChange: (updates: Partial<SiteInfo>) => void;
  onLocationUpdate?: (lat: number, lng: number) => void; // 座標情報を更新するコールバック
}

// 用途地域のオプション（国土交通省APIの表記に合わせる）
const ZONING_TYPES = [
  '第１種低層住居専用地域',
  '第２種低層住居専用地域',
  '第１種中高層住居専用地域',
  '第２種中高層住居専用地域',
  '第１種住居地域',
  '第２種住居地域',
  '準住居地域',
  '田園住居地域',
  '近隣商業地域',
  '商業地域',
  '準工業地域',
  '工業地域',
  '工業専用地域',
  '市街化調整区域',
  '都市計画区域外',
  '無指定'
];

// 高度地区のオプション（一般的な表記）
const HEIGHT_DISTRICTS = [
  '第１種高度地区',
  '第２種高度地区', 
  '第３種高度地区',
  '最高限第１種高度地区',
  '最高限第２種高度地区',
  '最高限第３種高度地区',
  '高度地区なし',
  '指定なし'
];

export const ZoningInfoDisplay: React.FC<ZoningInfoDisplayProps> = ({
  siteInfo,
  address,
  onSiteInfoChange,
  onLocationUpdate
}) => {
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<CityPlanningData | null>(null);
  
  // API取得データと手動入力データをマージ
  const displayData = {
    zoningType: siteInfo.zoningType || apiData?.useArea || '',
    buildingCoverage: siteInfo.buildingCoverage || apiData?.buildingCoverageRatio || 0,
    floorAreaRatio: siteInfo.floorAreaRatio || apiData?.floorAreaRatio || 0,
    heightLimit: siteInfo.heightLimit || apiData?.heightRestriction || '',
    heightDistrict: siteInfo.heightDistrict || apiData?.altitudeDistrict || ''
  };
  
  // 国土交通省APIから都市計画情報を取得
  const fetchFromApi = async () => {
    if (!address) {
      setApiError('住所が設定されていません');
      return;
    }
    
    setIsLoadingApi(true);
    setApiError(null);
    
    try {
      const data = await fetchCityPlanningByAddress(address);
      if (data) {
        setApiData(data);
        // 取得したデータを自動的にsiteInfoに反映
        onSiteInfoChange({
          zoningType: data.useArea,
          buildingCoverage: data.buildingCoverageRatio,
          floorAreaRatio: data.floorAreaRatio,
          heightLimit: data.heightRestriction || siteInfo.heightLimit || '',
          heightDistrict: data.altitudeDistrict || siteInfo.heightDistrict || ''
        });
        // 座標情報を親コンポーネントに伝える
        if (data.lat && data.lng && onLocationUpdate) {
          onLocationUpdate(data.lat, data.lng);
        }
      } else {
        setApiError('都市計画情報が見つかりませんでした');
      }
    } catch (error) {
      setApiError('都市計画情報の取得に失敗しました');
      console.error(error);
    } finally {
      setIsLoadingApi(false);
    }
  };
  
  // 住所が変更されたら自動的にAPIから取得
  useEffect(() => {
    if (address && !apiData) {
      fetchFromApi();
    }
  }, [address]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ color: 'primary.main' }}>
          都市計画情報（編集可能）
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={fetchFromApi}
          disabled={isLoadingApi}
        >
          {isLoadingApi ? '取得中...' : '再取得'}
        </Button>
      </Box>

      {isLoadingApi && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            都市計画情報を取得中...
          </Typography>
        </Box>
      )}

      {apiError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {apiError}
        </Alert>
      )}

      {apiData && (
        <Alert severity="success" sx={{ mb: 2 }}>
          都市計画情報を取得しました。必要に応じて手動で修正してください。
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            label="用途地域"
            value={displayData.zoningType}
            onChange={(e) => onSiteInfoChange({ zoningType: e.target.value })}
            helperText={
              apiData?.useArea ? `自動取得: ${apiData.useArea}` :
              '自動取得、または手動で選択してください'
            }
          >
            <MenuItem value="">選択してください</MenuItem>
            {ZONING_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            label="高度地区"
            value={displayData.heightDistrict}
            onChange={(e) => onSiteInfoChange({ heightDistrict: e.target.value })}
            helperText="手動で選択してください（自動取得できません）"
          >
            <MenuItem value="">選択してください</MenuItem>
            {HEIGHT_DISTRICTS.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} md={4}>
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
            helperText={apiData?.buildingCoverageRatio ? `自動取得: ${apiData.buildingCoverageRatio}%` : ''}
          />
        </Grid>

        <Grid item xs={12} md={4}>
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
            helperText={apiData?.floorAreaRatio ? `自動取得: ${apiData.floorAreaRatio}%` : ''}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="高さ制限"
            value={displayData.heightLimit}
            onChange={(e) => onSiteInfoChange({ heightLimit: e.target.value })}
            placeholder="例: 20m"
            helperText="手動で入力してください（自動取得できません）"
          />
        </Grid>
      </Grid>
    </Box>
  );
};