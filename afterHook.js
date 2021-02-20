/*
 * @Author: your name
 * @Date: 2021-02-20 15:50:01
 * @LastEditTime: 2021-02-20 15:50:54
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \electron-serialport-start\afterCopy.js
 */
import packager from 'electron-packager';
import rebuild from 'electron-rebuild';

packager({
    // … other options
    afterCopy: [(buildPath, electronVersion, platform, arch, callback) => {
        rebuild({ buildPath, electronVersion, arch })
            .then(() => callback())
            .catch((error) => callback(error));
    }],
    // … other options
});