'use strict';
// 明细与汇总共用字段、筛选结果与原单；汇总只增加组末小计。
const fields=[['warehouse','仓库名称','warehouse'],['outNo','发货单号'],['customer','客户名称','lookup'],['vat','缸号'],['outType','出库类型','fixed'],['cloth','布号'],['product','客户品名'],['color','颜色'],['colorCode','色号'],['gram','克重'],['factoryOrder','本厂订单号'],['flow','流转卡号'],['workshop','所属车间'],['shipper','送货人'],['finalCustomer','最终客户'],['sales','业务员','lookup'],['settlementStatus','是否结算','select']];
const numeric=new Set(['pieces','net','gross','dyedPieces','dyedWeight','settleQuantity','productionPrice','productionAmount','packUnitPrice','packAmount','salePrice','amount','approvalPrice','execPrice']);
const additive=['pieces','net','gross','dyedPieces','dyedWeight','settleQuantity','productionAmount','packAmount','amount'];
const names={warehouseCode:'仓库编号',warehouse:'仓库名称',outNo:'发货单号',date:'开单日期',customer:'客户名称',customerName:'客户全称',finalCustomer:'最终客户',sales:'业务员',order:'客户订单号',vat:'缸号',flow:'流转卡号',shipDate:'发货日期',cloth:'布号',product:'客户品名',customerProduct:'打印品名',pieces:'匹数',net:'重量',gross:'毛重',quantity:'数量',dyedPieces:'匹数',dyedWeight:'重量',dyedQuantity:'数量',settleQuantity:'结算数量',productionPrice:'产值单价',productionAmount:'产值金额',packUnitPrice:'包装单价',packAmount:'包装金额',location:'库位',width:'门幅',gram:'克重',colorCode:'色号',color:'颜色',confirmedColor:'确认色',shipper:'送货人',productionType:'生产类型',unit:'单位',size:'尺寸',finishMethod:'整理方式',process:'特种整理方式',jobType:'作业类型',factoryOrder:'本厂订单号',contract:'合约号',remark:'备注',salePrice:'单价',amount:'金额',carNo:'车号',type:'类型',accountant:'记帐员',auditDate:'审核日期',approvalPrice:'审批价格',execPrice:'执行价格',workshop:'所属车间'};
const reportColumns=['warehouseCode','outNo','date','customer','customerName','finalCustomer','sales','order','vat','flow','shipDate','cloth','product','customerProduct','pieces','net','gross','dyedPieces','dyedWeight','settleQuantity','productionPrice','productionAmount','packUnitPrice','packAmount','salePrice','amount','location','width','gram','colorCode','color','confirmedColor','shipper','productionType','unit','size','finishMethod','process','jobType','factoryOrder','contract','remark','carNo','type','accountant','auditDate','workshop'];
const frozenFields=new Set(['warehouseCode','outNo','date','customer','customerName','finalCustomer']);
const columns={out:reportColumns},defaults={out:[...reportColumns]};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title=()=>queryMode==='summary'?'成品发货汇总查询':'成品发货明细查询';
const blank=()=>Object.fromEntries([...fields.map(f=>[f[0],f[0]==='outType'?'成品出库':'']),['from',''],['to',''],['shipFrom',''],['shipTo','']]);
let view='out',queryMode='detail',draftGroup='all',applied=blank(),toastTimer,selectedId=null;
const states={out:{group:'all',visible:[...defaults.out],page:1,size:20,sort:'date',direction:-1}},state=()=>states.out;
const dialogTriggers=new WeakMap(),data={in:window.REPORT_DATA.in,out:window.REPORT_DATA.out};
// 本报表仅查询成品出库，业务类型固定，不作为可录入字段。
for(const row of data.out)row.outType='成品出库';
function businessEqual(a,b){return a!==null&&a!==undefined&&a!==''&&b!==null&&b!==undefined&&b!==''&&String(a).toLowerCase()===String(b).toLowerCase();}
// 打印品名只取入库时间、批号排序后的首条关联备注；首条为空时不跳取后续行。
function receiptSource(row){
 const matches=(window.REPORT_DATA.businessSources?.greyReceipts||[]).map((source,index)=>({source,index}))
  .filter(({source})=>businessEqual(source.F_BaseEquipId,row.flowId))
  .sort((a,b)=>String(a.source.F_ReceptTime??'').localeCompare(String(b.source.F_ReceptTime??''))||String(a.source.F_BatchNo??'').localeCompare(String(b.source.F_BatchNo??''))||a.index-b.index);
 const first=matches[0]?.source;if(!first)return undefined;
 const tied=matches.filter(({source})=>String(source.F_ReceptTime??'')===String(first.F_ReceptTime??'')&&String(source.F_BatchNo??'')===String(first.F_BatchNo??''));
 return new Set(tied.map(({source})=>source.F_ItemRemark??'')).size>1?{...first,F_ItemRemark:null}:first;
}
function applyShipmentFieldRules(){
 const refs=window.REPORT_DATA.businessSources?.shipmentFields||{},same=businessEqual;
 for(const row of data.out){
  row.finalCustomer=row.customer??null;delete row.shift;
  for(const key of ['productionType','jobType','contract','type','accountant'])row[key]=null;
  row.workers=[];for(const batch of row.batches||[])batch.quantity=null;
  const line=refs.outLines?.find(r=>same(r.F_Id,row.id));
  row.net=line?.F_ActuiWeight??null;row.gross=line?.F_GrossWeight??null;
  const inIds=new Set((refs.inHeads||[]).filter(r=>same(r.F_EquipListId,line?.F_EquipListId)&&!r.F_DeleteTime).map(r=>String(r.F_Id).toLowerCase()));
  const locations=(refs.inLines||[]).filter(r=>inIds.has(String(r.F_ParentId??r.F_PrimaryId??'').toLowerCase())).map(r=>String(r.F_PdtWarehouseName??'').trim()).filter(Boolean);
  row.location=[...new Set(locations)].sort().join('、')||null;
  const formulas=(window.COST_DATA?.formulas||[]).filter(f=>f.kind==='dye'&&!f.header.F_DeleteTime&&f.cardIds.some(id=>same(id,row.flowId)));
  row.confirmedColor=formulas.length===1?formulas[0].header.F_ColorPoof??null:null;
  const head=refs.outHeads?.find(r=>same(r.F_Id,line?.F_PrimaryId)),planLine=refs.shipPlanLines?.find(r=>same(r.F_Id,line?.F_ShipPlanListId));
  const planId=planLine?.F_PrimaryId??head?.F_ShipPlanOrderId;
  const conflict=planLine&&head?.F_ShipPlanOrderId&&!same(planId,head.F_ShipPlanOrderId);
  const dates=conflict?[]:(refs.approvedShipmentAudits||[]).filter(r=>same(r.shipmentId,planId)&&r.auditTime).map(r=>r.auditTime).sort();
  row.auditDate=dates.at(-1)?.slice(0,10)??null;
 }
}
applyShipmentFieldRules();
function applyDefaultPrintProducts(rows){
 for(const row of rows){
  if(String(row.customerProduct??'').trim())continue;
  const source=receiptSource(row);
  row.customerProduct=source?.F_ItemRemark??null;
 }
}
// 仅初始化空白打印品名，不在查询、分页和重绘时覆盖本页编辑。
const persistedPrintProducts=new Map(data.out.map(row=>[row.id,row.customerProduct]));
applyDefaultPrintProducts(data.out);
const dataCutoff=window.REPORT_DATA.readAt.slice(0,10),flowCards=new Map(window.REPORT_DATA.cards.map(c=>[c.id,c]));
function amountDigits(k){return ['productionAmount','packAmount','amount'].includes(k)?4:2;}
function fmt(v,k){if(v===null||v===undefined||v==='')return '';if(numeric.has(k)){const price=['salePrice','productionPrice','packUnitPrice','approvalPrice','execPrice'].includes(k),integer=['pieces','dyedPieces'].includes(k),digits=amountDigits(k);return Number(v).toLocaleString('zh-CN',{minimumFractionDigits:integer?0:digits,maximumFractionDigits:price?4:digits});}return String(v);}
function decimalParts(v){const [base,exponent='0']=String(v).toLowerCase().split('e');return {value:BigInt(base.replace('.','')),scale:(base.split('.')[1]||'').length-Number(exponent)};}
function roundUnits(value,scale,digits){const shift=scale-digits;if(shift<=0)return value*10n**BigInt(-shift);const divisor=10n**BigInt(shift),absolute=value<0n?-value:value,rounded=(absolute+divisor/2n)/divisor;return value<0n?-rounded:rounded;}
function moneyProduct(quantity,unitPrice,digits=2){
 if([quantity,unitPrice].some(v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))))return null;
 const q=decimalParts(quantity),p=decimalParts(unitPrice);return Number(roundUnits(q.value*p.value,q.scale+p.scale,digits))/10**digits;
}
function reportValueSum(left,right){
 if([left,right].some(v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))))return null;
 const a=decimalParts(left),b=decimalParts(right),scale=Math.max(a.scale,b.scale,4);
 const combined=roundUnits(a.value,a.scale,scale)+roundUnits(b.value,b.scale,scale);
 return Number(roundUnits(combined,scale,4))/10000;
}
function weightForApproval(row){const a=flowCards.get(row.flowId)?.priceApproval;if(!a||a.F_DeleteTime)return null;return String(a.F_DeliveryTypeCode)==='1'?'gross':String(a.F_DeliveryTypeCode)==='2'?'net':null;}
// 结算状态与结算管理共用单据来源及本地单据状态。
function settlementRecordRows(){
 const rows=new Map((window.SHIPPING_SETTLEMENT_SOURCE||[]).map(r=>[String(r.id).toLowerCase(),{...r}]));
 try{for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i);
  if(!key?.startsWith('finance-notice-settlement-v1:')&&!key?.startsWith('finance-settlement-doc-v1:'))continue;
  let rec;try{rec=JSON.parse(localStorage.getItem(key));}catch{continue;}
  if(!rec?.id||!rec.fields||!['draft','submitted','approved','voided'].includes(rec.stage))continue;
  const id=String(rec.id).toLowerCase(),base=rows.get(id)||{};
  rows.set(id,{...base,...rec.notice?.header,...rec.header,...rec.fields,id,stage:rec.stage,outboundIds:rec.notice?.lines?.map(r=>r.id)});
 }}catch{/* 存储不可用时继续读取结算管理来源。 */}
 return [...rows.values()];
}
function syncSettlementStatus(){
 const settled=new Set();
 for(const record of settlementRecordRows()){
  if(record.stage==='voided'||!String(record.statement??'').trim())continue;
  for(const id of [record.stockoutId,...(record.outboundIds||[])])if(id)settled.add(String(id).toLowerCase());
 }
 for(const row of data.out)row.settlementStatus=settled.has(String(row.id).toLowerCase())?'completed':'unfinished';
}

function filtered(){syncSettlementStatus();return data.out.filter(r=>{
 if(applied.from&&(!r.date||r.date<applied.from)||applied.to&&(!r.date||r.date>applied.to)||applied.shipFrom&&(!r.shipDate||r.shipDate<applied.shipFrom)||applied.shipTo&&(!r.shipDate||r.shipDate>applied.shipTo))return false;
 return fields.every(([k,,type])=>!applied[k]||(type?String(filterRowValue(r,k)??'').trim()===applied[k]:String(filterRowValue(r,k)??'').toLowerCase().includes(applied[k].toLowerCase())));
 }).map(r=>{const weight=weightForApproval(r);return {...r,salePrice:reportValueSum(r.productionPrice,r.packUnitPrice),amount:reportValueSum(r.productionAmount,r.packAmount),settleQuantity:weight?r[weight]:null};});}
function sum(rows,k){if(!rows.length)return null;const values=['dyedPieces','dyedWeight','dyedQuantity'].includes(k)?[...new Map(rows.map(r=>[r.flowId||r.id,r])).values()]:rows;if(values.some(r=>r[k]===null||r[k]===undefined||r[k]===''))return null;const digits=amountDigits(k);return Number(values.reduce((n,r)=>{const p=decimalParts(r[k]);return n+roundUnits(p.value,p.scale,digits);},0n))/10**digits;}
function compare(a,b){const s=state(),av=a[s.sort],bv=b[s.sort];if(av==null)return bv==null?0:1;if(bv==null)return -1;return (numeric.has(s.sort)?av-bv:String(av).localeCompare(String(bv),'zh-CN'))*s.direction||String(a.id).localeCompare(String(b.id));}
function groups(rows){const map=new Map();for(const r of rows){const key=JSON.stringify(state().group==='all'?['全部']:state().group==='customer'?[r.customer]:[r.customer,r.product]);if(!map.has(key))map.set(key,[]);map.get(key).push(r);}return [...map].sort(([a],[b])=>a.localeCompare(b,'zh-CN')).map(([key,items])=>({key,items:items.slice().sort(compare)}));}
function result(){const rows=filtered();return queryMode==='summary'?groups(rows).flatMap(g=>g.items):rows.slice().sort(compare);}
function grouped(rows){return rows;}
function visible(){return reportColumns.filter(k=>state().visible.includes(k));}
function conditionText(){const parts=[`编制日期：${applied.from||'不限'} 至 ${applied.to||'不限'}`];if(applied.shipFrom||applied.shipTo)parts.push(`发货日期：${applied.shipFrom||'不限'} 至 ${applied.shipTo||'不限'}`);for(const [k,label]of fields)if(applied[k])parts.push(label+'：'+filterDisplay(k,applied[k]));if(queryMode==='summary')parts.push('汇总条件：'+{all:'全部',customer:'客户',product:'客户＋客户品名'}[state().group]);return parts.join('　｜　');}
function columnGroup(k){return ['pieces','net','gross'].includes(k)?'成品':['dyedPieces','dyedWeight'].includes(k)?'投染':null;}
const frozenAttr=(key,interactive)=>interactive&&frozenFields.has(key)?' data-frozen="'+key+'"':'';
function syncFrozenColumns(){
 const grid=$('#grid'),headers=[...grid.querySelectorAll('thead [data-frozen]')];
 const widths=headers.map(cell=>cell.getBoundingClientRect().width);
 // 窄屏留出空间查看后续列，按顺序冻结能完整容纳的列。
 const limit=grid.scrollWidth>grid.clientWidth?Math.max(0,grid.clientWidth-100):grid.clientWidth;
 let left=0,spaceAvailable=true;
 headers.forEach((cell,i)=>{
  const key=cell.dataset.frozen,width=widths[i];
  spaceAvailable=spaceAvailable&&width>0&&left+width<=limit;
  for(const item of grid.querySelectorAll('[data-frozen='+key+']')){
   item.classList.toggle('is-frozen',spaceAvailable);
   if(spaceAvailable)item.style.setProperty('--frozen-left',left+'px');
  }
  if(spaceAvailable)left+=width;
 });
}
new ResizeObserver(syncFrozenColumns).observe($('#grid'));
function headers(keys,interactive){let top='',bottom='';for(let i=0;i<keys.length;){const k=keys[i],group=columnGroup(k),button=key=>interactive?`<button data-sort="${key}">${names[key]}<span class="sort">${state().sort===key?(state().direction===1?'↑':'↓'):'↕'}</span></button>`:names[key];if(group){const list=[];while(i<keys.length&&columnGroup(keys[i])===group)list.push(keys[i++]);top+=`<th colspan="${list.length}">${group}</th>`;bottom+=list.map(key=>`<th>${button(key)}</th>`).join('');}else{top+=`<th rowspan="2"${frozenAttr(k,interactive)}>${button(k)}</th>`;i++;}}return '<thead><tr>'+top+'</tr><tr>'+bottom+'</tr></thead>';}
function summaryValues(items,keys,label,format=fmt){
 const labelIndex=Math.max(keys.findIndex(k=>!additive.includes(k)),0);
 return keys.map((k,i)=>{const value=additive.includes(k)?format(sum(items,k),k):'';return i===labelIndex?label+(value===''?'':' '+value):value;});
}
function summaryRow(items,keys,interactive,kind='subtotal',label='小计'){return '<tr class="'+kind+'" data-summary-row="'+kind+'">'+summaryValues(items,keys,label).map((value,i)=>'<td'+frozenAttr(keys[i],interactive)+'>'+esc(value)+'</td>').join('')+'</tr>';}
function detailCell(row,key,interactive,links){
 if(interactive&&key==='outNo'&&row.outNo)return flowLink(row,row.outNo);
 if(links&&key==='flow')return flowLink(row);
 if(links&&key==='factoryOrder')return spotLink(row);
 return esc(fmt(row[key],key));
}
function detailRow(r,keys,interactive,links){return '<tr data-row-id="'+esc(r.id)+'"'+(r.id===selectedId?' class="row-selected"':'')+(interactive?' tabindex="'+(r.id===selectedId?'0':'-1')+'" aria-haspopup="menu"':'')+'>'+keys.map(k=>{const editable=interactive&&k==='customerProduct',value=fmt(r[k],k);return '<td'+frozenAttr(k,interactive)+(editable?' data-fill-field="'+k+'" tabindex="-1"':'')+' title="'+esc(editable?[value,'双击编辑；拖动填充柄向下填充'].filter(Boolean).join(' · '):value)+'">'+detailCell(r,k,interactive,links)+(editable&&String(r[k]??'').trim()?'<span class="cell-fill-handle" aria-hidden="true" title="按住向下拖动填充"></span>':'')+'</td>';}).join('')+'</tr>';}
function tableHTML(rows,keys,interactive=true,links=interactive,withSubtotals=queryMode==='summary',withGrand=interactive){
 let body='';
 if(withSubtotals){const selected=new Set(rows.map(r=>r.id));for(const group of groups(filtered())){for(const r of group.items)if(selected.has(r.id))body+=detailRow(r,keys,interactive,links);const last=group.items.at(-1);if(last&&selected.has(last.id))body+=summaryRow(group.items,keys,interactive);}}
 else body=rows.map(r=>detailRow(r,keys,interactive,links)).join('');
 if(!rows.length)body='<tr class="blank-row">'+keys.map(k=>'<td'+frozenAttr(k,interactive)+'></td>').join('')+'</tr>';
 return '<table>'+headers(keys,interactive)+'<tbody>'+body+'</tbody>'+(withGrand?'<tfoot>'+summaryRow(filtered(),keys,interactive,'grand-total','合计')+'</tfoot>':'')+'</table>';
}
function totalsText(rows){return `合计　成品匹数：${fmt(sum(rows,'pieces'),'pieces')} 匹　成品重量：${fmt(sum(rows,'net'),'net')} 公斤　成品毛重：${fmt(sum(rows,'gross'),'gross')} 公斤　金额：${fmt(sum(rows,'amount'),'amount')} 元`;}
function render(){closeDeliveryMenu();const s=state(),rows=result(),pages=Math.max(1,Math.ceil(rows.length/s.size));s.page=Math.min(s.page,pages);const offset=(s.page-1)*s.size,pageRows=rows.slice(offset,offset+s.size);if(!pageRows.some(r=>r.id===selectedId))selectedId=pageRows[0]?.id??null;$('#report-title').textContent=title();$$('.query-modes button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.query===queryMode)));$('#grid').innerHTML=tableHTML(pageRows,visible());syncFrozenColumns();$('#totals').textContent=totalsText(filtered());$('#result-count').textContent=`共 ${rows.length} 条明细，当前显示 ${rows.length?offset+1:0}–${Math.min(offset+s.size,rows.length)}`;$('#page-info').textContent=`${s.page} / ${pages}`;$('#page-size').value=s.size;$('#first').disabled=$('#prev').disabled=s.page===1;$('#last').disabled=$('#next').disabled=s.page===pages;syncSort();syncPriceChangeButton();}
function hasEffectivePriceChangeSource(approval){return String(approval?.F_Status)==='4'&&!approval.F_DeleteTime&&!approval.F_DeleteUserId&&Boolean(String(approval.F_ContractNo??'').trim())&&Boolean(approval.lines?.length);}
function syncPriceChangeButton(){const row=result().find(r=>r.id===selectedId);$('#open-price-change').disabled=!hasEffectivePriceChangeSource(flowCards.get(row?.flowId)?.priceApproval);}
function renderShipmentBatchTab(flowId,detailId){
 const row=detailId?data.out.find(r=>r.id===detailId&&r.flowId===flowId):null;
 const tab=$('#flow-tab-batch'),panel=$('#flow-batch');
 tab.hidden=!row;panel.hidden=true;panel.replaceChildren();
 if(!row)return;
 const table=(label,columns,rows)=>'<section class="flow-batch-section"><h3>'+label+'</h3><div class="flow-route-table"><table aria-label="'+label+'"><thead><tr>'+columns.map(col=>'<th scope="col">'+col+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows:[columns.map(()=>null)]).map(cells=>'<tr>'+cells.map(value=>'<td>'+esc(value)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></section>';
 panel.innerHTML='<p class="flow-batch-caption">发货单号：'+esc(row.outNo)+'　/　流转卡号：'+esc(row.flow)+'</p>'
  +table('批号信息',['批号','仓位','货架号','投染匹数','投染重量','投染数量'],(row.batches||[]).map(b=>[b.batch,b.location,b.rack,b.pieces,b.weight,b.quantity]))
  +table('人员产量',['序号','工号','姓名','产量'],(row.workers||[]).map((w,i)=>[i+1,w.code,w.name,w.quantity]));
}
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,2300);}
function closePops(){$$('.popover').forEach(p=>p.hidden=true);}
function positionPop(pop,button){const rect=button.getBoundingClientRect();pop.style.top=rect.bottom+5+'px';pop.style.left=Math.max(8,Math.min(innerWidth-pop.offsetWidth-8,rect.right-pop.offsetWidth))+'px';}
function columnMarkup(){const s=state();$('#columns-pop').innerHTML='<div class="check-all"><label><input type="checkbox" id="all-columns">全选 / 不选</label></div><p>明细与汇总使用相同字段</p>'+reportColumns.map(k=>`<label><input type="checkbox" data-col="${k}" ${s.visible.includes(k)?'checked':''}>${columnGroup(k)?columnGroup(k)+'·':''}${names[k]}</label>`).join('');$('#all-columns').checked=s.visible.length===reportColumns.length;$('#all-columns').indeterminate=s.visible.length>0&&s.visible.length<reportColumns.length;}
$('#columns-btn').onclick=()=>{const p=$('#columns-pop'),open=p.hidden;closePops();if(open){columnMarkup();p.hidden=false;positionPop(p,$('#columns-btn'));}};
$('#columns-pop').onchange=e=>{if(e.target.id==='all-columns')state().visible=e.target.checked?[...reportColumns]:[reportColumns[0]];else{const k=e.target.dataset.col;if(!k)return;if(!e.target.checked&&state().visible.length===1){e.target.checked=true;toast('至少保留一个显示列');return;}state().visible=e.target.checked?[...state().visible,k]:state().visible.filter(c=>c!==k);}render();columnMarkup();};
document.addEventListener('click',e=>{if(!e.target.closest('.popover,#columns-btn'))closePops();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closePops();});
function openDialog(dialog,trigger){dialogTriggers.set(dialog,trigger||document.activeElement);dialog.showModal();}
$$('dialog').forEach(d=>{d.addEventListener('close',()=>{const trigger=dialogTriggers.get(d);if(typeof trigger==='function')trigger()?.focus({preventScroll:true});else if(trigger?.isConnected)trigger.focus();});d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>d.close());});
function openDetail(id,trigger){const r=result().find(r=>r.id===id);if(!r)return;$('#detail-title').textContent='成品发货单据明细';$('#detail-body').innerHTML='<div class="detail-meta"><div><span>发货单号</span>'+esc(r.outNo)+'</div><div><span>客户名称</span>'+esc(r.customer)+'</div><div><span>开单日期</span>'+esc(r.date)+'</div></div><div class="detail-table">'+tableHTML([r],reportColumns,false,true,false,false)+'</div>';openDialog($('#detail-dialog'),trigger);}
const deliveryGrid=$('#grid');
const deliveryRows=()=>[...deliveryGrid.querySelectorAll('tbody tr[data-row-id]')];
const rowFrom=target=>target.closest('tbody tr[data-row-id]');
function selectDeliveryRow(row){
 if(!row)return;
 selectedId=row.dataset.rowId;
 for(const item of deliveryRows()){
  item.classList.toggle('row-selected',item===row);
  item.tabIndex=item===row?0:-1;
 }
 syncPriceChangeButton();
}
deliveryGrid.onclick=e=>{
 const sort=e.target.closest('[data-sort]');
 if(sort){const k=sort.dataset.sort;state().direction=state().sort===k?-state().direction:1;state().sort=k;state().page=1;render();return;}
 selectDeliveryRow(rowFrom(e.target));
};

const deliveryMenu=document.createElement('div');
deliveryMenu.id='delivery-row-menu';
deliveryMenu.hidden=true;
deliveryMenu.setAttribute('role','menu');
deliveryMenu.setAttribute('aria-label','发货明细操作');
deliveryMenu.innerHTML='<button type="button" role="menuitem" tabindex="-1" data-row-action="detail">查看单据</button><button type="button" role="menuitem" tabindex="-1" data-row-action="spot">查看点色单</button><button type="button" role="menuitem" tabindex="-1" data-row-action="price">价格变更</button>';
document.body.append(deliveryMenu);
let menuRow=null;
const menuItems=()=>[...deliveryMenu.querySelectorAll('button:not([hidden])')];
function closeDeliveryMenu(restoreFocus=false){
 if(deliveryMenu.hidden)return;
 deliveryMenu.hidden=true;
 if(restoreFocus)menuRow?.focus({preventScroll:true});
 menuRow=null;
}
function openDeliveryMenu(row,x,y,field){
 const record=data.out.find(r=>r.id===row.dataset.rowId);
 if(!record)return;
 closePops();
 selectDeliveryRow(row);
 menuRow=row;
 deliveryMenu.dataset.fillField=field??'';
 deliveryMenu.querySelector('[data-row-action=spot]').hidden=!record.spotId||!spotOrders.has(String(record.spotId).toLowerCase());
 deliveryMenu.querySelector('[data-row-action=price]').hidden=!hasEffectivePriceChangeSource(flowCards.get(record.flowId)?.priceApproval);
 deliveryMenu.hidden=false;
 const pad=4;
 deliveryMenu.style.left=Math.max(pad,Math.min(x,innerWidth-deliveryMenu.offsetWidth-pad))+'px';
 deliveryMenu.style.top=Math.max(pad,Math.min(y,innerHeight-deliveryMenu.offsetHeight-pad))+'px';
 menuItems()[0].focus({preventScroll:true});
}
deliveryGrid.addEventListener('contextmenu',e=>{
 const row=rowFrom(e.target);
 if(!row){closeDeliveryMenu();return;}
 e.preventDefault();
 const anchor=e.target.getBoundingClientRect();
 openDeliveryMenu(row,e.clientX||anchor.left,e.clientY||anchor.bottom,e.target.closest('[data-fill-field]')?.dataset.fillField);
});
deliveryGrid.addEventListener('keydown',e=>{
 const row=rowFrom(e.target);
 if(!row)return;
 if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){
  e.preventDefault();
  const cell=e.target===row?row.cells[0]:e.target,rect=cell.getBoundingClientRect();
  openDeliveryMenu(row,rect.left,rect.bottom,cell.closest('[data-fill-field]')?.dataset.fillField);
 }else if(e.target===row&&(e.key==='ArrowUp'||e.key==='ArrowDown')){
  const rows=deliveryRows(),next=rows[rows.indexOf(row)+(e.key==='ArrowUp'?-1:1)];
  if(next){e.preventDefault();selectDeliveryRow(next);next.focus();}
 }
});
deliveryMenu.addEventListener('keydown',e=>{
 if(e.key==='Escape'||e.key==='Tab'){closeDeliveryMenu(true);if(e.key==='Escape')e.preventDefault();return;}
 const items=menuItems(),at=items.indexOf(document.activeElement);
 const next=e.key==='Home'?0:e.key==='End'?items.length-1:e.key==='ArrowDown'?(at+1)%items.length:e.key==='ArrowUp'?(at+items.length-1)%items.length:null;
 if(next!==null){e.preventDefault();items[next].focus({preventScroll:true});}
});
deliveryMenu.onclick=e=>{
 const item=e.target.closest('[data-row-action]'),id=menuRow?.dataset.rowId;
 if(!item||!id)return;
 const record=data.out.find(r=>r.id===id);
 const restoreFocus=()=>deliveryRows().find(row=>row.dataset.rowId===id)||$('#query-btn');
 closeDeliveryMenu(true);
 if(item.dataset.rowAction==='detail')openDetail(id,restoreFocus);
 if(item.dataset.rowAction==='spot')openSpot(record.spotId,restoreFocus);
 if(item.dataset.rowAction==='price')openPriceChange(id,restoreFocus);
};
document.addEventListener('pointerdown',e=>{if(!deliveryMenu.contains(e.target))closeDeliveryMenu();},true);
deliveryGrid.addEventListener('scroll',()=>closeDeliveryMenu());
window.addEventListener('resize',()=>closeDeliveryMenu());
window.addEventListener('blur',()=>closeDeliveryMenu());
function syncSort(){const s=state(),v=s.sort+'-'+(s.direction===1?'asc':'desc');$('#sort-order').value=[...$('#sort-order').options].some(o=>o.value===v)?v:'custom';}
$('#sort-order').onchange=e=>{if(e.target.value==='custom')return;const [k,d]=e.target.value.split('-');state().sort=k;state().direction=d==='asc'?1:-1;state().page=1;render();};
$('#first').onclick=()=>{state().page=1;render();};$('#prev').onclick=()=>{state().page--;render();};$('#next').onclick=()=>{state().page++;render();};$('#last').onclick=()=>{state().page=Math.max(1,Math.ceil(result().length/state().size));render();};$('#page-size').onchange=e=>{state().size=Number(e.target.value);state().page=1;render();};
function filterRowValue(row,key){
 if(key==='warehouse')return row.warehouseCode;
 if(key==='customer')return flowCards.get(row.flowId)?.requirements?.F_CusCode;
 return row[key];
}
function filterItems(key){
 const options=new Map();
 for(const row of data.out){
  const value=String(filterRowValue(row,key)??'').trim(),name=String(row[key]??'').trim();
  if(value&&name&&!options.has(value))options.set(value,{value,name});
 }
 return [...options.values()].sort((a,b)=>a.name.localeCompare(b.name,'zh-CN')||a.value.localeCompare(b.value,'zh-CN'));
}
function filterDisplay(key,value){
 if(!value)return '';
 if(key==='settlementStatus')return {completed:'已结算',unfinished:'未结算'}[value]||'';
 if(['warehouse','customer','sales'].includes(key))return filterItems(key).find(item=>item.value===value)?.name||'';
 return value;
}
function syncLookup(key){
 const value=$('#f-'+key).value, button=$('#pick-'+key),label=fields.find(([k])=>k===key)[1];
 const name=filterDisplay(key,value);
 button.querySelector('span').textContent=name||'请选择';
 button.classList.toggle('has-value',Boolean(name));
 button.title=name||'选择'+label;
}
function buildFilterPicker(){
 const dialog=document.createElement('dialog');
 dialog.id='shipment-filter-picker';dialog.className='shipment-filter-picker';dialog.setAttribute('aria-labelledby','shipment-picker-title');
 dialog.innerHTML='<div class="dialog-head"><strong id="shipment-picker-title"></strong><button type="button" data-picker-close aria-label="关闭">×</button></div><div class="dialog-body"><label class="shipment-picker-search"><span>搜索</span><input id="shipment-picker-search" type="search" autocomplete="off"></label><div class="shipment-picker-grid"></div></div><div class="dialog-foot"><button type="button" data-picker-clear>清除选择</button><button type="button" data-picker-close>取消</button></div>';
 document.body.append(dialog);
 let activeKey=null,trigger=null,options=[];
 const input=dialog.querySelector('input'),grid=dialog.querySelector('.shipment-picker-grid');
 function showRows(){
  const term=input.value.trim().toLowerCase(),withCode=activeKey==='customer';
  const rows=options.filter(o=>!term||o.name.toLowerCase().includes(term)||(withCode&&o.value.toLowerCase().includes(term)));
  const title=withCode?'客户名称':'业务员';
  grid.innerHTML='<table><thead><tr>'+(withCode?'<th scope="col">客户编码</th>':'')+'<th scope="col">'+title+'</th></tr></thead><tbody>'+
   (rows.length?rows.map(o=>'<tr>'+(withCode?'<td>'+esc(o.value)+'</td>':'')+'<td><button type="button" class="shipment-picker-option" data-value="'+esc(o.value)+'"'+(o.value===$('#f-'+activeKey).value?' aria-current="true"':'')+'>'+esc(o.name)+'</button></td></tr>').join(''):'<tr>'+(withCode?'<td></td>':'')+'<td></td></tr>')+'</tbody></table>';
 }
 function pick(value){$('#f-'+activeKey).value=value;syncLookup(activeKey);dialog.close();}
 input.oninput=showRows;
 input.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();grid.querySelector('button')?.focus();}};
 grid.onclick=e=>{const option=e.target.closest('button[data-value]');if(option)pick(option.dataset.value);};
 dialog.querySelector('[data-picker-clear]').onclick=()=>pick('');
 dialog.querySelectorAll('[data-picker-close]').forEach(b=>b.onclick=()=>dialog.close());
 dialog.addEventListener('close',()=>trigger?.focus());
 for(const key of ['customer','sales'])$('#pick-'+key).onclick=e=>{
  activeKey=key;trigger=e.currentTarget;options=filterItems(key);
  $('#shipment-picker-title').textContent=key==='customer'?'选择客户名称':'选择业务员';
  input.placeholder=key==='customer'?'输入客户编码或名称':'输入业务员姓名';
  input.value='';showRows();dialog.showModal();input.focus();
 };
}
function buildFields(){
 const order=[['from','编制日期起','date'],['to','编制日期止','date'],['shipFrom','发货日期起','date'],['shipTo','发货日期止','date'],...fields];
 $('#search-fields').innerHTML=order.map(([key,label,type])=>{
  const id='f-'+key;
  let control;
  if(type==='fixed')control='<input id="'+id+'" value="成品出库" readonly aria-readonly="true">';
  else if(type==='warehouse')control='<select id="'+id+'"><option value="">全部</option>'+filterItems(key).map(x=>'<option value="'+esc(x.value)+'">'+esc(x.name)+'</option>').join('')+'</select>';
  else if(type==='lookup')control='<input type="hidden" id="'+id+'"><button type="button" id="pick-'+key+'" class="shipment-picker-trigger" aria-haspopup="dialog" aria-controls="shipment-filter-picker"><span>请选择</span><span aria-hidden="true" class="shipment-picker-icon">▾</span></button>';
  else if(type==='select')control='<select id="'+id+'"><option value="">全部</option><option value="completed">已结算</option><option value="unfinished">未结算</option></select>';
  else control='<input id="'+id+'" '+(type==='date'?'type="date"':'placeholder="输入'+label+'"')+' autocomplete="off">';
  return '<div class="filter-field"><label for="'+(type==='lookup'?'pick-'+key:id)+'">'+label+'</label>'+control+'</div>';
 }).join('');
 buildFilterPicker();
}
function fillDraft(values){for(const k of Object.keys(blank()))$('#f-'+k).value=values[k]||'';for(const k of ['customer','sales'])syncLookup(k);$('#search-error').textContent='';}
function executeQuery(nextMode=queryMode){
 const next=blank();for(const k of Object.keys(next))next[k]=$('#f-'+k).value.trim();
 next.outType='成品出库';
 const invalidDate=['from','to','shipFrom','shipTo'].find(k=>!$('#f-'+k).validity.valid);
 const error=invalidDate?'请填写有效的日期。':next.from&&next.to&&next.from>next.to?'编制日期起不能晚于编制日期止。':next.shipFrom&&next.shipTo&&next.shipFrom>next.shipTo?'发货日期起不能晚于发货日期止。':'';
 if(error){$('#search-error').textContent=error;$('#search-form').hidden=false;$('#filter-toggle').textContent='收起筛选';$('#filter-toggle').setAttribute('aria-expanded','true');if(invalidDate)$('#f-'+invalidDate).focus();toast(error);return false;}
 applied=next;queryMode=nextMode;state().group=draftGroup;state().page=1;selectedId=null;$('#search-error').textContent='';closePops();render();$('#grid').scrollTo(0,0);
 const count=filtered().length,group=queryMode==='summary'?'，按'+{all:'全部',customer:'客户',product:'客户＋客户品名'}[state().group]+'汇总':'';
 toast((queryMode==='summary'?'汇总查询':'明细查询')+'完成，共 '+count+' 条'+group);return true;
}
// 查询统一执行页面日期校验，避免浏览器默认校验在提交事件前静默拦截。
$('#search-form').noValidate=true;
$('#search-form').onsubmit=e=>{e.preventDefault();executeQuery();};
$$('.query-modes button').forEach(b=>b.onclick=()=>executeQuery(b.dataset.query));
$$('[name=group-draft]').forEach(r=>r.onchange=()=>draftGroup=r.value);
$('#reset-btn').onclick=()=>{applied=blank();fillDraft(applied);draftGroup=state().group='all';$('[name=group-draft][value=all]').checked=true;state().page=1;state().sort='date';state().direction=-1;selectedId=null;render();};
$('#filter-toggle').onclick=()=>{const f=$('#search-form');f.hidden=!f.hidden;$('#filter-toggle').textContent=f.hidden?'展开筛选':'收起筛选';$('#filter-toggle').setAttribute('aria-expanded',String(!f.hidden));};
const csvSummary=(items,keys,label)=>summaryValues(items,keys,label,(value,k)=>csvValue({[k]:value},k));
function exportRows(rows,keys){const values=r=>keys.map(k=>csvValue(r,k));if(queryMode!=='summary')return rows.map(values);return groups(rows).flatMap(g=>[...g.items.map(values),csvSummary(g.items,keys,'小计')]);}
function csvValue(row,k){return ['amount','productionAmount','packAmount'].includes(k)?(row[k]==null?'':row[k].toFixed(amountDigits(k))):row[k]??'';}
function csvCell(v){let text=String(v??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
$('#export-btn').onclick=()=>{const rows=result(),keys=visible();if(!rows.length){toast('当前条件无查询结果可导出');return;}const lines=[[title()],[conditionText()],keys.map(k=>(columnGroup(k)?columnGroup(k)+'·':'')+names[k]),...exportRows(rows,keys),csvSummary(rows,keys,'合计')];const url=URL.createObjectURL(new Blob(['\ufeff'+lines.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=title()+'_'+dataCutoff+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出全部查询结果，共 '+rows.length+' 条明细');};
$('#print-btn').onclick=()=>{const rows=result();if(!rows.length){toast('当前条件无查询结果可打印');return;}$('#print-area').innerHTML='<h1>'+esc(title())+'</h1><p>'+esc(conditionText())+'</p>'+tableHTML(rows,visible(),false,false,queryMode==='summary',true);window.print();};


// 流程卡与报表明细通过内部标识关联，同一张卡不受报表筛选范围影响。

// 按真实流程卡主键与路线位置显示实际刷卡，不推定缺失记录的完成状态。

function flowLink(row,label=row.flow){
 if(!row.flowId||!flowCards.has(row.flowId))return esc(label);
 const fromShipment=label===row.outNo&&Boolean(row.outNo);
 const aria=fromShipment?'发货单号 '+label+'，打开流程卡':'打开流程卡 '+row.flow;
 return '<button type="button" class="link '+(fromShipment?'out-flow-link':'flow-link')+'" data-flow-id="'+esc(row.flowId)+'" data-shipment-detail-id="'+esc(row.id)+'" aria-label="'+esc(aria)+'">'+esc(label)+'</button>';
}

function setFlowTab(name,focus=false){$$('[data-flow-tab]').forEach(button=>{const active=button.dataset.flowTab===name;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;if(active&&focus)button.focus();});$('#flow-route').hidden=name!=='route';$('#flow-info').hidden=name!=='info';$('#flow-dialog .flow-content').scrollTop=0;}

function openFlow(id,trigger){const card=flowCards.get(id);if(!card)return;renderShipmentBatchTab(id,trigger?.dataset.shipmentDetailId);$('#flow-title').textContent='流程卡 · '+card.number;$('#flow-route').innerHTML=routeSwipeHTML(card);const fields=[['number','流程卡号'],['customer','客户名称'],['order','客户订单号'],['factoryOrder','本厂订单号'],['cloth','布号'],['product','品名'],['vat','缸号'],['color','颜色'],['colorCode','色号'],['gram','克重'],['width','门幅'],['workshop','所属车间']];$('#flow-info').innerHTML='<form class="flow-info-form" aria-label="流程卡只读详情">'+fields.map(([key,label])=>'<label class="flow-info-field"><span>'+label+'</span>'+(key==='factoryOrder'?spotLink({spotId:card.spotId,factoryOrder:card.factoryOrder}):'<input readonly aria-label="'+label+'" value="'+esc(card[key])+'">')+'</label>').join('')+'<label class="flow-info-field full-width"><span>工艺路线</span><textarea readonly aria-label="工艺路线">'+esc(card.route.map(step=>step.name).join(' → '))+'</textarea></label><label class="flow-info-field full-width"><span>备注</span><textarea readonly aria-label="备注">'+esc(card.remark)+'</textarea></label></form>';setFlowTab('route');openDialog($('#flow-dialog'),trigger);}

document.addEventListener('click',event=>{const trigger=event.target.closest('[data-flow-id]');if(trigger)openFlow(trigger.dataset.flowId,trigger);});

$$('[data-flow-tab]').forEach(button=>{button.onclick=()=>setFlowTab(button.dataset.flowTab);button.onkeydown=event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();setFlowTab(event.key==='Home'?'route':event.key==='End'?'info':button.dataset.flowTab==='route'?'info':'route',true);}};});



function routeSwipeHTML(card){const headers=['序号','工序','实际机台','开始时间','结束时间','操作人员','完成比例（%）','作业重量（公斤）'];const body=card.route.flatMap((step,index)=>(step.swipes.length?step.swipes:[null]).map(s=>'<tr data-step-id="'+esc(step.id)+'"'+(s?' data-swipe-id="'+esc(s.F_Id)+'"':'')+'><td class="seq">'+(index+1)+'</td><td>'+esc(step.name)+'</td>'+['F_MachineCode','F_StartTime','F_FnishiTime','F_PersonName','F_CompletePercent','F_ActulWeight'].map(key=>'<td>'+(key==='F_MachineCode'?machineLinkForSwipe(card,s):esc(s?.[key]))+'</td>').join('')+'</tr>')).join('');return '<div class="flow-route-table"><table><thead><tr>'+headers.map(label=>'<th>'+label+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table></div>'+(card.extraSwipes.length?'<h3>其他工序记录</h3><div class="flow-route-table"><table><thead><tr><th>工序</th><th>开始时间</th><th>结束时间</th><th>操作人员</th><th>作业重量（公斤）</th></tr></thead><tbody>'+card.extraSwipes.map(s=>'<tr>'+['F_NowProcess','F_StartTime','F_FnishiTime','F_PersonName','F_ActulWeight'].map(key=>'<td>'+esc(s[key])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':'');}

function rollDetailsHTML(row){return '<div class="detail-body-title">入库卷明细</div><div class="detail-table"><table><thead><tr><th>序号</th><th>库位</th><th>货架号</th><th>净重（公斤）</th><th>毛重（公斤）</th><th>长度</th></tr></thead><tbody>'+(row.rolls.length?row.rolls.map((r,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(r.location)+'</td><td>'+esc(r.rack)+'</td><td>'+esc(fmt(r.net,'net'))+'</td><td>'+esc(fmt(r.gross,'gross'))+'</td><td>'+esc(r.length)+'</td></tr>').join(''):'<tr><td></td><td></td><td></td><td></td><td></td><td></td></tr>')+'</tbody></table></div>';}

buildFields();fillDraft(applied);render();





function spotLink(row){return row.spotId&&row.factoryOrder?'<button type="button" class="link spot-link" data-spot-id="'+esc(row.spotId)+'">'+esc(row.factoryOrder)+'</button>':esc(row.factoryOrder);}

