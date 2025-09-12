import os
from app import GTANext
import winreg
import webview

def is_webview2_installed():
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                            r"Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}") as key:
            version = winreg.QueryValueEx(key, "pv")[0]
            return True
    except WindowsError:
        pass

    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                            r"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}") as key:
            version = winreg.QueryValueEx(key, "pv")[0]
            return True
    except WindowsError:
        pass

    return False


def check_dotnet_version():
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full") as key:
            release = winreg.QueryValueEx(key, "Release")[0]
            if release >= 528040:
                return True
            return False

    except WindowsError:
        return False


if __name__ == '__main__':
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
        'GTANext ModLoader丨Powered by 鼠子Tomoriゞ',
        os.path.join(os.path.dirname(os.path.realpath(__file__)),
        'assets/ui/index.html'),
        js_api=api,
        width=1024,
        height=600
    )
    webview.start()
