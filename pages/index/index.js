//index.js
const app = getApp()
let base64Data;

let upng = require('../../utils/UPNG');

function buildUrl(path) {
  return 'https://yep.skyaid.flyml.net/api/v1/' + path;
}

function reversedata(res) {
  var w = res.width;
  var h = res.height;
  let con = 0;
  for (var i = 0; i < h / 2; i++) {
    for (var j = 0; j < w * 4; j++) {
      con = res.data[(i * w * 4 + j) + ""];
      res.data[(i * w * 4 + j) + ""] = res.data[((h - i - 1) * w * 4 + j) + ""];
      res.data[((h - i - 1) * w * 4 + j) + ""] = con;
    }
  }
  return res;
};
function getBase64Image(canvasId, imgUrl, callback, imgWidth, imgHeight) {
  const ctx = wx.createCanvasContext(canvasId);
  ctx.drawImage(imgUrl, 0, 0, imgWidth, imgHeight);
  ctx.draw(false, () => {
    wx.canvasGetImageData({
      canvasId: canvasId,
      x: 0,
      y: 0,
      width: imgWidth,
      height: imgHeight,
      success(res) {
        debugger
        var result = res;
        var pngData = upng.encode([result.data.buffer], result.width, result.height);
        var base64 = wx.arrayBufferToBase64(pngData);
        let platform = wx.getSystemInfoSync().platform
        if (platform == 'ios') {
          // 兼容处理：ios获取的图片上下颠倒
          base64 = reversedata(base64);
        };
        var base64Data = 'data:image/png;base64,' + base64;
        callback(base64Data);
      },
    })
  })
};

function wxRequest(params) {
  let succFunc = function (res) {
    console.log('[success] ' + params.url, res);
  }
  let errorFunc = function (res) {
    console.error(res);
    res = res || {};
    wx.showToast({
      title: JSON.stringify(res.data || res),
      icon: 'none',
      duration: 5000
    });
  }
  return wx.request({
    url: params.url,
    method: params.method,
    header: params.header,
    data: params.data,
    success: function (res) {
      if (res.ret) {
        (params.success || succFunc)(res);
      } else {
        (params.error || errorFunc)(res);
      }
    },
    fail: errorFunc
  });
}

Page({
  data: {
    imageUrl: '',
    user_code: '',
    userInfo: {},
    img: {
      height: 0,
      width: 0
    },
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo')
  },
  //事件处理函数
  bindViewTap: function () {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  clearImg: function() {
    this.setData({imageUrl: ''});
  },
  uploadImg: function () {
    wx.showLoading();
    wxRequest({
      url: buildUrl('account/poc'),
      method: 'POST',
      header: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      data: {
        'image_base64': base64Data,
        'code': this.data.user_code
      },
      success: function (res) {
        wx.showToast({
          title: JSON.stringify(res.data || res),
          duration: 5000
        });
      }
    });
  },
  selectImg: function () {
    var self = this;
    wx.chooseImage({
      count: 1, // 设置最多可以选择的图片张数，默认9,如果我们设置了多张,那么接收时//就不在是单个变量了,
      sizeType: ['original', 'compressed'], // original 原图，compressed 压缩图，默认二者都有
      sourceType: ['album', 'camera'], // album 从相册选图，camera 使用相机，默认二者都有
      success: function (res) {
        let imageUrl = res.tempFilePaths[0];
        console.log(res);
        wx.getImageInfo({
          src: res.tempFilePaths[0],
          success: function (imgInfo) {
            console.log('image info:', imgInfo);
            // screen with 750rpx; 
            debugger
            self.setData({
              img: {
                height: (300 / imgInfo.width * imgInfo.height) + 'px',
                width: '300px'
              }
            });
            getBase64Image('myCanvas', imageUrl, function (base64) {
              base64Data = base64;
            }, 300, (300 / imgInfo.width * imgInfo.height));
          }
        });
        self.setData({ imageUrl: imageUrl });
      },
      fail: function (res) {
        // fail
      },
      complete: function (res) {
        // complete
      }
    })
  },
  onLoad: function () {
    let self = this;
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    } else if (this.data.canIUse) {
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        console.log('getUserInfo-->', res);
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
        wx.login({
          success: function (res) {
            console.log('login success:', res);
            self.setData({
              user_code: res.code
            })
          }
        });
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          console.log('getUserInfo-->', res);
          app.globalData.userInfo = res.userInfo
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        }
      })
    }
  },
  getUserInfo: function (e) {
    console.log(e)
    if (!e.detail.userInfo) {
      return;
    }
    let self = this;
    wx.login({
      success: function (res) {
        console.log('login success:', res);
        self.setData({
          user_code: res.code
        })
      }
    });
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  }
})
