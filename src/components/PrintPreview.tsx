import React, { useEffect, useRef, useState } from 'react';
import { Copy, Download, Printer } from 'lucide-react';
import { Button, Modal, Notice, useToast } from './ui';
import { resolveDownloads } from '../store/backend';

const A4_CSS = `
@page { size: A4; margin: 0; }
*{box-sizing:border-box}
body{margin:0;background:#eef1ef;font-family:"Zen Kaku Gothic New","Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif;color:#1d2925}
.bar{position:sticky;top:0;display:flex;gap:12px;align-items:center;justify-content:center;padding:10px;background:#214d3d;color:#fff;font-size:14px}
.bar button{font:inherit;padding:8px 16px;border-radius:8px;border:0;background:#fff;color:#214d3d;font-weight:700;cursor:pointer}
.a4{width:210mm;min-height:297mm;margin:12px auto;padding:16mm 15mm;background:#fff;font-size:10.5pt;line-height:1.75}
.a4 h1{font-size:17pt;line-height:1.35;margin:0 0 4mm;font-family:"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif;color:#214d3d}
.a4 h2{font-size:12.5pt;margin:6mm 0 2mm;padding-left:3mm;border-left:3px solid #214d3d;color:#214d3d;break-after:avoid}
.a4 table{width:100%;border-collapse:collapse;margin:2mm 0 3mm;font-size:9.5pt;break-inside:auto}
.a4 tr{break-inside:avoid}
.a4 th,.a4 td{border:1px solid #d5ddd8;padding:1.4mm 2mm;text-align:left;vertical-align:top}
.a4 th{background:#eef4f1}
.a4 td.r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.a4 ul{margin:1mm 0 2mm;padding-left:5mm}.a4 li{margin:.6mm 0}
.a4 .note{background:#fbf8f3;border:1px solid #e9e0cf;border-radius:2mm;padding:2.5mm 3.5mm;margin:3mm 0;font-size:9.5pt}
.a4 .foot{margin-top:8mm;padding-top:3mm;border-top:1px solid #d5ddd8;font-size:8.5pt;color:#5b6863;display:flex;justify-content:space-between;gap:4mm}
.a4 .meta{display:flex;flex-wrap:wrap;gap:2mm 6mm;font-size:9.5pt;color:#5b6863;margin-bottom:3mm}
.a4 .no-print{display:none}
@media print{body{background:#fff}.bar{display:none}.a4{margin:0;box-shadow:none;width:auto;min-height:auto}}
`;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/** その場で印刷（独立アプリ版）：A4の中身だけを印刷用の領域に写して印刷する */
export function printA4(inner: string) {
  let root = document.getElementById('print-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'print-root';
    document.body.appendChild(root);
  }
  root.innerHTML = `<div class="a4 a4-print">${inner}</div>`;
  document.body.classList.add('printing');
  const done = () => {
    document.body.classList.remove('printing');
    if (root) root.innerHTML = '';
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  setTimeout(() => window.print(), 60);
}

export function buildA4Html(title: string, inner: string) {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;700&family=Shippori+Mincho+B1:wght@700&display=swap" rel="stylesheet">
<style>${A4_CSS}</style></head><body>
<div class="bar">A4で印刷・PDF保存できます<button onclick="window.print()">印刷 / PDFで保存</button></div>
<div class="a4">${inner}</div></body></html>`;
}

/** A4プレビュー。印刷はブラウザ制約のため「印刷用ファイル（HTML）を保存→開いて印刷/PDF保存」で行う */
export function PrintPreview({ open, onClose, title, children, extra }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [h, setH] = useState(1123);
  const [dl, setDl] = useState<Awaited<ReturnType<typeof resolveDownloads>>>(null);
  const [inFrame] = useState(() => window.self !== window.top);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    resolveDownloads().then(setDl);
    const fit = () => {
      const w = wrapRef.current?.clientWidth ?? 800;
      setScale(Math.min(1, (w - 32) / 794));
      setH(ref.current?.offsetHeight ?? 1123);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [open]);

  const save = async () => {
    const inner = ref.current?.innerHTML ?? '';
    const html = buildA4Html(title, inner);
    const name = `${title.replace(/[\\/:*?"<>|]/g, '_')}.html`;
    if (dl) {
      try {
        await dl.save({ filename: name, data: html });
        toast('印刷用ファイルを保存しました。開いて「印刷 / PDFで保存」を押してください。');
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code !== 'declined') toast(`保存できませんでした（${code ?? 'エラー'}）`, 'warn');
      }
      return;
    }
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      toast('この環境ではファイルを保存できません。「本文をコピー」をご利用ください。', 'warn');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ref.current?.innerText ?? '');
      toast('本文をコピーしました');
    } catch {
      toast('コピーできませんでした', 'warn');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`A4プレビュー：${title}`}
      wide="xl"
      footer={
        <>
          {extra}
          <Button icon={<Copy size={16} />} onClick={copy}>本文をコピー</Button>
          {inFrame ? (
            <Button variant="primary" icon={<Download size={16} />} onClick={save}>印刷用ファイルを保存（A4）</Button>
          ) : (
            <>
              <Button icon={<Download size={16} />} onClick={save}>A4ファイルを保存</Button>
              <Button variant="primary" icon={<Printer size={16} />} onClick={() => printA4(ref.current?.innerHTML ?? '')}>印刷・PDF保存</Button>
            </>
          )}
        </>
      }
    >
      <Notice tone="info" className="mb-3">
        {inFrame
          ? '「印刷用ファイルを保存」で A4 レイアウトのファイルを保存し、開いた画面の「印刷 / PDFで保存」から印刷またはPDF保存ができます（このアプリの画面内からは直接印刷できない仕組みのため）。'
          : '「印刷・PDF保存」を押すと印刷画面が開きます。用紙はA4を選んでください。PDFにする場合は、印刷画面で「PDFとして保存」（iPhoneは共有ボタン→「プリント」→ピンチで拡大→共有）を選びます。'}
      </Notice>
      <div ref={wrapRef} className="a4-wrap">
        <div style={{ width: 794 * scale, height: h * scale, overflow: 'hidden' }}>
          <div className="a4-scale" style={{ transform: `scale(${scale})`, width: 794 }}>
            <div className="a4" ref={ref}>{children}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
