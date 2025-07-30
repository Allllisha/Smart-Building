import { Router } from 'express';
import { WebSearchController } from '../controllers/websearch.controller';

const router = Router();
const webSearchController = new WebSearchController();

// Health check endpoint
router.get('/health', webSearchController.healthCheck);

// Urban planning information search
router.post('/urban-planning', webSearchController.searchUrbanPlanning);

// Sunlight regulation search
router.post('/sunlight-regulation', webSearchController.searchSunlightRegulation);

// Administrative guidance search
router.post('/administrative-guidance', webSearchController.searchAdministrativeGuidance);

// Comprehensive search (all information at once)
router.post('/comprehensive', webSearchController.searchComprehensiveInfo);

// Municipality regulations search (福祉環境整備要綱 etc.)
router.post('/regulations', webSearchController.searchMunicipalityRegulations);

export default router;