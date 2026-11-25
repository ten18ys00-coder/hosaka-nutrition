// ビルド先の設定
// web：GitHub Pages で公開する独立アプリ（Supabase 保存・院のパスコードでログイン・ホーム画面に追加できる）
// artifact：claude.ai のアーティファクト版（claude.ai のデータベースに保存）
export const TARGET: 'web' | 'artifact' = (import.meta.env.VITE_TARGET as 'web' | 'artifact') || 'web';
export const IS_WEB = TARGET === 'web';

// Supabase（姿勢アプリと同じプロジェクト「hosaka-shisei」・東京リージョン）
// 公開用のキー（anon）。データは行単位のアクセス制御（RLS）で、ほさか整骨院のアカウントだけが読み書きできる
export const SUPABASE_URL = 'https://gyvthlwsicjhrmszkvdc.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5dnRobHdzaWNqaHJtc3prdmRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzOTQ0MTMsImV4cCI6MjExMDk3MDQxM30.Ooe7rkuqLAd_9JfvBMXDTG8JjIkeJYmvM-8FjEeM5Sg';
// 院のアカウント（姿勢アプリの院コード「hosaka」と同じ。パスコードも共通）
export const CLINIC_LOGIN_EMAIL = 'hosaka@shisei.hosaka-seikotsuin.com';
export const APP_VERSION = 'v1.1';
