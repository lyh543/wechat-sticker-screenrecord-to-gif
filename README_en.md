

# WeChat Animated Sticker Screen Recording to GIF

English | [简体中文](README.md) | [Online Deployment](https://wechat-stickers.lyh543.cn/)

This project converts WeChat native animated stickers from screen recordings to GIF format, making them easy to share and use.

> For user-uploaded GIF stickers, you can download the original image directly through WeChat File Transfer Helper web version without using this tool. Reference: [How to save WeChat GIF stickers to computer? - Zhihu](https://zhuanlan.zhihu.com/p/36128196)

The entire conversion process is completed locally without uploading to any server, ensuring privacy and security.

## Features

* Convert WeChat native animated sticker screen recordings to GIF
* Automatic loop cycle detection
* Optional border cropping
* Customizable export frame rate and size

## How to Use

<img src="docs/assets/how-to-use-cn_cut_400p_10hz.gif" alt="How to Use" width="270" height="600" />

### How to Record Animated Stickers

1. Open a WeChat chat window and find the chat record containing animated stickers.
2. Tap the sticker to enter full-screen view mode.
3. If it's a WeChat native sticker, the sticker information will be displayed. Slightly zoom in with two fingers, and WeChat will hide the sticker information.
4. Start screen recording. The recording should include 2-3 complete animation loops to help identify the loop cycle.
5. Stop recording and save the video file.

<img src="docs/assets/how-to-create-screenrecord.gif" alt="How to Use" width="270" height="600" />

Screen recording example:

[Recording Example](docs/assets/screenrecord-example.mp4)

## TODO

* Optimize performance
* Fix stuck issues
* Reduce computation in non-debug mode
* i18n

## Known Issues
* bug: Videos recorded on Android may fail to load on Windows Chrome: video frame reading error
