$(function () {
    // 加载 Reader750API.js，修正路径
    $.getScript("/js/ICarder/Reader750API.js");
});

//读卡号同时支持4字节和7字节卡号
//成功返回{status:0,data:卡号}
async function M1_ReadSnr(mode) 
{
    var ret = await aRequest(mode);//寻卡
    if(ret.status !== 0)
    {
        return {
            status: 1,
            data: ""
        }
    }
    var atqa = ret.data[0];



    ret = await aAntiCollision(); //防冲撞
    if(ret.status !== 0)
    {
        return {
            status: 2,
            data: ""
        }
    }
    var snr = ret.data.slice(0,4);

    ret = await aSelect(snr) ;//选定卡
    if(ret.status !== 0)
    {
        return {
            status: 3,
            data: ""
        }
    }
    var sak = ret.data[0];


    if(((atqa&0x40) !== 0x40) || (snr[0] !== 0x88) || (sak !== 0x04))//4字节卡号
    {
        return {
            status: 0,
            data: snr
        }
    }
    
    //7字节卡号
    var cln = 2;
        
    var ret2 = await aCascAntiCollision(cln) ;//2次防冲撞
    if(ret2.status !== 0)
    {
            return {
                status: 4,
                data: ""
            }
    }

    var snr2 = ret2.data.slice(0,4);
    ret2 = await aCascSelect(cln, snr2) ;
    if(ret2.status !== 0)
    {
            return {
                status: 5,
                data: ""
            }
    }

    var snr3 = new Uint8Array(7);

    snr3[0] = snr[1];
    snr3[1] = snr[2];
    snr3[2] = snr[3];
    snr3[3] = snr2[0];
    snr3[4] = snr2[1];
    snr3[5] = snr2[2];
    snr3[6] = snr2[3];

    return {
        status: 0,
        data: snr3
    }
}


//读扇区数据
//成功返回{status:0,data:扇区数据}
async function M1_ReadSector(mode, key, sector) 
{
    var ret = await M1_ReadSnr(0x52);//读卡号
    if(ret.status !== 0)
    {
        return {
            status: 1,
            data: ""
        }
    }


    var block = sector * 4; //扇区号转换为块号
    ret = await aCS_Authentication2(mode, block, key);//验证密码
    if(ret.status !== 0)
    {
        return {
            status: 2,
            data: ""
        }
    }


    var sector_data = new Uint8Array(48);
    ret = await aCS_Read(block);//读扇区第0块
    if(ret.status !== 0)
    {
        return {
            status: 3,
            data: ""
        }
    }
    for(var i = 0; i < 16; i++)
    {
        sector_data[0+i] = ret.data[i];    
    }

    block++;
    ret = await aCS_Read(block);//读扇区第1块
    if(ret.status !== 0)
    {
        return {
            status: 4,
            data: ""
        }
    }
    for(var i = 0; i < 16; i++)
    {
        sector_data[16+i] = ret.data[i];    
    }

    block++;
    ret = await aCS_Read(block);//读扇区第2块
    if(ret.status !== 0)
    {
        return {
            status: 5,
            data: ""
        }
    }
    for(var i = 0; i < 16; i++)
    {
        sector_data[32+i] = ret.data[i];    
    }

    return{
        status: 0,
        data: sector_data
    }
}



//修改扇区密码
//成功返回{status:0,data:""}
//new_key是一个16字节的数组，前6字节是A密码，后6字节是B密码，中间4个字节是控制块，控制块我们用默认的FF078069
async function M1_WriteKey(mode, key, sector, new_key) 
{
    var ret = await M1_ReadSnr(0x52);//读卡号
    if(ret.status !== 0)
    {
        return {
            status: 1,
            data: ""
        }
    }


    var block = sector * 4 + 3; //扇区号转换为块号
    ret = await aCS_Authentication2(mode, block, key);//验证密码
    if(ret.status !== 0)
    {
        return {
            status: 2,
            data: ""
        }
    }

    ret = await aCS_Write(block, new_key);//写block3
    if(ret.status !== 0)
    {
        return {
            status: 3,
            data: ""
        }
    }

    return ret;
}



//写卡，不支持cuid卡
//成功返回{status:0,data:""}
//sector_data是一个48字节的数组，前16字节是扇区0块，后16字节是扇区1块，后16字节是扇区2块
async function M1_WriteCard(mode, key, sector, sector_data) 
{
    var ret = await M1_ReadSnr(0x52);//读卡号
    if(ret.status !== 0)
    {
        return {
            status: 1,
            data: ""
        }
    }

    var block_data;
    var block = sector * 4; //扇区号转换为块号
    ret = await aCS_Authentication2(mode, block, key);//验证密码
    if(ret.status !== 0)
    {
        return {
            status: 2,
            data: ""
        }
    }

    if(sector !== 0 && sector_data.length == 16) //不写0扇区0块   
    {
        block_data = sector_data.slice(0,16);
        ret = await aCS_Write(block, block_data);//写block0
        if(ret.status !== 0)
        {
            return {
                status: 3,
                data: ""
            }
        }
    }
    if(sector_data.length == 32){
        block++;
        block_data = sector_data.slice(16,32);
        ret = await aCS_Write(block, block_data);//写block1
        if(ret.status !== 0)
        {
                return {
                    status: 3,
                    data: ""
                }
        }
    }
    if(sector_data.length == 48){
        block++;
        block_data = sector_data.slice(32, 48);
        ret = await aCS_Write(block, block_data);//写block2
        if(ret.status !== 0)
        {
                return {
                    status: 3,
                    data: ""
                }
        }
    }
    return ret;

}



//写CUID卡，
//成功返回{status:0,data:""}
//sector_data是一个48字节的数组，前16字节是扇区0块，后16字节是扇区1块，后16字节是扇区2块
async function CUID_WriteCard(mode, key, sector, sector_data) 
{
    var ret = await M1_ReadSnr(0x52);//读卡号
    if(ret.status !== 0)
    {
        return {
            status: 1,
            data: ""
        }
    }

    var block_data;
    var block = sector * 4; //扇区号转换为块号
    ret = await aCS_Authentication2(mode, block, key);//验证密码
    if(ret.status !== 0)
    {
        return {
            status: 2,
            data: ""
        }
    }


    block_data = sector_data.slice(0,16);
    if(sector == 0) //0扇区0块的数据格式有点特别
    {
        block_data[4] = block_data[0] ^block_data[1] ^block_data[2] ^block_data[3]; //计算校验和
        //block_data[5] = 0x08;//有些CUID这3位也有固定格式
        //block_data[6] = 0x04;
        //block_data[7] = 0x04;
    }

    ret = await aCS_Write(block, block_data);//写block0
    if(ret.status !== 0)
    {
            return {
                status: 3,
                data: ""
            }
    }

    if(sector == 0) //修改卡号之后需要重新读卡号
    {
        ret = await M1_ReadSnr(0x52);//读卡号
        if(ret.status !== 0)
        {
            return {
                status: 4,
                data: ""
            }
        }
    }


    block++;
    block_data = sector_data.slice(16,32);
    ret = await aCS_Write(block, block_data);//写block1
    if(ret.status !== 0)
    {
            return {
                status: 5,
                data: ""
            }
    }

    block++;
    block_data = sector_data.slice(32, 48);
    ret = await aCS_Write(block, block_data);//写block2
    if(ret.status !== 0)
    {
            return {
                status: 6,
                data: ""
            }
    }
    

    return ret;
}
