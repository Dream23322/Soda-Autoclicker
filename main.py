version = "1.5.3"

try:
    import win32api, win32con, win32gui, win32process, psutil, time, threading, random, winsound, os, json, subprocess, sys, asyncio, itertools, re, keyboard, shutil, urllib, tempfile, webbrowser, math
    import dearpygui.dearpygui as dpg
    from pypresence import Presence
except:
    from os import system
    system("pip install -r requirements.txt")
    import win32api, win32con, win32gui, win32process, psutil, time, threading, random, winsound, os, json, subprocess, sys, asyncio, itertools, re, keyboard, shutil, urllib, tempfile, webbrowser, math
    import dearpygui.dearpygui as dpg
    from pypresence import Presence
refresh = False
class configListener(dict): # Detecting changes to config
    def __init__(self, initialDict):
        global refresh
        for k, v in initialDict.items():
            if isinstance(v, dict):
                initialDict[k] = configListener(v)

        super().__init__(initialDict)

        self.newver = False
        self.newverid = ""

    def __setitem__(self, item, value):
        if isinstance(value, dict):
            _value = configListener(value)
        else:
            _value = value

        super().__setitem__(item, _value)

        try: # Trash way of checking if soda class is initialized
            sodaClass
        except:
            while True:
                try:
                    sodaClass

                    break
                except:
                    time.sleep(0.1)

                    pass

        if sodaClass.config["misc"]["saveSettings"]:
            json.dump(sodaClass.config, open(f"{os.environ['USERPROFILE']}\\soda\\config.json", "w", encoding="utf-8"), indent=4)

class soda():
    def __init__(self):
        self.config = {
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
                "blockHitHold": False,
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
                "items": False
            },
            "recorder": {
                "enabled": False,
                "record": [0.08] # Default 12 CPS
            },
            "overlay": {
                "enabled": False,
                "onlyWhenFocused": True,
                "x": 0,
                "y": 0
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
                "toggleSounds": False,
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
                "wTapMode": "chance",  # "chance" or "delay"
                "wTapValue": 30,
                "autoSprint": False,
            }
        }
        self.current_pot_slot = 0 

        self.newver = False
        self.newverid = ""

        # Check if the Soda Folder exists, if not create it
        self.folder_path = os.path.join(os.environ['USERPROFILE'], 'soda')

        # Only create folder if it doesn't exist
        if not os.path.exists(self.folder_path):
            os.makedirs(self.folder_path, exist_ok=True)
            print("Created Soda Folder in User Profile:", self.folder_path)

        #if not os.path.exists(os.path.join(folder_path, "resource")):
            # Download resource folder from github (https://github.com/Dream23322/Soda-Autoclicker/tree/main/resource)
        try:
            print("====================\nInstalling Configs\n====================")
            time.sleep(1)

            print("Cloning from github")
            if(os.path.exists(os.path.join(self.folder_path, "temp"))):
                print("Temp folder already exists, deleting it")
                shutil.rmtree(os.path.join(self.folder_path, "temp"), ignore_errors=True)
            os.makedirs(os.path.join(self.folder_path, "temp"), exist_ok=True)
            os.makedirs(os.path.join(self.folder_path, "resource"), exist_ok=True)

            # Check if git is installed
            if shutil.which("git") is None:
                print("Downloading Git for Windows...")
                installer_path = os.path.join(tempfile.gettempdir(), "git-installer.exe")
                subprocess.run(["winget", "install", "--id", "Git.Git", "--source", "winget"], check=True)

                print("Installing Git...")
                subprocess.run([installer_path, "/VERYSILENT", "/NORESTART"], check=True)
                print("Git installation finished.")


            subprocess.run(["git", "clone", "https://github.com/Dream23322/Soda-Autoclicker.git", os.path.join(self.folder_path, "temp")], check=True)
            print("Cloned from github")

            print("Moving resource folder")
            subprocess.run(["copy", "/V", os.path.join(self.folder_path, "temp", "resource", "*"), os.path.join(self.folder_path, "resource")], shell=True, check=True)
            print("Moved resource folder")

            subprocess.run(["del", "/Q", "/F", "/S", os.path.join(self.folder_path, "temp")], shell=True, check=True)
            shutil.rmtree(os.path.join(self.folder_path, "temp"), ignore_errors=True)

            # Download toggle sounds
            sound_urls = ["https://yiffing.zone/sounds/notify_on.wav", "https://yiffing.zone/sounds/notify_off.wav"]

            for url in sound_urls:
                file_name = os.path.basename(url)
                file_path = os.path.join(self.folder_path, "resource", file_name)
                if not os.path.exists(file_path):
                    print(f"Downloading {file_name}...")
                    subprocess.run(["curl", "-L", url, "-o", file_path], check=True)
            print("Downloaded toggle sounds")

            print("Installed")
            print("Checking for updates...")
            if os.path.isfile(os.path.join(self.folder_path, "resource", "update.txt")):
                with open(os.path.join(self.folder_path, "resource", "update.txt"), "r") as f:
                    update_info = f.read().strip()
                    if update_info != version:
                        print(f"New version available: {update_info} (Current: {version})")
                        self.newver = True
                        self.newverid = update_info


        except subprocess.CalledProcessError as e:
            print("Failed to clone resource folder from github:", e)

        # Load config if the file exists
        file_path = os.path.join(self.folder_path, "config.json")
        if os.path.isfile(file_path):
            try:
                with open(file_path, encoding="utf-8") as f:
                    config = json.load(f)
                print("Loaded config from:", file_path)
                isConfigOk = True
                for key in self.config:
                    if key not in config or len(self.config[key]) != len(config[key]):
                        isConfigOk = False

                        break

                if isConfigOk:
                    if not config["misc"]["saveSettings"]:
                        self.config["misc"]["saveSettings"] = False
                    else:
                        self.config = config
            except Exception as e:
                print("Error loading config:", e)
                print("Using default config")

        configs = []
        clickSounds = []
        self.config = configListener(self.config)

        self.record = itertools.cycle(self.config["recorder"]["record"])

        threading.Thread(target=self.discordRichPresence, daemon=True).start()
        
        threading.Thread(target=self.windowListener, daemon=True).start()
        threading.Thread(target=self.leftBindListener, daemon=True).start()
        threading.Thread(target=self.rightBindListener, daemon=True).start()
        threading.Thread(target=self.hideGUIBindListener, daemon=True).start()
        threading.Thread(target=self.bindListener, daemon=True).start()

        threading.Thread(target=self.wTapListener, daemon=True).start()
        threading.Thread(target=self.autoSprint, daemon=True).start()

        threading.Thread(target=self.leftClicker, daemon=True).start()
        threading.Thread(target=self.rightClicker, daemon=True).start()

    def discordRichPresence(self):
        asyncio.set_event_loop(asyncio.new_event_loop())
        try:
            discordRPC = Presence("1400790093312032808")
            discordRPC.connect()

            startTime = time.time()

            states = [
                "V1.5?",
                "Get shit on <3",
                "Clicks sponsored by 4urxra",
                "Quick Paws",
                "Simply Aura",
                "I'm gonna steal ur street sign :3",
                "I could use this for advertising 🤔",
                "Click click click",
                ":3",
                "Soda Pop <3",
                "Download today!"
            ]

            while True:
                if self.config["misc"]["discordRichPresence"]:
                    discordRPC.update(state=random.choice(states), start=startTime, large_image="logo", large_text="I'm him, ur not", buttons=[{"label": "Website", "url": "https://github.com/Dream23322/Soda-Autoclicker/"}])
                else:
                    discordRPC.clear()

                time.sleep(15)
        except:
            print("Discord not found running or installed")
            return

    def windowListener(self):
        while True:
            currentWindow = win32gui.GetForegroundWindow()
            self.realTitle = win32gui.GetWindowText(currentWindow)
            self.window = win32gui.FindWindow("LWJGL", None)

            try:
                self.focusedProcess = psutil.Process(win32process.GetWindowThreadProcessId(currentWindow)[-1]).name()
            except:
                self.focusedProcess = ""

            time.sleep(0.5)

    def click(self):
        winsound.PlaySound(os.path.join(self.folder_path, self.config["left"]["soundPath"]), winsound.SND_ASYNC)

    def toggleSound(self, key):
        if self.config["misc"]["toggleSounds"]:
            if self.config[key]["enabled"]:
                winsound.PlaySound(os.path.join(self.folder_path, "resource", "notify_on.wav"), winsound.SND_ASYNC)
            else:
                winsound.PlaySound(os.path.join(self.folder_path, "resource", "notify_off.wav"), winsound.SND_ASYNC)

    def leftClicker(self):
        while True:
            if not self.config["recorder"]["enabled"]:
                if self.config["left"]["blatant"]:
                    delay = 1 / self.config["left"]["averageCPS"]
                else:
                    delay = random.random() % (2 / self.config["left"]["averageCPS"])
            else:
                delay = float(next(self.record))

            if self.config["left"]["enabled"]:
                if self.config["left"]["mode"] == "Hold" and not win32api.GetAsyncKeyState(0x01) < 0:
                    time.sleep(delay)

                    continue
            
                if self.config["left"]["RMBLock"]:
                    if win32api.GetAsyncKeyState(0x02) < 0:
                        time.sleep(delay)

                        continue

                if self.config["left"]["onlyWhenFocused"]:
                    if not "java" in self.focusedProcess and not "AZ-Launcher" in self.focusedProcess:
                        time.sleep(delay)

                        continue

                    if not self.config["left"]["workInMenus"]:
                        cursorInfo = win32gui.GetCursorInfo()[1]
                        if cursorInfo > 50000 and cursorInfo < 100000:
                            time.sleep(delay)

                            continue

                if self.config["left"]["onlyWhenFocused"]:
                    threading.Thread(target=self.leftClick, args=(True,), daemon=True).start()
                else:
                    threading.Thread(target=self.leftClick, args=(None,), daemon=True).start()

            time.sleep(delay)
    def doRod(self, val):
        # Switch to the rod slot
        char_to_vk = {
            '0': 0x30,
            '1': 0x31,
            '2': 0x32,
            '3': 0x33,
            '4': 0x34,
            '5': 0x35,
            '6': 0x36,
            '7': 0x37,
            '8': 0x38,
            '9': 0x39,
        }
        # Use rodSlot to get the slot number
        VK_2 = char_to_vk.get(self.config["misc"]["rodSlot"], None)

        # Press the '2' key
        win32api.keybd_event(VK_2, 0, 0, 0)
        time.sleep(round(float(self.config["misc"]["rodDelay"]) / 10, 3))  # Brief pause to simulate a key press
        # Release the '2' key
        win32api.keybd_event(VK_2, 0, win32con.KEYEVENTF_KEYUP, 0)
        # Send Rod by right clicking
        win32api.SendMessage(self.window, win32con.WM_RBUTTONDOWN, 0, 0)
        time.sleep(0.02)
        win32api.SendMessage(self.window, win32con.WM_RBUTTONUP, 0, 0)
        dly = float(self.config["misc"]["rodDelay"]) * 2 if val and self.config["misc"]["longRod"] else float(self.config["misc"]["rodDelay"])
        # dly = 0
        # if (val and self.config["misc"]["longRod"]):
        #     dly = float(self.config["misc"]["rodDelay"]) * 2
        # else:
        #     dly = float(self.config["misc"]["rodDelay"])
        time.sleep(dly)  # Brief pause to simulate a key press
        # Switch back to slot 1
        VK_2 = 0x31

        # Press the '2' key
        win32api.keybd_event(VK_2, 0, 0, 0)
        time.sleep(float(self.config["misc"]["rodDelay"]) / 10)  # Brief pause to simulate a key press
        # Release the '2' key
        win32api.keybd_event(VK_2, 0, win32con.KEYEVENTF_KEYUP, 0)

    def doPotion(self):
        if(self.config["potions"]["lowestSlot"] > self.current_pot_slot):
            self.current_pot_slot = self.config["potions"]["lowestSlot"]
        else:
            if(self.current_pot_slot <= self.config["potions"]["highestSlot"]):
                
                # Switch to the potion slot
                char_to_vk = {
                    '0': 0x30,
                    '1': 0x31,
                    '2': 0x32,
                    '3': 0x33,
                    '4': 0x34,
                    '5': 0x35,
                    '6': 0x36,
                    '7': 0x37,
                    '8': 0x38,
                    '9': 0x39,
                }
                VK_TO_SLOT = char_to_vk.get(str(self.current_pot_slot), None)

                # Press the slot key
                win32api.keybd_event(VK_TO_SLOT, 0, 0, 0)
                time.sleep(int(self.config["potions"]["throwDelay"]))

                win32api.keybd_event(VK_TO_SLOT, 0, win32con.KEYEVENTF_KEYUP, 0)
                # Send Rod by right clicking
                win32api.mouse_event(win32con.MOUSEEVENTF_RIGHTDOWN, 0, 0)
                time.sleep(0.02)
                win32api.mouse_event(win32con.MOUSEEVENTF_RIGHTUP, 0, 0)
                time.sleep(0.6)

                win32api.keybd_event(char_to_vk.get(self.config["misc"]["swordSlot"]), 0, 0, 0)
                self.current_pot_slot += 1



            else:
                print("No Potions Left!")

    def clickLeft(self):
        if self.config["left"]["breakBlocks"] == "Shift With Click" and win32api.GetAsyncKeyState(0x10) < 0:
            win32api.SendMessage(self.window, win32con.WM_LBUTTONDOWN, 0, 0)
            time.sleep(0.02)
            return;
        if self.config["left"]["breakBlocks"] == "Shift No Click" and win32api.GetAsyncKeyState(0x10) < 0:

            return;
        if self.config["left"]["breakBlocks"] == "Full":
            win32api.SendMessage(self.window, win32con.WM_LBUTTONDOWN, 0, 0)
            time.sleep(0.02)
            return;
        win32api.SendMessage(self.window, win32con.WM_LBUTTONDOWN, 0, 0)
        time.sleep(0.02)
        win32api.SendMessage(self.window, win32con.WM_LBUTTONUP, 0, 0)

    def blockHit(self):
        if self.config["left"]["blockHit"] and win32api.GetAsyncKeyState(0x01) < 0:
            # If blockHitHold is enabled, only blockhit while RMB is held down
            if self.config["left"]["blockHitHold"]:
                blockHitCondition = win32api.GetAsyncKeyState(0x02) < 0
            else:
                blockHitCondition = not win32api.GetAsyncKeyState(0x02) < 0

            if blockHitCondition:
                if random.uniform(0, 1) <= self.config["left"]["blockHitChance"] / 100.0:
                    win32api.mouse_event(win32con.MOUSEEVENTF_RIGHTDOWN, 0, 0)
                    time.sleep(0.02)
                    if(not self.config["left"]["blockHitHold"]):
                        win32api.mouse_event(win32con.MOUSEEVENTF_RIGHTUP, 0, 0)

    def leftClick(self, focused):
        if focused != None:
            self.clickLeft()
            self.blockHit()
            # if self.config["left"]["blockHit"] or (self.config["left"]["blockHit"] and self.config["right"]["enabled"] and self.config["right"]["LMBLock"] and not win32api.GetAsyncKeyState(0x02) < 0):
            #     if random.uniform(0, 1) <= self.config["left"]["blockHitChance"] / 100.0:
            #         win32api.SendMessage(self.window, win32con.WM_RBUTTONDOWN, 0, 0)
            #         time.sleep(0.02)
            #         win32api.SendMessage(self.window, win32con.WM_RBUTTONUP, 0, 0)     

            if self.config["left"]["AutoRod"] or (self.config["left"]["AutoRod"] and self.config["right"]["enabled"] and self.config["right"]["RMBLock"] and not win32api.GetAsyncKeyState(0x01) < 0):
                if random.uniform(0, 1) <= self.config["left"]["AutoRodChance"] / 100.0:
                    self.doRod(False)
        else:
            self.clickLeft()

            self.blockhit()

            if self.config["left"]["AutoRod"] or (self.config["left"]["AutoRod"] and self.config["right"]["enabled"] and self.config["right"]["RMBLock"] and not win32api.GetAsyncKeyState(0x01) < 0):
                if random.uniform(0, 1) <= self.config["left"]["AutoRodChance"] / 100.0:
                    self.doRod(False)

        if self.config["left"]["soundPath"] != "" and os.path.isfile(os.path.join(self.folder_path, self.config["left"]["soundPath"])):
            threading.Thread(target=self.click, args=(), daemon=True).start()

        if self.config["left"]["shakeEffect"]:
            currentPos = win32api.GetCursorPos()
            direction = random.randint(0, 3)
            pixels = random.randint(-self.config["left"]["shakeEffectForce"], self.config["left"]["shakeEffectForce"])

            if direction == 0:
                win32api.SetCursorPos((currentPos[0] + pixels, currentPos[1] - pixels))
            elif direction == 1:
                win32api.SetCursorPos((currentPos[0] - pixels, currentPos[1] + pixels))
            elif direction == 2:
                win32api.SetCursorPos((currentPos[0] + pixels, currentPos[1] + pixels))
            elif direction == 3:
                win32api.SetCursorPos((currentPos[0] - pixels, currentPos[1] - pixels))

    def leftBindListener(self):
        while True:
            if win32api.GetAsyncKeyState(self.config["left"]["bind"]) != 0:
                if not self.isFocused("left", "onlyWhenFocused", "workInMenus"):
                    time.sleep(0.001)
                    continue

                self.config["left"]["enabled"] = not self.config["left"]["enabled"]

                self.toggleSound('left')

                while True:
                    try:
                        dpg.set_value(checkboxToggleLeftClicker, not dpg.get_value(checkboxToggleLeftClicker))

                        break
                    except:
                        time.sleep(0.1)

                        pass

                while win32api.GetAsyncKeyState(self.config["left"]["bind"]) != 0:
                    time.sleep(0.001)

            time.sleep(0.001)

    def rightClicker(self):
        while True:
            if self.config["right"]["blatant"]:
                delay = 1 / self.config["right"]["averageCPS"]
            else:
                delay = random.random() % (2 / self.config["right"]["averageCPS"])

            if self.config["right"]["enabled"]:
                if self.config["right"]["mode"] == "Hold" and not win32api.GetAsyncKeyState(0x02) < 0:
                    time.sleep(delay)

                    continue

                if self.config["right"]["LMBLock"]:
                    if win32api.GetAsyncKeyState(0x01) < 0:
                        time.sleep(delay)

                        continue

                if self.config["right"]["onlyWhenFocused"]:
                    if not "java" in self.focusedProcess and not "AZ-Launcher" in self.focusedProcess:
                        time.sleep(delay)

                        continue
            
                    if not self.config["right"]["workInMenus"]:
                        cursorInfo = win32gui.GetCursorInfo()[1]
                        if cursorInfo > 50000 and cursorInfo < 100000:
                            time.sleep(delay)

                            continue

                if self.config["right"]["onlyWhenFocused"]:
                    threading.Thread(target=self.rightClick, args=(True,), daemon=True).start()
                else:
                    threading.Thread(target=self.rightClick, args=(None,), daemon=True).start()

            time.sleep(delay)
    def doPearl(self):
        # Switch to the rod slot
        char_to_vk = {
            '0': 0x30,
            '1': 0x31,
            '2': 0x32,
            '3': 0x33,
            '4': 0x34,
            '5': 0x35,
            '6': 0x36,
            '7': 0x37,
            '8': 0x38,
            '9': 0x39,
        }
        # Use rodSlot to get the slot number
        VK_2 = char_to_vk.get(self.config["misc"]["pearlSlot"], None)
        # Press the '2' key
        win32api.keybd_event(VK_2, 0, 0, 0)
        time.sleep(0.06)  # Brief pause to simulate a key press
        # Release the '2' key
        win32api.keybd_event(VK_2, 0, win32con.KEYEVENTF_KEYUP, 0)
        # Send Rod by right clicking
        win32api.SendMessage(self.window, win32con.WM_RBUTTONDOWN, 0, 0)
        time.sleep(0.02)
        win32api.SendMessage(self.window, win32con.WM_RBUTTONUP, 0, 0)
        # Switch back to slot 1
        VK_2 = char_to_vk.get(self.config["misc"]["swordSlot"], None)
        # Press the '2' key
        win32api.keybd_event(VK_2, 0, 0, 0)
        time.sleep(0.8)
        # Release the '2' key
        win32api.keybd_event(VK_2, 0, win32con.KEYEVENTF_KEYUP, 0)        
    def rightClick(self, focused):
        if focused != None:
            win32api.SendMessage(self.window, win32con.WM_RBUTTONDOWN, 0, 0)
            if not self.config["right"]["items"]:
                time.sleep(0.02)
                win32api.SendMessage(self.window, win32con.WM_RBUTTONUP, 0, 0)
        else:
            win32api.mouse_event(win32con.MOUSEEVENTF_RIGHTDOWN, 0, 0)
            if not self.config["right"]["items"]:
                time.sleep(0.02)
                win32api.mouse_event(win32con.MOUSEEVENTF_RIGHTUP, 0, 0)

        if self.config["right"]["soundPath"] != "" and os.path.isfile(os.path.join(self.config["left"]["soundPath"])):
            threading.Thread(target=self.click, args=(), daemon=True).start()

        if self.config["right"]["shakeEffect"]:
            currentPos = win32api.GetCursorPos()
            direction = random.randint(0, 3)
            pixels = random.randint(-self.config["right"]["shakeEffectForce"], self.config["right"]["shakeEffectForce"])

            if direction == 0:
                win32api.SetCursorPos((currentPos[0] + pixels, currentPos[1] - pixels))
            elif direction == 1:
                win32api.SetCursorPos((currentPos[0] - pixels, currentPos[1] + pixels))
            elif direction == 2:
                win32api.SetCursorPos((currentPos[0] + pixels, currentPos[1] + pixels))
            elif direction == 3:
                win32api.SetCursorPos((currentPos[0] - pixels, currentPos[1] - pixels))

    def rightBindListener(self):
        while True:
            if win32api.GetAsyncKeyState(self.config["right"]["bind"]) != 0:
                if not self.isFocused("right", "onlyWhenFocused", "workInMenus"):
                    time.sleep(0.001)

                self.config["right"]["enabled"] = not self.config["right"]["enabled"]

                self.toggleSound('right')

                while True:
                    try:
                        dpg.set_value(checkboxToggleRightClicker, not dpg.get_value(checkboxToggleRightClicker))

                        break
                    except:
                        time.sleep(0.1)

                        pass

                while win32api.GetAsyncKeyState(self.config["right"]["bind"]) != 0:
                    time.sleep(0.001)

            time.sleep(0.001)

                
    def isFocused(self, config1: str, config2: str, config3: str):
        return ("java" in self.focusedProcess or "AZ-Launcher" in self.focusedProcess or not self.config[config1][config2]) and (self.config[config1][config3] or win32gui.GetCursorInfo()[1] > 200000)
    def bindListener(self):
        while True:
            if win32api.GetAsyncKeyState(self.config["misc"]["rodBind"]) != 0 and self.isFocused("left", "onlyWhenFocused", "workInMenus"):
                self.doRod(True)
            elif win32api.GetAsyncKeyState(self.config["misc"]["pearlBind"]) != 0 and self.isFocused("left", "onlyWhenFocused", "workInMenus"):
                self.doPearl()
            elif win32api.GetAsyncKeyState(self.config["potions"]["potBind"]) != 0 and self.isFocused("left", "onlyWhenFocused", "workInMenus"):
                self.doPotion()
                time.sleep(0.5)

            elif win32api.GetAsyncKeyState(self.config["potions"]["potResetBind"]) != 0:
                self.current_pot_slot = int(self.config["potions"]["lowestSlot"])

            time.sleep(0.001)
            
    def hideGUIBindListener(self):
        while True:
            if win32api.GetAsyncKeyState(self.config["misc"]["bindHideGUI"]) != 0:
                self.config["misc"]["guiHidden"] = not self.config["misc"]["guiHidden"]
                if(self.config["misc"]["consoleFaker"] == "NullBind"):
                    print("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nNullBind - Rampage 1.0.4 Beta\n\n\n\n\n\n")
                elif(self.config["misc"]["consoleFaker"] == "Optimiser"):
                    print("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nEntropy Optimiser - Eagle 1.0.4 Beta\n\n\n\n\n\n")
                else:
                    print("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nBetterRGB - Hawk 1.0.4 Beta\n\n\n\n\n\n")
                if not self.config["misc"]["guiHidden"]:
                    win32gui.ShowWindow(guiWindows, win32con.SW_SHOW)
                else:
                    win32gui.ShowWindow(guiWindows, win32con.SW_HIDE)

                while win32api.GetAsyncKeyState(self.config["misc"]["bindHideGUI"]) != 0:
                    time.sleep(0.001)

            time.sleep(0.001)

    def wTapListener(self):
        lastMouseX = 0
        lastMouseY = 0
        while True:
            time.sleep(0.01)
            
            if not self.isFocused("left", "onlyWhenFocused", "workInMenus") or not win32api.GetAsyncKeyState(0x1) < 0 or not self.config["movement"]["autoWTap"]:
                time.sleep(0.5)
                continue

            validStrafe = (win32api.GetAsyncKeyState(0x41) < 0 or win32api.GetAsyncKeyState(0x44) < 0) and win32api.GetAsyncKeyState(0x57) < 0
            validAim = (win32api.GetCursorPos()[0] != lastMouseX or win32api.GetCursorPos()[1] != lastMouseY)

            if validStrafe and validAim and (random.uniform(0, 1) <= self.config["movement"]["wTapValue"] / 100.0 and self.config["movement"]["wTapMode"] == "chance" or self.config["movement"]["wTapMode"] == "delay"):
                win32api.keybd_event(0x57, 0, win32con.KEYEVENTF_KEYUP, 0)
                time.sleep(0.05)
                win32api.keybd_event(0x57, 0, 0, 0)
                if(self.config["movement"]["wTapMode"] == "delay"):
                    time.sleep(self.config["movement"]["wTapValue"] / 100.0)
                
                

            lastMouseX, lastMouseY = win32api.GetCursorPos()
                
    def autoSprint(self):
        while True:
            if not self.isFocused("left", "onlyWhenFocused", "workInMenus") or not self.config["movement"]["autoSprint"]:
                time.sleep(0.5)
                continue
            time.sleep(0.01)
            # Sprint using left ctrl key
            if self.config["movement"]["autoSprint"] and (win32api.GetAsyncKeyState(0x57) < 0 or win32api.GetAsyncKeyState(0x41) < 0 or win32api.GetAsyncKeyState(0x44) < 0) and self.isFocused("left", "onlyWhenFocused", "workInMenus"):
                if not win32api.GetAsyncKeyState(0x11) < 0:  # Check if left ctrl is not pressed
                    win32api.keybd_event(0x11, 0, 0, 0)  # Press left ctrl
            else:
                if win32api.GetAsyncKeyState(0x11) < 0:  # Check if left ctrl is pressed
                    win32api.keybd_event(0x11, 0, win32con.KEYEVENTF_KEYUP, 0)  # Release left ctrl


    def getConfigs(self):
        configs = []
        folder = os.path.join(os.environ['USERPROFILE'], 'soda', 'resource')

        print("All files:", os.listdir(folder))

        for file in os.listdir(folder):
            file_path = os.path.join(folder, file)

            if not file.endswith(".json"):
                continue

            try:
                with open(file_path, encoding="utf-8") as f:
                    config = json.load(f)
                config["filename"] = os.path.splitext(file)[0]  # add filename for loading
                configs.append(config)
                print("Loaded config:", file)
            except Exception as e:
                print(f"⚠️ Failed to load {file}: {e}")
        self.configs = configs
        return configs
    
    def loadConfig(self, configID: int):
        print("Config Amount", len(self.configs), "\nConfig ID", configID)
        cid = 0
        if configID != 255:
            cid = int((configID - 255) / 8)
        print("Config ID", cid)
        config = self.configs[cid]
        print(f"Applying Config: {config['filename']}")
        file_path = os.path.join(os.environ['USERPROFILE'], 'soda', 'resource', f"{config['filename']}.json")
        if os.path.isfile(file_path):
            try:
                with open(file_path, encoding="utf-8") as f:
                    config = json.load(f)
                    self.config = config
                print("Loaded config from:", file_path)
                print("Config:")
                print(self.config)
                isConfigOk = True
                json.dump(self.config, open(f"{os.environ['USERPROFILE']}\\soda\\config.json", "w", encoding="utf-8"), indent=4)
                
            except Exception as e:
                print(f"Failed to load config from {file_path}: {e}")
                isConfigOk = False

    def getClickSounds(self):
        clickSounds = []
        clickSounds.append("None")
        folder = os.path.join(os.environ['USERPROFILE'], 'soda', 'resource')

        print("All files:", os.listdir(folder))

        for file in os.listdir(folder):
            file_path = os.path.join(folder, file)

            if not file.endswith(".wav") or file == "notify_on.wav":
                continue
            clickSounds.append(file)
            #print("Loaded " + file.title)
        self.clickSounds = clickSounds
        return clickSounds

    def openConfigFolder(self):
        folder_path = os.path.join(os.environ['USERPROFILE'], 'soda', 'resource')
        if os.path.exists(folder_path):
            try:
                os.startfile(folder_path)
                print("Opened config folder:", folder_path)
            except Exception as e:
                print(f"Failed to open config folder: {e}")
        else:
            print("Config folder does not exist:", folder_path)

if __name__ == "__main__":
    try:
        if os.name != "nt":
            input("Soda Autoclicker is only working on Windows.")
            os._exit(0)

        (suppost_sid, error) = subprocess.Popen("wmic useraccount where name='%username%' get sid", stdout=subprocess.PIPE, shell=True).communicate()

        currentWindow = win32gui.GetForegroundWindow()
        processName = psutil.Process(win32process.GetWindowThreadProcessId(currentWindow)[-1]).name()
        if processName == "cmd.exe" or processName in sys.argv[0]:
            win32gui.ShowWindow(currentWindow, win32con.SW_HIDE)

        sodaClass = soda()
        dpg.create_context()

        def toggleLeftClicker(id: int, value: bool):
            sodaClass.config["left"]["enabled"] = value

        waitingForKeyLeft = False
        def statusBindLeftClicker(id: int):
            global waitingForKeyLeft

            if not waitingForKeyLeft:
                with dpg.handler_registry(tag="Left Bind Handler"):
                    dpg.add_key_press_handler(callback=setBindLeftClicker)

                dpg.set_item_label(buttonBindLeftClicker, "...")

                waitingForKeyLeft = True

        def setBindLeftClicker(id: int, value: str):
            global waitingForKeyLeft
            if waitingForKeyLeft:
                key = keyboard.read_event(suppress=True).name  # Get actual key name
                virtual_key = ord(key.upper())  # Convert to virtual key code
                sodaClass.config["left"]["bind"] = virtual_key
                dpg.set_item_label(buttonBindLeftClicker, f"Bind: {key.upper()}")
                dpg.delete_item("Left Bind Handler")
                waitingForKeyLeft = False

        def setLeftMode(id: int, value: str):
            sodaClass.config["left"]["mode"] = value

        def setLeftAverageCPS(id: int, value: int):
            sodaClass.config["left"]["averageCPS"] = value

        def toggleLeftOnlyWhenFocused(id: int, value:bool):
            sodaClass.config["left"]["onlyWhenFocused"] = value

        def setLeftBreakBlocks(id: int, value: str):
            sodaClass.config["left"]["breakBlocks"] = value

        def toggleLeftRMBLock(id: int, value: bool):
            sodaClass.config["left"]["RMBLock"] = value

        def toggleLeftBlockHit(id: int, value: bool):
            sodaClass.config["left"]["blockHit"] = value

        def setLeftBlockHitChance(id: int, value: int):
            sodaClass.config["left"]["blockHitChance"] = value

        def toggleLeftBlockHitHold(id: int, value: bool):
            sodaClass.config["left"]["blockHitHold"] = value

        def toggleLeftShakeEffect(id: int, value: bool):
            sodaClass.config["left"]["shakeEffect"] = value

        def setLeftShakeEffectForce(id: int, value: int):
            sodaClass.config["left"]["shakeEffectForce"] = value

        def setLeftClickSoundPath(id: int, value: str):
            sodaClass.config["left"]["soundPath"] = "resource\\" + value

        def toggleLeftWorkInMenus(id: int, value: bool):
            sodaClass.config["left"]["workInMenus"] = value

        def toggleLeftBlatantMode(id: int, value: bool):
            sodaClass.config["left"]["blatant"] = value

        def toggleRightClicker(id: int, value: bool):
            sodaClass.config["right"]["enabled"] = value

        def toggleLeftAutoRod(id: int, value: bool):
            sodaClass.config["left"]["AutoRod"] = value

        def setLeftAutoRodChance(id: int, value: int):
            sodaClass.config["left"]["AutoRodChance"] = value

        def toggleWTap(id: int, value: bool):
            sodaClass.config["movement"]["autoWTap"] = value

        def setWTapValue(id: int, value: int):
            sodaClass.config["movement"]["wTapValue"] = value

        def setWTapMode(id: int, value: str):
            sodaClass.config["movement"]["wTapMode"] = value

        
        def setToggleSounds(id: int, value: bool):
            sodaClass.config["misc"]["toggleSounds"] = value

        def toggleAutoSprint(id: int, value: bool):
            sodaClass.config["movement"]["autoSprint"] = value
        waitingForKeyRight = False
        def statusBindRightClicker(id: int):
            global waitingForKeyRight

            if not waitingForKeyRight:
                with dpg.handler_registry(tag="Right Bind Handler"):
                    dpg.add_key_press_handler(callback=setBindRightClicker)

                dpg.set_item_label(buttonBindRightClicker, "...")

                waitingForKeyRight = True

        def setBindRightClicker(id: int, value: str):
            global waitingForKeyRight
            if waitingForKeyRight:
                key = keyboard.read_event(suppress=True).name
                virtual_key = ord(key.upper())
                sodaClass.config["right"]["bind"] = virtual_key
                dpg.set_item_label(buttonBindRightClicker, f"Bind: {key.upper()}")
                dpg.delete_item("Right Bind Handler")
                waitingForKeyRight = False
        def statusBindRod(id: int):
            global waitingForKeyRight

            if not waitingForKeyRight:
                with dpg.handler_registry(tag="Rod Bind Handler"):
                    dpg.add_key_press_handler(callback=setBindRod)

                dpg.set_item_label(buttonBindRodKey, "...")

                waitingForKeyRight = True

        def setBindRod(id: int, value: str):
            global waitingForKeyRight
            if waitingForKeyRight:
                key = keyboard.read_event(suppress=True).name
                virtual_key = ord(key.upper())
                sodaClass.config["misc"]["rodBind"] = virtual_key
                dpg.set_item_label(buttonBindRodKey, f"Bind: {key.upper()}")
                dpg.delete_item("Rod Bind Handler")
                waitingForKeyRight = False

        def statusBindPearl(id: int):
            global waitingForKeyRight
            if not waitingForKeyRight:
                with dpg.handler_registry(tag="Pearl Bind Handler"):
                    dpg.add_key_press_handler(callback=setBindPearl)

                dpg.set_item_label(buttonBindPearlKey, "...")

                waitingForKeyRight = True
        
        def setBindPearl(id: int, value: str):
            global waitingForKeyRight
            if waitingForKeyRight:
                key = keyboard.read_event(suppress=True).name
                virtual_key = ord(key.upper())
                sodaClass.config["misc"]["pearlBind"] = virtual_key
                dpg.set_item_label(buttonBindPearlKey, f"Bind: {key.upper()}")
                dpg.delete_item("Pearl Bind Handler")
                waitingForKeyRight = False

        def statusBindPot(id: int):
            global waitingForKeyRight
            if not waitingForKeyRight:
                with dpg.handler_registry(tag="Pot Bind Handler"):
                    dpg.add_key_press_handler(callback=setBindPot)

                dpg.set_item_label(buttonBindPotKey, "...")

                waitingForKeyRight = True
        
        def setBindPot(id: int, value: str):
            global waitingForKeyRight
            if waitingForKeyRight:
                key = keyboard.read_event(suppress=True).name
                virtual_key = ord(key.upper())
                sodaClass.config["potions"]["potBind"] = virtual_key
                dpg.set_item_label(buttonBindPotKey, f"Bind: {key.upper()}")
                dpg.delete_item("Pot Bind Handler")
                waitingForKeyRight = False

        def statusBindPotReset(id: int):
            global waitingForKeyRight
            if not waitingForKeyRight:
                with dpg.handler_registry(tag="Pot Reset Bind Handler"):
                    dpg.add_key_press_handler(callback=setBindPotReset)

                dpg.set_item_label(buttonBindPotResetKey, "...")

                waitingForKeyRight = True

        def setBindPotReset(id: int, value: str):
            global waitingForKeyRight
            if waitingForKeyRight:
                key = keyboard.read_event(suppress=True).name
                virtual_key = ord(key.upper())
                sodaClass.config["potions"]["potResetBind"] = virtual_key
                dpg.set_item_label(buttonBindPotResetKey, f"Bind: {key.upper()}")
                dpg.delete_item("Pot Reset Bind Handler")
                waitingForKeyRight = False
        def setRodSlot(id: int, value: str):
            sodaClass.config["misc"]["rodSlot"] = value
        def setSwordSlot(id: int, value: str):
            sodaClass.config["misc"]["swordSlot"] = value
        def setPearlSlot(id: int, value: str):
            sodaClass.config["misc"]["pearlSlot"] = value
        def setRightMode(id: int, value: str):
            sodaClass.config["right"]["mode"] = value
        def setPotDelay(id: int, value: float):
            sodaClass.config["potions"]["throwDelay"] = value
        def setRightAverageCPS(id: int, value: int):
            sodaClass.config["right"]["averageCPS"] = value
        def toggleRightOnlyWhenFocused(id: int, value: int):
            sodaClass.config["right"]["onlyWhenFocused"] = True

        def toggleRightLMBLock(id: int, value: bool):
            sodaClass.config["right"]["LMBLock"] = value

        def toggleRightShakeEffect(id: int, value: bool):
            sodaClass.config["right"]["shakeEffect"] = value

        def setRightShakeEffectForce(id: int, value: int):
            sodaClass.config["right"]["shakeEffectForce"] = value

        def setRightClickSoundPath(id: int, value: str):
            sodaClass.config["right"]["soundPath"] = "resource\\" + value

        def toggleRightWorkInMenus(id: int, value: bool):
            sodaClass.config["right"]["workInMenus"] = value

        def toggleRightBlatantMode(id: int, value: bool):
            sodaClass.config["right"]["blatant"] = value

        def toggleRightItems(id: int, value: bool):
            sodaClass.config["right"]["items"] = value

        def toggleRecorder(id: int, value: bool):
            sodaClass.config["recorder"]["enabled"] = value

        recording = False
        def recorder():
            global recording

            recording = True
            dpg.set_value(recordingStatusText, f"Recording: True")

            recorded = []
            start = 0

            while True:
                if not recording:
                    if len(recorded) < 2: # Avoid saving a record with 0 click
                        recorded[0] = 0.08
                    else:
                        recorded[0] = 0 # No delay for the first click

                        del recorded[-1] # Deleting last record time because that's when you click on stop button and it can take some time

                    sodaClass.config["recorder"]["record"] = recorded

                    sodaClass.record = itertools.cycle(recorded)

                    totalTime = 0
                    for clickTime in recorded:
                        totalTime += float(clickTime)

                    dpg.set_value(averageRecordCPSText, f"Average CPS of previous Record: {round(len(recorded) / totalTime, 2)}")

                    break

                if win32api.GetAsyncKeyState(0x01) < 0:
                    recorded.append(time.time() - start)

                    dpg.set_value(recordingStatusText, f"Recording: True - Recorded clicks: {len(recorded)}")

                    start = time.time()

                    while win32api.GetAsyncKeyState(0x01) < 0:
                        time.sleep(0.001)
        def setRodDelay(id: int, value: float):
            sodaClass.config["misc"]["rodDelay"] = value

        def setLongRod(id: int, value: bool):
            sodaClass.config["misc"]["longRod"] = value

        def setLowestSlot(id: int, value: int):
            sodaClass.config["potions"]["lowestSlot"] = value

        def setHighestSlot(id: int, value: int):
            sodaClass.config["potions"]["highestSlot"] = value

        def setSwitchDelay(id: int, value: float):
            sodaClass.config["potions"]["switchDelay"] = value
        def startRecording():
            if not recording:
                threading.Thread(target=recorder, daemon=True).start()

        def togglePotions(id:int, value: bool):
            sodaClass.config["potions"]["enabled"] = value

        def setTheme(id: int, value: str):
            sodaClass.config["misc"]["theme"] = value

        def setConsoleFaker(id: int, value: str):
            sodaClass.config["misc"]["consoleFaker"] = value

        def stopRecording():
            global recording

            recording = False

            dpg.set_value(recordingStatusText, f"Recording: False")

        def selfDestruct():
            dpg.destroy_context()

        waitingForKeyHideGUI = False
        def statusBindHideGUI():
            global waitingForKeyHideGUI

            if not waitingForKeyHideGUI:
                with dpg.handler_registry(tag="Hide GUI Bind Handler"):
                    dpg.add_key_press_handler(callback=setBindHideGUI)

                dpg.set_item_label(buttonBindHideGUI, "...")

                waitingForKeyHideGUI = True

        # set RGB
        def setRed(id: int, value: int):
            sodaClass.config["misc"]["red"] = value

        def setGreen(id: int, value: int):
            sodaClass.config["misc"]["green"] = value

        def setBlue(id: int, value: int):
            sodaClass.config["misc"]["blue"] = value 
        def setBindHideGUI(id: int, value: str):
            global waitingForKeyHideGUI
            if waitingForKeyHideGUI:
                key = keyboard.read_event(suppress=True).name
                virtual_key = ord(key.upper())
                sodaClass.config["misc"]["bindHideGUI"] = virtual_key
                dpg.set_item_label(buttonBindHideGUI, f"Bind: {key.upper()}")
                dpg.delete_item("Hide GUI Bind Handler")
                waitingForKeyHideGUI = False


        def toggleSaveSettings(id: int, value: bool):
            sodaClass.config["misc"]["saveSettings"] = value

        def toggleLeftBreakShift(id: int, value: bool):
            sodaClass.config["left"]["breakShift"] = value

        def toggleAlwaysOnTop(id: int, value: bool):
            if value:
                win32gui.SetWindowPos(guiWindows, win32con.HWND_TOPMOST, 0, 0, 0, 0, win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
            else:
                win32gui.SetWindowPos(guiWindows, win32con.HWND_NOTOPMOST, 0, 0, 0, 0, win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)

        def toggleDiscordRPC(id: int, value: bool):
            sodaClass.config["misc"]["discordRichPresence"] = value
        def themeToRGB(theme: str):
            try:
                themeMap = {
                    "light": (250, 250, 250),
                    "dark": (40, 40, 40),
                    "sakura": (217, 156, 195),
                    "purple": (181, 92, 224),
                    "blue": (58, 110, 230),
                    "lightblue": (113, 190, 235),
                    "orange": (232, 165, 22),
                    "red": (222, 90, 90),
                    "beach_green": (133, 207, 182),
                    "forest_green": (51, 120, 78),
                }

                return themeMap[theme]
            except:
                return None
            
        try:
            with dpg.theme() as container_theme:
                if(sodaClass.config["misc"]["theme"] != "custom"):
                    rgb_data = themeToRGB(sodaClass.config["misc"]["theme"])
                else:
                    rgb_data = (sodaClass.config["misc"]["red"], sodaClass.config["misc"]["green"], sodaClass.config["misc"]["blue"])
                with dpg.theme_component(dpg.mvAll):
                    dpg.add_theme_color(dpg.mvThemeCol_Tab, rgb_data, category=dpg.mvThemeCat_Core)
                    dpg.add_theme_color(dpg.mvThemeCol_TabHovered, rgb_data, category=dpg.mvThemeCat_Core)
                    dpg.add_theme_color(dpg.mvThemeCol_TabActive, rgb_data, category=dpg.mvThemeCat_Core),
                    dpg.add_theme_color(dpg.mvThemeCol_CheckMark, rgb_data, category=dpg.mvThemeCat_Core)
                    dpg.add_theme_color(dpg.mvThemeCol_SliderGrab, rgb_data, category=dpg.mvThemeCat_Core)
                    dpg.add_theme_color(dpg.mvThemeCol_ButtonHovered, rgb_data, category=dpg.mvThemeCat_Core)
                    dpg.add_theme_color(dpg.mvThemeCol_ScrollbarGrab, rgb_data, category=dpg.mvThemeCat_Core)
                    if(sodaClass.config["misc"]["theme"] == "light"):
                        # Set all items to white except text
                        dpg.add_theme_color(dpg.mvThemeCol_Text, (0, 0, 0), category=dpg.mvThemeCat_Core)
                        dpg.add_theme_color(dpg.mvThemeCol_WindowBg, (230, 230, 230), category=dpg.mvThemeCat_Core)
                        dpg.add_theme_color(dpg.mvThemeCol_FrameBg, rgb_data, category=dpg.mvThemeCat_Core)
                        dpg.add_theme_color(dpg.mvThemeCol_Button, rgb_data, category=dpg.mvThemeCat_Core)

            dpg.create_viewport(title=f"[v{version}] Soda - AutoClicker.ontop", width=860, height=645)

            with dpg.window(tag="Primary Window"):
                dpg.bind_item_theme("Primary Window", container_theme)
                clicks = sodaClass.getClickSounds()
                with dpg.tab_bar():
                    with dpg.tab(label="Left Clicker"):
                        dpg.add_spacer(width=75)
                        
                        with dpg.group(horizontal=True):
                            checkboxToggleLeftClicker = dpg.add_checkbox(label="Toggle", default_value=sodaClass.config["left"]["enabled"], callback=toggleLeftClicker)
                            buttonBindLeftClicker = dpg.add_button(label="Click to Bind", callback=statusBindLeftClicker)
                            dropdownLeftMode = dpg.add_combo(label="Mode", items=["Hold", "Always"], default_value=sodaClass.config["left"]["mode"], callback=setLeftMode)

                            bind = sodaClass.config["left"]["bind"]
                            if bind != 0:
                                dpg.set_item_label(buttonBindLeftClicker, f"Bind: {chr(bind)}")

                        dpg.add_spacer(width=75)

                        sliderLeftAverageCPS = dpg.add_slider_int(label="Average CPS", default_value=sodaClass.config["left"]["averageCPS"], min_value=1, callback=setLeftAverageCPS)

                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        checkboxLeftBlockHit = dpg.add_checkbox(label="BlockHit", default_value=sodaClass.config["left"]["blockHit"], callback=toggleLeftBlockHit)
                        sliderLeftBlockHitChance = dpg.add_slider_int(label="BlockHit Chance", default_value=sodaClass.config["left"]["blockHitChance"], min_value=1, max_value=100, callback=setLeftBlockHitChance)
                        dpg.add_text(default_value="Randomly right clicks to do a blockhit (MC version < 1.8.9). This can help reduce damage.\nWarning: Having the amount higher than 50 can cause it to be very hard to move while using the clicker")
                        dpg.add_checkbox(label="Blockhit Hold", default_value=sodaClass.config["left"]["blockHitHold"], callback=toggleLeftBlockHitHold)
                        dpg.add_text(default_value="Only block hits if RMB is held down - Not working, will be fixed in 1.5.4")
                        dpg.add_spacer(width=125)

                        checkboxLeftShakeEffect = dpg.add_checkbox(label="Shake Effect", default_value=sodaClass.config["left"]["shakeEffect"], callback=toggleLeftShakeEffect)
                        sliderLeftShakeEffectForce = dpg.add_slider_int(label="Shake Effect Force", default_value=sodaClass.config["left"]["shakeEffectForce"], min_value=1, max_value=20, callback=setLeftShakeEffectForce)
                        dpg.add_text(default_value="Makes your camera move a little bit when the autoclicker is active!\nThis can help bypass anticheats with strict autoclicker checks.")
                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        dropDownLeftClickSound = dpg.add_combo(label="Click Sound", items=clicks, default_value=sodaClass.config["left"]["soundPath"], callback=setLeftClickSoundPath)
                        
                        dpg.add_text(default_value="Plays a sound when you click!")
                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        checkboxLeftOnlyWhenFocused = dpg.add_checkbox(label="Only In Game", default_value=sodaClass.config["left"]["onlyWhenFocused"], callback=toggleLeftOnlyWhenFocused)
                        
                        checkboxLeftRMBLock = dpg.add_checkbox(label="RMB-Lock", default_value=sodaClass.config["left"]["RMBLock"], callback=toggleLeftRMBLock)
                        checkboxLeftWorkInMenus = dpg.add_checkbox(label="Work in Menus", default_value=sodaClass.config["left"]["workInMenus"], callback=toggleLeftWorkInMenus)
                        checkboxLeftBlatantMode = dpg.add_checkbox(label="Blatant Mode", default_value=sodaClass.config["left"]["blatant"], callback=toggleLeftBlatantMode)
                    
                        dpg.add_spacer(width=75)

                        dropdownBreakBlocks = dpg.add_combo(label="Break Blocks", items=["None", "Full", "Shift With Click", "Shift No Click"], default_value=sodaClass.config["left"]["breakBlocks"], callback=setLeftBreakBlocks)
                        dpg.add_text(default_value="Breaks blocks while clicking.\nNone - Doesn't break blocks at all\nFull - Break blocks all the time (Can cause issues on servers such as hypixel.net)\nShift With Click - Breaks blocks when shifting, but it keeps clicking (Worse hitreg when shifting) \nShift No Click - Stops the clicking when shifting to break blocks")

                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        checkboxLeftAutoRod = dpg.add_checkbox(label="Auto Rod", default_value=sodaClass.config["left"]["AutoRod"], callback=toggleLeftAutoRod)
                        sliderLeftAutoRodChance = dpg.add_slider_int(label="Auto Rod Chance", default_value=sodaClass.config["left"]["AutoRodChance"], min_value=1, max_value=100, callback=setLeftAutoRodChance)
                        dpg.add_text(default_value="Works like blockhit but instead 'throws' a rod. Change your rod slot in MISC settings.\nIts not recommended to have Rod Change above 15!")
                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        creditsText = dpg.add_text(default_value="Credits: 4urxra (Developer)")
                        githubText = dpg.add_text(default_value="https://github.com/Dream23322/Soda-Autoclicker/")
                    with dpg.tab(label="Right Clicker"):
                        dpg.add_spacer(width=75)

                        with dpg.group(horizontal=True):
                            checkboxToggleRightClicker = dpg.add_checkbox(label="Toggle", default_value=sodaClass.config["right"]["enabled"], callback=toggleRightClicker)
                            buttonBindRightClicker = dpg.add_button(label="Click to Bind", callback=statusBindRightClicker)
                            dropdownRightMode = dpg.add_combo(label="Mode", items=["Hold", "Always"], default_value=sodaClass.config["right"]["mode"], callback=setRightMode)

                            bind = sodaClass.config["right"]["bind"]
                            if bind != 0:
                                dpg.set_item_label(buttonBindRightClicker, f"Bind: {chr(bind)}")

                        dpg.add_spacer(width=75)

                        sliderRightAverageCPS = dpg.add_slider_int(label="Average CPS", default_value=sodaClass.config["right"]["averageCPS"], min_value=1, callback=setRightAverageCPS)

                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        checkboxRightShakeEffect = dpg.add_checkbox(label="Shake Effect", default_value=sodaClass.config["right"]["shakeEffect"], callback=toggleRightShakeEffect)
                        sliderRightShakeEffectForce = dpg.add_slider_int(label="Shake Effect Force", default_value=sodaClass.config["right"]["shakeEffectForce"], min_value=1, max_value=20, callback=setRightShakeEffectForce)

                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        dropdownRightClickSound = dpg.add_combo(label="Click Sound", items=clicks, default_value=sodaClass.config["right"]["soundPath"], callback=setRightClickSoundPath)
                        dpg.add_text(default_value="Plays a sound when you click!")
    
                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        checkboxRightLMBLock = dpg.add_checkbox(label="LMB-Lock", default_value=sodaClass.config["right"]["LMBLock"], callback=toggleRightLMBLock)
                        checkboxRightOnlyWhenFocused = dpg.add_checkbox(label="Only In Game", default_value=sodaClass.config["right"]["onlyWhenFocused"], callback=toggleRightOnlyWhenFocused)
                        checkboxRightWorkInMenus = dpg.add_checkbox(label="Work in Menus", default_value=sodaClass.config["right"]["workInMenus"], callback=toggleRightWorkInMenus)
                        checkboxRightBlatantMode = dpg.add_checkbox(label="Blatant Mode", default_value=sodaClass.config["right"]["blatant"], callback=toggleRightBlatantMode)
                        checkboxRightItems = dpg.add_checkbox(label="Items", default_value=sodaClass.config["right"]["items"], callback=toggleRightItems)
                        dpg.add_spacer(width=75)    
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        creditsText = dpg.add_text(default_value="Credits: 4urxra (Developer)")
                        githubText = dpg.add_text(default_value="https://github.com/Dream23322/Soda-Autoclicker/")                
                    with dpg.tab(label="Recorder"):
                        dpg.add_spacer(width=75)

                        recorderInfoText = dpg.add_text(default_value="Records your legit way of clicking in order to produce clicks even less detectable by AntiCheat.\nAfter pressing the \"Start\" button, click as if you were in PvP for a few seconds. Then press the \"Stop\" button.\nOnly works for the left click.")

                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        checkboxRecorderEnabled = dpg.add_checkbox(label="Enabled", default_value=sodaClass.config["recorder"]["enabled"], callback=toggleRecorder)

                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        with dpg.group(horizontal=True):
                            buttonStartRecording = dpg.add_button(label="Start Recording", callback=startRecording)
                            buttonStopRecording = dpg.add_button(label="Stop Recording", callback=stopRecording)

                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        averageRecordCPSText = dpg.add_text(default_value="Average CPS of previous Record: ")
                        
                        totalTime = 0
                        for clickTime in sodaClass.config["recorder"]["record"]:
                            totalTime += float(clickTime)

                        dpg.set_value(averageRecordCPSText, f"Average CPS of previous Record: {round(len(sodaClass.config['recorder']['record']) / totalTime, 2)}")

                        recordingStatusText = dpg.add_text(default_value="Recording: ")
                        dpg.set_value(recordingStatusText, f"Recording: {recording}")
                        dpg.add_spacer(width=75)    
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        creditsText = dpg.add_text(default_value="Credits: 4urxra (Developer)")
                        githubText = dpg.add_text(default_value="https://github.com/Dream23322/Soda-Autoclicker/")                    
                    with dpg.tab(label="Misc"):
                        dpg.add_spacer(width=75)

                        buttonSelfDestruct = dpg.add_button(label="Destruct", callback=selfDestruct)

                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        with dpg.group(horizontal=True):
                            buttonBindHideGUI = dpg.add_button(label="Click to Bind", callback=statusBindHideGUI)
                            hideGUIText = dpg.add_text(default_value="Hide GUI")

                            bind = sodaClass.config["misc"]["bindHideGUI"]
                            if bind != 0:
                                dpg.set_item_label(buttonBindHideGUI, f"Bind: {chr(bind)}")

                    
                        consoleFaker = dpg.add_combo(label="Console Faker", default_value=sodaClass.config["misc"]["consoleFaker"], items=["NullBind", "Optimiser", "CustomRGB"], callback=setConsoleFaker)


                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        saveSettings = dpg.add_checkbox(label="Save Settings", default_value=sodaClass.config["misc"]["saveSettings"], callback=toggleSaveSettings)
                        saveSettingsTooltip = dpg.add_text(default_value="Attempts to save settings on close.")
                        dpg.add_spacer(width=75)

                        checkboxAlwaysOnTop = dpg.add_checkbox(label="Always On Top", callback=toggleAlwaysOnTop)
                        alwaysOnTopTooltip = dpg.add_text(default_value="Makes the GUI always on top.")

                        dpg.add_spacer(width=75)

                        checkboxAlwaysOnTop = dpg.add_checkbox(label="Discord Rich Presence", default_value=sodaClass.config["misc"]["discordRichPresence"], callback=toggleDiscordRPC)
                        dpg.add_text(default_value="Shows your activity status as using Soda v1")

                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        with dpg.group(horizontal=True):
                            rodBindText = dpg.add_text(default_value="Rod Bind:")
                            buttonBindRodKey = dpg.add_button(label="Click to Bind", callback=statusBindRod)

                            bind = sodaClass.config["misc"]["rodBind"]
                            if bind != 0:
                                dpg.set_item_label(buttonBindRodKey, f"Bind: {chr(bind)}")

                        dpg.add_text(default_value="Press the binded key to throw a rod")

                        dpg.add_checkbox(label="Long Rod", default_value=sodaClass.config["misc"]["longRod"], callback=setLongRod)
                        dpg.add_text(default_value="Long Rod makes it so when a rod is thrown using the bind, it will throw it further (doubles the rod delay)")

                        rodSlot = dpg.add_combo(label="Rod Slot", items=["1", "2", "3", "4", "5", "6", "7", "8", "9"], default_value=sodaClass.config["misc"]["rodSlot"], callback=setRodSlot)
                        dpg.add_text(default_value="Which slot to switch to when throwing a rod")

                        rodDelay = dpg.add_input_float(label="Rod Delay", default_value=sodaClass.config["misc"]["rodDelay"], min_value=0, max_value=2, callback=setRodDelay)
                        dpg.add_text(default_value="Rod Delay is how long you want to be throwing the rod (Range)")
                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        with dpg.group(horizontal=True):
                            buttonBindPearlKey = dpg.add_button(label="Click to Bind", callback=statusBindPearl)

                            bind = sodaClass.config["misc"]["pearlBind"]
                            if bind != 0:
                                dpg.set_item_label(buttonBindPearlKey, f"Bind: {chr(bind)}")

                        dpg.add_text(default_value="Press the binded key to throw a pearl")

                        dpg.add_combo(label="Pearl Slot", items=["1", "2", "3", "4", "5", "6", "7", "8", "9"], default_value=sodaClass.config["misc"]["pearlSlot"], callback=setPearlSlot)
                        dpg.add_text(default_value="Which slot to switch to when throwing a pearl")

                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        dpg.add_combo(label="Sword Slot", items=["1", "2", "3", "4", "5", "6", "7", "8", "9"], default_value=sodaClass.config["misc"]["swordSlot"], callback=setSwordSlot)
                        dpg.add_text(default_value="Which slot to switch back to after auto-throwing an item")
                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        dpg.add_combo(label="Theme", items=["light", "dark", "sakura", "purple", "blue", "lightblue", "orange", "red", "beach_green", "forest_green", "custom"], default_value=sodaClass.config["misc"]["theme"], callback=setTheme)
                        dpg.add_text(default_value="Changes the theme of the GUI (Requires Restart!)")

                        dpg.add_slider_int(label="Red", default_value=sodaClass.config["misc"]["red"], min_value=0, max_value=255, callback=setRed)
                        dpg.add_slider_int(label="Green", default_value=sodaClass.config["misc"]["green"], min_value=0, max_value=255, callback=setGreen)
                        dpg.add_slider_int(label="Blue", default_value=sodaClass.config["misc"]["blue"], min_value=0, max_value=255, callback=setBlue)
                        
                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        dpg.add_checkbox(label="Toggle Sounds", default_value=sodaClass.config["misc"]["toggleSounds"], callback=setToggleSounds)
                        dpg.add_text(default_value="Plays a sound when you toggle the clicker on or off")

                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        creditsText = dpg.add_text(default_value="Credits: 4urxra (Developer)")
                        githubText = dpg.add_text(default_value="https://github.com/Dream23322/Soda-Autoclicker/")

                    with dpg.tab(label="Potions"):

                        dpg.add_spacer(width=75)

                        dpg.add_text(default_value="Tools for potions, includes throwbind")

                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        dpg.add_checkbox(label="Enable Potions", default_value=sodaClass.config["potions"]["enabled"], callback=togglePotions)

                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)
                        # Pot Bind Throw Bind System
                        with dpg.group(horizontal=True):
                            potBindText = dpg.add_text(default_value="Pot Bind:")
                            buttonBindPotKey = dpg.add_button(label="Click to Bind", callback=statusBindPot)

                            bind = sodaClass.config["potions"]["potBind"]
                            if bind != 0:
                                dpg.set_item_label(buttonBindPotKey, f"Bind: {chr(bind)}")
                        dpg.add_text(default_value="Keybind which throws the potion")
                        dpg.add_spacer(width=75)

                        # Bind Reset Bind System

                        with dpg.group(horizontal=True):
                            potResetBindText = dpg.add_text(default_value="Pot Reset Bind:")
                            buttonBindPotResetKey = dpg.add_button(label="Click to Bind", callback=statusBindPotReset)

                            bind = sodaClass.config["potions"]["potResetBind"]
                            if bind != 0:
                                dpg.set_item_label(buttonBindPotResetKey, f"Bind: {chr(bind)}")

                        dpg.add_text(default_value="Keybind which resets the potion data (Sets the next slot to the starting slot)")
                        
                        dpg.add_spacer(width=75)    
                        dpg.add_separator()
                        dpg.add_spacer(width=75)
                        # Lowest Slot Slider

                        dpg.add_slider_int(label="Lowest Slot", default_value=sodaClass.config["potions"]["lowestSlot"], min_value=1, max_value=9, callback=setLowestSlot)
                        dpg.add_text(default_value="First slot to throw from")

                        # Highest Slot
                        dpg.add_spacer(width=75)
                        dpg.add_slider_int(label="Highest Slot", default_value=sodaClass.config["potions"]["highestSlot"], min_value=1, max_value=9, callback=setHighestSlot)
                        dpg.add_text(default_value="Max slot to switch to when throwing")

                        # Switch Delay
                        dpg.add_spacer(width=75)
                        potDelay = dpg.add_input_float(label="Pot Delay", default_value=sodaClass.config["potions"]["throwDelay"], min_value=0, max_value=2, callback=setPotDelay)
                        dpg.add_text("Pot Delay is how long do you want to wait after switching to throw the potion (Higher this is, the less chance of failing to throw there will be, but it will also add more delay which can be bad during PvP)")
                        
                        dpg.add_spacer(width=75)    
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                        creditsText = dpg.add_text(default_value="Credits: 4urxra (Developer)")
                        githubText = dpg.add_text(default_value="https://github.com/Dream23322/Soda-Autoclicker/")
                    
                    with dpg.tab(label="Movement"):
                        dpg.add_spacer(width=75)

                        dpg.add_checkbox(label="Auto W Tap", default_value=sodaClass.config["movement"]["autoWTap"], callback=toggleWTap)
                        dpg.add_text(default_value="Automatically W-Taps when you click. \nThis helps with keeping combos by stopping you from going into the players reach circle.")
                        dpg.add_slider_int(label="W Tap Value", default_value=sodaClass.config["movement"]["wTapValue"], min_value=1, max_value=100, callback=setWTapValue)
                        dpg.add_combo(label="W Tap Mode", items=["chance", "delay"], default_value=sodaClass.config["movement"]["wTapMode"], callback=setWTapMode)
                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)
                        dpg.add_checkbox(label="Auto Sprint", default_value=sodaClass.config["movement"]["autoSprint"], callback=toggleAutoSprint)
                        dpg.add_text(default_value="Automatically sprints when moving")
                        dpg.add_spacer(width=75)
                        dpg.add_separator()
                        dpg.add_spacer(width=75)

                    with dpg.tab(label="Config Manager"):
                        # Load all configs from the config folder

                        dpg.add_spacer(width=75)
                        dpg.add_text(default_value="Config Manager")
                        dpg.add_separator()
                        dpg.add_spacer(width=100)
                        
                        configs = sodaClass.getConfigs()

                        if len(configs) == 0:
                            dpg.add_text(default_value="No configs found!")
                        else:
                            dpg.add_text(default_value="Configs found:")
                            dpg.add_spacer(width=75)
                            dpg.add_separator()
                            dpg.add_spacer(width=75)
                            for config in configs:
                                with dpg.group():
                                    # Display name
                                    dpg.add_text(default_value=config["displayName"])
                                    dpg.add_text(default_value=f"Author: {config['Author']}")
                                    dpg.add_text(default_value=f"Description: {config['description']}")
                                    dpg.add_button(label="Load", callback=sodaClass.loadConfig, user_data=0)
                                    dpg.add_spacer(width=75)
                                    dpg.add_separator()
                                    dpg.add_spacer(width=75)

                        dpg.add_spacer(width=75)

                        dpg.add_text(default_value="Requires restart to apply changes!")

                        dpg.add_spacer(width=75)

                        dpg.add_button(label="Open Config Folder", callback=sodaClass.openConfigFolder)
                    if sodaClass.newver:
                        with dpg.tab(label="Update"):
                            dpg.add_spacer(width=75)
                            dpg.add_text(default_value="A new version of Soda is available!")
                            dpg.add_text(default_value=f"Current version: {version}")
                            dpg.add_text(default_value=f"Latest version: {sodaClass.newverid}")

                            dpg.add_text(default_value="You can download it from the GitHub repository.")
                            dpg.add_button(label="Download", callback=lambda: webbrowser.open("https://github.com/Dream23322/Soda-Autoclicker/releases"))

            with dpg.theme() as global_theme:
                with dpg.theme_component(dpg.mvAll):
                    dpg.add_theme_style(dpg.mvStyleVar_WindowBorderSize, 0)
                    dpg.add_theme_style(dpg.mvStyleVar_FrameRounding, 4)
                    dpg.add_theme_style(dpg.mvStyleVar_GrabRounding, 1)
                    dpg.add_theme_style(dpg.mvStyleVar_GrabMinSize, 20)
                    dpg.add_theme_style(dpg.mvStyleVar_TabRounding, 1)
                    dpg.add_theme_color(dpg.mvThemeCol_TabActive, (107, 110, 248))
                    dpg.add_theme_color(dpg.mvThemeCol_TabHovered, (107, 110, 248))
                    dpg.add_theme_color(dpg.mvThemeCol_ButtonHovered, (107, 110, 248))
                    dpg.add_theme_color(dpg.mvThemeCol_CheckMark, (107, 110, 248))
                    dpg.add_theme_color(dpg.mvThemeCol_ScrollbarGrabHovered, (107, 110, 248))
                    dpg.add_theme_color(dpg.mvThemeCol_ScrollbarGrabActive, (107, 110, 248))
                    dpg.add_theme_color(dpg.mvThemeCol_SliderGrab, (107, 110, 248))
                    dpg.add_theme_color(dpg.mvThemeCol_SliderGrabActive, (107, 110, 248))
                    dpg.add_theme_color(dpg.mvThemeCol_FrameBgHovered, (71, 71, 77))
                    dpg.add_theme_color(dpg.mvThemeCol_HeaderHovered, (71, 71, 77))

            dpg.bind_theme(global_theme)

            dpg.create_context()
            dpg.show_viewport()
            
            guiWindows = win32gui.GetForegroundWindow()

            dpg.setup_dearpygui()
            dpg.set_primary_window("Primary Window", True)
            dpg.start_dearpygui()
        
        except AttributeError as e:
            print(f"Error with current config: {e}")
            print(f"{os.path.join(sodaClass.folder_path, 'config.json')} is not a valid config file.")
            # delete config.json from resource folder
            if os.path.exists(os.path.join(sodaClass.folder_path, "config.json")):
                print("Deleting config.json...")
                os.remove(os.path.join(sodaClass.folder_path, "config.json"))
            print("Removed current config, please restart the program to generate a new one.")

        selfDestruct()
    except KeyboardInterrupt:
        os._exit(0)