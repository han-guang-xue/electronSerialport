/*
 * @Author: your name
 * @Date: 2021-01-21 18:24:25
 * @LastEditTime: 2021-03-26 18:48:59
 * @LastEditors: hgx
 * @Description: In User Settings Edit
 * @FilePath: \electron-serialport-start\main.js
 */
const log = require('electron-log')

log.transports.file.fileName = 'serialport_client.log'
log.transports.console.level = 'silly'
log.transports.file.level = true; //是否输出到 日志文件
log.transports.console.level = true; //是否输出到 控制台

log.info('process.versions.electron' + process.versions.electron)
log.info('process.versions.modules' + process.versions.modules)
log.info('process.versions.node' + process.versions.node)
log.info('process.versions.v8' + process.versions.v8)
log.info('process.versions.chrome' + process.versions.chrome)
log.info('process.env.PROCESSOR_ARCHITECTURE' + process.env.PROCESSOR_ARCHITECTURE)

const { app, BrowserWindow, dialog } = require('electron')

const ws = require('nodejs-websocket')
const SerialPort = require('serialport');
const fs = require("fs");
var loginWin
var mainWin

let pathConfig = "./resources/app/config.json"
// let pathConfig = "./config.json"

/** 读取配置文件 */
var CONF;
try {
  CONF = JSON.parse(fs.readFileSync(pathConfig, 'utf-8'))
  log.info(JSON.stringify(CONF))
} catch (err) {
  log.error("Configuration file read failed")
  app.quit()
  return
}

var reboot = false
var wintype       //网关类型
var deviceNumber = "00"  //当前设备编号

function createLoginWin() {

  loginWin = new BrowserWindow({
    width: 400,
    height: 300,
    resizable: false,
    webPreferences: {
      nodeIntegration: false
    },
    show: false
  })
  loginWin.removeMenu();
  loginWin.loadFile('./src/login.html')
  // loginWin.openDevTools()
}

function createMainWin(width, height, resizable) {
  mainWin = new BrowserWindow({
    width: width,
    height: height,
    resizable,
    backgroundColor: '#2e2c29',
    webPreferences: {
      nodeIntegration: false
    },
    show: true
  })
  mainWin.removeMenu();
  mainWin.loadFile('./src/index.html')
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

// app.whenReady().then(createLoginWin)

const getTheLock = app.requestSingleInstanceLock()
if (!getTheLock) {
  app.quit()
  return
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (loginWin) {
      if (loginWin.isMinimized()) loginWin.restore()
      loginWin.focus()
    }
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore()
      mainWin.focus()
    }
  })
  app.on('ready', createLoginWin)
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    if (reboot) { //重新启动
      app.relaunch()
    }
  }
})

var showMessageBox = function (win, message) {
  dialog.showMessageBox(win, {
    type: 'info',
    title: '提示信息',
    message: message
  })
}

/** 创建 webscoket 服务, 监听串口通信 并发送客户端 */
var webconn
function createServer() {
  ws.createServer(function (conn) {
    webconn = conn;
    var send = function (data) { conn.sendText(JSON.stringify(data)) }
    conn.on("text", function (str) {
      const para = JSON.parse(str)
      const flag = para.flag
      log.info(para)
      if (flag === CONF.SET_PORT) {
        //串口连接
        operPort(para.value,
          status => {
            send({ flag: CONF.SUS_PORT })
          },
          err => {
            log.info(err)
            showMessageBox(loginWin, "请检查设备 COM" + para.value + " 是否连接正确或已被其它设备连接");
            send({ flag: CONF.ERR_PORT, value: err })
          })
      }

      //生成设备公私钥
      if (flag === CONF.CODE_GENKEY) {
        dialog.showOpenDialog(mainWin, { title: '选择更新后当前设备公钥的存储路径', properties: ['openDirectory'] }).then(res1 => {
          if (!res1.canceled) {
            savePath = res1.filePaths[0] + "\\"
            csend(getbuff(CONF.CODE_GENKEY), (res2) => {
              if (-1 != res2.indexOf(CONF.DEVICE_POK)) {
                // send({ flag: CONF.CODE_GENKEY_SUCCESS })
                // showMessageBox(mainWin, "更新成功")
                csend(getbuff(CONF.CODE_EXPKEY), res => {
                  var rdata = split_res(res)
                  if (rdata) {
                    rdata = covering(rdata, "");
                    if (rdata.length === 64 * 2) {
                      exitsfile(rdata, "PUBLICKEY", deviceNumber, (err, file) => {
                        if (err) {
                          showMessageBox(mainWin, "导出失败")
                        } else {
                          showMessageBox(mainWin, "更新成功, 更新后导出公钥文件路径:" + file)
                        }
                      })
                    } else {
                      showMessageBox(mainWin, "导出失败, 请检查设备是否连接正确")
                    }
                  } else {
                    showMessageBox(mainWin, '获取数据失败')
                  }
                })
              } else {
                showMessageBox(mainWin, "更新失败")
              }
            })
          }
        })
      }

      //导入密钥表
      if (flag === CONF.CODE_IMTSIK) {
        dialog.showOpenDialog(mainWin, { title: '选择要导入的文件', properties: ['openFile'] }).then(res => {
          if (!res.canceled) {
            var path = res.filePaths[0]
            if (path.indexOf("DATAKEY_") != -1) {
              const content = fs.readFileSync(path, 'utf-8')
              csend(getbuff(CONF.CODE_IMTSIK, content), res => {
                if (-1 != res.indexOf(CONF.DEVICE_POK)) {
                  showMessageBox(mainWin, "更新成功")
                } else if (-1 != res.indexOf(CONF.DEVICE_PERROR)) {
                  showMessageBox(mainWin, "更新失败")
                } else {
                  showMessageBox(mainWin, "更新失败, 可检查或重启设备之后尝试")
                }
              })
            } else {
              showMessageBox(mainWin, "不支持该文件类型")
            }
          }
        })
      }

      //导出设备公钥
      if (flag === CONF.CODE_EXPKEY) {
        dialog.showOpenDialog(mainWin, { title: '选择存储路径', properties: ['openDirectory'] }).then(res => {
          if (!res.canceled) {
            savePath = res.filePaths[0] + "\\"
            csend(getbuff(CONF.CODE_EXPKEY), (res) => {
              let rdata = split_res(res)
              if (rdata) {
                rdata = covering(rdata, "");
                if (rdata.length === 64 * 2) {
                  exitsfile(rdata, "PUBLICKEY", deviceNumber, (err, file) => {
                    if (err) {
                      showMessageBox(mainWin, "导出失败")
                    } else {
                      showMessageBox(mainWin, "导出成功, 文件路径:" + file)
                    }
                  })
                } else {
                  showMessageBox(mainWin, "导出失败, 请检查设备是否连接正确")
                }
              } else {
                showMessageBox(mainWin, '数据获取失败')
              }
            })
          }
        })
      }


      //生成,更换会话密钥
      if (flag === CONF.CODE_GENSIK) {
        csend(getbuff(CONF.CODE_GENSIK, para.value), res => {
          if (-1 != res.indexOf(CONF.DEVICE_POK)) {
            showMessageBox(mainWin, "设备 " + para.value + " 数据密钥更新成功")
          } else if (-1 != res.indexOf(CONF.DEVICE_PERROR)) {
            showMessageBox(mainWin, "操作失败")
          } else {
            showMessageBox(mainWin, "请检查设备是否连接")
          }
        })
      }

      // 导出密钥表
      if (flag === CONF.CODE_EXPSIK) {
        dialog.showOpenDialog(mainWin, { title: '选择要保存导出文件的目录', properties: ['openDirectory'] }).then(res1 => {
          if (!res1.canceled) {
            savePath = res1.filePaths[0] + "\\"
            csend(getbuff(CONF.CODE_EXPSIK, para.value), res => {
              if (-1 == res.indexOf(CONF.DEVICE_PERROR)) {
                let rdata = split_res(res)
                if (rdata) {
                  exitsfile(covering(rdata, ""), "DATAKEY", para.value, (err, file) => {
                    if (err) {
                      showMessageBox(mainWin, "导出失败")
                    } else {
                      showMessageBox(mainWin, "导出成功, 文件路径:" + file)
                    }
                  })
                } else {
                  log.info('数据解析失败')
                  showMessageBox(main, '数据获取失败')
                }
              } else {
                showMessageBox(mainWin, "导出失败, 请检查设备是否连接正确")
              }
            })
          }
        })
      }

      //验证用户登录信息
      if (flag === CONF.USER_VALI) {
        csend(getbuff(CONF.CODE_VERIUK, 'admin', para.value), (res) => {
          log.info(res)
          if (-1 != res.indexOf(CONF.DEVICE_PERROR)) {
            send({ flag: CONF.ERR_VAIL })
          } else if (-1 != res.indexOf(CONF.DEVICE_CENTER) || -1 != res.indexOf(CONF.DEVICE_SUBSET)) {
            if (-1 != res.indexOf(CONF.DEVICE_CENTER)) {
              wintype = CONF.DEVICE_CENTER
            } else {
              wintype = CONF.DEVICE_SUBSET
            }
            log.info("The device type is " + wintype)
            //获取设备编号
            csend(getbuff(CONF.CODE_GDCNUM), (number) => {
              deviceNumber = split_res(number)
              log.info("The device number was successfully obtained, number " + deviceNumber)
              if (deviceNumber) {
                send({ flag: CONF.SUS_VAIL })
              } else {
                showMessageBox(loginWin, "位获取设备的编号")
              }
            })
          } else {
            showMessageBox(loginWin, "设备连接失败")
          }
        })
      }

      //修改密码
      if (flag === CONF.CHANGE_PSS) {
        if (!para.oldValue) { showMessageBox(mainWin, '请输入旧密码'); return }
        if (!para.value) { showMessageBox(mainWin, '请输入新密码'); return }
        if (para.value != para.comfireValue) { showMessageBox(mainWin, '两次输入的密码不一致'); return }
        if (para.value === para.oldValue) { showMessageBox(mainWin, '新密码和旧密码一致'); return }
        if (para.value.length > 16) { showMessageBox(mainWin, '密码的长度不能大于16'); return }

        csend(getbuff(CONF.CODE_VERIUK, 'admin', para.oldValue), (res) => {
          if (-1 != res.indexOf(CONF.DEVICE_PERROR)) {
            showMessageBox(mainWin, "输入的旧密码不正确")
          } else if (-1 != res.indexOf(CONF.DEVICE_CENTER) || -1 != res.indexOf(CONF.DEVICE_SUBSET)) {
            csend(getbuff(CONF.CODE_UPUPAS, para.value), (res) => {
              log.info(res)
              if (-1 != res.indexOf(CONF.DEVICE_PERROR)) {
                showMessageBox(mainWin, '密码修改失败, 请检查设备是否连接正确!')
                send({ flag: CONF.CHANGE_PSS_ERROR })
              } else if (-1 != res.indexOf(CONF.DEVICE_POK)) {
                send({ flag: CONF.CHANGE_PSS_OK })
              } else {
                showMessageBox(mainWin, "设备连接失败")
              }
            })
          } else {
            showMessageBox(loginWin, "设备连接失败")
          }
        })

      }

      if (flag === CONF.GETTYPEWAY) {
        loginWin.hide()
        // wintype = CONF.DEVICE_CENTER //网关中心
        // wintype = CONF.DEVICE_SUBSET //网关
        if (wintype == CONF.DEVICE_CENTER) {
          createMainWin(1300, 800, true)
        } else if (wintype == CONF.DEVICE_SUBSET) {
          createMainWin(620, 320, false)
        }
      }

      //窗体已经加载好了
      if (flag === CONF.ALREADY) {
        setTimeout(() => {
          send({ flag: CONF.GETTYPEWAY, value: wintype })
        }, 1000)
      }

      //获取所有设备编号和名称信息
      if (flag === CONF.GET_ALLKEY) {
        csend(getbuff(CONF.CODE_EXPMAI), (res) => {
          if (-1 != res.indexOf(CONF.DEVICE_PERROR)) {
            send({ flag: CONF.GET_ALLKEY_FAILURE })
          } else {
            let rdata = split_res(res)
            packdata(covering(rdata, " ").split(" "), (res1) => {
              send({ flag: CONF.GET_ALLKEY_SUCCESS, value: JSON.stringify(res1) })
            })
          }
        })
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
        if (content.length != 64 * 2) {
          showMessageBox(mainWin, "公钥文件内容格式不正确!")
          send({ flag: CONF.PKEYFILE_ERROR })
        } else {
          //发送指令
          var cname = cvalue.cname.split(" ").join("")
          if (cname.length != 30 * 2) {
            showMessageBox(mainWin, "名称只支持十个字符!")
            return;
          }
          csend(getbuff(CONF.CODE_CLAIMK, cvalue.number, content, cname), res => {
            if (-1 != res.indexOf(CONF.DEVICE_POK)) {
              if (cvalue.isupdate) {
                showMessageBox(mainWin, "更新成功!")
              } else {
                showMessageBox(mainWin, "添加成功!")
              }
              send({ flag: CONF.CODE_CLAIMK_SUCCESS })
            } else if (-1 != res.indexOf(CONF.DEVICE_PERROR)) {
              showMessageBox(mainWin, "操作失败!")
              send({ flag: CONF.CODE_CLAIMK_FAILURE })
            } else {
              showMessageBox(mainWin, "请检查设备是否连接正确!")
            }
          })
        }
      }

      //初始化
      if (flag === CONF.CODE_INITIF) {
        dialog.showMessageBox(loginWin, {
          type: 'info',
          title: '提示信息',
          message: "确定是否要初始化当前设备?",
          buttons: ['取消', '确定']
        }).then(res => {
          console.log(res.response)
          if (1 === res.response) {
            // showMessageBox(loginWin,"防止误操作,代码已注释");
            csend(getbuff(CONF.CODE_INITIF), (res) => {
              if (-1 != res.indexOf(CONF.DEVICE_POK)) {
                showMessageBox(loginWin, "初始化成功!")
              } else if (-1 != res.indexOf(CONF.DEVICE_PERROR)) {
                showMessageBox(loginWin, "初始化失败!")
              } else {
                showMessageBox(loginWin, "设备连接失败!")
              }
            })
          }
        })

      }
    })
    conn.on("close", function (coded, reason) {
      log.info("connection closed")
    })
  }).listen(CONF.SCOKET_PORT)
}


var curPort;
var serialPortData = ""     //用于接收并整合串口数据
var buffer = new Array()
function operPort(port, open, fail) {
  log.log("create connet for com" + port)
  curPort = new SerialPort('com' + port, {
    baudRate: 115200,
    autoOpen: true,
    stopBits: 1,
    dataBits: 8,
    parity: 'none',
    highWaterMark: 1000
  }, false)

  curPort.open(function () {
    log.log("open connet for com" + port)
    curPort.on('data', function (data) {
      data.forEach(item => { buffer.push(item) })
      serialPortData += data
      // console.warn(serialPortData)      
    }).on('error', () => {
      log.log("open connet com" + port + " fail")
      fail()
    })
    open()
  })
}

/** 封装发送串口命令的数据包 */
var csend = function (buff, success) {
  serialPortData = ''
  curPort.write(buff, function (err) {
    setTimeout(() => {
      var res = serialPortData.toString();
      log.info(res)
      success(res.trim())
    }, 500)
  })
}

/** 循环遍历每个串口设备， 连接检测正确的设备 */
function test_port(ports, csend, fail) {
  ports.forEach(item => { console.log(item.path + ' ') })
  if (!ports && ports.length == 0) {
    // 没有检测到设备
    fail()
    return
  }

  var port_size = ports.length
  var port_index = 0
  //异步循环调用检测串口 
  var test_conn_message = function () {
    dialog.showMessageBox(loginWin, {
      type: 'info',
      title: '提示信息',
      message: "没有检测到设备"
    }).then(res => {
      loginWin.close()
    })
  }

  var test_conn = function () {
    if (port_index >= port_size) {
      // 没有检测到网关设备
      test_conn_message()
      return
    }
    const dvicnum = ports[port_index].path.slice(-1)
    log.log("order " + port_index, "com" + dvicnum)
    var test_conn_do = function () {
      csend(getbuff(CONF.CODE_GDCNUM), (res) => {
        if (res && res.indexOf("DATA_SRT") != -1) {
          loginWin.show()
          //开启webscoket
          createServer()
          return
        }
        port_index++
        test_conn()
      })
    }
    operPort(dvicnum, test_conn_do, () => {
      port_index++
      test_conn()
    })
  }
  test_conn()
}


/** 检测串口设备 */
SerialPort.list().then(ports => {
  //循环链接每一台设备 并判断是那一台是当前设备
  test_port(ports, csend, () => {
    loginWin.hide()
    showMessageBox(loginWin, "没有检测到设备")
    loginWin.close()
  })
}).catch(err => {
  log.info(err)
  log.info('列举串口失败')
})


var savePath
function exitsfile(msg, per, number, success) {
  var date = new Date()
  var cfile = savePath
  if (!fs.existsSync(cfile)) { fs.mkdirSync(cfile) }
  cfile = cfile + per + "_" + date.getTime() + "_" + number
  fs.writeFile(cfile, msg, 'utf-8', (res) => {
    success(res, cfile)
  })
}

function split_res(str) {
  const start = str.indexOf(CONF.DEVICE_DATA_START)
  const end = str.indexOf(CONF.DEVICE_DATA_END)

  if (-1 != start && -1 != end) {
    return str.slice(start + CONF.DEVICE_DATA_START.length, end).trim()
  }
  log.info("#ERR_DATA: " + str);
  return '';
}

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
  } else {
    flag = len
  }
  log.info(code + flag + val)
  return code + flag + val
}

/** 补位操作 */
function covering(str, inter) {
  var val = '';
  var str1 = str.split(" ")
  for (var i = 0; i < str1.length; i++) {
    var item = str1[i];
    if (item.length == 1) {
      item = '0' + item
    }
    val += inter + item
  }
  return val.trim()
}

/** 封装数据对象 res eg: 1 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 2 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61 61  */
function packdata(res, success) {
  var cdata = []
  var obj;
  for (let i = 0, j = 0; i < res.length; i++) {
    if (i % 31 === 0) {
      obj = {}
      obj.number = res[i]
      obj.name = []
    }
    else { obj.name.push(res[i]) }

    if ((i + 1) % 31 === 0) {
      log.info(JSON.stringify(obj))
      cdata.push(obj)
    }
  }
  success(cdata);
}
