//Reader750API.js


//全局变量
var reader;

var HidReceFlag;
var AA_Flag;
var ReceCount;
var ReceDataParity;
var MAX_BUFFER_SIZE = (512 + 10);
var HidReceData = new Uint8Array(MAX_BUFFER_SIZE);


/*********************************************************************************/

//连接读卡器
async function OpenReader(requestIfNeeded) {
    if ('hid' in navigator) {
        try {
            // 已授权过的设备可在页面初始化时直接打开；未授权时才弹出选择框（必须由点击触发）
            if (!reader) {
                const permitted = await navigator.hid.getDevices();
                reader = permitted.find(function (d) {
                    return d.vendorId === 0x0416 && d.productId === 0x8020;
                });
            }
            if (!reader && requestIfNeeded !== false) {
                const devices = await navigator.hid.requestDevice({
                    filters: [{
                        vendorId: 0x0416,    // 根据VID进行过滤
                        productId: 0x8020,   // 根据PID进行过滤
                    },],
                });
                reader = devices[0];         // 选择列表中第一个设备
            }
            if (!reader) return 0;
            if (!reader.opened) {        // 检查设备是否打开             
                await reader.open();     // 打开设备
            }

            // 电脑接收到来自设备的消息回调
            reader.oninputreport = (event) => {
                //HidReceFlag = 1;
                //console.log(event); // event中包含device、reportId、data等内容
                let array = new Uint8Array(event.data.buffer); // event.data.buffer就是接收到的inputreport包数据了
                ParsedReturnData(array);
                //let hexstr = "";
                //for (const data of array) {
                //    hexstr += (Array(2).join(0) + data.toString(16).toUpperCase()).slice(-2) + " "; // 将字节数据转换成（XX ）形式字符串
                //}
                //iptInput.value += hexstr;
                //iptInput.scrollTop = iptInput.scrollHeight; // 滚动到底部

                //iptLog.value += `Received ${event.data.byteLength} bytes\n\n`;
                //iptLog.scrollTop = iptLog.scrollHeight; // 滚动到底部
            };
            return 1;
        }
        catch (e) {//catch错误信息
            console.log(e);
            return 0;
        }
    } else {
        if (requestIfNeeded !== false) {
            alert('您的浏览器不支持 Web hid API，请使用Chrome、Edge、Opera等浏览器！');
        }
        return 0;
    }
}


//断开读卡器
async function CloseReader() {
    if (reader?.opened) {
        await reader.close();
        return 1;
    }
    else {
        return 0;
    }
}


// 定义一个异步函数来等待HidReceFlag被置为1
async function waitForHidReceFlag() {//改名为WaitForHidRece
    var timeout = 0;
    while (HidReceFlag !== 1) {
        timeout++;
        if (timeout > 200) {//超时1000ms
            console.log("等待超时！");
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 5)); // 每5毫秒检查一次，
    }
}


//去掉返回数据中AA后面的0x00，类似中断函数
function ParsedReturnData(databuff) {
    //每次接收到64个字节数据
    for (let i = 0; i < 64; i++) {
        HidReceData[ReceCount] = databuff[i];//保存数据
        ReceDataParity ^= HidReceData[ReceCount];//计算校验位

        if (AA_Flag == 1)//上一个数据是AA
        {
            AA_Flag = 0;
            if (HidReceData[ReceCount] == 0xCC) {
                HidReceData[0] = 0xAA;
                HidReceData[1] = 0xCC;
                ReceDataParity = 0;
                ReceCount = 2;
            }
        }
        else//上一个数据不是AA
        {
            if (HidReceData[ReceCount] == 0xAA) {
                AA_Flag = 1;
            }
            ReceCount++;
        }


        if (ReceCount > 8) {
            //计算接收数据长度
            var ReceLen = HidReceData[6];
            ReceLen <<= 8;
            ReceLen += HidReceData[7];

            if (((ReceLen + 9) == ReceCount) && (ReceDataParity == 0)) {
                //计算校验码
                HidReceFlag = 1;
                return;
            }
        }

        //判断长度是否大于接收缓存
        if (ReceCount == MAX_BUFFER_SIZE) {
            ReceCount = 0;
        }
    }

    /*
        var datahex="";
        if(databuff[0]==0x78 && databuff[1]==0x68 && databuff.length>4){
            switch ( databuff[3]) {
                case 0x0f:
                    textarea.value="读卡器已接受响声指令！";
                    break;
                case 0x1E:
                    textarea.value="读取设备编号成功！";
                    for (i=5;i<9;i++){datahex=datahex+databuff[i].toString(16).padStart(2, '0').toUpperCase();}
                    serialnumber.value=datahex;
                    break;
                case 0xF0:
                    switch(databuff[4]){
                        case 0x00:
                            textarea.value="读取IC卡号成功！";
                            for (i=5;i<9;i++){datahex=datahex+databuff[i].toString(16).padStart(2, '0').toUpperCase();}
                            carduid.value=datahex;
                            card8h10dz.value = parseInt("0x" + datahex).toString().padStart(10, '0');
                            LHCode = datahex.substring(6, 8) + datahex.substring(4, 6) + datahex.substring(2, 4) + datahex.substring(0, 2);
                            card8h10df.value = parseInt("0x" + LHCode).toString().padStart(10, '0');
                            break;
                        case 0x08:
                            textarea.value="寻卡失败，请重新将卡片放在读卡器感应区！";
                            break;
                        case 0x09:
                            textarea.value="寻卡失败，有多张卡在读卡器感应区！";
                            break;
                        default:
                            textarea.value="寻卡失败，错误代码："+databuff[4].toString();
                            break;
                    }
                    break;
            default:
    
        }
    }*/
}//end of ParsedReturnData()


// 全局HID设备插入/拔出事件（仅在浏览器支持 Web HID 时注册，避免不支持时顶层报错）
if (navigator.hid) {
    navigator.hid.onconnect = (event) => {
        console.log("HID connected: ", event.device); // device 的 collections 可以看到设备报告描述符相关信息
        //iptLog.value += `HID connected:\n${event.device.productName}\nPID ${event.device.productId} VID ${event.device.vendorId}\n\n`;
        //iptLog.scrollTop = iptLog.scrollHeight; // 滚动到底部
    };

    // 全局HID设备拔出事件
    navigator.hid.ondisconnect = (event) => {
        reader = null; // 释放当前设备
        console.log("HID disconnected: ", event.device);
        //iptLog.value += `HID disconnected:\n${event.reader.productName}\nPID ${event.reader.productId} VID ${event.reader.vendorId}\n\n`;
        //iptLog.scrollTop = iptLog.scrollHeight; // 滚动到底部
    };
}



//data_out的长度必须是64的倍数
async function HID_Transceiver(data_out, data_len) {
    if (!reader?.opened) {
        alert("未打开读卡器！");
        return {
            status: 0x0E,//未打开读卡器
            data: ""
        };
    }

    HidReceFlag = 0;
    AA_Flag = 0;
    ReceCount = 0;
    ReceDataParity = 0;

    var send_len = 0;
    while (send_len < data_len) {
        var outputData = data_out.slice(send_len, (send_len + 64));//每次发送64个字节数据
        await reader.sendReport(0, outputData); // 发送数据，第一个参数为reportId，填0表示不使用reportId
        send_len += 64;
    }


    await waitForHidReceFlag();
    if (HidReceFlag !== 1) {
        return {
            status: 0x0F,//未收到数据
            data: ""
        };
    }

    var data_len = HidReceData[6];
    data_len <<= 8;
    data_len += HidReceData[7];
    data_len += 8;//数据长度

    var res = HidReceData[8];
    var res_data = HidReceData.slice(9, data_len);

    return {
        status: res,
        data: res_data
    }
}


/**********************************************************************************************/


//封装参数
function gatherByteArgs(buf, pos, byte_args) {
    buf[pos++] = byte_args;
    return pos;
}

function gatherShortArgs(buf, pos, short_args) {
    buf[pos++] = (short_args >> 8) & 0xFF;
    buf[pos++] = short_args & 0xFF;
    return pos;
}

function collectParameters(buf, pos, args_len, args) {
    for (var i = 0; i < args_len; i++) {
        buf[pos++] = args[i];
    }
    return pos;
}


function createProtocolCmd(buf, addr, cmd, args_len, args) {
    var len = 0;
    var parity = 0;

    buf[len++] = 0xAA;
    buf[len++] = 0xCC;

    buf[len++] = (addr >> 8) & 0xFF;
    if (buf[len - 1] == 0xAA) {
        buf[len++] = 0x00;
    }

    buf[len++] = addr & 0xFF;
    if (buf[len - 1] == 0xAA) {
        buf[len++] = 0x00;
    }


    buf[len++] = (cmd >> 8) & 0xFF;
    if (buf[len - 1] == 0xAA) {
        buf[len++] = 0x00;
    }

    buf[len++] = cmd & 0xFF;
    if (buf[len - 1] == 0xAA) {
        buf[len++] = 0x00;
    }


    buf[len++] = (args_len >> 8) & 0xFF;
    if (buf[len - 1] == 0xAA) {
        buf[len++] = 0x00;
    }

    buf[len++] = args_len & 0xFF;
    if (buf[len - 1] == 0xAA) {
        buf[len++] = 0x00;
    }


    for (var i = 0; i < args_len; i++) {
        buf[len++] = args[i];
        parity ^= args[i];
        if (buf[len - 1] == 0xAA) {
            buf[len++] = 0x00;
        }
    }

    buf[len++] = parity ^ buf[2] ^ buf[3] ^ buf[4] ^ buf[5] ^ buf[6] ^ buf[7];
    if (buf[len - 1] == 0xAA) {
        buf[len++] = 0x00;
    }

    return len;
}


/***********************************************************************************************/
//设置读卡器地址
async function gSetDeviceAddr(addr) {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x0102;//指令，手动修改
    args_len = gatherShortArgs(argsBuf, args_len, addr);
    //args_len = gatherByteArgs(argsBuf, args_len, time);//收集参数，手动修改

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}



//获取读卡器地址
async function gGetDeviceAddr() {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x0103;//指令，手动修改
    //args_len = gatherShortArgs(argsBuf,args_len, addr);
    //args_len = gatherByteArgs(argsBuf, args_len, time);//收集参数，手动修改

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}


//获取读卡器型号
async function gGetDeviceModel() {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x0104;//指令，手动修改
    //args_len = gatherShortArgs(argsBuf,args_len, addr);
    //args_len = gatherByteArgs(argsBuf, args_len, time);//收集参数，手动修改

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}


//获取读卡器序列号
async function gGetDeviceSnr() {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x0105;//指令，手动修改
    //args_len = gatherShortArgs(argsBuf,args_len, addr);
    //args_len = gatherByteArgs(argsBuf, args_len, time);//收集参数，手动修改

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}


//激活蜂鸣器，单位10ms
async function gSetBeep(time) {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x0106;//指令，手动修改
    args_len = gatherByteArgs(argsBuf, args_len, time);//收集参数，手动修改

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}


//设置LED，0表示熄灭，1表示红色，2表示绿色，3表示黄色
async function gSetLED(color) {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x0107;//指令，手动修改
    args_len = gatherByteArgs(argsBuf, args_len, color);//收集参数，手动修改

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}


//设置读卡器天线，0表示关闭天线，1表示打开天线
async function gSetAntenna(state) {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x0108;//指令，手动修改
    args_len = gatherByteArgs(argsBuf, args_len, state);//收集参数，手动修改

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}


//设置读卡器工作模式，'A'为Type A，'B'为Type B，'r'为AT88RF020，'s'为ST卡, '1'为15693模式
async function gInitType(mode) {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x0109;//指令，手动修改
    args_len = gatherByteArgs(argsBuf, args_len, mode);//收集参数，手动修改

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}


/***********************************************************************************************/
//寻卡，0x26寻未进入休眠状态的卡，0x52寻所有状态的卡
async function aRequest(mode) {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x1001;//指令，手动修改
    args_len = gatherByteArgs(argsBuf, args_len, mode);//收集参数，手动修改

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}


//防冲撞
async function aAntiCollision() {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x1002;//指令，手动修改
    //args_len = gatherByteArgs(argsBuf, args_len, mode);//收集参数，手动修改

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}


//选定卡
async function aSelect(snr) {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x1003;//指令，手动修改
    args_len = collectParameters(argsBuf, args_len, 4, snr);
    //args_len = gatherByteArgs(argsBuf, args_len, mode);//收集参数，手动修改

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}


//2次防冲撞
async function aCascAntiCollision(cln) {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x1005;//指令，手动修改
    args_len = gatherByteArgs(argsBuf, args_len, cln);//收集参数，手动修改

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}


//2次选定卡
async function aCascSelect(cln, snr) {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x1006;//指令，手动修改
    args_len = gatherByteArgs(argsBuf, args_len, cln);//收集参数，手动修改
    args_len = collectParameters(argsBuf, args_len, 4, snr);

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}



//休眠卡
async function aHalt() {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x1004;//指令，手动修改
    //args_len = collectParameters(argsBuf, args_len, 4, snr);
    //args_len = gatherByteArgs(argsBuf, args_len, mode);//收集参数，手动修改

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}



//验证Miare卡密码，mode=0x60为验证A密码，mode=0x61为验证B密码
async function aCS_Authentication2(mode, block, key) {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x100A;//指令，手动修改
    //args_len = collectParameters(argsBuf, args_len, 4, snr);
    args_len = gatherByteArgs(argsBuf, args_len, mode);//收集参数，手动修改
    args_len = gatherByteArgs(argsBuf, args_len, block);//收集参数，手动修改
    args_len = collectParameters(argsBuf, args_len, 6, key);

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}




//读卡
async function aCS_Read(block) {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x100B;//指令，手动修改
    //args_len = collectParameters(argsBuf, args_len, 4, snr);
    //args_len = gatherByteArgs(argsBuf, args_len, mode);//收集参数，手动修改
    args_len = gatherByteArgs(argsBuf, args_len, block);//收集参数，手动修改
    //args_len = collectParameters(argsBuf, args_len, 6, key);

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}



//写卡
async function aCS_Write(block, block_data) {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x100C;//指令，手动修改
    //args_len = collectParameters(argsBuf, args_len, 4, snr);
    //args_len = gatherByteArgs(argsBuf, args_len, mode);//收集参数，手动修改
    args_len = gatherByteArgs(argsBuf, args_len, block);//收集参数，手动修改
    args_len = collectParameters(argsBuf, args_len, 16, block_data);

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}


//写UID卡snr
//snr 16字节数组
async function aUID_WriteSnr(snr) {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x1021;//指令，手动修改
    //args_len = collectParameters(argsBuf, args_len, 4, snr);
    //args_len = gatherByteArgs(argsBuf, args_len, mode);//收集参数，手动修改
    //args_len = gatherByteArgs(argsBuf, args_len, block);//收集参数，手动修改
    snr[4] = snr[0] ^ snr[1] ^ snr[2] ^ snr[3];
    args_len = collectParameters(argsBuf, args_len, 16, snr);

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}



/***********************************************************************************************/
//复位CPU卡
async function aCPU_Reset(mode) {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x1202;//指令，手动修改
    //args_len = collectParameters(argsBuf, args_len, 4, snr);
    args_len = gatherByteArgs(argsBuf, args_len, mode);//收集参数，手动修改
    //args_len = gatherByteArgs(argsBuf, args_len, block);//收集参数，手动修改
    //args_len = collectParameters(argsBuf, args_len, 16, block_data);

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}



//发送cpu卡cos指令
async function aCPU_SendCOS(cos_cmd, cos_len) {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x1203;//指令，手动修改
    //args_len = collectParameters(argsBuf, args_len, 4, snr);
    //args_len = gatherByteArgs(argsBuf, args_len, mode);//收集参数，手动修改
    //args_len = gatherByteArgs(argsBuf, args_len, block);//收集参数，手动修改
    args_len = collectParameters(argsBuf, args_len, cos_len, cos_cmd);

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}


//休眠CPU卡
async function aCPU_Deslect() {
    const reader_addr = 0;//读卡器地址
    var args_len = 0;     //参数长度
    const outputData = new Uint8Array(1024);//报告缓存
    const argsBuf = new Uint8Array(512);   //参数缓存

    const cmd = 0x1204;//指令，手动修改
    //args_len = collectParameters(argsBuf, args_len, 4, snr);
    //args_len = gatherByteArgs(argsBuf, args_len, mode);//收集参数，手动修改
    //args_len = gatherByteArgs(argsBuf, args_len, block);//收集参数，手动修改
    //args_len = collectParameters(argsBuf, args_len, cos_len, cos_cmd);

    var output_len = createProtocolCmd(outputData, reader_addr, cmd, args_len, argsBuf);
    var ret = await HID_Transceiver(outputData, output_len);
    return ret;
}

function getReaderStatus() {
    return reader?.opened || false;
}