import sys
import json
import random
import time
import win32api
import win32con
import win32gui
import win32process


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
        result['held'] = (win32api.GetAsyncKeyState(vk) & 0x8000) != 0

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
        try:
            hwnd = win32gui.GetForegroundWindow()
            pid = win32process.GetWindowThreadProcessId(hwnd)[-1]
            import psutil
            proc = psutil.Process(pid)
            result['process_name'] = proc.name()
        except Exception:
            result['process_name'] = ''

    elif action == 'get_cursor_info':
        try:
            info = win32gui.GetCursorInfo()
            result['cursor_handle'] = info[1]
        except Exception:
            result['cursor_handle'] = 0

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
