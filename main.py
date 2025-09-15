# -*- coding: utf-8 -*-
# @Author  : 鼠子Tomoriゞ
# @File    : main.py
# @Software: PyCharm/VSCode
# @Discription: GTANext ModLoader 主程序入口

import os
from app import GTANext
import winreg
import webview
import tkinter as tk
from tkinter import messagebox

def check_environment():
    """检查运行环境是否满足要求"""
    api = GTANext()
    
    print("正在检查运行环境...")
    webview2_installed = api.is_webview2_installed()
    dotnet_installed = api.check_dotnet_version()
    
    print(f"WebView2 安装状态: {'已安装' if webview2_installed else '未安装'}")
    print(f".NET Framework 4.8+ 安装状态: {'已安装' if dotnet_installed else '未安装'}")
    
    # 如果任一组件未安装，显示提示对话框
    if not webview2_installed or not dotnet_installed:
        root = tk.Tk()
        root.withdraw()  # 隐藏主窗口
        
        missing_components = []
        if not webview2_installed:
            missing_components.append("WebView2 Runtime")
        if not dotnet_installed:
            missing_components.append(".NET Framework 4.8 或更高版本")
            
        message = f"缺少以下必需组件:\n\n" + "\n".join(missing_components)
        message += "\n\n请安装缺失的组件后重新启动程序。"
        message += "\n\n提示: WebView2 Runtime 可从 Microsoft 官网下载。"
        
        messagebox.showerror("环境检查失败", message)
        root.destroy()
        return False
    
    print("环境检查通过，所有必需组件均已安装。")
    return True

if __name__ == '__main__':
    # 先检查环境
    if not check_environment():
        exit(1)  # 环境检查失败，退出程序
    
    api = GTANext()

    # 详细检查API方法
    print("API 方法检查:")
    method_list = [method for method in dir(api) if not method.startswith('_')]
    for method in method_list:
        attr = getattr(api, method)
        print(f"  {method}: {type(attr)} - {'callable' if callable(attr) else 'not callable'}")

    # 特别检查关键方法
    required_methods = ['get_games', 'add_game', 'update_game', 'launch_game']
    for method in required_methods:
        if hasattr(api, method):
            print(f"[OK] {method} 方法存在")
        else:
            print(f"[MISSING] {method} 方法缺失")

    webview.create_window(
        '[测试版] GTANext ModLoader丨Powered by 鼠子Tomoriゞ',
        os.path.join(os.path.dirname(os.path.realpath(__file__)),
        'assets/ui/index.html'),
        js_api=api,
        width=1024,
        height=600
    )
    webview.start()