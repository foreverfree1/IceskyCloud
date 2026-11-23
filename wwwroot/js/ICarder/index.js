// 读卡脚本加载完成后再连设备。Index 里等这个 Promise。
window.MICReady = $.getScript("/js/ICarder/Reader750API.js").then(function () {
  return $.getScript("/js/ICarder/MifareIC.js");
}).then(function () {
  if (window.top) window.top.MIC = window.MIC;
});

// 将卡号转成 16 位纯数字字符串（不足补0）
function encodeCardTo16Str(cardNumber) {
  cardNumber = String(cardNumber || '').trim();
  if (!/^\d{1,20}$/.test(cardNumber)) {
    throw new Error("卡号必须为 1-20 位数字");
  }
  // 前面补0补到16位
  cardNumber = cardNumber.padStart(16, '0');
  let bytes = [];
  for (let i = 0; i < 16; i++) {
    bytes.push(parseInt(cardNumber[i], 10));
  }
  return bytes;
}

// 密钥字符串
const keyStr = 'CCEF29C73145';
const keyArray = [0xFF, 0x07, 0x80, 0x69, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]


// UID 字节转大写十六进制（对应 C# byteHEX）
function bytesToHex(bytes) {
  var s = '';
  var i;
  for (i = 0; i < bytes.length; i++) {
    s += ('0' + bytes[i].toString(16).toUpperCase()).slice(-2);
  }
  return s;
}

// 确认读卡器已打开，再寻卡读 UID（对应 C# TyA_Request / Anticollision / Select）
async function readCardNo() {
  if (!getReaderStatus()) {
    var opened = await window.MIC.openReader();
    if (!opened) {
      return { status: -1, cardNo: '', message: '未连接读卡器' };
    }
  }
  var ret = { status: 1, data: '' };
  var i;
  for (i = 0; i < 2; i++) {
    ret = await M1_ReadSnr(0x52);
    if (ret.status === 0) break;
  }
  if (ret.status !== 0) {
    return { status: ret.status, cardNo: '', message: '读卡号失败' };
  }
  return { status: 0, cardNo: bytesToHex(ret.data), message: '读卡号成功' };
}

// 将字符串形式的16进制，每两位作为1字节，转为10进制的字节数组
function hexToBytes(theHex) {
  const bytes = [];
  for (let i = 0; i < theHex.length; i += 2) {
    // 取两个字符当做16进制，转成10进制的数字
    const hexByte = theHex.substr(i, 2).padEnd(2, '0');
    bytes.push(parseInt(hexByte, 16)); // parseInt的第二个参数16，表示解析16进制字符串为10进制数字
  }
  return bytes;
}
const cardKey = hexToBytes(keyStr);
const key_type = 0x60;


// 暴露API到全局window.MIC对象
window.MIC = {
  // 连接读卡器，如果已经连接则不重复连接，连接成功后自动读卡号
  // requestIfNeeded 为 false 时只重连已授权设备，不弹出选择框
  openReader: async function (requestIfNeeded) {
    if (typeof getReaderStatus === 'function' && getReaderStatus()) {
      return true;
    }
    try {
      return (await OpenReader(requestIfNeeded)) === 1;
    } catch (err) {
      console.error('连接失败', err);
      return false;
    }
  },
  // 读M1卡：工号 + 卡号一起返回，表单只在读卡时给 F_CardNo 赋值
  ReadCard: async function (sector = 0x00) {
    try {
      const snrRet = await readCardNo();
      const ret = await M1_ReadSector(key_type, cardKey, sector);
      if (ret.status === 0) {
        gSetBeep(10);
        const empNo = Array.from(ret.data.slice(0, 16)).map(x => x.toString()).join('');
        return { status: 0, data: Number(empNo), cardNo: snrRet.status === 0 ? snrRet.cardNo : '', message: '读卡成功' };
      }
      return { status: ret.status, data: null, cardNo: snrRet.status === 0 ? snrRet.cardNo : '', message: '读卡失败' };
    } catch (err) {
      console.error('读卡异常', err);
      return { status: -1, data: null, cardNo: '', message: err && err.message ? err.message : '读卡异常' };
    }
  },

  // 写M1卡（empNo为工号，sector默认为0x01；工号会加密后写入卡）
  M1_WriteCard: async function (empNo, sector = 0x00) {
    let sector_data;
    try {
      sector_data = encodeCardTo16Str(empNo);
    } catch (e) {
      return { status: -2, message: e && e.message ? e.message : '工号加密异常' };
    }
    try {
      const snrRet = await readCardNo();
      const ret = await M1_WriteCard(key_type, cardKey, sector, sector_data);
      var cardNo = snrRet.status === 0 ? snrRet.cardNo : '';
      if (ret.status === 0) {
        gSetBeep(10);
        return { status: 0, message: '写卡成功', cardNo: cardNo };
      }
      return { status: ret.status, message: ret.message || '写卡失败', cardNo: cardNo };
    } catch (err) {
      console.error('写卡异常', err);
      return { status: -1, message: err && err.message ? err.message : '写卡异常', cardNo: '' };
    }
  },

  // 初始化：先读卡号，再把新卡默认密钥改成 keyStr
  WriteCardKey: async function (sector = 0x00) {
    var default_key = [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF];
    var snrRet;
    var writeRet;
    try {
      snrRet = await readCardNo();
      if (snrRet.status !== 0) return snrRet;
      writeRet = await M1_WriteKey(key_type, default_key, sector, [...cardKey, ...keyArray]);
      if (writeRet.status === 0) {
        gSetBeep(10);
        return { status: 0, message: '初始化成功', cardNo: snrRet.cardNo };
      }
      return { status: writeRet.status, message: writeRet.message || '初始化失败,可能不是新卡' };
    } catch (err) {
      return { status: -1, message: err && err.message ? err.message : '初始化异常', cardNo: '' };
    }
  }
}