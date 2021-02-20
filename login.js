/*
 * @Author: your name
 * @Date: 2021-02-02 10:47:38
 * @LastEditTime: 2021-02-20 16:41:42
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \electron-serialport-start\login.js
 */
var first = 0;
var ws;
function send(data) {
    ws.send(JSON.stringify(data))
}
function createWebscoket() {
    ws = new WebSocket('ws://localhost:' + CONF.SCOKET_PORT);
    ws.onopen = function (e) {
        console.log('客户端与服务器的连接已经打开! ');
        send({ flag: CONF.LIST_PORT });
    }
    ws.onmessage = function (msg) {
        const para = JSON.parse(msg.data);
        console.log(para);
        const flag = para.flag;
        if (flag === CONF.LIST_PORT) {
            //列举串口
            appendPort(para.value);
            $("#serialDevice").modal('show');
        }
        if (flag === CONF.SUS_PORT) {
            //串口连接成功
            appendLogin();
        }
        if (flag === CONF.ERR_PORT) {
            send({ flag: CONF.LIST_PORT });
        }

        if (flag === CONF.ERR_VAIL) {
            //登录失败
            $('#loggin_message').find('div').remove()
            $('<div class="alert alert-danger" role="alert">' +
                '密码错误' +
                '</div>').appendTo($("#loggin_message"))
        }

        if (flag === CONF.SUS_VAIL) {
            //登录成功
            $('<div class="alert alert-success" role="alert">' +
                '登录成功' +
                '</div>').appendTo($("#loggin_message"))
            send({ flag: CONF.GETTYPEWAY }) //获取窗体类型
            ws.close()
        }
    }
}
var curPort;
function appendPort(ports) {
    $(".lg_list").remove()
    $(".lg_main").append($('<form id="lg_list_device" class="lg_list">' +
        '    <div class="form-group">' +
        '        <div id="devicePortMessage" style="color: green">' +
        '            已检测到的串口设备' +
        '        </div>' +
        '        <select multiple class="form-control" id="devicePort"></select>' +
        '    </div>' +
        '    <div style="display: flex;justify-content: center;"><button id="reflash" type="button" class="btn btn-link">' +
        '<svg t="1613810297740" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2326" ' +
        ' width="25" height="25"><path d="M913.311527 384.088772 732.144374 384.088772c-23.112394 0-41.807175-18.726503-41.807175-41.809221 0-23.080671 18.695804-41.807175 41.807175-41.807175l72.727395 0c-65.60416-92.700285-173.48417-153.296385-295.703769-153.296385-200.113667 0-362.338399 162.224732-362.338399 362.336352 0 200.112644 162.224732 362.337375 362.338399 362.337375 200.112644 0 362.337375-162.224732 362.337375-362.337375 0-23.080671 18.694781-41.807175 41.806151-41.807175 23.082718 0 41.810245 18.726503 41.810245 41.807175 0 246.292406-199.679785 445.953771-445.953771 445.953771-246.277056 0-445.954795-199.661366-445.954795-445.953771 0-246.291382 199.677738-445.952748 445.954795-445.952748 149.46922 0 281.489022 73.692373 362.337375 186.596815l0-75.108628c0-23.082718 18.694781-41.808198 41.806151-41.808198 23.082718 0 41.810245 18.72548 41.810245 41.808198l0 167.231769C955.121771 365.362268 936.393221 384.088772 913.311527 384.088772z" p-id="2327" fill="#bfbfbf"></path></svg>' +
        ' <font style="font-size:10px;">刷新</font> </button></div>' +
        '</form>'));


    ports.forEach(item => {
        $("#devicePort").append($('<option class="chooseDevice" value="' + item.path.slice(-1) + '" ' + (item.path == curPort ? 'selected' : '') + '>' + item.path + '</option>'))
    });
    if (ports.length == 0) {
        $("#devicePortMessage").html("<font color='red'>没有检测到设备</font>")
    }

    $("#reflash").click(() => {
        send({ flag: CONF.LIST_PORT });
    })

    $(".chooseDevice").click(function () {
        curPort = $("#devicePort").val()[0];
        send({ flag: CONF.SET_PORT, value: curPort })
    })
}

function appendLogin() {
    $(".lg_list").remove();
    $(".lg_main").append($('<form id="lg_loging" class="lg_list">' +
        '    <div id="loggin_message"></div>' +
        '    <div class="form-group">' +
        '        <label for="recipient-name" class="col-form-label">密码:</label>' +
        '        <input  id="password" type="password" autofocus="autofocus" class="form-control logging-input" id="loggin_password"' +
        '            placeholder="请输入密码" />' +
        '    </div>' +
        '    <div class="form-group" style="margin-top:40px;"><button id="loggin" type="button" class="btn btn-primary btn-block">登录</button></div>' +
        '</form> '))

    $("#password").click(() => {
        $("#loggin_message").find("div").remove();
    })

    $("#loggin").click(() => {
        //认证密码长度
        send({ flag: CONF.USER_VALI, value: $("#password").val() })
    })
}

var CONF;
$(function () {
    //加载配置文件
    $.getJSON('./config.json', function (data) {
        CONF = data;
        console.log(CONF)
        //创建webscoket
        createWebscoket();
    })
})
