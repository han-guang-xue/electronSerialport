/*
 * @Author: your name
 * @Date: 2021-01-21 18:24:25
 * @LastEditTime: 2021-02-02 14:42:22
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \shifang\main.js
 */
const { app, BrowserWindow } = require('electron')
const path = require('path')
const ws = require('nodejs-websocket')
const SerialPort = require('serialport');
const fs = require("fs")

// 热加载
try {
  require('electron-reloader')(module);
} catch (_) { }

/** 读取配置文件 */
const CONF = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
var loginWin;
var mainWin;

function createLoginWin() {
  loginWin = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      nodeIntegration: false
    },
    show: true
  })
  loginWin.removeMenu();
  loginWin.loadFile('./login.html')
  // win.openDevTools()
}

function createMainWin() {
  mainWin = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false
    },
    show: true
  })
  mainWin.removeMenu();
  mainWin.loadFile('./index.html')
  mainWin.openDevTools()
}

app.whenReady().then(createLoginWin)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})


/** 创建 webscoket 服务, 监听串口通信 并发送客户端 */
function createServer() {
  ws.createServer(function (conn) {
    var send = function (data) { conn.sendText(JSON.stringify(data)) };
    conn.on("text", function (str) {
      const para = JSON.parse(str)
      const flag = para.flag
      console.log(para)
      if (flag === CONF.LIST_PORT) {
        // 获取所有串口
        var listPort = []
        SerialPort.list().then(ports => {
          ports.forEach(item => {
            listPort.push({ path: item.path })
          })
          send({ flag: CONF.LIST_PORT, value: listPort })
        });
      }

      if (flag === CONF.SET_PORT) {
        //串口连接
        operPort(para.value,
          status => {
            send({ flag: CONF.SUS_PORT })
          },
          // data => {
          //   console.log(data.toString('ascii'))
          //   // send({ flag: CONF.SUS_DATA, value: data.toString('hex') }) //接收二进制
          //   send({ flag: CONF.SUS_DATA, value: data.toString('ascii') }) //接收字符串
          // },
          err => {
            console.log(err)
            send({ flag: CONF.ERR_PORT, value: err })
          })
      }

      if (flag === CONF.USER_VALI) {
        //验证用户登录信息
        serialPortData = '';
        curPort.write(CONF.CODE_VERIUK, function (err) {
          setTimeout(() => {
            var res = serialPortData.toString("ascii");
            console.log(res);
            if (true) { //登录成功测试
              send({ flag: CONF.SUS_VAIL })
              setTimeout(() => {
                loginWin.hide()
                createMainWin()
              }, 1000)
            }
            // if (res === '0123456789ABCDEFGHIK' + para.value.password) {
            //   send({ flag: CONF.SUS_VAIL })
            // } else {
            //   send({ flag: CONF.ERR_VAIL })
            // }

          }, 500)
        })
      }

      //获取所有设备表和公钥信息
      if (flag === CONF.GET_ALLKEY) {
        send({ flag: CONF.GET_ALLKEY, value: {} })
      }
    })
    conn.on("close", function (coded, reason) {
      console.log("connection closed")
    })
  }).listen(8001)
}


var curPort;
var serialPortData = ""; //用于接收并整合串口数据
function operPort(port, open, fail) {
  curPort = new SerialPort('com' + port, {
    baudRate: 115200,
    autoOpen: true,
    stopBits: 1,
    dataBits: 8,
    parity: 'none',
    highWaterMark: 1000
  }, false)

  curPort.open(function () {
    open();
    curPort.on('data', function (data) {
      serialPortData += data
    }).on('error', fail)
  })
}

/** 测试 */
// operPort('3', () => {
//   curPort.write("FFFA", 'utf-8', function (err, res) {
//     setTimeout(() => {
//       console.log(serialPortData.toString('hex'))
//     }, 2000)
//   })
// }, () => { })

//开启webscoket
createServer()


