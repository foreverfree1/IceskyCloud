var wc_load_options = {
   time: 0,//初始时间设0
   content: "waterlcloud..."
};

function wcLoadTemplate() {
    var load_config = parseInt(sessionStorage.getItem('layuiminiBgcolorId')) || 0;
    //默认蓝色
    if (!load_config || load_config == 0 || load_config == 1 || load_config == 5) {
        return "<div class='wc-loading blue_theme'>" +
            "<div class='ball-loader'>" +
            "<span></span><span></span><span></span><span></span>" +
            "</div>" +
            "</div>";
    }
    //绿色
    if (load_config == 2 || load_config == 3 || load_config == 4) {
        return "<div class='wc-loading'>" +
            "<div class='ball-loader'>" +
            "<span></span><span></span><span></span><span></span>" +
            "</div>" +
            "</div>";
    }
    //橙色
    return "<div class='wc-loading orange_theme'>" +
        "<div class='ball-loader'>" +
        "<span></span><span></span><span></span><span></span>" +
        "</div>" +
        "</div>";
}

!function (content, options) {
   function headerInit(content, options) {
      options = options || {};
      if (typeof content == "string") {
         options["content"] = content || wc_load_options.content;
      } else if (typeof content == "object") {
         options = content;
      }
      options.time = options.time || wc_load_options.time;
      options.content = options.content || wc_load_options.content;
      return options;
   }

   wc_load_options = headerInit(content, options);
   document.writeln(wcLoadTemplate());
}();

var wcLoading = {
   open: function () {
        if (document.getElementsByClassName("wc-loading")[0]) return;
        document.body.insertAdjacentHTML('beforeend', wcLoadTemplate());
   },
   close: function (time, dom) {
        time = time || wc_load_options.time;
        dom = dom || document.getElementsByClassName("wc-loading")[0];
        if (!dom) return;
        dom.classList.add("close");
        if (dom.parentNode) dom.parentNode.removeChild(dom);/**删除当前节点*/
   }
};
