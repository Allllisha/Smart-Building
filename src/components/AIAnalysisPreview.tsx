import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { EstimationResult } from '@/types/project';

interface AIAnalysisPreviewProps {
  estimation: EstimationResult;
  projectName: string;
  expanded?: boolean;
  onToggle?: () => void;
}

export default function AIAnalysisPreview({ 
  estimation, 
  projectName, 
  expanded = false, 
  onToggle 
}: AIAnalysisPreviewProps) {
  const theme = useTheme();

  // AI分析レポートの最初の部分を抽出（プレビュー用）
  const getAnalysisPreview = (analysis: string): string => {
    const lines = analysis.split('\n').filter(line => line.trim());
    const firstSection = lines.slice(0, 3).join('\n');
    
    if (firstSection.length > 150) {
      return firstSection.substring(0, 150) + '...';
    }
    return firstSection + '...';
  };

  const formatCurrency = (value: number) => {
    return (value / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 1 });
  };

  return (
    <Card
      sx={{
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        border: `1px solid ${theme.palette.primary.main}`,
        borderRadius: 3,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`,
        },
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
              }}
            >
              <AIIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={600} color="primary.main">
                AI 分析レポート
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {projectName}
              </Typography>
            </Box>
          </Stack>
          
          <Stack direction="row" alignItems="center" spacing={1}>
            <Chip
              icon={<AssessmentIcon sx={{ fontSize: '16px !important' }} />}
              label={`¥${formatCurrency(estimation.totalCost)}万円`}
              size="small"
              color="primary"
              variant="outlined"
            />
            {onToggle && (
              <IconButton onClick={onToggle} size="small">
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </Stack>
        </Stack>

        {/* プレビュー表示 */}
        {!expanded && (
          <Box
            sx={{
              '& h1, & h2, & h3': {
                color: 'text.primary',
                fontWeight: 500,
                fontSize: '1rem',
                mb: 1,
              },
              '& p': {
                mb: 0.5,
                lineHeight: 1.5,
                color: 'text.secondary',
                fontSize: '0.8rem',
              },
              '& ul, & ol': {
                mb: 0.5,
                pl: 1.5,
                fontSize: '0.8rem',
              },
              '& hr': {
                my: 1,
                borderColor: 'divider',
              },
            }}
          >
            <ReactMarkdown>{getAnalysisPreview(estimation.aiAnalysis)}</ReactMarkdown>
            {onToggle && (
              <Typography
                variant="caption"
                color="primary"
                sx={{
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}
                onClick={onToggle}
              >
                続きを読む →
              </Typography>
            )}
          </Box>
        )}

        {/* 全文表示 */}
        <Collapse in={expanded}>
          <Box
            sx={{
              '& h1, & h2, & h3': {
                color: 'text.primary',
                fontWeight: 500,
                mb: 2,
              },
              '& p': {
                mb: 2,
                lineHeight: 1.7,
              },
              '& ul, & ol': {
                mb: 2,
                pl: 3,
              },
              '& hr': {
                my: 3,
                borderColor: 'divider',
              },
            }}
          >
            <ReactMarkdown>{estimation.aiAnalysis}</ReactMarkdown>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}