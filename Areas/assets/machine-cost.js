'use strict';
const equipmentById=new Map(window.COST_DATA.equipment.map(row=>[row.id,row]));
for(const source of window.COST_DATA.cards||[]){if(!flowCards.has(source.id)){const card={...source};const spotId=String(card.requirements.F_SpotColorId||'').toLowerCase();card.spotId=spotOrders.has(spotId)?spotId:null;flowCards.set(card.id,card);}}
let machineContext=null,dyeApplied={},dyePage=1,dyeSort=-1;
const dyeFields=[['from','制单日期起','date'],['to','制单日期止','date'],['flow','流程卡号'],['formula','配方单号'],['machine','机台号'],['person','操作工']];
$('#dye-search-fields').innerHTML=dyeFields.map(([key,label,type])=>'<label class="dye-field"><span>'+label+'</span><input id="dye-'+key+'" '+(type==='date'?'type="date"':'placeholder="输入'+label+'"')+' aria-label="'+label+'"></label>').join('');
function switchReportPage(page){
  activeReportPage=page;const dye=page==='dye';
  $('main>.workspace').hidden=dye;$('#dye-workspace').hidden=!dye;
  $('.page-header>.header-actions').hidden=dye;$('#dye-header-actions').hidden=!dye;
  $('.page-header h1').textContent=dye?'染色刷卡':'成品入库和成品发货对帐';
  $('.breadcrumb').textContent=dye?'报表中心 / 财务报表 / 染色刷卡':'报表中心 / 财务报表 / 成品入库和成品发货对帐';
  if(dye)renderDye();syncSidebar();
}
function dyeResults(){return window.COST_DATA.swipes.filter(row=>{const date=row.date?.slice(0,10)||'';if(dyeApplied.from&&date<dyeApplied.from||dyeApplied.to&&date>dyeApplied.to)return false;return [['flow',row.flow],['formula',row.source.F_FormulaCode],['machine',row.machine],['person',row.source.F_Name]].every(([key,value])=>!dyeApplied[key]||String(value??'').toLowerCase().includes(dyeApplied[key].toLowerCase()));}).sort((a,b)=>String(a.date).localeCompare(String(b.date))*dyeSort);}
function machineButton(machineId,cardId,swipeId,label){return machineId?'<button class="link" data-machine-id="'+esc(machineId)+'" data-machine-card="'+esc(cardId)+'" data-machine-swipe="'+esc(swipeId)+'">'+esc(label)+'</button>':esc(label);}
function renderDye(){const rows=dyeResults(),pages=Math.max(1,Math.ceil(rows.length/20));dyePage=Math.min(dyePage,pages);const current=rows.slice((dyePage-1)*20,dyePage*20);const headers=['序号','制单时间','配方单号','流程卡号','机台号','操作工','班次','配方性质','总匹数','总重量','是否作废'];$('#dye-grid').innerHTML='<table><thead><tr>'+headers.map((label,index)=>'<th>'+(index===1?'<button id="dye-sort">'+label+(dyeSort===1?' ↑':' ↓')+'</button>':label)+'</th>').join('')+'</tr></thead><tbody>'+(current.length?current.map((row,index)=>'<tr><td>'+((dyePage-1)*20+index+1)+'</td><td>'+esc(row.date)+'</td><td>'+esc(row.source.F_FormulaCode)+'</td><td>'+flowLink({flowId:row.cardId,flow:row.flow})+'</td><td>'+machineButton(row.machineId,row.cardId,row.id,row.machine)+'</td>'+['F_Name','F_ShiftListName','F_NatureName','F_TotalPieceCount','F_TotalPieceWeight','F_IsVoidName'].map(key=>'<td>'+esc(key==='F_NatureName'?row.nature:row.source[key])+'</td>').join('')+'</tr>').join(''):'<tr class="blank-row">'+headers.map(()=>'<td></td>').join('')+'</tr>')+'</tbody></table>';$('#dye-count').textContent='共 '+rows.length+' 条';$('#dye-page').textContent=dyePage+' / '+pages;$('#dye-prev').disabled=dyePage===1;$('#dye-next').disabled=dyePage===pages;$('#dye-sort').onclick=()=>{dyeSort=-dyeSort;renderDye();};}
$('#dye-search').onsubmit=event=>{event.preventDefault();const next=Object.fromEntries(dyeFields.map(([key])=>[key,$('#dye-'+key).value.trim()]));if(next.from&&next.to&&next.from>next.to){$('#dye-search-error').textContent='制单日期起不能晚于制单日期止。';return;}$('#dye-search-error').textContent='';dyeApplied=next;dyePage=1;renderDye();};
$('#dye-reset').onclick=()=>{dyeApplied={};dyePage=1;dyeFields.forEach(([key])=>$('#dye-'+key).value='');$('#dye-search-error').textContent='';renderDye();};
$('#dye-prev').onclick=()=>{dyePage--;renderDye();};$('#dye-next').onclick=()=>{dyePage++;renderDye();};
const dyeExportFields=[['date','制单时间'],['formula','配方单号'],['flow','流程卡号'],['machine','机台号'],['person','操作工'],['nature','配方性质']];
function dyeExportRows(){return dyeResults().map(row=>({date:row.date,formula:row.source.F_FormulaCode,flow:row.flow,machine:row.machine,person:row.source.F_Name,nature:row.nature}));}
$('#dye-export').onclick=()=>{const rows=dyeExportRows();if(!rows.length)return;const lines=[dyeExportFields.map(([,label])=>label),...rows.map(row=>dyeExportFields.map(([key])=>row[key]))];const url=URL.createObjectURL(new Blob(['\ufeff'+lines.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='染色刷卡.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#dye-print').onclick=()=>{const rows=dyeExportRows();if(!rows.length)return;$('#print-area').innerHTML='<h1>染色刷卡</h1>'+costTable(dyeExportFields,rows);window.print();};
function machineLinkForSwipe(card,swipe){if(!swipe?.F_MachineCode)return '';const code=swipe.F_MachineCode,matches=window.COST_DATA.equipment.filter(row=>row.header.F_EquipCode===code||row.id===String(code).toLowerCase());return machineButton(matches.length===1?matches[0].id:null,card.id,'',matches.length===1?matches[0].header.F_EquipCode:code);}
function costForm(fields,values={}){return '<div class="machine-form">'+fields.map(([key,label])=>'<label class="flow-info-field"><span>'+label+'</span><input readonly aria-label="'+label+'" value="'+esc(values[key])+'"></label>').join('')+'</div>';}
function costTable(fields,rows){return '<div class="machine-table"><table><thead><tr>'+fields.map(([,label])=>'<th>'+label+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.map(row=>'<tr>'+fields.map(([key])=>'<td>'+esc(['price','effectivePrice'].includes(key)?fmt(row[key],'approvalPrice'):key==='cost'?fmt(row[key],'amount'):row[key])+'</td>').join('')+'</tr>').join(''):'<tr class="blank-row">'+fields.map(()=>'<td></td>').join('')+'</tr>')+'</tbody></table></div>';}
const equipmentFields=[['F_EquipCode','设备编号'],['F_EquipName','设备名称'],['F_EquipModel','设备型号'],['F_EquipmentCategoryName','设备类别'],['F_DeptName','使用部门'],['F_EquipmentStatusName','设备状态'],['F_MinCount','最小缸载量'],['F_MaxCount','最大缸载量'],['F_CylinderType','设备管数'],['F_InstallLocation','安装位置'],['F_Manufacturer','生产厂家'],['F_OutFactoryCode','出厂编号'],['F_PurchaseDate','购置日期'],['F_UseStartDate','启用日期'],['F_MaintainCycle','保养周期'],['F_ExpectedUseYears','预计使用年限'],['F_DutyPersonName','责任人'],['F_ColorSchemeName','设备生产色系']];
const actualFields=[['date','出库时间'],['materialCode','物料编号'],['materialName','物料名称'],['batch','出库批次'],['quantity','实际出库数量'],['unit','单位'],['price','批次成本单价'],['ratio','分比'],['effectivePrice','价格/分比'],['cost','使用成本']];
function materialCostSummary(formulas){const summary={};for(const kind of ['dye','finish']){const list=formulas.filter(row=>row.kind===kind),used=list.flatMap(row=>row.actual);summary[kind]=used.length&&!list.some(row=>row.shared)&&used.every(row=>row.cost!=null)?used.reduce((n,row)=>n+Math.round(row.cost*100),0)/100:null;}summary.total=summary.dye!==null&&summary.finish!==null?(Math.round(summary.dye*100)+Math.round(summary.finish*100))/100:null;return summary;}
// 金额按批次汇总后再除以公斤数；用十进制整数运算将单耗四舍五入到四位。
function materialCostPerKg(amount,weight){
  if(amount==null||amount===''||weight==null||weight===''||!Number.isFinite(Number(amount))||!Number.isFinite(Number(weight))||Number(weight)<=0)return null;
  const fraction=value=>{const m=String(value).match(/^(-?)(\d+)(?:\.(\d+))?$/);return m?{value:BigInt(m[1]+m[2]+(m[3]||'')),scale:10n**BigInt((m[3]||'').length)}:null;},a=fraction(amount),w=fraction(weight);if(!a||!w)return null;
  let numerator=a.value*w.scale*10000n,denominator=a.scale*w.value;const negative=numerator<0n;numerator=negative?-numerator:numerator;const rounded=(numerator+denominator/2n)/denominator;return Number(negative?-rounded:rounded)/10000;
}
function actualMaterialSwipeWeight(card,formulas,kind){
  const list=formulas.filter(row=>row.kind===kind);if(!list.length)return null;
  const processes=new Set(kind==='dye'?['染色']:list.map(row=>String(row.header.F_NextProcess??'').trim()));if(processes.has(''))return null;
  const selected=[...card.route.flatMap(step=>step.swipes),...card.extraSwipes].filter(row=>processes.has(String(row.F_NowProcess??'').trim())),unique=new Map();
  if(!selected.length)return null;
  for(const row of selected){const id=String(row.F_Id??'').toLowerCase(),value=row.F_ActulWeight;if(!id||value==null||value===''||!Number.isFinite(Number(value)))return null;const existing=unique.get(id);if(existing&&Number(existing.F_ActulWeight)!==Number(value))return null;unique.set(id,row);}
  return [...unique.values()].reduce((sum,row)=>sum+Math.round(Number(row.F_ActulWeight)*100),0)/100;
}
function formulaReviewRecords(formula){
  if(!formula?.cardIds.includes(machineContext.cardId))return {notices:[],agreements:[],wholeTankSummary:'',overCostSummary:''};
  const key=v=>String(v??'').toLowerCase(),source=window.COST_DATA.review||{},header=formula?.header||{},card=flowCards.get(machineContext.cardId),spotId=key(card?.requirements.F_SpotColorId);
  // 源流程按点色单及色号定位通知；F_WchEquipCode不是染色机台号。
  const notices=(source.notices||[]).filter(row=>!row.F_DeleteTime&&spotId&&key(row.F_SpotColorId)===spotId&&row.F_ColorNo===header.F_ColorNo);
  const newId=key(header.F_NewFormulaId),agreements=(source.agreements||[]).filter(row=>!row.F_DeleteTime&&newId&&key(row.F_FormulaId)===newId);
  // 已确认按关联协议判定；协议是否确认生产另行显示，不参与“有协议”的判断。
  return {notices,agreements,wholeTankSummary:notices.length?'有包缸通知':'',overCostSummary:agreements.length?'是':''};
}
function agreementButtons(agreements){return agreements.map((row,i)=>'<button type="button" data-formula-agreement="'+esc(row.F_Id)+'">查看协议'+(agreements.length>1?' '+(i+1):'')+'</button>').join('');}
// 按用户确认，将协议来源加染费除以1000后显示为元/kg；来源值保持不变。
function agreementForDisplay(agreement){
  const value=agreement.F_DyeingFee,known=value!=null&&String(value).trim()!==''&&Number.isFinite(Number(value));
  return {...agreement,dyeingFeePerKg:known?(Number(value)/1000).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:5}):''};
}
function formulaReviewHTML(review){
  return '<div class="formula-reviews"><details'+(review.notices.length?' open':'')+'><summary>包缸通知</summary>'+costTable([['F_NoticeCode','通知单号'],['F_NoticeDay','通知日期'],['F_OrderCode','本厂订单号'],['F_ColorNo','色号'],['F_Color','颜色'],['F_WchEquipCode','坯布来源编号'],['F_TankReasonName','包缸原因'],['F_TankLevel','包缸等级'],['F_ActualWeight','实际重量'],['F_IsAgreeName','客户意见'],['F_Remark','备注']],review.notices)+'</details><details'+(review.agreements.length?' open':'')+'><summary>超成本协议</summary>'+'<div class="agreement-actions">'+agreementButtons(review.agreements)+'</div>'+ costTable([['F_FormulaCode','关联配方单号'],['F_ProcessCode','流程卡号'],['F_CusName','客户名称'],['F_ColorNo','色号'],['F_Color','颜色'],['F_IsOverPrice','超成本'],['dyeingFeePerKg','加染费（元/kg）'],['F_IsCusAgree','客户确认'],['F_CreatorTime','创建时间'],['F_Remark','备注']],review.agreements.map(agreementForDisplay))+'</details></div>';
}
function renderFormula(kind){const formulas=window.COST_DATA.formulas.filter(row=>row.kind===kind&&row.cardIds.includes(machineContext.cardId)),select=$('#machine-'+kind+'-select'),formula=formulas.find(row=>row.id===select?.value)||formulas[0];
  const headerFields=kind==='dye'?[['F_FormulaCode','生产配方单号'],['F_ProcessCode','流程卡号'],['F_EquipCode','配方机台号'],['F_NatureName','配方性质'],['F_TotalPieceCount','总匹数'],['F_TotalPieceWeight','总重量'],['F_BathRatio','浴比'],['F_WaterUsage','用水量'],['F_DyeProcessCode','染色工艺号'],['F_PersonName','调方人'],['F_StatusName','审批状态']]:[['F_FormulaCode','定型配方单号'],['F_ProcessCode','流程卡号'],['F_NextProcess','工序'],['F_NatureName','配方性质'],['F_Temperature','定型温度'],['F_Speed','标准车速'],['F_OverFeed','超喂'],['F_OutWidth','下机门幅'],['F_OutGramWeight','下机克重'],['F_FirstPress','第一轧车压力'],['F_SecondPress','第二轧车压力'],['F_CoolTypeName','冷却方式'],['F_BathRatio','浴比'],['F_WaterUsage','用水量'],['F_StatusName','审批状态']];
  const recipeFields=kind==='dye'?[['F_ProcessStep','工艺步骤'],['F_MatCode','物料编号'],['F_MatName','物料名称'],['F_Concentration','浓度用量'],['F_TotalConcentration','配方用料值'],['F_MaterialUnitName','配方单位'],['F_ActulUse','配方用量'],['Unit','用量单位']]:[['F_MatCode','物料编号'],['F_MatName','物料名称'],['F_NormalDose','标准添加量（g/L）'],['F_MaterialUnitName','配方单位']];
  recipeFields.push(['ratio','物料分比'],['price','实际批次价格'],['actualQuantity','实际出库用量'],['actualUnit','出库单位'],['cost','使用成本']);
  const review=kind==='dye'?formulaReviewRecords(formula):null;
  if(review)headerFields.push(['wholeTankSummary','包缸'],['overCostSummary','超成本']);
  $('#machine-'+kind+'-body').innerHTML='<section class="machine-section"><h3>生产配方</h3>'+costForm(headerFields,{...formula?.header,...review})+(review?formulaReviewHTML(review):'')+'</section><section class="machine-section"><h3>配方物料</h3>'+costTable(recipeFields,(formula?.plans||[]).map(row=>({...row.source,...row})))+'</section><section class="machine-section"><h3>实际用料批次</h3>'+costTable(actualFields,formula?.actual||[])+'</section>';
}
document.addEventListener('click',event=>{
  const trigger=event.target.closest('[data-formula-agreement]');if(!trigger)return;
  const formula=window.COST_DATA.formulas.find(row=>row.id===$('#machine-dye-select').value&&row.kind==='dye'&&row.cardIds.includes(machineContext.cardId));
  const agreement=formulaReviewRecords(formula).agreements.find(row=>String(row.F_Id).toLowerCase()===trigger.dataset.formulaAgreement.toLowerCase());if(!agreement)return;
  $('#agreement-title').textContent='超成本协议'+(agreement.F_FormulaCode?' · '+agreement.F_FormulaCode:'');
  const fields=[['F_FormulaCode','关联配方单号'],['F_ProcessCode','流程卡号'],['F_CusName','客户名称'],['F_ProductName','品名'],['F_ColorNo','色号'],['F_Color','颜色'],['F_ComponentName','成分'],['F_LightSourceName','光源'],['F_Fastness','牢度要求'],['F_SpecialProcess','特殊工艺'],['F_IsOverPrice','超成本'],['dyeingFeePerKg','加染费（元/kg）'],['F_IsCusAgree','客户确认'],['F_ActualSapTime','复样时间'],['F_CreatorTime','创建时间'],['F_CreatorUserName','制单人']];
  $('#agreement-body').innerHTML=costForm(fields,agreementForDisplay(agreement))+'<label class="flow-info-field agreement-remark"><span>备注</span><textarea readonly aria-label="协议备注">'+esc(agreement.F_Remark)+'</textarea></label>';
  openDialog($('#agreement-dialog'),trigger);
});
// 设备、配方和成本统一放入流程卡弹窗，所有页签随当前卡重新加载。
for(const [name,label] of [['equipment','设备信息'],['dye','染色配方与用料'],['finish','定型配方与用料'],['costs','成本汇总']]){
  const button=document.createElement('button');button.id='flow-tab-machine-'+name;button.dataset.flowTab='machine-'+name;button.setAttribute('role','tab');button.setAttribute('aria-selected','false');button.setAttribute('aria-controls','flow-machine-'+name);button.tabIndex=-1;button.textContent=label;$('#flow-dialog .flow-tabs').append(button);
  const panel=document.createElement('section');panel.id='flow-machine-'+name;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);panel.hidden=true;panel.innerHTML='<div id="machine-'+name+'"></div>';$('#flow-dialog .flow-content').append(panel);
}
function cardEquipment(card){const formulas=window.COST_DATA.formulas.filter(row=>row.cardIds.includes(card.id)),swipes=window.COST_DATA.swipes.filter(row=>row.cardId===card.id),codes=new Set([...formulas.map(row=>row.header.F_EquipCode),...swipes.map(row=>row.machine),...card.route.flatMap(step=>step.swipes.map(row=>row.F_MachineCode)),...card.extraSwipes.map(row=>row.F_MachineCode)].filter(Boolean));return window.COST_DATA.equipment.filter(row=>codes.has(row.header.F_EquipCode));}
function renderCardEquipment(machineId,swipeId){
  const card=flowCards.get(machineContext.cardId),items=cardEquipment(card),item=items.find(row=>row.id===machineId)||items[0],swipe=window.COST_DATA.swipes.find(row=>row.id===swipeId&&row.cardId===card.id&&row.machineId===item?.id),swipes=swipe?[swipe]:window.COST_DATA.swipes.filter(row=>row.cardId===card.id&&item&&row.machineId===item.id);
  $('#machine-equipment').innerHTML='<label class="machine-selector"><span>机台号</span><select id="flow-machine-select" aria-label="流程卡机台" '+(!items.length?'disabled':'')+'>'+items.map(row=>'<option value="'+esc(row.id)+'" '+(row.id===item?.id?'selected':'')+'>'+esc(row.header.F_EquipCode)+'</option>').join('')+'</select></label><section class="machine-section"><h3>设备信息</h3>'+costForm(equipmentFields,item?.header)+'</section><section class="machine-section"><h3>缸载量与浴比</h3>'+costTable([['F_MinCount','最小缸载量'],['F_MaxCount','最大缸载量'],['F_BathRatio','浴比']],item?.baths||[])+'</section><section class="machine-section"><h3>刷卡工艺步骤</h3>'+costTable([['formula','配方单号'],['date','刷卡时间'],['F_TechniqueName','工艺步骤'],['F_NowPercent','本次完成比例（%）'],['F_CompletePercent','累计完成比例（%）'],['F_LastPercent','已完成比例（%）']],swipes.flatMap(row=>row.steps.map(step=>({...step,formula:row.source.F_FormulaCode,date:row.date}))))+'</section>';
  $('#flow-machine-select').onchange=event=>renderCardEquipment(event.target.value);
}
function renderCardMaterials(card){const formulas=window.COST_DATA.formulas.filter(row=>row.cardIds.includes(card.id));machineContext={cardId:card.id};renderCardEquipment();
  for(const kind of ['dye','finish']){const list=formulas.filter(row=>row.kind===kind);$('#machine-'+kind).innerHTML='<label class="machine-selector"><span>生产配方</span><select id="machine-'+kind+'-select" aria-label="'+(kind==='dye'?'染色':'定型')+'生产配方">'+list.map(row=>'<option value="'+row.id+'">'+esc(row.header.F_FormulaCode)+'</option>').join('')+'</select></label><div id="machine-'+kind+'-body"></div>';$('#machine-'+kind+'-select').onchange=()=>renderFormula(kind);renderFormula(kind);}
  const amounts=materialCostSummary(formulas),summary=Object.fromEntries(Object.entries(amounts).map(([key,value])=>[key,value===null?null:fmt(value,'amount')])),unitSummary={};
  for(const kind of ['dye','finish']){const weight=actualMaterialSwipeWeight(card,formulas,kind),unit=materialCostPerKg(amounts[kind],weight);unitSummary[kind+'Weight']=weight===null?null:fmt(weight,'net');unitSummary[kind+'PerKg']=unit===null?null:unit.toLocaleString('zh-CN',{minimumFractionDigits:4,maximumFractionDigits:4});}
  $('#machine-costs').innerHTML='<section class="machine-section machine-unit-cost-form"><h3>每公斤材料成本</h3>'+costForm([['dyeWeight','染色刷卡重量（公斤）'],['finishWeight','定型刷卡重量（公斤）'],['dyePerKg','染色成本（元/公斤）'],['finishPerKg','定型成本（元/公斤）']],unitSummary)+'</section><section class="machine-section"><h3>材料使用成本（元）</h3>'+costForm([['dye','染色材料使用成本'],['finish','定型材料使用成本'],['total','合计材料使用成本']],summary)+'</section><section class="machine-section"><h3>染色实际用料</h3>'+costTable(actualFields,formulas.filter(row=>row.kind==='dye').flatMap(row=>row.actual))+'</section><section class="machine-section"><h3>定型实际用料</h3>'+costTable(actualFields,formulas.filter(row=>row.kind==='finish').flatMap(row=>row.actual))+'</section>';
}
const openFlowWithRequirements=openFlow;
openFlow=function(id,trigger){const card=flowCards.get(id);if(!card)return;renderCardMaterials(card);$('#flow-dialog').dataset.cardId=id;openFlowWithRequirements(id,trigger);};
function openMachine(id,cardId,swipeId,trigger){if(!equipmentById.has(id)||!flowCards.has(cardId))return;if(!$('#flow-dialog').open||$('#flow-dialog').dataset.cardId!==cardId)openFlow(cardId,trigger);renderCardEquipment(id,swipeId);setFlowTab('machine-equipment');}
document.addEventListener('click',event=>{const button=event.target.closest('[data-machine-id]');if(button)openMachine(button.dataset.machineId,button.dataset.machineCard,button.dataset.machineSwipe,button);});
$$('[data-flow-tab]').forEach(button=>{button.onclick=()=>setFlowTab(button.dataset.flowTab);button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=$$('[data-flow-tab]'),index=tabs.indexOf(button),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;setFlowTab(tabs[next].dataset.flowTab,true);};});
renderDye();
