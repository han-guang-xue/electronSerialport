/*
 * @Author: your name
 * @Date: 2021-01-21 18:24:25
 * @LastEditTime: 2021-01-27 16:38:54
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \shifang\main.js
 */
const { app, BrowserWindow } = require('electron')
const path = require('path')
const WebScoketServer = require('ws').Server


// 热加载
try {
  require('electron-reloader')(module);
} catch (_) { }

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false
    },
    show: true
  })

  win.loadFile('index.html')
  win.openDevTools()
}

app.whenReady().then(createWindow)

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

var wss;
function createWebscoket() {
  wss = new WebScoketServer({ port: 8183 });
  console.log("webscoket start success!!!");
  wss.on('connection', function (message) {
    console.log(message)

    if (message === 'send data test') {

    }
  })
}
createWebscoket();



