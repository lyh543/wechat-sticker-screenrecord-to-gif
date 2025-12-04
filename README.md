# 微信表情包录屏转 GIF

[在线使用](https://wechat-stickers.lyh543.cn/)

这个项目可以将微信聊天记录中的表情包和屏幕录制视频转换为 GIF 格式，方便分享和使用。

转换过程全程本地完成，无需上传到任何服务器，保障隐私安全。

## 使用方法

<img src="docs/assets/how-to-use-cn_cut_400p_10hz.gif" alt="使用方法" width="270" height="600" />

### 如何创建视频

<img src="docs/assets/how-to-create-screenrecord.gif" alt="使用方法" width="270" height="600" />

### 录屏示例

[录屏示例](docs/assets/screenrecord-example.mp4)

## TODO

* 优化性能
* 优化卡顿问题
* 非 debug 模式下减少计算量
* i18n 国际化
* README 添加简介

## Known Issues
* bug: Android 录制的视频，在 Windows Chrome 上可能会报错：视频帧读取失败
