/*
 * @Author: your name
 * @Date: 2021-01-21 18:24:25
 * @LastEditTime: 2021-02-19 14:28:24
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

const { app, BrowserWindow, dialog } = require('electron')

const ws = require('nodejs-websocket')
const SerialPort = require('serialport');
const fs = require("fs");
var loginWin
var mainWin

app.on('second-instance', () => {
  console.log("=======>")
})

// 热加载
// try {
//   require('electron-reloader')(module);
// } catch (_) { }

/** 读取配置文件 */
const CONF = JSON.parse(fs.readFileSync('./config.json', 'utf-8'))

var reboot = false
var wintype       //网关类型
var deviceNumber = "00"  //当前设备编号


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
  loginWin.openDevTools()
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
  mainWin.loadFile('./index.html')
  mainWin.openDevTools()
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
    var csend = function (buff, success) {
      serialPortData = ''
      curPort.write(buff, function (err) {
        setTimeout(() => {
          var res = serialPortData.toString();
          console.log(res)
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
            //获取设备编号
            csend(getbuff(CONF.CODE_GDCNUM), (res) => {
              deviceNumber = res
            })
          },
          err => {
            console.log(err)
            showMessageBox(loginWin, "请检查设备 COM" + para.value + " 是否连接正确或已被其它设备连接");
            send({ flag: CONF.ERR_PORT, value: err })
          })
      }

      //生成设备公私钥
      if (flag === CONF.CODE_GENKEY) {
        dialog.showOpenDialog(mainWin, { title: '选择更新后当前设备公钥的存储路径', properties: ['openDirectory'] }).then(res => {
          if (!res.canceled) {
            savePath = res.filePaths[0] + "\\"
            csend(getbuff(CONF.CODE_GENKEY), (res) => {
              if (res === CONF.DEVICE_POK) {
                // send({ flag: CONF.CODE_GENKEY_SUCCESS })
                // showMessageBox(mainWin, "更新成功")
                csend(getbuff(CONF.CODE_EXPKEY), res => {
                  res = covering(res, "");
                  if (res.length === 64 * 2) {
                    exitsfile(res, "PUBLICKEY", deviceNumber, (err, file) => {
                      if (err) {
                        showMessageBox(mainWin, "导出失败")
                      } else {
                        showMessageBox(mainWin, "更新成功, 更新后导出公钥文件路径:" + file)
                      }
                    })
                  } else {
                    showMessageBox(mainWin, "导出失败, 请检查设备是否连接正确")
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
            if (path.indexOf("SESSIONKEY_") != -1) {
              const content = fs.readFileSync(path, 'utf-8')
              csend(getbuff(CONF.CODE_IMTSIK, content), res => {
                if (res === CONF.DEVICE_POK) {
                  showMessageBox(mainWin, "更新成功")
                } else if (res === CONF.DEVICE_PERROR) {
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
              res = covering(res, "");
              if (res.length === 64 * 2) {
                exitsfile(res, "PUBLICKEY", deviceNumber, (err, file) => {
                  if (err) {
                    showMessageBox(mainWin, "导出失败")
                  } else {
                    showMessageBox(mainWin, "导出成功, 文件路径:" + file)
                  }
                })
              } else {
                showMessageBox(mainWin, "导出失败, 请检查设备是否连接正确")
              }
            })
          }
        })
      }


      //生成,更换会话密钥
      if (flag === CONF.CODE_GENSIK) {
        csend(getbuff(CONF.CODE_GENSIK, para.value), res => {
          if (res === CONF.DEVICE_POK) {
            showMessageBox(mainWin, "设备 " + para.value + " 会话密钥更新成功")
          } else if (res === CONF.DEVICE_PERROR) {
            showMessageBox(mainWin, "操作失败")
          } else {
            showMessageBox(mainWin, "请检查设备是否连接")
          }
        })
      }

      // 导出密钥表
      if (flag === CONF.CODE_EXPSIK) {
        dialog.showOpenDialog(mainWin, { title: '选择要保存导出文件的目录', properties: ['openDirectory'] }).then(res => {
          if (!res.canceled) {
            savePath = res.filePaths[0] + "\\"
            csend(getbuff(CONF.CODE_EXPSIK, para.value), res => {
              if (res !== CONF.DEVICE_PERROR) {
                exitsfile(covering(res, ""), "SESSIONKEY", para.value, (err, file) => {
                  if (err) {
                    showMessageBox(mainWin, "导出失败")
                  } else {
                    showMessageBox(mainWin, "导出成功, 文件路径:" + file)
                  }
                })
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
          console.log(res)
          if (res === CONF.DEVICE_PERROR) {
            send({ flag: CONF.ERR_VAIL })
          } else if (res === CONF.DEVICE_CENTER || res === CONF.DEVICE_SUBSET) {
            wintype = res; //如果用户验证正确, 则返回网关类型
            send({ flag: CONF.SUS_VAIL })
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
          if (res === CONF.DEVICE_PERROR) {
            showMessageBox(mainWin, "输入的旧密码不正确")
          } else if (res === CONF.DEVICE_CENTER || res === CONF.DEVICE_SUBSET) {
            csend(getbuff(CONF.CODE_UPUPAS, para.value), (res) => {
              console.log(res)
              if (res === CONF.DEVICE_PERROR) {
                showMessageBox(mainWin, '密码修改失败, 请检查设备是否连接正确!')
                send({ flag: CONF.CHANGE_PSS_ERROR })
              } else if (res === CONF.DEVICE_POK) {
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
          createMainWin(620, 320, true)
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
        csend(getbuff(CONF.CODE_EXPMAI), (res) => {
          if (res === CONF.DEVICE_PNO) {
            send({ flag: CONF.GET_ALLKEY_FAILURE })
          } else {
            packdata(res = covering(res, " ").split(" "), (res) => {
              send({ flag: CONF.GET_ALLKEY_SUCCESS, value: JSON.stringify(res) })
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
            if (res == CONF.DEVICE_POK) {
              if (cvalue.isupdate) {
                showMessageBox(mainWin, "更新成功!")
              } else {
                showMessageBox(mainWin, "添加成功!")
              }
              send({ flag: CONF.CODE_CLAIMK_SUCCESS })
            } else if (res == CONF.DEVICE_PERROR) {
              showMessageBox(mainWin, "操作失败!")
              send({ flag: CONF.CODE_CLAIMK_FAILURE })
            } else {
              showMessageBox(mainWin, "请检查设备是否连接正确!")
            }
          })
        }
      }
    })
    conn.on("close", function (coded, reason) {
      console.log("connection closed")
    })
  }).listen(CONF.SCOKET_PORT)
}


var curPort;
var serialPortData = ""     //用于接收并整合串口数据
var buffer = new Array()
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
      data.forEach(item => { buffer.push(item) })
      serialPortData += data
    }).on('error', fail)
  })
}

/** 测试 */
// operPort('3', () => {
//   serialPortData = ''
//   buffer = new Array()
//   curPort.write("FFFD000201", 'utf-8', function (err, res) {
//     setTimeout(() => {
//       console.log(serialPortData.toString())
//       console.log(buffer.toString('hex'))
//     }, 500)
//   })
// }, () => { })

//开启webscoket
createServer()
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
      console.log(JSON.stringify(obj))
      cdata.push(obj)
    }
  }
  success(cdata);
}
