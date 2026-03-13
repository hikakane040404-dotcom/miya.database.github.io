# Miyamoto Lab Thesis Reference Manager

宮本研究室向けの参考文献・卒業論文管理システムです。
Google Apps Script (GAS) をバックエンド、HTML/JS/CSS をフロントエンドとした軽量なWebアプリケーションです。

## 🌟 主な機能

- **参考文献管理**: 書籍、学術論文、Webページをタイプ別に登録・管理。
- **自動APA生成**: 入力データからAPAスタイルの引用文献リストを自動生成し、ワンクリックでコピー可能。
- **外部DB検索**: NDL(国立国会図書館)やCiNiiから文献情報を検索し、自動でフォームに入力。
- **論文整合性チェック**: 執筆中のテキストを解析し、登録済みの参考文献が正しく引用されているかを照合。
- **卒業論文データベース**: 過去の卒業論文をPDFとともに管理・閲覧。
- **マルチパステル・モダンUI**: 視認性が高く、研究のモチベーションを維持するモダンなデザイン。

## 🚀 セットアップ方法

### 1. Google Apps Script の準備
1. Google スプレッドシートを新規作成します。
2. 「拡張機能」 > 「Apps Script」を開きます。
3. 本リポジトリの `backend.gs` の内容を `Code.gs` に貼り付けます。
4. 「デプロイ」 > 「新しいデプロイ」を選択。
5. 種類の選択で「ウェブアプリ」を選び、アクセスできるユーザーを「全員(Anyone)」にしてデプロイします。
6. 発行された **ウェブアプリURL** をコピーします。

### 2. フロントエンドの設定
1. `app.js` の先頭にある `GAS_URL` 変数に、先ほどコピーしたURLを貼り付けます。
   ```javascript
   const GAS_URL = 'あなたのウェブアプリURL';
   ```

### 3. アプリの起動
1. `index.html` をブラウザで開くか、ローカルサーバーを立ててアクセスします。
2. 最初にアカウント作成（学籍番号、名前等）を行い、使用を開始してください。

## 🛠 技術スタック
- **Frontend**: Vanilla JS, CSS3 (Glassmorphism), HTML5
- **Backend**: Google Apps Script (GAS)
- **Database**: Google Sheets (Spreadsheet)
- **Icons**: Lucide Icons
- **PDF Analysis**: PDF.js

## 📄 ライセンス
Copyright (c) 2024 Miyamoto Lab.
All Rights Reserved.
