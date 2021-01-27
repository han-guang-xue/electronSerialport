/*
 * @Author: your name
 * @Date: 2021-01-22 11:44:12
 * @LastEditTime: 2021-01-27 16:39:27
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \shifang\index.js
 */
var ws;
function createWebscoket() {
    ws = new WebSocket('ws://localhost:8183');
    ws.onopen = function (e) {
        console.log('客户端与服务器的连接已经打开 ! ');
    }
    ws.onmessage = function (msg) {
        console.log(msg);
    }
    // ws.send("send data test")
}


function settitle() {
    var x = 10;
    var y = 20;
    var newtitle = '';
    $('.siskey').mouseover(function (e) {
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
    $(".exit").click(function (e) {
        $("#staticBackdrop").modal('hide');
        $("#box").addClass("stl-exit");
        $("#exampleModal1").modal('show');
    })

    $(".logging-input").focus(function () {
        $("#loggin_message").find(".alert").remove();
    })

    $(".loggin").click(function (e) {
        var val = $("#loggin_password").val();

        $("#loggin_message").find(".alert").remove();

        if (val == "123") {
            $('<div class="alert alert-success" role="alert">' +
                '登录成功' +
                '</div>').appendTo($("#loggin_message"))

            //清除登录模态框
            setTimeout(function () {
                $("#exampleModal1").modal('hide')
                //清除滤镜
                $("#box").removeClass("stl-exit");
            }, 600)
        } else {
            $('<div class="alert alert-danger" role="alert">' +
                '密码错误' +
                '</div>').appendTo($("#loggin_message"))
        }
    })
}


$(function () {
    //创建webscoket
    createWebscoket();

    //设置tittle
    settitle();

    //添加操作按钮事件
    btnmodal();

})