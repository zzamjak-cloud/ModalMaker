// ModalMaker 앱 최상위 셸
// 좌측 팔레트 + 중앙 캔버스 + 우측 인스펙터의 3패널 레이아웃 루트
import { useState } from "react";
import { Toolbar } from "@/features/toolbar/Toolbar";
import { Palette } from "@/features/palette/Palette";
import { Canvas } from "@/features/canvas/Canvas";
import { Inspector } from "@/features/inspector/Inspector";
import { LayerTree } from "@/features/layer-tree/LayerTree";
import { PresetGallery } from "@/features/presets/PresetGallery";

export default function App() {
  // 첫 진입 시 프리셋 갤러리 오픈
  const [galleryOpen, setGalleryOpen] = useState(true);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-neutral-950 text-neutral-100">
      <Toolbar onNewClick={() => setGalleryOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 팔레트 + 계층 트리 */}
        <aside className="flex w-64 flex-col border-r border-neutral-800 bg-neutral-900">
          <div className="flex-1 overflow-y-auto">
            <Palette />
          </div>
          <div className="h-64 border-t border-neutral-800 overflow-y-auto">
            <LayerTree />
          </div>
        </aside>

        {/* 중앙: 캔버스 */}
        <main className="flex flex-1 items-center justify-center overflow-auto bg-neutral-950 p-8">
          <Canvas />
        </main>

        {/* 우측: 인스펙터 */}
        <aside className="w-80 border-l border-neutral-800 bg-neutral-900 overflow-y-auto">
          <Inspector />
        </aside>
      </div>

      {galleryOpen && <PresetGallery onClose={() => setGalleryOpen(false)} />}
    </div>
  );
}
