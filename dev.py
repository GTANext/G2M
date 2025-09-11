import hupper
import os
import time
import webview
from importlib import reload
import sys

class WebviewHotReloader:
    def __init__(self):
        self.window = None
        self.last_reload = 0

    def start(self):
        """启动带热重载的开发模式"""
        print("🚀 Starting dev server for GTANext...")

        # 首次加载
        from app import GTANext
        api = GTANext()
        self.create_window(api)

        # 启动热重载监视器
        reloader = hupper.start_reloader('hot_reload.WebviewHotReloader.on_reload')

    def create_window(self, api):
        """创建或更新webview窗口"""
        if self.window:
            try:
                self.window.destroy()
            except:
                pass

        self.window = webview.create_window(
            'GTANext ModLoader丨DEV MODE',
            "http://localhost:8000",
            js_api=api,
            width=1024,
            height=600
        )
        webview.start()

    def on_reload(self):
        """热重载回调"""
        now = time.time()
        if now - self.last_reload < 1:  # 防抖处理
            return

        print("\n🔥 Reloading application...")
        try:
            # 重载业务模块
            if 'webview_app' in sys.modules:
                reload(sys.modules['webview_app'])

            # 重新初始化
            from app import GTANext
            api = GTANext()
            self.create_window(api)

        except Exception as e:
            print(f"⚠️ Reload failed: {str(e)}")
        finally:
            self.last_reload = now


if __name__ == '__main__':
    WebviewHotReloader().start()