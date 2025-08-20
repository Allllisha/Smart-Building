import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  Skeleton,
  Paper
} from '@mui/material';
import {
  LocationCity,
  WbSunny,
  Policy,
  InfoOutlined
} from '@mui/icons-material';
import { RegulationInfo } from '../api/webSearchApi';

interface WebSearchResultsProps {
  loading: boolean;
  urbanPlanning?: RegulationInfo;
  sunlightRegulation?: RegulationInfo;
  administrativeGuidance?: string[];
  searchedAt?: string;
  error?: string;
}

const WebSearchResults: React.FC<WebSearchResultsProps> = ({
  loading,
  urbanPlanning,
  sunlightRegulation,
  administrativeGuidance,
  searchedAt,
  error
}) => {
  if (loading) {
    return (
      <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          🔍 AI による地域情報検索中...
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="rectangular" width="100%" height={60} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" width="100%" height={60} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" width="100%" height={60} />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <Typography variant="body2">
          Web検索でエラーが発生しました: {error}
        </Typography>
      </Alert>
    );
  }

  if (!urbanPlanning && !sunlightRegulation && !administrativeGuidance) {
    return null;
  }

  return (
    <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <InfoOutlined color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6">
          AI による地域情報検索結果
        </Typography>
      </Box>
      
      {searchedAt && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          検索日時: {new Date(searchedAt).toLocaleString('ja-JP')}
        </Typography>
      )}

      <Grid container spacing={2}>
        {/* 都市計画情報 */}
        {urbanPlanning && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LocationCity color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" sx={{ color: '#2C3E50' }}>都市計画情報</Typography>
                </Box>
                
                <List dense>
                  {urbanPlanning.useDistrict && (
                    <ListItem>
                      <ListItemText
                        primary="用途地域"
                        secondary={urbanPlanning.useDistrict}
                      />
                    </ListItem>
                  )}
                  
                  {urbanPlanning.buildingCoverageRatio && (
                    <ListItem>
                      <ListItemText
                        primary="建ぺい率"
                        secondary={urbanPlanning.buildingCoverageRatio}
                      />
                    </ListItem>
                  )}
                  
                  {urbanPlanning.floorAreaRatio && (
                    <ListItem>
                      <ListItemText
                        primary="容積率"
                        secondary={urbanPlanning.floorAreaRatio}
                      />
                    </ListItem>
                  )}
                  
                  {urbanPlanning.heightRestriction && (
                    <ListItem>
                      <ListItemText
                        primary="高度地区"
                        secondary={urbanPlanning.heightRestriction}
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* 日影規制情報 */}
        {sunlightRegulation?.sunlightRegulation && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <WbSunny color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6" sx={{ color: '#2C3E50' }}>日影規制</Typography>
                </Box>
                
                <List dense>
                  {sunlightRegulation.sunlightRegulation.measurementHeight && (
                    <ListItem>
                      <ListItemText
                        primary="測定面"
                        secondary={sunlightRegulation.sunlightRegulation.measurementHeight}
                      />
                    </ListItem>
                  )}
                  
                  {sunlightRegulation.sunlightRegulation.timeRange && (
                    <ListItem>
                      <ListItemText
                        primary="測定時間"
                        secondary={sunlightRegulation.sunlightRegulation.timeRange}
                      />
                    </ListItem>
                  )}
                  
                  {sunlightRegulation.sunlightRegulation.shadowTimeLimit && (
                    <ListItem>
                      <ListItemText
                        primary="日影時間制限"
                        secondary={sunlightRegulation.sunlightRegulation.shadowTimeLimit}
                      />
                    </ListItem>
                  )}
                  
                  {sunlightRegulation.sunlightRegulation.targetBuildings && (
                    <ListItem>
                      <ListItemText
                        primary="対象建築物"
                        secondary={sunlightRegulation.sunlightRegulation.targetBuildings}
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* 行政指導・要綱 */}
        {administrativeGuidance && administrativeGuidance.length > 0 && (
          <Grid size={12}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Policy color="info" sx={{ mr: 1 }} />
                  <Typography variant="h6" sx={{ color: '#2C3E50' }}>行政指導・要綱</Typography>
                </Box>
                
                <List dense>
                  {administrativeGuidance.map((guidance, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {guidance}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < administrativeGuidance.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* 情報の信頼性に関する注意 */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          💡 この情報はAIによるWeb検索結果に基づいています。
          正確な情報は関係官庁へお問い合わせください。
        </Typography>
      </Alert>
    </Paper>
  );
};

export default WebSearchResults;