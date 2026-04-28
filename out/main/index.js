"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const nodePty = require("node-pty");
const sudo = require("sudo-prompt");
const is = {
  dev: !electron.app.isPackaged
};
const platform = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
};
const electronApp = {
  setAppUserModelId(id) {
    if (platform.isWindows)
      electron.app.setAppUserModelId(is.dev ? process.execPath : id);
  },
  setAutoLaunch(auto) {
    if (platform.isLinux)
      return false;
    const isOpenAtLogin = () => {
      return electron.app.getLoginItemSettings().openAtLogin;
    };
    if (isOpenAtLogin() !== auto) {
      electron.app.setLoginItemSettings({
        openAtLogin: auto,
        path: process.execPath
      });
      return isOpenAtLogin() === auto;
    } else {
      return true;
    }
  },
  skipProxy() {
    return electron.session.defaultSession.setProxy({ mode: "direct" });
  }
};
const optimizer = {
  watchWindowShortcuts(window, shortcutOptions) {
    if (!window)
      return;
    const { webContents } = window;
    const { escToCloseWindow = false, zoom = false } = shortcutOptions || {};
    webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown") {
        if (!is.dev) {
          if (input.code === "KeyR" && (input.control || input.meta))
            event.preventDefault();
        } else {
          if (input.code === "F12") {
            if (webContents.isDevToolsOpened()) {
              webContents.closeDevTools();
            } else {
              webContents.openDevTools({ mode: "undocked" });
              console.log("Open dev tool...");
            }
          }
        }
        if (escToCloseWindow) {
          if (input.code === "Escape" && input.key !== "Process") {
            window.close();
            event.preventDefault();
          }
        }
        if (!zoom) {
          if (input.code === "Minus" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "Equal" && input.shift && (input.control || input.meta))
            event.preventDefault();
        }
      }
    });
  },
  registerFramelessWindowIpc() {
    electron.ipcMain.on("win:invoke", (event, action) => {
      const win = electron.BrowserWindow.fromWebContents(event.sender);
      if (win) {
        if (action === "show") {
          win.show();
        } else if (action === "showInactive") {
          win.showInactive();
        } else if (action === "min") {
          win.minimize();
        } else if (action === "max") {
          const isMaximized = win.isMaximized();
          if (isMaximized) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        } else if (action === "close") {
          win.close();
        }
      }
    });
  }
};
const IPC_CHANNELS = {
  DB_READ: "db:read",
  DB_WRITE: "db:write",
  DB_DELETE: "db:delete",
  DB_LIST: "db:list"
};
const DB_FILES = {
  PROVIDERS: "providers.json",
  PROFILES: "profiles.json",
  ENV: "env.json",
  TASKS: "tasks.json",
  TERMINAL: "terminal.json",
  SETTINGS: "settings.json"
};
const BUILTIN_PROVIDERS = [
  {
    name: "阿里云百炼",
    key: "aliyuncs",
    icon: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNzc3MTgyODQyNDk3IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjE2OTMiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHBhdGggZD0iTTY4LjU4NjY2NyAyNTZ2NTEybDIyMS43MTczMzMtMTI4VjM4NHoiIGZpbGw9IiMwNDIzREIiIHAtaWQ9IjE2OTQiPjwvcGF0aD48cGF0aCBkPSJNMjkwLjMwNCAzODR2MjU2TDUxMiA1MTJ6IiBmaWxsPSIjMUM1NEU0IiBwLWlkPSIxNjk1Ij48L3BhdGg+PHBhdGggZD0iTTUxMiA1MTJsLTIyMS42OTYtMTI4IDQ0My4zMDY2NjctMjU2LjE0OTMzM0w5NTUuNDEzMzMzIDI1NnoiIGZpbGw9IiNBQjlCRkYiIHAtaWQ9IjE2OTYiPjwvcGF0aD48cGF0aCBkPSJNMjkwLjMwNCAzODRMNjguNTg2NjY3IDI1NiA1MTIgMGwyMjEuNjEwNjY3IDEyNy44NTA2Njd6IiBmaWxsPSIjNzM0N0ZGIiBwLWlkPSIxNjk3Ij48L3BhdGg+PHBhdGggZD0iTTk1NS40MTMzMzMgNzY4TDUxMiAxMDI0bC0yMjEuNjk2LTEyOCA0NDMuMzkyLTI1NnoiIGZpbGw9IiMwMENGQ0EiIHAtaWQ9IjE2OTgiPjwvcGF0aD48cGF0aCBkPSJNNzMzLjY5NiA2NDBsMjIxLjcxNzMzMy0xMjh2MjU2ek0yOTAuMzA0IDg5Nkw2OC41ODY2NjcgNzY4IDUxMiA1MTJsMjIxLjY5NiAxMjh6IiBmaWxsPSIjMDBFQkQyIiBwLWlkPSIxNjk5Ij48L3BhdGg+PC9zdmc+",
    BASE_URL: "https://dashscope.aliyuncs.com/apps/anthropic",
    model: "qwen3.6-plus",
    opusModel: "qwen3.6-max-preview",
    sonnetModel: "qwen3.6-flash",
    haikuModel: "qwen3-coder-next",
    balanceApi: "https://business.aliyuncs.com/?Action=QueryAccountBalance&Version=2017-12-14"
  },
  {
    name: "DeepSeek",
    key: "deepseek",
    icon: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNzc3MTgyOTI1MTIyIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEzOTEgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjQxMTIiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjcxLjY3OTY4NzUiIGhlaWdodD0iMjAwIj48cGF0aCBkPSJNMTI5MC40ODYzMTgyNiAxMzQuMjY0MDQ1NDljLTEyLjEzNzU5MDg0LTYuMDcwMTc2MjYtMTcuMzc3ODgxNzYgNS40OTk4ODktMjQuNDY4NDk5MzkgMTEuMzc5NTA5MjItMi40MTY0NzE0MyAxLjg5NzI3NTI5LTQuNDc5NDQ3NjMgNC4zNjM0NTctNi41NDI0MjM4MSA2LjYzOTA4MjY4LTE3LjczNTUxOTU0IDE5LjM0NTU3OTkzLTM4LjQ1NjQxNjkyIDMyLjA1NDgzODg2LTY1LjU1Njc5ODkzIDMwLjUzNzI5NDc5LTM5LjU5NDIyOTc2LTIuMjc1NjI1NjctNzMuNDA0MTE3MzEgMTAuNDMyMjUyNDItMTAzLjI3ODYwODUxIDQxLjM0OTI3ODQ1LTYuMzUzMjQ4NjItMzguMTI1MDE1MTQtMjcuNDU1MjU4MDgtNjAuODg1NDE0NC01OS41ODA1MTk4My03NS40OTA1Njc3OC0xNi44MzM4MzA0Ny03LjU4NjMzOTQ4LTMzLjgwOTg4NzU1LTE1LjE3NDA1OTgxLTQ1LjU5Mzk4MzE0LTMxLjY3NjQ4ODQ4LTguMjAyMTk0NDktMTEuNzU5MjQwNDQtMTAuNDMyMjUyNDItMjQuODQ2ODQ5NzYtMTQuNTU2ODIzOTYtMzcuNzQzOTAzMDYtMi42MDg0MDgzMS03Ljc3Njg5NTUyLTUuMjE2ODE2NjQtMTUuNzQyOTY2MjMtMTMuOTg3OTE3NTQtMTcuMDcxMzM1MTEtOS41NTU0MTg0OS0xLjUxNzU0NDA3LTEzLjI3ODE2NTM1IDYuNjM5MDgyNjctMTcuMDI0Mzg2NTEgMTMuNDY3MzQwNTUtMTQuOTM2NTU1MTggMjcuODgxOTM3OS0yMC43NDU3NTI1MiA1OC42MDk3ODg3NC0yMC4xNTMzNzE4MSA4OS43MTU5ODk5NiAxLjI4MTQyMDI5IDY5Ljk5MDY3ODc5IDMwLjI1NDIyMjQzIDEyNS43NTQ1NTQ1OSA4Ny43NzMxNDY5MSAxNjUuMzk3MTEzNzkgNi41NDM4MDQ2NiA0LjU1MTI1MTM0IDguMjI3MDQ5NjIgOS4xMDM4ODM1NSA2LjE2NDA3MzQ0IDE1Ljc0MTU4NTM3LTMuOTExOTIyMDYgMTMuNjU2NTE1NzMtOC42MDY3ODA4NSAyNi45MzQ2ODEwOS0xMi43MDc4NzgwOSA0MC41OTExOTY4NC0yLjYwOTc4OTE1IDguNzI1NTMzMTYtNi41MjAzMzAzNyAxMC42MjE0Mjc2MS0xNS42OTYwMTc2NCA2LjgyODI1Nzg3LTMxLjU1NzczNjE2LTEzLjQ2NzM0MDU1LTU4LjgyMzgxOTA2LTMzLjM4MzIwNzczLTgyLjkzNjA2MTUxLTU3LjQ3MDU5NTA1LTQwLjg5Nzc0MzUtNDAuNDAyMDIxNjQtNzcuODg0OTQ1NzgtODQuOTc1NTYzNDEtMTIzLjk5OTUwNTkyLTExOS44NzQ5MzQzOGE1NDUuMzE2MTM0NDcgNTQ1LjMxNjEzNDQ3IDAgMCAwLTMyLjg4NDcyNDItMjIuOTUwOTU1MzJjLTQ3LjA2MzE5Nzc3LTQ2LjY1OTk5MjI2IDYuMTY0MDczNDQtODQuOTc0MTgyNTcgMTguNDkzNjAxMTMtODkuNTI2ODE0NzYgMTIuODczNTc4OTktNC43NDE4MDczOSA0LjQ4MDgyODQ3LTIxLjA1MzY4MDAzLTM3LjE3NjM3NzQ1LTIwLjg2NDUwNDg0cy03OS43NTg3NDY3NyAxNC40MTU5NzgxOS0xMjguMzE2MDE0MzMgMzMuMzgzMjA3NzRjLTcuMTExMzMwMjQgMi44NDQ1MzIwOS0xNC41ODE2NzkwOSA0LjkzMDk4MjU4LTIyLjIxNDk2NzE2IDYuNjM5MDgyNjgtNDQuMDk5OTEzMzctOC41MzYzNTc5Ni04OS44NTgyMTY1Ny0xMC40MzIyNTI0Mi0xMzcuNjgwODc2NzctNC45MzIzNjM0Mi05MC4wMjM5MTc0NSAxMC4yNDMwNzcyMy0xNjEuOTM1MzQ1ODMgNTMuNjc4ODA2MTUtMjE0LjgwNjM2MDEzIDEyNy44NDEwMDUwOC02My40OTM4MjI3MyA4OS4xNDcwODM1NC03OC40NTUyMzMwNSAxOTAuNDM0NTE5NTgtNjAuMTI3MzMyOCAyOTYuMDgyNjUwOTQgMTkuMjA0NzM0MTcgMTExLjMzOTk1NzI1IDc0Ljg5NjgwNjI0IDIwMy41MjIxMjg5MSAxNjAuNDQxMjc2MDggMjc1LjU5Nzg3NzM3IDg4LjcyMDQwMzcyIDc0LjczMTEwNTMzIDE5MC44ODQ2NzM3MSAxMTEuMzM5OTU3MjUgMzA3LjQ0MDA2NjcxIDEwNC4zMjI1MjQxOCA3MC43OTU3MDg5OS00LjE3NDI4MTggMTQ5LjYwNTgxODEzLTEzLjg0NzA3MTc3IDIzOC41MTUzOTcwNS05MC42NjYwMDg0NSAyMi40Mjg5OTc0OSAxMS4zODA4OTAwNyA0NS45NzIzMzM1MSAxNS45MzM1MjIyNiA4NC45OTkwMzc3IDE5LjM0Njk2MDc3IDMwLjA4NzE0MDY5IDIuODQ0NTMyMDkgNTkuMDM2NDY4NTQtMS41MTc1NDQwNyA4MS40NDE5OTE3Ni02LjI1OTM1MTQzIDM1LjExMzQwMTI5LTcuNTg2MzM5NDggMzIuNjcwNjkzODctNDAuNzgwMzcyMDIgMTkuOTg2MjkwMDYtNDYuODQ5MTY3NDUtMTAyLjkyMjM1MTU5LTQ4LjkzNjk5ODc3LTgwLjMyNzY1MzIxLTI5LjAyMTEzMTU3LTEwMC44NTkzNzUzOS00NS4xNDI0NDgxOSA1Mi4zMDIxMDc4NS02My4xNjI0MjA5MyAxMzEuMTEyMjE2OTktMTI4Ljc5MTAyMzU2IDE2MS45MzUzNDU4NS0zNDEuNDE1NjU1MTkgMi40NDEzMjY1Ny0xNi44ODA3NzkwNiAwLjM3ODM1MDM5LTI3LjUwMjIwNjY3IDAtNDEuMTU4NzIyNDEtMC4xOTA1NTYwMy04LjM0NTgwMTkzIDEuNjU4Mzg5ODItMTEuNTcxNDQ2MSAxMS4wMjQ2MzMxNC0xMi41MTg3MDI5IDI1Ljc3MjAxMzEyLTMuMDM1MDg4MTIgNTAuODA5NDE4OTItMTAuMjQzMDc3MjMgNzMuNzgzODQ4NTItMjMuMTQwMTMwNTEgNjYuNjY5NzU2NjItMzcuMTc2Mzc3NDggOTMuNTc5NTgyNTgtOTguMjUyMzQ3OTMgOTkuOTM0MjEyMDQtMTcxLjQ2NzI5MDA0IDAuOTQ4NjM3NjQtMTEuMTkwMzM0MDMtMC4xODkxNzUxOC0yMi43NjAzOTkyOS0xMS43ODQwOTU1Ny0yOC42NDAwMTk1MU03MDkuMzkzOTc4OSA3OTMuMTk0MzgyMDRjLTk5LjcyMTU2MjU2LTgwLjA0MzItMTQ4LjExMzEyOTIxLTEwNi40MDc1OTM4MS0xNjguMDk5NDE5MjgtMTA1LjI2OTc4MDk4LTE4LjY4Mjc3NjM0IDEuMTM3ODEyODQtMTUuMzE2Mjg2NDEgMjIuOTUwOTU1MzMtMTEuMjE1MTg5MTcgMzcuMTc2Mzc3NDcgNC4yOTE2NTMyOCAxNC4wMzYyNDY5NyA5LjkxMDI5NDU4IDIzLjcwOTAzNjk0IDE3Ljc1NzYxMzAxIDM2LjAzODU2NDY1IDUuNDA3MzcyNjYgOC4xNTY2MjY3NCA5LjE1MzU5MzgyIDIwLjI5NTU5ODQyLTUuNDI4MDg1MjkgMjkuMzk5NDgxOTYtMzIuMTI2NjQyNTkgMjAuMjk1NTk4NDItODcuOTYyMzIyMTEtNi44MjgyNTc4Ny05MC41NjkzNDk1OS04LjE1NTI0NTkxLTY1LjAxMTM2Njc4LTM5LjA3MzY1Mjc3LTExOS4zNzc4MzE2Ny05MC42NjYwMDg0NC0xNTcuNjY4NTQ3NzEtMTYxLjIyNDIxMjgyLTM2Ljk4NTgyMTQ1LTY3LjkwNDIyODMyLTU4LjQ0MjcwNy0xNDAuNzM5NDM5MjItNjEuOTk5NzUyOTYtMjE4LjUwNTYzMjY2LTAuOTQ4NjM3NjQtMTguNzc4MDU0MzUgNC40ODA4Mjg0Ny0yNS40MTcxMzcwMiAyMi43NjE3ODAxNC0yOC44MzE5NTY0YTIyMC40OTY4MDUxNSAyMjAuNDk2ODA1MTUgMCAwIDEgNzMuMDQ3ODYwNC0xLjg5NTg5NDQ0YzEwMS44MDkzOTM4OCAxNS4xNzU0NDA2NSAxODguNDkwMjk1NzEgNjEuNjQ0ODc2ODUgMjYxLjEzNDk1MDU1IDEzNS4yMzk1NTAyMSA0MS40NjgwMzA3NiA0MS45MTY4MDQwMiA3Mi44MzUyMTA5IDkxLjk5MTYxNTYzIDEwNS4xNzQ1MDI5NiAxNDAuOTI4NjE0NCAzNC4zNTUzMTk2NyA1MS45NjkzMjUyMyA3MS4zNDI1MjE5NyAxMDEuNDc1MjMwNCAxMTguNDA1NzE5NzUgMTQyLjA2NTA0NjM4IDE2LjYxOTgwMDE0IDE0LjIyNTQyMjE3IDI5Ljg3MzExMDM3IDI1LjAzNzQwNTgxIDQyLjU4MDk4ODQ0IDMzLjAwMzQ3NjUyLTM4LjI5MDcxNjAyIDQuMzYzNDU3LTEwMi4xODYzNjM0MiA1LjMxMDcxMzgtMTQ1Ljg4MzA3MTI1LTI5Ljk2ODM4ODM4bTQ3LjgyMTI3OTM4LTMxMy45MTIwNjc2NmMwLTguMzQ1ODAxOTMgNi41NDUxODU1LTE0Ljk4NDg4NDYyIDE0Ljc3MDg1NDI3LTE0Ljk4NDg4NDYycTIuNzk3NTgzNTEgMC4wNDgzMjk0MiA1LjAyNjI2MDYxIDAuOTQ4NjM3NjVhMTQuODY2MTMyMyAxNC44NjYxMzIzIDAgMCAxIDkuNTMxOTQ0MjEgMTQuMDM2MjQ2OTcgMTQuNzk0MzI4NTggMTQuNzk0MzI4NTggMCAwIDEtMTQuNzQ3Mzc5OTkgMTQuOTg0ODg0NjEgMTQuNjI4NjI3NjggMTQuNjI4NjI3NjggMCAwIDEtMTQuNTgxNjc5MS0xNC45ODQ4ODQ2MW0xNDguNDkyODYwNDMgNzcuNzY2MTkzNDZjLTkuNTA4NDY5OTEgMy45ODM3MjU3Ny0xOS4wMzkwMzMyNyA3LjM5ODU0NTEyLTI4LjIxNDcyMDUzIDcuNzc2ODk1NTItMTQuMTc4NDczNTcgMC43NTk0NjI0NS0yOS42ODM5MzUxOC01LjEyMDE1Nzc3LTM4LjA3NjY4NTcxLTEyLjMyODE0Njg3LTEzLjA4NzYwOTMyLTExLjE5MTcxNDg3LTIyLjQzMDM3ODMzLTE3LjQ1MTA2NjMxLTI2LjM0MjMwMDM3LTM2Ljk4NzIwMjI4LTEuNjgzMjQ0OTYtOC4zNDU4MDE5My0wLjc1OTQ2MjQ1LTIxLjI0Mjg1NTIyIDAuNzM1OTg4MTYtMjguNjQwMDE5NTEgMy4zNjY0ODk5Mi0xNS45MzM1MjIyNi0wLjM3OTczMTIzLTI2LjE3NTIxODYzLTExLjM4MDg5MDA3LTM1LjQ2OTY1ODIyLTguOTYxNjU2OTUtNy41ODc3MjAzMy0yMC4zNjc0MDIxMy05LjY3NDE3MDgxLTMyLjg4NDcyNDItOS42NzQxNzA4MS00LjY3MTM4NDUgMC04Ljk2MTY1Njk1LTIuMDg1MDY5NjUtMTIuMTM4OTcxNjgtMy43OTMxNjk3NGExMi40NDY4OTkxOCAxMi40NDY4OTkxOCAwIDAgMS01LjQwNTk5MTgxLTE3LjQ0OTY4NTQ4YzEuMzAzNTEzNzQtMi42NTUzNTY5MSA3LjY1ODE0MzItOS4xMDUyNjQzOSA5LjE1MjIxMjk2LTEwLjI0MzA3NzIyIDE2Ljk5ODE1MDU0LTkuODYzMzQ2MDEgMzYuNjA2MDkwMjItNi42Mzc3MDE4MyA1NC43MTk5NjAxMyAwLjc1OTQ2MjQ1IDE2LjgxMDM1NjE4IDcuMDE3NDMzMDcgMjkuNDk0NzU5OTggMTkuOTE1ODY3MTkgNDcuODIyNjYwMjQgMzguMTI1MDE1MTEgMTguNjgyNzc2MzQgMjIuMDAyMzE3NjcgMjIuMDQ5MjY2MjUgMjguMDcyNDkzOTMgMzIuNjcwNjkzODYgNDQuNTczNTQxNzkgOC40MTc2MDU2NSAxMi44OTcwNTMzIDE2LjA3NTc0ODg2IDI2LjE3NTIxODYzIDIxLjI5MjU2NTQ5IDQxLjM0Nzg5NzU5IDMuMTk5NDA4MTggOS40ODQ5OTU2MS0wLjkyNTE2MzM1IDE3LjI2MDUxMDI4LTExLjk0OTc5NjQ3IDIyLjAwMjMxNzY3IiBmaWxsPSIjNEQ2QkZFIiBwLWlkPSI0MTEzIj48L3BhdGg+PC9zdmc+",
    BASE_URL: "https://api.deepseek.com/anthropic",
    model: "deepseek-chat",
    opusModel: "deepseek-v4-pro",
    sonnetModel: "deepseek-v4-flash",
    haikuModel: "deepseek-reasoner",
    balanceApi: "https://api.deepseek.com/user/balance"
  },
  {
    name: "OpenRouter",
    key: "openrouter",
    icon: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNzc3MTgyOTA0ODQ5IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjMxNDMiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHBhdGggZD0iTTE2MC41NDQgNTAxLjk4NGMyMS41NjggMCAxMDUuMDg4LTE4LjYyNCAxNDguMjg4LTQzLjEwNCA0My4yLTI0LjQ4IDQzLjItMjQuNDggMTMyLjQ4LTg3Ljg0IDExMi45Ni04MC4xOTIgMTkyLjg5Ni01My4zNDQgMzIzLjkwNC01My4zNDQiIGZpbGw9IiMwMDAwMDAiIHAtaWQ9IjMxNDQiPjwvcGF0aD48cGF0aCBkPSJNNDc4Ljc4NCA0MjMuODcybC0xLjIxNiAwLjg2NGMtODguMjU2IDYyLjY1Ni05MC43NTIgNjQuNDE2LTEzNi44IDkwLjQ5Ni0yOC44NjQgMTYuMzg0LTY2Ljk0NCAyOC44LTk3LjUwNCAzNi45OTItMjkuMTIgNy43NDQtNjIuNjU2IDE0LjU2LTgyLjcyIDE0LjU2di0xMjkuNmMtMC4yNTYgMC0wLjE2IDAgMC4zMi0wLjA2NCAxLjQwOC0wLjEyOCA1Ljg4OC0wLjY0IDE0LjExMi0yLjE0NCA5LjcyOC0xLjc5MiAyMS45Mi00LjUxMiAzNC45MTItOCAyNy4zOTItNy4yNjQgNTIuNjcyLTE2LjM1MiA2Ny4wMDgtMjQuNDhsMy4yLTEuNzkyYzM2LjgzMi0yMC44OTYgMzcuMDU2LTIwLjk5MiAxMjMuNjgtODIuNDk2IDEwOC44MzItNzcuMjQ4IDIwMi44OC03Mi4zODQgMjk1LjE2OC02Ny41ODQgMjIuMTQ0IDEuMTUyIDQ0LjE2IDIuMjcyIDY2LjI3MiAyLjI3MnYxMjkuNmMtMzQuNzg0IDAtNjQtMS4yOC04OS42LTIuNDMyLTgyLjk3Ni0zLjY0OC0xMjcuMi01LjYtMTk2LjgzMiA0My44NHoiIGZpbGw9IiMwMDAwMDAiIHAtaWQ9IjMxNDUiPjwvcGF0aD48cGF0aCBkPSJNODkxLjkzNiAzMTguNDk2bC0yMjEuMzc2IDEyNy44MDhWMTkwLjY4OGwyMjEuMzc2IDEyNy44MDh6IiBmaWxsPSIjMDAwMDAwIiBwLWlkPSIzMTQ2Ij48L3BhdGg+PHBhdGggZD0iTTY2OS44NTYgMTg5LjQ0bDIyMy41MiAxMjkuMDU2LTIyMy41MiAxMjkuMDU2VjE4OS40NHogbTEuNDQgMi40OTZ2MjUzLjEybDIxOS4yLTEyNi41Ni0yMTkuMi0xMjYuNTZ6IiBmaWxsPSIjMDAwMDAwIiBwLWlkPSIzMTQ3Ij48L3BhdGg+PHBhdGggZD0iTTE1Ni4xNiA1MDIuMDhjMjEuNjMyIDAgMTA1LjEyIDE4LjYyNCAxNDguMzIgNDMuMTA0IDQzLjIgMjQuNDggNDMuMiAyNC40OCAxMzIuNDggODcuODA4IDExMi45OTIgODAuMjI0IDE5Mi44OTYgNTMuMzQ0IDMyMy45MzYgNTMuMzQ0IiBmaWxsPSIjMDAwMDAwIiBwLWlkPSIzMTQ4Ij48L3BhdGg+PHBhdGggZD0iTTE1Ni41NzYgNTY2LjkxMmMtMC40OC0wLjA2NC0wLjYwOC0wLjA2NC0wLjM1Mi0wLjA2NHYtMTI5LjZjMjAuMDY0IDAgNTMuNiA2LjgxNiA4Mi43MiAxNC41OTIgMzAuNTkyIDguMTI4IDY4LjY0IDIwLjYwOCA5Ny41MDQgMzYuOTYgNDYuMDggMjYuMTEyIDQ4LjU0NCAyNy44NCAxMzYuOCA5MC40OTZsMS4yMTYgMC44NjRjNjkuNjMyIDQ5LjQwOCAxMTMuODU2IDQ3LjQ1NiAxOTYuODY0IDQzLjg0IDI1LjU2OC0xLjE1MiA1NC43ODQtMi40MzIgODkuNi0yLjQzMnYxMjkuNTY4Yy0yMi4xMTIgMC00NC4xNiAxLjE1Mi02Ni4zMDQgMi4zMDQtOTIuMjU2IDQuNzY4LTE4Ni4zMDQgOS42MzItMjk1LjEzNi02Ny42MTYtODYuNjU2LTYxLjQ3Mi04Ni44NDgtNjEuNi0xMjMuNzEyLTgyLjQ2NGEyMTYyLjE3NiAyMTYyLjE3NiAwIDAgMC0zLjItMS44MjRjLTE0LjMzNi04LjA5Ni0zOS42MTYtMTcuMjE2LTY2Ljk3Ni0yNC40OGE0NzMuMTIgNDczLjEyIDAgMCAwLTM0Ljk0NC04IDE4NS43NiAxODUuNzYgMCAwIDAtMTQuMDgtMi4xNDR6IiBmaWxsPSIjMDAwMDAwIiBwLWlkPSIzMTQ5Ij48L3BhdGg+PHBhdGggZD0iTTg4Ny41ODQgNjg1LjU2OGwtMjIxLjM3Ni0xMjcuODA4djI1NS41ODRsMjIxLjM3Ni0xMjcuODA4eiIgZmlsbD0iIzAwMDAwMCIgcC1pZD0iMzE1MCI+PC9wYXRoPjxwYXRoIGQ9Ik02NjUuNTA0IDU1Ni40OGwyMjMuNTIgMTI5LjA4OC0yMjMuNTIgMTI5LjAyNHYtMjU4LjA4eiBtMS40NCAyLjQ5NnYyNTMuMTJsMjE5LjItMTI2LjUyOC0yMTkuMi0xMjYuNTkyeiIgZmlsbD0iIzAwMDAwMCIgcC1pZD0iMzE1MSI+PC9wYXRoPjwvc3ZnPg==",
    BASE_URL: "https://openrouter.ai/api",
    model: "openrouter/free",
    opusModel: "anthropic/claude-opus-4.7",
    sonnetModel: "openai/gpt-5.5",
    haikuModel: "google/gemini-3.1-pro-preview",
    balanceApi: "https://openrouter.ai/api/v1/credits"
  },
  {
    name: "硅基流动",
    key: "siliconflow",
    icon: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNzc3MTgyODgxMjY0IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjI4NTAiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHBhdGggZD0iTTg3NC45Mjk5MzEgNDMzLjUzODIxNUg2NDIuMTc0OXYtNTguODI4MTk0YzAtODguODgxNzI5IDY0LjU4MzEyNi0xNTMuNDY0ODU1IDE1OC41ODAzNTEtMTUzLjQ2NDg1NWg3NC4xNzQ2OGM2MC4xMDcwNjgtMS4yNzg4NzQgMTA4LjcwNDI3Mi01MC41MTU1MTUgMTA4LjcwNDI3Mi0xMTAuNjIyNTgzcy00Ny45NTc3NjctMTA5LjM0MzcwOS0xMDguNzA0MjcyLTExMC42MjI1ODNoLTc0LjE3NDY4QzU2Mi44ODQ3MjUgMCA0MjYuMDQ1MjMgMTUxLjU0NjU0NCA0MjYuMDQ1MjMgMzg0LjMwMTU3NHYzOS42NDUwODhDMjQ1LjA4NDU4OCAzNzMuNDMxMTQ3IDYwLjkyNjc2MiA0OTUuNTYzNTk0IDM4LjU0NjQ3MSA2ODIuMjc5MTY4czEyNy44ODczNzkgMzQ5LjEzMjU0NSAzMTUuODgxODI2IDM0MS40NTkzMDJhMzA1LjA3NTM0MyAzMDUuMDc1MzQzIDAgMCAwIDI4Ni40Njc3My0zNjYuMzk3MzQxaDIzNC4wMzM5MDRjNjIuMDI1Mzc5IDAgMTExLjkwMTQ1Ny00OS44NzYwNzggMTExLjkwMTQ1Ni0xMTEuOTAxNDU3cy00OS44NzYwNzgtMTExLjkwMTQ1Ny0xMTEuOTAxNDU2LTExMS45MDE0NTd6TTQ3MC44MDU4MTIgNzI5LjU5NzQ5OGMwIDQuNDc2MDU4LTEuMjc4ODc0IDguMzEyNjgtMS45MTgzMSAxMi4xNDkzMDEtMC42Mzk0MzcgMy44MzY2MjEtMS45MTgzMTEgOC4zMTI2OC0zLjE5NzE4NSAxMi4xNDkzMDEtMS4yNzg4NzQgMy44MzY2MjEtMi41NTc3NDggNy42NzMyNDMtNC40NzYwNTggMTEuNTA5ODY0LTEuOTE4MzExIDMuODM2NjIxLTMuMTk3MTg0IDcuNjczMjQzLTUuMTE1NDk1IDExLjUwOTg2NHMtMy44MzY2MjEgNy4wMzM4MDYtNi4zOTQzNjkgMTAuODcwNDI4Yy0yLjU1Nzc0OCAzLjE5NzE4NC01LjExNTQ5NSA3LjAzMzgwNi03LjY3MzI0MyAxMC4yMzA5OS0yLjU1Nzc0OCAzLjE5NzE4NC01Ljc1NDkzMiA2LjM5NDM2OS04LjMxMjY4IDkuNTkxNTU0LTMuMTk3MTg0IDMuMTk3MTg0LTUuNzU0OTMyIDUuNzU0OTMyLTkuNTkxNTUzIDguMzEyNjc5LTMuMTk3MTg0IDIuNTU3NzQ4LTYuMzk0MzY5IDUuMTE1NDk1LTEwLjIzMDk5IDcuNjczMjQzYTYwLjc0NjUwNSA2MC43NDY1MDUgMCAwIDEtMTAuODcwNDI4IDYuMzk0MzY5Yy0zLjgzNjYyMSAxLjkxODMxMS03LjY3MzI0MyAzLjgzNjYyMS0xMS41MDk4NjQgNS4xMTU0OTUtMy44MzY2MjEgMS45MTgzMTEtNy42NzMyNDMgMy4xOTcxODQtMTEuNTA5ODY0IDQuNDc2MDU4cy04LjMxMjY4IDEuOTE4MzExLTEyLjE0OTMwMSAzLjE5NzE4NWwtMTIuMTQ5MzAxIDEuOTE4MzFjLTMuODM2NjIxIDAuNjM5NDM3LTguMzEyNjggMC0xMi43ODg3MzggMGgtMTIuNzg4NzM4Yy00LjQ3NjA1OCAwLTguMzEyNjgtMS4yNzg4NzQtMTIuMTQ5MzAxLTEuOTE4MzEtMy44MzY2MjEtMC42Mzk0MzctOC4zMTI2OC0xLjkxODMxMS0xMi4xNDkzMDEtMy4xOTcxODVzLTcuNjczMjQzLTIuNTU3NzQ4LTExLjUwOTg2NC00LjQ3NjA1OGMtMy44MzY2MjEtMS45MTgzMTEtNy42NzMyNDMtMy4xOTcxODQtMTEuNTA5ODY0LTUuMTE1NDk1cy03LjAzMzgwNi0zLjgzNjYyMS0xMC44NzA0MjctNi4zOTQzNjljLTMuMTk3MTg0LTIuNTU3NzQ4LTcuMDMzODA2LTUuMTE1NDk1LTEwLjIzMDk5MS03LjY3MzI0My0zLjE5NzE4NC0yLjU1Nzc0OC02LjM5NDM2OS01Ljc1NDkzMi05LjU5MTU1My04LjMxMjY3OS0zLjE5NzE4NC0zLjE5NzE4NC01Ljc1NDkzMi01Ljc1NDkzMi04LjMxMjY4LTkuNTkxNTU0LTIuNTU3NzQ4LTMuMTk3MTg0LTUuMTE1NDk1LTYuMzk0MzY5LTcuNjczMjQyLTEwLjIzMDk5YTYwLjc0NjUwNSA2MC43NDY1MDUgMCAwIDEtNi4zOTQzNjktMTAuODcwNDI4Yy0xLjkxODMxMS0zLjgzNjYyMS0zLjgzNjYyMS03LjY3MzI0My01LjExNTQ5Ni0xMS41MDk4NjQtMS45MTgzMTEtMy44MzY2MjEtMy4xOTcxODQtNy42NzMyNDMtNC40NzYwNTgtMTEuNTA5ODY0cy0xLjkxODMxMS04LjMxMjY4LTMuMTk3MTg0LTEyLjE0OTMwMWwtMS45MTgzMTEtMTIuMTQ5MzAxYy0wLjYzOTQzNy0zLjgzNjYyMSAwLTguMzEyNjggMC0xMi43ODg3MzhWNzA0LjAyMDAyMmMwLTQuNDc2MDU4IDEuMjc4ODc0LTguMzEyNjggMS45MTgzMTEtMTIuMTQ5MzAxIDAuNjM5NDM3LTMuODM2NjIxIDEuOTE4MzExLTguMzEyNjggMy4xOTcxODQtMTIuMTQ5MzAxczIuNTU3NzQ4LTcuNjczMjQzIDQuNDc2MDU4LTExLjUwOTg2NGMxLjkxODMxMS0zLjgzNjYyMSAzLjE5NzE4NC03LjY3MzI0MyA1LjExNTQ5Ni0xMS41MDk4NjRzMy44MzY2MjEtNy4wMzM4MDYgNi4zOTQzNjktMTAuODcwNDI3YzIuNTU3NzQ4LTMuMTk3MTg0IDUuMTE1NDk1LTcuMDMzODA2IDcuNjczMjQyLTEwLjIzMDk5IDIuNTU3NzQ4LTMuMTk3MTg0IDUuNzU0OTMyLTYuMzk0MzY5IDguMzEyNjgtOS41OTE1NTQgMy4xOTcxODQtMy4xOTcxODQgNS43NTQ5MzItNS43NTQ5MzIgOS41OTE1NTMtOC4zMTI2OCAzLjE5NzE4NC0yLjU1Nzc0OCA2LjM5NDM2OS01LjExNTQ5NSAxMC4yMzA5OTEtNy42NzMyNDJhNjAuNzQ2NTA1IDYwLjc0NjUwNSAwIDAgMSAxMC44NzA0MjctNi4zOTQzNjljMy44MzY2MjEtMS45MTgzMTEgNy42NzMyNDMtMy44MzY2MjEgMTEuNTA5ODY0LTUuMTE1NDk1IDMuODM2NjIxLTEuOTE4MzExIDcuNjczMjQzLTMuMTk3MTg0IDExLjUwOTg2NC00LjQ3NjA1OXM4LjMxMjY4LTEuOTE4MzExIDEyLjE0OTMwMS0zLjE5NzE4NGwxMi4xNDkzMDEtMS45MTgzMTFjMy44MzY2MjEtMC42Mzk0MzcgOC4zMTI2OCAwIDEyLjc4ODczOCAwaDEyLjc4ODczOGM0LjQ3NjA1OCAwIDguMzEyNjggMS4yNzg4NzQgMTIuMTQ5MzAxIDEuOTE4MzExIDMuODM2NjIxIDAuNjM5NDM3IDguMzEyNjggMS45MTgzMTEgMTIuMTQ5MzAxIDMuMTk3MTg0czcuNjczMjQzIDIuNTU3NzQ4IDExLjUwOTg2NCA0LjQ3NjA1OWMzLjgzNjYyMSAxLjkxODMxMSA3LjY3MzI0MyAzLjE5NzE4NCAxMS41MDk4NjQgNS4xMTU0OTVzNy4wMzM4MDYgMy44MzY2MjEgMTAuODcwNDI4IDYuMzk0MzY5YzMuMTk3MTg0IDIuNTU3NzQ4IDcuMDMzODA2IDUuMTE1NDk1IDEwLjIzMDk5IDcuNjczMjQyIDMuMTk3MTg0IDIuNTU3NzQ4IDYuMzk0MzY5IDUuNzU0OTMyIDkuNTkxNTUzIDguMzEyNjggMy4xOTcxODQgMy4xOTcxODQgNS43NTQ5MzIgNS43NTQ5MzIgOC4zMTI2OCA5LjU5MTU1NCAyLjU1Nzc0OCAzLjE5NzE4NCA1LjExNTQ5NSA2LjM5NDM2OSA3LjY3MzI0MyAxMC4yMzA5OSAyLjU1Nzc0OCAzLjE5NzE4NCA0LjQ3NjA1OCA3LjAzMzgwNiA2LjM5NDM2OSAxMC44NzA0MjcgMS45MTgzMTEgMy44MzY2MjEgMy44MzY2MjEgNy42NzMyNDMgNS4xMTU0OTUgMTEuNTA5ODY0IDEuOTE4MzExIDMuODM2NjIxIDMuMTk3MTg0IDcuNjczMjQzIDQuNDc2MDU4IDExLjUwOTg2NHMxLjkxODMxMSA4LjMxMjY4IDMuMTk3MTg1IDEyLjE0OTMwMWwxLjkxODMxIDEyLjE0OTMwMWMwLjYzOTQzNyAzLjgzNjYyMSAwIDguMzEyNjggMCAxMi43ODg3Mzh2MTIuNzg4NzM4eiIgZmlsbD0iIzdDM0FFRCIgcC1pZD0iMjg1MSI+PC9wYXRoPjwvc3ZnPg==",
    BASE_URL: "https://api.siliconflow.cn/",
    model: "Qwen/Qwen3-8B",
    opusModel: "Pro/zai-org/GLM-5.1",
    sonnetModel: "Pro/moonshotai/Kimi-K2.6",
    haikuModel: "MiniMaxAI/MiniMax-M2.5"
  },
  {
    name: "Kimi 月之暗面",
    key: "kimi",
    icon: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNzc3MTgyOTQzMzM3IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjUxMjYiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHBhdGggZD0iTTEwMjQgMG0wIDE4Ni4xOTczMzNsMCA2NTEuNjA1MzM0cTAgMTg2LjE5NzMzMy0xODYuMTk3MzMzIDE4Ni4xOTczMzNsLTY1MS42MDUzMzQgMHEtMTg2LjE5NzMzMyAwLTE4Ni4xOTczMzMtMTg2LjE5NzMzM2wwLTY1MS42MDUzMzRxMC0xODYuMTk3MzMzIDE4Ni4xOTczMzMtMTg2LjE5NzMzM2w2NTEuNjA1MzM0IDBxMTg2LjE5NzMzMyAwIDE4Ni4xOTczMzMgMTg2LjE5NzMzM1oiIGZpbGw9IiMwMDAwMDAiIHAtaWQ9IjUxMjciPjwvcGF0aD48cGF0aCBkPSJNNTgwLjE4MTMzMyA0NTkuOTQ2NjY3YzU3LjE3MzMzMyAxLjMyMjY2NyAxMDQuMTkyIDUyLjM1MiAxMDQuMTkyIDExNS4ydjIzMi41MzMzMzNhMi4wOTA2NjcgMi4wOTA2NjcgMCAwIDEtMi4xMzMzMzMgMi4xMzMzMzNoLTk5LjkyNTMzM2EyLjA5MDY2NyAyLjA5MDY2NyAwIDAgMS0yLjEzMzMzNC0yLjEzMzMzM2wtMS43MDY2NjYtMjk0LjAxNmMwLTEuMjgtMi4yMTg2NjctMS40OTMzMzMtMi41Ni0wLjI5ODY2Ny0xMy4zOTczMzMgNDMuOTQ2NjY3LTUyLjczNiA1Ni4zMi05OS44NCA1Ni4zMkgzMDQuMzg0YTIuMDkwNjY3IDIuMDkwNjY3IDAgMCAwLTIuMDkwNjY3IDIuMDkwNjY3djIzNS45NDY2NjdhMi4wOTA2NjcgMi4wOTA2NjcgMCAwIDEtMi4wOTA2NjYgMi4wOTA2NjZIMTk0Ljg1ODY2N2EyLjA5MDY2NyAyLjA5MDY2NyAwIDAgMS0yLjA0OC0yLjEzMzMzM1YyNDEuNTc4NjY3YzAtMS4xNTIgMC44OTYtMi4wNDggMi4wNDgtMi4wNDhoMTA1LjM4NjY2NmMxLjEwOTMzMyAwIDIuMDQ4IDAuODk2IDIuMDQ4IDIuMDQ4djIxNi4zMmMwIDEuMTUyIDAuOTM4NjY3IDIuMTMzMzMzIDIuMDkwNjY3IDIuMTMzMzMzaDEzNS4yNTMzMzNhMi4xMzMzMzMgMi4xMzMzMzMgMCAwIDAgMS44NzczMzQtMS4yOGw5Ni44OTYtMjE4LjAyNjY2N2EyLjA5MDY2NyAyLjA5MDY2NyAwIDAgMSAxLjkyLTEuMTk0NjY2aDExNi43Nzg2NjZjMS40OTMzMzMgMCAyLjUxNzMzMyAxLjU3ODY2NyAxLjg3NzMzNCAyLjk0NGwtNjYuMjYxMzM0IDE0Mi4yOTMzMzNjLTE5Ljc1NDY2NyAzNi4yMjQtMzQuMzA0IDYxLjg2NjY2Ny02Ny4yNDI2NjYgNzIuNzg5MzMzLTEuMTk0NjY3IDAuNDI2NjY3LTAuOTM4NjY3IDIuNDMyIDAuMjk4NjY2IDIuNDMyaDU0LjR6IiBmaWxsPSIjRkZGRkZGIiBwLWlkPSI1MTI4Ij48L3BhdGg+PHBhdGggZD0iTTcyNy4zMzg2NjcgMjI3Ljk2OGMtMTEuNzMzMzMzIDkuODU2LTE5LjQxMzMzMyAyNS45NDEzMzMtMTkuNDEzMzM0IDUwLjIxODY2NyAwIDIyLjc0MTMzMyA3LjI1MzMzMyA0MC40MDUzMzMgMTguMTMzMzM0IDUwLjk4NjY2Ni01LjY3NDY2NyA5LjM4NjY2Ny0xMS40MzQ2NjcgMTUuOTU3MzMzLTE1Ljc4NjY2NyAxOS40OTg2NjctMC43MjUzMzMgMC41NTQ2NjctMC4xNzA2NjcgMi4yMTg2NjcgMC43MjUzMzMgMi4xMzMzMzNsNjQuNDI2NjY3LTQuNjkzMzMzYzE0LjM3ODY2Ny0xLjA2NjY2NyAyNi43MDkzMzMtNi40ODUzMzMgMzcuMDM0NjY3LTE1Ljc0NCAxMi4zNzMzMzMtMTAuNDk2IDE5LjQ5ODY2Ny0yOC41NDQgMTkuNDk4NjY2LTUyLjE4MTMzMyAwLTI0LjI3NzMzMy03LjEyNTMzMy00MC4zNjI2NjctMTkuNDk4NjY2LTUwLjIxODY2Ny0xMS43NzYtOS44MTMzMzMtMjYuMTEyLTE0Ljc2MjY2Ny00My4wNTA2NjctMTQuNzYyNjY3LTE2LjI5ODY2NyAwLTMwLjI5MzMzMyA0Ljk0OTMzMy00Mi4wNjkzMzMgMTQuNzYyNjY3eiIgZmlsbD0iIzAwN0FGRiIgcC1pZD0iNTEyOSI+PC9wYXRoPjwvc3ZnPg==",
    BASE_URL: "https://api.moonshot.cn/anthropic",
    model: "kimi-k2.6",
    opusModel: "kimi-k2.6",
    sonnetModel: "kimi-k2.5",
    haikuModel: "",
    balanceApi: "https://api.moonshot.cn/v1/users/me/balance"
  }
];
const BUILTIN_TASKS = [
  { name: "npm run dev", command: "npm run dev", cwd: "", providerId: "" },
  { name: "npm run build", command: "npm run build", cwd: "", providerId: "" },
  { name: "npm run lint", command: "npm run lint", cwd: "", providerId: "" },
  { name: "npm run test", command: "npm run test", cwd: "", providerId: "" }
];
const DEFAULT_SETTINGS = {
  theme: "light",
  scrollback: 1e3,
  shell: "",
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  loginMode: "",
  wizardCompleted: false,
  activeProviderId: ""
};
const DATA_DIR$2 = path.join(os.homedir(), ".ClaudeKit");
function dataPath$2(file) {
  return path.join(DATA_DIR$2, file);
}
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR$2)) {
    fs.mkdirSync(DATA_DIR$2, { recursive: true });
  }
}
function ensureFile(file, defaultContent = {}) {
  const filePath = dataPath$2(file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2), "utf-8");
  }
}
function readJSON(file) {
  const filePath = dataPath$2(file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(`JSON 解析失败: ${filePath} — ${e.message}`);
    }
    throw e;
  }
}
function writeJSON(file, data) {
  const filePath = dataPath$2(file);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    throw new Error(`写入文件失败: ${filePath} — ${e.message}`);
  }
}
function initDataDir() {
  ensureDataDir();
  const providersPath = dataPath$2(DB_FILES.PROVIDERS);
  if (!fs.existsSync(providersPath)) {
    const providers = BUILTIN_PROVIDERS.map((p, i) => ({
      id: `builtin-${i}`,
      ...p
    }));
    writeJSON(DB_FILES.PROVIDERS, providers);
  }
  const tasksPath = dataPath$2(DB_FILES.TASKS);
  if (!fs.existsSync(tasksPath)) {
    const tasks = BUILTIN_TASKS.map((t, i) => ({
      id: `builtin-task-${i}`,
      ...t
    }));
    writeJSON(DB_FILES.TASKS, tasks);
  }
  ensureFile(DB_FILES.PROFILES, []);
  ensureFile(DB_FILES.ENV, {});
  ensureFile(DB_FILES.TERMINAL, { tabs: [], activeTabId: "" });
  ensureFile(DB_FILES.SETTINGS, DEFAULT_SETTINGS);
}
function registerDbIPC() {
  ensureDataDir();
  electron.ipcMain.handle(IPC_CHANNELS.DB_READ, async (_event, file) => {
    try {
      const data = readJSON(file);
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.DB_WRITE, async (_event, file, data) => {
    try {
      writeJSON(file, data);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.DB_DELETE, async (_event, file, key) => {
    try {
      if (key !== void 0 && key !== "") {
        const data = readJSON(file);
        if (Array.isArray(data)) {
          const filtered = data.filter(
            (item) => item.id !== key
          );
          writeJSON(file, filtered);
        } else {
          delete data[key];
          writeJSON(file, data);
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.DB_LIST, async (_event, file) => {
    try {
      const data = readJSON(file);
      if (Array.isArray(data)) {
        return { success: true, data };
      }
      return { success: true, data: Object.keys(data) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}
const sessions = /* @__PURE__ */ new Map();
path.join(os.homedir(), ".ClaudeKit");
function getShell() {
  if (process.platform === "win32") {
    return process.env.COMSPEC || "powershell.exe";
  }
  const shell = process.env.SHELL || "/bin/zsh";
  if (fs.existsSync(shell)) return shell;
  return "/bin/bash";
}
function getCwd() {
  return process.env.HOME ?? os.homedir();
}
function buildEnv(extraEnv) {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== void 0) {
      env[key] = value;
    }
  }
  if (extraEnv) {
    Object.assign(env, extraEnv);
  }
  if (!env.PATH) {
    env.PATH = "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin";
  }
  return env;
}
function sendToRenderer(channel, sessionId, data) {
  const windows = electron.BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, sessionId, data);
    }
  }
}
function registerTerminalIPC() {
  electron.ipcMain.handle(
    "terminal:create",
    async (_event, opts) => {
      try {
        const sessionId = `pty-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const cols = opts?.cols ?? 120;
        const rows = opts?.rows ?? 30;
        const cwd = opts?.cwd ?? getCwd();
        const env = buildEnv(opts?.envVars);
        let shell = opts?.shell || getShell();
        if (!fs.existsSync(shell)) {
          console.warn(`[terminal] shell not found: ${shell}, fallback to default`);
          shell = getShell();
        }
        const pty = nodePty.spawn(shell, [], {
          name: "xterm-256color",
          cols,
          rows,
          cwd,
          env
        });
        sessions.set(sessionId, pty);
        pty.onData((data) => {
          sendToRenderer("terminal:output", sessionId, data);
        });
        pty.onExit(({ exitCode, signal }) => {
          sendToRenderer("terminal:exit", sessionId, { exitCode, signal });
          sessions.delete(sessionId);
        });
        return { success: true, sessionId };
      } catch (e) {
        return { success: false, error: e.message, sessionId: "" };
      }
    }
  );
  electron.ipcMain.handle("terminal:destroy", async (_event, sessionId) => {
    try {
      const pty = sessions.get(sessionId);
      if (pty) {
        pty.kill();
        sessions.delete(sessionId);
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle(
    "terminal:resize",
    async (_event, sessionId, cols, rows) => {
      try {
        const pty = sessions.get(sessionId);
        if (pty) {
          pty.resize(cols, rows);
        }
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  );
  electron.ipcMain.handle("terminal:input", async (_event, sessionId, data) => {
    try {
      const pty = sessions.get(sessionId);
      if (pty) {
        pty.write(data);
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("terminal:list", async () => {
    return { success: true, sessions: Array.from(sessions.keys()) };
  });
}
function destroyAllTerminals() {
  for (const [id, pty] of sessions) {
    pty.kill();
  }
  sessions.clear();
}
function writeWithSudo$1(filePath, content) {
  return new Promise((resolve, reject) => {
    const tmpPath = filePath + ".tmp";
    const fd = fs.openSync(tmpPath, "w");
    fs.writeSync(fd, content);
    fs.closeSync(fd);
    const cmd = process.platform === "win32" ? `powershell.exe -Command "Move-Item -Force '${tmpPath}' '${filePath}'"` : `mv "${tmpPath}" "${filePath}"`;
    sudo.exec(cmd, {
      name: "ClaudeKit Shell Config Writer",
      icns: void 0
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message || "提权操作失败"));
      } else {
        resolve();
      }
    });
  });
}
function getDefaultShellConfigPath() {
  if (process.platform === "win32") {
    return path.join(os.homedir(), "Documents", "WindowsPowerShell", "Microsoft.PowerShell_profile.ps1");
  }
  const zshrc = path.join(os.homedir(), ".zshrc");
  if (fs.existsSync(zshrc)) return zshrc;
  const bashProfile = path.join(os.homedir(), ".bash_profile");
  if (fs.existsSync(bashProfile)) return bashProfile;
  return path.join(os.homedir(), ".bashrc");
}
function registerEnvIPC() {
  electron.ipcMain.handle("env:read", async () => {
    try {
      const shellPath = getDefaultShellConfigPath();
      if (!fs.existsSync(shellPath)) {
        return { success: true, data: `# ${shellPath}
# 文件不存在，保存后将自动创建`, path: shellPath };
      }
      const content = fs.readFileSync(shellPath, "utf-8");
      return { success: true, data: content, path: shellPath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("env:write", async (_event, content, filePath, useSudo = false) => {
    try {
      const targetPath = filePath || getDefaultShellConfigPath();
      if (useSudo) {
        await writeWithSudo$1(targetPath, content);
      } else {
        try {
          fs.writeFileSync(targetPath, content, "utf-8");
        } catch (e) {
          if (e.code === "EACCES") {
            await writeWithSudo$1(targetPath, content);
          } else {
            throw e;
          }
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("env:read-profile", async () => {
    try {
      const path2 = getDefaultShellConfigPath();
      let content = "";
      if (fs.existsSync(path2)) {
        content = fs.readFileSync(path2, "utf-8");
      }
      return { success: true, data: content, path: path2 };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("env:write-profile", async (_event, opts) => {
    try {
      if (opts.useSudo) {
        await writeWithSudo$1(opts.path, opts.content);
      } else {
        try {
          fs.writeFileSync(opts.path, opts.content, "utf-8");
        } catch (e) {
          if (e.code === "EACCES") {
            await writeWithSudo$1(opts.path, opts.content);
          } else {
            throw e;
          }
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("env:export-vars", async (_event, vars) => {
    try {
      const targetPath = getDefaultShellConfigPath();
      const isPowershell = targetPath.endsWith(".ps1");
      let content = "";
      if (fs.existsSync(targetPath)) {
        content = fs.readFileSync(targetPath, "utf-8");
      }
      const lines = content.split("\n").filter((line) => {
        const trimmed = line.trim();
        if (isPowershell) {
          return !/^\$env:ANTHROPIC_\w+\s*=/.test(trimmed);
        }
        return !/^export\s+ANTHROPIC_\w+=/.test(trimmed);
      });
      while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
        lines.pop();
      }
      lines.push("");
      lines.push("# === ClaudeKit — 模型商环境变量 ===");
      for (const [key, value] of Object.entries(vars)) {
        if (value) {
          lines.push(isPowershell ? `$env:${key} = "${value}"` : `export ${key}="${value}"`);
        }
      }
      lines.push("");
      const newContent = lines.join("\n");
      try {
        fs.writeFileSync(targetPath, newContent, "utf-8");
      } catch (e) {
        if (e.code === "EACCES") {
          await writeWithSudo$1(targetPath, newContent);
        } else {
          throw e;
        }
      }
      return { success: true, path: targetPath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("env:save-user-vars", async (_event, vars) => {
    if (process.platform !== "win32") {
      return { success: false, error: "仅 Windows 支持" };
    }
    try {
      let readUserVars = function() {
        try {
          const output = execSync('reg query "HKCU\\Environment"', { encoding: "utf-8", timeout: 5e3 });
          const result = {};
          for (const line of output.split(/\r?\n/)) {
            const parts = line.trim().split(/\s{2,}/);
            if (parts.length >= 3 && parts[1].startsWith("REG_")) {
              result[parts[0]] = parts.slice(2).join(" ");
            }
          }
          return result;
        } catch {
          return {};
        }
      };
      const { execSync } = await import("child_process");
      const currentVars = readUserVars();
      const newKeys = new Set(Object.keys(vars));
      for (const key of Object.keys(currentVars)) {
        if (!newKeys.has(key)) {
          execSync(`reg delete "HKCU\\Environment" /v "${key}" /f`, { encoding: "utf-8", timeout: 5e3 });
        }
      }
      for (const [key, value] of Object.entries(vars)) {
        if (currentVars[key] !== value) {
          const escapedValue = value.replace(/"/g, '\\"');
          execSync(`reg add "HKCU\\Environment" /v "${key}" /t REG_SZ /d "${escapedValue}" /f`, { encoding: "utf-8", timeout: 5e3 });
        }
      }
      try {
        execSync(
          `powershell.exe -NoProfile -Command "[System.Environment]::SetEnvironmentVariable('PATH', [System.Environment]::GetEnvironmentVariable('PATH', 'User'), 'User')"`,
          { encoding: "utf-8", timeout: 5e3, windowsHide: true }
        );
      } catch {
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("env:list", async () => {
    try {
      const sensitivePattern = /(?:secret|password|credential|private_key)/i;
      if (process.platform === "win32") {
        let readRegistry = function(key) {
          try {
            const output = execSync(`reg query "${key}"`, { encoding: "utf-8", timeout: 5e3 });
            const vars = {};
            const lines = output.split(/\r?\n/);
            for (const line of lines) {
              const parts = line.trim().split(/\s{2,}/);
              if (parts.length >= 3 && parts[1].startsWith("REG_")) {
                const name = parts[0];
                const value = parts.slice(2).join(" ");
                if (!sensitivePattern.test(name)) {
                  vars[name] = value;
                }
              }
            }
            return vars;
          } catch {
            return {};
          }
        };
        const { execSync } = await import("child_process");
        const system = readRegistry("HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment");
        const user = readRegistry("HKCU\\Environment");
        return { success: true, data: { system, user } };
      }
      const filtered = {};
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== void 0 && !sensitivePattern.test(key)) {
          filtered[key] = value;
        }
      }
      return { success: true, data: { system: filtered, user: {} } };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("system:get-os", async () => {
    return { success: true, platform: process.platform };
  });
  electron.ipcMain.handle("system:check-claude", async () => {
    try {
      const { execSync } = await import("child_process");
      const version = execSync("claude --version", { encoding: "utf-8", timeout: 5e3 }).trim();
      return { success: true, version };
    } catch {
      return { success: true, version: "未安装" };
    }
  });
  electron.ipcMain.handle("system:check-update", async (_event, currentVersion) => {
    try {
      const repo = process.env.GITHUB_REPO || "deajax/claudekit";
      const resp = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28"
        }
      });
      if (!resp.ok) {
        return { success: true, latest: currentVersion, body: "" };
      }
      const release = await resp.json();
      const latestTag = release.tag_name?.replace(/^v/, "") ?? currentVersion;
      return {
        success: true,
        latest: latestTag,
        body: release.body ?? ""
      };
    } catch {
      return {
        success: true,
        latest: currentVersion,
        body: ""
      };
    }
  });
  electron.ipcMain.handle("system:check-node", async () => {
    try {
      const { execSync } = await import("child_process");
      const version = execSync("node --version", { encoding: "utf-8", timeout: 5e3 }).trim();
      return { success: true, version };
    } catch {
      return { success: false, version: "未安装" };
    }
  });
  electron.ipcMain.handle("system:check-npm", async () => {
    try {
      const { execSync } = await import("child_process");
      const version = execSync("npm --version", { encoding: "utf-8", timeout: 5e3 }).trim();
      return { success: true, version };
    } catch {
      return { success: false, version: "未安装" };
    }
  });
  electron.ipcMain.handle("system:check-git", async () => {
    try {
      const { execSync } = await import("child_process");
      const version = execSync("git --version", { encoding: "utf-8", timeout: 5e3 }).trim();
      return { success: true, version };
    } catch {
      return { success: false, version: "未安装" };
    }
  });
  electron.ipcMain.handle("system:install-claude", async () => {
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);
      const { stdout } = await execAsync("npm install -g @anthropic-ai/claude-code", {
        encoding: "utf-8",
        timeout: 12e4
      });
      return { success: true, output: stdout || "" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("system:test-provider", async (_event, baseUrl, authToken, model, balanceApi) => {
    try {
      if (balanceApi) {
        const resp2 = await fetch(balanceApi, {
          headers: { Authorization: `Bearer ${authToken}` },
          signal: AbortSignal.timeout(1e4)
        });
        if (resp2.status === 401 || resp2.status === 403) {
          return { success: false, error: "认证失败（401/403），请检查 AUTH_TOKEN" };
        }
        if (!resp2.ok) {
          return { success: false, error: `余额接口返回 ${resp2.status}，请检查 network` };
        }
        return { success: true };
      }
      const apiUrl = baseUrl.replace(/\/+$/, "") + "/v1/messages";
      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "x-api-key": authToken
        },
        body: JSON.stringify({
          model: model || "claude-sonnet-4-6",
          max_tokens: 1,
          messages: [{ role: "user", content: "." }]
        }),
        signal: AbortSignal.timeout(15e3)
      });
      if (resp.status === 200 || resp.status === 400) {
        return { success: true };
      }
      if (resp.status === 401 || resp.status === 403) {
        return { success: false, error: "认证失败（401/403），请检查 AUTH_TOKEN" };
      }
      return { success: false, error: `服务器返回 ${resp.status}，请检查 BASE_URL 和网络连接` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("system:balance-query", async (_event, apiUrl, token) => {
    try {
      const resp = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await resp.json();
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}
function writeWithSudo(filePath, content) {
  return new Promise((resolve, reject) => {
    const tmpPath = filePath + ".tmp";
    const fd = fs.openSync(tmpPath, "w");
    fs.writeSync(fd, content);
    fs.closeSync(fd);
    const cmd = process.platform === "win32" ? `powershell.exe -Command "Move-Item -Force '${tmpPath}' '${filePath}'"` : `mv "${tmpPath}" "${filePath}"`;
    sudo.exec(cmd, {
      name: "ClaudeKit Config",
      icns: void 0
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message || "提权操作失败"));
      } else {
        resolve();
      }
    });
  });
}
function registerConfigIPC() {
  electron.ipcMain.handle("config:read", async () => {
    try {
      const configPath = path.join(os.homedir(), ".claude.json");
      if (!fs.existsSync(configPath)) {
        return { success: true, data: {} };
      }
      const raw = fs.readFileSync(configPath, "utf-8");
      const data = JSON.parse(raw);
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("config:write", async (_event, updates, useSudo = false) => {
    try {
      const configPath = path.join(os.homedir(), ".claude.json");
      let data = {};
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, "utf-8");
        data = JSON.parse(raw);
      }
      Object.assign(data, updates);
      const jsonContent = JSON.stringify(data, null, 2);
      if (useSudo) {
        await writeWithSudo(configPath, jsonContent);
      } else {
        try {
          fs.writeFileSync(configPath, jsonContent, "utf-8");
        } catch (e) {
          if (e.code === "EACCES") {
            await writeWithSudo(configPath, jsonContent);
          } else {
            throw e;
          }
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("config:read-help", async () => {
    try {
      const isDev = !electron.app.isPackaged;
      const helpPath = isDev ? path.join(electron.app.getAppPath(), "src", "help.md") : path.join(process.resourcesPath, "help.md");
      if (!fs.existsSync(helpPath)) {
        return { success: false, error: "帮助文档不存在" };
      }
      const content = fs.readFileSync(helpPath, "utf-8");
      return { success: true, data: content };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}
const DATA_DIR$1 = path.join(os.homedir(), ".ClaudeKit");
function dataPath$1(file) {
  return path.join(DATA_DIR$1, file);
}
function readProviders() {
  const fp = dataPath$1(DB_FILES.PROVIDERS);
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, "utf-8"));
}
function writeProviders(data) {
  const fp = dataPath$1(DB_FILES.PROVIDERS);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), "utf-8");
}
function registerProviderIPC() {
  electron.ipcMain.handle("provider:list", async () => {
    try {
      return { success: true, data: readProviders() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("provider:create", async (_event, provider) => {
    try {
      const providers = readProviders();
      providers.push(provider);
      writeProviders(providers);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("provider:update", async (_event, id, updates) => {
    try {
      const providers = readProviders();
      const idx = providers.findIndex(
        (p) => p.id === id
      );
      if (idx !== -1) {
        providers[idx] = { ...providers[idx], ...updates };
        writeProviders(providers);
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("provider:delete", async (_event, id) => {
    try {
      const filtered = readProviders().filter(
        (p) => p.id !== id
      );
      writeProviders(filtered);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("provider:reset", async () => {
    try {
      const providers = BUILTIN_PROVIDERS.map((p, i) => ({
        id: `builtin-${i}`,
        ...p
      }));
      writeProviders(providers);
      return { success: true, data: providers };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}
const DATA_DIR = path.join(os.homedir(), ".ClaudeKit");
function dataPath(file) {
  return path.join(DATA_DIR, file);
}
function readTasks() {
  const fp = dataPath(DB_FILES.TASKS);
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, "utf-8"));
}
function writeTasks(data) {
  const fp = dataPath(DB_FILES.TASKS);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), "utf-8");
}
function registerTaskIPC() {
  electron.ipcMain.handle("task:list", async () => {
    try {
      return { success: true, data: readTasks() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("task:create", async (_event, task) => {
    try {
      const tasks = readTasks();
      tasks.push(task);
      writeTasks(tasks);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("task:update", async (_event, id, updates) => {
    try {
      const tasks = readTasks();
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx !== -1) {
        tasks[idx] = { ...tasks[idx], ...updates };
        writeTasks(tasks);
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("task:delete", async (_event, id) => {
    try {
      const filtered = readTasks().filter((t) => t.id !== id);
      writeTasks(filtered);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("task:reset", async () => {
    try {
      const tasks = BUILTIN_TASKS.map((t, i) => ({
        id: `builtin-task-${i}`,
        ...t
      }));
      writeTasks(tasks);
      return { success: true, data: tasks };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}
function registerWindowIPC() {
  electron.ipcMain.handle("window:minimize", () => {
    const win = electron.BrowserWindow.getFocusedWindow();
    win?.minimize();
  });
  electron.ipcMain.handle("window:maximize", () => {
    const win = electron.BrowserWindow.getFocusedWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });
  electron.ipcMain.handle("window:close", () => {
    const win = electron.BrowserWindow.getFocusedWindow();
    win?.close();
  });
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    icon: path.join(__dirname, "../../build/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
function registerIpcModules() {
  registerDbIPC();
  registerTerminalIPC();
  registerEnvIPC();
  registerConfigIPC();
  registerProviderIPC();
  registerTaskIPC();
  registerWindowIPC();
}
electron.app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.claudekit.desktop");
  initDataDir();
  electron.app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  registerIpcModules();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("will-quit", () => {
  destroyAllTerminals();
});
