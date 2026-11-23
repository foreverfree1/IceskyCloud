'use strict';
// 独立维护演示来源，不改写原始导出，也不预填发货行上的客户品名或产值单价。
(() => {
 const report=window.REPORT_DATA,sources=report.businessSources;
 const samples=[
  ['H1B000101','米宝绒·自然白',4.60],['H1B000102','米宝绒·自然白',4.60],
  ['H1B000103','米宝绒·奶白',4.65],['H1B000104','米宝绒·奶白',4.65],
  ['H1B000105','米宝绒·浅燕麦',4.85],['H1B000106','米宝绒·浅燕麦',4.85],
  ['H1B000107','米宝绒·银灰',4.90],['H1B000108','米宝绒·银灰',4.90],
  ['H1B000109','米宝绒·浅卡其',5.10],['H1B000110','米宝绒·浅卡其',5.10],
  ['H1B000111','米宝绒·深卡其',5.15],['H1B000112','米宝绒·深卡其',5.15],
  ['H1B000113','米宝绒·烟灰',4.60],['H1B000114','米宝绒·烟灰',4.60],
  ['H1B000115','米宝绒·雾蓝',4.65],['H1B000116','米宝绒·雾蓝',4.65],
  ['H1B000117','米宝绒·浅咖',4.85],['H1B000118','米宝绒·浅咖',4.85],
  ['H1B000119','米宝绒·暖白',4.90],['H1B000120','米宝绒·暖白',4.90]
 ];
 for(const [card,remark,price] of samples){
  const shipments=report.out.filter(row=>row.flow===card&&row.flowId);
  const row=shipments[0];
  if(!row)continue;
  const receipt=sources.greyReceipts.find(line=>line.F_BaseEquipId===row.flowId);
  if(receipt&&!receipt.F_ItemRemark?.trim())receipt.F_ItemRemark=remark;
  const intake=report.in.find(line=>line.flowId===row.flowId&&line.flow===card);
  if(!intake)continue;
  const company=row.companyCode??intake.companyCode??'DEMO01';
  if(intake.companyCode!=null&&intake.companyCode!==company)continue;
  intake.companyCode=company;
  for(const shipment of shipments)if(shipment.flowId===row.flowId)shipment.companyCode??=company;
  if(!sources.inbound.some(line=>line.gsbh===company&&line.lzkh===card)){
   intake.productionPrice??=price;
   sources.inbound.push({gsbh:company,lzkh:card,sldh:intake.inNo,czdj:intake.productionPrice});
  }
 }
})();
