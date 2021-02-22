<!--
 * @Author: your name
 * @Date: 2021-01-27 14:31:52
 * @LastEditTime: 2021-02-22 17:31:07
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \electron-serialport-start\README.md
-->

## electron 和 serialport 项目整合(编译打包成安装包全流程)

项目地址: 项目地址: https://github.com/han-guang-xue/electronSerialport

下载项目

```shell
cnpm|npm  install   #安装包依赖
npm run rebuild     #编译serialport文件
npm run builder     #打包并发布
```

## 使用 electron-builder 打包碰见的问题

碰见的问题:

1. 在使用 electron-rebuild 重新编译之后开发环境中是正常使用,但是 electron-build 打包之后,串口连接返回错误状态码(electron 版本是 9.0.5)
   解决方案: 替换 electron 版本为 11.1.0

2. 替换 electron 版本为 11.1.0 之后, 直接使用 electron-builder 编译打包, 串口接口使用报错; 报错信息:

```java
TypeError: Third argument must be a function
    at internal/util.js:297:30
    at new Promise (<anonymous>)
    at open (internal/util.js:296:12)
    at WindowsBinding.open (C:\Program Files\client\resources\app\node_modules\serialport\node_modules\@serialport\bindings\lib\win32.js:56:22)
    at processTicksAndRejections (internal/process/task_queues.js:97:5)
```

解决方案: 在 package.json 中的 build 中配置 `"buildDependenciesFromSource":true,`

```json
"build": {
    "directories": {"output":"E:\\YCXGIT\\building\\build17"},
    "asar":false,
    "buildDependenciesFromSource":true,
    "appId": "com.vasen.serialport",
    "mac": {
      "target": [
        "dmg"
      ]
    },
    "win": {
      "target": [
        "nsis"
      ]
    },
    "nsis": {
      "oneClick": false,
      "perMachine": true,
      "allowElevation": true,
      "allowToChangeInstallationDirectory": true
    }
  },
```

## electron 实现单例程序

该方式只针对 electron@3 以上的

```JavaScript
const getTheLock = app.requestSingleInstanceLock()
if (!getTheLock) {
  app.quit()
  return
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    //isMinimized 判断窗口是否最小化
    if (loginWin) {
      if (loginWin.isMinimized()) loginWin.restore()
      loginWin.focus()  //聚焦
    }
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore()
      mainWin.focus()
    }
  })
  app.on('ready', createLoginWin)
}
```

## electron 中如何使用 jquery, 去除 require 导入模块引起的冲突

在创建窗体的时候添加属性 `nodeIntegration: false`

```JavaScript
webPreferences: {
  nodeIntegration: false
}
```
