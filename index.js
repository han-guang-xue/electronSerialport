/*
 * @Author: your name
 * @Date: 2021-01-22 11:44:12
 * @LastEditTime: 2021-02-16 11:22:01
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \shifang\index.js
 */


var ws;
function createWebscoket() {
    ws = new WebSocket('ws://localhost:8001');
    ws.onopen = function (e) {
        console.log('客户端与服务器的连接已经打开 ! ');
        ws.onmessage = function (msg) {
            const para = JSON.parse(msg.data);
            console.log("client: ");

            console.log(para);
            const flag = para.flag;

            //获取网关类型
            if (flag === CONF.GETTYPEWAY) {
                //网关中心的一些配置
                if (para.value === CONF.DEVICE_CENTER) {
                    $("#devmsg").text("密钥管理中心")
                    send({ flag: CONF.GET_ALLKEY })
                }
                //非网关
                if (para.value === CONF.DEVICE_SUBSET) {
                    $('<button id="synchronouKey" class="py-2 pl-6 pr-6 mr-3 flex btn btn-outline-danger">' +
                        '    导入密钥表' +
                        '</button>').appendTo($("#btns"))
                    $("#devmsg").text("安全网关")

                    $("#synchronouKey").click(() => {
                        send({ flag: CONF.CODE_IMTSIK })
                    })
                }
                $("#box").addClass("boxopacity");
            }
            //展示所有设备信息
            if (flag === CONF.GET_ALLKEY_SUCCESS) {
                appendTable(CONF.GET_ALLKEY_SUCCESS, JSON.parse(para.value))
            }

            if (flag === CONF.GET_ALLKEY_FAILURE) {
                appendTable(CONF.GET_ALLKEY_FAILURE);
            }

            //修改密码成功
            if (flag === CONF.CHANGE_PSS_OK) {
                send({ flag: CONF.REBOOT })
            }

            if (flag === CONF.CHANGE_PSS_ERROR) {
                // alert("密码修改失败, 请检查设备是否连接正确! ")
            }

            if (flag === CONF.PKEYFILE_ERROR) {
                // alert("公钥文件内容格式不正确! ")
            }

            if (flag === CONF.CODE_CLAIMK_SUCCESS) {
                //更新/添加公钥成功
                $("#addkey").modal('hide')
                send({ flag: CONF.GET_ALLKEY })
            }
        }
        //判断是否是网关中心
        send({ flag: CONF.ALREADY })
        //获取设备信息和公钥
        // send({ flag: CONF.GET_ALLKEY });
    }


    //保持连接状态
    setInterval(() => {
        send({ flag: CONF.CON_STATUS })
    }, 10000);
}

function settitle(ele) {
    var x = 10;
    var y = 20;
    var newtitle = '';

    $(ele).mouseover(function (e) {
        newtitle = this.title;
        this.title = '';
        $('body').append('<div id="mytitle" >' + newtitle + '</div>');
        $('#mytitle').css({
            'left': (e.pageX + x + 'px'),
            'top': (e.pageY + y - 80 + 'px')
        }).show();
    }).mouseout(function () {
        this.title = newtitle;
        $('#mytitle').remove();
    }).mousemove(function (e) {
        $('#mytitle').css({
            'left': (e.pageX + x + 10 + 'px'),
            'top': (e.pageY + y - 60 + 'px')
        }).show();
    })
}

function btnmodal() {
    //模态框退出登录
    $("#serialDevice").click(() => {
        send({ flag: CONF.REBOOT })
    })

    //修改密码
    $("#btn_chp").click(() => {
        $("#box").addClass("stl-exit");
        $("#chp").modal("show")
    })

    $("#btn_chp_false").click(() => {
        $("#box").removeClass("stl-exit");
        $("#chp").modal("hide")
    })

    $("#btn_chp_true").click(() => {
        var uvalue = $("#updatePassword").val();
        if (uvalue.length > 16) {
            alert("密码长度不能大于16");
            return;
        }
        send({ flag: CONF.CHANGE_PSS, value: uvalue })
        $("#box").removeClass("stl-exit");
        $("#chp").modal("hide")
    })



    //退出
    $("#btn_exit").click(() => {
        $("#box").addClass("stl-exit");
        $("#staticBackdrop").modal('show');
    })

    $("#btn_exit_false").click(() => {
        $("#box").removeClass("stl-exit");
        $("#staticBackdrop").modal('hide');
    })

    $("#btn_exit_true").click(() => {
        send({ flag: CONF.EXITBOOT })
    })

    //导出公钥
    $("#exportPKey").click(function () {
        send({ flag: CONF.CODE_EXPKEY })
    })

    //生成密钥
    $("#genPkey").click(function () {
        send({ flag: CONF.CODE_GENKEY })
    })
}

function send(data) {
    ws.send(JSON.stringify(data))
}

var CONF;
$(function () {
    //加载配置文件
    $.getJSON('./config.json', function (data) {
        CONF = data;
        createWebscoket();

        //添加静态按钮事件
        btnmodal();

        //设置tittle
        settitle(".siskey");
    })
})

function appendTable(type, data) {
    $('.sf-center').remove()
    $('#update').remove()

    $('<div class="sf-center"> </div>').appendTo($('.sf-box'))
    $('<button id="update" class="py-2 pl-6 pr-6 mr-3 flex btn btn-outline-success siskey_table_btn3">' +
        '  添加新设备' +
        '</button>').prependTo($("#btns"))

    $('<table class="table table-hover">' +
        '    <tr>' +
        '        <th>编号</th>' +
        '        <th>单位名称</th>' +
        '        <th style="width: 200px">操作' +
        '</th>' +
        '    </tr>' +
        '</table>').appendTo($(".sf-center"))

    if (type === CONF.GET_ALLKEY_FAILURE) {
        $('<tr><td colspan="3" class="alert alert-warning" style="font-size:12px;">还没有设备, 请点击右上角按钮 <a href="#" class="alert-link">"添加新设备"</a> 添加设备</td></tr>').appendTo($('table'))
        return
    }
    var comname = "中央大门有限公司";
    data.forEach(item => {
        $('<tr>' +
            '    <td class="number">' + item.number + '</td>' +
            '    <td>' + UTF8ToStr(Str2Bytes(item.name)) + '</td>' +
            '    <td>' +
            '    <button type="button" class="btn btn-link sf-button siskey_table genSissionKey" style="padding: 0" title="生成/更换会话密钥"' +
            '        data-toggle="tooltip" data-placement="top">' +
            '        <svg t="1611662008375" class="icon" viewBox="0 0 1024 1024" version="1.1"' +
            '        xmlns="http://www.w3.org/2000/svg" p-id="3094" width="20" height="20">' +
            '        <path' +
            '            d="M298.666667 597.333333a85.333333 85.333333 0 0 1-85.333334-85.333333 85.333333 85.333333 0 0 1 85.333334-85.333333 85.333333 85.333333 0 0 1 85.333333 85.333333 85.333333 85.333333 0 0 1-85.333333 85.333333m241.066666-170.666666A255.573333 255.573333 0 0 0 298.666667 256a256 256 0 0 0-256 256 256 256 0 0 0 256 256 255.573333 255.573333 0 0 0 241.066666-170.666667H725.333333v170.666667h170.666667v-170.666667h85.333333v-170.666666z"' +
            '            fill="#1296db" p-id="3095"></path>' +
            '        </svg>' +
            '    </button>' +
            '    <button type="button" class="btn btn-link sf-button siskey_table exportKeyTable" style="padding: 0" title="导出密钥表"' +
            '        data-toggle="tooltip" data-placement="top">' +
            '        <svg t="1611661926660" class="icon" viewBox="0 0 1024 1024" version="1.1"' +
            '        xmlns="http://www.w3.org/2000/svg" p-id="3173" width="20" height="20">' +
            '        <path' +
            '            d="M848 232v672H288V232h560m0-56H288c-30.9 0-56 25.1-56 56v672c0 30.9 25.1 56 56 56h560c30.9 0 56-25.1 56-56V232c0-30.9-25.1-56-56-56z"' +
            '            p-id="3174" fill="#1296db"></path>' +
            '        <path' +
            '            d="M736 120v56H288l-56 56v560h-56V120h560m0-56H176c-30.9 0-56 25.1-56 56v672c0 30.9 25.1 56 56 56h112V232h504V120c0-30.9-25.1-56-56-56z"' +
            '            p-id="3175" fill="#1296db"></path>' +
            '        <path' +
            '            d="M708.9 428h-280c-15.5 0-28-12.5-28-28s12.5-28 28-28h280c15.5 0 28 12.5 28 28s-12.6 28-28 28zM708.9 596h-280c-15.5 0-28-12.5-28-28s12.5-28 28-28h280c15.5 0 28 12.5 28 28s-12.6 28-28 28zM708.9 764h-280c-15.5 0-28-12.5-28-28s12.5-28 28-28h280c15.5 0 28 12.5 28 28s-12.6 28-28 28z"' +
            '            p-id="3176" fill="#1296db"></path>' +
            '        </svg>' +
            '    </button>' +
            '    <button type="button" class="btn btn-link sf-button siskey_table siskey_table_btn3 updatekey" cname="' + comname + '" style="padding: 0" title="更换公钥"' +
            '        data-toggle="tooltip" data-placement="top">' +
            '        <svg t="1611662237096" class="icon" viewBox="0 0 1024 1024" version="1.1"' +
            '        xmlns="http://www.w3.org/2000/svg" p-id="6210" width="20" height="20">' +
            '        <path' +
            '            d="M620.916512 453.303009c121.789585 41.087185 253.754967-24.319518 294.842152-146.109102s-24.319518-253.754967-146.109102-294.906151c-121.789585-41.087185-253.818966 24.319518-294.842152 146.109102-41.087185 121.789585 24.319518 253.754967 146.109102 294.906151zM723.698473 161.020806c12.543751-37.119264 52.798953-57.150867 89.982215-44.607115 37.119264 12.543751 57.150867 52.798953 44.543117 90.046214-12.543751 37.119264-52.798953 57.150867-89.982215 44.607115-37.055265-12.543751-57.022869-52.862952-44.543117-90.046214zM499.702916 422.647617c-6.783865-7.167858-9.407813-9.535811-18.495633-5.0559l-335.225351 165.308721c-11.391774 5.695887-19.711609 3.327934-22.847547-3.071939-3.199937-6.335874-15.359695-26.815468-4.159917-32.383358l319.481664-160.700813c17.535652-8.639829 19.519613-37.31126 10.815785-54.846912 0 0-2.047959-13.951723-20.927585-27.327458-8.319835-5.951882-57.662856-8.255836-66.430682-4.671907-8.831825 3.583929-43.839131 51.710974-50.494999 51.518978-6.719867-0.255995-65.150708-30.079403-77.886455-11.199778-12.799746 18.943624-43.007147 104.445928-55.550898 110.653805-12.60775 6.207877-108.349851-41.727172-120.637607-41.85517-15.167699-0.127997-54.526919 67.58266-57.342863 85.950295l63.102748 128.893444c8.639829 17.535652 30.079403 24.767509 47.615056 16.12768l386.360337-190.460223c20.479594-10.175798 8.383834-18.751628 2.623948-26.879467zM682.163297 663.602839c-8.959822-4.095919-12.287756-5.247896-19.007623 2.303954l-247.675088 279.866449c-8.383834 9.59981-16.959664 10.559791-22.335557 5.823884-5.375893-4.671907-24.383516-19.007623-16.12768-28.351438l234.875342-269.690651c12.927744-14.591711 3.903923-41.919169-10.815785-54.846912 0 0-7.167858-12.09576-29.695411-17.343656-9.919803-2.431952-56.510879 14.143719-63.230746 20.799587-6.847864 6.655868-20.991584 64.446722-27.199461 66.814675-6.335874 2.303954-71.678578-3.199937-76.350486 19.13562-4.671907 22.399556-0.255995 112.95776-9.471812 123.453551-9.343815 10.495792-116.093697 2.431952-127.485472 6.911863-14.079721 5.631888-34.559315 84.094332-23.67953 93.694142l110.333812 102.973958c14.655709 12.927744 37.247261 11.519772 50.175005-3.071939l285.498338-322.553603c15.039702-17.215659 0.575989-20.607591-7.807845-25.919486zM980.909372 280.186443c-22.719549 137.021282-140.925205 241.851203-284.410359 241.851203-43.967128 0-85.246309-10.559791-122.557569-28.159442 34.623313 94.014135 126.845484 158.780851 231.995399 152.188982 128.253456-8.06384 225.659524-118.589648 217.595684-246.843104-2.815944-44.607115-18.623631-85.054313-42.623155-119.037639z"' +
            '            p-id="6211" fill="#1296db"></path>' +
            '        </svg>' +
            '    </button>' +
            '    </td>' +
            '</tr>').appendTo($("table"))
    })
    $('<tr><td colspan="3" class="alert alert-light" style="font-size:12px;">共 <a href="#" class="alert-link">' + data.length + '</a> 条</td></tr>').appendTo($('table'))
    settitle(".siskey_table");

    //生成,更换会话密钥
    $(".genSissionKey").click(function () {
        let number = $(this).parent().parent().find(".number").text();
        send({ flag: CONF.CODE_GENSIK, value: number })
    })

    // 导出密钥表
    $(".exportKeyTable").click(function () {
        let number = $(this).parent().parent().find(".number").text();
        send({ flag: CONF.CODE_EXPSIK, value: number })
    })

    //添加/更新 密钥
    $(".siskey_table_btn3").click(function () {
        let number = "FF"
        const isupdate = $(this).hasClass("updatekey")
        var cname = "";
        if (isupdate) {
            number = $(this).parent().parent().find(".number").text();
            cname = $(this).attr("cname")
        }
        $("#addkey").remove();
        $('<div class="modal fade" id="addkey" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">' +
            '  <div class="modal-dialog">' +
            '      <div class="modal-content">' +
            '      <div class="modal-header">' +
            '          <h5 class="modal-title" id="addkeymsg">' + (isupdate ? "更新设备" : "添加设备") + '   </h5>' +
            '          <button type="button" class="close" data-dismiss="modal" aria-label="Close">' +
            '          <span aria-hidden="true">&times;</span>' +
            '          </button>' +
            '      </div>' +
            '      <div class="modal-body">' +
            '          <form>' +
            '          <div class="form-group">' +
            '              <label for="exampleFormControlInput1">公司名称 <font color="#721c24" size="2">不能超过10个字符</font> </label>' +
            '              <input type="email" id="companyName" class="form-control" id="exampleFormControlInput1" value="' + cname + '" placeholder="填写公司名称">' +
            '          </div>' +
            '          <div class="form-group">' +
            '              <label for="exampleFormControlFile1">设备公钥</label>' +
            '              <input type="file" id="addkeyfile" class="form-control-file" id="exampleFormControlFile1">' +
            '          </div>' +
            '          </form>' +
            '      </div>' +
            '      <div class="modal-footer">' +
            '          <button type="button" class="btn btn-secondary" data-dismiss="modal">取消</button>' +
            '          <button type="button" id="addkey_true" class="btn btn-primary" >确认</button>' +
            '      </div>' +
            '      </div>' +
            '  </div>' +
            '</div>').appendTo($("body"))

        $("#addkey").modal('show')

        var verform_name = function (namevalue) {
            namevalue = namevalue.split(" ")
            $("#addkeymsg").find('font').remove()
            if (namevalue.length > 30 || namevalue.length == 0) {
                $('<font color="red" size="2">' + (namevalue == 0 ? '请输入公司名称' : '不能超过10个字符') + '</font>').appendTo($("#addkeymsg"))
                return false
            } else {
                $("#addkeymsg").find('font').remove()
                return true
            }
        }

        var verform_file = function (path) {
            $("#addkeymsg").find('font').remove()
            if (!path) {
                $('<font color="red" size="2">请上传公钥文件</font>').appendTo($("#addkeymsg"))
                return false
            } else {
                if (path.split(".")[1]) {
                    $('<font color="red" size="2">不支持' + path.split(".")[1] + '格式文件上传</font>').appendTo($("#addkeymsg"))
                    return false
                } else {
                    $("#addkeymsg").find('font').remove()
                    return true
                }
            }
        }

        $("#companyName").bind('input propertychange', function () {
            verform_name(Bytes2Str(ToUTF8(this.value)));
        })
        var cfile; //记录当前选择文件路径
        $("#addkeyfile").change(function () {
            cfile = this.files[0].path;
            verform_file(cfile)
        })

        $("#addkey_true").click(function () {
            var cname = Bytes2Str(ToUTF8($("#companyName").val()))
            if (verform_file(cfile) && verform_name(cname)) {
                cname = overing(cname, 30, 'F')
                send({ flag: CONF.ADD_PUBLIC_KEY, value: { isupdate, number, cname, cfile } })
            }
        })
    })
}

function overing(cname, num, ch) {
    var len = cname.split(" ").length;
    var val = ''
    if (len < num) {
        for (var i = len; i < 30; i++) {
            val += ' ' + ch + ch
        }
    }
    return cname + val
}

/** 将字符串转化为utf-8字节 */
function ToUTF8(str) {
    var result = new Array();
    var k = 0;
    for (var i = 0; i < str.length; i++) {
        var j = encodeURI(str[i]);
        if (j.length == 1) {
            // 未转换的字符
            result[k++] = j.charCodeAt(0);
        } else {
            // 转换成%XX形式的字符
            var bytes = j.split("%");
            for (var l = 1; l < bytes.length; l++) {
                result[k++] = parseInt("0x" + bytes[l]);
            }
        }
    }
    return result;
}

/** 将 byte 字节转化成十六进制 */
function Bytes2Str(arrBytes) {
    var str = ""
    for (var i = 0; i < arrBytes.length; i++) {
        var tmp;
        var num = arrBytes[i];
        if (num < 0) {
            //此处填坑，当byte因为符合位导致数值为负时候，需要对数据进行处理
            tmp = (255 + num + 1).toString(16);
        } else {
            tmp = num.toString(16);
        }
        if (tmp.length == 1) {
            tmp = "0" + tmp;
        }
        if (i > 0) {
            str += " " + tmp;
        } else {
            str += tmp;
        }
    }
    return str;
}

/** 将十六进制字符串转化为 byte 数组 */
function Str2Bytes(name) {
    var hexA = new Array();
    name.forEach(item => {
        if (item === 'ff') {
            return hexA
        } else {
            hexA.push(parseInt(item, 16))
        }
    })
    return hexA
}
/** UTF8 转化为字符串 */
function UTF8ToStr(arr) {
    let val = ''
    arr.forEach(item => {
        if (item < 127) {
            val += String.fromCharCode(item)
        } else {
            val += '%' + item.toString(16).toUpperCase()
        }
    })
    console.log(val)
    try {
        return decodeURI(val)
    } catch (err) {
        return val
    }
}