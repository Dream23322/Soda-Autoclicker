import sys
import json
import random
import time
import ctypes
from ctypes import wintypes
import win32api
import win32con
import win32gui
import win32process

try:
    import psutil
except ImportError:
    psutil = None





def get_mc_hwnd():
    """Try to find Minecraft's LWJGL window, fall back to foreground."""
    hwnd = win32gui.FindWindow("LWJGL", None)
    if hwnd:
        return hwnd
    return win32gui.GetForegroundWindow()


def mouse_event(dw_flags, dx=0, dy=0, dw_data=0):
    win32api.mouse_event(dw_flags, dx, dy, dw_data, 0)


def send_click_to_hwnd(hwnd, down_flag, up_flag):
    win32api.SendMessage(hwnd, down_flag, 0, 0)
    time.sleep(0.02)
    win32api.SendMessage(hwnd, up_flag, 0, 0)


def key_held(vk):
    return (win32api.GetAsyncKeyState(vk) & 0x8000) != 0


def foreground_process_name():
    if psutil is None:
        return ''
    try:
        hwnd = win32gui.GetForegroundWindow()
        pid = win32process.GetWindowThreadProcessId(hwnd)[-1]
        return psutil.Process(pid).name()
    except Exception:
        return ''


def cursor_info():
    """Return (handle, in_menu).  in_menu is True when the cursor is NOT
    clipped — during gameplay GLFW calls ClipCursor() to trap the cursor in
    the game window; in menus, chat, inventory etc. the clip is released."""
    try:
        rect = wintypes.RECT()
        ctypes.windll.user32.GetClipCursor(ctypes.byref(rect))
        screen_w = win32api.GetSystemMetrics(0)
        screen_h = win32api.GetSystemMetrics(1)
        # If the clip rect roughly matches the full screen, the cursor is free
        # (menu / chat / alt-tabbed).  If it's smaller, MC has it captured
        # (gameplay).
        r = (rect.left, rect.top, rect.right, rect.bottom)
        free = r[0] <= 0 and r[1] <= 0 and r[2] >= screen_w - 5 and r[3] >= screen_h - 5
        hcursor = win32gui.GetCursorInfo()[1]
        return hcursor, free
    except Exception:
        return 0, False


def handle_command(cmd):
    action = cmd.get('action')
    result = {'ok': True}
    cmd_id = cmd.get('id')
    if cmd_id is not None:
        result['id'] = cmd_id

    if action == 'mouse_click':
        button = cmd.get('button', 1)
        if button == 1:
            hwnd = get_mc_hwnd()
            win32api.SendMessage(hwnd, win32con.WM_LBUTTONDOWN, 0, 0)
            time.sleep(0.02)
            win32api.SendMessage(hwnd, win32con.WM_LBUTTONUP, 0, 0)
        elif button == 2:
            mouse_event(win32con.MOUSEEVENTF_RIGHTDOWN)
            time.sleep(0.02)
            mouse_event(win32con.MOUSEEVENTF_RIGHTUP)

    elif action == 'mouse_down':
        button = cmd.get('button', 1)
        if button == 1:
            mouse_event(win32con.MOUSEEVENTF_LEFTDOWN)
        else:
            mouse_event(win32con.MOUSEEVENTF_RIGHTDOWN)

    elif action == 'mouse_up':
        button = cmd.get('button', 1)
        if button == 1:
            mouse_event(win32con.MOUSEEVENTF_LEFTUP)
        else:
            mouse_event(win32con.MOUSEEVENTF_RIGHTUP)

    elif action == 'get_key_state':
        vk = cmd.get('vk', 0)
        result['held'] = key_held(vk)

    elif action == 'get_key_states':
        vks = cmd.get('vks', [])
        result['held'] = [key_held(v) for v in vks]

    elif action == 'get_cursor_pos':
        x, y = win32api.GetCursorPos()
        result['x'] = x
        result['y'] = y

    elif action == 'set_cursor_pos':
        win32api.SetCursorPos((cmd['x'], cmd['y']))

    elif action == 'cursor_shake':
        force = cmd.get('force', 5)
        x, y = win32api.GetCursorPos()
        dx = random.randint(-force, force)
        dy = random.randint(-force, force)
        win32api.SetCursorPos((x + dx, y + dy))

    elif action == 'get_foreground_process':
        result['process_name'] = foreground_process_name()

    elif action == 'get_cursor_info':
        handle, visible = cursor_info()
        result['cursor_handle'] = handle
        result['cursor_visible'] = visible

    elif action == 'get_window_info':
        # One round-trip for both. Saves a stdio hop every 500ms.
        handle, visible = cursor_info()
        result['process_name'] = foreground_process_name()
        result['cursor_handle'] = handle
        result['cursor_visible'] = visible

    elif action == 'window_right_click':
        hwnd = get_mc_hwnd()
        send_click_to_hwnd(hwnd, win32con.WM_RBUTTONDOWN, win32con.WM_RBUTTONUP)

    elif action == 'key_tap':
        vk = cmd.get('vk', 0)
        win32api.keybd_event(vk, 0, 0, 0)
        time.sleep(0.045)
        win32api.keybd_event(vk, 0, win32con.KEYEVENTF_KEYUP, 0)

    elif action == 'key_down':
        vk = cmd.get('vk', 0)
        win32api.keybd_event(vk, 0, 0, 0)

    elif action == 'key_up':
        vk = cmd.get('vk', 0)
        win32api.keybd_event(vk, 0, win32con.KEYEVENTF_KEYUP, 0)

    else:
        result = {'ok': False, 'error': f'Unknown action: {action}'}
        if cmd_id is not None:
            result['id'] = cmd_id

    return result


def main():
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        try:
            cmd = json.loads(line.strip())
            result = handle_command(cmd)
            if cmd.get('id') is not None:
                sys.stdout.write(json.dumps(result) + '\n')
                sys.stdout.flush()
        except Exception as e:
            sys.stdout.write(json.dumps({'ok': False, 'error': str(e)}) + '\n')
            sys.stdout.flush()


if __name__ == '__main__':
    main()
