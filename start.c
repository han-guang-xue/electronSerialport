/*
 * @Author: your name
 * @Date: 2021-02-20 16:44:31
 * @LastEditTime: 2021-02-20 17:04:40
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \electron-serialport-start\start.c
 */
#include <stdio.h>
#include <Windows.h>
int main(int argc, char const *argv[])
{
    HWND hwndDOS = GetForegroundWindow();
    ShowWindow(hwndDOS, SW_HIDE);
    system("npm start");
    return 0;
}
