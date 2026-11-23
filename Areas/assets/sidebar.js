'use strict';
let activeReportPage='ledger';
const narrowNavigation=matchMedia('(max-width:760px)');
function syncSidebar(){
  const expanded=narrowNavigation.matches?document.body.classList.contains('nav-open'):!document.body.classList.contains('nav-collapsed');
  $('#menu-toggle').setAttribute('aria-expanded',String(expanded));
  $('#menu-toggle').setAttribute('aria-label',expanded?'收起左侧菜单':'展开左侧菜单');
  $('#sidebar').inert=!expanded;
}
function closeMobileNavigation(){document.body.classList.remove('nav-open');syncSidebar();$('#menu-toggle').focus();}
$('#menu-toggle').onclick=()=>{document.body.classList.toggle(narrowNavigation.matches?'nav-open':'nav-collapsed');syncSidebar();if(narrowNavigation.matches&&document.body.classList.contains('nav-open'))$('#sidebar').focus();};
$('#sidebar-backdrop').onclick=closeMobileNavigation;
// 报表视图通过页内Tab切换；左侧保留模块名称及收起功能。
const renderBeforeSidebar=render;
render=function(){renderBeforeSidebar();syncSidebar();};
document.addEventListener('keydown',event=>{
  if(!narrowNavigation.matches||!document.body.classList.contains('nav-open'))return;
  if(event.key==='Escape'){event.preventDefault();closeMobileNavigation();}
  if(event.key==='Tab'){event.preventDefault();$('#sidebar').focus();}
});
narrowNavigation.addEventListener('change',()=>{document.body.classList.remove('nav-open');syncSidebar();});
syncSidebar();
