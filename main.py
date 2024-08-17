version = "1.3"
try:
    import win32api, win32con, win32gui, win32process, psutil, time, threading, random, winsound, os, json, subprocess, sys, asyncio, itertools, base64, re, keyboard
    import dearpygui.dearpygui as dpg
    from pypresence import Presence
except:
    from os import system
    system("pip install -r requirements.txt")

current_key = None
class configListener(dict): # Detecting changes to config
    def __init__(self, initialDict):
        for k, v in initialDict.items():
            if isinstance(v, dict):
                initialDict[k] = configListener(v)


              
        super().__init__(initialDict)

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
            json.dump(sodaClass.config, open(f"{os.environ['LOCALAPPDATA']}\\temp\\{hwid}", "w", encoding="utf-8"), indent=4)

class soda():
    def __init__(self, hwid: str):
        self.config = {
            "left": {
                "enabled": False,
                "mode": "Hold",
                "bind": 0,
                "averageCPS": 18,
                "onlyWhenFocused": True,
                "breakBlocks": False,
                "RMBLock": False,
                "blockHit": False,
                "blockHitChance": 20,
                "shakeEffect": False,
                "shakeEffectForce": 5,
                "soundPath": "",
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
                "soundPath": "",
                "workInMenus": False,
                "blatant": False
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
                "discordRichPresence": False,
                "rodBind": 0,
                "rodDelay": 0.2,
                "rodSlot": "2",
                "pearlBind": 0,
                "pearlSlot": "8",
                "movementFix": False,
                "swordSlot": "1",
                "theme": "purple",
                "red": 0,
                "green": 0,
                "blue": 0,
            },
            "potions": {
                "enabled": False,
                "potBind": 0,
                "throwDelay": 0.7,
                "switchBackSlot": "1",
                "potResetBind": 0,
                "lowestSlot": 1,
                "highestSlot": 9
            }
        }
        self.current_pot_slot = 0 

        if os.path.isfile(f"{os.environ['LOCALAPPDATA']}\\temp\\{hwid}"):
            try:
                config = json.loads(open(f"{os.environ['LOCALAPPDATA']}\\temp\\{hwid}", encoding="utf-8").read())

                isConfigOk = True
                for key in self.config:
                    if not key in config or len(self.config[key]) != len(config[key]):
                        isConfigOk = False

                        break

                if isConfigOk:
                    if not config["misc"]["saveSettings"]:
                        self.config["misc"]["saveSettings"] = False
                    else:
                        self.config = config
            except:
                pass

        self.config = configListener(self.config)

        self.record = itertools.cycle(self.config["recorder"]["record"])

        threading.Thread(target=self.discordRichPresence, daemon=True).start()
        
        threading.Thread(target=self.windowListener, daemon=True).start()
        threading.Thread(target=self.leftBindListener, daemon=True).start()
        threading.Thread(target=self.rightBindListener, daemon=True).start()
        threading.Thread(target=self.hideGUIBindListener, daemon=True).start()
        threading.Thread(target=self.bindListener, daemon=True).start()

        threading.Thread(target=self.leftClicker, daemon=True).start()
        threading.Thread(target=self.rightClicker, daemon=True).start()

    def discordRichPresence(self):
        asyncio.set_event_loop(asyncio.new_event_loop())

        discordRPC = Presence("1044302531272126534")
        discordRPC.connect()

        startTime = time.time()

        states = [
            "Being the best player in the world",
            "Get shit on <3",
            "Herro! Is anybody home?",
            "CatClicker",
        ]

        while True:
            if self.config["misc"]["discordRichPresence"]:
                discordRPC.update(state=random.choice(states), start=startTime, large_image="logo", large_text="I'm him, ur not", buttons=[{"label": "Website", "url": "https://github.com/Dream23322/Soda-Autoclicker/"}])
            else:
                discordRPC.clear()

            time.sleep(15)

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
    def doRod(self):
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
        time.sleep(round(float(self.config["misc"]["rodDelay"]) / 3, 3))  # Brief pause to simulate a key press
        # Release the '2' key
        win32api.keybd_event(VK_2, 0, win32con.KEYEVENTF_KEYUP, 0)
        # Send Rod by right clicking
        win32api.SendMessage(self.window, win32con.WM_RBUTTONDOWN, 0, 0)
        time.sleep(0.02)
        win32api.SendMessage(self.window, win32con.WM_RBUTTONUP, 0, 0)
        time.sleep(float(self.config["misc"]["rodDelay"]))  # Brief pause to simulate a key press
        # Switch back to slot 1
        VK_2 = 0x31

        # Press the '2' key
        win32api.keybd_event(VK_2, 0, 0, 0)
        time.sleep(float(self.config["misc"]["rodDelay"]) / 5)  # Brief pause to simulate a key press
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

                win32api.keybd_event(0x31, 0, 0, 0)
                self.current_pot_slot += 1



            else:
                print("No Potions Left!")




    def leftClick(self, focused):
        if focused != None:
            if self.config["left"]["breakBlocks"]:
                win32api.SendMessage(self.window, win32con.WM_LBUTTONDOWN, 0, 0)
            else:
                win32api.SendMessage(self.window, win32con.WM_LBUTTONDOWN, 0, 0)
                time.sleep(0.02)
                win32api.SendMessage(self.window, win32con.WM_LBUTTONUP, 0, 0)

            if self.config["left"]["blockHit"] or (self.config["left"]["blockHit"] and self.config["right"]["enabled"] and self.config["right"]["LMBLock"] and not win32api.GetAsyncKeyState(0x02) < 0):
                if random.uniform(0, 1) <= self.config["left"]["blockHitChance"] / 100.0:
                    win32api.SendMessage(self.window, win32con.WM_RBUTTONDOWN, 0, 0)
                    time.sleep(0.02)
                    win32api.SendMessage(self.window, win32con.WM_RBUTTONUP, 0, 0)     

            if self.config["left"]["AutoRod"] or (self.config["left"]["AutoRod"] and self.config["right"]["enabled"] and self.config["right"]["RMBLock"] and not win32api.GetAsyncKeyState(0x01) < 0):
                if random.uniform(0, 1) <= self.config["left"]["AutoRodChance"] / 100.0:
                    self.doRod()
        else:
            if self.config["left"]["breakBlocks"]:
                # time.sleep(0.02)
                win32api.mouse_event(win32con.MOUSEEVENTF_LEFTDOWN, 0, 0)
                # win32api.SendMessage(self.window, win32con.WM_LBUTTONUP, 0, 0)
            else:
                win32api.mouse_event(win32con.MOUSEEVENTF_LEFTDOWN, 0, 0)
                time.sleep(0.02)
                win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP, 0, 0)

            if self.config["left"]["blockHit"] or (self.config["left"]["blockHit"] and self.config["right"]["enabled"] and self.config["right"]["LMBLock"] and not win32api.GetAsyncKeyState(0x02) < 0):
                if random.uniform(0, 1) <= self.config["left"]["blockHitChance"] / 100.0:
                    win32api.mouse_event(win32con.MOUSEEVENTF_RIGHTDOWN, 0, 0)
                    time.sleep(0.02)
                    win32api.mouse_event(win32con.MOUSEEVENTF_RIGHTUP, 0, 0)

            if self.config["left"]["AutoRod"] or (self.config["left"]["AutoRod"] and self.config["right"]["enabled"] and self.config["right"]["RMBLock"] and not win32api.GetAsyncKeyState(0x01) < 0):
                if random.uniform(0, 1) <= self.config["left"]["AutoRodChance"] / 100.0:
                    self.doRod()

        if self.config["left"]["soundPath"] != "" and os.path.isfile(self.config["left"]["soundPath"]):
            winsound.PlaySound(self.config["left"]["soundPath"], winsound.SND_ASYNC)

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
                if "java" in self.focusedProcess or "AZ-Launcher" in self.focusedProcess:
                    cursorInfo = win32gui.GetCursorInfo()[1]
                    if cursorInfo > 50000 and cursorInfo < 100000:
                        time.sleep(0.001)

                        continue

                self.config["left"]["enabled"] = not self.config["left"]["enabled"]

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
        VK_2 = 0x31
        # Press the '2' key
        win32api.keybd_event(VK_2, 0, 0, 0)
        time.sleep(0.8)
        # Release the '2' key
        win32api.keybd_event(VK_2, 0, win32con.KEYEVENTF_KEYUP, 0)        
    def rightClick(self, focused):
        if focused != None:
            win32api.SendMessage(self.window, win32con.WM_RBUTTONDOWN, 0, 0)
            time.sleep(0.02)
            win32api.SendMessage(self.window, win32con.WM_RBUTTONUP, 0, 0)
        else:
            win32api.mouse_event(win32con.MOUSEEVENTF_RIGHTDOWN, 0, 0)
            time.sleep(0.02)
            win32api.mouse_event(win32con.MOUSEEVENTF_RIGHTUP, 0, 0)

        if self.config["right"]["soundPath"] != "" and os.path.isfile(self.config["right"]["soundPath"]):
            winsound.PlaySound(self.config["right"]["soundPath"], winsound.SND_ASYNC)

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
                if "java" in self.focusedProcess or "AZ-Launcher" in self.focusedProcess:
                    cursorInfo = win32gui.GetCursorInfo()[1]
                    if cursorInfo > 50000 and cursorInfo < 100000:
                        time.sleep(0.001)

                        continue

                self.config["right"]["enabled"] = not self.config["right"]["enabled"]

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


    def movementFix(self):
        self.key_a_pressed = False
        self.key_d_pressed = False

        def on_key_event(e):
            

            if self.config["misc"]["movementFix"]:
                if e.name == 'a':
                    
                    if e.event_type == 'down':
                        self.key_a_pressed = True
                        if self.key_d_pressed:
                            keyboard.block_key('d')
                    elif e.event_type == 'up':
                        self.key_a_pressed = False
                        keyboard.unblock_key('d')

                if e.name == 'd':
                    if e.event_type == 'down':
                        self.key_d_pressed = True
                        if self.key_a_pressed:
                            keyboard.block_key('a')
                    elif e.event_type == 'up':
                        self.key_d_pressed = False
                        keyboard.unblock_key("a")

        keyboard.hook(on_key_event)

                
    def isFocused(self, config1: str, config2: str, config3: str):
        return ("java" in self.focusedProcess or "AZ-Launcher" in self.focusedProcess or not self.config[config1][config2]) and (self.config[config1][config3] or win32gui.GetCursorInfo()[1] > 200000)
    def bindListener(self):
        while True:
            if win32api.GetAsyncKeyState(self.config["misc"]["rodBind"]) != 0 and self.isFocused("left", "onlyWhenFocused", "workInMenus"):
                self.doRod()
            elif win32api.GetAsyncKeyState(self.config["misc"]["pearlBind"]) != 0 and self.isFocused("left", "onlyWhenFocused", "workInMenus"):
                self.doPearl()
            # Do movement correction
            elif self.config["misc"]["movementFix"]:
                # Run movement correction with current pressed key
                self.movementFix()
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

                if not self.config["misc"]["guiHidden"]:
                    win32gui.ShowWindow(guiWindows, win32con.SW_SHOW)
                else:
                    win32gui.ShowWindow(guiWindows, win32con.SW_HIDE)

                while win32api.GetAsyncKeyState(self.config["misc"]["bindHideGUI"]) != 0:
                    time.sleep(0.001)

            time.sleep(0.001)

if __name__ == "__main__":
    try:
        if os.name != "nt":
            input("Soda Autoclicker is only working on Windows.")

            os._exit(0)

        (suppost_sid, error) = subprocess.Popen("wmic useraccount where name='%username%' get sid", stdout=subprocess.PIPE, shell=True).communicate()
        hwid = suppost_sid.split(b"\n")[1].strip().decode()

        currentWindow = win32gui.GetForegroundWindow()
        processName = psutil.Process(win32process.GetWindowThreadProcessId(currentWindow)[-1]).name()
        if processName == "cmd.exe" or processName in sys.argv[0]:
            win32gui.ShowWindow(currentWindow, win32con.SW_HIDE)

        sodaClass = soda(hwid)
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
                sodaClass.config["left"]["bind"] = value

                dpg.set_item_label(buttonBindLeftClicker, f"Bind: {chr(value)}")
                dpg.delete_item("Left Bind Handler")

                waitingForKeyLeft = False

        def setLeftMode(id: int, value: str):
            sodaClass.config["left"]["mode"] = value

        def setLeftAverageCPS(id: int, value: int):
            sodaClass.config["left"]["averageCPS"] = value

        def toggleLeftOnlyWhenFocused(id: int, value:bool):
            sodaClass.config["left"]["onlyWhenFocused"] = value

        def toggleLeftBreakBlocks(id: int, value: bool):
            sodaClass.config["left"]["breakBlocks"] = value

        def toggleLeftRMBLock(id: int, value: bool):
            sodaClass.config["left"]["RMBLock"] = value

        def toggleLeftBlockHit(id: int, value: bool):
            sodaClass.config["left"]["blockHit"] = value

        def setLeftBlockHitChance(id: int, value: int):
            sodaClass.config["left"]["blockHitChance"] = value

        def toggleLeftShakeEffect(id: int, value: bool):
            sodaClass.config["left"]["shakeEffect"] = value

        def setLeftShakeEffectForce(id: int, value: int):
            sodaClass.config["left"]["shakeEffectForce"] = value

        def setLeftClickSoundPath(id: int, value: str):
            sodaClass.config["left"]["soundPath"] = value

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

        def toggleMovementFix(id: int, value: bool):
            sodaClass.config["misc"]["movementFix"] = value
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
                sodaClass.config["right"]["bind"] = value

                dpg.set_item_label(buttonBindRightClicker, f"Bind: {chr(value)}")
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
                sodaClass.config["misc"]["rodBind"] = value

                dpg.set_item_label(buttonBindRodKey, f"Bind: {chr(value)}")
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
                sodaClass.config["misc"]["pearlBind"] = value

                dpg.set_item_label(buttonBindPearlKey, f"Bind: {chr(value)}")
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
                sodaClass.config["potions"]["potBind"] = value

                dpg.set_item_label(buttonBindPotKey, f"Bind: {chr(value)}")
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
                sodaClass.config["potions"]["potResetBind"] = value

                dpg.set_item_label(buttonBindPotResetKey, f"Bind: {chr(value)}")
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
            sodaClass.config["right"]["soundPath"] = value

        def toggleRightWorkInMenus(id: int, value: bool):
            sodaClass.config["right"]["workInMenus"] = value

        def toggleRightBlatantMode(id: int, value: bool):
            sodaClass.config["right"]["blatant"] = value

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
                sodaClass.config["misc"]["bindHideGUI"] = value

                dpg.set_item_label(buttonBindHideGUI, f"Bind: {chr(value)}")
                dpg.delete_item("Hide GUI Bind Handler")

                waitingForKeyHideGUI = False


        def toggleSaveSettings(id: int, value: bool):
            sodaClass.config["misc"]["saveSettings"] = value

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
                    dpg.add_spacer(width=125)

                    checkboxLeftShakeEffect = dpg.add_checkbox(label="Shake Effect", default_value=sodaClass.config["left"]["shakeEffect"], callback=toggleLeftShakeEffect)
                    sliderLeftShakeEffectForce = dpg.add_slider_int(label="Shake Effect Force", default_value=sodaClass.config["left"]["shakeEffectForce"], min_value=1, max_value=20, callback=setLeftShakeEffectForce)
                    dpg.add_text(default_value="Makes your camera move a little bit when the autoclicker is active!\nThis can help bypass anticheats with strict autoclicker checks.")
                    dpg.add_spacer(width=75)
                    dpg.add_separator()
                    dpg.add_spacer(width=75)

                    inputLeftClickSoundPath = dpg.add_input_text(label="Click Sound Path (empty for no sound)", default_value=sodaClass.config["left"]["soundPath"], hint="Exemple: mysounds/G505.wav", callback=setLeftClickSoundPath)
                    dpg.add_text(default_value="Plays a sound when you click!")
                    dpg.add_spacer(width=75)
                    dpg.add_separator()
                    dpg.add_spacer(width=75)

                    checkboxLeftOnlyWhenFocused = dpg.add_checkbox(label="Only In Game", default_value=sodaClass.config["left"]["onlyWhenFocused"], callback=toggleLeftOnlyWhenFocused)
                    checkBoxLeftBreakBlocks = dpg.add_checkbox(label="Break Blocks", default_value=sodaClass.config["left"]["breakBlocks"], callback=toggleLeftBreakBlocks)
                    checkboxLeftRMBLock = dpg.add_checkbox(label="RMB-Lock", default_value=sodaClass.config["left"]["RMBLock"], callback=toggleLeftRMBLock)
                    checkboxLeftWorkInMenus = dpg.add_checkbox(label="Work in Menus", default_value=sodaClass.config["left"]["workInMenus"], callback=toggleLeftWorkInMenus)
                    checkboxLeftBlatantMode = dpg.add_checkbox(label="Blatant Mode", default_value=sodaClass.config["left"]["blatant"], callback=toggleLeftBlatantMode)
                
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

                    inputRightClickSoundPath = dpg.add_input_text(label="Click Sound Path (empty for no sound)", default_value=sodaClass.config["right"]["soundPath"], hint="Exemple: mysounds/G505.wav", callback=setRightClickSoundPath)

                    dpg.add_spacer(width=75)
                    dpg.add_separator()
                    dpg.add_spacer(width=75)

                    checkboxRightLMBLock = dpg.add_checkbox(label="LMB-Lock", default_value=sodaClass.config["right"]["LMBLock"], callback=toggleRightLMBLock)
                    checkboxRightOnlyWhenFocused = dpg.add_checkbox(label="Only In Game", default_value=sodaClass.config["right"]["onlyWhenFocused"], callback=toggleRightOnlyWhenFocused)
                    checkboxRightWorkInMenus = dpg.add_checkbox(label="Work in Menus", default_value=sodaClass.config["right"]["workInMenus"], callback=toggleRightWorkInMenus)
                    checkboxRightBlatantMode = dpg.add_checkbox(label="Blatant Mode", default_value=sodaClass.config["right"]["blatant"], callback=toggleRightBlatantMode)
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
                    dpg.add_checkbox(label="Movement Fix (NOT WORKING)", default_value=sodaClass.config["misc"]["movementFix"], callback=toggleMovementFix)
                    
                    dpg.add_spacer(width=75)
                    dpg.add_separator()
                    dpg.add_spacer(width=75)

                    dpg.add_combo(label="Theme", items=["light", "dark", "sakura", "purple", "blue", "lightblue", "orange", "red", "beach_green", "forest_green", "custom"], default_value=sodaClass.config["misc"]["theme"], callback=setTheme)
                    dpg.add_text(default_value="Changes the theme of the GUI")

                    dpg.add_slider_int(label="Red", default_value=sodaClass.config["misc"]["red"], min_value=0, max_value=255, callback=setRed)
                    dpg.add_slider_int(label="Green", default_value=sodaClass.config["misc"]["green"], min_value=0, max_value=255, callback=setGreen)
                    dpg.add_slider_int(label="Blue", default_value=sodaClass.config["misc"]["blue"], min_value=0, max_value=255, callback=setBlue)
                    
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

        selfDestruct()
    except KeyboardInterrupt:
        os._exit(0)