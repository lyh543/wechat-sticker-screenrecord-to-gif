# 微信动态表情录屏转 GIF

[English README](README_en.md) | 中文文档 | [在线使用](https://wechat-stickers.lyh543.cn/)

这个项目可以将微信聊天记录中的原生动态表情，通过屏幕录制视频转换为 GIF 格式，方便分享和使用。

> 对于用户上传的 GIF 动态表情，可以直接通过文件管理助手网页版下载原图，无需使用本工具。参考：[怎么把微信里的gif动图表情保存到电脑使用？ - 知乎](https://zhuanlan.zhihu.com/p/36128196)

转换过程全程本地完成，无需上传到任何服务器，保障隐私安全。

## 功能

* 微信原生动态表情录屏视频转换为 GIF
* 表情包循环周期自动识别
* 可选裁剪表情包边框
* 自定义导出帧率、导出尺寸

## 使用方法

<img src="docs/assets/how-to-use-cn_cut_400p_10hz.gif" alt="使用方法" width="270" height="600" />

### 如何对动态表情录屏

1. 打开微信聊天窗口，找到包含动态表情的聊天记录。
2. 点击表情，进入全屏查看模式。
3. 如果是微信的原生表情包，会展示表情包的相关信息。需要双指略微放大表情包，微信就会隐藏表情包信息。
4. 开始录屏。录屏内容应当包含完整的表情包动画循环 2-3 遍，便于识别表情循环周期。
5. 停止录屏，保存视频文件。

<img src="docs/assets/how-to-create-screenrecord.gif" alt="使用方法" width="270" height="600" />

录屏文件示例：

[录屏示例](docs/assets/screenrecord-example.mp4)

## TODO

* 优化性能
* 优化卡顿问题
* 非 debug 模式下减少计算量
* i18n 国际化

## Known Issues
* bug: Android 录制的视频，在 Windows Chrome 上可能会报错：视频帧读取失败
