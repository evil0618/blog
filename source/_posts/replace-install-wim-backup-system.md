---
title: 替换 install.wim 实现开机状态备份当前系统
date: 2026-06-17 12:10:00
categories:
  - 系统运维
tags:
  - Windows
  - DISM
  - 系统备份
  - WIM
---

## 前言

重装系统是每个 Windows 用户都绕不开的话题，但每次重装后重新配置环境、安装软件的过程极其痛苦。如果能将当前已配置好的系统直接打包成镜像，下次重装时直接恢复，就能省去大量重复劳动。

本文介绍一种**在开机状态下备份当前运行系统**的方法——通过 DISM 工具捕获系统分区为 WIM 镜像，然后替换 Windows 安装介质中的 `install.wim`，从而实现"用自己的系统镜像安装系统"。

> **适用场景**：系统还能正常开机，希望制作一个包含当前所有软件和配置的安装镜像。

## 原理简述

Windows 安装介质（U盘/ISO）中的 `sources\install.wim` 就是系统镜像文件，安装程序会将它恢复到目标分区。如果我们用 DISM 把当前系统捕获为新的 WIM 文件并替换掉原始的 `install.wim`，安装程序就会安装我们自定义的系统。

关键在于：**DISM 支持对正在运行的系统分区执行捕获操作**，无需进入 PE 环境。

## 准备工作

### 1. 所需工具

- **DISM**：Windows 自带，无需额外安装
- **Windows 安装 U 盘**：用于提供引导和安装程序框架
- 足够的磁盘空间（存放捕获的 WIM 文件，通常 10-30GB）

### 2. 查看分区信息

首先确认系统分区的盘符和大小：

```cmd
diskpart
list volume
exit
```

记住系统分区（通常是 C:）的盘符，后续命令会用到。

### 3. 准备 Windows 安装 U 盘

如果你还没有安装 U 盘，使用以下命令创建（需要 8GB+ U 盘）：

```cmd
:: 清除 U 盘并创建可引导分区（将 X 替换为 U 盘对应的磁盘编号）
diskpart
list disk
select disk X
clean
create partition primary
format fs=ntfs quick label="InstallUSB"
active
assign letter=U
exit

:: 使用 dism 将 ISO 中的安装文件直接部署到 U 盘（挂载 ISO 后）
:: 假设 ISO 挂载为 I:，U 盘为 U:
xcopy I:\* U:\ /E /H /Y
```

或者使用更简单的方式——直接用资源管理器将 ISO 内容全部复制到 U 盘根目录。

## 捕获系统镜像

### 1. 创建临时目录

选择一个非系统分区来存放捕获的 WIM 文件（空间需大于系统已用空间）：

```cmd
mkdir D:\Backup
```

### 2. 执行 DISM 捕获

```cmd
dism /Capture-Image /ImageFile:D:\Backup\install.wim /CaptureDir:C:\ /Name:"CustomSystem" /Description:"自定义系统备份" /Compress:max /CheckIntegrity
```

参数说明：

| 参数 | 说明 |
|------|------|
| `/ImageFile` | 输出的 WIM 文件路径 |
| `/CaptureDir` | 要捕获的分区（系统分区） |
| `/Name` | 镜像名称，可自定义 |
| `/Description` | 镜像描述，可自定义 |
| `/Compress:max` | 最大压缩，减小文件体积（耗时更长） |
| `/CheckIntegrity` | 捕获后校验完整性 |

> **耗时参考**：取决于系统已用空间和磁盘速度，通常 20-60 分钟。压缩率越低速度越快，文件越大。如果追求速度可将 `/Compress:max` 改为 `/Compress:fast`。

### 3. 捕获过程注意事项

- **捕获期间不要进行大量文件操作**，避免数据不一致
- **不要关闭命令行窗口**，耐心等待进度条完成
- 捕获过程中系统正常运行，可以轻度使用（浏览网页等）

### 4. 验证捕获结果

```cmd
dism /Get-WimInfo /WimFile:D:\Backup\install.wim
```

输出应包含镜像索引、名称、描述和大小等信息，确认捕获成功。

## 替换 install.wim

### 1. 定位安装 U 盘中的 install.wim

安装 U 盘中的路径为：

```
U盘根目录\sources\install.wim
```

### 2. 备份原始文件（可选）

```cmd
ren U:\sources\install.wim install.wim.bak
```

### 3. 处理 install.esd 的情况

部分新版 Windows 安装介质使用 `install.esd` 而非 `install.wim`。如果 U 盘中是 `.esd` 文件，需要先删除它：

```cmd
del U:\sources\install.esd
```

> 安装程序会优先查找 `install.wim`，只要该文件存在就会使用它。

### 4. 复制捕获的镜像到 U 盘

```cmd
copy D:\Backup\install.wim U:\sources\install.wim
```

如果 WIM 文件超过 4GB 且 U 盘为 FAT32 格式，需要将 U 盘格式化为 NTFS 或 exFAT：

```cmd
:: 格式化 U 盘为 NTFS（会清除所有数据，确保已备份 ISO 文件）
format U: /FS:NTFS /Q

:: 然后重新复制 ISO 文件和 install.wim
```

**更推荐的做法**：直接将 U 盘格式化为 NTFS 后再操作，避免 FAT32 的 4GB 文件限制。

### 5. 处理超过 4GB 的 WIM 文件（FAT32 U 盘）

如果 U 盘必须使用 FAT32（某些主板不支持 NTFS 引导），可以将 WIM 拆分：

```cmd
dism /Split-Image /ImageFile:D:\Backup\install.wim /SWMFile:U:\sources\install.swm /FileSize:3500
```

这会生成 `install.swm`、`install2.swm` 等文件，每个不超过 3500MB。安装程序支持从 SWM 文件安装。

> 注意：拆分后删除 U 盘中的 `install.wim`，只保留 SWM 文件。

## 使用自定义镜像安装系统

1. 将 U 盘插入目标电脑
2. 进入 BIOS/UEFI 设置 U 盘为第一启动项
3. 正常进入 Windows 安装界面
4. 按照常规流程安装——安装程序会使用你替换后的 `install.wim` 作为系统镜像
5. 安装完成后，你的所有软件和配置都会保留

## 仅备份不制作安装盘（恢复用）

如果你只是想备份系统，不需要制作安装 U 盘，可以直接用捕获的 WIM 文件恢复：

### 恢复到分区

进入 Windows PE 或使用另一系统，执行：

```cmd
:: 格式化目标分区（谨慎操作）
format C: /FS:NTFS /Q

:: 从 WIM 恢复系统
dism /Apply-Image /ImageFile:D:\Backup\install.wim /Index:1 /ApplyDir:C:\

:: 修复引导
bcdboot C:\Windows /S C: /f UEFI
```

### 修复引导（BIOS 模式）

如果是传统 BIOS 引导而非 UEFI：

```cmd
bcdboot C:\Windows /S C: /f BIOS
```

## 高级用法

### 1. 捕获前清理系统（减小镜像体积）

```cmd
:: 清理 Windows 更新缓存
dism /Online /Cleanup-Image /StartComponentCleanup /ResetBase

:: 清理临时文件
del /q/f/s %TEMP%\*
del /q/f/s C:\Windows\Temp\*

:: 清理回收站
rd /s /q C:\$Recycle.Bin

:: 运行磁盘清理
cleanmgr /sageset:1
cleanmgr /sagerun:1
```

### 2. 捕获前执行 Sysprep（通用化）

如果镜像要在不同硬件上使用，建议先通用化：

```cmd
:: 进入审计模式
sysprep /audit /reboot

:: 通用化并关机（下次开机会进入 OOBE 设置界面）
sysprep /generalize /oobe /shutdown
```

> **注意**：Sysprep 会重置系统 SID、驱动和部分配置。如果只是备份到同一台机器恢复，**不需要**执行 Sysprep。

### 3. 追加多个镜像到同一 WIM

可以在一个 WIM 文件中包含多个系统镜像：

```cmd
:: 第一个镜像用 /Capture-Image
dism /Capture-Image /ImageFile:D:\Backup\install.wim /CaptureDir:C:\ /Name:"System-V1" /Compress:max

:: 后续镜像用 /Append-Image（追加，不会重新压缩已有镜像）
dism /Append-Image /ImageFile:D:\Backup\install.wim /CaptureDir:C:\ /Name:"System-V2"
```

查看所有镜像：

```cmd
dism /Get-WimInfo /WimFile:D:\Backup\install.wim
```

恢复时指定索引：

```cmd
dism /Apply-Image /ImageFile:D:\Backup\install.wim /Index:2 /ApplyDir:C:\
```

### 4. 导出镜像以压缩体积

多次追加后 WIM 文件可能包含冗余数据，导出可重新压缩：

```cmd
dism /Export-Image /SourceImageFile:D:\Backup\install.wim /SourceIndex:1 /DestinationImageFile:D:\Backup\install_optimized.wim /Compress:max
```

## 常见问题

### Q: 捕获时提示"无法捕获正在运行的系统"

确保以**管理员身份**运行命令提示符，并确认 `/CaptureDir` 指向正确的系统分区。

### Q: 安装时提示"Windows 无法安装到这个磁盘"

可能需要加载磁盘驱动。在安装界面按 `Shift+F10` 打开命令行：

```cmd
diskpart
list disk
select disk 0
clean
convert gpt
create partition efi size=100
format fs=fat32 quick
create partition msr size=16
create partition primary
format fs=ntfs quick
exit
```

### Q: 恢复后无法引导

重新修复引导：

```cmd
:: UEFI 模式
bcdboot C:\Windows /S V: /f UEFI
:: 其中 V: 是 EFI 分区盘符

:: 查看 EFI 分区
diskpart
list volume
select volume X    :: 选择 EFI 分区
assign letter=V
exit
```

### Q: 捕获的镜像太大

- 捕获前执行清理操作（见高级用法第 1 条）
- 使用 `/Compress:max` 参数
- 排除不需要的大文件夹（如虚拟机磁盘）

排除特定目录：

```cmd
:: 使用 /ConfigFile 排除目录
dism /Capture-Image /ImageFile:D:\Backup\install.wim /CaptureDir:C:\ /Name:"CustomSystem" /Compress:max /ConfigFile:D:\Backup\wim_exclude.ini
```

`wim_exclude.ini` 内容示例：

```ini
[ExclusionList]
\Windows\Temp
\Users\Administrator\AppData\Local\Temp
\pagefile.sys
\hiberfil.sys
\$Recycle.Bin
\Windows\SoftwareDistribution
\Windows\Installer
```

## 完整命令速查

```cmd
:: ========== 捕获系统 ==========
dism /Capture-Image /ImageFile:D:\Backup\install.wim /CaptureDir:C:\ /Name:"CustomSystem" /Description:"自定义系统备份" /Compress:max /CheckIntegrity

:: ========== 验证镜像 ==========
dism /Get-WimInfo /WimFile:D:\Backup\install.wim

:: ========== 替换安装盘文件 ==========
del U:\sources\install.esd
copy D:\Backup\install.wim U:\sources\install.wim

:: ========== FAT32 拆分（如需要） ==========
dism /Split-Image /ImageFile:D:\Backup\install.wim /SWMFile:U:\sources\install.swm /FileSize:3500

:: ========== 从 WIM 恢复 ==========
dism /Apply-Image /ImageFile:D:\Backup\install.wim /Index:1 /ApplyDir:C:\
bcdboot C:\Windows /S C: /f UEFI

:: ========== 捕获前清理 ==========
dism /Online /Cleanup-Image /StartComponentCleanup /ResetBase
cleanmgr /sagerun:1

:: ========== 导出优化 ==========
dism /Export-Image /SourceImageFile:D:\Backup\install.wim /SourceIndex:1 /DestinationImageFile:D:\Backup\install_opt.wim /Compress:max
```

## 总结

通过 DISM 捕获 + 替换 install.wim 的方式，可以在系统正常运行时完成备份，制作出包含所有软件和配置的安装镜像。相比第三方备份工具，这种方法：

- **无需额外软件**，Windows 自带 DISM
- **开机状态即可操作**，不必进入 PE
- **制作的是标准安装镜像**，兼容性好
- **支持增量备份**，可追加多个版本

建议在系统状态良好时定期捕获备份，关键时刻能省下大量重装和配置的时间。
