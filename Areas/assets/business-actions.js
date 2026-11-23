'use strict';
// 页首保存记录出库明细的产值单价、产值金额及打印品名文字。
let businessContext=null;
const businessTitles={inbound:'取成品入库产值单价',editName:'修改打印品名'};
const customerProductCell='[data-fill-field="customerProduct"]';
const isName=kind=>kind==='editName';
const businessFields=['productionPrice','productionAmount','customerProduct'];
const businessSaved=new Map(data.out.map(r=>[r.id,Object.fromEntries(businessFields.map(k=>[k,k==='customerProduct'?persistedPrintProducts.get(r.id):r[k]]))]));
function businessDirty(){return data.out.filter(r=>businessFields.some(k=>r[k]!==businessSaved.get(r.id)?.[k]));}
function businessTargets(){
 return result().filter(r=>$('#business-scope')?.value==='all'||r.id===businessContext?.selectedId);
}
function businessNumber(v){return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));}
function inboundSource(row){return (window.REPORT_DATA.businessSources?.inbound||[]).find(s=>businessEqual(s.gsbh,row.companyCode)&&businessEqual(s.lzkh,row.flow));}
function assessInbound(row){
 const source=inboundSource(row);
 if(!businessNumber(source?.czdj))return {issue:'price'};
 const price=Number(source.czdj);
 if(price!==0&&!businessNumber(row.settleQuantity))return {price,issue:'quantity'};
 return {price,patch:{productionPrice:price,productionAmount:price===0?0:moneyProduct(price,row.settleQuantity,4)}};
}
function inboundNotice(entries){
 const reasons={price:'未找到可用的入库产值单价',quantity:'缺少发货结算数量'};
 const messages=[];
 for(const [key,label] of Object.entries(reasons)){
  const affected=entries.filter(entry=>entry.issue===key);
  if(!affected.length)continue;
  const first=affected[0].row,card=first.flow?'流转卡 '+first.flow:'发货明细 '+first.outNo;
  messages.push(affected.length===1?card+' '+label:affected.length+' 条发货明细'+label+'（如'+card+'）');
 }
 return messages.length?messages.join('；')+'。原产值未修改。':'';
}
function evaluateBusinessRows(kind,rows){
 return rows.map(row=>({row,...(kind==='inbound'?assessInbound(row):{patch:{customerProduct:$('#business-name').value.trim()}})}));
}
function businessPreview(){
 if(!businessContext)return;
 const kind=businessContext.kind,entries=evaluateBusinessRows(kind,businessTargets()),labels=['发货单号','流转卡号','客户名称'];
 if(kind==='inbound')labels.push('入库产值单价','原产值单价','结算数量','新产值金额');
 if(isName(kind))labels.push('当前打印品名','新打印品名');
 const text=entries.map(({row:r,patch:change,price})=>{const cells=[r.outNo,r.flow,r.customer].map(esc);
  if(kind==='inbound')cells.push(esc(fmt(price,'productionPrice')),esc(fmt(r.productionPrice,'productionPrice')),esc(fmt(r.settleQuantity,'settleQuantity')),esc(fmt(change?.productionAmount,'productionAmount')));
  if(isName(kind))cells.push(esc(r.customerProduct),esc($('#business-name').value.trim()));
  return '<tr>'+cells.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
 }).join('');
 $('#business-preview').innerHTML='<table><thead><tr>'+labels.map(v=>'<th>'+v+'</th>').join('')+'</tr></thead><tbody>'+(text||'<tr>'+labels.map(()=>'<td></td>').join('')+'</tr>')+'</tbody></table>';
 const notice=kind==='inbound'?inboundNotice(entries):'';
 if(kind==='inbound'){
  $('#business-error').textContent=notice;
  $('#business-save-hint').hidden=Boolean(notice);
 }
 $('#business-save').disabled=!entries.length||Boolean(notice);
}
function openBusiness(kind,trigger,singleRow=false){
 if(!['inbound','editName'].includes(kind))return;
 const row=result().find(r=>r.id===selectedId);if(!row){toast('请先选择一条发货明细');return;}
 businessContext={kind,selectedId:row.id};$('#business-title').textContent=businessTitles[kind];$('#business-error').textContent='';$('#business-save').textContent='确定';
 let fields='<label class="business-field full"><span>作用范围</span><select id="business-scope"><option value="current">当前选中明细 · '+esc(row.outNo)+' / '+esc(row.flow)+'</option><option value="all">当前查询结果 · '+result().length+' 条明细</option></select></label>';
 if(singleRow)fields='';
 if(kind==='inbound')fields+='<p class="business-rule full">按同公司、同流转卡取入库首条产值单价；产值金额＝产值单价 × 发货结算数量，保留4位小数。</p>';
 if(isName(kind))fields+='<label class="business-field full"><span>打印品名<em>*</em></span><input id="business-name" aria-label="打印品名" maxlength="50" autocomplete="off" value="'+esc(row.customerProduct)+'"></label>';
 if(kind==='inbound')fields+='<p class="business-rule full" id="business-save-hint">确定后请点击页首“保存”，保存出库单的产值单价和产值金额。</p>';
 $('#business-fields').innerHTML=fields;
 $('#business-fields').oninput=$('#business-fields').onchange=()=>{$('#business-error').textContent='';businessPreview();};businessPreview();openDialog($('#business-dialog'),trigger);
 const input=isName(kind)?$('#business-name'):null;
 if(input){input.focus();input.select();}
}
$('#take-inbound-price').onclick=e=>openBusiness('inbound',e.currentTarget);
$('#edit-customer-product').onclick=e=>openBusiness('editName',e.currentTarget);
// 从白坯入库明细备注取值，只更新选中明细的打印品名。
$('#take-customer-product').onclick=()=>{
 const row=data.out.find(r=>r.id===selectedId);if(!row){toast('请先选择一条发货明细');return;}
 const source=receiptSource(row);
 if(!source){toast('未找到关联白坯入库明细，打印品名未更新');return;}
 row.customerProduct=source.F_ItemRemark??null;
 render();toast(row.customerProduct?.trim()?'已从白坯入库明细备注取得打印品名':'白坯入库明细备注为空，打印品名为空');
};
$('#business-form').onsubmit=e=>{
 e.preventDefault();if(!businessContext)return;const kind=businessContext.kind,rows=businessTargets();let error='',focus=null;
 if(isName(kind)){const text=$('#business-name').value.trim();if(!text||text.length>50){error='请填写不超过50个字符的打印品名。';focus=$('#business-name');}}
 if(error){$('#business-error').textContent=error;focus?.focus();return;}
 const changes=evaluateBusinessRows(kind,rows);
 if(!changes.length)return;
 if(changes.some(entry=>!entry.patch)){
  businessPreview();
  return;
 }
 for(const {row,patch} of changes)Object.assign(data.out.find(r=>r.id===row.id),patch);
 $('#business-dialog').close();businessContext=null;render();
 const count=changes.length;
 toast(kind==='inbound'&&businessDirty().length?'已更新 '+count+' 条明细的产值，请点击页首“保存”':'已更新 '+count+' 条明细');
};
$('#business-page-save').onclick=()=>{
 const dirty=businessDirty();
 if(!dirty.length)return;
 for(const row of dirty)businessSaved.set(row.id,Object.fromEntries(businessFields.map(k=>[k,row[k]])));
 syncBusinessButtons();toast('已保存 '+dirty.length+' 条出库明细的产值单价、产值金额和打印品名');
};

function editBusinessCell(cell){
 const row=rowFrom(cell),id=row.dataset.rowId;
 selectDeliveryRow(row);
 openBusiness('editName',()=>deliveryRows().find(item=>item.dataset.rowId===id)?.querySelector(customerProductCell)||$('#query-btn'),true);
}
deliveryGrid.addEventListener('dblclick',event=>{
 const cell=event.target.closest(customerProductCell);
 if(cell&&!event.target.closest('.cell-fill-handle'))editBusinessCell(cell);
});
deliveryGrid.addEventListener('keydown',event=>{
 if(event.key!=='F2')return;
 const row=rowFrom(event.target);
 const cell=event.target.closest(customerProductCell)||(event.target===row?row.querySelector(customerProductCell):null);
 if(cell){event.preventDefault();editBusinessCell(cell);}
});

let fillDrag=null;
function stopFillDrag(){
 const drag=fillDrag;
 if(!drag)return;
 fillDrag=null;
 cancelAnimationFrame(drag.frame);
 for(const cell of drag.cells)cell.classList.remove('cell-fill-selected');
 if(deliveryGrid.hasPointerCapture(drag.pointer))deliveryGrid.releasePointerCapture(drag.pointer);
}
const fillGridBottom=()=>Math.min(innerHeight,deliveryGrid.getBoundingClientRect().top+deliveryGrid.clientHeight);
function paintFillDrag(drag){
 const y=Math.min(drag.y,fillGridBottom()-1);
 let end=drag.start;
 for(let i=drag.start+1;i<drag.cells.length&&drag.cells[i].getBoundingClientRect().top<y;i++)end=i;
 if(end===drag.end)return;
 drag.end=end;
 drag.cells.forEach((cell,i)=>cell.classList.toggle('cell-fill-selected',i>=drag.start&&i<=end));
}
function scrollFillDrag(drag){
 if(fillDrag!==drag)return;
 const bottom=fillGridBottom();
 if(drag.y>=bottom-18&&deliveryGrid.scrollTop+deliveryGrid.clientHeight<deliveryGrid.scrollHeight){
  deliveryGrid.scrollTop+=Math.min(18,Math.max(3,drag.y-bottom+19));
  paintFillDrag(drag);
 }
 drag.frame=requestAnimationFrame(()=>scrollFillDrag(drag));
}
deliveryGrid.addEventListener('pointerdown',event=>{
 const handle=event.target.closest('.cell-fill-handle');
 if(!handle?.closest(customerProductCell)||event.button!==0||fillDrag)return;
 const rows=deliveryRows(),start=rows.indexOf(rowFrom(event.target)),record=data.out.find(row=>row.id===rows[start]?.dataset.rowId);
 const value=record?.customerProduct;
 if(start<0||start===rows.length-1||!String(value??'').trim())return;
 event.preventDefault();
 const drag={pointer:event.pointerId,rows,cells:rows.map(row=>row.querySelector(customerProductCell)),start,end:start,y:event.clientY,value,frame:0};
 fillDrag=drag;
 deliveryGrid.setPointerCapture(event.pointerId);
 drag.cells[start].classList.add('cell-fill-selected');
 scrollFillDrag(drag);
});
deliveryGrid.addEventListener('pointermove',event=>{
 if(fillDrag?.pointer===event.pointerId){fillDrag.y=event.clientY;paintFillDrag(fillDrag);}
});
deliveryGrid.addEventListener('pointerup',event=>{
 const drag=fillDrag;
 if(drag?.pointer!==event.pointerId)return;
 drag.y=event.clientY;paintFillDrag(drag);stopFillDrag();
 const ids=new Set(drag.rows.slice(drag.start+1,drag.end+1).map(row=>row.dataset.rowId));
 const updated=data.out.filter(row=>ids.has(row.id)&&row.customerProduct!==drag.value);
 if(!updated.length)return;
 for(const row of updated)row.customerProduct=drag.value;
 render();toast('已向下填充 '+updated.length+' 条明细的打印品名');
});
for(const event of ['pointercancel','lostpointercapture'])deliveryGrid.addEventListener(event,e=>{if(fillDrag?.pointer===e.pointerId)stopFillDrag();});
window.addEventListener('blur',stopFillDrag);
window.addEventListener('resize',stopFillDrag);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&fillDrag){event.preventDefault();stopFillDrag();}});
function syncBusinessButtons(){
 const hasRows=result().length>0;for(const id of ['take-inbound-price','take-customer-product','edit-customer-product'])$('#'+id).disabled=!hasRows;
 const count=businessDirty().length;$('#business-page-save').disabled=count===0;$('#business-page-save').textContent=count?'保存（'+count+'）':'保存';
}
const renderBeforeBusiness=render;
render=function(){stopFillDrag();renderBeforeBusiness();syncBusinessButtons();};
syncBusinessButtons();


window.addEventListener('storage',event=>{if(event.key===null||event.key?.startsWith('finance-notice-settlement-v1:')||event.key?.startsWith('finance-settlement-doc-v1:'))render();});
