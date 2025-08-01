見積もりアプリ「スマート・ビルディング・プランナー」：最終要件定義

1. アプリケーション名
   スマート・ビルディング・プランナー (Smart Building Planner)

2. アプリケーションの目的
   「スマート・ビルディング・プランナー」は、建築プロジェクトにおける純粋な建築コストと運用後のランニングコストを、日影計算と環境データに基づいて高精度かつ視覚的に評価し、見積もりを提供する革新的なプラットフォームです。このアプリは、フォーム入力された情報から AI が BIM 準拠のデータを生成し、BIM ファイルを介して**「その場所に建築物が立ったらどうなるか」の 3D シミュレーションと、精巧な見積もりを算出することで、設計初期段階での迅速かつ最適な意思決定を支援し、設計者と施主間のコミュニケーションを劇的に円滑化します。また、日照、周辺環境、法規制、災害リスクを考慮した持続可能で高品質な建築**の企画・推進に特化して貢献します。

3. ターゲットユーザー
   建築設計事務所、工務店、建設会社: 設計提案、詳細見積もり作成、施主への説明、設計最適化。

個人施主: 住宅建設検討時の建築コストと運用コストの明確な把握、設計事務所や工務店との円滑な対話。

4. 主要機能要件
   [以下、既存の内容を全て保持]

5. 非機能要件
   [以下、既存の内容を全て保持]

6. 技術要件 (Azure クラウド環境特化)
   [以下、既存の内容を全て保持]

7. ユーザー体験 (UX) の流れ
   [以下、既存の内容を全て保持]

メモリー：
- 3Dシミュレーションに記載されているCompliance Analysis（法規制適合性分析）と、Design Recommendations（設計推奨事項）は、前段階の面積・規制情報、都市計画情報の検索結果を加味して計算し結果を表示している。具体的には：
  1. P1.3とP2.3で取得した敷地情報と都市計画情報を基礎データとして使用
  2. AI（Azure Machine Learning）が取得した法規制情報を解析
  3. P4.3のボリュームチェックと法規制判定で、これらの情報を統合的に評価
  4. 結果として、法規制に基づいたCompliance AnalysisとDesign Recommendationsを生成