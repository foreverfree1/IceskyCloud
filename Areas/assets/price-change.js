"use strict";
// 发货查询和完整变更单分别维护各自的页面状态，只在审核通过后接收卡级价格。
const shipmentPriceDialog=$('#price-change-dialog'), shipmentPriceFrame=$('#shipment-price-editor');
const shipmentPriceKey='finance-shipment-approved-execution-v1';
const shipmentPriceOrigin=location.protocol==='file:'?'null':location.origin;
let shipmentPriceContext=null, shipmentPriceRevision=0;
let approvedShipmentPrices={};
try{approvedShipmentPrices=JSON.parse(localStorage.getItem(shipmentPriceKey))||{};}catch{}
function executionPriceFor(card,line){return card.executionPriceOverrides?.[line.F_Id.toLowerCase()]??line.F_ExecPrice;}
function packagingPriceFor(card,line){return card.packagingPriceOverrides?.[line.F_Id.toLowerCase()]??null;}
function updateShipmentCard(card,prices,packPrices={}){
  let updated=false;
  for(const line of card.priceApproval.lines){
    const value=prices?.[line.F_Id];
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||!Number.isSafeInteger(Math.round(value*10000)))continue;
    card.executionPriceOverrides??={};card.executionPriceOverrides[line.F_Id.toLowerCase()]=value;updated=true;
    if(card.priceApproval.lines.length===1)
      for(const row of [...data.in,...data.out])if(row.flowId===card.id)row.execPrice=value;
  }
  for(const line of card.priceApproval.lines){
    const value=packPrices?.[line.F_Id];
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||!Number.isSafeInteger(Math.round(value*10000)))continue;
    card.packagingPriceOverrides??={};card.packagingPriceOverrides[line.F_Id.toLowerCase()]=value;updated=true;
  }
  return updated;
}
for(const card of flowCards.values())if(card.priceApproval?.lines.length&&Object.hasOwn(approvedShipmentPrices,card.id))
  updateShipmentCard(card,approvedShipmentPrices[card.id].prices??approvedShipmentPrices[card.id],approvedShipmentPrices[card.id].packPrices);
render();
function openPriceChange(rowId,trigger){
  const row=data.out.find(item=>item.id===rowId),card=row&&flowCards.get(row.flowId),approval=card?.priceApproval;
  if(!hasEffectivePriceChangeSource(approval))return;
  shipmentPriceContext={row,card,revision:++shipmentPriceRevision};
  const embedded=document.getElementById('shipment-price-document');
  if(!embedded)throw new Error('缺少内嵌价格变更单');
  shipmentPriceFrame.srcdoc=JSON.parse(embedded.textContent);
  openDialog(shipmentPriceDialog,trigger);
}
function sendShipmentContext(){
  if(!shipmentPriceDialog.open||!shipmentPriceContext)return;
  const {row,card,revision}=shipmentPriceContext;
  shipmentPriceFrame.contentWindow.postMessage({type:'shipment-price-context',revision,outNo:row.outNo,
    approval:card.priceApproval,currentPrices:Object.fromEntries(card.priceApproval.lines.map(line=>[line.F_Id,executionPriceFor(card,line)])),
    currentPackPrices:Object.fromEntries(card.priceApproval.lines.map(line=>[line.F_Id,packagingPriceFor(card,line)])),
    card:{id:card.id,approvalId:card.priceApproval.F_Id,number:card.number,details:{
      F_LotCode:card.vat,F_CusName:card.customer,F_MatCode:card.cloth,F_MatName:card.product,
      F_ColorNo:card.colorCode,F_Color:card.color,F_FlowStep:card.priceApproval.F_FlowStep,
      F_Remark:card.remark,...(window.SHIPMENT_PRICE_CARDS?.[card.id]??{})
    }}},shipmentPriceOrigin==='null'?'*':shipmentPriceOrigin);
}
window.addEventListener('message',event=>{
  if(event.source!==shipmentPriceFrame.contentWindow||event.origin!==shipmentPriceOrigin||!shipmentPriceDialog.open||!shipmentPriceContext)return;
  const message=event.data;
  if(message?.type==='shipment-price-ready'){sendShipmentContext();return;}
  const {card,revision}=shipmentPriceContext;
  if(message?.revision!==revision)return;
  if(message.type==='shipment-price-close'){shipmentPriceDialog.close();return;}
  if(message.type!=='shipment-price-approved'||message.cardId!==card.id||message.approvalId!==card.priceApproval.F_Id)return;
  if(updateShipmentCard(card,message.prices,message.packPrices)){
    const previous=approvedShipmentPrices[card.id]||{};
    approvedShipmentPrices[card.id]={prices:{...(previous.prices??previous),...message.prices},packPrices:{...previous.packPrices,...message.packPrices}};
    try{localStorage.setItem(shipmentPriceKey,JSON.stringify(approvedShipmentPrices));}catch{}
  }
  render();
  if(message.fresh)toast('审核通过，当前卡价格已更新，查询已刷新。');
});
shipmentPriceDialog.addEventListener('close',()=>{shipmentPriceContext=null;shipmentPriceFrame.removeAttribute('srcdoc');shipmentPriceFrame.removeAttribute('src');});
$('#open-price-change').onclick=event=>{if(selectedId)openPriceChange(selectedId,event.currentTarget);};
