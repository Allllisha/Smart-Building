import { Router } from 'express';
import { getCityPlanningData, geocodeAddress, getShadowRegulationReference } from '../controllers/cityplanning.controller';

const router = Router();

// 住所から緯度経度を取得
router.get('/geocode', geocodeAddress);

// 緯度経度から都市計画情報を取得
router.get('/planning-data', getCityPlanningData);

// 日影規制の参考値を計算
router.get('/shadow-regulation', getShadowRegulationReference);

export default router;