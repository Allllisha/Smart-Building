import { EstimationResult, Project, CostBreakdown } from '@/types/project'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useSettingsStore } from '@/store/settingsStore'

// HTML to PDF conversion using browser's print functionality
export const generateEstimationPDF = async (
  project: Project,
  estimation: EstimationResult,
  unitPrices: any
): Promise<void> => {
  // Get company info from settings store
  const companyInfo = useSettingsStore.getState().companyInfo
  // Create a new window for the printable content
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('ポップアップブロッカーが有効になっています。PDFを生成するには、ポップアップを許可してください。')
    return
  }

  const totalFloorArea = project.buildingInfo.totalFloorArea || project.buildingInfo.buildingArea * project.buildingInfo.floors
  const pricePerSqm = Math.round(estimation.totalCost / totalFloorArea)
  const pricePerTsubo = Math.round(estimation.totalCost / (totalFloorArea * 0.3025))

  // Generate HTML content for the PDF
  const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${project.name} - 見積書</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 20mm 25mm 20mm;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo', sans-serif;
      line-height: 1.6;
      color: #2c3e50;
      margin: 0;
      padding: 0;
      font-size: 14px;
    }
    
    .page {
      page-break-after: always;
      width: 100%;
      position: relative;
      padding: 20px;
      box-sizing: border-box;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .title {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 20px;
      color: #2c3e50;
    }
    
    .project-name {
      font-size: 24px;
      margin-bottom: 30px;
    }
    
    
    .info-section {
      margin: 20px 0;
    }
    
    .info-row {
      margin-bottom: 8px;
      display: flex;
      font-size: 13px;
    }
    
    .info-label {
      width: 110px;
      font-weight: bold;
      font-size: 13px;
    }
    
    .info-value {
      flex: 1;
      word-wrap: break-word;
      font-size: 13px;
    }
    
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 13px;
    }
    
    .table th {
      background-color: #f8f9fa;
      padding: 10px 12px;
      text-align: left;
      font-weight: bold;
      border-bottom: 2px solid #dee2e6;
      font-size: 13px;
    }
    
    .table td {
      padding: 10px 12px;
      border-bottom: 1px solid #dee2e6;
      font-size: 12px;
    }
    
    .table tr:nth-child(even) {
      background-color: #fcfcfc;
    }
    
    .text-right {
      text-align: right;
    }
    
    .section-header {
      background-color: #2c3e50;
      color: white;
      padding: 12px;
      margin: -20px -20px 15px -20px;
      text-align: center;
      font-size: 16px;
      font-weight: bold;
    }
    
    .footer {
      position: fixed;
      bottom: 10px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9px;
      color: #999;
    }
    
    .recipient-section {
      font-size: 14px;
    }
    
    .recipient-company {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .recipient-details {
      color: #333;
      font-size: 13px;
      line-height: 1.8;
    }
    
    .notes {
      margin-top: 20px;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 8px;
      font-size: 13px;
    }
    
    .notes ol {
      margin: 10px 0;
      padding-left: 20px;
    }
    
    .notes li {
      margin-bottom: 8px;
    }
    
    .notes h3 {
      margin-top: 0;
    }
    
    .notes ul {
      margin: 10px 0;
      padding-left: 25px;
    }
    
    h3 {
      font-size: 15px;
      margin-top: 15px;
      margin-bottom: 10px;
      font-weight: bold;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- Page 1: Cover -->
  <div class="page">
    <div class="header">
      <h1 class="title">見 積 書</h1>
      <div class="project-name">${project.name}</div>
    </div>
    
    <!-- Recipient Information (Left side) -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
      <div class="recipient-section" style="flex: 1;">
        ${project.clientInfo?.companyName ? `
          <div class="recipient-company">${project.clientInfo.companyName} 御中</div>
          <div class="recipient-details">
            ${project.clientInfo.contactPerson ? `ご担当者：${project.clientInfo.contactPerson} 様<br>` : ''}
            ${project.clientInfo.department ? `部署：${project.clientInfo.department}<br>` : ''}
            ${project.clientInfo.address ? `住所：${project.clientInfo.address}<br>` : ''}
            ${project.clientInfo.phone ? `電話番号：${project.clientInfo.phone}` : ''}
          </div>
        ` : ''}
      </div>
      
      <!-- Date and Company Info (Right side) -->
      <div style="text-align: right;">
        <div style="margin-bottom: 20px;">発行日：${format(new Date(), 'yyyy年MM月dd日', { locale: ja })}</div>
        <div style="margin-bottom: 10px; font-size: 16px; font-weight: bold;">${companyInfo.name || 'スマート・ビルディング・プランナー'}</div>
        <div style="font-size: 13px; line-height: 1.6;">
          ${companyInfo.postalCode ? `〒${companyInfo.postalCode}<br>` : ''}
          ${companyInfo.address ? `${companyInfo.address}<br>` : ''}
          ${companyInfo.phone ? `TEL: ${companyInfo.phone}` : ''}
          ${companyInfo.fax ? ` / FAX: ${companyInfo.fax}` : ''}<br>
          ${companyInfo.representative ? `代表者: ${companyInfo.representative}<br>` : ''}
          ${companyInfo.license ? `${companyInfo.license}` : ''}
        </div>
      </div>
    </div>
    
    <!-- Project Information Box -->
    <div style="margin-top: 40px; border: 2px solid #333; border-radius: 8px; padding: 20px; background-color: #f9f9f9;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; width: 120px; font-weight: bold; vertical-align: top;">工事名称：</td>
          <td style="padding: 8px 0; font-size: 16px;"><strong>${project.name} 新築工事</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">工事場所：</td>
          <td style="padding: 8px 0;">${project.location.address}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">建物用途：</td>
          <td style="padding: 8px 0;">${project.buildingInfo.usage}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">構造・規模：</td>
          <td style="padding: 8px 0;">${project.buildingInfo.structure} ${project.buildingInfo.floors}階建</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">延床面積：</td>
          <td style="padding: 8px 0;">${totalFloorArea.toLocaleString()} ㎡</td>
        </tr>
        ${project.schedule?.startDate ? `
        <tr>
          <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">着工予定：</td>
          <td style="padding: 8px 0;">${new Date(project.schedule.startDate).toLocaleDateString('ja-JP')}</td>
        </tr>
        ` : ''}
        ${project.schedule?.completionDate ? `
        <tr>
          <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">竣工予定：</td>
          <td style="padding: 8px 0;">${new Date(project.schedule.completionDate).toLocaleDateString('ja-JP')}</td>
        </tr>
        ` : ''}
        ${project.schedule?.duration ? `
        <tr>
          <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">工期：</td>
          <td style="padding: 8px 0;">${project.schedule.duration}ヶ月</td>
        </tr>
        ` : ''}
      </table>
      
      <!-- Cost Summary Section -->
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #e8f4f8;">
            <td style="padding: 12px; font-size: 16px; font-weight: bold; border: 1px solid #3498db;">御見積金額（税込）</td>
            <td style="padding: 12px; font-size: 28px; font-weight: bold; text-align: right; border: 1px solid #3498db; color: #2c3e50;">
              ¥ ${Math.round(estimation.totalCost * 1.1).toLocaleString()} -
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-size: 13px; color: #666; border-left: 1px solid #ddd;">（税抜金額）</td>
            <td style="padding: 8px 12px; font-size: 14px; text-align: right; color: #666; border-right: 1px solid #ddd;">
              ¥ ${estimation.totalCost.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-size: 13px; color: #666; border-left: 1px solid #ddd; border-bottom: 1px solid #ddd;">（消費税額 10%）</td>
            <td style="padding: 8px 12px; font-size: 14px; text-align: right; color: #666; border-right: 1px solid #ddd; border-bottom: 1px solid #ddd;">
              ¥ ${Math.round(estimation.totalCost * 0.1).toLocaleString()}
            </td>
          </tr>
        </table>
      </div>
    </div>
    
    
    <div class="footer">
      1 / 4 | Smart Building Planner - AI Estimation System
    </div>
  </div>
  
  <!-- Page 2: Cost Breakdown -->
  <div class="page">
    <div class="section-header">建築工事費内訳書</div>
    
    <table class="table">
      <thead>
        <tr>
          <th style="width: 30%; text-align: left; padding-left: 12px;">工事項目</th>
          <th style="width: 20%; text-align: right; padding-right: 20px;">金額</th>
          <th style="width: 12%; text-align: center;">構成比</th>
          <th style="width: 38%; text-align: left; padding-left: 20px;">備考</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries({
          foundation: { name: '基礎工事関連', desc: '杭・地盤改良・山留・土工事・RC工事' },
          structure: { name: '躯体工事関連', desc: '鉄骨・断熱・防水・金属工事' },
          exterior: { name: '外装工事', desc: '外壁・屋根・建具・塗装工事' },
          interior: { name: '内装工事', desc: '内部仕上・建具・家具工事' },
          electrical: { name: '電気設備関連', desc: '受変電・照明・弱電・防災設備' },
          plumbing: { name: '給排水・衛生設備', desc: '給水・排水・衛生器具・ガス設備' },
          hvac: { name: '空調・換気設備', desc: '空調機器・ダクト・換気設備' },
          other: { name: 'その他工事', desc: '外構・植栽・サイン工事' },
          temporary: { name: '仮設工事', desc: '仮設事務所・仮囲い・養生' },
          design: { name: '設計・諸経費', desc: '設計監理費・諸経費' }
        }).map(([key, item]) => {
          const value = estimation.breakdown[key as keyof CostBreakdown]
          const percentage = (value / estimation.totalCost * 100).toFixed(1)
          return `
            <tr>
              <td style="text-align: left; padding-left: 12px;">${item.name}</td>
              <td style="text-align: right; padding-right: 20px;">¥${value.toLocaleString()}</td>
              <td style="text-align: center;">${percentage}%</td>
              <td style="text-align: left; padding-left: 20px; font-size: 11px; color: #6c757d;">${item.desc}</td>
            </tr>
          `
        }).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td style="font-weight: bold; text-align: left; padding-left: 12px;">工事費小計</td>
          <td style="font-weight: bold; text-align: right; padding-right: 20px;">¥${estimation.totalCost.toLocaleString()}</td>
          <td colspan="2"></td>
        </tr>
        <tr>
          <td style="font-weight: bold; text-align: left; padding-left: 12px;">消費税（10%）</td>
          <td style="font-weight: bold; text-align: right; padding-right: 20px;">¥${Math.round(estimation.totalCost * 0.1).toLocaleString()}</td>
          <td colspan="2"></td>
        </tr>
        <tr style="border-top: 2px solid #333;">
          <td style="font-weight: bold; font-size: 16px; text-align: left; padding-left: 12px;">総合計</td>
          <td style="font-weight: bold; font-size: 16px; text-align: right; padding-right: 20px;">¥${Math.round(estimation.totalCost * 1.1).toLocaleString()}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
    
    <div class="footer">
      2 / 4 | Smart Building Planner - AI Estimation System
    </div>
  </div>
  
  <!-- Page 3: Unit Prices -->
  <div class="page">
    <div class="section-header">単価情報・計算根拠</div>
    
    <h3>■ 基本情報</h3>
    <div class="info-section">
      <div class="info-row">
        <div class="info-label">延床面積：</div>
        <div class="info-value"><strong>${totalFloorArea.toLocaleString()} ㎡</strong></div>
      </div>
      <div class="info-row">
        <div class="info-label">建築面積：</div>
        <div class="info-value"><strong>${project.buildingInfo.buildingArea.toLocaleString()} ㎡</strong></div>
      </div>
      <div class="info-row">
        <div class="info-label">構造：</div>
        <div class="info-value"><strong>${project.buildingInfo.structure}</strong></div>
      </div>
      <div class="info-row">
        <div class="info-label">階数：</div>
        <div class="info-value"><strong>${project.buildingInfo.floors} 階</strong></div>
      </div>
      <div class="info-row">
        <div class="info-label">延床面積あたり単価：</div>
        <div class="info-value"><strong>¥${pricePerSqm.toLocaleString()}/㎡</strong></div>
      </div>
      <div class="info-row">
        <div class="info-label">坪単価：</div>
        <div class="info-value"><strong>¥${pricePerTsubo.toLocaleString()}/坪</strong></div>
      </div>
      ${estimation.schedule?.startDate ? `
      <div class="info-row">
        <div class="info-label">着工予定：</div>
        <div class="info-value"><strong>${new Date(estimation.schedule.startDate).toLocaleDateString('ja-JP')}</strong></div>
      </div>` : ''}
      ${estimation.schedule?.completionDate ? `
      <div class="info-row">
        <div class="info-label">竣工予定：</div>
        <div class="info-value"><strong>${new Date(estimation.schedule.completionDate).toLocaleDateString('ja-JP')}</strong></div>
      </div>` : ''}
      ${estimation.schedule?.duration ? `
      <div class="info-row">
        <div class="info-label">工期：</div>
        <div class="info-value"><strong>${estimation.schedule.duration}ヶ月</strong></div>
      </div>` : ''}
    </div>
    
    <h3>■ 主要工事単価</h3>
    <table class="table">
      <thead>
        <tr>
          <th style="text-align: left;">工事項目</th>
          <th style="text-align: right;">単価（円/㎡）</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align: left;">基礎工事</td>
          <td style="text-align: right;">¥${unitPrices.foundation.toLocaleString()}/㎡</td>
        </tr>
        <tr>
          <td style="text-align: left;">躯体工事</td>
          <td style="text-align: right;">¥${unitPrices.structure.toLocaleString()}/㎡</td>
        </tr>
        <tr>
          <td style="text-align: left;">外装工事</td>
          <td style="text-align: right;">¥${unitPrices.exterior.toLocaleString()}/㎡</td>
        </tr>
        <tr>
          <td style="text-align: left;">内装工事</td>
          <td style="text-align: right;">¥${unitPrices.interior.toLocaleString()}/㎡</td>
        </tr>
        <tr>
          <td style="text-align: left;">電気設備</td>
          <td style="text-align: right;">¥${unitPrices.electrical.toLocaleString()}/㎡</td>
        </tr>
        <tr>
          <td style="text-align: left;">給排水設備</td>
          <td style="text-align: right;">¥${unitPrices.plumbing.toLocaleString()}/㎡</td>
        </tr>
        <tr>
          <td style="text-align: left;">空調設備</td>
          <td style="text-align: right;">¥${unitPrices.hvac.toLocaleString()}/㎡</td>
        </tr>
      </tbody>
    </table>
    
    <div class="footer">
      3 / 4 | Smart Building Planner - AI Estimation System
    </div>
  </div>
  
  <!-- Page 4: Terms & Conditions -->
  <div class="page">
    <div class="section-header">ご注意事項</div>
    
    <div class="notes">
      <ol>
        <li>本見積書の有効期限は、発行日より30日間とさせていただきます。</li>
        <li>本見積金額には消費税（10%）が含まれております。</li>
        <li>地盤調査の結果により、地盤改良工事が必要となる場合は別途お見積りいたします。</li>
        <li>本見積書は概算見積りであり、詳細設計により金額が変動する場合があります。</li>
        <li>材料費の高騰により、見積金額が変更となる場合があります。</li>
        <li>本見積書に含まれない工事：
          <ul>
            <li>外構工事（別途お見積り）</li>
            <li>地盤改良工事（地盤調査後にお見積り）</li>
            <li>特殊な行政指導に伴う追加工事</li>
          </ul>
        </li>
        <li>お支払い条件：契約時30%、上棟時40%、完成時30%</li>
      </ol>
      
      <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
        ※ 本見積書はAIによる自動生成システムにより作成されています。<br>
        ※ 正式なご契約の際は、詳細な設計図書に基づく本見積書を作成いたします。
      </p>
    </div>
    
    <div class="footer">
      4 / 4 | Smart Building Planner - AI Estimation System
    </div>
  </div>
</body>
</html>
  `

  // Write the content to the new window
  printWindow.document.write(htmlContent)
  printWindow.document.close()

  // Wait for content to load then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
      // Note: We don't close the window automatically to allow the user to save as PDF
    }, 250)
  }
}

// Alternative method using data URL (for future implementation)
export const generateEstimationPDFDataUrl = async (
  project: Project,
  estimation: EstimationResult,
  unitPrices: any
): Promise<string> => {
  // This could be implemented to return a data URL of the PDF
  // For now, we'll use the print method above
  return ''
}