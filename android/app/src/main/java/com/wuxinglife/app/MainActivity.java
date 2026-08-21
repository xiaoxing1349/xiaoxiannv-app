package com.wuxinglife.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPInputStream;

public class MainActivity extends Activity {
    private WebView webView;
    private android.widget.LinearLayout backBar;

    private int dp(int val) { return Math.round(val * getResources().getDisplayMetrics().density); }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.WHITE);

        // 布局：最顶层为返回栏，下方为 WebView（外部新闻详情页打开时显示返回栏，可一键返回）
        android.widget.LinearLayout root = new android.widget.LinearLayout(this);
        root.setOrientation(android.widget.LinearLayout.VERTICAL);
        backBar = new android.widget.LinearLayout(this);
        backBar.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        backBar.setGravity(android.view.Gravity.CENTER_VERTICAL);
        backBar.setVisibility(android.view.View.GONE);
        backBar.setBackgroundColor(0xFF1F2A44);
        backBar.setPadding(dp(14), dp(0), dp(14), dp(0));
        android.widget.TextView backTxt = new android.widget.TextView(this);
        backTxt.setText("‹  返回新闻列表");
        backTxt.setTextColor(0xFFFFFFFF);
        backTxt.setTextSize(16);
        backTxt.setPadding(0, dp(14), 0, dp(14));
        backBar.addView(backTxt, new android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT));
        backBar.setOnClickListener(v -> goHome());
        root.addView(backBar, new android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT));
        root.addView(webView, new android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                0, 1f));
        setContentView(root);

        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setAllowFileAccess(true);
        ws.setAllowContentAccess(true);
        ws.setLoadWithOverviewMode(true);
        ws.setUseWideViewPort(true);
        ws.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ws.setSafeBrowsingEnabled(false);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // 放行 asset 与 http/https
                view.loadUrl(request.getUrl().toString());
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                updateBackBar(url);
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                updateBackBar(url);
                super.onPageFinished(view, url);
            }

            // 只有停留在主应用 index 时不显示返回栏；进入任何外部链接页时显示，便于返回
            private void updateBackBar(String url) {
                boolean external = !(url != null && url.contains("index.html"));
                if (backBar != null) {
                    runOnUiThread(() -> backBar.setVisibility(external ? android.view.View.VISIBLE : android.view.View.GONE));
                }
            }
        });

        // 原生桥：提供"保存图片到相册"能力，解决 WebView 内下载图片无反应的问题
        webView.addJavascriptInterface(new SaveBridge(), "Android");

        // 原生桥：提供"直连抓取网页"能力，file:// 页面也能拉取外部实时新闻（彻底解决联网问题）
        webView.addJavascriptInterface(new NetBridge(), "AndroidNet");

        // Android 10 以下保存图片需要运行时存储权限，启动时请求一次
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q &&
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                checkSelfPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE)
                        != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{android.Manifest.permission.WRITE_EXTERNAL_STORAGE}, 100);
        }

        // 加载打包在 assets/www 内的应用
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    // 图片保存桥
    private class SaveBridge {
        // dataUrl 形如：data:image/png;base64,xxx
        @JavascriptInterface
        public void saveImage(String dataUrl, String fileName) {
            try {
                String base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                if (bitmap == null) {
                    toast("图片解析失败");
                    return;
                }
                String name = (fileName == null || fileName.isEmpty())
                        ? "WuXing_" + System.currentTimeMillis() : fileName;
                boolean ok = saveToGallery(bitmap, name);
                toast(ok ? "已保存到相册" : "保存失败，请重试");
                bitmap.recycle();
            } catch (Exception e) {
                toast("保存失败：" + e.getMessage());
            }
        }
    }

    // 网络直连桥：让 file:// 页面能抓取外部内容（新闻等）
    private class NetBridge {
        // JS 调用：AndroidNet.get(url, callbackFnName)
        // 结果通过 window.__netCallback.success/fail(callbackFnName, dataOrMsg) 回调
        @JavascriptInterface
        public void get(final String url, final String callbackFnName) {
            new Thread(() -> {
                String body;
                try {
                    body = httpGet(url, 12000);
                } catch (Exception e) {
                    body = null;
                }
                final String res = body;
                runOnUiThread(() -> {
                    try {
                        String js;
                        if (res != null) {
                            js = "window.__netcb && window.__netcb.success('" + safeJs(callbackFnName) + "', " + toJsonStr(res) + ");";
                        } else {
                            js = "window.__netcb && window.__netcb.fail('" + safeJs(callbackFnName) + "', 'fetch-error');";
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                            webView.evaluateJavascript(js, null);
                        } else {
                            webView.loadUrl("javascript:" + js);
                        }
                    } catch (Exception ignored) {}
                });
            }).start();
        }

        private String httpGet(String urlStr, int timeoutMs) throws Exception {
            URL url = new URL(urlStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(timeoutMs);
            conn.setReadTimeout(timeoutMs);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent",
                "Mozilla/5.0 (Linux; Android 12; wuxing) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36");
            conn.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/json,*/*;q=0.8");
            conn.setRequestProperty("Accept-Language", "zh-CN,zh;q=0.9");
            conn.setRequestProperty("Accept-Encoding", "gzip");
            conn.setInstanceFollowRedirects(true);
            int code = conn.getResponseCode();
            if (code != 200 && code != 206) throw new Exception("HTTP " + code);
            InputStream is;
            is = conn.getInputStream();
            String enc = conn.getContentEncoding();
            if (enc != null && enc.contains("gzip")) {
                is = new GZIPInputStream(is);
            }
            BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            char[] buf = new char[8192];
            int n;
            while ((n = br.read(buf)) != -1) sb.append(buf, 0, n);
            br.close();
            conn.disconnect();
            return sb.toString();
        }

        private String safeJs(String s) {
            return (s == null ? "" : s.replace("'", "\\'"));
        }

        private String toJsonStr(String s) {
            if (s == null) return "null";
            StringBuilder sb = new StringBuilder("\"");
            for (int i = 0; i < s.length(); i++) {
                char c = s.charAt(i);
                if (c == '"') sb.append("\\\"");
                else if (c == '\\') sb.append("\\\\");
                else if (c == '\n') sb.append("\\n");
                else if (c == '\r') sb.append("\\r");
                else if (c == '\t') sb.append("\\t");
                else if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                else sb.append(c);
            }
            sb.append("\"");
            return sb.toString();
        }
    }

    private void toast(final String msg) {
        runOnUiThread(() -> Toast.makeText(this, msg, Toast.LENGTH_SHORT).show());
    }

    @SuppressLint("WrongConstant")
    private boolean saveToGallery(Bitmap bitmap, String fileName) {
        try {
            String safeName = fileName.replaceAll("[^a-zA-Z0-9._\\-]", "_").replaceAll("_+", "_");
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, safeName);
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.put(MediaStore.Images.Media.IS_PENDING, 1);
                values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/五行生活");
            } else {
                values.put(MediaStore.Images.Media.DATA,
                        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
                                + "/五行生活/" + safeName);
            }
            Uri uri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (uri == null) return false;
            OutputStream out = getContentResolver().openOutputStream(uri);
            if (out == null) return false;
            boolean done = bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
            out.flush();
            out.close();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.clear();
                values.put(MediaStore.Images.Media.IS_PENDING, 0);
                getContentResolver().update(uri, values, null, null);
            }
            return done;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void onBackPressed() {
        // 外部新闻详情页：直接回到主应用（带 #news 定位到新闻列表），避免 goBack 停在空白中间页
        String cur = webView.getUrl();
        if (cur != null && !cur.contains("index.html")) {
            goHome();
        } else if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    // 一键返回主应用：无论外部页面历史栈多复杂，都直接回到 index.html 并定位到新闻 Tab
    private void goHome() {
        String cur = webView.getUrl();
        if (cur != null && cur.contains("index.html")) {
            // 已在主应用：若 hash 不是 #news，则切到新闻 Tab；否则回退历史
            if (cur.contains("#news")) {
                if (webView.canGoBack()) webView.goBack();
            } else {
                webView.loadUrl("file:///android_asset/www/index.html#news");
            }
        } else {
            // 在外部页面：直接回主应用新闻列表
            webView.loadUrl("file:///android_asset/www/index.html#news");
        }
    }
}