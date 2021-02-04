/*
 * @Author: your name
 * @Date: 2021-01-21 18:24:25
 * @LastEditTime: 2021-02-04 14:59:43
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \shifang\main.js
 */
// console.log('process.versions.electron', process.versions.electron)
// console.log('process.versions.modules', process.versions.modules)
// console.log('process.versions.node', process.versions.node)
// console.log('process.versions.v8', process.versions.v8)
// console.log('process.versions.chrome', process.versions.chrome)
// console.log('process.env.PROCESSOR_ARCHITECTURE', process.env.PROCESSOR_ARCHITECTURE)

const { app, BrowserWindow } = require('electron')
const path = require('path')
const ws = require('nodejs-websocket')
const SerialPort = require('serialport');
const fs = require("fs")


// 热加载
// try {
//   require('electron-reloader')(module);
// } catch (_) { }

/** 读取配置文件 */
const CONF = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

var reboot = false
var wintype;//网关类型
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
  // loginWin.openDevTools()
}

function createMainWin(width, height, resizable) {
  mainWin = new BrowserWindow({
    width: width,
    height: height,
    resizable,
    webPreferences: {
      nodeIntegration: false
    },
    show: true
  })
  mainWin.removeMenu();
  mainWin.loadFile('./index.html')
  // mainWin.openDevTools()
  mainWin.on('close', function () {
    //主窗口关闭的时候必须将webscoket关闭
    //当服务关闭时触发该事件，如果有任何一个 connection 保持链接，都不会触发该事件
    //所以在关闭webscoket时候一定要保持没有客户端与它连接,否则关闭不了
    webconn.close();
  })

  mainWin.on('closed', function () {
    loginWin.close();
  })
}

app.whenReady().then(createLoginWin)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    if (reboot) { //重新启动
      app.relaunch()
    }
  }
})


/** 创建 webscoket 服务, 监听串口通信 并发送客户端 */
var webconn;
function createServer() {
  ws.createServer(function (conn) {
    webconn = conn;
    var send = function (data) { conn.sendText(JSON.stringify(data)) }
    var csend = function (buff, success) {
      serialPortData = ''
      curPort.write(buff, function (err) {
        setTimeout(() => {
          var res = serialPortData.toString();
          success(res.trim())
        }, 500)
      })
    }
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
          err => {
            console.log(err)
            send({ flag: CONF.ERR_PORT, value: err })
          })
      }

      if (flag === CONF.USER_VALI) {
        //验证用户登录信息
        serialPortData = ''
        csend(getbuff(CONF.CODE_VERIUK, 'admin', para.value), (res) => {
          console.log(res)
          if (res === CONF.DEVICE_PERROR) {
            send({ flag: CONF.ERR_VAIL })
          } else if (res === CONF.DEVICE_CENTER || res === CONF.DEVICE_SUBSET) {
            wintype = res; //如果用户验证正确, 则返回网关类型
            send({ flag: CONF.SUS_VAIL })
          } else {
            throw new Error("程序出错");
          }
        })
      }
      //修改密码
      if (flag === CONF.CHANGE_PSS) {
        csend(getbuff(CONF.CODE_UPUPAS, para.value), (res) => {
          console.log(res)
          if (res === CONF.DEVICE_PERROR) {
            send({ flag: CONF.CHANGE_PSS_ERROR })
          } else if (res === CONF.DEVICE_POK) {
            send({ flag: CONF.CHANGE_PSS_OK })
          } else {
            throw new Error("程序出错");
          }
        })
      }

      if (flag === CONF.GETTYPEWAY) {
        loginWin.hide()
        // wintype = CONF.DEVICE_CENTER //网关中心
        // wintype = CONF.DEVICE_SUBSET //网关
        if (wintype == CONF.DEVICE_CENTER) {
          createMainWin(1000, 800, true)
        } else if (wintype == CONF.DEVICE_SUBSET) {
          createMainWin(490, 300, false)
        }
      }

      //窗体已经加载好了
      if (flag === CONF.ALREADY) {
        setTimeout(() => {
          send({ flag: CONF.GETTYPEWAY, value: wintype })
        }, 1000)
      }



      //获取所有设备表和公钥信息
      if (flag === CONF.GET_ALLKEY) {
        csend(getbuff(CONF.CODE_EXPSIK, (res) => {
          console.log(res)
        }))


        // send({ flag: CONF.GET_ALLKEY, value: {} })
      }

      //重新启动 
      if (flag === CONF.REBOOT) {
        reboot = true
        mainWin.close()
        reboot = false
      }

      if (flag === CONF.EXITBOOT) {
        mainWin.close()
      }

      if (flag === CONF.ADD_PUBLIC_KEY) {
        const cvalue = para.value
        const content = fs.readFileSync(cvalue.cfile, 'utf-8')
        if (content.length != 64) {
          send({ flag: CONF.PKEYFILE_ERROR })
        } else {
          //发送指令
          // curPort.write()
          send({ flag: CONF.PKEYFILE_OK })
        }
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
//   serialPortData = ''
//   para.value.length + 'admin'.length;
//   curPort.write("FFFF0011admin111111", 'utf-8', function (err, res) {
//     setTimeout(() => {
//       console.log(serialPortData.toString('hex'))
//     }, 500)
//   })
// }, () => { })

//开启webscoket
createServer()


console.log(getbuff(CONF.CODE_UPUPAS, '222222'))




function getbuff(code, ...para) {
  var len = 0;
  var flag = '';
  var val = '';
  para.forEach(item => {
    val += item
    len += item.length
  })
  if (len < 10) {
    flag = '000' + len
  } else if (len < 100) {
    flag = '00' + len
  } else if (len < 1000) {
    flag = '0' + len
  }
  console.log(code + flag + val)
  return code + flag + val
}

/** 补位操作 */
function covering(str) {
  var val = '';
  var str1 = str.split(" ")
  for (var i = 0; i < str1.length; i++) {
    var item = str1[i];
    if (item.length == 1) {
      item = '0' + item
    }
    val += ' ' + item
  }
  return val.trim()
}

/** 字符串转化十六进制 */
function stringToHex(str, size) {
  var val = "";
  for (var i = 0; i < str.length; i++) {
    if (val == "")
      val = str.charCodeAt(i).toString(16);
    else
      val += " " + str.charCodeAt(i).toString(16);
  }

  if (str.length < size) {
    for (var i = str.length; i < size; i++) {
      if (val == "")
        val = '00';
      else
        val += " " + '00';
    }
  }

  return val;
}