/*
 * @Author: your name
 * @Date: 2021-02-02 10:47:38
 * @LastEditTime: 2021-02-04 13:29:03
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \electron-serialport-start\login.js
 */

var ws;
function send(data) {
    ws.send(JSON.stringify(data))
}
function createWebscoket() {
    ws = new WebSocket('ws://localhost:8001');
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
            appendLogin();
        }
        if (flag === CONF.ERR_PORT) {
            //串口连接成功
            $("#devicePortMessage").find("p").remove()
            $("#devicePortMessage").append($("<p style='color:red;font-size:12px;'> 连接失败,请检查是否网关设备端口<br>例如win10系统:我的电脑->设备管理->系统工具->设备管理器->端口<br>可通过插拔设备查看串口显示</p>"))
        }

        if (flag === CONF.ERR_VAIL) {
            //登录失败
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
    $(".lg_list").remove();

    $(".lg_main").append($('<form id="lg_list_device" class="lg_list">' +
        '    <div class="form-group">' +
        '        <div id="devicePortMessage" style="color: green">' +
        '            已检测到的串口设备' +
        '        </div>' +
        '        <select multiple class="form-control" id="devicePort"></select>' +
        '    </div>' +
        '</form>'));


    ports.forEach(item => {
        $("#devicePort").append($('<option class="chooseDevice" value="' + item.path.slice(-1) + '" ' + (item.path == curPort ? 'selected' : '') + '>' + item.path + '</option>'))
    });

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
        '        <input id="password" type="password" class="form-control logging-input" id="loggin_password"' +
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
        //创建webscoket
        createWebscoket();
    })
})
