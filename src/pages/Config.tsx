import React, { useState } from 'react';
import { Cloud, Copy, Download, FileUp, History, LogOut, Plus, Settings, ShieldCheck, Smartphone, Wrench, X } from 'lucide-react';
import { APP_VERSION, IS_WEB } from '../config';
import { signOut } from '../store/supabase';
import { useStore } from '../store/store';
import { resolveDownloads } from '../store/backend';
import { Badge, Button, Card, Chips, Field, Notice, PageHeader, TextInput, useConfirm, useToast } from '../components/ui';
import { SUPABASE_SCHEMA } from '../data/supabaseSchema';
import { DRI_SOURCE } from '../data/dri2025';
import { FOOD_SOURCE } from '../data/foods';
import { todayStr } from '../lib/calc';

const SECURITY: [string, string, 'done' | 'partial' | 'todo'][] = IS_WEB ? [
  ['スタッフ専用ログイン', '院のパスコードでログイン（姿勢アプリと共通）。一度ログインした端末は記憶', 'partial'],
  ['管理者・一般スタッフの権限分離', '現在は院のアカウント1つを共有。スタッフ別ログインは今後', 'todo'],
  ['患者情報へのアクセス制限', 'Supabase の行単位のアクセス制御（RLS）で、ほさか整骨院のアカウントだけが読み書き可。姿勢アプリを使う他院からは見えない', 'done'],
  ['操作履歴', '登録・更新・削除を日ごとに記録（下の「操作履歴」）。データの変更前・削除前の内容もサーバーに保存', 'done'],
  ['データ保護・バックアップ', '通信は暗号化。無料プランは自動バックアップがないため、定期的に「書き出し」を推奨（Proプランで毎日自動）', 'partial'],
  ['アカウント停止機能', '端末を紛失したら院のパスコードを変更（姿勢アプリの設定）→全端末が再ログインに', 'partial'],
  ['個人情報の削除・管理', '患者の削除時に関連データもまとめて削除', 'done'],
  ['適切なセッション管理', 'Supabase Auth のセッション（自動更新）。「この端末からログアウト」あり', 'done'],
  ['APIキーの安全な管理', 'アプリに入っているのは公開用のキーのみ。管理用の鍵は含めない', 'done'],
  ['個人を識別できる情報のAIへの不要な送信防止', 'AI機能は未実装。実装時は氏名・番号を除いて送る設計', 'partial'],
] : [
  ['スタッフ専用ログイン', '試作版は claude.ai のアカウントで閲覧を制限（共有した相手のみ）。本番は Supabase Auth', 'partial'],
  ['管理者・一般スタッフの権限分離', '本番で staff_profiles.role と RLS で実装予定', 'todo'],
  ['患者情報へのアクセス制限', '試作版はデータの読み書きを「投稿者（Contributor）以上」に限定。本番は RLS', 'partial'],
  ['操作履歴', '登録・更新・削除を日ごとに記録（下の「操作履歴」）', 'done'],
  ['データ保護・バックアップ', 'JSONでの書き出し・取り込みに対応。本番は Supabase のバックアップ', 'partial'],
  ['アカウント停止機能', '本番で staff_profiles.is_active により実装予定', 'todo'],
  ['個人情報の削除・管理', '患者の削除時に関連データもまとめて削除', 'done'],
  ['適切なセッション管理', '本番で Supabase Auth のセッション管理を使用', 'todo'],
  ['APIキーの安全な管理', '試作版はAPIキーを扱わない。本番はサーバー側（環境変数）で管理', 'partial'],
  ['個人を識別できる情報のAIへの不要な送信防止', 'AI機能は未実装。実装時は氏名・番号を除いて送る設計', 'partial'],
];

const NOT_IMPLEMENTED = [
  'AI栄養アシスタント（献立提案・説明文の下書きなど）',
  'スタッフごとのログインと権限分離',
  ...(IS_WEB ? ['通信できないとき（圏外など）の入力の一時保存'] : ['Supabase への接続（テーブル設計案は下に記載）', 'アプリ画面からの直接印刷（ブラウザの制約のため、A4用ファイルを保存して印刷・PDF保存する方式）']),
  '18歳未満の肥満度（成長曲線）による体格評価',
  '妊婦・授乳婦の付加量、6歳未満の基準',
  'n-3系・n-6系脂肪酸、銅・ヨウ素などの微量ミネラルの計算',
];

const KNOWN_ISSUES = [
  '初期の食品データは成分表を参考に手入力した試作値で、公式値と未照合です（ナイアシン当量・ビオチン等は多くが未確認）。',
  '同じ記録を複数の端末で同時に編集すると、後から保存した内容が優先されます（変更前の内容はサーバーの履歴に残ります）。',
  '操作履歴は1日分を1件にまとめて保存しているため、複数端末で同時に操作すると一部が記録されない場合があります。',
  ...(IS_WEB ? ['通信できない状態では保存できません（画面右上に「保存・通信エラー」と表示されます）。'] : ['claude.ai 以外で開いた場合は、そのブラウザだけにデータが保存されます（端末間で共有されません）。']),
];

export default function ConfigPage() {
  const { settings, save, status, exportAll, importAll, auditDays, staff } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [newStaff, setNewStaff] = useState('');
  const [name, setName] = useState(settings.clinic_name);
  const [addr, setAddr] = useState(settings.clinic_address);
  const [busy, setBusy] = useState(false);
  React.useEffect(() => { setName(settings.clinic_name); setAddr(settings.clinic_address); }, [settings.clinic_name, settings.clinic_address]);

  const saveSettings = (patch: Partial<typeof settings>, msg = '設定を保存しました') => save('settings', { ...settings, ...patch, id: 'main' }, '設定を変更').then(() => toast(msg));

  const doExport = async () => {
    const data = JSON.stringify({ app: 'HOSAKA Nutrition', version: 1, exported_at: new Date().toISOString(), data: exportAll() }, null, 2);
    const filename = `hosaka-nutrition-backup-${todayStr()}.json`;
    const dl = await resolveDownloads();
    try {
      if (dl) await dl.save({ filename, data });
      else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        a.download = filename; a.click();
      }
      toast('バックアップを書き出しました');
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== 'declined') toast(`書き出せませんでした（${code ?? 'エラー'}）`, 'warn');
    }
  };

  const doImport = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      const data = json?.data;
      if (!data || typeof data !== 'object') { toast('HOSAKA Nutrition のバックアップファイルではありません', 'warn'); return; }
      const ok = await confirm({ title: 'バックアップを取り込みますか？', message: '同じIDの記録は、ファイルの内容で上書きされます。', ok: '取り込む' });
      if (!ok) return;
      setBusy(true);
      const n = await importAll(data);
      toast(`${n}件を取り込みました`);
    } catch {
      toast('ファイルを読み込めませんでした', 'warn');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="設定" icon={<Settings size={26} />} subtitle="院の情報・スタッフ・データ管理・セキュリティ" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="院の情報" subtitle="患者さん向け資料・指導書の下部に表示されます">
          <div className="space-y-3">
            <Field label="院名"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="住所（任意）"><TextInput value={addr} onChange={(e) => setAddr(e.target.value)} /></Field>
            <Button variant="primary" onClick={() => { if (!name.trim()) { toast('院名を入力してください', 'warn'); return; } saveSettings({ clinic_name: name.trim(), clinic_address: addr.trim() }); }}>保存</Button>
          </div>
        </Card>

        <Card title="スタッフ" subtitle="記録の「担当」に使います（試作版ではログインと連動しません）">
          <ul className="mb-3 flex flex-wrap gap-2">
            {settings.staff_list.map((s) => (
              <li key={s} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand">
                {s}{s === staff && <span className="text-[11px] text-muted">（選択中）</span>}
                <button type="button" aria-label={`${s}を削除`} disabled={settings.staff_list.length <= 1} onClick={() => saveSettings({ staff_list: settings.staff_list.filter((x) => x !== s) })}><X size={14} /></button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <TextInput value={newStaff} onChange={(e) => setNewStaff(e.target.value)} placeholder="スタッフ名" aria-label="スタッフ名" />
            <Button icon={<Plus size={16} />} onClick={() => {
              const s = newStaff.trim();
              if (!s) return;
              if (settings.staff_list.includes(s)) { toast('すでに登録されています', 'warn'); return; }
              saveSettings({ staff_list: [...settings.staff_list, s] }, 'スタッフを追加しました'); setNewStaff('');
            }}>追加</Button>
          </div>
        </Card>
      </div>

      <Card title="データの保存先" icon={<Cloud size={18} />}>
        <div className="space-y-3 text-sm">
          <p>現在の保存先：<Badge tone={status.kind === 'cloud' && status.state === 'ready' ? 'good' : status.state === 'error' ? 'warn' : 'info'}>{IS_WEB ? 'Supabase（東京リージョン）・院の端末間でリアルタイム同期' : status.kind === 'cloud' ? 'claude.ai のアーティファクト用データベース（院内の端末間で共有）' : 'このブラウザ（この端末だけ）'}</Badge></p>
          {status.message && <Notice tone="warn">{status.message}</Notice>}
          <p className="text-muted">{IS_WEB
            ? '姿勢アプリと同じ Supabase プロジェクトの中に、栄養アプリ専用の区画を作って保存しています。読み書きできるのは、ほさか整骨院のアカウント（院のパスコード）だけです。変更前・削除前の内容もサーバー側に履歴として残ります。無料プランは自動バックアップがないため、月に1回ほど「バックアップを書き出す」で保存しておくと安心です。'
            : 'アプリのデータは「コレクション＝テーブル、記録＝行」の形で保存しており、将来 Supabase（PostgreSQL）へそのまま移せる構造です。'}</p>
          <div className="flex flex-wrap gap-2">
            <Button icon={<Download size={16} />} onClick={doExport}>バックアップを書き出す（JSON）</Button>
            <label className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-sage-200 bg-white px-4 text-[15px] font-medium text-brand hover:bg-brand-50">
              <FileUp size={16} />{busy ? '取り込み中…' : 'バックアップを取り込む'}
              <input type="file" accept=".json,application/json" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
            </label>
          </div>
          {IS_WEB && <p className="text-[13px] text-muted">claude.ai版で入力したデータがある場合は、claude.ai版の設定画面で書き出したファイルをここで取り込めます。</p>}
        </div>
      </Card>

      {IS_WEB && (
        <Card title="この端末" icon={<Smartphone size={18} />}>
          <div className="space-y-3 text-sm">
            <p className="text-muted">ホーム画面に追加すると、アプリとして全画面で開けます。iPhone：Safariで開き、共有ボタン →「ホーム画面に追加」。Android：Chromeで開き、右上のメニュー →「ホーム画面に追加」（または「アプリをインストール」）。</p>
            <p className="text-muted">スマホを紛失したときは、姿勢アプリの設定で院のパスコードを変更してください。すべての端末で再ログインが必要になります。</p>
            <Button variant="danger" icon={<LogOut size={16} />} onClick={async () => {
              if (!(await confirm({ title: 'この端末からログアウトしますか？', message: '次に開くときは、院のパスコードの入力が必要です。保存済みのデータは消えません。', ok: 'ログアウト' }))) return;
              await signOut();
            }}>この端末からログアウト</Button>
          </div>
        </Card>
      )}

      <Card title="架空データ" subtitle="成人女性・学生アスリート・高齢男性の3名と、その問診・食事記録・経過記録・見本商品">
        <Chips size="sm" options={['表示する', '表示しない']} value={settings.show_demo ? '表示する' : '表示しない'} onChange={(v) => saveSettings({ show_demo: v !== '表示しない' }, v === '表示しない' ? '架空データを非表示にしました' : '架空データを表示しました')} />
        <p className="mt-2 text-[13px] text-muted">本番運用を始めるときは「表示しない」にしてください（データは削除されず、いつでも戻せます）。</p>
      </Card>

      <Card title="操作履歴" icon={<History size={18} />} subtitle="登録・更新・削除の記録（直近7日）">
        {auditDays.length === 0 ? <p className="text-sm text-muted">まだ記録はありません</p> : (
          <div className="max-h-[360px] overflow-y-auto">
            {auditDays.slice(0, 7).map((d) => (
              <div key={d.id} className="mb-3">
                <p className="mb-1 text-[13px] font-bold text-sage">{d.id}</p>
                <ul className="divide-y divide-line text-sm">
                  {[...d.entries].reverse().map((e, i) => (
                    <li key={i} className="flex flex-wrap gap-x-3 py-1.5"><span className="num w-14 text-muted">{new Date(e.at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span><span className="w-16 text-muted">{e.staff}</span><span>{e.action}</span><span className="text-muted">{e.target}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="セキュリティ・安全性（本番に向けたチェックリスト）" icon={<ShieldCheck size={18} />}>
        <ul className="divide-y divide-line text-sm">
          {SECURITY.map(([k, v, s]) => (
            <li key={k} className="grid gap-1 py-2 sm:grid-cols-[220px_minmax(0,1fr)_auto] sm:items-center">
              <span className="font-medium">{k}</span><span className="text-muted">{v}</span>
              <Badge tone={s === 'done' ? 'good' : s === 'partial' ? 'info' : 'muted'}>{s === 'done' ? '試作で対応' : s === 'partial' ? '一部対応' : '本番で実装'}</Badge>
            </li>
          ))}
        </ul>
        {IS_WEB
          ? <Notice tone="warn" className="mt-3">実在の患者さんの情報を入れる前に、院のパスコードが十分に長く推測されにくいこと、バックアップの方法（定期的な書き出し、またはProプラン）、患者さんへの利用目的の説明（個人情報の取り扱い）を確認してください。</Notice>
          : <Notice tone="warn" className="mt-3">試作版には実在の患者さんの情報を登録しないでください。本番運用は、スタッフログイン・権限・RLS を備えた環境（Supabase 等）へ移行してからにしてください。</Notice>}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="未実装の機能" icon={<Wrench size={18} />}>
          <ul className="list-disc space-y-1 pl-5 text-sm">{NOT_IMPLEMENTED.map((x) => <li key={x}>{x}</li>)}</ul>
        </Card>
        <Card title="既知の問題・注意点">
          <ul className="list-disc space-y-1 pl-5 text-sm">{KNOWN_ISSUES.map((x) => <li key={x}>{x}</li>)}</ul>
        </Card>
      </div>

      <Card title="Supabase 移行用のテーブル設計案" actions={<Button size="sm" icon={<Copy size={15} />} onClick={async () => { try { await navigator.clipboard.writeText(SUPABASE_SCHEMA); toast('SQLをコピーしました'); } catch { toast('コピーできませんでした', 'warn'); } }}>SQLをコピー</Button>}>
        <pre className="max-h-[360px] overflow-auto rounded-xl bg-stone-50 p-3 text-[12px] leading-relaxed">{SUPABASE_SCHEMA}</pre>
      </Card>

      <Card title="出典・バージョン">
        <ul className="space-y-1 text-sm text-muted">
          <li>HOSAKA Nutrition {APP_VERSION}{IS_WEB ? '（独立アプリ版）' : '（claude.ai版）'}</li>
          <li>食事摂取基準：{DRI_SOURCE}</li>
          <li>食品成分：{FOOD_SOURCE}（初期データは試作用・未照合）</li>
          <li>本アプリは一般的な栄養指導を支援するツールです。医学的診断や疾患別の食事療法は行いません。必要に応じて医師・管理栄養士へ相談してください。</li>
        </ul>
      </Card>
    </div>
  );
}
