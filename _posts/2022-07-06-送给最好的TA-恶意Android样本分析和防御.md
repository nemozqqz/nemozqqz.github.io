---
layout: post
title: 送给最好的TA--恶意Android样本分析和防御
---




Andorid APK脱壳不可避免使用真机，虚拟机总是存在壳兼容性/被检测的问题，然而真机有一个问题就是很难重置，恶意apk运行时会带来潜在的风险。这篇主要讲一个恶意APK *送给最好的TA* 的~~社会性死亡~~分析过程。

## Where there's smoke, there's fire
有一天同事注意到脱壳手机的桌面图片变了，就问我怎么回事，我当时感觉是有人传了个apk修改了桌面。根据wallpaper的修改时间找到了当时对应的apk。

```bash
/data/system/users/0/wallpaper
/data/system/users/0/wallpaper_orig
```

## One-Click to Malicous APK 

这个样本是360加固。 和之前流传的lua实现版本不同，使用了E4A(易安卓)框架，使得逆向工作在脱壳后非常简单。在应用启动后，立即开始恶意行为： 
 
![送给最好的TA](/assets/android_malware_best_TA_clock_event.png)


恶意的行为：

* 隐藏导航栏/状态栏，阻止用户退出app
* 音量置为最大，播放奇怪的音乐
* 屏幕亮度置为最大
* 修改壁纸为奇怪的图片
* 戏弄用户的对话框
* 时钟不断重复以上操作

E4A框架的中文API对应的Android API和所需权限：

| **E4A** | **Android API** | **Permission** |
|:---------------:|:---------------:|:---------------:|
| 隐藏导航栏 |  WindowManager.LayoutParams.systemUiVisibility | N/A |
| 隐藏状态栏 | Window.setFlags FLAG\_FULLSCREEN | N/A |
| 置音量 | AudioManager. setStreamVolume | N/A |
| 播放音乐 | MediaPlayer.setDataSource | WRITE\_EXTERNAL\_STORAGE |
| 置屏幕亮度 | WindowManager.LayoutParams screenBrightness | N/A |
| 保持屏幕常亮 | PowerManager.newWakeLock  ON\_AFTER\_RELEASE SCREEN\_BRIGHT\_WAKE\_LOCK | WAKE\_LOCK |
| 设置壁纸 | Context.setWallpaper | SET\_WALLPAPER  |


样本申请的权限， 其中`DISABLE_KEYGUARD`,`SYSTEM_ALERT_WINDOW`,
`SYSTEM_OVERLAY_WINDOW` (疑似typo，并没有该权限), `FOREGROUND_SERVICE` 也是很危险的权限，但是我没有分析出哪里使用了这些权限==。

```xml
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
  <uses-permission android:name="com.android.launcher.permission.INSTALL_SHORTCUT"/>
  <uses-permission android:name="android.permission.SET_WALLPAPER"/>
  <uses-permission android:name="android.permission.GET_TASKS"/>
  <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES"/>
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
  <uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>
  <uses-permission android:name="android.permission.DISABLE_KEYGUARD"/>
  <uses-permission android:name="android.permission.MOUNT_UNMOUNT_FILESYSTEMS"/>
  <uses-permission android:name="android.permission.READ_PHONE_STATE"/>
  <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
  <uses-permission android:name="android.permission.WRITE_SETTINGS"/>
  <uses-permission android:name="android.permission.INTERNET"/>
  <uses-permission android:name="android.permission.SYSTEM_OVERLAY_WINDOW"/>
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
  <uses-permission android:name="com.android.launcher.permission.READ_SETTINGS"/>
  <uses-permission android:name="android.permission.WAKE_LOCK"/>
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
  <uses-permission android:name="android.permission.CHANGE_CONFIGURATION"/>
```



## Defensive Android Setup
如果实在没办法(例如脱壳)，需要在真机运行不明来源的apk：

* 记录日志！
* 关闭摄像头/蓝牙/wifi
* 保持静音: `setStreamVolume` 在 勿扰模式Do Not Disturb 下会失败，抛出异常。
* 保证有一个可靠的adb shell， 不要相信UI
* 更细力度的，控制app对系统服务的访问 SDK Runtime? VirtualApp as Guard？

尽可能保证没有人和手机在样本分析过程中受到伤害， 真正实现

> No Androids were harmed

