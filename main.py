"""
Soda Autoclicker v1.5.7

A Minecraft PvP autoclicker with left/right clicking, block-hitting,
movement assists (W-tap, auto-sprint, better input, fast stop),
click recording, potion/rod/pearl macros, config management,
Discord Rich Presence, and a DearPyGui interface.

Developer: 4urxra
GitHub:    https://github.com/Dream23322/Soda-Autoclicker/
Discord:   https://discord.gg/4ZqBfDFMG4

Windows only. Requires: pywin32, psutil, dearpygui, pypresence,
ping3, keyboard, plus standard-library modules.
"""

# ── Standard Library ─────────────────────────────────────────────
import asyncio
import itertools
import json
import os
import random
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import tkinter as tk
import webbrowser
import winsound
import zipfile
from tkinter import messagebox
from typing import Any, Dict, List, Optional, Tuple

# ── Third-Party ──────────────────────────────────────────────────
try:
    import dearpygui.dearpygui as dpg
    import keyboard
    import ping3
    import psutil
    import win32api
    import win32con
    import win32gui
    import win32process
    from pypresence import Presence
except ImportError:
    # First-run: install dependencies, then re-import
    try:
        os.system("pip install -r requirements.txt")
    except OSError:
        os.system("py -m pip install -r requirements.txt")

    import dearpygui.dearpygui as dpg
    import keyboard
    import ping3
    import psutil
    import win32api
    import win32con
    import win32gui
    import win32process
    from pypresence import Presence


# ═════════════════════════════════════════════════════════════════
#  CONSTANTS
# ═════════════════════════════════════════════════════════════════

VERSION: str = "1.5.7"
CONFIG_TYPE: str = "dev"

# Virtual-key codes for hotbar digits 0-9
CHAR_TO_VK: Dict[str, int] = {
    str(i): 0x30 + i for i in range(10)
}

# Process names that indicate Minecraft is focused
GAME_PROCESS_NAMES: Tuple[str, ...] = ("java", "AZ-Launcher")

# Filesystem paths
SODA_FOLDER: str = os.path.join(
    os.environ["USERPROFILE"], "soda"
)
RESOURCE_FOLDER: str = os.path.join(SODA_FOLDER, "resource")
CONFIG_FILE_PATH: str = os.path.join(SODA_FOLDER, "config.json")

# GitHub repo ZIP for bootstrapping resources
REPO_ZIP_URL: str = (
    "https://github.com/Dream23322/Soda-Autoclicker/"
    "archive/refs/heads/main.zip"
)

# Toggle-sound download URLs
TOGGLE_SOUND_URLS: List[str] = [
    "https://yiffing.zone/sounds/notify_on.wav",
    "https://yiffing.zone/sounds/notify_off.wav",
]

# Discord Rich Presence rotating status lines
RPC_STATUS_MESSAGES: List[str] = [
    "V1.5?",
    "Get shit on <3",
    "Clicks sponsored by 4urxra",
    "Quick Paws",
    "Simply Aura",
    "I'm gonna steal ur street sign :3",
    "I could use this for advertising \ud83e\udd14",
    "Click click click",
    ":3",
    "Soda Pop <3",
    "Download today!",
]

# Theme name → RGB tuple
THEME_COLOUR_MAP: Dict[str, Tuple[int, int, int]] = {
    "light":        (250, 250, 250),
    "dark":         (40,  40,  40),
    "sakura":       (217, 156, 195),
    "purple":       (181, 92,  224),
    "blue":         (58,  110, 230),
    "lightblue":    (113, 190, 235),
    "orange":       (232, 165, 22),
    "red":          (222, 90,  90),
    "beach_green":  (133, 207, 182),
    "forest_green": (51,  120, 78),
}

# Console-faker banners printed when the GUI is hidden
CONSOLE_FAKER_BANNERS: Dict[str, str] = {
    "NullBind":  "NullBind - 1.0.4 Beta",
    "Optimiser": "Entropy Optimiser - 1.0.4 Beta",
    "CustomRGB": "BetterRGB - 1.0.4 Beta",
}


# ═════════════════════════════════════════════════════════════════
#  DEFAULT CONFIGURATION TEMPLATE
# ═════════════════════════════════════════════════════════════════

def _build_default_config() -> dict:
    """Return a fresh default config dict.

    Called once per launch so the template is never mutated.
    """
    return {
        "left": {
            "enabled": False,
            "mode": "Hold",
            "bind": 0,
            "averageCPS": 18,
            "onlyWhenFocused": True,
            "breakBlocks": "None",
            "RMBLock": False,
            "blockHit": False,
            "blockHitChance": 20,
            "bhType": "V2",
            "smartBH": 0,
            "shakeEffect": False,
            "shakeEffectForce": 5,
            "soundPath": "None",
            "workInMenus": False,
            "blatant": False,
            "AutoRod": False,
            "AutoRodChance": 10,
        },
        "right": {
            "enabled": False,
            "mode": "Hold",
            "bind": 0,
            "averageCPS": 12,
            "onlyWhenFocused": True,
            "LMBLock": False,
            "shakeEffect": False,
            "shakeEffectForce": False,
            "soundPath": "None",
            "workInMenus": False,
            "blatant": False,
            "items": False,
        },
        "recorder": {
            "enabled": False,
            "record": [0.08],
            "recordMultiplier": 1.1
        },
        "overlay": {
            "enabled": False,
            "onlyWhenFocused": True,
            "x": 0,
            "y": 0,
        },
        "misc": {
            "saveSettings": True,
            "guiHidden": False,
            "bindHideGUI": 0,
            "consoleFaker": "NullBind",
            "discordRichPresence": False,
            "switchDelay": 0.1,
            "rodBind": 0,
            "longRod": False,
            "rodDelay": 0.2,
            "rodSlot": "2",
            "pearlBind": 0,
            "pearlSlot": "8",
            "swordSlot": "1",
            "theme": "lightblue",
            "red": 0,
            "green": 0,
            "blue": 0,
            "toggleSounds": True,
            "ping": 230,
        },
        "potions": {
            "enabled": False,
            "potBind": 0,
            "throwDelay": 0.7,
            "switchBackSlot": "1",
            "potResetBind": 0,
            "lowestSlot": 1,
            "highestSlot": 9,
        },
        "movement": {
            "autoWTap": False,
            "wTapMode": "chance",
            "wTapValue": 30,
            "autoSprint": False,
            "betterInput": False,
            "fastStop": False,
        },
        "filename": "config",
        "displayName": "Default",
        "description": "Default Config",
        "Author": "User",
    }


# ═════════════════════════════════════════════════════════════════
#  CONFIG LISTENER — auto-save on every mutation
# ═════════════════════════════════════════════════════════════════

class ConfigListener(dict):
    """Dict subclass that recursively wraps nested dicts and
    auto-persists the full config to disk on any value change
    (when saveSettings is enabled).
    """

    def __init__(self, initial_data: dict) -> None:
        for key, value in initial_data.items():
            if isinstance(value, dict):
                initial_data[key] = ConfigListener(value)
        super().__init__(initial_data)

    def __setitem__(self, key: str, value: Any) -> None:
        if isinstance(value, dict) and not isinstance(
            value, ConfigListener
        ):
            value = ConfigListener(value)
        super().__setitem__(key, value)
        self._auto_save()

    @staticmethod
    def _auto_save() -> None:
        """Persist config to disk if saving is enabled."""
        try:
            if (
                soda_instance is not None
                and soda_instance.config["misc"]["saveSettings"]
            ):
                with open(
                    CONFIG_FILE_PATH, "w", encoding="utf-8"
                ) as file_handle:
                    json.dump(
                        soda_instance.config,
                        file_handle,
                        indent=4,
                    )
        except (NameError, TypeError, KeyError):
            pass


# ═════════════════════════════════════════════════════════════════
#  LOW-LEVEL HELPERS
# ═════════════════════════════════════════════════════════════════

def is_game_process(process_name: str) -> bool:
    """Check whether a process name belongs to Minecraft."""
    return any(
        name in process_name for name in GAME_PROCESS_NAMES
    )


def press_key(virtual_key: int) -> None:
    """Send a key-down event."""
    win32api.keybd_event(virtual_key, 0, 0, 0)


def release_key(virtual_key: int) -> None:
    """Send a key-up event."""
    win32api.keybd_event(
        virtual_key, 0, win32con.KEYEVENTF_KEYUP, 0
    )


def tap_key(
    virtual_key: int, hold_seconds: float = 0.045
) -> None:
    """Press and release a key with a short hold."""
    press_key(virtual_key)
    time.sleep(hold_seconds)
    release_key(virtual_key)


def is_key_held(virtual_key: int) -> bool:
    """Return True if a virtual key is currently held."""
    return win32api.GetAsyncKeyState(virtual_key) < 0


def is_key_pressed(virtual_key: int) -> bool:
    """Return True if a key was pressed since last check."""
    return win32api.GetAsyncKeyState(virtual_key) != 0


def calculate_click_delay(
    cps: int, blatant: bool
) -> float:
    """Return the delay between clicks.

    Blatant mode uses a fixed interval; normal mode adds
    randomisation to appear more human.
    """
    if blatant:
        return 1.0 / cps
    return random.random() % (2.0 / cps)


def apply_cursor_shake(force: int) -> None:
    """Move the cursor by a small random offset."""
    current_x, current_y = win32api.GetCursorPos()
    delta_x = random.randint(-force, force)
    delta_y = random.randint(-force, force)
    win32api.SetCursorPos(
        (current_x + delta_x, current_y + delta_y)
    )


def cursor_is_in_game() -> bool:
    """Heuristic: cursor handle > 200000 means in-world."""
    return win32gui.GetCursorInfo()[1] > 200000


def cursor_is_in_menu() -> bool:
    """Heuristic: handle 50000–100000 means in a menu."""
    cursor_id = win32gui.GetCursorInfo()[1]
    return 50000 < cursor_id < 100000


def extract_zip_subfolder(
    zip_path: str, prefix: str, destination: str
) -> None:
    """Extract a specific subfolder from a ZIP into *destination*,
    stripping *prefix* from member paths.
    """
    with zipfile.ZipFile(zip_path, "r") as archive:
        for member in archive.namelist():
            if not member.startswith(prefix):
                continue
            relative = os.path.relpath(member, prefix)
            if relative == ".":
                continue
            target = os.path.join(destination, relative)
            if member.endswith("/"):
                os.makedirs(target, exist_ok=True)
            else:
                os.makedirs(
                    os.path.dirname(target), exist_ok=True
                )
                with open(target, "wb") as out_file:
                    out_file.write(archive.read(member))


# ═════════════════════════════════════════════════════════════════
#  SODA CORE CLASS
# ═════════════════════════════════════════════════════════════════

class Soda:
    """Core autoclicker engine.

    Manages config loading/saving, background threads for
    clicking and movement assists, item macros, and resource
    bootstrapping from GitHub.
    """

    def __init__(self) -> None:
        self.config: dict = _build_default_config()
        self.current_pot_slot: int = 0
        self.newver: bool = False
        self.newverid: str = ""
        self.folder_path: str = SODA_FOLDER

        # Timing trackers
        self.last_block_hit_time: float = 0.0
        self.last_right_click_time: float = 0.0
        self.better_input_timestamp: float = 0.0

        # Window / process state (updated by _window_listener)
        self.real_title: str = ""
        self.window_handle: Optional[int] = None
        self.focused_process: str = ""

        # Movement key tracking
        self.strafe_state: Dict[str, bool] = {
            "a": False, "d": False,
        }
        self.movement_state: Dict[str, Any] = {
            "w": False, "a": False,
            "s": False, "d": False,
            "jump": 0.0,
        }

        # Recorder iterator
        self.record_cycle = itertools.cycle(
            self.config["recorder"]["record"]
        )

        # Loaded preset configs & available click sounds
        self.configs: List[dict] = []
        self.click_sounds: List[str] = []

        # ── Bootstrap ────────────────────────────────────────
        self._ensure_folders()
        self._download_resources()
        self._check_for_updates()
        self._load_saved_config()

        # Wrap config in auto-saving listener
        self.config = ConfigListener(self.config)

        # Banner
        print("=" * 20)
        print("Soda Autoclicker - 4urxra")
        print("=" * 20)
        print(f"Version: {VERSION}")
        print("Discord: https://discord.gg/4ZqBfDFMG4")
        print("=" * 20)

        # ── Start daemon threads ─────────────────────────────
        thread_targets = [
            self._discord_rpc_loop,
            self._window_listener,
            self._left_bind_listener,
            self._right_bind_listener,
            self._hide_gui_bind_listener,
            self._misc_bind_listener,
            self._wtap_listener,
            self._auto_sprint_loop,
            self._better_input_loop,
            self._fast_stop_loop,
            self._left_clicker_loop,
            self._right_clicker_loop,
            self._smart_block_hit_loop,
        ]
        for target in thread_targets:
            threading.Thread(
                target=target, daemon=True
            ).start()

    # ─── Setup / Bootstrap ───────────────────────────────────

    def _ensure_folders(self) -> None:
        """Create the soda user folder if needed."""
        if not os.path.exists(self.folder_path):
            os.makedirs(self.folder_path, exist_ok=True)
            print(
                "Created Soda folder:", self.folder_path
            )
        os.makedirs(RESOURCE_FOLDER, exist_ok=True)

    def _download_resources(self) -> None:
        """Download config presets and sounds from GitHub."""
        try:
            print(
                "=" * 20
                + "\nInstalling Configs\n"
                + "=" * 20
            )
            time.sleep(1)

            subfolder = (
                "dev" if CONFIG_TYPE == "dev"
                else "resource"
            )
            prefix = (
                f"Soda-Autoclicker-main/{subfolder}/"
            )
            print(f"[!] Using {subfolder} resource folder")
            print("Downloading from GitHub (ZIP)...")

            zip_path = os.path.join(
                tempfile.gettempdir(), "soda_repo.zip"
            )
            subprocess.run(
                ["curl", "-L", REPO_ZIP_URL, "-o", zip_path],
                check=True,
            )
            extract_zip_subfolder(
                zip_path, prefix, RESOURCE_FOLDER
            )
            print("Extracted resource folder")

            shutil.rmtree(
                os.path.join(self.folder_path, "temp"),
                ignore_errors=True,
            )

            for url in TOGGLE_SOUND_URLS:
                filename = os.path.basename(url)
                dest = os.path.join(RESOURCE_FOLDER, filename)
                if not os.path.exists(dest):
                    print(f"Downloading {filename}...")
                    subprocess.run(
                        ["curl", "-L", url, "-o", dest],
                        check=True,
                    )
            print("Downloaded toggle sounds")
            print("Installed")

        except subprocess.CalledProcessError as error:
            print(
                "Failed to clone resources from GitHub:",
                error,
            )

    def _check_for_updates(self) -> None:
        """Check update.txt for a newer version."""
        print("Checking for updates...")
        update_file = os.path.join(
            RESOURCE_FOLDER, "update.txt"
        )
        if os.path.isfile(update_file):
            with open(update_file, "r") as handle:
                latest = handle.read().strip()
            if latest != VERSION:
                print(
                    f"New version available: {latest}"
                    f" (Current: {VERSION})"
                )
                self.newver = True
                self.newverid = latest

    def _load_saved_config(self) -> None:
        """Load config.json, falling back to defaults if
        the file is missing or structurally invalid.
        """
        if not os.path.isfile(CONFIG_FILE_PATH):
            return
        try:
            with open(
                CONFIG_FILE_PATH, encoding="utf-8"
            ) as handle:
                saved = json.load(handle)
            print("Loaded config from:", CONFIG_FILE_PATH)

            defaults = _build_default_config()
            config_valid = True
            for key in defaults:
                if key in (
                    "filename", "displayName",
                    "description", "Author",
                ):
                    continue
                if key not in saved:
                    print(f"Invalid config — missing: {key}")
                    config_valid = False
                    break
                if isinstance(defaults[key], dict):
                    if len(defaults[key]) != len(saved[key]):
                        print(
                            f"Invalid config — mismatch: {key}"
                        )
                        config_valid = False
                        break

            if config_valid:
                if not saved["misc"]["saveSettings"]:
                    self.config["misc"]["saveSettings"] = (
                        False
                    )
                else:
                    self.config = saved

        except (json.JSONDecodeError, KeyError) as error:
            print("Error loading config:", error)
            print("Using default config")

    # ─── Focus / State Checks ────────────────────────────────

    def is_focused(
        self, section: str,
        focus_key: str = "onlyWhenFocused",
        menu_key: str = "workInMenus",
    ) -> bool:
        """Check if the game is focused and we're allowed
        to act, respecting onlyWhenFocused and workInMenus.
        """
        cfg = self.config[section]
        game_ok = (
            is_game_process(self.focused_process)
            or not cfg[focus_key]
        )
        menu_ok = cfg[menu_key] or cursor_is_in_game()
        return game_ok and menu_ok

    # ─── Sound Helpers ───────────────────────────────────────

    def _play_click_sound(self) -> None:
        """Play the configured click sound file."""
        path = os.path.join(
            self.folder_path,
            self.config["left"]["soundPath"],
        )
        winsound.PlaySound(path, winsound.SND_ASYNC)

    def _play_toggle_sound(self, section: str) -> None:
        """Play on/off notification when toggling."""
        if not self.config["misc"]["toggleSounds"]:
            return
        filename = (
            "notify_on.wav"
            if self.config[section]["enabled"]
            else "notify_off.wav"
        )
        path = os.path.join(RESOURCE_FOLDER, filename)
        winsound.PlaySound(path, winsound.SND_ASYNC)

    # ─── Click Actions ───────────────────────────────────────

    def _send_left_click(self) -> bool:
        """Send a left click to the MC window.

        Returns True if a full click-release was sent, False
        if suppressed by break-blocks mode.
        """
        break_mode = self.config["left"]["breakBlocks"]
        shift_held = is_key_held(0x10)

        if break_mode == "Shift With Click" and shift_held:
            win32api.SendMessage(
                self.window_handle,
                win32con.WM_LBUTTONDOWN, 0, 0,
            )
            time.sleep(0.02)
            return False

        if break_mode == "Shift No Click" and shift_held:
            return False

        if break_mode == "Full":
            win32api.SendMessage(
                self.window_handle,
                win32con.WM_LBUTTONDOWN, 0, 0,
            )
            time.sleep(0.02)
            return False

        # Normal click-release
        win32api.SendMessage(
            self.window_handle,
            win32con.WM_LBUTTONDOWN, 0, 0,
        )
        time.sleep(0.02)
        win32api.SendMessage(
            self.window_handle,
            win32con.WM_LBUTTONUP, 0, 0,
        )
        return True

    def _do_block_hit(self) -> None:
        """Perform a block-hit (right-click tap) based on
        the configured type and chance.
        """
        left_cfg = self.config["left"]
        if not left_cfg["blockHit"]:
            return
        if not is_key_held(0x01):
            return
        if random.random() > left_cfg["blockHitChance"] / 100.0:
            return

        bh_type = left_cfg["bhType"]

        if bh_type in ("V2", "V3"):
            ping_ms = left_cfg.get("ping", 230)
            interval = ping_ms / 1000.0
            if bh_type == "V3":
                interval = random.randint(450, 550) / 1000.0

            now = time.time()
            if now - self.last_block_hit_time < interval:
                return

            self.last_block_hit_time = now
            win32api.mouse_event(
                win32con.MOUSEEVENTF_RIGHTDOWN, 0, 0,
            )
            hold = 0.02 if bh_type == "V2" else 0.173
            time.sleep(hold)
            win32api.mouse_event(
                win32con.MOUSEEVENTF_RIGHTUP, 0, 0,
            )
        else:
            # V1: simple chance-based right-click
            win32api.SendMessage(
                self.window_handle,
                win32con.WM_RBUTTONDOWN, 0, 0,
            )
            time.sleep(0.02)
            win32api.SendMessage(
                self.window_handle,
                win32con.WM_RBUTTONUP, 0, 0,
            )

    # ─── Item Throw Actions ──────────────────────────────────

    def _do_rod(self, use_long_rod: bool = False) -> None:
        """Switch to rod slot, throw, switch back to sword."""
        misc = self.config["misc"]
        rod_vk = CHAR_TO_VK.get(misc["rodSlot"])
        sword_vk = CHAR_TO_VK.get(misc["swordSlot"], 0x31)
        rod_delay = float(misc["rodDelay"])

        press_key(rod_vk)
        time.sleep(round(rod_delay / 10, 3))
        release_key(rod_vk)

        win32api.SendMessage(
            self.window_handle,
            win32con.WM_RBUTTONDOWN, 0, 0,
        )
        time.sleep(0.02)
        win32api.SendMessage(
            self.window_handle,
            win32con.WM_RBUTTONUP, 0, 0,
        )

        wait = (
            rod_delay * 2
            if use_long_rod and misc["longRod"]
            else rod_delay
        )
        time.sleep(wait)

        press_key(sword_vk)
        time.sleep(rod_delay / 10)
        release_key(sword_vk)

    def _do_pearl(self) -> None:
        """Switch to pearl slot, throw, switch to sword."""
        misc = self.config["misc"]
        pearl_vk = CHAR_TO_VK.get(misc["pearlSlot"])
        sword_vk = CHAR_TO_VK.get(misc["swordSlot"])

        press_key(pearl_vk)
        time.sleep(0.06)
        release_key(pearl_vk)

        win32api.SendMessage(
            self.window_handle,
            win32con.WM_RBUTTONDOWN, 0, 0,
        )
        time.sleep(0.02)
        win32api.SendMessage(
            self.window_handle,
            win32con.WM_RBUTTONUP, 0, 0,
        )

        press_key(sword_vk)
        time.sleep(0.8)
        release_key(sword_vk)

    def _do_potion(self) -> None:
        """Throw the next potion in the slot sequence."""
        pots = self.config["potions"]
        lowest = pots["lowestSlot"]
        highest = pots["highestSlot"]

        if self.current_pot_slot < lowest:
            self.current_pot_slot = lowest

        if self.current_pot_slot > highest:
            print("No Potions Left!")
            return

        slot_vk = CHAR_TO_VK.get(
            str(self.current_pot_slot)
        )
        sword_vk = CHAR_TO_VK.get(
            self.config["misc"]["swordSlot"]
        )

        press_key(slot_vk)
        time.sleep(int(pots["throwDelay"]))
        release_key(slot_vk)

        win32api.mouse_event(
            win32con.MOUSEEVENTF_RIGHTDOWN, 0, 0,
        )
        time.sleep(0.02)
        win32api.mouse_event(
            win32con.MOUSEEVENTF_RIGHTUP, 0, 0,
        )
        time.sleep(0.6)

        press_key(sword_vk)
        self.current_pot_slot += 1

    # ─── Per-Click Handlers ──────────────────────────────────

    def _perform_left_click(
        self, use_send_message: bool
    ) -> None:
        """One left-click action: click, block-hit, auto-rod,
        sound, shake.
        """
        if not self._send_left_click():
            return

        self._do_block_hit()

        left_cfg = self.config["left"]
        if left_cfg["AutoRod"]:
            smart_held = is_key_pressed(left_cfg["smartBH"])
            chance = left_cfg["AutoRodChance"] / 100.0
            if (
                not smart_held
                and random.random() <= chance
            ):
                self._do_rod(use_long_rod=False)

        sound_path = left_cfg["soundPath"]
        if (
            sound_path
            and sound_path != "None"
            and os.path.isfile(
                os.path.join(self.folder_path, sound_path)
            )
        ):
            threading.Thread(
                target=self._play_click_sound, daemon=True,
            ).start()

        if left_cfg["shakeEffect"]:
            apply_cursor_shake(left_cfg["shakeEffectForce"])

    def _perform_right_click(
        self, use_send_message: bool
    ) -> None:
        """One right-click action with optional hold for
        items mode.
        """
        right_cfg = self.config["right"]
        items_mode = right_cfg["items"]

        if use_send_message:
            win32api.SendMessage(
                self.window_handle,
                win32con.WM_RBUTTONDOWN, 0, 0,
            )
            if not items_mode:
                time.sleep(0.02)
                win32api.SendMessage(
                    self.window_handle,
                    win32con.WM_RBUTTONUP, 0, 0,
                )
        else:
            win32api.mouse_event(
                win32con.MOUSEEVENTF_RIGHTDOWN, 0, 0,
            )
            if not items_mode:
                time.sleep(0.02)
                win32api.mouse_event(
                    win32con.MOUSEEVENTF_RIGHTUP, 0, 0,
                )

        sound_path = right_cfg["soundPath"]
        if sound_path and sound_path != "None":
            full_path = os.path.join(
                self.folder_path,
                self.config["left"]["soundPath"],
            )
            if os.path.isfile(full_path):
                threading.Thread(
                    target=self._play_click_sound,
                    daemon=True,
                ).start()

        if right_cfg["shakeEffect"]:
            apply_cursor_shake(
                right_cfg["shakeEffectForce"]
            )

    # ─── Background Thread Loops ─────────────────────────────

    def _discord_rpc_loop(self) -> None:
        """Maintain Discord Rich Presence status."""
        asyncio.set_event_loop(asyncio.new_event_loop())
        try:
            rpc = Presence("1400790093312032808")
            rpc.connect()
            start_time = time.time()

            while True:
                if self.config["misc"][
                    "discordRichPresence"
                ]:
                    rpc.update(
                        state=random.choice(
                            RPC_STATUS_MESSAGES
                        ),
                        start=start_time,
                        large_image="logo",
                        large_text="I'm him, ur not",
                        buttons=[{
                            "label": "Website",
                            "url": (
                                "https://github.com/"
                                "Dream23322/Soda-Autoclicker/"
                            ),
                        }],
                    )
                else:
                    rpc.clear()
                time.sleep(15)
        except Exception:
            print("Discord not found running or installed")

    def _window_listener(self) -> None:
        """Poll the foreground window every 500 ms."""
        while True:
            try:
                foreground = (
                    win32gui.GetForegroundWindow()
                )
                self.real_title = (
                    win32gui.GetWindowText(foreground)
                )
                self.window_handle = (
                    win32gui.FindWindow("LWJGL", None)
                )
                pid = (
                    win32process
                    .GetWindowThreadProcessId(foreground)[
                        -1
                    ]
                )
                self.focused_process = (
                    psutil.Process(pid).name()
                )
            except (psutil.NoSuchProcess, OSError):
                self.focused_process = ""
            time.sleep(0.5)

    # ── Clicker loops ────────────────────────────────────────

    def _left_clicker_loop(self) -> None:
        """Main left-click loop."""
        while True:
            left_cfg = self.config["left"]

            if self.config["recorder"]["enabled"]:
                delay = float(next(self.record_cycle))
            else:
                delay = calculate_click_delay(
                    left_cfg["averageCPS"],
                    left_cfg["blatant"],
                )

            if not left_cfg["enabled"]:
                time.sleep(delay)
                continue

            # Hold mode requires LMB held
            if (
                left_cfg["mode"] == "Hold"
                and not is_key_held(0x01)
            ):
                time.sleep(delay)
                continue

            # Skip if smart-BH bind is active
            if is_key_pressed(left_cfg["smartBH"]):
                time.sleep(delay)
                continue

            if left_cfg["RMBLock"] and is_key_held(0x02):
                time.sleep(delay)
                continue

            if (
                left_cfg["onlyWhenFocused"]
                and not is_game_process(
                    self.focused_process
                )
            ):
                time.sleep(delay)
                continue

            if (
                not left_cfg["workInMenus"]
                and cursor_is_in_menu()
            ):
                time.sleep(delay)
                continue

            use_sendmsg = left_cfg["onlyWhenFocused"]
            threading.Thread(
                target=self._perform_left_click,
                args=(use_sendmsg,),
                daemon=True,
            ).start()
            time.sleep(delay)

    def _right_clicker_loop(self) -> None:
        """Main right-click loop."""
        while True:
            right_cfg = self.config["right"]
            delay = calculate_click_delay(
                right_cfg["averageCPS"],
                right_cfg["blatant"],
            )

            if not right_cfg["enabled"]:
                time.sleep(delay)
                continue

            if (
                right_cfg["mode"] == "Hold"
                and not is_key_held(0x02)
            ):
                time.sleep(delay)
                continue

            if is_key_pressed(
                self.config["left"]["smartBH"]
            ):
                time.sleep(delay)
                continue

            if (
                right_cfg["LMBLock"]
                and is_key_held(0x01)
            ):
                time.sleep(delay)
                continue

            if (
                right_cfg["onlyWhenFocused"]
                and not is_game_process(
                    self.focused_process
                )
            ):
                time.sleep(delay)
                continue

            if (
                not right_cfg["workInMenus"]
                and cursor_is_in_menu()
            ):
                time.sleep(delay)
                continue

            use_sendmsg = right_cfg["onlyWhenFocused"]
            threading.Thread(
                target=self._perform_right_click,
                args=(use_sendmsg,),
                daemon=True,
            ).start()
            time.sleep(delay)

    # ── Bind listeners ───────────────────────────────────────

    def _left_bind_listener(self) -> None:
        """Toggle left clicker on/off with its bound key."""
        while True:
            bind = self.config["left"]["bind"]
            if bind and is_key_pressed(bind):
                if self.is_focused("left"):
                    self.config["left"]["enabled"] = (
                        not self.config["left"]["enabled"]
                    )
                    self._play_toggle_sound("left")
                    try:
                        dpg.set_value(
                            gui_refs["checkbox_left"],
                            self.config["left"]["enabled"],
                        )
                    except Exception:
                        pass
                while is_key_pressed(bind):
                    time.sleep(0.001)
            time.sleep(0.001)

    def _right_bind_listener(self) -> None:
        """Toggle right clicker on/off with its bound key."""
        while True:
            bind = self.config["right"]["bind"]
            if bind and is_key_pressed(bind):
                if self.is_focused("right"):
                    self.config["right"]["enabled"] = (
                        not self.config["right"]["enabled"]
                    )
                    self._play_toggle_sound("right")
                    try:
                        dpg.set_value(
                            gui_refs["checkbox_right"],
                            self.config["right"]["enabled"],
                        )
                    except Exception:
                        pass
                while is_key_pressed(bind):
                    time.sleep(0.001)
            time.sleep(0.001)

    def _hide_gui_bind_listener(self) -> None:
        """Toggle GUI visibility with a fake console banner."""
        while True:
            bind = self.config["misc"]["bindHideGUI"]
            if bind and is_key_pressed(bind):
                self.config["misc"]["guiHidden"] = (
                    not self.config["misc"]["guiHidden"]
                )
                faker = self.config["misc"]["consoleFaker"]
                banner = CONSOLE_FAKER_BANNERS.get(
                    faker, "BetterRGB - 1.0.4 Beta"
                )
                print("\n" * 24 + banner + "\n" * 5)

                if self.config["misc"]["guiHidden"]:
                    win32gui.ShowWindow(
                        gui_refs["hwnd"], win32con.SW_HIDE,
                    )
                else:
                    win32gui.ShowWindow(
                        gui_refs["hwnd"], win32con.SW_SHOW,
                    )
                while is_key_pressed(bind):
                    time.sleep(0.001)
            time.sleep(0.001)

    def _misc_bind_listener(self) -> None:
        """Listen for rod / pearl / potion / reset binds."""
        while True:
            focused = self.is_focused("left")
            misc = self.config["misc"]
            pots = self.config["potions"]

            if (
                focused
                and is_key_pressed(misc["rodBind"])
            ):
                self._do_rod(use_long_rod=True)
                time.sleep(0.5)
            elif (
                focused
                and is_key_pressed(misc["pearlBind"])
            ):
                self._do_pearl()
                time.sleep(0.5)
            elif (
                focused
                and is_key_pressed(pots["potBind"])
            ):
                self._do_potion()
                time.sleep(0.5)
            elif is_key_pressed(pots["potResetBind"]):
                self.current_pot_slot = int(
                    pots["lowestSlot"]
                )
            time.sleep(0.001)

    # ── Movement threads ─────────────────────────────────────

    def _wtap_listener(self) -> None:
        """Auto W-tap: release W briefly while strafing to
        reset sprint for extra knockback.
        """
        last_mouse_x, last_mouse_y = 0, 0
        while True:
            time.sleep(0.01)
            movement = self.config["movement"]
            if (
                not movement["autoWTap"]
                or not self.is_focused("left")
                or not is_key_held(0x01)
            ):
                time.sleep(0.5)
                continue

            strafing = (
                (is_key_held(0x41) or is_key_held(0x44))
                and is_key_held(0x57)
            )
            mouse_x, mouse_y = win32api.GetCursorPos()
            aiming = (
                mouse_x != last_mouse_x
                or mouse_y != last_mouse_y
            )
            last_mouse_x, last_mouse_y = mouse_x, mouse_y

            if not (strafing and aiming):
                continue

            mode = movement["wTapMode"]
            value = movement["wTapValue"]
            should_tap = (
                (mode == "chance"
                 and random.random() <= value / 100.0)
                or mode == "delay"
            )
            if should_tap:
                release_key(0x57)
                time.sleep(0.05)
                press_key(0x57)
                if mode == "delay":
                    time.sleep(value / 100.0)

    def _auto_sprint_loop(self) -> None:
        """Hold Ctrl (sprint) when moving."""
        while True:
            if (
                not self.config["movement"]["autoSprint"]
                or not self.is_focused("left")
            ):
                time.sleep(0.5)
                continue
            time.sleep(0.01)

            moving = (
                is_key_held(0x57)
                or is_key_held(0x41)
                or is_key_held(0x44)
            )
            if moving and not is_key_held(0x11):
                press_key(0x11)
            elif not moving and is_key_held(0x11):
                release_key(0x11)

    def _better_input_loop(self) -> None:
        """SOCD-style input cleaner for perfect strafing."""
        while True:
            if (
                not self.config["movement"]["betterInput"]
                or not self.is_focused("left")
            ):
                time.sleep(0.1)
                continue

            a_down = is_key_held(0x41)
            d_down = is_key_held(0x44)

            if self.strafe_state["a"] and d_down:
                release_key(0x41)
                a_down = False
                self.better_input_timestamp = time.time()
            elif self.strafe_state["d"] and a_down:
                release_key(0x44)
                d_down = False
                self.better_input_timestamp = time.time()

            self.strafe_state["a"] = a_down
            self.strafe_state["d"] = d_down

    def _fast_stop_loop(self) -> None:
        """Tap the opposite key on release to kill momentum
        when grounded.
        """
        while True:
            if (
                not self.config["movement"]["fastStop"]
                or not self.is_focused("left")
            ):
                time.sleep(0.1)
                continue

            if is_key_held(0x20):
                self.movement_state["jump"] = time.time()

            w_down = is_key_held(0x57)
            s_down = is_key_held(0x53)
            a_down = is_key_held(0x41)
            d_down = is_key_held(0x44)

            grounded = (
                time.time()
                - self.movement_state["jump"] > 0.7
                and time.time()
                - self.better_input_timestamp > 0.7
            )

            if grounded:
                skip = False
                if (
                    not w_down and not s_down
                    and self.movement_state["w"]
                ):
                    tap_key(0x53)
                    skip = True
                if (
                    not s_down and not w_down
                    and self.movement_state["s"]
                ):
                    tap_key(0x57)
                    skip = True
                if not skip:
                    if (
                        not a_down and not d_down
                        and self.movement_state["a"]
                    ):
                        tap_key(0x44)
                    if (
                        not d_down and not a_down
                        and self.movement_state["d"]
                    ):
                        tap_key(0x41)

            self.movement_state["w"] = w_down
            self.movement_state["s"] = s_down
            self.movement_state["a"] = a_down
            self.movement_state["d"] = d_down

    def _smart_block_hit_loop(self) -> None:
        """Smart BH: alternates L-click → R-click hold with
        timing randomisation while the bind is held.
        """
        release_delays = [0.05, 0.06]
        while True:
            smart_bind = self.config["left"]["smartBH"]
            if (
                not is_key_pressed(smart_bind)
                or not self.is_focused("left")
            ):
                time.sleep(0.1)
                continue

            # Left click
            win32api.mouse_event(
                win32con.MOUSEEVENTF_LEFTDOWN, 0, 0,
            )
            time.sleep(0.02)
            win32api.mouse_event(
                win32con.MOUSEEVENTF_LEFTUP, 0, 0,
            )
            time.sleep(0.1)

            # Right click (block)
            win32api.mouse_event(
                win32con.MOUSEEVENTF_RIGHTDOWN, 0, 0,
            )
            time.sleep(0.15)

            if is_key_pressed(smart_bind):
                time.sleep(0.1)
                win32api.mouse_event(
                    win32con.MOUSEEVENTF_RIGHTUP, 0, 0,
                )
                time.sleep(random.choice(release_delays))
            else:
                win32api.mouse_event(
                    win32con.MOUSEEVENTF_RIGHTUP, 0, 0,
                )
                time.sleep(0.1)

    # ─── Config / Resource Loaders ───────────────────────────

    def get_configs(self) -> List[dict]:
        """Scan the resource folder for .json presets."""
        self.configs = []
        for filename in os.listdir(RESOURCE_FOLDER):
            if not filename.endswith(".json"):
                continue
            filepath = os.path.join(
                RESOURCE_FOLDER, filename
            )
            try:
                with open(
                    filepath, encoding="utf-8"
                ) as handle:
                    cfg = json.load(handle)
                cfg["filename"] = os.path.splitext(
                    filename
                )[0]
                self.configs.append(cfg)
            except (json.JSONDecodeError, OSError) as err:
                print(f"[!] Failed to load {filename}: {err}")
        return self.configs

    def load_config(self, config_id: int) -> None:
        """Apply a config preset by DPG callback ID."""
        computed_id = (
            0 if config_id == 255
            else int((config_id - 255) / 8) - 3
        )
        selected = self.configs[computed_id]
        filepath = os.path.join(
            RESOURCE_FOLDER,
            f"{selected['filename']}.json",
        )
        if not os.path.isfile(filepath):
            return
        try:
            with open(filepath, encoding="utf-8") as handle:
                loaded = json.load(handle)
            self.config = loaded
            print(f"[!] Applied config: {selected['filename']}")
            with open(
                CONFIG_FILE_PATH, "w", encoding="utf-8"
            ) as handle:
                json.dump(self.config, handle, indent=4)
        except (json.JSONDecodeError, OSError) as err:
            print(f"Failed to load config: {err}")

    def get_click_sounds(self) -> List[str]:
        """Return available .wav click-sound filenames."""
        self.click_sounds = ["None"]
        for filename in os.listdir(RESOURCE_FOLDER):
            if (
                filename.endswith(".wav")
                and filename
                not in ("notify_on.wav", "notify_off.wav")
            ):
                self.click_sounds.append(filename)
        return self.click_sounds

    @staticmethod
    def open_config_folder() -> None:
        """Open the resource folder in Explorer."""
        if os.path.exists(RESOURCE_FOLDER):
            os.startfile(RESOURCE_FOLDER)
        else:
            print(
                "[!] Config folder does not exist:",
                RESOURCE_FOLDER,
            )


# ═════════════════════════════════════════════════════════════════
#  GUI — DearPyGui Interface
# ═════════════════════════════════════════════════════════════════

# Shared references between background threads and GUI
gui_refs: Dict[str, Any] = {}
soda_instance: Optional[Soda] = None


def _build_gui(soda: Soda) -> None:
    """Construct and run the DearPyGui interface."""
    global soda_instance
    soda_instance = soda

    dpg.create_context()

    # ── Reusable keybind capture system ──────────────────────

    _bind_waiting: Dict[str, bool] = {}

    def start_bind_capture(
        tag: str,
        button_id: int,
        config_path: List[str],
    ) -> None:
        """Begin listening for a keypress to assign a bind."""
        if _bind_waiting.get(tag):
            return
        _bind_waiting[tag] = True
        dpg.set_item_label(button_id, "...")

        def on_key_pressed(_sender: int, _data: Any) -> None:
            if not _bind_waiting.get(tag):
                return
            key_name = keyboard.read_event(
                suppress=True
            ).name
            virtual_key = ord(key_name.upper())

            target = soda.config
            for part in config_path[:-1]:
                target = target[part]
            target[config_path[-1]] = virtual_key

            dpg.set_item_label(
                button_id, f"Bind: {key_name.upper()}"
            )
            dpg.delete_item(tag)
            _bind_waiting[tag] = False

        with dpg.handler_registry(tag=tag):
            dpg.add_key_press_handler(
                callback=on_key_pressed
            )

    # ── Generic config setter factory ────────────────────────

    def make_setter(
        section: str, key: str
    ):
        """Return a DPG callback that sets
        config[section][key] = value.
        """
        def callback(
            _sender: int, value: Any
        ) -> None:
            soda.config[section][key] = value
        return callback

    def make_sound_setter(section: str):
        """Return a callback that sets the sound path."""
        def callback(
            _sender: int, value: str
        ) -> None:
            soda.config[section]["soundPath"] = (
                f"resource\\{value}"
            )
        return callback

    # ── Theme setup ──────────────────────────────────────────

    theme_name = soda.config["misc"]["theme"]
    if theme_name == "custom":
        rgb = (
            soda.config["misc"]["red"],
            soda.config["misc"]["green"],
            soda.config["misc"]["blue"],
        )
    else:
        rgb = THEME_COLOUR_MAP.get(
            theme_name, (113, 190, 235)
        )

    with dpg.theme() as container_theme:
        with dpg.theme_component(dpg.mvAll):
            for colour_const in (
                dpg.mvThemeCol_Tab,
                dpg.mvThemeCol_TabHovered,
                dpg.mvThemeCol_TabActive,
                dpg.mvThemeCol_CheckMark,
                dpg.mvThemeCol_SliderGrab,
                dpg.mvThemeCol_ButtonHovered,
                dpg.mvThemeCol_ScrollbarGrab,
            ):
                dpg.add_theme_color(
                    colour_const, rgb,
                    category=dpg.mvThemeCat_Core,
                )
            if theme_name == "light":
                dpg.add_theme_color(
                    dpg.mvThemeCol_Text, (0, 0, 0),
                    category=dpg.mvThemeCat_Core,
                )
                dpg.add_theme_color(
                    dpg.mvThemeCol_WindowBg,
                    (230, 230, 230),
                    category=dpg.mvThemeCat_Core,
                )
                dpg.add_theme_color(
                    dpg.mvThemeCol_FrameBg, rgb,
                    category=dpg.mvThemeCat_Core,
                )
                dpg.add_theme_color(
                    dpg.mvThemeCol_Button, rgb,
                    category=dpg.mvThemeCat_Core,
                )

    with dpg.theme() as global_theme:
        with dpg.theme_component(dpg.mvAll):
            dpg.add_theme_style(
                dpg.mvStyleVar_WindowBorderSize, 0,
            )
            dpg.add_theme_style(
                dpg.mvStyleVar_FrameRounding, 4,
            )
            dpg.add_theme_style(
                dpg.mvStyleVar_GrabRounding, 1,
            )
            dpg.add_theme_style(
                dpg.mvStyleVar_GrabMinSize, 20,
            )
            dpg.add_theme_style(
                dpg.mvStyleVar_TabRounding, 1,
            )
            accent = (107, 110, 248)
            for colour_const in (
                dpg.mvThemeCol_TabActive,
                dpg.mvThemeCol_TabHovered,
                dpg.mvThemeCol_ButtonHovered,
                dpg.mvThemeCol_CheckMark,
                dpg.mvThemeCol_ScrollbarGrabHovered,
                dpg.mvThemeCol_ScrollbarGrabActive,
                dpg.mvThemeCol_SliderGrab,
                dpg.mvThemeCol_SliderGrabActive,
            ):
                dpg.add_theme_color(
                    colour_const, accent,
                    category=dpg.mvThemeCat_Core,
                )
            dpg.add_theme_color(
                dpg.mvThemeCol_FrameBgHovered,
                (71, 71, 77),
                category=dpg.mvThemeCat_Core,
            )
            dpg.add_theme_color(
                dpg.mvThemeCol_HeaderHovered,
                (71, 71, 77),
                category=dpg.mvThemeCat_Core,
            )

    dpg.create_viewport(
        title=f"[v{VERSION}] Soda :P",
        width=860, height=645,
    )
    click_sounds = soda.get_click_sounds()

    # ── Recorder state ───────────────────────────────────────

    recording_state = {"active": False}

    def start_recording() -> None:
        """Start recording click timings."""
        if recording_state["active"]:
            return
        recording_state["active"] = True
        dpg.set_value(
            gui_refs["recording_status"],
            "Recording: True",
        )
        recorded: List[float] = []
        start_ref = [0.0]

        def record_loop() -> None:
            while recording_state["active"]:
                if is_key_held(0x01):
                    recorded.append(
                        time.time() - start_ref[0]
                    )
                    dpg.set_value(
                        gui_refs["recording_status"],
                        "Recording: True "
                        f"- Clicks: {len(recorded)}",
                    )
                    start_ref[0] = time.time()
                    while is_key_held(0x01):
                        time.sleep(0.001)

            if len(recorded) < 2:
                recorded.clear()
                recorded.append(0.08)
            else:
                recorded[0] = 0
                del recorded[-1]

            soda.config["recorder"]["record"] = recorded
            soda.record_cycle = itertools.cycle(recorded)
            total = sum(float(t) for t in recorded) or 1
            avg_cps = round((len(recorded) / total) * soda.config["recorder"]["recordMultiplier"], 2)
            dpg.set_value(
                gui_refs["recording_avg"],
                f"Average CPS of previous Record: {avg_cps}",
            )

        threading.Thread(
            target=record_loop, daemon=True,
        ).start()

    def stop_recording() -> None:
        """Stop recording click timings."""
        recording_state["active"] = False
        dpg.set_value(
            gui_refs["recording_status"],
            "Recording: False",
        )

    # ── Config editor (tkinter popup) ────────────────────────

    def open_config_editor(_sender: int) -> None:
        """Open a tkinter window to save config metadata."""
        def save_config() -> None:
            soda.config["displayName"] = name_var.get()
            soda.config["Author"] = author_var.get()
            soda.config["description"] = desc_var.get()
            soda.config["filename"] = fname_var.get()
            path = os.path.join(
                RESOURCE_FOLDER,
                f"{soda.config['filename']}.json",
            )
            try:
                with open(
                    path, "w", encoding="utf-8"
                ) as handle:
                    json.dump(
                        soda.config, handle, indent=4,
                    )
                messagebox.showinfo(
                    "Config Editor",
                    f"Saved: {soda.config['filename']}.json",
                )
                root.destroy()
            except OSError as err:
                messagebox.showerror(
                    "Config Editor",
                    f"Failed to save: {err}",
                )

        time.sleep(1)
        root = tk.Tk()
        root.title("Config Editor")
        root.geometry("400x300")
        root.resizable(False, False)

        tk.Label(root, text="Config Editor").pack(pady=5)

        tk.Label(root, text="Name").pack()
        name_var = tk.StringVar(
            value=soda.config.get("displayName", "")
        )
        tk.Entry(root, textvariable=name_var).pack()

        tk.Label(root, text="Author").pack()
        author_var = tk.StringVar(
            value=soda.config.get("Author", "")
        )
        tk.Entry(root, textvariable=author_var).pack()

        tk.Label(root, text="Description").pack()
        desc_var = tk.StringVar(
            value=soda.config.get("description", "")
        )
        tk.Entry(root, textvariable=desc_var).pack()

        tk.Label(root, text="Filename").pack()
        fname_var = tk.StringVar(
            value=soda.config.get("filename", "")
        )
        tk.Entry(root, textvariable=fname_var).pack()

        tk.Button(
            root, text="Save", command=save_config,
        ).pack(pady=10)
        root.mainloop()

    # ── Misc GUI callbacks ───────────────────────────────────

    def toggle_always_on_top(
        _sender: int, value: bool
    ) -> None:
        flag = (
            win32con.HWND_TOPMOST if value
            else win32con.HWND_NOTOPMOST
        )
        win32gui.SetWindowPos(
            gui_refs["hwnd"], flag, 0, 0, 0, 0,
            win32con.SWP_NOMOVE | win32con.SWP_NOSIZE,
        )

    def auto_ping(_sender: int) -> None:
        """Measure ping to a Hypixel-adjacent server."""
        try:
            measured = ping3.ping(
                "speedtest.chicago.linode.com", unit="ms"
            )
            if measured is not None:
                measured = int(measured + 10)
                soda.config["misc"]["ping"] = measured
                dpg.set_value(
                    gui_refs["ping_slider"], measured
                )
        except Exception as err:
            print(f"[!] Failed to ping: {err}")
            soda.config["misc"]["ping"] = 100

    def self_destruct() -> None:
        dpg.destroy_context()

    # ── Slot list (reused in combos) ─────────────────────────
    slot_items = [str(i) for i in range(1, 10)]

    # ═════════════════════════════════════════════════════════
    #  BUILD THE WINDOW
    # ═════════════════════════════════════════════════════════

    with dpg.window(tag="Primary Window"):
        dpg.bind_item_theme(
            "Primary Window", container_theme
        )

        with dpg.tab_bar():

            # ───────── LEFT CLICKER TAB ──────────────────────
            with dpg.tab(label="Left Clicker"):
                dpg.add_spacer(width=75)
                with dpg.group(horizontal=True):
                    gui_refs["checkbox_left"] = (
                        dpg.add_checkbox(
                            label="Toggle",
                            default_value=soda.config[
                                "left"
                            ]["enabled"],
                            callback=make_setter(
                                "left", "enabled"
                            ),
                        )
                    )
                    btn_left_bind = dpg.add_button(
                        label="Click to Bind",
                        callback=lambda: start_bind_capture(
                            "LeftBind", btn_left_bind,
                            ["left", "bind"],
                        ),
                    )
                    if soda.config["left"]["bind"]:
                        dpg.set_item_label(
                            btn_left_bind,
                            f"Bind: {chr(soda.config['left']['bind'])}",
                        )
                    dpg.add_combo(
                        label="Mode",
                        items=["Hold", "Always"],
                        default_value=soda.config[
                            "left"
                        ]["mode"],
                        callback=make_setter(
                            "left", "mode"
                        ),
                    )

                dpg.add_spacer(width=75)
                dpg.add_slider_int(
                    label="Average CPS",
                    default_value=soda.config[
                        "left"
                    ]["averageCPS"],
                    min_value=1,
                    callback=make_setter(
                        "left", "averageCPS"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)

                dpg.add_checkbox(
                    label="BlockHit",
                    default_value=soda.config[
                        "left"
                    ]["blockHit"],
                    callback=make_setter(
                        "left", "blockHit"
                    ),
                )
                dpg.add_slider_int(
                    label="BlockHit Chance",
                    default_value=soda.config[
                        "left"
                    ]["blockHitChance"],
                    min_value=1, max_value=100,
                    callback=make_setter(
                        "left", "blockHitChance"
                    ),
                )
                dpg.add_text(
                    default_value=(
                        "Randomly right clicks for a blockhit"
                        " (MC < 1.8.9).\nAbove 50 can make"
                        " movement difficult."
                    ),
                )
                dpg.add_combo(
                    label="BlockHit Type",
                    items=["V1", "V2", "V3"],
                    default_value=soda.config[
                        "left"
                    ]["bhType"],
                    callback=make_setter(
                        "left", "bhType"
                    ),
                )
                dpg.add_text(
                    default_value=(
                        "V1 - Normal\nV2 - Ping based"
                        "\nV3 - Hold (Timer)"
                    ),
                )

                btn_smart_bh = dpg.add_button(
                    label="Smart BH Bind",
                    callback=lambda: start_bind_capture(
                        "SmartBH", btn_smart_bh,
                        ["left", "smartBH"],
                    ),
                )
                if soda.config["left"]["smartBH"]:
                    dpg.set_item_label(
                        btn_smart_bh,
                        f"Bind: {chr(soda.config['left']['smartBH'])}",
                    )

                dpg.add_spacer(width=125)
                dpg.add_checkbox(
                    label="Shake Effect",
                    default_value=soda.config[
                        "left"
                    ]["shakeEffect"],
                    callback=make_setter(
                        "left", "shakeEffect"
                    ),
                )
                dpg.add_slider_int(
                    label="Shake Effect Force",
                    default_value=soda.config[
                        "left"
                    ]["shakeEffectForce"],
                    min_value=1, max_value=20,
                    callback=make_setter(
                        "left", "shakeEffectForce"
                    ),
                )
                dpg.add_text(
                    default_value=(
                        "Camera jitter when active."
                        " Can bypass strict AC."
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_combo(
                    label="Click Sound",
                    items=click_sounds,
                    default_value=soda.config[
                        "left"
                    ]["soundPath"],
                    callback=make_sound_setter("left"),
                )
                dpg.add_text(
                    default_value="Plays a sound per click!",
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_checkbox(
                    label="Only In Game",
                    default_value=soda.config[
                        "left"
                    ]["onlyWhenFocused"],
                    callback=make_setter(
                        "left", "onlyWhenFocused"
                    ),
                )
                dpg.add_checkbox(
                    label="RMB-Lock",
                    default_value=soda.config[
                        "left"
                    ]["RMBLock"],
                    callback=make_setter(
                        "left", "RMBLock"
                    ),
                )
                dpg.add_checkbox(
                    label="Work in Menus",
                    default_value=soda.config[
                        "left"
                    ]["workInMenus"],
                    callback=make_setter(
                        "left", "workInMenus"
                    ),
                )
                dpg.add_checkbox(
                    label="Blatant Mode",
                    default_value=soda.config[
                        "left"
                    ]["blatant"],
                    callback=make_setter(
                        "left", "blatant"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_combo(
                    label="Break Blocks",
                    items=[
                        "None", "Full",
                        "Shift With Click",
                        "Shift No Click",
                    ],
                    default_value=soda.config[
                        "left"
                    ]["breakBlocks"],
                    callback=make_setter(
                        "left", "breakBlocks"
                    ),
                )
                dpg.add_text(
                    default_value=(
                        "None - No block breaking\n"
                        "Full - Always break\n"
                        "Shift With Click - Break when "
                        "shifting, keep clicking\n"
                        "Shift No Click - Stop clicking "
                        "when shifting"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_checkbox(
                    label="Auto Rod",
                    default_value=soda.config[
                        "left"
                    ]["AutoRod"],
                    callback=make_setter(
                        "left", "AutoRod"
                    ),
                )
                dpg.add_slider_int(
                    label="Auto Rod Chance",
                    default_value=soda.config[
                        "left"
                    ]["AutoRodChance"],
                    min_value=1, max_value=100,
                    callback=make_setter(
                        "left", "AutoRodChance"
                    ),
                )
                dpg.add_text(
                    default_value=(
                        "Throws a rod between clicks."
                        " Set rod slot in Misc.\n"
                        "Keep below 15!"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_text(
                    default_value="Credits: 4urxra (Developer)",
                )
                dpg.add_text(
                    default_value=(
                        "https://github.com/Dream23322/"
                        "Soda-Autoclicker/"
                    ),
                )

            # ───────── RIGHT CLICKER TAB ─────────────────────
            with dpg.tab(label="Right Clicker"):
                dpg.add_spacer(width=75)
                with dpg.group(horizontal=True):
                    gui_refs["checkbox_right"] = (
                        dpg.add_checkbox(
                            label="Toggle",
                            default_value=soda.config[
                                "right"
                            ]["enabled"],
                            callback=make_setter(
                                "right", "enabled"
                            ),
                        )
                    )
                    btn_right_bind = dpg.add_button(
                        label="Click to Bind",
                        callback=lambda: start_bind_capture(
                            "RightBind", btn_right_bind,
                            ["right", "bind"],
                        ),
                    )
                    if soda.config["right"]["bind"]:
                        dpg.set_item_label(
                            btn_right_bind,
                            f"Bind: {chr(soda.config['right']['bind'])}",
                        )
                    dpg.add_combo(
                        label="Mode",
                        items=["Hold", "Always"],
                        default_value=soda.config[
                            "right"
                        ]["mode"],
                        callback=make_setter(
                            "right", "mode"
                        ),
                    )
                dpg.add_spacer(width=75)
                dpg.add_slider_int(
                    label="Average CPS",
                    default_value=soda.config[
                        "right"
                    ]["averageCPS"],
                    min_value=1,
                    callback=make_setter(
                        "right", "averageCPS"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_checkbox(
                    label="Shake Effect",
                    default_value=soda.config[
                        "right"
                    ]["shakeEffect"],
                    callback=make_setter(
                        "right", "shakeEffect"
                    ),
                )
                dpg.add_slider_int(
                    label="Shake Effect Force",
                    default_value=soda.config[
                        "right"
                    ]["shakeEffectForce"],
                    min_value=1, max_value=20,
                    callback=make_setter(
                        "right", "shakeEffectForce"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_combo(
                    label="Click Sound",
                    items=click_sounds,
                    default_value=soda.config[
                        "right"
                    ]["soundPath"],
                    callback=make_sound_setter("right"),
                )
                dpg.add_text(
                    default_value="Plays a sound per click!",
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_checkbox(
                    label="LMB-Lock",
                    default_value=soda.config[
                        "right"
                    ]["LMBLock"],
                    callback=make_setter(
                        "right", "LMBLock"
                    ),
                )
                dpg.add_checkbox(
                    label="Only In Game",
                    default_value=soda.config[
                        "right"
                    ]["onlyWhenFocused"],
                    callback=make_setter(
                        "right", "onlyWhenFocused"
                    ),
                )
                dpg.add_checkbox(
                    label="Work in Menus",
                    default_value=soda.config[
                        "right"
                    ]["workInMenus"],
                    callback=make_setter(
                        "right", "workInMenus"
                    ),
                )
                dpg.add_checkbox(
                    label="Blatant Mode",
                    default_value=soda.config[
                        "right"
                    ]["blatant"],
                    callback=make_setter(
                        "right", "blatant"
                    ),
                )
                dpg.add_checkbox(
                    label="Items",
                    default_value=soda.config[
                        "right"
                    ]["items"],
                    callback=make_setter(
                        "right", "items"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_text(
                    default_value="Credits: 4urxra (Developer)",
                )
                dpg.add_text(
                    default_value=(
                        "https://github.com/Dream23322/"
                        "Soda-Autoclicker/"
                    ),
                )

            # ───────── RECORDER TAB ──────────────────────────
            with dpg.tab(label="Recorder"):
                dpg.add_spacer(width=75)
                dpg.add_text(
                    default_value=(
                        "Records your legit clicking "
                        "pattern to replay.\nClick "
                        "Start, click naturally, then "
                        "Stop.\nLeft click only."
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_checkbox(
                    label="Enabled",
                    default_value=soda.config[
                        "recorder"
                    ]["enabled"],
                    callback=make_setter(
                        "recorder", "enabled"
                    ),
                )
                dpg.add_slider_float(
                    label="Multiplier",
                    default_value=soda.config[
                        "recorder"
                    ]["recordMultiplier"],
                    min_value=0.5,
                    max_value=2.5,
                    callback=make_setter(
                        "recorder", "recordMultiplier"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                with dpg.group(horizontal=True):
                    dpg.add_button(
                        label="Start Recording",
                        callback=start_recording,
                    )
                    dpg.add_button(
                        label="Stop Recording",
                        callback=stop_recording,
                    )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)

                gui_refs["recording_avg"] = dpg.add_text(
                    default_value=(
                        "Average CPS of previous Record: "
                    ),
                )
                record_data = soda.config[
                    "recorder"
                ]["record"]
                total_time = sum(
                    float(t) for t in record_data
                ) or 1
                dpg.set_value(
                    gui_refs["recording_avg"],
                    "Average CPS of previous Record: "
                    f"{round(len(record_data) / total_time, 2)}",
                )
                gui_refs["recording_status"] = (
                    dpg.add_text(
                        default_value="Recording: False",
                    )
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_text(
                    default_value="Credits: 4urxra (Developer)",
                )
                dpg.add_text(
                    default_value=(
                        "https://github.com/Dream23322/"
                        "Soda-Autoclicker/"
                    ),
                )

            # ───────── MISC TAB ──────────────────────────────
            with dpg.tab(label="Misc"):
                dpg.add_spacer(width=75)
                dpg.add_button(
                    label="Discord",
                    callback=lambda: webbrowser.open_new_tab(
                        "https://discord.gg/4ZqBfDFMG4"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_button(
                    label="Destruct",
                    callback=self_destruct,
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                with dpg.group(horizontal=True):
                    btn_hide = dpg.add_button(
                        label="Click to Bind",
                        callback=lambda: start_bind_capture(
                            "HideBind", btn_hide,
                            ["misc", "bindHideGUI"],
                        ),
                    )
                    if soda.config["misc"]["bindHideGUI"]:
                        dpg.set_item_label(
                            btn_hide,
                            "Bind: "
                            f"{chr(soda.config['misc']['bindHideGUI'])}",
                        )
                    dpg.add_text(
                        default_value="Hide GUI",
                    )
                dpg.add_combo(
                    label="Console Faker",
                    default_value=soda.config[
                        "misc"
                    ]["consoleFaker"],
                    items=[
                        "NullBind", "Optimiser",
                        "CustomRGB",
                    ],
                    callback=make_setter(
                        "misc", "consoleFaker"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_checkbox(
                    label="Save Settings",
                    default_value=soda.config[
                        "misc"
                    ]["saveSettings"],
                    callback=make_setter(
                        "misc", "saveSettings"
                    ),
                )
                dpg.add_text(
                    default_value=(
                        "Attempts to save settings on close."
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_checkbox(
                    label="Always On Top",
                    callback=toggle_always_on_top,
                )
                dpg.add_text(
                    default_value="Keeps the GUI on top.",
                )
                dpg.add_spacer(width=75)
                dpg.add_checkbox(
                    label="Discord Rich Presence",
                    default_value=soda.config[
                        "misc"
                    ]["discordRichPresence"],
                    callback=make_setter(
                        "misc", "discordRichPresence"
                    ),
                )
                dpg.add_text(
                    default_value=(
                        "Shows Soda on your Discord status."
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)

                with dpg.group(horizontal=True):
                    dpg.add_text(
                        default_value="Rod Bind:",
                    )
                    btn_rod = dpg.add_button(
                        label="Click to Bind",
                        callback=lambda: start_bind_capture(
                            "RodBind", btn_rod,
                            ["misc", "rodBind"],
                        ),
                    )
                    if soda.config["misc"]["rodBind"]:
                        dpg.set_item_label(
                            btn_rod,
                            f"Bind: {chr(soda.config['misc']['rodBind'])}",
                        )
                dpg.add_text(
                    default_value=(
                        "Press bind to throw a rod."
                    ),
                )
                dpg.add_checkbox(
                    label="Long Rod",
                    default_value=soda.config[
                        "misc"
                    ]["longRod"],
                    callback=make_setter(
                        "misc", "longRod"
                    ),
                )
                dpg.add_text(
                    default_value=(
                        "Doubles rod delay for longer throw."
                    ),
                )
                dpg.add_combo(
                    label="Rod Slot",
                    items=slot_items,
                    default_value=soda.config[
                        "misc"
                    ]["rodSlot"],
                    callback=make_setter(
                        "misc", "rodSlot"
                    ),
                )
                dpg.add_input_float(
                    label="Rod Delay",
                    default_value=soda.config[
                        "misc"
                    ]["rodDelay"],
                    min_value=0, max_value=2,
                    callback=make_setter(
                        "misc", "rodDelay"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)

                with dpg.group(horizontal=True):
                    btn_pearl = dpg.add_button(
                        label="Click to Bind",
                        callback=lambda: start_bind_capture(
                            "PearlBind", btn_pearl,
                            ["misc", "pearlBind"],
                        ),
                    )
                    if soda.config["misc"]["pearlBind"]:
                        dpg.set_item_label(
                            btn_pearl,
                            f"Bind: {chr(soda.config['misc']['pearlBind'])}",
                        )
                    dpg.add_text(
                        default_value=(
                            "Press bind to throw a pearl."
                        ),
                    )
                dpg.add_combo(
                    label="Pearl Slot",
                    items=slot_items,
                    default_value=soda.config[
                        "misc"
                    ]["pearlSlot"],
                    callback=make_setter(
                        "misc", "pearlSlot"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_combo(
                    label="Sword Slot",
                    items=slot_items,
                    default_value=soda.config[
                        "misc"
                    ]["swordSlot"],
                    callback=make_setter(
                        "misc", "swordSlot"
                    ),
                )
                dpg.add_text(
                    default_value=(
                        "Slot to switch back to after "
                        "auto-throwing."
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_combo(
                    label="Theme",
                    items=[
                        "light", "dark", "sakura",
                        "purple", "blue", "lightblue",
                        "orange", "red", "beach_green",
                        "forest_green", "custom",
                    ],
                    default_value=soda.config[
                        "misc"
                    ]["theme"],
                    callback=make_setter(
                        "misc", "theme"
                    ),
                )
                dpg.add_text(
                    default_value=(
                        "Changes theme (Requires Restart!)."
                    ),
                )
                dpg.add_slider_int(
                    label="Red",
                    default_value=soda.config[
                        "misc"
                    ]["red"],
                    min_value=0, max_value=255,
                    callback=make_setter("misc", "red"),
                )
                dpg.add_slider_int(
                    label="Green",
                    default_value=soda.config[
                        "misc"
                    ]["green"],
                    min_value=0, max_value=255,
                    callback=make_setter(
                        "misc", "green"
                    ),
                )
                dpg.add_slider_int(
                    label="Blue",
                    default_value=soda.config[
                        "misc"
                    ]["blue"],
                    min_value=0, max_value=255,
                    callback=make_setter(
                        "misc", "blue"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_checkbox(
                    label="Toggle Sounds",
                    default_value=soda.config[
                        "misc"
                    ]["toggleSounds"],
                    callback=make_setter(
                        "misc", "toggleSounds"
                    ),
                )
                dpg.add_text(
                    default_value="Sound on toggle on/off.",
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                gui_refs["ping_slider"] = (
                    dpg.add_slider_int(
                        label="Ping",
                        default_value=soda.config[
                            "misc"
                        ]["ping"],
                        min_value=1, max_value=1000,
                        callback=make_setter(
                            "misc", "ping"
                        ),
                    )
                )
                dpg.add_text(
                    default_value=(
                        "Ping for autoblocking."
                    ),
                )
                dpg.add_button(
                    label="Auto Ping",
                    callback=auto_ping,
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_text(
                    default_value="Credits: 4urxra (Developer)",
                )
                dpg.add_text(
                    default_value=(
                        "https://github.com/Dream23322/"
                        "Soda-Autoclicker/"
                    ),
                )

            # ───────── POTIONS TAB ───────────────────────────
            with dpg.tab(label="Potions"):
                dpg.add_spacer(width=75)
                dpg.add_text(
                    default_value=(
                        "Tools for potions, includes "
                        "throwbind."
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_checkbox(
                    label="Enable Potions",
                    default_value=soda.config[
                        "potions"
                    ]["enabled"],
                    callback=make_setter(
                        "potions", "enabled"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)

                with dpg.group(horizontal=True):
                    dpg.add_text(
                        default_value="Pot Bind:",
                    )
                    btn_pot = dpg.add_button(
                        label="Click to Bind",
                        callback=lambda: start_bind_capture(
                            "PotBind", btn_pot,
                            ["potions", "potBind"],
                        ),
                    )
                    if soda.config["potions"]["potBind"]:
                        dpg.set_item_label(
                            btn_pot,
                            f"Bind: {chr(soda.config['potions']['potBind'])}",
                        )
                dpg.add_text(
                    default_value="Keybind to throw potion.",
                )
                dpg.add_spacer(width=75)

                with dpg.group(horizontal=True):
                    dpg.add_text(
                        default_value="Pot Reset Bind:",
                    )
                    btn_pot_reset = dpg.add_button(
                        label="Click to Bind",
                        callback=lambda: start_bind_capture(
                            "PotReset", btn_pot_reset,
                            ["potions", "potResetBind"],
                        ),
                    )
                    if soda.config[
                        "potions"
                    ]["potResetBind"]:
                        dpg.set_item_label(
                            btn_pot_reset,
                            "Bind: "
                            f"{chr(soda.config['potions']['potResetBind'])}",
                        )
                dpg.add_text(
                    default_value=(
                        "Resets slot counter to lowest."
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_slider_int(
                    label="Lowest Slot",
                    default_value=soda.config[
                        "potions"
                    ]["lowestSlot"],
                    min_value=1, max_value=9,
                    callback=make_setter(
                        "potions", "lowestSlot"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_slider_int(
                    label="Highest Slot",
                    default_value=soda.config[
                        "potions"
                    ]["highestSlot"],
                    min_value=1, max_value=9,
                    callback=make_setter(
                        "potions", "highestSlot"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_input_float(
                    label="Pot Delay",
                    default_value=soda.config[
                        "potions"
                    ]["throwDelay"],
                    min_value=0, max_value=2,
                    callback=make_setter(
                        "potions", "throwDelay"
                    ),
                )
                dpg.add_text(
                    default_value=(
                        "Delay after switching before "
                        "throwing. Higher = more "
                        "reliable, but slower."
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_text(
                    default_value="Credits: 4urxra (Developer)",
                )
                dpg.add_text(
                    default_value=(
                        "https://github.com/Dream23322/"
                        "Soda-Autoclicker/"
                    ),
                )

            # ───────── MOVEMENT TAB ──────────────────────────
            with dpg.tab(label="Movement"):
                dpg.add_spacer(width=75)
                dpg.add_checkbox(
                    label="Auto W Tap",
                    default_value=soda.config[
                        "movement"
                    ]["autoWTap"],
                    callback=make_setter(
                        "movement", "autoWTap"
                    ),
                )
                dpg.add_text(
                    default_value=(
                        "Auto W-Taps when clicking.\n"
                        "Helps keep combos."
                    ),
                )
                dpg.add_slider_int(
                    label="W Tap Value",
                    default_value=soda.config[
                        "movement"
                    ]["wTapValue"],
                    min_value=1, max_value=100,
                    callback=make_setter(
                        "movement", "wTapValue"
                    ),
                )
                dpg.add_combo(
                    label="W Tap Mode",
                    items=["chance", "delay"],
                    default_value=soda.config[
                        "movement"
                    ]["wTapMode"],
                    callback=make_setter(
                        "movement", "wTapMode"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_checkbox(
                    label="Auto Sprint",
                    default_value=soda.config[
                        "movement"
                    ]["autoSprint"],
                    callback=make_setter(
                        "movement", "autoSprint"
                    ),
                )
                dpg.add_text(
                    default_value=(
                        "Automatically sprints when moving."
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_checkbox(
                    label="Better Input",
                    default_value=soda.config[
                        "movement"
                    ]["betterInput"],
                    callback=make_setter(
                        "movement", "betterInput"
                    ),
                )
                dpg.add_text(
                    default_value=(
                        "SOCD-style input for perfect "
                        "strafing."
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)
                dpg.add_checkbox(
                    label="Fast Stop",
                    default_value=soda.config[
                        "movement"
                    ]["fastStop"],
                    callback=make_setter(
                        "movement", "fastStop"
                    ),
                )
                dpg.add_text(
                    default_value=(
                        "Stops faster on ground. Can be "
                        "weird with Better Input."
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_separator()
                dpg.add_spacer(width=75)

            # ───────── CONFIG MANAGER TAB ────────────────────
            with dpg.tab(label="Config Manager"):
                dpg.add_spacer(width=75)
                dpg.add_text(
                    default_value="Config Manager",
                )
                dpg.add_separator()
                dpg.add_spacer(width=100)
                dpg.add_text(
                    default_value=(
                        "Current Config: "
                        + soda.config["displayName"]
                    ),
                )

                configs = soda.get_configs()
                if not configs:
                    dpg.add_text(
                        default_value="No configs found!",
                    )
                else:
                    dpg.add_text(
                        default_value="Configs found:",
                    )
                    dpg.add_spacer(width=75)
                    dpg.add_separator()
                    dpg.add_spacer(width=75)
                    for preset in configs:
                        with dpg.group():
                            dpg.add_text(
                                default_value=preset[
                                    "displayName"
                                ],
                            )
                            dpg.add_text(
                                default_value=(
                                    f"Author: {preset['Author']}"
                                ),
                            )
                            dpg.add_text(
                                default_value=(
                                    "Description: "
                                    f"{preset['description']}"
                                ),
                            )
                            dpg.add_button(
                                label="Load",
                                callback=soda.load_config,
                                user_data=0,
                            )
                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                dpg.add_spacer(width=75)
                dpg.add_text(
                    default_value=(
                        "Requires restart to apply changes!"
                    ),
                )
                dpg.add_spacer(width=75)
                dpg.add_button(
                    label="Open Config Folder",
                    callback=soda.open_config_folder,
                )
                dpg.add_button(
                    label="Save Config",
                    callback=open_config_editor,
                )

            # ───────── UPDATE TAB (conditional) ──────────────
            if soda.newver:
                with dpg.tab(label="Update"):
                    dpg.add_spacer(width=75)
                    dpg.add_text(
                        default_value=(
                            "A new version of Soda is "
                            "available!"
                        ),
                    )
                    dpg.add_text(
                        default_value=(
                            f"Current version: {VERSION}"
                        ),
                    )
                    dpg.add_text(
                        default_value=(
                            f"Latest version: {soda.newverid}"
                        ),
                    )
                    dpg.add_text(
                        default_value=(
                            "Download from the GitHub repo."
                        ),
                    )
                    dpg.add_button(
                        label="Download",
                        callback=lambda: webbrowser.open(
                            "https://github.com/Dream23322/"
                            "Soda-Autoclicker/releases"
                        ),
                    )

    dpg.bind_theme(global_theme)
    dpg.show_viewport()

    gui_refs["hwnd"] = win32gui.GetForegroundWindow()

    dpg.setup_dearpygui()
    dpg.set_primary_window("Primary Window", True)
    dpg.start_dearpygui()


# ═════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    try:
        if os.name != "nt":
            input(
                "Soda Autoclicker is only supported on "
                "Windows."
            )
            os._exit(0)

        # Hide the console window if launched from cmd
        current_window = win32gui.GetForegroundWindow()
        try:
            pid = (
                win32process
                .GetWindowThreadProcessId(current_window)[
                    -1
                ]
            )
            process_name = psutil.Process(pid).name()
            if (
                process_name == "cmd.exe"
                or process_name in sys.argv[0]
            ):
                win32gui.ShowWindow(
                    current_window, win32con.SW_HIDE,
                )
        except (psutil.NoSuchProcess, IndexError):
            pass

        soda_instance = Soda()
        _build_gui(soda_instance)

    except AttributeError as error:
        print(f"Error with current config: {error}")
        config_path = os.path.join(
            soda_instance.folder_path, "config.json"
        )
        print(f"{config_path} is not a valid config file.")
        if os.path.exists(config_path):
            print("Deleting config.json...")
            os.remove(config_path)
            print(
                "Removed config. Please restart "
                "to generate a new one."
            )
        dpg.destroy_context()

    except KeyboardInterrupt:
        os._exit(0)