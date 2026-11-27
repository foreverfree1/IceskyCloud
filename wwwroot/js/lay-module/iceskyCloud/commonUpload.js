/**
 * date:
 * author:cyw
 * version:1.0
 * description:IceskyCloud 主体框架扩展
 */
layui.define(["jquery"], function (exports) {
    var $ = layui.jquery;

    let obj = {
        uploadChunkUrl: "",//文件块上传地址
        uploadFileUrl: "",//合并文件接口
        miniUploadUrl: "",//小文件上传接口
        fileList: [],//文件字典从数组替换成
        currentFileIndex: 0,//当前文件夹索引
        chunkOffset: 0,//当前块号
        parallelCount: 4,//并行上传数量
        chunkSize: 1024 * 1024 * 5,//默认5M
        retryCount: 3,//重新尝试次数，一个文件某一块重复长传超过3次将会放弃上传
        moduleName: "",
        currentHash: "",
        chunkSuccess: 0,
        currentUploadSize: 0,//当前文件已经上传了多少
        deleteFile: function (key) {
            //没有处于上传中
            if (this.currentFileIndex === 0) {
                for (let i = 0; i < this.fileList.length; i++) {
                    if (this.fileList[i].key === key) {
                        this.fileList.splice(i, 1);
                    }
                }
            }
        },
        deleteAll: function () {
            if (this.currentFileIndex === 0) {
                //清空
                this.fileList.splice(0, this.fileList.length);
            }
        },
        startUpload: function (options) {

            let defualtConfiguration = {
                uploadChunkUrl: "/FileManage/Uploadfile/UploadChunk",//文件块上传地址
                uploadFileUrl: "/FileManage/Uploadfile/MergeFile",//合并文件接口
                miniUploadUrl: "/FileManage/Uploadfile/Uploads",//小文件上传接口
                parallelCount: 5,//并行上传数量
                chunkSize: 1024 * 1024 * 5,//默认5M
                retryCount: 3,//重新尝试次数，一个文件某一块重复长传超过3次将会放弃上传
                moduleName: '',
                calculateFileHash: this.calculateFileHash
            }

            options = $.extend(defualtConfiguration, options);

            this.uploadChunkUrl = options.uploadChunkUrl;
            this.uploadFileUrl = options.uploadFileUrl;
            this.miniUploadUrl = options.miniUploadUrl;
            this.parallelCount = options.parallelCount;
            this.chunkSize = options.chunkSize;
            this.retryCount = options.retryCount;
            this.moduleName = options.moduleName;
            this.calculateFileHash = options.calculateFileHash;

            let before = this.before();
            if (before) {
                this.uploadFile()
            }
        },
        before: function () {
            return true;
        },
        uploadFile: async function () {
            //上传文件块函数
            if (this.currentFileIndex >= this.fileList.length) {
                //完成后的回调函数
                this.allDone();
                return true;
            }
            //文件hash
            this.currentHash = this.calculateFileHash(this.fileList[this.currentFileIndex].file);

            let fileSize = this.fileList[this.currentFileIndex].file.size;
            //文件块数组
            let successFlag = true;

            let largeFlag = fileSize > this.chunkSize;

            if (largeFlag) {
                let chunkList = [];
                let arr = [];
                let totalChunk = Math.ceil(fileSize / this.chunkSize);
                //大文件解决方案
                while (true) {
                    chunkList = this.getChunkList();
                    for (let i = 0; i < chunkList.length; i++) {
                        arr.push(this.uploadChunk(fileSize, totalChunk, chunkList[i]));
                    }
                    let result = await Promise.all(arr);
                    for (let r in result) {
                        if (!result[r]) {
                            successFlag = false;
                            //this.fileUploadError();
                            break;
                        }
                    }
                    if (!successFlag) {
                        //有文件块上传失败退出
                        break;
                    }
                    if (chunkList.length < this.parallelCount) {
                        //文件上传完成合并文件
                        let res = await Promise.all([this.uploadChunk(fileSize, totalChunk, null, true)]);
                        successFlag = res[0];
                        break;
                    }
                    try {

                    } catch (error) {
                        successFlag = false;
                        break;
                    }
                }
            } else {
                //小文件通用文件
                let formData = new FormData();
                formData.append('files', this.fileList[this.currentFileIndex].file);
                formData.append('moduleName', this.moduleName);
                successFlag = await this.postAsync(formData, this.miniUploadUrl, true, false);
            }
            if (!successFlag) {
                this.fileUploadError();
                if (largeFlag) {
                    this.chunkSuccess = 0;
                    this.offset = 0;
                    this.currentUploadSize = 0;
                }
                this.currentFileIndex++;
            }
            return await this.uploadFile();
        },
        uploadChunk: async function (fileSize, totalChunk, chunk, complateFlag = false) {
            let formData = new FormData();
            let url = this.uploadChunkUrl;

            if (!complateFlag) {
                formData.append('file', chunk.file);
                formData.append('number', chunk.offset);
                //文件块上传
            } else {
                url = this.uploadFileUrl;
                formData.append('fileName', this.fileList[this.currentFileIndex].file.name);
                formData.append('fileSize', this.fileList[this.currentFileIndex].file.size);
                //合并文件
            }
            formData.append('moduleName', this.moduleName);
            formData.append('chunkSize', this.chunkSize);
            formData.append('fileHash', this.currentHash);
            formData.append('totalChunk', totalChunk);
            let result = await this.postAsync(formData, url, true, !complateFlag);
            //完成或者错误

            return result;
        },
        postAsync: async function (formData, url, retryFlag = false, chunkFlag = true) {
            let that = this;
            let a_response;
            //文件提交
            let successFlag = false;
            let xhr = new XMLHttpRequest();
            let lastLoaded = 0;
            let timestamp = new Date().getTime();
            xhr.upload.addEventListener("progress", function (evt) {
                if (evt.lengthComputable) {
                    //
                    let percentComplete = 0;
                    if (that.offset <= 0) {
                        percentComplete = evt.loaded / evt.total;
                        percentComplete = Math.ceil(percentComplete * 1000) / 10
                    } else {
                        that.currentUploadSize += (evt.loaded - lastLoaded);
                        lastLoaded = evt.loaded;
                        percentComplete = that.currentUploadSize / that.fileList[that.currentFileIndex].file.size;
                        percentComplete = Math.ceil(percentComplete * 100);
                        if (percentComplete >= 100) {
                            percentComplete = 100;
                        }
                    }
                    that.uploadProgress(that.fileList[that.currentFileIndex].key, percentComplete);
                }
            }, false);

            await $.ajax({
                url: url,
                type: "POST",
                data: formData,
                processData: false,  // 告诉 jQuery 不要处理发送的数据
                contentType: false, // 告诉 jQuery 不要设置内容类型头
                xhr: function () {
                    return xhr;
                },
                success: function (response) {

                    if (typeof JSON.parse(response) === 'object' && 'result' in JSON.parse(response) && JSON.parse(response).result) {
                        //回调函数
                        successFlag = true;
                        if (chunkFlag) {
                            //文件块上传成功回调函数
                            that.chunkSuccess++;
                            that.chunkUploadSuccess(that.chunkSuccess);
                        } else {
                            //文件上传成功回调函数
                            a_response = JSON.parse(response);
                            that.fileUploadSuccess(JSON.parse(response), that.fileList[that.currentFileIndex].key);
                            that.currentFileIndex++;
                            that.chunkOffset = 0;
                            that.chunkSuccess = 0;
                            that.currentUploadSize = 0;
                        }
                    } else {
                        //处理错误
                        //处理接口返回错误
                        a_response = JSON.parse(response);
                        that.chunkUploadError(JSON.parse(response));
                    }
                },
                error: function (xhr, status, error) {
                    //处理http级别错误
                    that.error(xhr, status, error);
                }
            });

            if (!successFlag && retryFlag) {

                //异常重试
                //successFlag = await that.postAsync(formData, url, false, chunkFlag);
                if (url.indexOf('MergeFile') > 0) {
                    successFlag = true;
                    that.fileUploadSuccess(a_response, that.fileList[that.currentFileIndex].key);
                    that.currentFileIndex++;
                    that.chunkOffset = 0;
                    that.chunkSuccess = 0;
                    that.currentUploadSize = 0;
                } else {
                    for (let i = 0; i < that.retryCount; i++) {
                        successFlag = await that.postAsync(formData, url, false, chunkFlag);
                    }
                }
                if (!successFlag) {
                    //多次重试失败
                }
            }
            return successFlag;
        },
        chunkUploadSuccess: function (totalChunk) {

            //一块文件上传成功后的回调
            //console.log(c);
            //上传成功的快数量
            //console.log(this.chunkSuccess);
            //console.log(this.totalChunk);
            //console.log('文件块上传成功回调函数!')
        },
        chunkUploadError: function (response) {
            //一块文件上传成功后的回调
            //console.log('文件块上传失败回调函数!')

        },
        fileUploadSuccess: function (res, key) {
            //文件上传成功回调函数
            //console.log()
        },
        fileUploadError: function () {
            //文件上传失败回调函数
            //console.log('文件上传失败!');
        },
        getChunkList: function () {
            //文件分片之后返回数组
            let chunks = [];
            if (this.parallelCount <= 0) {
                this.parallelCount = 1;
            }
            for (let i = 0; i < this.parallelCount; i++) {
                if (this.fileList[this.currentFileIndex].file.size > (this.chunkOffset + 1) * this.chunkSize) {

                    chunks.push({
                        offset: this.chunkOffset,
                        file: this.fileList[this.currentFileIndex].file.slice(this.chunkOffset * this.chunkSize, (this.chunkOffset + 1) * this.chunkSize),
                        size: this.chunkSize
                    });
                } else {
                    chunks.push({
                        offset: this.chunkOffset,
                        file: this.fileList[this.currentFileIndex].file.slice(this.chunkOffset * this.chunkSize, this.fileList[this.currentFileIndex].file.size),
                        size: this.fileList[this.currentFileIndex].file.size - this.chunkOffset * this.chunkSize
                    });
                    break;
                }
                this.chunkOffset++;
            }
            return chunks;
        },
        calculateFileHash: function (file, algorithm = 'SHA-256') {
            //v1版本存在大文件异常问题
            var S4 = function () { return ((1 + Math.random()) * 0X10000 | 0).toString(16).substring(1); };
            return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
            /*文件hash值唯一标识
            return new Promise((resolve, reject) => {
                const reader = new FileReader();

                // 读取文件为 ArrayBuffer
                reader.readAsArrayBuffer(file);

                reader.onload = async (event) => {
                    const arrayBuffer = event.target.result;

                    try {
                        // 使用 crypto.subtle.digest 计算哈希值
                        const hashBuffer = await crypto.subtle.digest(algorithm, arrayBuffer);
                        const hashArray = Array.from(new Uint8Array(hashBuffer)); // 将结果转换为字节数组
                        const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join(''); // 转换为十六进制字符串
                        resolve(hashHex);
                    } catch (error) {
                        reject(error);
                        console.log(error);
                    }
                };

                reader.onerror = (error) => {
                    reject(error);
                };
            });

            v2版本优化大文件hash计算
            return new Promise(async (resolve, reject) => {
                let offset = 0;
                let hash;
                let chunkSize = 1024 * 1024 * 10;
                 初始化哈希算法
                const hashBuffer = await crypto.subtle.digest(algorithm, new ArrayBuffer(0));
                hash = new Uint8Array(hashBuffer);
                while (offset < file.size) {
                     分块读取文件
                   const chunk = file.slice(offset, offset + chunkSize);
                    const chunkBuffer = await chunk.arrayBuffer();

                     将当前哈希值与新块结合
                    const combinedBuffer = new Uint8Array(hash.byteLength + chunkBuffer.byteLength);
                    combinedBuffer.set(new Uint8Array(hash), 0);
                    combinedBuffer.set(new Uint8Array(chunkBuffer), hash.byteLength);

                     更新哈希值
                    const newHashBuffer = await crypto.subtle.digest(algorithm, combinedBuffer);
                    hash = new Uint8Array(newHashBuffer);

                    const har = Array.from(hash);
                    const hx = har.map(byte => byte.toString(16).padStart(2, '0')).join('');
                    offset += chunkSize;
                }

                 将哈希值转换为十六进制字符串
                const hashArray = Array.from(hash);
                const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
	
                resolve(hashHex);
            });*/
        },
        error: function (xhr, status, error) {
            //http级别错误
            //console.log('http级别错误!');
        },
        allDone: function () {
            //最后的回调函数
            //console.log('最后回调函数!');
        },
        uploadProgress: function (key, percent) {
            //文件key
            //percent上传进度
            //console.log(key + ":" + percent + '%');
        }
    }
    exports("commonUpload", obj);
});