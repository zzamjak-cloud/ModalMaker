// 웹 vs Tauri 데스크톱 런타임 분기
// - 데스크톱: 네이티브 다이얼로그 + fs_export 커맨드로 저장
// - 웹: Blob + <a download>로 파일 다운로드
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function saveTextFile(
  suggestedName: string,
  content: string,
  mimeType = "text/plain",
): Promise<void> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { invoke } = await import("@tauri-apps/api/core");
    const path = await save({
      defaultPath: suggestedName,
      filters: [
        { name: "Markdown", extensions: ["md"] },
        { name: "JSON", extensions: ["json"] },
        { name: "Text", extensions: ["txt"] },
      ],
    });
    if (!path) return;
    await invoke("save_export", { path, content });
    return;
  }

  // 웹 폴백: Blob 다운로드
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function openTextFile(): Promise<string | null> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { invoke } = await import("@tauri-apps/api/core");
    const selected = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!selected || typeof selected !== "string") return null;
    return await invoke<string>("load_document", { path: selected });
  }

  // 웹 폴백: <input type=file>
  return await new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}
